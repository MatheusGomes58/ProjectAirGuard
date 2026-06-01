# ==============================================================================
# display_core.py — Core 0: Display GC9A01 + DHT22 + Bateria + Botão
# EcoBreath Merged | Raspberry Pi Pico 2W
# ==============================================================================
import machine
import dht
import time
import math
from gc9a01 import GC9A01, BLACK, WHITE, GREEN, CYAN, RED, YELLOW
from lib import shared_state
from config import PIN_SPI_SCK, PIN_SPI_MOSI, PIN_DISP_CS, PIN_DISP_DC, PIN_DISP_RST, PIN_HOME_BTN, PIN_BATTERY, PIN_DHT22

# --- Globals ---
tft = None
sensor = None
battery_adc = None
home_btn = None

# --- Screen state ---
screen_index = 0
TOTAL_SCREENS = 3
last_temp = None
last_hum = None
last_sensor_read = 0
SENSOR_INTERVAL = 4000
last_battery_read = 0
BATTERY_INTERVAL = 2000
_last_wifi_status = None

BATTERY_TABLE = [
    (4.029, 100), (3.960, 90), (3.918, 80), (3.866, 70),
    (3.805, 60), (3.755, 50), (3.700, 40), (3.640, 30),
    (3.539, 20), (3.482, 10), (2.9, 0),
]


def init_display():
    """Initialize SPI, display, sensor and button. Call BEFORE WiFi starts."""
    global tft, sensor, battery_adc, home_btn

    spi = machine.SPI(
        0,
        baudrate=40000000,
        sck=machine.Pin(PIN_SPI_SCK),
        mosi=machine.Pin(PIN_SPI_MOSI)
    )
    cs = machine.Pin(PIN_DISP_CS, machine.Pin.OUT)
    dc = machine.Pin(PIN_DISP_DC, machine.Pin.OUT)
    rst = machine.Pin(PIN_DISP_RST, machine.Pin.OUT)
    tft = GC9A01(spi, cs, dc, rst)

    sensor = dht.DHT22(machine.Pin(PIN_DHT22))
    battery_adc = machine.ADC(PIN_BATTERY)
    home_btn = machine.Pin(PIN_HOME_BTN, machine.Pin.IN, machine.Pin.PULL_UP)


# ==============================================================================
# Helpers
# ==============================================================================
def tft_text(text, x, y, color, scale=2):
    tft.text(text, x, y, color, scale=scale)

def tft_clear_rect(x, y, w, h):
    tft.fill_rect(x, y, w, h, BLACK)

def read_battery_voltage():
    return battery_adc.read_u16() * 3.3 / 65535 * 2

def voltage_to_percent(voltage):
    for v, p in BATTERY_TABLE:
        if voltage >= v: return p
    return 0

def get_battery_color(pct):
    if pct <= 20: return RED
    elif pct < 80: return CYAN
    return GREEN

def draw_filled_circle(cx, cy, r, color):
    """Draw a filled circle on the display."""
    for dy in range(-r, r + 1):
        dx = int((r * r - dy * dy) ** 0.5)
        tft.fill_rect(cx - dx, cy + dy, 2 * dx + 1, 1, color)

def draw_circle_outline(cx, cy, r, color, thickness=1):
    """Draw a circle outline."""
    for t in range(thickness):
        cr = r - t
        for a in range(0, 360, 3):
            rad = a * 3.14159 / 180
            x = int(cx + cr * math.cos(rad))
            y = int(cy + cr * math.sin(rad))
            tft.fill_rect(x, y, 1, 1, color)

def draw_indicators(active):
    cx = 120; y = 220; s = 22
    xs = [cx - s, cx, cx + s]
    for i, x in enumerate(xs):
        if i == active:
            draw_filled_circle(x, y, 5, WHITE)
        else:
            draw_filled_circle(x, y, 3, CYAN)


# ==============================================================================
# Logo — Carrega e exibe o logo.bin (RGB565, 80x80) no display
# ==============================================================================
def draw_logo(cx, cy):
    """Draws the EcoBreath logo from logo.bin centered at (cx, cy). Size: 80x80."""
    LOGO_W = 80
    LOGO_H = 80
    x0 = cx - LOGO_W // 2
    y0 = cy - LOGO_H // 2

    try:
        with open('logo.bin', 'rb') as f:
            tft._set_window(x0, y0, x0 + LOGO_W - 1, y0 + LOGO_H - 1)
            tft.dc.value(1)
            tft.cs.value(0)
            # Read and write in chunks (saves RAM)
            while True:
                chunk = f.read(512)
                if not chunk:
                    break
                tft.spi.write(chunk)
            tft.cs.value(1)
    except OSError:
        # Fallback: draw text if logo.bin not found
        tft_text("ECO", cx - 18, cy - 7, GREEN, 2)


# ==============================================================================
# Splash Screen com Logo
# ==============================================================================
def draw_splash():
    """Splash screen with EcoBreath logo."""
    tft.fill(BLACK)
    # Logo real centralizado (80x80)
    draw_logo(120, 85)
    # Texto
    tft_text("EcoBreath", 55, 145, GREEN, 2)
    tft_text("Air Monitor", 50, 170, CYAN, 2)
    # Barra decorativa
    tft.fill_rect(80, 195, 80, 3, GREEN)
    time.sleep(3)


def draw_screen_start():
    tft.fill(BLACK)
    draw_logo(120, 75)
    tft_text("EcoBreath", 55, 130, GREEN, 2)
    tft_text("Press HOME", 40, 165, WHITE, 2)


def wait_for_home():
    while home_btn.value():
        time.sleep_ms(10)
    time.sleep_ms(200)
    while not home_btn.value():
        pass


# ==============================================================================
# Screens
# ==============================================================================
def draw_screen_sensors():
    global last_temp, last_hum
    tft.fill(BLACK)
    tft_text("EcoBreath", 55, 30, GREEN, 2)
    try:
        sensor.measure()
        t = sensor.temperature(); h = sensor.humidity()
        last_temp = t; last_hum = h
        shared_state.set_sensor_data(t, h)
        tft_text("Temp: {:.1f}C".format(t), 35, 85, WHITE, 2)
        tft_text("Hum:  {:.1f}%".format(h), 35, 115, WHITE, 2)
    except:
        tft_text("Sensor err", 40, 100, RED, 2)
    draw_indicators(0)


def draw_screen_info():
    tft.fill(BLACK)
    tft_text("WiFi Info", 55, 30, GREEN, 2)
    tft_text("HW: R1 | SW: V2", 25, 60, WHITE, 2)
    _refresh_wifi()
    draw_indicators(1)


def _refresh_wifi():
    status, ssid, ip = shared_state.get_wifi_state()
    tft.fill_rect(30, 90, 180, 80, BLACK)
    if status == "CONNECTED":
        tft_text("OK", 30, 95, GREEN, 2)
        tft_text(ssid[:12], 30, 120, CYAN, 2)
        tft_text(ip[:15], 30, 145, CYAN, 2)
    elif status == "CONNECTING":
        tft_text("Conectando..", 30, 110, YELLOW, 2)
    else:
        tft_text("AP Mode", 30, 95, YELLOW, 2)
        tft_text("EcoBreath-AP", 30, 120, CYAN, 2)
        from lib import wifi_manager as wifi
        tft_text(wifi.get_ap_ip(), 30, 145, CYAN, 2)


def draw_screen_battery():
    tft.fill(BLACK)
    tft_text("Bateria", 70, 30, GREEN, 2)
    vbat = read_battery_voltage()
    pct = voltage_to_percent(vbat)
    shared_state.set_battery_data(vbat, pct)
    tft_text("{:.2f} V".format(vbat), 65, 90, CYAN, 2)
    color = get_battery_color(pct)
    tft_text("{} %".format(pct), 85, 130, color, 2)
    draw_indicators(2)


def draw_screen():
    if screen_index == 0: draw_screen_sensors()
    elif screen_index == 1: draw_screen_info()
    else: draw_screen_battery()


# ==============================================================================
# Main Loop (Core 0) — called from main.py after splash
# ==============================================================================
def run():
    global screen_index, last_temp, last_hum, last_sensor_read, last_battery_read, _last_wifi_status

    draw_screen()

    btn_pressed = False
    while True:
        now = time.ticks_ms()
        btn = home_btn.value()

        # Button
        if btn == 0 and not btn_pressed:
            btn_pressed = True
        if btn == 1 and btn_pressed:
            btn_pressed = False
            screen_index = (screen_index + 1) % TOTAL_SCREENS
            draw_screen()
            time.sleep_ms(50)

        # Sensor update (screen 0)
        if screen_index == 0 and time.ticks_diff(now, last_sensor_read) >= SENSOR_INTERVAL:
            last_sensor_read = now
            try:
                sensor.measure()
                t = sensor.temperature(); h = sensor.humidity()
                shared_state.set_sensor_data(t, h)
                if last_temp is None or abs(t - last_temp) >= 0.1:
                    tft_clear_rect(35, 85, 180, 20)
                    tft_text("Temp: {:.1f}C".format(t), 35, 85, WHITE, 2)
                    last_temp = t
                if last_hum is None or abs(h - last_hum) >= 0.1:
                    tft_clear_rect(35, 115, 180, 20)
                    tft_text("Hum:  {:.1f}%".format(h), 35, 115, WHITE, 2)
                    last_hum = h
            except: pass

        # WiFi update (screen 1)
        if screen_index == 1:
            cur = shared_state.get_wifi_state()[0]
            if cur != _last_wifi_status:
                _last_wifi_status = cur
                _refresh_wifi()

        # Battery update (screen 2)
        if screen_index == 2 and time.ticks_diff(now, last_battery_read) >= BATTERY_INTERVAL:
            last_battery_read = now
            draw_screen_battery()

        time.sleep_ms(10)
