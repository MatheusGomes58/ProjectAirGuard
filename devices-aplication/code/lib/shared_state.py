# ==============================================================================
# shared_state.py — Estado compartilhado thread-safe | EcoBreath Merged
# Hardware: Display + ENS160 + AHT21 + Bateria (sem relés)
# ==============================================================================
import _thread
import ujson
import os
from config import CONFIG_DIR

_lock = _thread.allocate_lock()
STATE_FILE = CONFIG_DIR + "/state.json"

def _ensure_config_dir():
    try: os.stat(CONFIG_DIR)
    except OSError:
        try: os.mkdir(CONFIG_DIR)
        except: pass

# --- Runtime State ---
_wifi_status = "AP"
_wifi_ssid   = ""
_wifi_ip     = ""
_net_mode    = "ap"       # "ap" | "wifi" | "hybrid"

_temperature = None
_humidity    = None
_aqi         = None       # ENS160 AQI UBA (1-5)
_tvoc        = None       # ENS160 TVOC em ppb
_eco2        = None       # ENS160 eCO2 em ppm

_battery_volt = None
_battery_pct  = None

# Preferencias da interface web e do dispositivo.
_theme = "dark"       # "dark" | "light"
_language = "pt"       # "pt" | "en" | "es"
_energy_saver = False
_display_enabled = True

_log_buffer = []
_LOG_MAX    = 15
_history    = []
_HISTORY_MAX = 60

# ==============================================================================
# WiFi
# ==============================================================================
def set_wifi_connected(ssid, ip):
    global _wifi_status, _wifi_ssid, _wifi_ip
    with _lock: _wifi_status = "CONNECTED"; _wifi_ssid = ssid; _wifi_ip = ip

def set_wifi_connecting():
    global _wifi_status
    with _lock: _wifi_status = "CONNECTING"

def set_wifi_ap():
    global _wifi_status
    with _lock: _wifi_status = "AP"

def get_wifi_state():
    with _lock: return _wifi_status, _wifi_ssid, _wifi_ip

# ==============================================================================
# Net mode (ap | wifi | hybrid)
# ==============================================================================
def get_net_mode():
    with _lock: return _net_mode

def set_net_mode(mode):
    global _net_mode
    with _lock: _net_mode = mode

# ==============================================================================
# Sensor (AHT21 + ENS160)
# ==============================================================================
def set_sensor_data(temp, hum, aqi=None, tvoc=None, eco2=None):
    global _temperature, _humidity, _aqi, _tvoc, _eco2
    with _lock:
        _temperature = temp
        _humidity    = hum
        _aqi         = aqi
        _tvoc        = tvoc
        _eco2        = eco2

def get_sensor_data():
    """Retorna (temp, hum, aqi, tvoc, eco2)."""
    with _lock:
        return _temperature, _humidity, _aqi, _tvoc, _eco2

# ==============================================================================
# Battery
# ==============================================================================
def set_battery_data(volt, pct):
    global _battery_volt, _battery_pct
    with _lock: _battery_volt = volt; _battery_pct = pct

def get_battery_data():
    with _lock: return _battery_volt, _battery_pct

# ==============================================================================
# Interface (tema + idioma)
# ==============================================================================
def get_preferences():
    with _lock: return {"theme": _theme, "language": _language, "energy_saver": _energy_saver, "display_enabled": _display_enabled}

def set_preferences(theme=None, language=None, energy_saver=None, display_enabled=None):
    global _theme, _language, _energy_saver, _display_enabled
    with _lock:
        if theme in ("dark", "light"):
            _theme = theme
        if language in ("pt", "en", "es"):
            _language = language
        if isinstance(energy_saver, bool):
            _energy_saver = energy_saver
        if isinstance(display_enabled, bool):
            _display_enabled = display_enabled
    save_state()
    return get_preferences()

# ==============================================================================
# Log
# ==============================================================================
def add_log(msg):
    global _log_buffer
    with _lock:
        _log_buffer.append(msg)
        if len(_log_buffer) > _LOG_MAX:
            _log_buffer = _log_buffer[-_LOG_MAX:]

def get_logs():
    with _lock: return list(_log_buffer)

# ==============================================================================
# History (leituras ao longo do tempo)
# ==============================================================================
def add_history_point(temp, hum, aqi=None, tvoc=None, eco2=None):
    global _history
    with _lock:
        _history.append({"t": temp, "h": hum, "a": aqi, "v": tvoc, "c": eco2})
        if len(_history) > _HISTORY_MAX:
            _history = _history[-_HISTORY_MAX:]

def get_history():
    with _lock: return list(_history)

# ==============================================================================
# State Persistence
# ==============================================================================
def save_state():
    _ensure_config_dir()
    try:
        with open(STATE_FILE, 'w') as f:
            ujson.dump({"wifi_ssid": _wifi_ssid, "theme": _theme, "language": _language, "energy_saver": _energy_saver, "display_enabled": _display_enabled}, f)
    except: pass

def load_state():
    global _theme, _language, _energy_saver, _display_enabled
    try:
        with open(STATE_FILE, 'r') as f:
            data = ujson.load(f)
            if data.get("theme") in ("dark", "light"):
                _theme = data.get("theme")
            if data.get("language") in ("pt", "en", "es"):
                _language = data.get("language")
            if isinstance(data.get("energy_saver"), bool):
                _energy_saver = data.get("energy_saver")
            if isinstance(data.get("display_enabled"), bool):
                _display_enabled = data.get("display_enabled")
    except: pass

