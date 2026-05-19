# ==============================================================================
# wifi_manager.py — Gerenciador WiFi | EcoBreath Merged (Pico 2W)
# Modos: Access Point (captive portal) + Estação (STA)
# Notifica shared_state ao conectar/desconectar
# ==============================================================================
import network
import usocket
import utime
import ujson
import uasyncio as asyncio

import shared_state
from config import AP_SSID, AP_PASSWORD, WIFI_RETRY_ATTEMPTS, WIFI_RETRY_DELAY_MS

# --- Interfaces de rede ---
_ap_if  = network.WLAN(network.AP_IF)
_sta_if = network.WLAN(network.STA_IF)

# --- Estado interno ---
_connected_ssid = ""
_connected_ip   = ""
_scanned_networks = []
_is_connecting  = False


# ==============================================================================
# Access Point
# ==============================================================================
def start_ap():
    _ap_if.active(False)
    _sta_if.active(False)
    utime.sleep_ms(500)

    _ap_if.active(True)
    utime.sleep_ms(200)
    _ap_if.config(essid=AP_SSID, password=AP_PASSWORD, channel=6)

    timeout = 20
    while not _ap_if.active() and timeout > 0:
        utime.sleep_ms(500)
        timeout -= 1

    if not _ap_if.active():
        print("[wifi] AVISO: AP não subiu. Faça um hard reset.")
        return "0.0.0.0"

    ip = _ap_if.ifconfig()[0]
    print("[wifi] AP iniciado — IP:", ip)
    shared_state.set_wifi_ap()
    return ip


def get_ap_ip():
    if _ap_if.active():
        return _ap_if.ifconfig()[0]
    return "0.0.0.0"


def stop_ap():
    _ap_if.active(False)


# ==============================================================================
# Scan de redes WiFi
# ==============================================================================
def scan_networks():
    global _scanned_networks
    if _is_connecting:
        print("[wifi] Scan ignorado — conexão em andamento")
        return get_scanned_json()
    try:
        _sta_if.active(True)
        raw = _sta_if.scan()
        seen_ssids = set()
        networks = []
        for net in raw:
            ssid = net[0].decode('utf-8', 'ignore').strip()
            rssi = net[3]
            if ssid and ssid not in seen_ssids:
                seen_ssids.add(ssid)
                networks.append({"ssid": ssid, "rssi": rssi})
        _scanned_networks = networks
        print("[wifi] {} redes encontradas".format(len(networks)))
    except Exception as e:
        print("[wifi] Erro no scan:", e)
        _scanned_networks = []
    return ujson.dumps({"networks": _scanned_networks})


def get_scanned_json():
    return ujson.dumps({"networks": _scanned_networks})


# ==============================================================================
# Conexão STA
# ==============================================================================
def connect_sta(ssid, password):
    global _connected_ssid, _connected_ip, _is_connecting

    _is_connecting = True
    shared_state.set_wifi_connecting()
    print("[wifi] Conectando a:", ssid)
    stop_ap()
    _sta_if.active(True)
    _sta_if.connect(ssid, password)

    for attempt in range(WIFI_RETRY_ATTEMPTS):
        if _sta_if.isconnected():
            ip = _sta_if.ifconfig()[0]
            _connected_ssid = ssid
            _connected_ip   = ip
            _is_connecting  = False
            shared_state.set_wifi_connected(ssid, ip)
            print("[wifi] Conectado! IP:", ip)
            return True, ip
        utime.sleep_ms(WIFI_RETRY_DELAY_MS)
        print("[wifi] Tentativa {}/{}...".format(attempt + 1, WIFI_RETRY_ATTEMPTS))

    print("[wifi] Falha ao conectar.")
    _connected_ssid = ""
    _connected_ip   = ""
    _is_connecting  = False
    start_ap()
    return False, ""


def is_connected():
    return _sta_if.isconnected()


def reconnect():
    if _sta_if.isconnected():
        return True
    shared_state.set_wifi_connecting()
    _sta_if.connect()
    for _ in range(WIFI_RETRY_ATTEMPTS):
        if _sta_if.isconnected():
            ip = _sta_if.ifconfig()[0]
            shared_state.set_wifi_connected(_connected_ssid, ip)
            return True
        utime.sleep_ms(WIFI_RETRY_DELAY_MS)
    shared_state.set_wifi_lost()
    return False


def get_sta_ssid():
    return _connected_ssid


def get_sta_ip():
    return _connected_ip if _connected_ip else (_sta_if.ifconfig()[0] if _sta_if.isconnected() else "")


# ==============================================================================
# DNS Captivo (UDP porta 53)
# ==============================================================================
async def dns_server_task():
    ap_ip    = get_ap_ip()
    ip_bytes = bytes(int(x) for x in ap_ip.split('.'))

    sock = usocket.socket(usocket.AF_INET, usocket.SOCK_DGRAM)
    sock.setsockopt(usocket.SOL_SOCKET, usocket.SO_REUSEADDR, 1)
    sock.bind(('0.0.0.0', 53))
    sock.setblocking(False)
    print("[dns] Servidor DNS captivo em {}:53".format(ap_ip))

    while True:
        try:
            data, addr = sock.recvfrom(512)
            if data:
                response = _build_dns_response(data, ip_bytes)
                sock.sendto(response, addr)
        except OSError:
            pass
        await asyncio.sleep_ms(10)


def _build_dns_response(query, ip_bytes):
    transaction_id = query[:2]
    flags   = b'\x81\x80'
    qdcount = query[4:6]
    ancount = b'\x00\x01'
    nscount = b'\x00\x00'
    arcount = b'\x00\x00'
    header  = transaction_id + flags + qdcount + ancount + nscount + arcount

    question_end = 12
    while question_end < len(query) and query[question_end] != 0:
        question_end += query[question_end] + 1
    question_end += 5
    question = query[12:question_end]

    answer = (
        b'\xc0\x0c'
        + b'\x00\x01'
        + b'\x00\x01'
        + b'\x00\x00\x00\x3c'
        + b'\x00\x04'
        + ip_bytes
    )
    return header + question + answer
