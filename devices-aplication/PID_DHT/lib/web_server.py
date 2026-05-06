# ==============================================================================
# web_server.py — Servidor HTTP | PID Climate Controller
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


def _parse_query(qs):
    params = {}
    if not qs:
        return params
    for pair in qs.split('&'):
        if '=' in pair:
            k, v = pair.split('=', 1)
            params[k.strip()] = v.strip()
    return params


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
    try:
        import os
        size = os.stat("web/index.html")[6]
    except OSError:
        err = b"<html><body style='background:#0a0f0d;color:#fff;padding:40px;text-align:center'><h2>index.html nao encontrado</h2></body></html>"
        writer.write("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n".format(len(err)).encode())
        writer.write(err)
        return
    writer.write("HTTP/1.1 200 OK\r\nContent-Type: text/html;charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n".format(size).encode())
    with open("web/index.html", "rb") as f:
        while True:
            chunk = f.read(512)
            if not chunk:
                break
            writer.write(chunk)


def _serve_static(writer, filepath):
    """Serve arquivos estáticos (CSS, JS) da pasta web/."""
    # Determina content-type
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
    writer.write("HTTP/1.1 200 OK\r\nContent-Type: {};charset=utf-8\r\nContent-Length: {}\r\nCache-Control: max-age=3600\r\nConnection: close\r\n\r\n".format(ctype, size).encode())
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
    temp_sp, hum_sp = shared_state.get_setpoints()
    fan_on, humid_on = shared_state.get_relay_status()
    mode = shared_state.get_control_mode()
    pid_t, pid_h = shared_state.get_controller_outputs()
    wifi_st, ssid, ip = shared_state.get_wifi_state()
    man_fan, man_hum = shared_state.get_manual_relays()
    r1_name, r2_name = shared_state.get_relay_names()
    r1_sensor, r1_action, r2_sensor, r2_action, period = shared_state.get_control_config()
    _json_response(writer, {
        "temperature": round(temp, 1) if temp is not None else None,
        "humidity": round(hum, 1) if hum is not None else None,
        "temp_setpoint": round(temp_sp, 1), "hum_setpoint": round(hum_sp, 1),
        "fan_on": fan_on, "humid_on": humid_on, "mode": mode,
        "pid_temp_out": round(pid_t, 3), "pid_hum_out": round(pid_h, 3),
        "manual_fan": man_fan, "manual_humid": man_hum,
        "wifi_status": wifi_st, "wifi_ssid": ssid, "wifi_ip": ip,
        "ap_ip": wifi.get_ap_ip(), "sta_connected": wifi.is_connected(),
        "relay1_name": r1_name, "relay2_name": r2_name,
        "r1_sensor": r1_sensor, "r1_action": r1_action,
        "r2_sensor": r2_sensor, "r2_action": r2_action,
        "control_period": period,
    })


async def _h_setpoints(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = _parse_query(body)
    current_t, current_h = shared_state.get_setpoints()
    if params.get('temp_sp') is not None:
        current_t = float(params['temp_sp'])
    if params.get('hum_sp') is not None:
        current_h = float(params['hum_sp'])
    shared_state.set_setpoints(current_t, current_h)
    mode = params.get('mode')
    if mode in ("pid", "manual"):
        shared_state.set_control_mode(mode)
    _json_str(writer, '{{"status":"ok","temp_sp":{},"hum_sp":{},"mode":"{}"}}'.format(
        current_t, current_h, shared_state.get_control_mode()))


async def _h_manual(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = _parse_query(body)
    fan_val = params.get('fan', False)
    humid_val = params.get('humid', False)
    fan = fan_val if isinstance(fan_val, bool) else str(fan_val).lower() in ('true', '1', 'on')
    humid = humid_val if isinstance(humid_val, bool) else str(humid_val).lower() in ('true', '1', 'on')
    shared_state.set_manual_relays(fan, humid)
    shared_state.set_control_mode("manual")
    _json_str(writer, '{{"status":"ok","fan":{},"humid":{}}}'.format(str(fan).lower(), str(humid).lower()))


async def _h_wifi_scan(writer):
    _json_response(writer, {"networks": wifi.scan_networks()})


async def _h_wifi_connect(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = _parse_query(body)
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


async def _h_relay_names(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = _parse_query(body)
    r1 = params.get('relay1', '')
    r2 = params.get('relay2', '')
    if r1 or r2:
        cur1, cur2 = shared_state.get_relay_names()
        shared_state.set_relay_names(r1 or cur1, r2 or cur2)
    n1, n2 = shared_state.get_relay_names()
    _json_response(writer, {"status": "ok", "relay1": n1, "relay2": n2})


async def _h_control_config(writer, body):
    try:
        params = ujson.loads(body)
    except Exception:
        params = _parse_query(body)
    cur = shared_state.get_control_config()
    r1s = params.get('r1_sensor', '')
    r1a = params.get('r1_action', '')
    r2s = params.get('r2_sensor', '')
    r2a = params.get('r2_action', '')
    period = params.get('period', None)
    r1_sensor = r1s if r1s in ('temp', 'hum') else cur[0]
    r1_action = r1a if r1a in ('above', 'below') else cur[1]
    r2_sensor = r2s if r2s in ('temp', 'hum') else cur[2]
    r2_action = r2a if r2a in ('above', 'below') else cur[3]
    ctrl_period = max(0, int(period)) if period is not None else cur[4]
    shared_state.set_control_config(r1_sensor, r1_action, r2_sensor, r2_action, ctrl_period)
    _json_response(writer, {"status": "ok", "r1_sensor": r1_sensor, "r1_action": r1_action,
                            "r2_sensor": r2_sensor, "r2_action": r2_action, "period": ctrl_period})


async def _h_log(writer):
    _json_response(writer, {"logs": shared_state.get_logs()})


async def _h_history(writer):
    _json_response(writer, {"history": shared_state.get_history()})


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
            path, qs = path.split('?', 1)
        else:
            qs = ''
        if path == '/data':
            await _h_data(writer)
        elif path.startswith('/web/') and method == 'GET':
            _serve_static(writer, path[1:])  # remove leading /
        elif path == '/setpoints' and method == 'POST':
            await _h_setpoints(writer, body or qs)
        elif path == '/manual' and method == 'POST':
            await _h_manual(writer, body or qs)
        elif path == '/wifi/scan':
            await _h_wifi_scan(writer)
        elif path == '/wifi/connect' and method == 'POST':
            await _h_wifi_connect(writer, body or qs)
        elif path == '/wifi/disconnect' and method == 'POST':
            await _h_wifi_disconnect(writer)
        elif path == '/log':
            await _h_log(writer)
        elif path == '/relays' and method == 'POST':
            await _h_relay_names(writer, body or qs)
        elif path == '/control' and method == 'POST':
            await _h_control_config(writer, body or qs)
        elif path == '/history':
            await _h_history(writer)
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
