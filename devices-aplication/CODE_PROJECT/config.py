# ==============================================================================
# config.py — EcoBreath Merged | Raspberry Pi Pico 2W (MicroPython)
# Configurações de rede e hardware
# ==============================================================================

# --- Access Point ---
AP_SSID     = "PICO-AP"
AP_PASSWORD = "12345678"

# --- Servidor da API (para envio de dados no futuro) ---
SERVER_URL  = "https://aa50-35-222-196-102.ngrok-free.app/classificar/"

# UUID do dispositivo
DEVICE_UUID = "J3zCshT2v3ZgzS1wPIIG"

# --- Parâmetros de conexão WiFi ---
WIFI_RETRY_ATTEMPTS = 20      # Tentativas de conexão
WIFI_RETRY_DELAY_MS = 500     # Delay entre tentativas (ms)
