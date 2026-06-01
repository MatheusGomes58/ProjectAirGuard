# ==============================================================================
# config.py — EcoBreath Merged | Raspberry Pi Pico 2W
# Hardware: Display GC9A01 + DHT22 + Bateria + Botão (do CODE_PROJECT)
# ==============================================================================

# --- Display GC9A01 (SPI0) ---
PIN_SPI_SCK   = 18
PIN_SPI_MOSI  = 19
PIN_DISP_CS   = 17
PIN_DISP_DC   = 20
PIN_DISP_RST  = 21

# --- Botão HOME ---
PIN_HOME_BTN  = 22

# --- Bateria (ADC) ---
PIN_BATTERY   = 26

# --- Sensor DHT22 ---
PIN_DHT22     = 16

# --- Access Point ---
AP_SSID     = "EcoBreath-AP"

# --- Servidor da API ---
SERVER_URL  = "https://aa50-35-222-196-102.ngrok-free.app/classificar/"
DEVICE_UUID = "J3zCshT2v3ZgzS1wPIIG"

# --- WiFi ---
WIFI_RETRY_ATTEMPTS = 20
WIFI_RETRY_DELAY_MS = 500

# --- Controle (sem relés físicos — apenas lógico para o dashboard) ---
DEFAULT_CONTROL_MODE = "manual"
CONTROL_PERIOD_S     = 10
SENSOR_READ_MS       = 2000

# --- Diretório de configuração ---
CONFIG_DIR = "config"
