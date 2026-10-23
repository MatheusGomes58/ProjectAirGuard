# ==============================================================================
# build.py — Gera index.html inline | Roda no Pico (MicroPython)
# Lê web/index.html linha a linha e substitui os links por conteúdo inline
# Otimizado para pouca RAM
# ==============================================================================
import gc
import os


def build():
    gc.collect()
    print("[build] Gerando index.html...")

    src = "web/index.html"
    css_file = "web/style.css"
    js_file = "web/app.js"
    out = "index.html"

    # Verifica se os arquivos existem
    for f in [src, css_file, js_file]:
        try:
            os.stat(f)
        except OSError:
            print("[build] ERRO: {} nao encontrado".format(f))
            return False

    # Abre output e processa linha a linha
    with open(out, "w") as fout:
        with open(src, "r") as fin:
            for line in fin:
                # Substitui link CSS por inline
                if '<link rel="stylesheet" href="/web/style.css">' in line:
                    fout.write("<style>\n")
                    with open(css_file, "r") as fc:
                        while True:
                            chunk = fc.read(256)
                            if not chunk:
                                break
                            fout.write(chunk)
                    fout.write("\n</style>\n")
                # Substitui script JS por inline
                elif '<script src="/web/app.js"></script>' in line:
                    fout.write("<script>\n")
                    with open(js_file, "r") as fj:
                        while True:
                            chunk = fj.read(256)
                            if not chunk:
                                break
                            fout.write(chunk)
                    fout.write("\n</script>\n")
                else:
                    fout.write(line)

    gc.collect()
    size = os.stat(out)[6]
    print("[build] OK! index.html = {} bytes".format(size))
    return True


if __name__ == "__main__":
    build()
