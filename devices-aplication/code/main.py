# ==============================================================================
# main.py — EcoBreath Merged | Raspberry Pi Pico 2W (MicroPython)
# Core 0: Display + Sensores I2C (display_core.py)
# Core 1: WiFi + Web + Cloud Sync (uasyncio)
#
# Hardware: Display GC9A01 + ENS160 + AHT21 + Bateria + Botão (sem relés)
# ==============================================================================
import _thread
import utime
import uasyncio as asyncio
import gc
from machine import Pin, I2C

from lib import shared_state
from lib import wifi_manager as wifi
from lib import web_server as web
from lib import cloud_sync
from lib.ens160_aht21 import SensorHub
from config import PIN_I2C_SDA, PIN_I2C_SCL, I2C_FREQ, AP_SSID, SENSOR_READ_MS

_original_print = print
def log(msg):
    _original_print(msg)
    shared_state.add_log(str(msg))


# ==============================================================================
# Task: Leitura dos sensores ENS160 + AHT21 (Core 1 — backup de Core 0)
# ==============================================================================
async def sensor_task():
    i2c = I2C(0, sda=Pin(PIN_I2C_SDA), scl=Pin(PIN_I2C_SCL), freq=I2C_FREQ)
    hub = SensorHub(i2c)
    tick = 0
    while True:
        try:
            temp, hum, aqi, tvoc, eco2 = hub.read()
            shared_state.set_sensor_data(temp, hum, aqi, tvoc, eco2)
            shared_state.add_history_point(temp, hum, aqi, tvoc, eco2)
            tick += 1
            if tick % 15 == 0:
                log("[sensor] T={} H={} AQI={} TVOC={} eCO2={}".format(
                    temp, hum, aqi, tvoc, eco2))
        except Exception as e:
            log("[sensor] Err: {}".format(e))
        await asyncio.sleep_ms(SENSOR_READ_MS)


# ==============================================================================
# Task: WiFi Monitor (reconecta se perder)
# ==============================================================================
async def wifi_monitor():
    while True:
        await asyncio.sleep_ms(15000)
        ssid, _ = wifi.load_wifi_properties()
        if ssid and not wifi.is_connected():
            log("[wifi] Reconectando...")
            wifi.try_saved_wifi()
        gc.collect()


# ==============================================================================
# Core 1: Async event loop (WiFi + Web + Cloud)
# ==============================================================================
async def core1_main():
    gc.collect()
    log("=" * 35)
    log("  EcoBreath Merged V2.0")
    log("  Core 1: Network + Web")
    log("=" * 35)

    # Load configs
    shared_state.load_state()
    cloud_sync.load_cloud_config()

    # Network — start AP
    ap_ip = wifi.start_ap()
    log("AP: {} | IP: {}".format(AP_SSID, ap_ip))

    # Try saved WiFi
    ssid_salvo, _ = wifi.load_wifi_properties()
    if ssid_salvo:
        log("[wifi] Tentando '{}'...".format(ssid_salvo))
        if wifi.try_saved_wifi():
            log("[wifi] OK! IP: {}".format(wifi.get_sta_ip()))
        else:
            log("[wifi] Falha. Use o AP.")

    gc.collect()

    # Start tasks
    asyncio.create_task(sensor_task())

    if not wifi.is_connected():
        asyncio.create_task(wifi.dns_server_task())
    asyncio.create_task(wifi_monitor())
    asyncio.create_task(web.start_web_server(port=80))
    asyncio.create_task(cloud_sync.cloud_sync_task())

    log("[core1] Sistema pronto.")
    while True:
        await asyncio.sleep_ms(60000)
        gc.collect()


def core1_entry():
    try:
        asyncio.run(core1_main())
    except Exception as e:
        import sys
        print("[core1] FATAL:", e)
        sys.print_exception(e)
        utime.sleep(5)
        import machine
        machine.reset()


# ==============================================================================
# ENTRY POINT (Core 0)
# ==============================================================================
print("=" * 35)
print("EcoBreath Merged V2.0")
print("Core 0: Display | Core 1: Network")
print("=" * 35)

# Build automatico do dashboard
try:
    import build
    build.build()
except Exception as e:
    print("[build] Pulou:", e)

utime.sleep_ms(200)

# Start Core 1 (WiFi) FIRST — CYW43 needs to init before SPI display
_thread.start_new_thread(core1_entry, ())

# Wait for CYW43/WiFi to stabilize before touching SPI
utime.sleep_ms(1500)

# Core 0: Now init display (SPI) and run
import display_core
display_core.init_display()
display_core.draw_splash()
display_core.draw_screen_start()
display_core.wait_for_home()
display_core.run()
