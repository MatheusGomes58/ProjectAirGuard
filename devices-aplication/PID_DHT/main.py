# ==============================================================================
# main.py — EcoBreath Shield | Raspberry Pi Pico 2W (MicroPython)
# ==============================================================================
import utime
import uasyncio as asyncio
from machine import Pin
import dht
import gc

from lib import shared_state
from lib import wifi_manager as wifi
from lib import web_server as web
from lib import cloud_sync
from lib.pid_controller import PID
from lib.relay_manager import RelayManager
from lib.config import (
    PIN_DHT22, PIN_RELAY_FAN, PIN_RELAY_HUMID,
    PID_TEMP_KP, PID_TEMP_KI, PID_TEMP_KD,
    PID_HUM_KP, PID_HUM_KI, PID_HUM_KD,
    SENSOR_READ_MS, CONTROL_PERIOD_S, AP_SSID,
)


# ==============================================================================
# Log helper — tudo que é printado vai pro log do dashboard
# ==============================================================================
_original_print = print
def log(msg):
    _original_print(msg)
    shared_state.add_log(str(msg))


# ==============================================================================
# Task: Leitura do sensor DHT22
# ==============================================================================
async def sensor_task():
    sensor = dht.DHT22(Pin(PIN_DHT22))
    log("[sensor] Task iniciada.")
    tick = 0
    while True:
        try:
            sensor.measure()
            t = sensor.temperature()
            h = sensor.humidity()
            shared_state.set_sensor_data(t, h)
            tick += 1
            if tick % 5 == 0:  # Log a cada 10s (5 * 2000ms)
                log("[sensor] T={:.1f}C H={:.1f}%".format(t, h))
        except Exception as e:
            log("[sensor] Erro: {}".format(e))
        await asyncio.sleep_ms(SENSOR_READ_MS)


# ==============================================================================
# Task: Controle (Auto com PID duty-cycle / Manual)
# ==============================================================================
async def control_task():
    """Controle dinâmico baseado em setpoints e ações configuráveis.

    Cada ação define:
      - Qual relé controlar (1 ou 2)
      - Qual setpoint usar como referência
      - Condição: liga quando sensor > SP (above) ou < SP (below)
      - Período: duty-cycle temporal controlado por PID (0 = liga direto)

    O PID calcula quanto tempo o relé fica ligado dentro do período.
    """
    relays = RelayManager()
    # PIDs por ação (criados dinamicamente)
    pids = {}  # action_id -> PID instance
    # Acumuladores de duty-cycle por relé
    cycle_accum = {1: 0.0, 2: 0.0}
    relay_duty = {1: 0.0, 2: 0.0}

    log("[control] Task iniciada.")

    while True:
        temp, hum = shared_state.get_sensor_data()
        mode = shared_state.get_control_mode()
        actions = shared_state.get_actions_list()
        setpoints = shared_state.get_setpoints_list()

        # Mapa de setpoints por id
        sp_map = {sp["id"]: sp for sp in setpoints}

        if mode == "auto":
            # Reset duty para cada relé
            duty = {1: 0.0, 2: 0.0}

            for act in actions:
                sp = sp_map.get(act["setpoint_id"])
                if not sp:
                    continue

                # Valor do sensor
                measured = shared_state.get_sensor_value(sp["sensor"])
                if measured is None:
                    continue

                sp_val = sp["value"]
                condition = act["condition"]
                period = act["period"]
                relay = act["relay"]
                act_id = act["id"]

                # Verifica se precisa atuar
                needs_action = False
                if condition == "above" and measured > sp_val:
                    needs_action = True
                elif condition == "below" and measured < sp_val:
                    needs_action = True

                if not needs_action:
                    # Limpa PID se existir
                    if act_id in pids:
                        pids[act_id].reset()
                    continue

                if period <= 0:
                    # Sem duty-cycle: liga direto
                    duty[relay] = 1.0
                else:
                    # PID calcula o duty
                    if act_id not in pids:
                        kp = PID_TEMP_KP if sp["sensor"] == "temp" else PID_HUM_KP
                        ki = PID_TEMP_KI if sp["sensor"] == "temp" else PID_HUM_KI
                        kd = PID_TEMP_KD if sp["sensor"] == "temp" else PID_HUM_KD
                        pids[act_id] = PID(kp, ki, kd, setpoint=0.0)

                    pid = pids[act_id]
                    if condition == "above":
                        pid.setpoint = measured
                        out = pid.compute(sp_val, 1.0)
                    else:
                        pid.setpoint = sp_val
                        out = pid.compute(measured, 1.0)

                    d = max(0.0, min(1.0, out))
                    # Maior duty ganha (se múltiplas ações no mesmo relé)
                    if d > duty[relay]:
                        duty[relay] = d

            # Aplica duty-cycle temporal
            for r in [1, 2]:
                relay_duty[r] = duty[r]

            relays.set_duty(duty[1], duty[2])
            relays._period_s = CONTROL_PERIOD_S
            relays.update(1.0)

            # Log
            r1_on, r2_on = relays.get_status()
            if r1_on or r2_on:
                log("[auto] R1={} R2={} T={} H={}".format(
                    "ON" if r1_on else "OFF", "ON" if r2_on else "OFF",
                    "{:.1f}".format(temp) if temp else "--",
                    "{:.1f}".format(hum) if hum else "--"))

        elif mode == "manual":
            r1_man = shared_state.get_manual_relay(1)
            r2_man = shared_state.get_manual_relay(2)
            relays.force(r1_man, r2_man)

        # Atualiza estados
        r1_on, r2_on = relays.get_status()
        shared_state.set_relay_state(1, r1_on)
        shared_state.set_relay_state(2, r2_on)

        # Histórico
        if temp is not None and hum is not None:
            shared_state.add_history_point(temp, hum, r1_on, r2_on)

        await asyncio.sleep_ms(1000)


# ==============================================================================
# Task: Monitor WiFi
# ==============================================================================
async def wifi_monitor():
    while True:
        await asyncio.sleep_ms(15000)
        ssid, password = wifi.load_wifi_properties()
        if ssid and not wifi.is_connected():
            log("[wifi] Reconectando...")
            wifi.start_ap()
            wifi.connect_to_wifi(ssid, password, save=False)
        gc.collect()


# ==============================================================================
# Main
# ==============================================================================
async def main():
    gc.collect()
    print("\n" + "=" * 40)
    print("  EcoBreath Shield v2.0")
    print("=" * 40 + "\n")

    # Build automatico do dashboard
    try:
        import build
        build.build()
    except Exception as e:
        print("[build] Pulou:", e)

    # Carrega configurações
    shared_state.load_setpoints()
    shared_state.load_actions()
    shared_state.load_state()
    shared_state.load_relay_names()
    cloud_sync.load_cloud_config()

    # Rede
    net_mode = shared_state.get_net_mode()
    if net_mode != 'reader':
        # AP
        ap_ip = wifi.start_ap()
        log("AP: {} | IP: {} | http://{}".format(AP_SSID, ap_ip, ap_ip))

        # WiFi salvo
        ssid_salvo, _ = wifi.load_wifi_properties()
        if ssid_salvo:
            log("[wifi] Tentando '{}'...".format(ssid_salvo))
            if wifi.try_saved_wifi():
                log("[wifi] OK! IP: {}".format(wifi.get_sta_ip()))
            else:
                log("[wifi] Falha. Use o AP.")
        else:
            log("[wifi] Nenhuma rede salva.")
    else:
        log("[main] Modo LEITOR ativo. Rede desligada.")

    gc.collect()

    # Tasks
    asyncio.create_task(sensor_task())
    asyncio.create_task(control_task())

    # Rede (só se não for modo leitor)
    net_mode = shared_state.get_net_mode()
    if net_mode == 'reader':
        log("[main] Modo LEITOR: rede desligada, so sensores + PID.")
        shared_state.set_control_mode('auto')
    else:
        asyncio.create_task(wifi.dns_server_task())
        asyncio.create_task(wifi_monitor())
        asyncio.create_task(web.start_web_server(port=80))
        asyncio.create_task(cloud_sync.cloud_sync_task())

    log("[main] Sistema pronto.")
    while True:
        await asyncio.sleep_ms(60000)
        gc.collect()


try:
    asyncio.run(main())
except Exception as e:
    import sys
    print("[FATAL]", e)
    sys.print_exception(e)
    utime.sleep(5)
    import machine
    machine.reset()
