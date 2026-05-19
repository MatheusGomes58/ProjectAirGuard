# ==============================================================================
# shared_state.py — Estado compartilhado entre Core 0 (display) e Core 1 (WiFi)
# EcoBreath | Raspberry Pi Pico 2W — MicroPython
# ==============================================================================
# Usa _thread.allocate_lock() para acesso thread-safe entre os dois cores.
# Core 0: lê o estado para exibir no display
# Core 1: escreve o estado ao atualizar status de WiFi
# ==============================================================================

import _thread

_lock = _thread.allocate_lock()

# --- Estado WiFi ---
_wifi_status    = "AP"      # "AP" | "CONNECTING" | "CONNECTED" | "LOST"
_wifi_ssid      = ""
_wifi_ip        = ""

# --- Estado Sensores (escrito pelo Core 0, pode ser lido pelo Core 1 no futuro) ---
_temperature    = None
_humidity       = None
_battery_volt   = None
_battery_pct    = None


# ==============================================================================
# WiFi State (escrito pelo Core 1)
# ==============================================================================
def set_wifi_connected(ssid, ip):
    global _wifi_status, _wifi_ssid, _wifi_ip
    with _lock:
        _wifi_status = "CONNECTED"
        _wifi_ssid   = ssid
        _wifi_ip     = ip

def set_wifi_connecting():
    global _wifi_status
    with _lock:
        _wifi_status = "CONNECTING"

def set_wifi_lost():
    global _wifi_status
    with _lock:
        _wifi_status = "LOST"

def set_wifi_ap():
    global _wifi_status
    with _lock:
        _wifi_status = "AP"

def get_wifi_state():
    with _lock:
        return _wifi_status, _wifi_ssid, _wifi_ip


# ==============================================================================
# Sensor State (escrito pelo Core 0)
# ==============================================================================
def set_sensor_data(temp, hum):
    global _temperature, _humidity
    with _lock:
        _temperature = temp
        _humidity    = hum

def set_battery_data(volt, pct):
    global _battery_volt, _battery_pct
    with _lock:
        _battery_volt = volt
        _battery_pct  = pct

def get_sensor_data():
    with _lock:
        return _temperature, _humidity

def get_battery_data():
    with _lock:
        return _battery_volt, _battery_pct
