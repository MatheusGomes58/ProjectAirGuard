# ==============================================================================
# main.py — PID Climate Controller | Raspberry Pi Pico 2W (MicroPython)
# ==============================================================================
import utime
import uasyncio as asyncio
from machine import Pin
import dht
import gc

from lib import shared_state
from lib import wifi_manager as wifi
from lib import web_server as web
from lib.pid_controller import PID
from lib.relay_manager import RelayManager
from lib.config import (
    PIN_DHT22,
    PID_TEMP_KP, PID_TEMP_KI, PID_TEMP_KD,
    PID_HUM_KP, PID_HUM_KI, PID_HUM_KD,
    SENSOR_READ_MS, CONTROL_PERIOD_S, AP_SSID,
)


# ==============================================================================
# Task: Leitura do sensor DHT22
# ==============================================================================
async def sensor_task():
    sensor = dht.DHT22(Pin(PIN_DHT22))
    print("[sensor] Task iniciada.")
    while True:
        try:
            sensor.measure()
            shared_state.set_sensor_data(sensor.temperature(), sensor.humidity())
        except Exception as e:
            print("[sensor] Erro:", e)
        await asyncio.sleep_ms(SENSOR_READ_MS)


# ==============================================================================
# Task: Controle PID / Manual
# ==============================================================================
async def control_task():
    relays = RelayManager()
    pid1 = PID(PID_TEMP_KP, PID_TEMP_KI, PID_TEMP_KD, setpoint=0.0)
    pid2 = PID(PID_HUM_KP, PID_HUM_KI, PID_HUM_KD, setpoint=0.0)
    last_mode = "pid"
    last_temp = None
    last_hum = None
    auto_period = CONTROL_PERIOD_S
    print("[control] Task iniciada.")

    while True:
        temp, hum = shared_state.get_sensor_data()
        temp_sp, hum_sp = shared_state.get_setpoints()
        mode = shared_state.get_control_mode()
        r1_sensor, r1_action, r2_sensor, r2_action, period = shared_state.get_control_config()

        if mode != last_mode:
            pid1.reset()
            pid2.reset()
            last_mode = mode

        # Período de atuação
        if period > 0:
            act_period = period
        else:
            if temp is not None and last_temp is not None:
                delta_t = abs(temp - last_temp)
                delta_h = abs(hum - last_hum) if hum is not None and last_hum is not None else 0
                delta = max(delta_t, delta_h)
                if delta > 1.0:
                    auto_period = max(5, auto_period - 1)
                elif delta < 0.2:
                    auto_period = min(30, auto_period + 1)
            act_period = auto_period
        relays._period_s = act_period

        if mode == "pid":
            if temp is not None and hum is not None:
                def calc_duty(pid, sensor_type, action, t_sp, h_sp):
                    measured = temp if sensor_type == "temp" else hum
                    sp = t_sp if sensor_type == "temp" else h_sp
                    if action == "above":
                        if measured > sp:
                            pid.setpoint = measured
                            return max(0.0, min(1.0, pid.compute(sp, 1.0)))
                        else:
                            pid.reset()
                            return 0.0
                    else:
                        pid.setpoint = sp
                        out = pid.compute(measured, 1.0)
                        return max(0.0, min(1.0, out)) if measured < sp else 0.0

                duty1 = calc_duty(pid1, r1_sensor, r1_action, temp_sp, hum_sp)
                duty2 = calc_duty(pid2, r2_sensor, r2_action, temp_sp, hum_sp)

                shared_state.set_controller_outputs(duty1, duty2)
                relays.set_duty(duty1, duty2)

                shared_state.add_history_point(temp, hum, temp_sp, hum_sp, duty1, duty2)
                if duty1 > 0 or duty2 > 0:
                    shared_state.add_log("PID: T={:.1f} H={:.1f} R1={:.0f}% R2={:.0f}% P={}s".format(
                        temp, hum, duty1*100, duty2*100, act_period))
                last_temp = temp
                last_hum = hum

            relays.update(1.0)

        elif mode == "manual":
            man_fan, man_humid = shared_state.get_manual_relays()
            relays.force(man_fan, man_humid)
            shared_state.set_controller_outputs(0.0, 0.0)

        shared_state.set_relay_status(*relays.get_status())
        await asyncio.sleep_ms(1000)


# ==============================================================================
# Task: Monitor WiFi
# ==============================================================================
async def wifi_monitor():
    while True:
        await asyncio.sleep_ms(15000)
        ssid, password = wifi.load_wifi_properties()
        if ssid and not wifi.is_connected():
            print("[wifi] Reconectando...")
            wifi.start_ap()
            wifi.connect_to_wifi(ssid, password, save=False)
        gc.collect()


# ==============================================================================
# Main
# ==============================================================================
async def main():
    gc.collect()
    print("\n" + "=" * 40)
    print("  PID Climate Controller v2.0")
    print("=" * 40 + "\n")

    # Carrega configurações
    shared_state.load_setpoints_file()
    shared_state.load_relay_names_file()
    shared_state.load_control_config()

    # AP
    ap_ip = wifi.start_ap()
    print("\n  AP: {} | IP: {} | http://{}\n".format(AP_SSID, ap_ip, ap_ip))

    # WiFi salvo
    ssid_salvo, _ = wifi.load_wifi_properties()
    if ssid_salvo:
        print("[wifi] Tentando '{}'...".format(ssid_salvo))
        if wifi.try_saved_wifi():
            print("[wifi] OK! IP: {}".format(wifi.get_sta_ip()))
        else:
            print("[wifi] Falha. Use o AP.")
    else:
        print("[wifi] Nenhuma rede salva.")

    gc.collect()

    # Tasks
    asyncio.create_task(sensor_task())
    asyncio.create_task(control_task())
    asyncio.create_task(wifi.dns_server_task())
    asyncio.create_task(wifi_monitor())
    asyncio.create_task(web.start_web_server(port=80))

    print("\n[main] Sistema pronto.\n")
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
