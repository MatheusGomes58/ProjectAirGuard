# ==============================================================================
# ens160_aht21.py — Driver I2C para ENS160 (AQI/TVOC/eCO2) + AHT21 (T/H)
# EcoBreath Merged | Raspberry Pi Pico 2W (MicroPython)
#
# AHT21 I2C Address : 0x38
# ENS160 I2C Address: 0x52 ou 0x53
# ==============================================================================
import time

AHT_ADDR   = 0x38
ENS_ADDRS  = [0x52, 0x53]

# ENS160 registers
_ENS_PART_ID  = 0x00
_ENS_OPMODE   = 0x10
_ENS_STATUS   = 0x20
_ENS_AQI      = 0x21
_ENS_TVOC     = 0x22
_ENS_ECO2     = 0x24

_ENS_MODE_IDLE    = 0x01
_ENS_MODE_STANDARD = 0x02


class SensorHub:
    """
    Gerencia a leitura dos sensores AHT21 e ENS160 via barramento I2C.
    Uso:
        hub = SensorHub(i2c)
        temp, hum, aqi, tvoc, eco2 = hub.read()
    """

    def __init__(self, i2c):
        self._i2c = i2c
        self._ens_addr = None
        self._aht_ok = False
        self._ens_ok = False
        self._init_sensors()

    # ------------------------------------------------------------------
    # Inicialização
    # ------------------------------------------------------------------
    def _init_sensors(self):
        devices = []
        try:
            devices = self._i2c.scan()
        except Exception as e:
            print("[sensor] Erro no scan I2C:", e)
            return

        # --- AHT21 ---
        if AHT_ADDR in devices:
            try:
                # Comando de inicialização do AHT20/AHT21
                self._i2c.writeto(AHT_ADDR, bytes([0xBE, 0x08, 0x00]))
                time.sleep_ms(20)
                self._aht_ok = True
                print("[sensor] AHT21 detectado (0x38)")
            except Exception as e:
                print("[sensor] Falha ao inicializar AHT21:", e)
        else:
            print("[sensor] AHT21 NÃO encontrado em 0x38")

        # --- ENS160 ---
        for addr in ENS_ADDRS:
            if addr in devices:
                self._ens_addr = addr
                break

        if self._ens_addr is not None:
            try:
                # Lê PART_ID para confirmar
                data = self._i2c.readfrom_mem(self._ens_addr, _ENS_PART_ID, 2)
                part_id = data[0] | (data[1] << 8)
                print("[sensor] ENS160 detectado (0x{:02X}), PART_ID=0x{:04X}".format(
                    self._ens_addr, part_id))

                # Idle → Standard
                self._i2c.writeto_mem(self._ens_addr, _ENS_OPMODE, bytes([_ENS_MODE_IDLE]))
                time.sleep_ms(20)
                self._i2c.writeto_mem(self._ens_addr, _ENS_OPMODE, bytes([_ENS_MODE_STANDARD]))
                time.sleep_ms(100)
                self._ens_ok = True
                print("[sensor] ENS160 em modo standard")
            except Exception as e:
                print("[sensor] Falha ao inicializar ENS160:", e)
                self._ens_addr = None
        else:
            print("[sensor] ENS160 NÃO encontrado (tentou 0x52 e 0x53)")

    # ------------------------------------------------------------------
    # AHT21 — Leitura de Temperatura e Umidade
    # ------------------------------------------------------------------
    def _read_aht21(self):
        """Retorna (temperatura, umidade) ou (None, None) em caso de erro."""
        try:
            self._i2c.writeto(AHT_ADDR, bytes([0xAC, 0x33, 0x00]))
            time.sleep_ms(100)
            data = self._i2c.readfrom(AHT_ADDR, 6)

            raw_hum  = ((data[1] << 16) | (data[2] << 8) | data[3]) >> 4
            raw_temp = ((data[3] & 0x0F) << 16) | (data[4] << 8) | data[5]

            humidity    = (raw_hum  * 100.0) / 1048576.0
            temperature = (raw_temp * 200.0  / 1048576.0) - 50.0

            return round(temperature, 2), round(humidity, 2)
        except Exception as e:
            print("[sensor] Erro lendo AHT21:", e)
            return None, None

    # ------------------------------------------------------------------
    # ENS160 — Leitura de AQI, TVOC e eCO2
    # ------------------------------------------------------------------
    def _read_ens160(self):
        """Retorna (aqi, tvoc, eco2) ou (None, None, None) em caso de erro."""
        if not self._ens_ok or self._ens_addr is None:
            return None, None, None
        try:
            status = self._i2c.readfrom_mem(self._ens_addr, _ENS_STATUS, 1)[0]

            # Bits 2-3 do status: 00=ok, 10=warm-up, 11=initial startup
            data_status = (status >> 2) & 0x03
            if data_status not in (0, 2):
                # Sensor ainda aquecendo na primeira inicialização
                pass

            aqi_raw  = self._i2c.readfrom_mem(self._ens_addr, _ENS_AQI,  1)
            tvoc_raw = self._i2c.readfrom_mem(self._ens_addr, _ENS_TVOC, 2)
            eco2_raw = self._i2c.readfrom_mem(self._ens_addr, _ENS_ECO2, 2)

            aqi  = aqi_raw[0] & 0x07        # AQI UBA: 1-5
            tvoc = tvoc_raw[0] | (tvoc_raw[1] << 8)   # ppb
            eco2 = eco2_raw[0] | (eco2_raw[1] << 8)   # ppm

            return aqi, tvoc, eco2
        except Exception as e:
            print("[sensor] Erro lendo ENS160:", e)
            return None, None, None

    # ------------------------------------------------------------------
    # API pública
    # ------------------------------------------------------------------
    def read(self):
        """
        Lê todos os sensores e retorna:
            (temp, hum, aqi, tvoc, eco2)
        Campos que falharem retornam None.
        """
        temp, hum = self._read_aht21()
        aqi, tvoc, eco2 = self._read_ens160()
        return temp, hum, aqi, tvoc, eco2

    @property
    def aht_available(self):
        return self._aht_ok

    @property
    def ens_available(self):
        return self._ens_ok
