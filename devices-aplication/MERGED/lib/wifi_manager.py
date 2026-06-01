# ==============================================================================
# wifi_manager.py — WiFi Manager | EcoBreath Merged
# ==============================================================================
import network
import utime
import usocket
import uasyncio as asyncio
import ujson
import os
from lib import shared_state
from config import AP_SSID, WIFI_RETRY_ATTEMPTS, WIFI_RETRY_DELAY_MS, CONFIG_DIR

_ap_if = network.WLAN(network.AP_IF)
_sta_if = network.WLAN(network.STA_IF)
WIFI_FILE = CONFIG_DIR + "/wifi.json"

def _ensure_config_dir():
    try: os.stat(CONFIG_DIR)
    except OSError: os.mkdir(CONFIG_DIR)

# --- Persistência ---
def load_wifi_properties():
    try:
        with open(WIFI_FILE, 'r') as f:
            data = ujson.load(f)
            return data.get('ssid'), data.get('password')
    except: return None, None

def save_wifi_properties(ssid, password):
    _ensure_config_dir()
    try:
        with open(WIFI_FILE, 'w') as f: ujson.dump({"ssid": ssid, "password": password}, f)
        return True
    except: return False

def delete_wifi_properties():
    try: os.remove(WIFI_FILE); return True
    except: return False

# --- Access Point ---
def start_ap():
    if not _sta_if.isconnected(): _sta_if.active(False)
    _ap_if.active(False); utime.sleep_ms(500)
    _ap_if.active(True)
    for _ in range(30):
        if _ap_if.active(): break
        utime.sleep_ms(200)
    try: _ap_if.config(essid=AP_SSID, security=0, password='')
    except:
        try: _ap_if.config(essid=AP_SSID, authmode=0)
        except:
            try: _ap_if.config(essid=AP_SSID, security=0)
            except: _ap_if.config(essid=AP_SSID)
    utime.sleep_ms(1000)
    ip = _ap_if.ifconfig()[0]
    shared_state.set_wifi_ap()
    return ip

def get_ap_ip():
    return _ap_if.ifconfig()[0] if _ap_if.active() else "0.0.0.0"

def stop_ap():
    _ap_if.active(False)

# --- Scan ---
def scan_networks():
    _sta_if.active(True); utime.sleep_ms(1000)
    try: results = _sta_if.scan()
    except: return []
    networks = []; seen = set()
    for r in results:
        ssid = r[0].decode('utf-8', 'ignore').strip()
        if not ssid or ssid in seen: continue
        seen.add(ssid)
        rssi = r[3]
        signal = 4 if rssi >= -50 else 3 if rssi >= -60 else 2 if rssi >= -70 else 1 if rssi >= -80 else 0
        networks.append({"ssid": ssid, "rssi": rssi, "signal": signal, "secure": r[4] != 0})
    networks.sort(key=lambda x: x['rssi'], reverse=True)
    return networks

# --- Connect ---
def connect_to_wifi(ssid, password, save=True):
    shared_state.set_wifi_connecting()
    _sta_if.active(True); utime.sleep_ms(500)
    if _sta_if.isconnected(): _sta_if.disconnect(); utime.sleep_ms(1000)
    _sta_if.connect(ssid, password)
    for _ in range(WIFI_RETRY_ATTEMPTS):
        if _sta_if.isconnected(): break
        utime.sleep_ms(WIFI_RETRY_DELAY_MS)
    if _sta_if.isconnected():
        ip = _sta_if.ifconfig()[0]
        net_mode = shared_state.get_net_mode()
        if net_mode == "wifi": stop_ap()
        elif net_mode == "ap": shared_state.set_net_mode("hybrid")
        shared_state.set_wifi_connected(ssid, ip)
        if save: save_wifi_properties(ssid, password)
        return True, ip
    else:
        _sta_if.disconnect()
        shared_state.set_wifi_ap()
        return False, ""

def disconnect_wifi():
    if _sta_if.isconnected(): _sta_if.disconnect()
    _sta_if.active(False)
    start_ap()

def get_sta_ip():
    return _sta_if.ifconfig()[0] if _sta_if.isconnected() else ""

def is_connected():
    return _sta_if.isconnected()

def try_saved_wifi():
    ssid, password = load_wifi_properties()
    if ssid:
        success, _ = connect_to_wifi(ssid, password, save=False)
        return success
    return False

# --- DNS Captivo ---
async def dns_server_task():
    ap_ip = get_ap_ip()
    ip_bytes = bytes(int(x) for x in ap_ip.split('.'))
    sock = usocket.socket(usocket.AF_INET, usocket.SOCK_DGRAM)
    sock.setsockopt(usocket.SOL_SOCKET, usocket.SO_REUSEADDR, 1)
    sock.bind(('0.0.0.0', 53))
    sock.setblocking(False)
    while True:
        try:
            data, addr = sock.recvfrom(512)
            if data and len(data) > 12:
                tid = data[:2]
                flags = b'\x81\x80'
                qd = data[4:6]
                header = tid + flags + qd + b'\x00\x01\x00\x00\x00\x00'
                qend = 12
                while qend < len(data) and data[qend] != 0: qend += data[qend] + 1
                qend += 5
                question = data[12:qend]
                answer = b'\xc0\x0c\x00\x01\x00\x01\x00\x00\x00\x3c\x00\x04' + ip_bytes
                sock.sendto(header + question + answer, addr)
        except OSError: pass
        await asyncio.sleep_ms(50)
