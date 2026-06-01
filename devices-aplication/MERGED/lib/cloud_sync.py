# ==============================================================================
# cloud_sync.py — Firebase Realtime Database Sync | EcoBreath Merged
# Envia dados de sensor + bateria para o Firebase
# ==============================================================================
import uasyncio as asyncio
import ujson
import gc
from lib import shared_state
from lib import wifi_manager as wifi
from config import CONFIG_DIR

CLOUD_FILE = CONFIG_DIR + "/cloud.json"
DB_HOST = "projectairguard-default-rtdb.firebaseio.com"
DEVICE_ID = "pico-001"

_sync_interval = 60
_enabled = False

def _ensure_config_dir():
    import os
    try: os.stat(CONFIG_DIR)
    except OSError: os.mkdir(CONFIG_DIR)

def save_cloud_config():
    _ensure_config_dir()
    try:
        with open(CLOUD_FILE, 'w') as f: ujson.dump({"interval": _sync_interval, "enabled": _enabled}, f)
    except: pass

def load_cloud_config():
    global _sync_interval, _enabled
    try:
        with open(CLOUD_FILE, 'r') as f:
            data = ujson.load(f)
            _sync_interval = data.get("interval", 60)
            _enabled = data.get("enabled", False)
    except: pass

def set_cloud_config(interval, enabled):
    global _sync_interval, _enabled
    _sync_interval = max(30, min(600, int(interval)))
    _enabled = enabled
    save_cloud_config()

def get_cloud_config():
    return {"device_id": DEVICE_ID, "interval": _sync_interval, "enabled": _enabled}

def _https_request(method, path, body=None):
    import usocket
    try: import ussl as ssl
    except: import ssl
    gc.collect()
    sock = None
    try:
        addr = usocket.getaddrinfo(DB_HOST, 443)[0][-1]
        sock = usocket.socket(); sock.settimeout(10)
        sock.connect(addr)
        sock = ssl.wrap_socket(sock, server_hostname=DB_HOST)
        if body:
            req = "{} {} HTTP/1.0\r\nHost: {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}".format(method, path, DB_HOST, len(body), body)
        else:
            req = "{} {} HTTP/1.0\r\nHost: {}\r\nConnection: close\r\n\r\n".format(method, path, DB_HOST)
        sock.write(req.encode())
        chunks = []
        while True:
            chunk = sock.read(512)
            if not chunk: break
            chunks.append(chunk)
        sock.close(); sock = None
        response = b''.join(chunks); del chunks; gc.collect()
        if b"200" not in response: return None
        sep = response.find(b'\r\n\r\n')
        return response[sep + 4:] if sep >= 0 else None
    except Exception as e:
        shared_state.add_log("[cloud] {}".format(e))
        if sock:
            try: sock.close()
            except: pass
        return None
    finally: gc.collect()


async def cloud_sync_task():
    while True:
        await asyncio.sleep_ms(_sync_interval * 1000)
        if not _enabled or not wifi.is_connected(): continue
        temp, hum = shared_state.get_sensor_data()
        if temp is None or hum is None: continue
        bat_v, bat_p = shared_state.get_battery_data()
        payload = ujson.dumps({
            "temperature": round(temp, 1),
            "humidity": round(hum, 1),
            "battery_volt": round(bat_v, 2) if bat_v else None,
            "battery_pct": bat_p,
            "last_seen": "active"
        })
        path = "/devices/{}/sensor.json".format(DEVICE_ID)
        result = _https_request("PUT", path, payload)
        if result:
            shared_state.add_log("[cloud] PUT OK T={:.1f}".format(temp))
