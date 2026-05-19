# Controle PWM de ventoinha 4 fios com Raspberry Pi Pico W
# PWM no GPIO12
# TACH no GPIO13
# MicroPython

from machine import Pin, PWM
import time

# ===== CONFIG =====
PWM_PIN = 12
TACH_PIN = 13

PWM_FREQ = 25000   # 25 kHz padrão fans PWM PC

# ===== PWM =====
fan_pwm = PWM(Pin(PWM_PIN))
fan_pwm.freq(PWM_FREQ)

# ===== TACH =====
tach_pulses = 0

def tach_callback(pin):
    global tach_pulses
    tach_pulses += 1

tach = Pin(TACH_PIN, Pin.IN, Pin.PULL_UP)
tach.irq(trigger=Pin.IRQ_FALLING, handler=tach_callback)

# ===== FUNÇÃO PWM =====
def set_fan_speed(percent):
    # limita entre 0 e 100
    percent = max(0, min(100, percent))

    # converte para duty_u16
    duty = int((percent / 100) * 65535)

    fan_pwm.duty_u16(duty)

# ===== LOOP =====
while True:

    # sobe 0 -> 100
    for speed in range(0, 101):

        set_fan_speed(speed)

        tach_pulses = 0
        time.sleep(1)

        # maioria das fans = 2 pulsos por volta
        rpm = (tach_pulses / 2) * 60

        print("PWM: {}% | RPM: {:.0f}".format(speed, rpm))

    # desce 100 -> 0
    for speed in range(100, -1, -1):

        set_fan_speed(speed)

        tach_pulses = 0
        time.sleep(1)

        rpm = (tach_pulses / 2) * 60

        print("PWM: {}% | RPM: {:.0f}".format(speed, rpm))