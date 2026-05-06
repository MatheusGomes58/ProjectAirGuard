# ==============================================================================
# pid_controller.py — Controlador PID genérico
# ==============================================================================


class PID:
    def __init__(self, kp, ki, kd, setpoint=0.0,
                 output_limits=(0.0, 1.0), integrator_limit=1.0):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.setpoint = setpoint
        self._out_min, self._out_max = output_limits
        self._int_limit = integrator_limit
        self._integral = 0.0
        self._last_meas = None
        self._last_output = 0.0

    def reset(self):
        self._integral = 0.0
        self._last_meas = None
        self._last_output = 0.0

    def compute(self, measured, dt):
        if dt <= 0.0:
            return self._last_output
        error = self.setpoint - measured
        p_term = self.kp * error
        self._integral += error * dt
        self._integral = max(-self._int_limit, min(self._int_limit, self._integral))
        i_term = self.ki * self._integral
        if self._last_meas is None:
            d_term = 0.0
        else:
            d_term = -self.kd * (measured - self._last_meas) / dt
        self._last_meas = measured
        output = p_term + i_term + d_term
        output = max(self._out_min, min(self._out_max, output))
        self._last_output = output
        return output
