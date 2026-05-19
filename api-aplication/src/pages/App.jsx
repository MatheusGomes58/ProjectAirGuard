import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import '../styles/app.css';

export default function App() {
  const [sensor, setSensor] = useState({});
  const [config, setConfig] = useState({});
  const [deviceId, setDeviceId] = useState('pico-001');

  useEffect(() => {
    let unsub1, unsub2;
    const sRef = db.ref(`devices/${deviceId}/sensor`);
    const cRef = db.ref(`devices/${deviceId}/config`);
    unsub1 = sRef.on('value', snap => { if (snap.val()) setSensor(snap.val()); else setSensor({}); });
    unsub2 = cRef.on('value', snap => { if (snap.val()) setConfig(snap.val()); else setConfig({}); });
    return () => { sRef.off('value', unsub1); cRef.off('value', unsub2); };
  }, [deviceId]);

  const relayNames = config.relay_names || { '1': 'Relé 1', '2': 'Relé 2' };

  return (
    <div className="api-app">
      <header className="api-header">
        <h1>EcoBreath API</h1>
        <p>Micro-frontend para comunicação com dispositivos via Firebase Realtime Database</p>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Device ID:</label>
          <input value={deviceId} onChange={e => setDeviceId(e.target.value)} style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '6px 10px', fontSize: '.8rem', fontFamily: 'monospace', outline: 'none', width: 140 }} />
        </div>
      </header>

      <div className="api-grid">
        {/* Status */}
        <section className="card">
          <h2 className="card-title">Status do Dispositivo</h2>
          <div className="status-grid">
            <div className="status-item"><span className="status-label">Temperatura</span><span className="status-value temp">{sensor.temperature ?? '--'}°C</span></div>
            <div className="status-item"><span className="status-label">Umidade</span><span className="status-value hum">{sensor.humidity ?? '--'}%</span></div>
            <div className="status-item"><span className="status-label">{relayNames['1']}</span><span className={`status-value ${sensor.relay1 ? 'on' : ''}`}>{sensor.relay1 ? 'ON' : 'OFF'}</span></div>
            <div className="status-item"><span className="status-label">{relayNames['2']}</span><span className={`status-value ${sensor.relay2 ? 'on' : ''}`}>{sensor.relay2 ? 'ON' : 'OFF'}</span></div>
            <div className="status-item"><span className="status-label">Modo</span><span className="status-value">{config.mode || 'manual'}</span></div>
            <div className="status-item"><span className="status-label">Atualizado</span><span className="status-value small">{sensor.last_seen || '--'}</span></div>
          </div>
        </section>

        {/* Endpoints */}
        <section className="card">
          <h2 className="card-title">Endpoints Disponíveis</h2>
          <div className="endpoints">
            <Endpoint method="GET" path={`/api/device?device=${deviceId}&get=sensor`} desc="Retorna dados do sensor" />
            <Endpoint method="GET" path={`/api/device?device=${deviceId}&get=config`} desc="Retorna configuração completa" />
            <Endpoint method="SET" path={`/api/device?device=${deviceId}&temperature=25&humidity=60`} desc="Envia dados do sensor (Pico usa isso)" />
            <Endpoint method="SET" path={`/api/device?device=${deviceId}&mode=auto`} desc="Muda modo (auto/manual)" />
            <Endpoint method="SET" path={`/api/device?device=${deviceId}&action=set_relay&relay=1&state=true`} desc="Liga/desliga relé" />
            <Endpoint method="SET" path={`/api/device?device=${deviceId}&action=add_setpoint&name=X&sensor=temp&value=28`} desc="Cria setpoint" />
            <Endpoint method="DEL" path={`/api/device?device=${deviceId}&action=remove_setpoint&id=spXXX`} desc="Remove setpoint" />
            <Endpoint method="SET" path={`/api/device?device=${deviceId}&action=add_action&name=X&relay=1&setpoint_id=spX&condition=above&period=10`} desc="Cria ação" />
            <Endpoint method="DEL" path={`/api/device?device=${deviceId}&action=remove_action&id=aXXX`} desc="Remove ação" />
            <Endpoint method="SET" path={`/api/device?device=${deviceId}&action=set_relay_name&relay=1&name=Ventilador`} desc="Renomeia relé" />
          </div>
        </section>

        {/* Testar */}
        <section className="card">
          <h2 className="card-title">Testar Endpoint</h2>
          <TestPanel deviceId={deviceId} />
        </section>
      </div>
    </div>
  );
}

function Endpoint({ method, path, desc }) {
  const cls = method === 'GET' ? 'get' : method === 'DEL' ? 'del' : 'set';
  return (
    <div className="endpoint">
      <span className={`method ${cls}`}>{method}</span>
      <div className="endpoint-info">
        <code className="endpoint-path">{path}</code>
        <span className="endpoint-desc">{desc}</span>
      </div>
    </div>
  );
}

function TestPanel({ deviceId }) {
  const [params, setParams] = useState('get=sensor');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResult('');
    try {
      const searchParams = new URLSearchParams(params);
      const p = Object.fromEntries(searchParams.entries());
      let res = null;

      if (p.get === 'sensor') {
        const snap = await db.ref(`devices/${deviceId}/sensor`).once('value');
        res = { status: 'ok', device: deviceId, sensor: snap.val() };
      } else if (p.get === 'config') {
        const snap = await db.ref(`devices/${deviceId}/config`).once('value');
        res = { status: 'ok', device: deviceId, config: snap.val() };
      } else if (p.temperature || p.humidity) {
        const data = {};
        if (p.temperature) data.temperature = parseFloat(p.temperature);
        if (p.humidity) data.humidity = parseFloat(p.humidity);
        if (p.relay1) data.relay1 = p.relay1 === 'true';
        if (p.relay2) data.relay2 = p.relay2 === 'true';
        data.last_seen = new Date().toISOString();
        await db.ref(`devices/${deviceId}/sensor`).set(data);
        res = { status: 'ok', device: deviceId, action: 'sensor_update', data };
      } else if (p.mode) {
        await db.ref(`devices/${deviceId}/config/mode`).set(p.mode);
        res = { status: 'ok', device: deviceId, action: 'set_mode', mode: p.mode };
      } else if (p.action) {
        const config = (await db.ref(`devices/${deviceId}/config`).once('value')).val() || {};
        res = await executeAction(p, config, deviceId);
      } else {
        res = { status: 'error', message: 'Params não reconhecidos' };
      }

      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setResult(JSON.stringify({ status: 'error', message: e.message }, null, 2));
    }
    setLoading(false);
  }

  async function executeAction(p, config, devId) {
    const { action, ...rest } = p;
    switch (action) {
      case 'set_relay': {
        const manual = config.manual || {};
        manual[rest.relay || '1'] = rest.state === 'true';
        await db.ref(`devices/${devId}/config/manual`).set(manual);
        return { status: 'ok', device: devId, action };
      }
      case 'add_setpoint': {
        const sps = config.setpoints || [];
        sps.push({ id: 'sp' + Date.now(), name: rest.name, sensor: rest.sensor || 'temp', value: parseFloat(rest.value) });
        await db.ref(`devices/${devId}/config/setpoints`).set(sps);
        return { status: 'ok', device: devId, action };
      }
      case 'remove_setpoint': {
        const sps = (config.setpoints || []).filter(sp => sp.id !== rest.id);
        await db.ref(`devices/${devId}/config/setpoints`).set(sps);
        return { status: 'ok', device: devId, action };
      }
      case 'add_action': {
        const acts = config.actions || [];
        acts.push({ id: 'a' + Date.now(), name: rest.name, relay: parseInt(rest.relay || '1'), setpoint_id: rest.setpoint_id, condition: rest.condition || 'above', period: parseInt(rest.period || '10') });
        await db.ref(`devices/${devId}/config/actions`).set(acts);
        return { status: 'ok', device: devId, action };
      }
      case 'remove_action': {
        const acts = (config.actions || []).filter(a => a.id !== rest.id);
        await db.ref(`devices/${devId}/config/actions`).set(acts);
        return { status: 'ok', device: devId, action };
      }
      case 'set_relay_name': {
        const names = config.relay_names || { '1': 'Rele 1', '2': 'Rele 2' };
        names[rest.relay || '1'] = rest.name;
        await db.ref(`devices/${devId}/config/relay_names`).set(names);
        return { status: 'ok', device: devId, action };
      }
      default:
        return { status: 'error', message: 'Ação desconhecida: ' + action };
    }
  }

  return (
    <div className="test-panel">
      <div className="test-input">
        <span className="test-base">/api/device?</span>
        <input value={params} onChange={e => setParams(e.target.value)} placeholder="get=sensor" />
      </div>
      <button className="test-btn" onClick={run} disabled={loading}>{loading ? '...' : 'Executar'}</button>
      {result && <pre className="test-result">{result}</pre>}
    </div>
  );
}
