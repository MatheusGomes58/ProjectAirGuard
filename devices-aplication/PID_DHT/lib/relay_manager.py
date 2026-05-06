# ==============================================================================
# relay_manager.py — Gerenciador de Relés com Duty-Cycle Temporal
# ==============================================================================
from machine import Pin
from lib.config import PIN_RELAY_FAN, PIN_RELAY_HUMID, RELAY_ACTIVE_HIGH, CONTROL_PERIOD_S


class RelayManager:
    def __init__(self, active_high=RELAY_ACTIVE_HIGH, period_s=CONTROL_PERIOD_S):
        self._active_high = active_high
        self._period_s = period_s
        self._pin_fan = Pin(PIN_RELAY_FAN, Pin.OUT)
        self._pin_humid = Pin(PIN_RELAY_HUMID, Pin.OUT)
        self._set_pin(self._pin_fan, False)
        self._set_pin(self._pin_humid, False)
        self._duty_fan = 0.0
        self._duty_humid = 0.0
        self._cycle_accum = 0.0
        self._fan_on = False
        self._humid_on = False
        self._manual_mode = False

    def _set_pin(self, pin, state):
        if self._active_high:
            pin.value(1 if state else 0)
        else:
            pin.value(0 if state else 1)

    def set_duty(self, fan_duty, humid_duty):
        self._duty_fan = max(0.0, min(1.0, fan_duty))
        self._duty_humid = max(0.0, min(1.0, humid_duty))
        self._manual_mode = False

    def update(self, dt_s):
        if self._manual_mode:
            return
        self._cycle_accum += dt_s
        if self._cycle_accum >= self._period_s:
            self._cycle_accum = 0.0
        pos = self._cycle_accum / self._period_s
        fan_on = pos < self._duty_fan
        if fan_on != self._fan_on:
            self._fan_on = fan_on
            self._set_pin(self._pin_fan, fan_on)
        humid_on = pos < self._duty_humid
        if humid_on != self._humid_on:
            self._humid_on = humid_on
            self._set_pin(self._pin_humid, humid_on)

    def force(self, fan_on, humid_on):
        self._manual_mode = True
        self._fan_on = fan_on
        self._humid_on = humid_on
        self._set_pin(self._pin_fan, fan_on)
        self._set_pin(self._pin_humid, humid_on)

    def off_all(self):
        self._fan_on = False
        self._humid_on = False
        self._manual_mode = False
        self._set_pin(self._pin_fan, False)
        self._set_pin(self._pin_humid, False)

    def get_status(self):
        return self._fan_on, self._humid_on
