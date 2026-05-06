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
    _sync_interval = max(10, min(600, int(interval)))
    _enabled = enabled
    save_cloud_config()


def get_cloud_config():
    return {
        "url": CLOUD_URL,
        "device_id": DEVICE_ID,
        "interval": _sync_interval,
        "enabled": _enabled
    }


def process_commands(cmds):
    """Processa comandos recebidos do Firestore via Cloud Function."""
    for cmd in cmds:
        cmd_type = cmd.get("type", "")
        value = cmd.get("value", None)
        try:
            if cmd_type == "set_mode":
                shared_state.set_control_mode(value)
                shared_state.add_log("[cmd] modo={}".format(value))
            elif cmd_type == "set_relay":
                shared_state.set_manual_relay(int(value["relay"]), bool(value["state"]))
                shared_state.add_log("[cmd] rele{}={}".format(value["relay"], value["state"]))
            elif cmd_type == "add_setpoint":
                shared_state.add_setpoint(value["name"], value["sensor"], value["value"])
                shared_state.add_log("[cmd] +SP {}".format(value["name"]))
            elif cmd_type == "remove_setpoint":
                shared_state.remove_setpoint(value["id"])
                shared_state.add_log("[cmd] -SP {}".format(value["id"]))
            elif cmd_type == "update_setpoint":
                shared_state.update_setpoint(value["id"], value["value"])
                shared_state.add_log("[cmd] SP {}={}".format(value["id"], value["value"]))
            elif cmd_type == "add_action":
                shared_state.add_action(value["name"], value["relay"], value["setpoint_id"], value["condition"], value["period"])
                shared_state.add_log("[cmd] +ACT {}".format(value["name"]))
            elif cmd_type == "remove_action":
                shared_state.remove_action(value["id"])
                shared_state.add_log("[cmd] -ACT {}".format(value["id"]))
            elif cmd_type == "set_relay_name":
                shared_state.set_relay_name(str(value["relay"]), value["name"])
                shared_state.add_log("[cmd] rele{} nome={}".format(value["relay"], value["name"]))
            else:
                shared_state.add_log("[cmd] desconhecido: {}".format(cmd_type))
        except Exception as e:
            shared_state.add_log("[cmd] erro {}: {}".format(cmd_type, e))


async def cloud_sync_task():
    """Task que envia dados periodicamente para a Cloud Function.
    
    Só tenta se:
    - enabled == True
    - Existe WiFi salvo (credenciais configuradas)
    - WiFi está conectado
    """
    import gc
    print("[cloud] Task init enabled={} interval={}s".format(_enabled, _sync_interval))
    shared_state.add_log("[cloud] Task iniciada")

    while True:
        await asyncio.sleep_ms(_sync_interval * 1000)

        if not _enabled:
            continue

        # Só tenta se tem WiFi salvo — se não tem, nem gasta recurso
        saved_ssid, _ = wifi.load_wifi_properties()
        if not saved_ssid:
            continue

        # Só envia se conectado
        if not wifi.is_connected():
            continue

        temp, hum = shared_state.get_sensor_data()
        if temp is None or hum is None:
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

        try:
            gc.collect()
            import usocket
            try:
                import ussl as ssl
            except ImportError:
                import ssl

            # Parse URL
            url_body = CLOUD_URL.split("://")[1]
            host = url_body.split("/")[0]
            path = "/" + "/".join(url_body.split("/")[1:])
            port = 443

            # Resolve e conecta
            addr = usocket.getaddrinfo(host, port)[0][-1]
            sock = usocket.socket()
            sock.settimeout(15)
            sock.connect(addr)
            sock = ssl.wrap_socket(sock, server_hostname=host)

            # Envia
            request = "POST {} HTTP/1.0\r\nHost: {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}".format(
                path, host, len(payload), payload)
            sock.write(request.encode())

            # Lê resposta
            response = sock.read(512)
            sock.close()

            if response and b"200" in response:
                shared_state.add_log("[cloud] OK T={:.1f} H={:.1f}".format(temp, hum))
                # Processa comandos
                try:
                    json_start = response.find(b'{')
                    if json_start >= 0:
                        resp_json = ujson.loads(response[json_start:])
                        cmds = resp_json.get("commands", [])
                        if cmds:
                            print("[cloud] {} comandos".format(len(cmds)))
                            process_commands(cmds)
                except Exception:
                    pass
            else:
                shared_state.add_log("[cloud] HTTP err")

            gc.collect()
        except Exception as e:
            shared_state.add_log("[cloud] Erro: {}".format(e))
            try:
                sock.close()
            except:
                pass
            gc.collect()
