# ==============================================================================
# relay_manager.py — Gerenciador de Relés com Duty-Cycle Temporal e PWM
# ==============================================================================
import utime
from machine import Pin, PWM
from lib.config import PIN_RELAY_FAN, PIN_RELAY_HUMID, PIN_PWM_FAN, PIN_TACH_FAN, RELAY_ACTIVE_HIGH, CONTROL_PERIOD_S


class RelayManager:
    def __init__(self, active_high=RELAY_ACTIVE_HIGH, period_s=CONTROL_PERIOD_S):
        self._active_high = active_high
        self._period_s = period_s
        
        # Relés Digitais (Relé 1 e 2)
        self._pin_fan = Pin(PIN_RELAY_FAN, Pin.OUT)
        self._pin_humid = Pin(PIN_RELAY_HUMID, Pin.OUT)
        self._set_pin(self._pin_fan, False)
        self._set_pin(self._pin_humid, False)
        
        # Ventoinha PWM (Relé 3)
        self._pwm_fan = PWM(Pin(PIN_PWM_FAN))
        self._pwm_fan.freq(25000)
        self._pwm_fan.duty_u16(0)
        
        # Tacômetro (Sensor de RPM)
        self._tach_pin = Pin(PIN_TACH_FAN, Pin.IN, Pin.PULL_UP)
        self._tach_pulses = 0
        self._last_rpm_time = utime.ticks_ms()
        self._current_rpm = 0
        
        # Interrupção para contar pulsos de TACH
        self._tach_pin.irq(trigger=Pin.IRQ_FALLING, handler=self._tach_isr)

        # Estado Interno
        self._duty_fan = 0.0
        self._duty_humid = 0.0
        self._duty_pwm = 0.0
        
        self._cycle_accum = 0.0
        self._fan_on = False
        self._humid_on = False
        self._pwm_on = False
        
        self._manual_mode = False

    def _tach_isr(self, pin):
        self._tach_pulses += 1

    def _set_pin(self, pin, state):
        if self._active_high:
            pin.value(1 if state else 0)
        else:
            pin.value(0 if state else 1)

    def set_duty(self, fan_duty, humid_duty, pwm_duty=0.0):
        self._duty_fan = max(0.0, min(1.0, fan_duty))
        self._duty_humid = max(0.0, min(1.0, humid_duty))
        self._duty_pwm = max(0.0, min(1.0, pwm_duty))
        self._manual_mode = False
        
        # Aplica o PWM no hardware imediatamente (0 a 65535)
        self._pwm_fan.duty_u16(int(self._duty_pwm * 65535))
        self._pwm_on = self._duty_pwm > 0

    def get_rpm(self):
        """Calcula o RPM baseado nos pulsos ocorridos desde a última chamada."""
        now = utime.ticks_ms()
        dt_ms = utime.ticks_diff(now, self._last_rpm_time)
        
        # Atualiza a cada 1 segundo no mínimo para precisão (ou se dt for grande o suficiente)
        if dt_ms >= 1000:
            # 2 pulsos por rotação é o padrão de ventoinhas PC
            pulses = self._tach_pulses
            self._tach_pulses = 0
            self._last_rpm_time = now
            
            # RPM = (pulses / 2) * (60000 / dt_ms)
            self._current_rpm = int((pulses / 2) * (60000.0 / dt_ms))
            
        return self._current_rpm

    def update(self, dt_s):
        if self._manual_mode:
            return
            
        # O período temporal é usado apenas para os relés digitais (1 e 2)
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

    def force(self, fan_on, humid_on, pwm_val=0.0):
        self._manual_mode = True
        self._fan_on = bool(fan_on)
        self._humid_on = bool(humid_on)
        
        self._set_pin(self._pin_fan, self._fan_on)
        self._set_pin(self._pin_humid, self._humid_on)
        
        if isinstance(pwm_val, float) or isinstance(pwm_val, int) and not isinstance(pwm_val, bool):
            duty = max(0.0, min(1.0, float(pwm_val)))
            self._pwm_on = duty > 0
            self._duty_pwm = duty
            self._pwm_fan.duty_u16(int(duty * 65535))
        else:
            self._pwm_on = bool(pwm_val)
            self._duty_pwm = 1.0 if self._pwm_on else 0.0
            self._pwm_fan.duty_u16(65535 if self._pwm_on else 0)

    def off_all(self):
        self._fan_on = False
        self._humid_on = False
        self._pwm_on = False
        self._duty_pwm = 0.0
        self._manual_mode = False
        
        self._set_pin(self._pin_fan, False)
        self._set_pin(self._pin_humid, False)
        self._pwm_fan.duty_u16(0)

    def get_status(self):
        return self._fan_on, self._humid_on, self._duty_pwm
