# ==============================================================================
# web_server.py — HTTP Server | EcoBreath Merged
# Hardware: Apenas sensores (sem relés) — dashboard de monitoramento
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
            if line == b'': body = b'\r\n'.join(lines[i+1:]); break
        return method, path, body.decode('utf-8', 'ignore')
    except: return 'GET', '/', ''


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
        import os; size = os.stat("index.html")[6]
    except:
        err = b"<html><body style='background:#0a0f0d;color:#fff;padding:40px'><h2>index.html not found</h2><p>Run build.py first</p></body></html>"
        writer.write("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n".format(len(err)).encode())
        writer.write(err); return
    writer.write("HTTP/1.1 200 OK\r\nContent-Type: text/html;charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n".format(size).encode())
    with open("index.html", "rb") as f:
        while True:
            chunk = f.read(512)
            if not chunk: break
            writer.write(chunk)


def _serve_static(writer, filepath):
    ctype = 'text/css' if filepath.endswith('.css') else 'application/javascript' if filepath.endswith('.js') else 'application/octet-stream'
    try:
        import os; size = os.stat(filepath)[6]
    except:
        writer.write(b"HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n"); return
    writer.write("HTTP/1.1 200 OK\r\nContent-Type: {};charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n".format(ctype, size).encode())
    with open(filepath, "rb") as f:
        while True:
            chunk = f.read(512)
            if not chunk: break
            writer.write(chunk)

# ==============================================================================
# Handlers
# ==============================================================================
async def _h_data(writer):
    temp, hum = shared_state.get_sensor_data()
    bat_v, bat_p = shared_state.get_battery_data()
    wifi_st, ssid, ip = shared_state.get_wifi_state()
    _json_response(writer, {
        "temperature": round(temp, 1) if temp else None,
        "humidity": round(hum, 1) if hum else None,
        "battery_volt": round(bat_v, 2) if bat_v else None,
        "battery_pct": bat_p,
        "wifi_status": wifi_st,
        "wifi_ssid": ssid,
        "wifi_ip": ip,
        "ap_ip": wifi.get_ap_ip(),
        "sta_connected": wifi.is_connected(),
    })


async def _h_wifi_scan(writer):
    _json_response(writer, {"networks": wifi.scan_networks()})


async def _h_wifi_connect(writer, body):
    try: params = ujson.loads(body)
    except: params = {}
    ssid = params.get('ssid', ''); password = params.get('password', '')
    if not ssid:
        _json_str(writer, '{"status":"error","message":"SSID vazio"}'); return
    success, ip = wifi.connect_to_wifi(ssid, password, save=True)
    if success:
        _json_str(writer, '{{"status":"ok","ssid":"{}","ip":"{}"}}'.format(ssid, ip))
    else:
        _json_str(writer, '{"status":"error","message":"Falha na conexao"}')


async def _h_wifi_disconnect(writer):
    wifi.disconnect_wifi()
    wifi.delete_wifi_properties()
    _json_str(writer, '{"status":"ok"}')


async def _h_cloud(writer, body):
    from lib import cloud_sync
    try: params = ujson.loads(body)
    except: params = {}
    if params:
        cloud_sync.set_cloud_config(int(params.get('interval', 30)), bool(params.get('enabled', False)))
    _json_response(writer, {"status": "ok", "cloud": cloud_sync.get_cloud_config()})


# ==============================================================================
# Router
# ==============================================================================
async def _handle(reader, writer):
    try:
        raw = await asyncio.wait_for(reader.read(2048), timeout=5.0)
        if not raw: return
        method, path, body = _parse_request(raw)
        if '?' in path: path = path.split('?', 1)[0]

        if path == '/data':
            await _h_data(writer)
        elif path.startswith('/web/') and method == 'GET':
            _serve_static(writer, path[1:])
        elif path == '/wifi/scan':
            await _h_wifi_scan(writer)
        elif path == '/wifi/connect' and method == 'POST':
            await _h_wifi_connect(writer, body)
        elif path == '/wifi/disconnect' and method == 'POST':
            await _h_wifi_disconnect(writer)
        elif path == '/log':
            _json_response(writer, {"logs": shared_state.get_logs()})
        elif path == '/history':
            _json_response(writer, {"history": shared_state.get_history()})
        elif path == '/cloud' and method == 'POST':
            await _h_cloud(writer, body)
        elif path == '/cloud' and method == 'GET':
            from lib import cloud_sync
            _json_response(writer, {"cloud": cloud_sync.get_cloud_config()})
        elif path in ('/generate_204', '/hotspot-detect.html', '/ncsi.txt', '/connecttest.txt', '/redirect'):
            _redirect(writer, 'http://{}/'.format(wifi.get_ap_ip()))
        else:
            _serve_dashboard(writer)

        await writer.drain()
    except asyncio.TimeoutError: pass
    except Exception as e: print("[http] ERR:", e)
    finally:
        writer.close()
        await writer.wait_closed()
        gc.collect()


async def start_web_server(port=80):
    srv = await asyncio.start_server(_handle, '0.0.0.0', port)
    print("[web] HTTP porta {}".format(port))
    return srv
