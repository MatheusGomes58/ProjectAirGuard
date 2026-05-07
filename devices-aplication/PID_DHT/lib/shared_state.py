# ==============================================================================
# shared_state.py — Estado compartilhado | EcoBreath Shield
# ==============================================================================
# Modelo dinâmico:
#   - Setpoints: lista de {id, name, sensor, value}
#   - Actions: lista de {id, name, relay, setpoint_id, condition, period}
# ==============================================================================
import _thread
import ujson
import os
from lib.config import CONFIG_DIR, DEFAULT_CONTROL_MODE

_lock = _thread.allocate_lock()

# --- Arquivos ---
SETPOINTS_FILE = CONFIG_DIR + "/setpoints.json"
ACTIONS_FILE = CONFIG_DIR + "/actions.json"
STATE_FILE = CONFIG_DIR + "/state.json"

def _ensure_config_dir():
    try:
        os.stat(CONFIG_DIR)
    except OSError:
        try:
            os.mkdir(CONFIG_DIR)
        except Exception as e:
            print("[state] ERRO mkdir:", e)


# ==============================================================================
# Estado runtime
# ==============================================================================
_wifi_status = "AP"
_wifi_ssid = ""
_wifi_ip = ""
_temperature = None
_humidity = None
_control_mode = DEFAULT_CONTROL_MODE  # "auto" | "manual"
_relay_states = {}   # {relay_pin: True/False}
_manual_states = {}  # {relay_pin: True/False}
_relay_names = {"1": "Rele 1", "2": "Rele 2"}
_log_buffer = []
_LOG_MAX = 10
_history = []
_HISTORY_MAX = 20

# --- Modo de rede: "ap" | "hybrid" | "wifi" ---
_net_mode = "ap"

# --- Setpoints dinâmicos ---
# Cada: {"id": "sp1", "name": "Temp Max", "sensor": "temp", "value": 25.0}
_setpoints = []

# --- Ações dinâmicas ---
# Cada: {"id": "a1", "name": "Ventilador", "relay": 1, "setpoint_id": "sp1",
#         "condition": "above", "period": 10}
# relay: 1 ou 2 (pino fisico)
# condition: "above" (liga quando sensor > SP) ou "below" (liga quando sensor < SP)
# period: duty-cycle em segundos (0 = liga direto sem ciclo)
_actions = []

# --- Contadores para IDs ---
_next_sp_id = 1
_next_act_id = 1


# ==============================================================================
# Persistência — Setpoints
# ==============================================================================
def save_setpoints():
    _ensure_config_dir()
    try:
        with open(SETPOINTS_FILE, 'w') as f:
            ujson.dump({"setpoints": _setpoints, "next_id": _next_sp_id}, f)
    except Exception as e:
        print("[state] ERRO save SP:", e)


def load_setpoints():
    global _setpoints, _next_sp_id
    try:
        with open(SETPOINTS_FILE, 'r') as f:
            data = ujson.load(f)
            _setpoints = data.get("setpoints", [])
            _next_sp_id = data.get("next_id", 1)
            print("[state] {} setpoints carregados".format(len(_setpoints)))
    except (OSError, ValueError):
        pass


def add_setpoint(name, sensor, value):
    global _next_sp_id
    with _lock:
        sp = {"id": "sp{}".format(_next_sp_id), "name": name, "sensor": sensor, "value": float(value)}
        _setpoints.append(sp)
        _next_sp_id += 1
    save_setpoints()
    return sp


def update_setpoint(sp_id, value):
    with _lock:
        for sp in _setpoints:
            if sp["id"] == sp_id:
                sp["value"] = float(value)
                break
    save_setpoints()


def remove_setpoint(sp_id):
    global _setpoints, _actions
    with _lock:
        _setpoints = [sp for sp in _setpoints if sp["id"] != sp_id]
        # Remove ações que dependem desse setpoint
        _actions = [a for a in _actions if a["setpoint_id"] != sp_id]
    save_setpoints()
    save_actions()


def get_setpoints_list():
    with _lock:
        return list(_setpoints)


# ==============================================================================
# Persistência — Ações (Atuadores)
# ==============================================================================
def save_actions():
    _ensure_config_dir()
    try:
        with open(ACTIONS_FILE, 'w') as f:
            ujson.dump({"actions": _actions, "next_id": _next_act_id}, f)
    except Exception as e:
        print("[state] ERRO save actions:", e)


def load_actions():
    global _actions, _next_act_id
    try:
        with open(ACTIONS_FILE, 'r') as f:
            data = ujson.load(f)
            _actions = data.get("actions", [])
            _next_act_id = data.get("next_id", 1)
            print("[state] {} acoes carregadas".format(len(_actions)))
    except (OSError, ValueError):
        pass


def add_action(name, relay, setpoint_id, condition, period):
    global _next_act_id
    with _lock:
        act = {
            "id": "a{}".format(_next_act_id),
            "name": name,
            "relay": int(relay),
            "setpoint_id": setpoint_id,
            "condition": condition,
            "period": int(period)
        }
        _actions.append(act)
        _next_act_id += 1
    save_actions()
    return act


def remove_action(act_id):
    global _actions
    with _lock:
        _actions = [a for a in _actions if a["id"] != act_id]
    save_actions()


def get_actions_list():
    with _lock:
        return list(_actions)


# ==============================================================================
# Persistência — Estado (modo)
# ==============================================================================
def save_state():
    _ensure_config_dir()
    try:
        with open(STATE_FILE, 'w') as f:
            ujson.dump({"mode": _control_mode, "manual": _manual_states, "net_mode": _net_mode}, f)
    except Exception:
        pass


def load_state():
    global _control_mode, _manual_states, _net_mode
    try:
        with open(STATE_FILE, 'r') as f:
            data = ujson.load(f)
            _control_mode = data.get("mode", DEFAULT_CONTROL_MODE)
            _manual_states = data.get("manual", {})
            _net_mode = data.get("net_mode", "ap")
            print("[state] Modo: {} | Rede: {}".format(_control_mode, _net_mode))
    except (OSError, ValueError):
        pass


# ==============================================================================
# WiFi
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
# Sensor
# ==============================================================================
def set_sensor_data(temp, hum):
    global _temperature, _humidity
    with _lock:
        _temperature = temp
        _humidity = hum

def get_sensor_data():
    with _lock:
        return _temperature, _humidity

def get_sensor_value(sensor_type):
    """Retorna o valor do sensor pelo tipo ('temp' ou 'hum')."""
    with _lock:
        if sensor_type == "temp":
            return _temperature
        return _humidity


# ==============================================================================
# Modo de controle
# ==============================================================================
def set_control_mode(mode):
    global _control_mode
    with _lock:
        _control_mode = mode
    save_state()

def get_control_mode():
    with _lock:
        return _control_mode


# ==============================================================================
# Modo de Rede
# ==============================================================================
def set_net_mode(mode):
    global _net_mode
    with _lock:
        _net_mode = mode
    save_state()

def get_net_mode():
    with _lock:
        return _net_mode


# ==============================================================================
# Estado dos relés
# ==============================================================================
def set_relay_state(relay, state):
    with _lock:
        _relay_states[str(relay)] = state

def get_relay_state(relay):
    with _lock:
        return _relay_states.get(str(relay), False)

def get_all_relay_states():
    with _lock:
        return dict(_relay_states)


# ==============================================================================
# Manual
# ==============================================================================
def set_manual_relay(relay, state):
    with _lock:
        _manual_states[str(relay)] = state
    save_state()

def get_manual_relay(relay):
    with _lock:
        return _manual_states.get(str(relay), False)

def get_all_manual_states():
    with _lock:
        return dict(_manual_states)


# ==============================================================================
# Nomes dos Relés
# ==============================================================================
RELAYS_FILE = CONFIG_DIR + "/relays.json"

def save_relay_names():
    _ensure_config_dir()
    try:
        with open(RELAYS_FILE, 'w') as f:
            ujson.dump(_relay_names, f)
    except Exception:
        pass

def load_relay_names():
    global _relay_names
    try:
        with open(RELAYS_FILE, 'r') as f:
            data = ujson.load(f)
            _relay_names = data
            print("[state] Reles: {}".format(_relay_names))
    except (OSError, ValueError):
        pass

def set_relay_name(relay, name):
    with _lock:
        _relay_names[str(relay)] = name
    save_relay_names()

def get_relay_names():
    with _lock:
        return dict(_relay_names)


# ==============================================================================
# Log / History
# ==============================================================================
def add_log(msg):
    global _log_buffer
    with _lock:
        _log_buffer.append(msg)
        if len(_log_buffer) > _LOG_MAX:
            _log_buffer = _log_buffer[-_LOG_MAX:]

def get_logs():
    with _lock:
        return list(_log_buffer)

def add_history_point(temp, hum, r1_on, r2_on):
    global _history
    with _lock:
        _history.append({"t": temp, "h": hum, "r1": 1 if r1_on else 0, "r2": 1 if r2_on else 0})
        if len(_history) > _HISTORY_MAX:
            _history = _history[-_HISTORY_MAX:]

def get_history():
    with _lock:
        return list(_history)
