# ==============================================================================
# build.py — Gera index.html bundled (CSS+JS inline) a partir de web/
# Compativel com Python 3 (PC) e MicroPython (Pico)
# ==============================================================================
import os

WEB_DIR = "web"
OUTPUT = "index.html"


def _exists(path):
    try:
        os.stat(path)
        return True
    except OSError:
        return False


def _size(path):
    return os.stat(path)[6]


def build():
    """Gera index.html bundled a partir dos arquivos em web/."""
    css_path = WEB_DIR + "/style.css"
    js_path = WEB_DIR + "/app.js"
    html_path = WEB_DIR + "/index.html"

    if not (_exists(css_path) and _exists(js_path) and _exists(html_path)):
        print("[build] Arquivos em web/ nao encontrados. Pulando build.")
        return False

    # Verifica se precisa rebuildar (se index.html ja existe e eh mais novo)
    if _exists(OUTPUT):
        try:
            out_mtime = os.stat(OUTPUT)[8]
            src_mtime = max(
                os.stat(css_path)[8],
                os.stat(js_path)[8],
                os.stat(html_path)[8]
            )
            if out_mtime >= src_mtime:
                print("[build] {} esta atualizado ({} bytes)".format(OUTPUT, _size(OUTPUT)))
                return True
        except Exception:
            pass  # Se der erro na comparacao, rebuilda

    # Le arquivos fonte
    with open(css_path, "r") as f:
        css = f.read().strip()
    with open(js_path, "r") as f:
        js = f.read().strip()
    with open(html_path, "r") as f:
        html = f.read()

    # Substitui referencias externas por inline
    html = html.replace(
        '<link rel="stylesheet" href="/web/style.css">',
        "<style>\n" + css + "\n</style>"
    )
    html = html.replace(
        '<script src="/web/app.js"></script>',
        "<script>\n" + js + "\n</script>"
    )

    with open(OUTPUT, "w") as f:
        f.write(html)

    print("[build] OK: {} ({} bytes)".format(OUTPUT, _size(OUTPUT)))
    return True


if __name__ == "__main__":
    build()
