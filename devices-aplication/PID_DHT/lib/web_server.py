# ==============================================================================
# web_server.py — Servidor HTTP | EcoBreath Shield
# ==============================================================================
import uasyncio as asyncio
import ujson
import gc

from lib import shared_state
from lib import wifi_manager as wifi


def _parse_request(raw):
    try:
        lines = raw.split(b'\r\n')
        req = lines[0].decode('utf-8', 'ignore')
        parts = req.split(' ')
        method = parts[0] if len(parts) > 0 else 'GET'
        path = parts[1] if len(parts) > 1 else '/'
        body = b''
        for i, line in enumerate(lines):
            if line == b'':
                body = b'\r\n'.join(lines[i+1:])
                break
        return method, path, body.decode('utf-8', 'ignore')
    except Exception:
        return 'GET', '/', ''


def _json_response(writer, data):
    body = ujson.dumps(data)
    writer.write("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n".format(len(body)).encode())
    writer.write(body.encode())


def _json_str(writer, s):
    writer.write("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n".format(len(s)).encode())
    writer.write(s.encode())


def _redirect(writer, url):
    writer.write("HTTP/1.1 302 Found\r\nLocation: {}\r\nConnection: close\r\n\r\n".format(url).encode())


def _serve_dashboard(writer):
    html_file = "index.html"
    try:
        import os
        size = os.stat(html_file)[6]
    except OSError:
        err = b"<html><body style='background:#0a0f0d;color:#fff;padding:40px;text-align:center'><h2>index.html nao encontrado</h2></body></html>"
        writer.write("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n".format(len(err)).encode())
        writer.write(err)
        return
    writer.write("HTTP/1.1 200 OK\r\nContent-Type: text/html;charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n".format(size).encode())
    with open(html_file, "rb") as f:
        while True:
            chunk = f.read(512)
            if not chunk:
                break
            writer.write(chunk)


def _serve_static(writer, filepath):
    if filepath.endswith('.css'):
        ctype = 'text/css'
    elif filepath.endswith('.js'):
        ctype = 'application/javascript'
    else:
        ctype = 'application/octet-stream'
    try:
        import os
        size = os.stat(filepath)[6]
    except OSError:
        writer.write(b"HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n")
        return
    writer.write("HTTP/1.1 200 OK\r\nContent-Type: {};charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n".format(ctype, size).encode())
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(512)
            if not chunk:
                break
            writer.write(chunk)


# ==============================================================================
# Handlers
# ==============================================================================
async def _h_data(writer):
    temp, hum = shared_state.get_sensor_data()
    mode = shared_state.get_control_mode()
    wifi_st, ssid, ip = shared_state.get_wifi_state()
    relays = shared_state.get_all_relay_states()
    manual = shared_state.get_all_manual_states()
    setpoints = shared_state.get_setpoints_list()
    actions = shared_state.get_actions_list()

    _json_response(writer, {
        "temperature": round(temp, 1) if temp is not None else None,
        "humidity": round(hum, 1) if hum is not None else None,
        "mode": mode,
        "relays": relays,
        "manual": manual,
        "relay_names": shared_state.get_relay_names(),
        "setpoints": setpoints,
        "actions": actions,
        "net_mode": shared_state.get_net_mode(),
        "wifi_status": wifi_st,
        "wifi_ssid": ssid,
        "wifi_ip": ip,
        "ap_ip": wifi.get_ap_ip(),
        "sta_connected": wifi.is_connected(),
    })


# --- Modo ---
async def _h_mode(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = {}
    mode = params.get('mode', '')
    if mode in ("auto", "manual"):
        shared_state.set_control_mode(mode)
    _json_str(writer, '{{"status":"ok","mode":"{}"}}'.format(shared_state.get_control_mode()))


# --- Manual relay ---
async def _h_manual(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = {}
    relay = int(params.get('relay', 1))
    state = params.get('state', False)
    if isinstance(state, str):
        state = state.lower() in ('true', '1', 'on')
    shared_state.set_manual_relay(relay, bool(state))
    _json_response(writer, {"status": "ok", "relay": relay, "state": shared_state.get_manual_relay(relay)})


# --- Relay name ---
async def _h_relay_name(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = {}
    relay = str(params.get('relay', '1'))
    name = params.get('name', '')
    if name:
        shared_state.set_relay_name(relay, name)
    _json_response(writer, {"status": "ok", "relay_names": shared_state.get_relay_names()})


# --- Setpoints CRUD ---
async def _h_sp_add(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = {}
    name = params.get('name', 'Setpoint')
    sensor = params.get('sensor', 'temp')
    value = float(params.get('value', 25.0))
    if sensor not in ('temp', 'hum'):
        sensor = 'temp'
    sp = shared_state.add_setpoint(name, sensor, value)
    _json_response(writer, {"status": "ok", "setpoint": sp})


async def _h_sp_update(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = {}
    sp_id = params.get('id', '')
    value = params.get('value', None)
    if sp_id and value is not None:
        shared_state.update_setpoint(sp_id, float(value))
    _json_response(writer, {"status": "ok", "setpoints": shared_state.get_setpoints_list()})


async def _h_sp_remove(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = {}
    sp_id = params.get('id', '')
    if sp_id:
        shared_state.remove_setpoint(sp_id)
    _json_response(writer, {"status": "ok", "setpoints": shared_state.get_setpoints_list()})


# --- Actions CRUD ---
async def _h_act_add(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = {}
    name = params.get('name', 'Acao')
    relay = int(params.get('relay', 1))
    sp_id = params.get('setpoint_id', '')
    condition = params.get('condition', 'above')
    period = int(params.get('period', 10))
    if condition not in ('above', 'below'):
        condition = 'above'
    if relay not in (1, 2):
        relay = 1
    act = shared_state.add_action(name, relay, sp_id, condition, period)
    _json_response(writer, {"status": "ok", "action": act})


async def _h_act_remove(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = {}
    act_id = params.get('id', '')
    if act_id:
        shared_state.remove_action(act_id)
    _json_response(writer, {"status": "ok", "actions": shared_state.get_actions_list()})


# --- WiFi ---
async def _h_wifi_scan(writer):
    _json_response(writer, {"networks": wifi.scan_networks()})


async def _h_net_mode(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = {}
    mode = params.get('mode', '')
    if mode in ('ap', 'hybrid', 'wifi', 'reader'):
        shared_state.set_net_mode(mode)
        if mode == 'wifi' and wifi.is_connected():
            wifi.stop_ap()
        elif mode == 'hybrid' or mode == 'ap':
            if not wifi._ap_if.active():
                wifi.start_ap()
        elif mode == 'reader':
            # Modo leitor: desliga tudo de rede, força modo auto
            shared_state.set_control_mode('auto')
            wifi.stop_ap()
            if wifi.is_connected():
                wifi._sta_if.disconnect()
                wifi._sta_if.active(False)
    _json_response(writer, {"status": "ok", "net_mode": shared_state.get_net_mode()})

async def _h_wifi_connect(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = {}
    ssid = params.get('ssid', '')
    password = params.get('password', '')
    if not ssid:
        _json_str(writer, '{"status":"error","message":"SSID vazio"}')
        return
    success, ip = wifi.connect_to_wifi(ssid, password, save=True)
    if success:
        _json_str(writer, '{{"status":"ok","ssid":"{}","ip":"{}"}}'.format(ssid, ip))
    else:
        _json_str(writer, '{"status":"error","message":"Falha na conexao"}')

async def _h_wifi_disconnect(writer):
    wifi.disconnect_wifi()
    wifi.delete_wifi_properties()
    _json_str(writer, '{"status":"ok"}')


# --- Log / History ---
async def _h_log(writer):
    _json_response(writer, {"logs": shared_state.get_logs()})

async def _h_history(writer):
    _json_response(writer, {"history": shared_state.get_history()})


# --- Cloud Sync ---
async def _h_cloud_config(writer, body):
    from lib import cloud_sync
    try:
        params = ujson.loads(body)
    except Exception:
        params = {}
    if params:
        interval = int(params.get('interval', 30))
        enabled = params.get('enabled', False)
        if isinstance(enabled, str):
            enabled = enabled.lower() in ('true', '1')
        cloud_sync.set_cloud_config(interval, bool(enabled))
    _json_response(writer, {"status": "ok", "cloud": cloud_sync.get_cloud_config()})


async def _h_cloud_get(writer):
    from lib import cloud_sync
    _json_response(writer, {"cloud": cloud_sync.get_cloud_config()})


# ==============================================================================
# Router
# ==============================================================================
async def _handle(reader, writer):
    try:
        raw = await asyncio.wait_for(reader.read(2048), timeout=5.0)
        if not raw:
            return
        method, path, body = _parse_request(raw)
        if '?' in path:
            path = path.split('?', 1)[0]

        if path == '/data':
            await _h_data(writer)
        elif path.startswith('/web/') and method == 'GET':
            _serve_static(writer, path[1:])
        elif path == '/mode' and method == 'POST':
            await _h_mode(writer, body)
        elif path == '/manual' and method == 'POST':
            await _h_manual(writer, body)
        elif path == '/relay/name' and method == 'POST':
            await _h_relay_name(writer, body)
        elif path == '/setpoints/add' and method == 'POST':
            await _h_sp_add(writer, body)
        elif path == '/setpoints/update' and method == 'POST':
            await _h_sp_update(writer, body)
        elif path == '/setpoints/remove' and method == 'POST':
            await _h_sp_remove(writer, body)
        elif path == '/actions/add' and method == 'POST':
            await _h_act_add(writer, body)
        elif path == '/actions/remove' and method == 'POST':
            await _h_act_remove(writer, body)
        elif path == '/wifi/scan':
            await _h_wifi_scan(writer)
        elif path == '/net_mode' and method == 'POST':
            await _h_net_mode(writer, body)
        elif path == '/wifi/connect' and method == 'POST':
            await _h_wifi_connect(writer, body)
        elif path == '/wifi/disconnect' and method == 'POST':
            await _h_wifi_disconnect(writer)
        elif path == '/log':
            await _h_log(writer)
        elif path == '/history':
            await _h_history(writer)
        elif path == '/cloud' and method == 'POST':
            await _h_cloud_config(writer, body)
        elif path == '/cloud' and method == 'GET':
            await _h_cloud_get(writer)
        elif path in ('/generate_204', '/hotspot-detect.html', '/ncsi.txt', '/connecttest.txt', '/redirect'):
            _redirect(writer, 'http://{}/'.format(wifi.get_ap_ip()))
        else:
            _serve_dashboard(writer)

        await writer.drain()
    except asyncio.TimeoutError:
        pass
    except Exception as e:
        print("[http] ERR:", e)
    finally:
        writer.close()
        await writer.wait_closed()
        gc.collect()


async def start_web_server(port=80):
    srv = await asyncio.start_server(_handle, '0.0.0.0', port)
    print("[web] HTTP porta {}".format(port))
    return srv
