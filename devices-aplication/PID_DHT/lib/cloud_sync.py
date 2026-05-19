# ==============================================================================
# cloud_sync.py — Sync com Firebase Realtime Database (REST API)
# ==============================================================================
# PUT /devices/pico-001/sensor.json → envia dados do sensor
# GET /devices/pico-001/config.json → lê configurações remotas
# ==============================================================================
import uasyncio as asyncio
import ujson
import gc

from lib import shared_state
from lib import wifi_manager as wifi
from lib.config import CONFIG_DIR

CLOUD_FILE = CONFIG_DIR + "/cloud.json"

# Firebase Realtime Database
DB_HOST = "projectairguard-default-rtdb.firebaseio.com"
DEVICE_ID = "pico-001"

_sync_interval = 60  # segundos (30 a 600)
_enabled = False


def _ensure_config_dir():
    import os
    try:
        os.stat(CONFIG_DIR)
    except OSError:
        os.mkdir(CONFIG_DIR)


def save_cloud_config():
    _ensure_config_dir()
    try:
        with open(CLOUD_FILE, 'w') as f:
            ujson.dump({"interval": _sync_interval, "enabled": _enabled}, f)
    except Exception:
        pass


def load_cloud_config():
    global _sync_interval, _enabled
    try:
        with open(CLOUD_FILE, 'r') as f:
            data = ujson.load(f)
            _sync_interval = data.get("interval", 60)
            _enabled = data.get("enabled", False)
            if _enabled:
                print("[cloud] Sync ativo cada {}s".format(_sync_interval))
    except (OSError, ValueError):
        pass


def set_cloud_config(interval, enabled):
    global _sync_interval, _enabled
    _sync_interval = max(30, min(600, int(interval)))
    _enabled = enabled
    save_cloud_config()


def get_cloud_config():
    return {
        "device_id": DEVICE_ID,
        "interval": _sync_interval,
        "enabled": _enabled
    }


def _https_request(method, path, body=None):
    """Faz uma requisição HTTPS ao Firebase Realtime Database.
    Retorna o body da resposta ou None em caso de erro."""
    import usocket
    try:
        import ussl as ssl
    except ImportError:
        import ssl

    gc.collect()
    sock = None
    try:
        addr = usocket.getaddrinfo(DB_HOST, 443)[0][-1]
        sock = usocket.socket()
        sock.settimeout(10)
        sock.connect(addr)
        sock = ssl.wrap_socket(sock, server_hostname=DB_HOST)

        if body:
            request = "{} {} HTTP/1.0\r\nHost: {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}".format(
                method, path, DB_HOST, len(body), body)
        else:
            request = "{} {} HTTP/1.0\r\nHost: {}\r\nConnection: close\r\n\r\n".format(
                method, path, DB_HOST)

        sock.write(request.encode())

        # Lê resposta completa
        chunks = []
        while True:
            chunk = sock.read(512)
            if not chunk:
                break
            chunks.append(chunk)
        sock.close()
        sock = None

        response = b''.join(chunks)
        del chunks
        gc.collect()

        if b"200" not in response:
            return None

        # Extrai body (após \r\n\r\n)
        sep = response.find(b'\r\n\r\n')
        if sep >= 0:
            return response[sep + 4:]
        return None

    except Exception as e:
        shared_state.add_log("[cloud] {}".format(e))
        if sock:
            try:
                sock.close()
            except:
                pass
        return None
    finally:
        gc.collect()


def apply_remote_config(cfg):
    """Aplica configurações vindas do Firebase."""
    if not cfg:
        return

    if cfg.get("mode") and cfg["mode"] != shared_state.get_control_mode():
        shared_state.set_control_mode(cfg["mode"])
        shared_state.add_log("[cloud] modo={}".format(cfg["mode"]))

    if cfg.get("manual"):
        for r, state in cfg["manual"].items():
            if shared_state.get_manual_relay(int(r)) != state:
                shared_state.set_manual_relay(int(r), state)

    if cfg.get("relay_names"):
        current = shared_state.get_relay_names()
        for r, name in cfg["relay_names"].items():
            if current.get(r) != name:
                shared_state.set_relay_name(r, name)

    if cfg.get("setpoints") is not None:
        remote_sps = cfg["setpoints"]
        if remote_sps != shared_state.get_setpoints_list():
            shared_state._setpoints = remote_sps
            shared_state.save_setpoints()
            shared_state.add_log("[cloud] SPs={}".format(len(remote_sps)))

    if cfg.get("actions") is not None:
        remote_acts = cfg["actions"]
        if remote_acts != shared_state.get_actions_list():
            shared_state._actions = remote_acts
            shared_state.save_actions()
            shared_state.add_log("[cloud] ACTs={}".format(len(remote_acts)))


async def cloud_sync_task():
    """Task principal: envia sensor data e lê config remota."""
    print("[cloud] Task init enabled={} interval={}s".format(_enabled, _sync_interval))

    while True:
        await asyncio.sleep_ms(_sync_interval * 1000)

        if not _enabled:
            continue

        if not wifi.is_connected():
            continue

        temp, hum = shared_state.get_sensor_data()
        if temp is None or hum is None:
            continue

        r1 = shared_state.get_relay_state(1)
        r2 = shared_state.get_relay_state(2)
        r3 = shared_state.get_relay_state(3)
        rpm = shared_state.get_rpm()

        # 1) PUT sensor data
        sensor_payload = ujson.dumps({
            "temperature": round(temp, 1),
            "humidity": round(hum, 1),
            "relay1": r1,
            "relay2": r2,
            "relay3": r3,
            "rpm": rpm,
            "last_seen": "active"
        })

        path = "/devices/{}/sensor.json".format(DEVICE_ID)
        result = _https_request("PUT", path, sensor_payload)

        if result:
            shared_state.add_log("[cloud] PUT OK T={:.1f}".format(temp))
        else:
            continue  # Se PUT falhou, não tenta GET

        # Espera um pouco entre requests
        await asyncio.sleep_ms(2000)

        # 2) GET config remota
        path2 = "/devices/{}/config.json".format(DEVICE_ID)
        config_body = _https_request("GET", path2)

        if config_body and config_body != b'null':
            try:
                cfg = ujson.loads(config_body)
                apply_remote_config(cfg)
            except Exception as e:
                print("[cloud] cfg parse: {}".format(e))
