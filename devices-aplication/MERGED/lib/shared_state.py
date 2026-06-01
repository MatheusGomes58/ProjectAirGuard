# ==============================================================================
# shared_state.py — Estado compartilhado thread-safe | EcoBreath Merged
# Hardware: Display + DHT22 + Bateria (sem relés)
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
_wifi_ssid = ""
_wifi_ip = ""
_temperature = None
_humidity = None
_battery_volt = None
_battery_pct = None
_log_buffer = []
_LOG_MAX = 15
_history = []
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
# Sensor + Battery
# ==============================================================================
def set_sensor_data(temp, hum):
    global _temperature, _humidity
    with _lock: _temperature = temp; _humidity = hum

def get_sensor_data():
    with _lock: return _temperature, _humidity

def set_battery_data(volt, pct):
    global _battery_volt, _battery_pct
    with _lock: _battery_volt = volt; _battery_pct = pct

def get_battery_data():
    with _lock: return _battery_volt, _battery_pct

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
# History (sensor readings over time)
# ==============================================================================
def add_history_point(temp, hum):
    global _history
    with _lock:
        _history.append({"t": temp, "h": hum})
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
            ujson.dump({"wifi_ssid": _wifi_ssid}, f)
    except: pass

def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            ujson.load(f)
    except: pass
