# ==============================================================================
# config.py — EcoBreath Merged | Raspberry Pi Pico 2W
# Hardware: Display GC9A01 + ENS160 + AHT21 + Bateria + Botão
# ==============================================================================

# --- Display GC9A01 (SPI0) ---
PIN_SPI_SCK   = 18
PIN_SPI_MOSI  = 19
PIN_DISP_CS   = 17
PIN_DISP_DC   = 20
PIN_DISP_RST  = 21
PIN_BACKLIGHT = None  # Opcional: GPIO do backlight para reduzir brilho fisico

# --- Botão HOME ---
PIN_HOME_BTN  = 1

# --- Bateria (ADC) ---
PIN_BATTERY   = 26

# --- Sensores I2C (ENS160 + AHT21) ---
PIN_I2C_SDA   = 4
PIN_I2C_SCL   = 5
I2C_FREQ      = 100000

# --- Access Point ---
AP_SSID     = "EcoBreath-AP"

# --- Servidor da API ---
SERVER_URL  = "https://aa50-35-222-196-102.ngrok-free.app/classificar/"
DEVICE_UUID = "J3zCshT2v3ZgzS1wPIIG"

# --- WiFi ---
WIFI_RETRY_ATTEMPTS = 20
WIFI_RETRY_DELAY_MS = 500

# --- Controle (apenas lógico para o dashboard) ---
DEFAULT_CONTROL_MODE = "manual"
CONTROL_PERIOD_S     = 10
SENSOR_READ_MS       = 2000

# --- Diretório de configuração ---
CONFIG_DIR = "data"
