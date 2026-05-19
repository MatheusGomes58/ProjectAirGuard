# ==============================================================================
# main.py — EcoBreath Merged | Raspberry Pi Pico 2W (MicroPython)
# Dual-Core: Core 0 → Display + Sensores | Core 1 → WiFi + Web Server
# ==============================================================================
#
# ARQUITETURA:
#   Core 0 (main):  Import display_core → splash, loop de display, sensores, botão
#   Core 1:         uasyncio event loop → WiFi AP, portal captivo, DNS, watchdog
#
# COMUNICAÇÃO ENTRE CORES:
#   shared_state.py  — variáveis protegidas por _thread.allocate_lock()
#   Core 1 escreve status WiFi → Core 0 lê e exibe na tela Info
#
# COMO USAR:
#   1. Copie todos os arquivos desta pasta para o Pico 2W (via Thonny):
#      main.py, display_core.py, gc9a01.py, shared_state.py,
#      config.py, wifi_manager.py, web_server.py
#   2. Crie a pasta /www/connection/ com front.html (portal captivo)
#   3. Ao ligar:
#      - Display mostra splash e aguarda botão HOME
#      - Core 1 já sobe o AP "PICO-AP" (senha: 12345678)
#      - Conecte ao AP e acesse http://192.168.4.1 para configurar WiFi
#      - Tela Info (botão HOME → 2ª tela) mostra status em tempo real
# ==============================================================================

import _thread
import utime
import uasyncio as asyncio

import shared_state
import wifi_manager as wifi
import web_server   as web


# ==============================================================================
# Callback: chamado pelo web_server quando WiFi conecta com sucesso
# ==============================================================================
def on_wifi_connected(ssid, ip):
    # shared_state já foi atualizado dentro de wifi_manager.connect_sta()
    # Este callback serve para log e extensões futuras (ex.: envio de dados)
    print("=" * 40)
    print("[main] WiFi CONECTADO!")
    print("[main] Rede :", ssid)
    print("[main] IP   :", ip)
    print("=" * 40)


# ==============================================================================
# Tarefas async do Core 1
# ==============================================================================
async def network_scan_task():
    """Re-scan periódico de redes WiFi enquanto em modo AP."""
    while True:
        await asyncio.sleep_ms(10000)
        status, _, _ = shared_state.get_wifi_state()
        if status == "AP":
            print("[main] Re-scan de redes WiFi...")
            wifi.scan_networks()


async def wifi_watchdog_task():
    """Verifica conexão WiFi a cada 10 s e reconecta se perdida."""
    while True:
        await asyncio.sleep_ms(10000)
        status, _, _ = shared_state.get_wifi_state()
        if status == "CONNECTED" and not wifi.is_connected():
            print("[main] WiFi perdido, tentando reconectar...")
            shared_state.set_wifi_lost()
            if wifi.reconnect():
                print("[main] Reconectado! IP:", wifi.get_sta_ip())
            else:
                print("[main] Falha ao reconectar.")
                shared_state.set_wifi_lost()


async def wifi_main():
    """Event loop do Core 1: WiFi AP + portal captivo + watchdog."""
    print("=" * 40)
    print("[core1] WiFi core iniciando...")
    print("=" * 40)

    # Registra callback
    web.wifi_connected_callback = on_wifi_connected

    # Inicia AP
    ap_ip = wifi.start_ap()
    print("[core1] AP IP:", ap_ip)

    # Scan inicial de redes
    print("[core1] Escaneando redes WiFi...")
    wifi.scan_networks()

    # Inicia tarefas async
    asyncio.create_task(wifi.dns_server_task())
    asyncio.create_task(web.start_web_server(port=80))
    asyncio.create_task(network_scan_task())
    asyncio.create_task(wifi_watchdog_task())

    # Mantém event loop vivo
    print("[core1] WiFi core operacional.")
    while True:
        await asyncio.sleep_ms(5000)
        status, _, ip = shared_state.get_wifi_state()
        if status == "CONNECTED":
            print("[core1] WiFi OK | IP:", ip)


# ==============================================================================
# Wrapper síncrono para rodar no Core 1 via _thread.start_new_thread
# ==============================================================================
def core1_entry():
    """Ponto de entrada do Core 1 — executa o event loop asyncio."""
    try:
        asyncio.run(wifi_main())
    except Exception as e:
        import sys
        print("[core1] ERRO FATAL:", e)
        sys.print_exception(e)
        utime.sleep(5)
        import machine
        machine.reset()


# ==============================================================================
# PONTO DE ENTRADA PRINCIPAL (Core 0)
# ==============================================================================
print("=" * 40)
print("EcoBreath Merged V2.0 — Iniciando...")
print("Core 0: Display + Sensores")
print("Core 1: WiFi + Web Server")
print("=" * 40)

# Aguarda um instante para estabilização
utime.sleep_ms(200)

# Inicia Core 1 (WiFi + Web) em background
_thread.start_new_thread(core1_entry, ())

# Aguarda Core 1 subir o AP antes de mostrar o display
# (evita conflito de init do CYW43 com o SPI do display)
utime.sleep_ms(1500)

# Core 0: executa loop do display (bloqueante — fica aqui para sempre)
import display_core
display_core.run()
