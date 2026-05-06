# ==============================================================================
# shared_state.py — Estado compartilhado | PID Climate Controller
# ==============================================================================
import _thread
import ujson
import os
from lib.config import (
    DEFAULT_TEMP_SETPOINT, DEFAULT_HUM_SETPOINT, DEFAULT_CONTROL_MODE, CONFIG_DIR
)

_lock = _thread.allocate_lock()

# --- Caminhos dos arquivos de configuração ---
SETPOINTS_FILE = CONFIG_DIR + "/setpoints.json"
RELAYS_FILE = CONFIG_DIR + "/relays.json"
CONTROL_FILE = CONFIG_DIR + "/control.json"
WIFI_FILE = CONFIG_DIR + "/wifi.json"


def _ensure_config_dir():
    try:
        os.stat(CONFIG_DIR)
    except OSError:
        os.mkdir(CONFIG_DIR)


# --- Estado ---
_wifi_status = "AP"
_wifi_ssid = ""
_wifi_ip = ""
_temperature = None
_humidity = None
_temp_setpoint = DEFAULT_TEMP_SETPOINT
_hum_setpoint = DEFAULT_HUM_SETPOINT
_control_mode = DEFAULT_CONTROL_MODE
_fan_on = False
_humid_on = False
_pid_temp_output = 0.0
_pid_hum_output = 0.0
_manual_fan = False
_manual_humid = False
_relay1_name = "Ventilador"
_relay2_name = "Umidificador"
_relay1_sensor = "temp"
_relay1_action = "above"
_relay2_sensor = "hum"
_relay2_action = "below"
_control_period = 0
_log_buffer = []
_LOG_MAX = 50
_history = []
_HISTORY_MAX = 60


# ==============================================================================
# Persistência — Setpoints
# ==============================================================================
def save_setpoints_file():
    _ensure_config_dir()
    try:
        with open(SETPOINTS_FILE, 'w') as f:
            ujson.dump({"temp_sp": _temp_setpoint, "hum_sp": _hum_setpoint, "mode": _control_mode}, f)
    except OSError:
        pass


def load_setpoints_file():
    global _temp_setpoint, _hum_setpoint, _control_mode
    try:
        with open(SETPOINTS_FILE, 'r') as f:
            data = ujson.load(f)
            _temp_setpoint = data.get("temp_sp", DEFAULT_TEMP_SETPOINT)
            _hum_setpoint = data.get("hum_sp", DEFAULT_HUM_SETPOINT)
            _control_mode = data.get("mode", DEFAULT_CONTROL_MODE)
            print("[state] Setpoints: T={} H={} mode={}".format(_temp_setpoint, _hum_setpoint, _control_mode))
    except (OSError, ValueError):
        pass


# ==============================================================================
# Persistência — Nomes dos Relés
# ==============================================================================
def save_relay_names_file():
    _ensure_config_dir()
    try:
        with open(RELAYS_FILE, 'w') as f:
            ujson.dump({"relay1": _relay1_name, "relay2": _relay2_name}, f)
    except OSError:
        pass


def load_relay_names_file():
    global _relay1_name, _relay2_name
    try:
        with open(RELAYS_FILE, 'r') as f:
            data = ujson.load(f)
            _relay1_name = data.get("relay1", "Ventilador")
            _relay2_name = data.get("relay2", "Umidificador")
            print("[state] Reles: '{}' / '{}'".format(_relay1_name, _relay2_name))
    except (OSError, ValueError):
        pass


def set_relay_names(name1, name2):
    global _relay1_name, _relay2_name
    with _lock:
        _relay1_name = name1
        _relay2_name = name2
    save_relay_names_file()


def get_relay_names():
    with _lock:
        return _relay1_name, _relay2_name


# ==============================================================================
# Persistência — Configuração de Controle
# ==============================================================================
def save_control_config():
    _ensure_config_dir()
    try:
        with open(CONTROL_FILE, 'w') as f:
            ujson.dump({"r1_sensor": _relay1_sensor, "r1_action": _relay1_action,
                        "r2_sensor": _relay2_sensor, "r2_action": _relay2_action,
                        "period": _control_period}, f)
    except OSError:
        pass


def load_control_config():
    global _relay1_sensor, _relay1_action, _relay2_sensor, _relay2_action, _control_period
    try:
        with open(CONTROL_FILE, 'r') as f:
            data = ujson.load(f)
            _relay1_sensor = data.get("r1_sensor", "temp")
            _relay1_action = data.get("r1_action", "above")
            _relay2_sensor = data.get("r2_sensor", "hum")
            _relay2_action = data.get("r2_action", "below")
            _control_period = data.get("period", 0)
            print("[state] Controle: R1={}({}) R2={}({}) P={}".format(
                _relay1_sensor, _relay1_action, _relay2_sensor, _relay2_action, _control_period))
    except (OSError, ValueError):
        pass


def set_control_config(r1_sensor, r1_action, r2_sensor, r2_action, period):
    global _relay1_sensor, _relay1_action, _relay2_sensor, _relay2_action, _control_period
    with _lock:
        _relay1_sensor = r1_sensor
        _relay1_action = r1_action
        _relay2_sensor = r2_sensor
        _relay2_action = r2_action
        _control_period = period
    save_control_config()


def get_control_config():
    with _lock:
        return _relay1_sensor, _relay1_action, _relay2_sensor, _relay2_action, _control_period


# ==============================================================================
# WiFi State
# ==============================================================================
def set_wifi_connected(ssid, ip):
    global _wifi_status, _wifi_ssid, _wifi_ip
    with _lock:
        _wifi_status = "CONNECTED"
        _wifi_ssid = ssid
        _wifi_ip = ip

def set_wifi_connecting():
    global _wifi_status
    with _lock:
        _wifi_status = "CONNECTING"

def set_wifi_ap():
    global _wifi_status
    with _lock:
        _wifi_status = "AP"

def get_wifi_state():
    with _lock:
        return _wifi_status, _wifi_ssid, _wifi_ip


# ==============================================================================
# Sensor / Setpoints / Mode / Relays / PID / Manual / Log / History
# ==============================================================================
def set_sensor_data(temp, hum):
    global _temperature, _humidity
    with _lock:
        _temperature = temp
        _humidity = hum

def get_sensor_data():
    with _lock:
        return _temperature, _humidity

def set_setpoints(temp_sp, hum_sp):
    global _temp_setpoint, _hum_setpoint
    with _lock:
        _temp_setpoint = temp_sp
        _hum_setpoint = hum_sp
    save_setpoints_file()

def get_setpoints():
    with _lock:
        return _temp_setpoint, _hum_setpoint

def set_control_mode(mode):
    global _control_mode
    with _lock:
        _control_mode = mode
    save_setpoints_file()

def get_control_mode():
    with _lock:
        return _control_mode

def set_relay_status(fan, humid):
    global _fan_on, _humid_on
    with _lock:
        _fan_on = fan
        _humid_on = humid

def get_relay_status():
    with _lock:
        return _fan_on, _humid_on

def set_controller_outputs(pid_temp, pid_hum):
    global _pid_temp_output, _pid_hum_output
    with _lock:
        _pid_temp_output = pid_temp
        _pid_hum_output = pid_hum

def get_controller_outputs():
    with _lock:
        return _pid_temp_output, _pid_hum_output

def set_manual_relays(fan, humid):
    global _manual_fan, _manual_humid
    with _lock:
        _manual_fan = fan
        _manual_humid = humid

def get_manual_relays():
    with _lock:
        return _manual_fan, _manual_humid

def add_log(msg):
    global _log_buffer
    with _lock:
        _log_buffer.append(msg)
        if len(_log_buffer) > _LOG_MAX:
            _log_buffer = _log_buffer[-_LOG_MAX:]

def get_logs():
    with _lock:
        return list(_log_buffer)

def add_history_point(temp, hum, temp_sp, hum_sp, fan_duty, hum_duty):
    global _history
    with _lock:
        _history.append({"t": temp, "h": hum, "ts": temp_sp, "hs": hum_sp,
                         "fd": round(fan_duty, 2), "hd": round(hum_duty, 2)})
        if len(_history) > _HISTORY_MAX:
            _history = _history[-_HISTORY_MAX:]

def get_history():
    with _lock:
        return list(_history)
