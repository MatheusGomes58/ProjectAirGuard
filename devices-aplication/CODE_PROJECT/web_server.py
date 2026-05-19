# ==============================================================================
# web_server.py — Servidor HTTP | EcoBreath Merged (Pico 2W)
# Portal captivo para configuração WiFi + rota /sensors para dados dos sensores
# ==============================================================================
import uasyncio as asyncio
import ujson

import shared_state
from wifi_manager import connect_sta, get_scanned_json, start_ap, get_ap_ip

wifi_connected_callback = None
_active_route = "connection"


def set_active_route(route):
    global _active_route
    _active_route = route


# ==============================================================================
# Parser HTTP mínimo
# ==============================================================================
def _parse_request(raw):
    try:
        lines = raw.split(b'\r\n')
        request_line = lines[0].decode('utf-8', 'ignore')
        parts  = request_line.split(' ')
        method = parts[0] if len(parts) > 0 else 'GET'
        path   = parts[1] if len(parts) > 1 else '/'
        body = b''
        for i, line in enumerate(lines):
            if line == b'':
                body = b'\r\n'.join(lines[i+1:])
                break
        return method, path, body.decode('utf-8', 'ignore')
    except Exception:
        return 'GET', '/', ''


def _parse_query(query_string):
    params = {}
    if not query_string:
        return params
    for pair in query_string.split('&'):
        if '=' in pair:
            k, v = pair.split('=', 1)
            params[_url_decode(k.strip())] = _url_decode(v.strip())
    return params


def _url_decode(s):
    s = s.replace('+', ' ')
    result = []
    i = 0
    while i < len(s):
        if s[i] == '%' and i + 2 < len(s):
            try:
                result.append(chr(int(s[i+1:i+3], 16)))
                i += 3
                continue
            except ValueError:
                pass
        result.append(s[i])
        i += 1
    return ''.join(result)


# ==============================================================================
# Respostas HTTP
# ==============================================================================
def _response_200(writer, content_type, body):
    if isinstance(body, str):
        body = body.encode('utf-8')
    header = (
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: {}\r\n"
        "Content-Length: {}\r\n"
        "Connection: close\r\n"
        "\r\n"
    ).format(content_type, len(body))
    writer.write(header.encode())
    writer.write(body)


def _response_302(writer, location):
    header = (
        "HTTP/1.1 302 Found\r\n"
        "Location: {}\r\n"
        "Connection: close\r\n"
        "\r\n"
    ).format(location)
    writer.write(header.encode())


def _response_404(writer):
    body = b"404 Not Found"
    header = (
        "HTTP/1.1 404 Not Found\r\n"
        "Content-Type: text/plain\r\n"
        "Content-Length: {}\r\n"
        "Connection: close\r\n"
        "\r\n"
    ).format(len(body))
    writer.write(header.encode())
    writer.write(body)


def _serve_file(writer, filepath):
    ext = ('.' + filepath.rsplit('.', 1)[-1].lower()) if '.' in filepath else ''
    content_types = {
        ".html": "text/html; charset=utf-8",
        ".css":  "text/css",
        ".js":   "application/javascript",
        ".ico":  "image/x-icon",
    }
    content_type = content_types.get(ext, 'text/plain')
    try:
        with open(filepath, 'rb') as f:
            data = f.read()
        _response_200(writer, content_type, data)
    except OSError:
        _response_404(writer)


# ==============================================================================
# Handlers de rota
# ==============================================================================
async def _handle_get_sensors(writer):
    """GET /sensors → JSON com temperatura e umidade lidos pelo Core 0."""
    temp, hum = shared_state.get_sensor_data()
    body = ujson.dumps({
        "temperature": round(temp, 1) if temp is not None else None,
        "humidity":    round(hum,  1) if hum  is not None else None
    })
    _response_200(writer, "application/json", body)


async def _handle_get_networks(writer):
    body = get_scanned_json()
    _response_200(writer, "application/json", body)


async def _handle_post_save(writer, body):
    params = {}
    try:
        params = ujson.loads(body)
    except Exception:
        params = _parse_query(body)

    ssid     = params.get('ssid', '').strip()
    password = params.get('password', '').strip()

    if not ssid:
        _response_200(writer, "application/json", '{"status":"error","msg":"SSID vazio"}')
        return

    print("[web] Tentando conectar a:", ssid)
    _response_200(writer, "application/json", '{"status":"connecting"}')
    await writer.drain()

    success, ip = connect_sta(ssid, password)

    if success:
        set_active_route("connected")
        if wifi_connected_callback:
            wifi_connected_callback(ssid, ip)
        print("[web] WiFi conectado:", ip)
    else:
        set_active_route("connection")
        start_ap()
        print("[web] Falha ao conectar, AP reativado")


async def _handle_request(reader, writer):
    try:
        raw = await asyncio.wait_for(reader.read(2048), timeout=5.0)
        if not raw:
            return

        method, path, body = _parse_request(raw)

        if '?' in path:
            clean_path, query_string = path.split('?', 1)
        else:
            clean_path, query_string = path, ''

        print("[web] {} {}".format(method, clean_path))

        if clean_path == '/sensors' and method == 'GET':
            await _handle_get_sensors(writer)

        elif clean_path == '/networks' and method == 'GET':
            await _handle_get_networks(writer)

        elif clean_path in ('/save', '/connect') and method == 'POST':
            # /connect é o alias usado pelo frontend connected/script.js
            # /save é o alias legado do portal captivo
            await _handle_post_save(writer, body or query_string)
        elif clean_path in ('/hotspot-detect.html', '/generate_204',
                            '/ncsi.txt', '/connecttest.txt',
                            '/wpad.dat', '/redirect'):
            _response_302(writer, 'http://{}/'.format(get_ap_ip()))
        else:
            if clean_path == '/' or clean_path == '':
                file_path = '/www/{}/front.html'.format(_active_route)
            else:
                file_path = '/www/{}{}'.format(_active_route, clean_path)
            _serve_file(writer, file_path)

        await writer.drain()

    except asyncio.TimeoutError:
        pass
    except Exception as e:
        print("[web] Erro:", e)
    finally:
        writer.close()
        await writer.wait_closed()


# ==============================================================================
# Servidor principal
# ==============================================================================
async def start_web_server(port=80):
    server = await asyncio.start_server(_handle_request, '0.0.0.0', port)
    print("[web] Servidor HTTP iniciado na porta", port)
    print("[web] Acesse: http://{}".format(get_ap_ip()))
    return server
