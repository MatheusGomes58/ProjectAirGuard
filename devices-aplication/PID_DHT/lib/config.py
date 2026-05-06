# ==============================================================================
# config.py — PID Climate Controller | Raspberry Pi Pico 2W (MicroPython)
# Configurações de hardware, rede e parâmetros de controle
# ==============================================================================

# --- Pinout ---
PIN_DHT22         = 16     # GP16 — Sensor DHT22
PIN_RELAY_FAN     = 14     # GP14 — Relé 1
PIN_RELAY_HUMID   = 15     # GP15 — Relé 2

# --- Relé: lógica de acionamento ---
RELAY_ACTIVE_HIGH = False

# --- Access Point ---
AP_SSID     = "PICO-CLIMATE"

# --- Parâmetros de conexão WiFi ---
WIFI_RETRY_ATTEMPTS = 20
WIFI_RETRY_DELAY_MS = 500

# --- Setpoints padrão ---
DEFAULT_TEMP_SETPOINT  = 25.0   # °C
DEFAULT_HUM_SETPOINT   = 60.0   # %

# --- PID — Relé 1 ---
PID_TEMP_KP = 0.6
PID_TEMP_KI = 0.05
PID_TEMP_KD = 0.1

# --- PID — Relé 2 ---
PID_HUM_KP  = 0.5
PID_HUM_KI  = 0.04
PID_HUM_KD  = 0.08

# --- Modo de controle padrão: "auto" | "manual" ---
DEFAULT_CONTROL_MODE = "manual"

# --- Ciclo de controle ---
CONTROL_PERIOD_S  = 10    # Período do duty-cycle dos relés (segundos)
SENSOR_READ_MS    = 2000  # Intervalo de leitura do DHT22 (ms)

# --- Diretório de configuração ---
CONFIG_DIR = "config"
