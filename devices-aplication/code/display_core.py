# ==============================================================================
# display_core.py — Core 0: Display GC9A01 + ENS160 + AHT21 + Bateria + Botão
# EcoBreath Merged | Raspberry Pi Pico 2W
#
# Telas:
#   0 — Sensores (Temperatura + Umidade do AHT21)
#   1 — Qualidade do Ar (AQI + TVOC + eCO2 do ENS160)
#   2 — Info WiFi
#   3 — Bateria
# ==============================================================================
import machine
import time
import math
from gc9a01 import GC9A01, BLACK, WHITE, GREEN, CYAN, RED, YELLOW, MAGENTA
from lib import shared_state
from lib.ens160_aht21 import SensorHub
from config import (PIN_SPI_SCK, PIN_SPI_MOSI, PIN_DISP_CS, PIN_DISP_DC,
                    PIN_DISP_RST, PIN_HOME_BTN, PIN_BATTERY,
                    PIN_I2C_SDA, PIN_I2C_SCL, I2C_FREQ, PIN_BACKLIGHT)

# Paleta da interface (RGB565). A base azul-marinho melhora o contraste
# do display circular e deixa as cores de estado mais fáceis de ler.
# Tokens do frontend AirGuard, convertidos para RGB565.
BG       = 0x0861  # #0a0f0d
PANEL    = 0x10C2  # #141a17
PANEL2   = 0x1944  # #1e2823
TEXT     = 0xF7BE  # #f0f4f2
MUTED    = 0x8CD2  # #8a9a92
LIME     = 0x064A  # #00c853
ACCENT   = 0x7A95  # #69f0ae
RED_UI   = 0xFA8A  # #ff5252
YELLOW_UI = 0xFEA8 # #ffd740
ORANGE   = 0xFD24  # #ffa726
BLUE     = 0x453E  # #42a5f5
GOOD     = 0x65CD  # #66bb6a


# --- Globals ---
tft         = None
sensor_hub  = None
battery_adc = None
home_btn    = None

# --- Screen state ---
screen_index  = 0
TOTAL_SCREENS = 4          # 0=Sensores 1=AQ 2=WiFi 3=Bateria
energy_saver = False
display_unlocked = False
unlock_deadline = 0
backlight_pwm = None
last_sensor_read  = 0
SENSOR_INTERVAL   = 4000
last_battery_read = 0
BATTERY_INTERVAL  = 2000
_last_wifi_status = None

# Cache de leituras para evitar redesenho desnecessário
_last_temp = None
_last_hum  = None
_last_aqi  = None
_last_tvoc = None
_last_eco2 = None
_last_vbat = None
_last_pct  = None

BATTERY_TABLE = [
    (4.029, 100), (3.960, 90), (3.918, 80), (3.866, 70),
    (3.805, 60), (3.755, 50), (3.700, 40), (3.640, 30),
    (3.539, 20), (3.482, 10), (2.9, 0),
]

# Mapeamento AQI UBA (1–5) → texto + cor
AQI_LABELS = {
    1: ("Excelente", LIME),
    2: ("Bom",       GOOD),
    3: ("Regular",   YELLOW_UI),
    4: ("Ruim",      ORANGE),
    5: ("Pessimo",   RED_UI),
}


def init_display():
    """Inicializa SPI, display, I2C e botão. Chamado antes do WiFi."""
    global tft, sensor_hub, battery_adc, home_btn, backlight_pwm

    spi = machine.SPI(
        0,
        baudrate=40000000,
        sck=machine.Pin(PIN_SPI_SCK),
        mosi=machine.Pin(PIN_SPI_MOSI)
    )
    cs  = machine.Pin(PIN_DISP_CS,  machine.Pin.OUT)
    dc  = machine.Pin(PIN_DISP_DC,  machine.Pin.OUT)
    rst = machine.Pin(PIN_DISP_RST, machine.Pin.OUT)
    tft = GC9A01(spi, cs, dc, rst)

    i2c        = machine.I2C(0, sda=machine.Pin(PIN_I2C_SDA),
                              scl=machine.Pin(PIN_I2C_SCL), freq=I2C_FREQ)
    sensor_hub = SensorHub(i2c)

    battery_adc = machine.ADC(PIN_BATTERY)
    home_btn    = machine.Pin(PIN_HOME_BTN, machine.Pin.IN, machine.Pin.PULL_UP)
    if PIN_BACKLIGHT is not None:
        backlight_pwm = machine.PWM(machine.Pin(PIN_BACKLIGHT))
        backlight_pwm.freq(1000)
        set_display_brightness(100)


# ==============================================================================
# Helpers
# ==============================================================================
def tft_text(text, x, y, color, scale=2):
    tft.text(text, x, y, mono_color(color), scale=scale)

def mono_color(color):
    """Converte a interface para preto/branco no modo economico."""
    if not energy_saver:
        return color
    if color in (BG, BLACK, PANEL, PANEL2):
        return BLACK
    if color in (MUTED, BLUE, CYAN):
        return 0x8410
    return WHITE

def set_display_brightness(level):
    """Backlight opcional; sem GPIO a economia visual continua funcionando."""
    if backlight_pwm is not None:
        level = max(0, min(100, level))
        backlight_pwm.duty_u16(int(65535 * level / 100))

def tft_center(text, y, color, scale=1):
    """Centraliza texto usando a fonte bitmap de 8 px do driver."""
    x = max(0, (240 - len(str(text)) * 8 * scale) // 2)
    tft_text(str(text), x, y, color, scale)

def tft_clear_rect(x, y, w, h):
    tft.fill_rect(x, y, w, h, mono_color(BLACK))

def read_battery_voltage():
    return battery_adc.read_u16() * 3.3 / 65535 * 2

def voltage_to_percent(voltage):
    for v, p in BATTERY_TABLE:
        if voltage >= v: return p
    return 0

def get_battery_color(pct):
    if pct <= 20: return RED_UI
    elif pct < 50: return ORANGE
    return LIME

def draw_filled_circle(cx, cy, r, color):
    for dy in range(-r, r + 1):
        dx = int((r * r - dy * dy) ** 0.5)
        tft.fill_rect(cx - dx, cy + dy, 2 * dx + 1, 1, mono_color(color))

def draw_circle_outline(cx, cy, r, color, thickness=1):
    for t in range(thickness):
        cr = r - t
        for a in range(0, 360, 3):
            rad = a * 3.14159 / 180
            x = int(cx + cr * math.cos(rad))
            y = int(cy + cr * math.sin(rad))
            tft.fill_rect(x, y, 1, 1, mono_color(color))

def draw_indicators(active):
    """Indicadores de posição com área reservada para o rodapé."""
    tft.fill_rect(42, 218, 156, 1, mono_color(PANEL2))
    cx = 120; y = 220; s = 18
    xs = [cx - 3*s//2, cx - s//2, cx + s//2, cx + 3*s//2]
    for i, x in enumerate(xs):
        if i == active:
            draw_filled_circle(x, y, 4, LIME)
        else:
            draw_filled_circle(x, y, 2, MUTED)

def draw_header(title, subtitle, active):
    """Cabeçalho dentro da área segura do display circular."""
    tft.fill(mono_color(BG))
    draw_circle_outline(120, 120, 116, PANEL2, 1)
    tft.fill_rect(72, 8, 96, 3, mono_color(LIME))
    tft_center("ECOBREATH", 16, LIME, 1)
    title_scale = 1 if len(title) > 12 else 2
    tft_center(title, 34, TEXT, title_scale)
    tft_center(subtitle, 56, MUTED, 1)
    tft_center("TELA {}/4".format(active + 1), 202, MUTED, 1)
    draw_indicators(active)

def draw_card(x, y, w, h, label, value, color):
    tft.fill_rect(x, y, w, h, mono_color(PANEL))
    tft.fill_rect(x, y, w, 3, mono_color(color))
    tft_text(label, x + 9, y + 10, MUTED, 1)
    tft_text(value, x + 9, y + 30, color, 2)

def draw_bar(x, y, w, value, color):
    tft.fill_rect(x, y, w, 7, mono_color(PANEL2))
    fill = max(0, min(w, int(w * value)))
    if fill:
        tft.fill_rect(x, y, fill, 7, mono_color(color))

def refresh_sensor_gauges(temp, hum):
    """Atualiza somente os dois gauges, sem apagar o layout da tela."""
    tft.fill_rect(24, 72, 92, 132, mono_color(BG))
    tft.fill_rect(124, 72, 92, 132, mono_color(BG))
    temp_value = "{:.1f}".format(temp) if temp is not None else "ERRO"
    hum_value = "{:.0f}%".format(hum) if hum is not None else "ERRO"
    temp_progress = ((temp - 10.0) / 30.0) if temp is not None else 0
    hum_progress = (hum / 100.0) if hum is not None else 0
    draw_gauge(70, 132, 43, temp_progress, ORANGE if temp is not None else RED_UI, "TEMP C", temp_value)
    draw_gauge(170, 132, 43, hum_progress, BLUE if hum is not None else RED_UI, "UMID", hum_value)

def refresh_air_gauge(aqi, tvoc, eco2):
    """Atualiza somente AQI e os indicadores compactos de poluentes."""
    tft.fill_rect(48, 72, 144, 120, mono_color(BG))
    tft.fill_rect(18, 190, 204, 17, mono_color(BG))
    if aqi is not None:
        label, color = AQI_LABELS.get(aqi, ("--", TEXT))
        score = (5 - aqi) / 4.0
        draw_gauge(120, 135, 58, score, color, "AQI - {}".format(label.upper()), str(aqi))
    else:
        draw_gauge(120, 135, 58, 0, YELLOW_UI, "AQI", "--")
    tft_center_at("TVOC {} ppb".format(tvoc) if tvoc is not None else "TVOC --", 82, 198, ORANGE, 1)
    tft_center_at("eCO2 {}".format(eco2) if eco2 is not None else "eCO2 --", 166, 198, BLUE, 1)

def refresh_battery_gauge(vbat, pct):
    """Atualiza apenas o anel da bateria e seus números."""
    tft.fill_rect(45, 67, 150, 137, mono_color(BG))
    color = get_battery_color(pct)
    draw_gauge(120, 132, 62, pct / 100.0, color, "BATERIA", "{}%".format(pct))
    tft_center("{:.2f} V".format(vbat), 196, TEXT, 1)

def draw_gauge(cx, cy, radius, progress, color, label, value):
    """Gauge circular compacto, adequado ao display redondo de 240 px."""
    progress = max(0.0, min(1.0, progress))
    draw_circle_outline(cx, cy, radius, PANEL2, 4)
    # Arco ativo em 280 graus, deixando uma abertura visual no rodape.
    start = -230
    end = start + int(280 * progress)
    for angle in range(start, end + 1, 5):
        rad = angle * 3.14159 / 180
        for thick in range(3):
            rr = radius - thick
            x = int(cx + rr * math.cos(rad))
            y = int(cy + rr * math.sin(rad))
            tft.fill_rect(x, y, 2, 2, mono_color(color))
    tft_center_at(label, cx, cy - 19, MUTED, 1)
    value_scale = 2 if len(str(value)) <= 4 else 1
    tft_center_at(value, cx, cy + 1, color, value_scale)

def tft_center_at(text, cx, y, color, scale=1):
    x = max(0, cx - (len(str(text)) * 8 * scale) // 2)
    tft_text(str(text), x, y, color, scale)

def load_display_preferences():
    """Aplica preferencias do servidor sem reinicializar o display."""
    global energy_saver, display_unlocked
    prefs = shared_state.get_preferences()
    enabled = prefs.get("energy_saver", False)
    changed = enabled != energy_saver
    if changed:
        energy_saver = enabled
        display_unlocked = False
        set_display_brightness(18 if enabled else 100)
    return changed

def refresh_energy_screen():
    """Tela de baixo consumo: bateria + sensores sempre visiveis."""
    temp, hum, _, _, _ = shared_state.get_sensor_data()
    vbat, pct = shared_state.get_battery_data()
    tft.fill_rect(18, 72, 204, 137, mono_color(BLACK))
    temp_value = "{:.1f}".format(temp) if temp is not None else "--"
    hum_value = "{:.0f}%".format(hum) if hum is not None else "--"
    draw_gauge(70, 124, 40, ((temp - 10) / 30) if temp is not None else 0, WHITE, "TEMP C", temp_value)
    draw_gauge(170, 124, 40, (hum / 100) if hum is not None else 0, WHITE, "UMID", hum_value)
    charge = "{}%".format(pct) if pct is not None else "--"
    tft_center("BATERIA {}".format(charge), 178, WHITE, 2)
    tft_center("HOME: DESBLOQUEAR", 201, 0x8410, 1)

def draw_screen_energy():
    tft.fill(BLACK)
    draw_circle_outline(120, 120, 116, WHITE, 1)
    tft.fill_rect(82, 8, 76, 2, WHITE)
    tft_center("ECONOMIA", 18, WHITE, 2)
    tft_center("MODO AMOLED", 47, 0x8410, 1)
    refresh_energy_screen()


# ==============================================================================
# Logo
# ==============================================================================
def draw_logo(cx, cy):
    """Exibe o logo.bin (RGB565 80×80) centrado em (cx, cy)."""
    LOGO_W = 80
    LOGO_H = 80
    x0 = cx - LOGO_W // 2
    y0 = cy - LOGO_H // 2
    try:
        with open('logo.bin', 'rb') as f:
            tft._set_window(x0, y0, x0 + LOGO_W - 1, y0 + LOGO_H - 1)
            tft.dc.value(1)
            tft.cs.value(0)
            while True:
                chunk = f.read(512)
                if not chunk: break
                tft.spi.write(chunk)
            tft.cs.value(1)
    except OSError:
        tft_text("ECO", cx - 18, cy - 7, LIME, 2)


# ==============================================================================
# Splash + Start
# ==============================================================================
def draw_splash():
    tft.fill(mono_color(BG))
    draw_logo(120, 85)
    tft_center("EcoBreath", 145, LIME, 2)
    tft_center("AIR MONITOR", 170, BLUE, 1)
    tft.fill_rect(72, 196, 96, 3, mono_color(LIME))
    time.sleep(3)


def draw_screen_start():
    tft.fill(mono_color(BG))
    draw_logo(120, 75)
    tft_center("EcoBreath", 130, LIME, 2)
    tft_center("MONITORAMENTO DE AR", 163, TEXT, 1)
    tft_center("PRESSIONE HOME", 190, BLUE, 1)


def wait_for_home():
    while home_btn.value():
        time.sleep_ms(10)
    time.sleep_ms(40)
    while not home_btn.value():
        time.sleep_ms(10)


# ==============================================================================
# Tela 0 — Sensores AHT21 (Temperatura + Umidade)
# ==============================================================================
def draw_screen_sensors():
    global _last_temp, _last_hum
    draw_header("AMBIENTE", "AHT21  |  CONFORTO", 0)
    # Usa o cache compartilhado para a troca de tela não bloquear no I2C.
    temp, hum, _, _, _ = shared_state.get_sensor_data()
    _last_temp = temp
    _last_hum = hum
    refresh_sensor_gauges(temp, hum)


# ==============================================================================
# Tela 1 — Qualidade do Ar ENS160 (AQI + TVOC + eCO2)
# ==============================================================================
def draw_screen_air_quality():
    global _last_aqi, _last_tvoc, _last_eco2
    draw_header("QUALIDADE DO AR", "ENS160  |  INDICE AMBIENTAL", 1)

    # Pega dados do shared_state (já lidos na tela de sensores ou pelo Core 1)
    _, _, aqi, tvoc, eco2 = shared_state.get_sensor_data()
    _last_aqi  = aqi
    _last_tvoc = tvoc
    _last_eco2 = eco2

    # AQI
    refresh_air_gauge(aqi, tvoc, eco2)


# ==============================================================================
# Tela 2 — Info WiFi
# ==============================================================================
def draw_screen_info():
    draw_header("CONECTIVIDADE", "WI-FI  |  REDE DO DISPOSITIVO", 2)
    _refresh_wifi()


def _refresh_wifi():
    status, ssid, ip = shared_state.get_wifi_state()
    tft.fill_rect(18, 82, 204, 116, mono_color(PANEL))
    if status == "CONNECTED":
        tft_text("OK  CONECTADO", 30, 94, LIME, 1)
        tft_text("REDE", 30, 120, MUTED, 1)
        tft_text(ssid[:20], 30, 134, TEXT, 1)
        tft_text("IP  " + ip[:16], 30, 164, BLUE, 1)
    elif status == "CONNECTING":
        tft_center("CONECTANDO...", 126, YELLOW_UI, 1)
    else:
        tft_text("!  MODO AP", 30, 94, YELLOW_UI, 1)
        tft_text("REDE  EcoBreath-AP", 30, 126, TEXT, 1)
        from lib import wifi_manager as wifi
        tft_text("IP    " + wifi.get_ap_ip(), 30, 160, BLUE, 1)


# ==============================================================================
# Tela 3 — Bateria
# ==============================================================================
def draw_screen_battery():
    global _last_vbat, _last_pct
    draw_header("BATERIA", "ENERGIA DO DISPOSITIVO", 3)
    vbat = read_battery_voltage()
    pct  = voltage_to_percent(vbat)
    _last_vbat = vbat
    _last_pct = pct
    shared_state.set_battery_data(vbat, pct)
    color = get_battery_color(pct)
    refresh_battery_gauge(vbat, pct)


# ==============================================================================
# Dispatcher
# ==============================================================================
def draw_screen():
    if energy_saver and not display_unlocked:
        draw_screen_energy()
    elif screen_index == 0: draw_screen_sensors()
    elif screen_index == 1: draw_screen_air_quality()
    elif screen_index == 2: draw_screen_info()
    else:                   draw_screen_battery()


# ==============================================================================
# Main Loop (Core 0)
# ==============================================================================
def run():
    global screen_index, last_sensor_read, last_battery_read, _last_wifi_status
    global _last_temp, _last_hum, _last_aqi, _last_tvoc, _last_eco2
    global _last_vbat, _last_pct

    global energy_saver, display_unlocked, unlock_deadline
    load_display_preferences()
    draw_screen()

    btn_pressed = False
    last_button_event = time.ticks_ms() - 200
    last_pref_check = time.ticks_ms()
    while True:
        now = time.ticks_ms()
        btn = home_btn.value()

        if time.ticks_diff(now, last_pref_check) >= 1000:
            last_pref_check = now
            if load_display_preferences():
                draw_screen()

        if energy_saver and display_unlocked and time.ticks_diff(now, unlock_deadline) >= 0:
            display_unlocked = False
            draw_screen_energy()

        # Botão → avança tela
        if btn == 0 and not btn_pressed:
            btn_pressed = True
        if btn == 1 and btn_pressed:
            btn_pressed = False
            if time.ticks_diff(now, last_button_event) >= 150:
                last_button_event = now
                if energy_saver and not display_unlocked:
                    display_unlocked = True
                    unlock_deadline = time.ticks_add(now, 15000)
                    screen_index = 1
                    draw_screen()
                else:
                    if energy_saver:
                        unlock_deadline = time.ticks_add(now, 15000)
                    screen_index = (screen_index + 1) % TOTAL_SCREENS
                    draw_screen()

        # No modo de economia, somente bateria e sensores ficam ativos.
        if energy_saver and not display_unlocked:
            if time.ticks_diff(now, last_sensor_read) >= SENSOR_INTERVAL:
                last_sensor_read = now
                refresh_energy_screen()
            if time.ticks_diff(now, last_battery_read) >= BATTERY_INTERVAL:
                last_battery_read = now
                vbat = read_battery_voltage()
                pct = voltage_to_percent(vbat)
                shared_state.set_battery_data(vbat, pct)
                refresh_energy_screen()
            time.sleep_ms(40)
            continue

        # Tela 0: atualiza sensores AHT21
        if screen_index == 0 and time.ticks_diff(now, last_sensor_read) >= SENSOR_INTERVAL:
            last_sensor_read = now
            try:
                temp, hum, aqi, tvoc, eco2 = sensor_hub.read()
                shared_state.set_sensor_data(temp, hum, aqi, tvoc, eco2)
                if temp is not None: _last_temp = temp
                if hum is not None: _last_hum = hum
                refresh_sensor_gauges(temp, hum)
            except: pass

        # Tela 1: atualiza qualidade do ar ENS160
        if screen_index == 1 and time.ticks_diff(now, last_sensor_read) >= SENSOR_INTERVAL:
            last_sensor_read = now
            try:
                temp, hum, aqi, tvoc, eco2 = sensor_hub.read()
                shared_state.set_sensor_data(temp, hum, aqi, tvoc, eco2)
                _last_aqi = aqi
                _last_tvoc = tvoc
                _last_eco2 = eco2
                refresh_air_gauge(aqi, tvoc, eco2)
            except: pass

        # Tela 2: atualiza WiFi se mudou
        if screen_index == 2:
            cur = shared_state.get_wifi_state()[0]
            if cur != _last_wifi_status:
                _last_wifi_status = cur
                _refresh_wifi()

        # Tela 3: atualiza bateria periodicamente
        if screen_index == 3 and time.ticks_diff(now, last_battery_read) >= BATTERY_INTERVAL:
            last_battery_read = now
            vbat = read_battery_voltage()
            pct  = voltage_to_percent(vbat)
            shared_state.set_battery_data(vbat, pct)
            _last_vbat = vbat
            _last_pct = pct
            refresh_battery_gauge(vbat, pct)


