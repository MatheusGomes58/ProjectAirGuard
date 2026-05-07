# ==============================================================================
# cloud_sync.py — Envia dados para Cloud Function / Firestore
# ==============================================================================
import uasyncio as asyncio
import ujson

from lib import shared_state
from lib import wifi_manager as wifi
from lib.config import CONFIG_DIR

CLOUD_FILE = CONFIG_DIR + "/cloud.json"

# URL fixa — não pode ser alterada pela web
CLOUD_URL = "https://us-central1-projectairguard.cloudfunctions.net/sensorData"

# Device ID fixo no código
DEVICE_ID = "pico-001"

# Configuração editável (só intervalo e enabled)
_sync_interval = 30  # segundos (10 a 600)
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
            _sync_interval = data.get("interval", 30)
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
        "url": CLOUD_URL,
        "device_id": DEVICE_ID,
        "interval": _sync_interval,
        "enabled": _enabled
    }


def apply_remote_config(cfg):
    """Aplica configurações vindas do Firestore (escritas pelo frontend web)."""
    changed = False
    
    # Modo
    if cfg.get("mode") and cfg["mode"] != shared_state.get_control_mode():
        shared_state.set_control_mode(cfg["mode"])
        shared_state.add_log("[cloud] modo={}".format(cfg["mode"]))
        changed = True
    
    # Manual relays
    if cfg.get("manual"):
        for r, state in cfg["manual"].items():
            if shared_state.get_manual_relay(int(r)) != state:
                shared_state.set_manual_relay(int(r), state)
                changed = True
    
    # Relay names
    if cfg.get("relay_names"):
        current = shared_state.get_relay_names()
        for r, name in cfg["relay_names"].items():
            if current.get(r) != name:
                shared_state.set_relay_name(r, name)
                changed = True
    
    # Setpoints (substitui lista inteira se diferente)
    if cfg.get("setpoints") is not None:
        remote_sps = cfg["setpoints"]
        local_sps = shared_state.get_setpoints_list()
        if remote_sps != local_sps:
            # Substitui direto
            shared_state._setpoints = remote_sps
            shared_state.save_setpoints()
            shared_state.add_log("[cloud] setpoints atualizados ({})".format(len(remote_sps)))
            changed = True
    
    # Actions (substitui lista inteira se diferente)
    if cfg.get("actions") is not None:
        remote_acts = cfg["actions"]
        local_acts = shared_state.get_actions_list()
        if remote_acts != local_acts:
            shared_state._actions = remote_acts
            shared_state.save_actions()
            shared_state.add_log("[cloud] acoes atualizadas ({})".format(len(remote_acts)))
            changed = True
    
    if changed:
        print("[cloud] Config remota aplicada")


async def cloud_sync_task():
    """Task que envia dados periodicamente para a Cloud Function."""
    import gc
    print("[cloud] Task init enabled={} interval={}s".format(_enabled, _sync_interval))
    shared_state.add_log("[cloud] Task iniciada")

    while True:
        await asyncio.sleep_ms(_sync_interval * 1000)
        print("[cloud] tick enabled={} connected={}".format(_enabled, wifi.is_connected()))

        if not _enabled:
            continue

        if not wifi.is_connected():
            continue

        print("[cloud] preparando payload...")
        temp, hum = shared_state.get_sensor_data()
        if temp is None or hum is None:
            print("[cloud] sensor None")
            continue

        r1 = shared_state.get_relay_state(1)
        r2 = shared_state.get_relay_state(2)

        payload = ujson.dumps({
            "device_id": DEVICE_ID,
            "temperature": round(temp, 1),
            "humidity": round(hum, 1),
            "relay1": r1,
            "relay2": r2
        })
        print("[cloud] payload ok len={}".format(len(payload)))

        import gc
        gc.collect()
        gc.collect()
        mem = gc.mem_free()
        print("[cloud] mem_free={}".format(mem))
        
        if mem < 25000:
            print("[cloud] RAM insuficiente, pulando")
            shared_state.add_log("[cloud] RAM baixa: {}".format(mem))
            continue

        sock = None
        try:
            import usocket
            try:
                import ussl as ssl
            except ImportError:
                import ssl

            url_body = CLOUD_URL.split("://")[1]
            host = url_body.split("/")[0]
            path = "/" + "/".join(url_body.split("/")[1:])

            print("[cloud] DNS...")
            addr = usocket.getaddrinfo(host, 443)[0][-1]
            print("[cloud] conectando {}:443".format(addr[0]))
            sock = usocket.socket()
            sock.settimeout(10)
            try:
                sock.connect(addr)
            except OSError as ce:
                print("[cloud] connect err: {}".format(ce))
                sock.close()
                sock = None
                continue
            print("[cloud] TCP ok, SSL...")
            sock = ssl.wrap_socket(sock, server_hostname=host)
            print("[cloud] SSL ok, enviando...")

            request = "POST {} HTTP/1.0\r\nHost: {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}".format(
                path, host, len(payload), payload)
            sock.write(request.encode())
            print("[cloud] enviado, lendo resposta...")

            # Lê resposta completa (headers + body)
            chunks = []
            while True:
                chunk = sock.read(512)
                if not chunk:
                    break
                chunks.append(chunk)
            sock.close()
            sock = None
            response = b''.join(chunks)
            print("[cloud] resposta {} bytes".format(len(response)))

            if response and b"200" in response:
                shared_state.add_log("[cloud] OK T={:.1f} H={:.1f}".format(temp, hum))
                try:
                    # Separa headers do body (dividido por \r\n\r\n)
                    body_start = response.find(b'\r\n\r\n')
                    if body_start >= 0:
                        body = response[body_start + 4:]
                        resp_json = ujson.loads(body)
                        cfg = resp_json.get("config")
                        if cfg:
                            apply_remote_config(cfg)
                except Exception as pe:
                    print("[cloud] parse: {}".format(pe))
            else:
                shared_state.add_log("[cloud] HTTP err")

        except Exception as e:
            shared_state.add_log("[cloud] {}".format(e))
            if sock:
                try:
                    sock.close()
                except:
                    pass
        gc.collect()
