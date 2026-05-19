# ==============================================================================
# display_core.py — Core 0: Display GC9A01 + DHT22 + Bateria + Botão
# EcoBreath | Raspberry Pi Pico 2W — MicroPython
# ==============================================================================
# Executado no Core 0 (core principal).
# Lê sensores, atualiza display e consulta shared_state para status WiFi.
# ==============================================================================

import machine
import dht
import time
from gc9a01 import GC9A01, BLACK, WHITE, GREEN, CYAN, RED, YELLOW
import shared_state

# ---------------------------------------------------------------------------
# SPI e Display
# ---------------------------------------------------------------------------
spi = machine.SPI(
    0,
    baudrate=40000000,
    sck=machine.Pin(18),
    mosi=machine.Pin(19)
)

cs  = machine.Pin(17, machine.Pin.OUT)
dc  = machine.Pin(20, machine.Pin.OUT)
rst = machine.Pin(21, machine.Pin.OUT)

tft = GC9A01(spi, cs, dc, rst)

# ---------------------------------------------------------------------------
# DHT22
# ---------------------------------------------------------------------------
sensor = dht.DHT22(machine.Pin(16))

# ---------------------------------------------------------------------------
# Bateria
# ---------------------------------------------------------------------------
battery_adc = machine.ADC(26)

# ---------------------------------------------------------------------------
# Botão HOME
# ---------------------------------------------------------------------------
home_btn = machine.Pin(22, machine.Pin.IN, machine.Pin.PULL_UP)

# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------
HUM_X  = 40;  HUM_Y  = 100
TEMP_X = 40;  TEMP_Y = 130

BAT_VOLT_X = 130; BAT_VOLT_Y = 100
BAT_PCT_X  = 130; BAT_PCT_Y  = 140

VALUE_W = 120; VALUE_H = 20
OFFSET  = 60

# ---------------------------------------------------------------------------
# Controle de telas
# ---------------------------------------------------------------------------
# Screen 0: Sensores | Screen 1: Info / WiFi | Screen 2: Bateria
screen_index  = 0
TOTAL_SCREENS = 3

button_pressed  = False
button_released = False

# ---------------------------------------------------------------------------
# Cache de últimas leituras
# ---------------------------------------------------------------------------
last_temp = None
last_hum  = None

last_sensor_read  = 0
SENSOR_INTERVAL   = 4000

last_battery_read = 0
BATTERY_INTERVAL  = 2000
last_battery_pct  = None
last_battery_volt = None

# ---------------------------------------------------------------------------
# Tabela de bateria
# ---------------------------------------------------------------------------
BATTERY_TABLE = [
    (4.029, 100), (3.960, 90), (3.918, 80), (3.866, 70),
    (3.805, 60),  (3.755, 50), (3.700, 40), (3.640, 30),
    (3.539, 20),  (3.482, 10), (2.9, 0),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def tft_text(text, x, y, color, scale=2):
    tft.text(text, x, y, color, scale=scale)

def tft_clear_rect(x, y, w, h):
    tft.fill_rect(x, y, w, h, BLACK)


# ---------------------------------------------------------------------------
# Bateria
# ---------------------------------------------------------------------------
def read_battery_voltage():
    raw = battery_adc.read_u16()
    v_adc = raw * 3.3 / 65535
    return v_adc * 2

def voltage_to_percent(voltage):
    for v, p in BATTERY_TABLE:
        if voltage >= v:
            return p
    return 0

def get_battery_color(pct):
    if pct <= 20:   return RED
    elif pct < 80:  return CYAN
    else:           return GREEN


# ---------------------------------------------------------------------------
# Indicadores de tela (bolinhas)
# ---------------------------------------------------------------------------
def draw_circle_outline(cx, cy, r, color):
    import math
    for a in range(0, 360, 6):
        rad = a * math.pi / 180
        x = int(cx + r * math.cos(rad))
        y = int(cy + r * math.sin(rad))
        tft.fill_rect(x, y, 1, 1, color)

def draw_filled_circle(cx, cy, r, color):
    for dy in range(-r, r + 1):
        dx = int((r * r - dy * dy) ** 0.5)
        tft.fill_rect(cx - dx, cy + dy, 2 * dx + 1, 1, color)

def draw_screen_indicators(active):
    cx = 120; y = 215; s = 25; r = 5
    xs = [cx - s, cx, cx + s]
    for x in xs:
        draw_circle_outline(x, y, r, WHITE)
    draw_filled_circle(xs[active], y, r, WHITE)


# ---------------------------------------------------------------------------
# Splash
# ---------------------------------------------------------------------------
def draw_splash():
    tft.fill(BLACK)
    tft_text("Welcome to", 60, 95, WHITE, 2)
    tft_text("EcoBreath",  60, 130, GREEN, 2)
    time.sleep(2)
    tft.fill(BLACK)

def draw_screen_start():
    tft.fill(BLACK)
    tft_text("EcoBreath", 60, 60, GREEN, 2)
    tft_text("Press HOME", 45, 120, WHITE, 2)
    tft_text("to continue", 45, 140, WHITE, 2)

def wait_for_home():
    while home_btn.value():
        time.sleep_ms(10)
    time.sleep_ms(200)
    while not home_btn.value():
        pass


# ---------------------------------------------------------------------------
# Atualizações parciais de sensores
# ---------------------------------------------------------------------------
def update_humidity(h):
    tft_clear_rect(HUM_X + OFFSET, HUM_Y, VALUE_W, VALUE_H)
    tft_text("Hum:  {:.1f}%".format(h), HUM_X, HUM_Y, WHITE, 2)

def update_temperature(t):
    tft_clear_rect(TEMP_X + OFFSET, TEMP_Y, VALUE_W, VALUE_H)
    tft_text("Temp: {:.1f}C".format(t), TEMP_X, TEMP_Y, WHITE, 2)

def update_battery(voltage, pct):
    global last_battery_pct, last_battery_volt
    if last_battery_volt is None or abs(voltage - last_battery_volt) >= 0.01:
        tft_clear_rect(BAT_VOLT_X, BAT_VOLT_Y, VALUE_W, VALUE_H)
        tft_text("{:.2f} V".format(voltage), BAT_VOLT_X, BAT_VOLT_Y, CYAN, 2)
        last_battery_volt = voltage
    if last_battery_pct is None or pct != last_battery_pct:
        color = get_battery_color(pct)
        tft_clear_rect(BAT_PCT_X, BAT_PCT_Y, VALUE_W, VALUE_H)
        tft_text("{} %".format(pct), BAT_PCT_X, BAT_PCT_Y, color, 2)
        last_battery_pct = pct


# ---------------------------------------------------------------------------
# Telas
# ---------------------------------------------------------------------------
def draw_screen_sensors():
    global last_temp, last_hum
    tft.fill(BLACK)
    tft_text("EcoBreath", 60, 40, GREEN, 2)
    try:
        sensor.measure()
        t = sensor.temperature()
        h = sensor.humidity()
        last_temp = t
        last_hum  = h
        shared_state.set_sensor_data(t, h)
        update_humidity(h)
        update_temperature(t)
    except OSError:
        tft_text("Sensor error", 40, 120, RED, 2)
    draw_screen_indicators(0)


def draw_screen_info():
    """Tela de Info: versão de hardware/software + status WiFi em tempo real."""
    tft.fill(BLACK)
    tft_text("Hardware: R1",  40, 50,  WHITE, 2)
    tft_text("Software: V2.0", 35, 80, WHITE, 2)

    # --- Status WiFi ---
    tft_text("WiFi:", 40, 120, WHITE, 2)
    _refresh_wifi_status_on_screen()

    draw_screen_indicators(1)


def _refresh_wifi_status_on_screen():
    """Atualiza apenas a linha de status WiFi na tela Info (evita redesenho completo)."""
    status, ssid, ip = shared_state.get_wifi_state()

    # Limpa área de status
    tft.fill_rect(40, 145, 200, 60, BLACK)

    if status == "CONNECTED":
        tft_text("OK", 40, 145, GREEN, 2)
        # Trunca SSID se muito longo
        display_ssid = ssid[:12] if len(ssid) > 12 else ssid
        tft_text(display_ssid, 40, 165, CYAN, 2)
        # Exibe IP dividido em duas linhas se necessário
        if len(ip) <= 13:
            tft_text(ip, 40, 185, CYAN, 2)
        else:
            tft_text(ip[:13], 40, 185, CYAN, 2)
    elif status == "CONNECTING":
        tft_text("Conectando..", 40, 145, YELLOW, 2)
    elif status == "LOST":
        tft_text("Reconect..", 40, 145, YELLOW, 2)
    else:  # AP
        tft_text("AP: PICO-AP", 40, 145, YELLOW, 2)
        tft_text("192.168.4.1", 40, 165, CYAN, 2)


def draw_screen_battery():
    global last_battery_pct, last_battery_volt
    tft.fill(BLACK)
    tft_text("Battery Status", 30, 40, GREEN, 2)
    tft_text("Voltage:", 30, 100, WHITE, 2)
    tft_text("Charge:",  30, 140, WHITE, 2)
    last_battery_pct  = None
    last_battery_volt = None
    vbat = read_battery_voltage()
    pct  = voltage_to_percent(vbat)
    shared_state.set_battery_data(vbat, pct)
    update_battery(vbat, pct)
    draw_screen_indicators(2)


def draw_screen():
    if screen_index == 0:
        draw_screen_sensors()
    elif screen_index == 1:
        draw_screen_info()
    else:
        draw_screen_battery()


# ---------------------------------------------------------------------------
# Cache de último status WiFi para detectar mudança na tela Info
# ---------------------------------------------------------------------------
_last_wifi_status = None


def run():
    """Ponto de entrada do Core 0 — chamado por main.py."""
    global screen_index, button_pressed, button_released
    global last_temp, last_hum, last_sensor_read, last_battery_read
    global _last_wifi_status

    draw_splash()
    draw_screen_start()
    wait_for_home()
    draw_screen()

    while True:
        now = time.ticks_ms()
        btn = home_btn.value()

        # --- Botão ---
        if btn == 0 and not button_pressed:
            button_pressed = True
        if btn == 1 and button_pressed:
            button_pressed  = False
            button_released = True
            time.sleep_ms(5)
        if button_released:
            screen_index = (screen_index + 1) % TOTAL_SCREENS
            button_released = False
            draw_screen()

        # --- Atualização de sensores (tela 0) ---
        if screen_index == 0 and time.ticks_diff(now, last_sensor_read) >= SENSOR_INTERVAL:
            last_sensor_read = now
            try:
                sensor.measure()
                t = sensor.temperature()
                h = sensor.humidity()
                shared_state.set_sensor_data(t, h)
                if last_temp is not None and abs(t - last_temp) >= 0.1:
                    update_temperature(t)
                    last_temp = t
                if last_hum is not None and abs(h - last_hum) >= 0.1:
                    update_humidity(h)
                    last_hum = h
            except OSError:
                pass

        # --- Atualização de bateria (tela 2) ---
        if screen_index == 2 and time.ticks_diff(now, last_battery_read) >= BATTERY_INTERVAL:
            last_battery_read = now
            vbat = read_battery_voltage()
            pct  = voltage_to_percent(vbat)
            shared_state.set_battery_data(vbat, pct)
            update_battery(vbat, pct)

        # --- Atualização de WiFi status (tela 1, detecta mudança) ---
        if screen_index == 1:
            current_status = shared_state.get_wifi_state()[0]
            if current_status != _last_wifi_status:
                _last_wifi_status = current_status
                _refresh_wifi_status_on_screen()

        time.sleep_ms(10)
