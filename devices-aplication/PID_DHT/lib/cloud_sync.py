# ==============================================================================
# cloud_sync.py — Envia dados dos sensores para Google Cloud Functions / Firestore
# ==============================================================================
import uasyncio as asyncio
import urequests
import ujson

from lib import shared_state
from lib.config import CONFIG_DIR

CLOUD_FILE = CONFIG_DIR + "/cloud.json"

# Configuração padrão
_cloud_url = ""
_device_id = "pico-001"
_sync_interval = 30  # segundos
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
            ujson.dump({
                "url": _cloud_url,
                "device_id": _device_id,
                "interval": _sync_interval,
                "enabled": _enabled
            }, f)
    except Exception:
        pass


def load_cloud_config():
    global _cloud_url, _device_id, _sync_interval, _enabled
    try:
        with open(CLOUD_FILE, 'r') as f:
            data = ujson.load(f)
            _cloud_url = data.get("url", "")
            _device_id = data.get("device_id", "pico-001")
            _sync_interval = data.get("interval", 30)
            _enabled = data.get("enabled", False)
            if _enabled:
                print("[cloud] Sync ativo: {} cada {}s".format(_device_id, _sync_interval))
    except (OSError, ValueError):
        pass


def set_cloud_config(url, device_id, interval, enabled):
    global _cloud_url, _device_id, _sync_interval, _enabled
    _cloud_url = url
    _device_id = device_id
    _sync_interval = max(10, int(interval))
    _enabled = enabled
    save_cloud_config()


def get_cloud_config():
    return {
        "url": _cloud_url,
        "device_id": _device_id,
        "interval": _sync_interval,
        "enabled": _enabled
    }


async def cloud_sync_task():
    """Task que envia dados periodicamente para a Cloud Function."""
    while True:
        await asyncio.sleep_ms(_sync_interval * 1000)

        if not _enabled or not _cloud_url:
            continue

        # Só envia se tiver WiFi
        from lib import wifi_manager as wifi
        if not wifi.is_connected():
            continue

        temp, hum = shared_state.get_sensor_data()
        if temp is None or hum is None:
            continue

        r1 = shared_state.get_relay_state(1)
        r2 = shared_state.get_relay_state(2)

        payload = ujson.dumps({
            "device_id": _device_id,
            "temperature": round(temp, 1),
            "humidity": round(hum, 1),
            "relay1": r1,
            "relay2": r2
        })

        try:
            resp = urequests.post(
                _cloud_url,
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            if resp.status_code == 200:
                shared_state.add_log("[cloud] Sync OK T={:.1f} H={:.1f}".format(temp, hum))
            else:
                shared_state.add_log("[cloud] Erro HTTP {}".format(resp.status_code))
            resp.close()
        except Exception as e:
            shared_state.add_log("[cloud] Erro: {}".format(e))
