import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../firebase';

/**
 * Endpoint público — aceita URL params e retorna JSON puro.
 * Param "device" é obrigatório para identificar o dispositivo.
 * Ex: /api/device?device=pico-001&get=sensor
 */
export default function ApiDevice() {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    if (Object.keys(params).length > 0) {
      processParams(params).then(setResult);
    } else {
      setResult({ status: 'ok', message: 'EcoBreath API', note: 'Param "device" obrigatorio', examples: ['device=pico-001&get=sensor', 'device=pico-001&get=config', 'device=pico-001&temperature=25&humidity=60', 'device=pico-001&mode=auto', 'device=pico-001&action=set_relay&relay=1&state=true'] });
    }
  }, [searchParams]);

  async function processParams(params) {
    try {
      const deviceId = params.device;
      if (!deviceId) return { status: 'error', message: 'Param "device" obrigatorio. Ex: device=pico-001' };

      if (params.get === 'sensor') {
        const snap = await db.ref(`devices/${deviceId}/sensor`).once('value');
        return { status: 'ok', device: deviceId, sensor: snap.val() };
      }
      if (params.get === 'config') {
        const snap = await db.ref(`devices/${deviceId}/config`).once('value');
        return { status: 'ok', device: deviceId, config: snap.val() };
      }
      if (params.temperature || params.humidity) {
        const data = {};
        if (params.temperature) data.temperature = parseFloat(params.temperature);
        if (params.humidity) data.humidity = parseFloat(params.humidity);
        if (params.relay1) data.relay1 = params.relay1 === 'true';
        if (params.relay2) data.relay2 = params.relay2 === 'true';
        data.last_seen = new Date().toISOString();
        await db.ref(`devices/${deviceId}/sensor`).set(data);
        return { status: 'ok', device: deviceId, action: 'sensor_update', data };
      }
      if (params.mode) {
        await db.ref(`devices/${deviceId}/config/mode`).set(params.mode);
        return { status: 'ok', device: deviceId, action: 'set_mode', mode: params.mode };
      }
      if (params.action) {
        return await handleAction(params, deviceId);
      }
      return { status: 'error', message: 'Params nao reconhecidos' };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  }

  async function handleAction(params, deviceId) {
    const { action, device, ...rest } = params;
    const config = (await db.ref(`devices/${deviceId}/config`).once('value')).val() || {};
    switch (action) {
      case 'set_relay': {
        const manual = config.manual || {};
        manual[rest.relay || '1'] = rest.state === 'true';
        await db.ref(`devices/${deviceId}/config/manual`).set(manual);
        return { status: 'ok', device: deviceId, action };
      }
      case 'add_setpoint': {
        const sps = config.setpoints || [];
        sps.push({ id: 'sp' + Date.now(), name: rest.name, sensor: rest.sensor || 'temp', value: parseFloat(rest.value) });
        await db.ref(`devices/${deviceId}/config/setpoints`).set(sps);
        return { status: 'ok', device: deviceId, action };
      }
      case 'remove_setpoint': {
        const sps = (config.setpoints || []).filter(sp => sp.id !== rest.id);
        await db.ref(`devices/${deviceId}/config/setpoints`).set(sps);
        return { status: 'ok', device: deviceId, action };
      }
      case 'add_action': {
        const acts = config.actions || [];
        acts.push({ id: 'a' + Date.now(), name: rest.name, relay: parseInt(rest.relay || '1'), setpoint_id: rest.setpoint_id, condition: rest.condition || 'above', period: parseInt(rest.period || '10') });
        await db.ref(`devices/${deviceId}/config/actions`).set(acts);
        return { status: 'ok', device: deviceId, action };
      }
      case 'remove_action': {
        const acts = (config.actions || []).filter(a => a.id !== rest.id);
        await db.ref(`devices/${deviceId}/config/actions`).set(acts);
        return { status: 'ok', device: deviceId, action };
      }
      case 'set_relay_name': {
        const names = config.relay_names || { '1': 'Rele 1', '2': 'Rele 2' };
        names[rest.relay || '1'] = rest.name;
        await db.ref(`devices/${deviceId}/config/relay_names`).set(names);
        return { status: 'ok', device: deviceId, action };
      }
      default:
        return { status: 'error', message: 'Acao desconhecida: ' + action };
    }
  }

  return <pre style={{ padding: 16, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{result ? JSON.stringify(result, null, 2) : 'Processando...'}</pre>;
}
