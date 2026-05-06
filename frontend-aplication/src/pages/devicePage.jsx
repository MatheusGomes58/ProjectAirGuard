import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../components/firebase/firebase.jsx';
import { MdPowerSettingsNew, MdDelete, MdArrowBack } from 'react-icons/md';
import { WiHumidity, WiThermometer } from 'react-icons/wi';
import '../css/devicePage.css';

const CLOUD_FUNCTION_URL = 'https://us-central1-projectairguard.cloudfunctions.net/sendCommand';

export default function DevicePage() {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState({});
    const [history, setHistory] = useState([]);
    const [tab, setTab] = useState('control');
    // Forms
    const [spName, setSpName] = useState('');
    const [spSensor, setSpSensor] = useState('temp');
    const [spValue, setSpValue] = useState('');
    const [actName, setActName] = useState('');
    const [actRelay, setActRelay] = useState('1');
    const [actSP, setActSP] = useState('');
    const [actCond, setActCond] = useState('above');
    const [actPeriod, setActPeriod] = useState('10');
    const [r1Name, setR1Name] = useState('');
    const [r2Name, setR2Name] = useState('');
    // Collapses
    const [showSP, setShowSP] = useState(false);
    const [showAct, setShowAct] = useState(false);
    const [showChart, setShowChart] = useState(false);
    const [showLog, setShowLog] = useState(false);
    // Refs
    const gaugeRef = useRef(null);
    const chartRef = useRef(null);
    const relayChartRef = useRef(null);

    // Realtime listener
    useEffect(() => {
        if (!deviceId) return;
        const unsub = db.collection('devices').doc(deviceId).onSnapshot(doc => {
            if (doc.exists) setData(doc.data());
        });
        return () => unsub();
    }, [deviceId]);

    // History
    useEffect(() => {
        if (!deviceId) return;
        const unsub = db.collection('devices').doc(deviceId).collection('readings')
            .orderBy('timestamp', 'desc').limit(40).onSnapshot(snap => {
                const r = []; snap.forEach(d => r.push(d.data()));
                setHistory(r.reverse());
            });
        return () => unsub();
    }, [deviceId]);

    // Draw gauge
    useEffect(() => {
        if (gaugeRef.current && data.temperature != null && data.humidity != null) {
            drawGauge(gaugeRef.current, calcAQ(data.temperature, data.humidity));
        }
    }, [data.temperature, data.humidity]);

    // Draw charts
    useEffect(() => {
        if (showChart && chartRef.current && history.length > 1) drawSensorChart(chartRef.current, history);
        if (showChart && relayChartRef.current && history.length > 1) drawRelayChart(relayChartRef.current, history);
    }, [history, showChart]);

    // Send command
    async function cmd(type, value) {
        try {
            await fetch(CLOUD_FUNCTION_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: deviceId, type, value })
            });
        } catch (e) { console.error(e); }
    }

    const temp = data.temperature ?? null;
    const hum = data.humidity ?? null;
    const r1 = data.relay1 || false;
    const r2 = data.relay2 || false;
    const mode = data.mode || 'manual';
    const setpoints = data.setpoints || [];
    const actions = data.actions || [];
    const relayNames = data.relay_names || { '1': 'Relé 1', '2': 'Relé 2' };
    const aq = (temp != null && hum != null) ? calcAQ(temp, hum) : 0;
    const { l: aqLabel, c: aqColor } = getAQLabel(aq);

    return (
        <div className="dp">
            {/* Header */}
            <div className="dp-header">
                <MdArrowBack size={22} onClick={() => navigate('/home')} style={{ cursor: 'pointer' }} />
                <h1>EcoBreath Shield</h1>
                <div className="dp-badge">{data.last_seen ? 'Online' : 'Offline'}</div>
            </div>

            {/* Tabs */}
            <div className="dp-tabs">
                <div className={`dp-tab ${tab === 'control' ? 'active' : ''}`} onClick={() => setTab('control')}>Controle</div>
                <div className={`dp-tab ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>Config</div>
            </div>

            {/* === CONTROLE === */}
            {tab === 'control' && (
                <div className="dp-content">
                    {/* Gauge */}
                    <div className="dp-card">
                        <div className="dp-card-title">Qualidade do Ar</div>
                        <div className="dp-gauge-wrap">
                            <canvas ref={gaugeRef} width="220" height="130" />
                            <div className="dp-gauge-info">
                                <span className="dp-gauge-val">{aq}%</span>
                                <span className="dp-gauge-label" style={{ background: aqColor + '22', color: aqColor }}>{aqLabel}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sensores */}
                    <div className="dp-card">
                        <div className="dp-card-title">Sensor</div>
                        <div className="dp-sensors">
                            <div className="dp-sensor temp">
                                <WiThermometer size={32} />
                                <div className="dp-sensor-val">{temp != null ? `${temp.toFixed(1)}°C` : '--'}</div>
                                <div className="dp-sensor-lbl">Temperatura</div>
                            </div>
                            <div className="dp-sensor hum">
                                <WiHumidity size={32} />
                                <div className="dp-sensor-val">{hum != null ? `${hum.toFixed(1)}%` : '--'}</div>
                                <div className="dp-sensor-lbl">Umidade</div>
                            </div>
                        </div>
                    </div>

                    {/* Relés */}
                    <div className="dp-card">
                        <div className="dp-card-title">Relés</div>
                        <div className="dp-relays">
                            {[1, 2].map(r => {
                                const on = r === 1 ? r1 : r2;
                                return (
                                    <div key={r} className={`dp-relay ${on ? 'on' : ''} ${mode === 'manual' ? 'clickable' : ''}`}
                                        onClick={() => mode === 'manual' && cmd('set_relay', { relay: r, state: !on })}>
                                        <MdPowerSettingsNew size={22} />
                                        <div className="dp-relay-name">{relayNames[String(r)]}</div>
                                        <div className="dp-relay-state">{on ? 'ON' : 'OFF'}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="dp-hint">{mode === 'manual' ? 'Toque nos relés para ligar/desligar' : 'Controle automático ativo'}</div>
                    </div>

                    {/* Gráficos */}
                    <div className="dp-card">
                        <div className="dp-collapse-hd" onClick={() => setShowChart(!showChart)}>
                            <span className="dp-card-title" style={{ marginBottom: 0 }}>Gráficos</span>
                            <span className="dp-arrow">{showChart ? '▲' : '▼'}</span>
                        </div>
                        {showChart && (
                            <div className="dp-collapse-body">
                                <div className="dp-chart-label">Sensores</div>
                                <div className="dp-chart-wrap"><canvas ref={chartRef} /></div>
                                <div className="dp-chart-label">Atuadores</div>
                                <div className="dp-chart-wrap"><canvas ref={relayChartRef} /></div>
                            </div>
                        )}
                    </div>

                    {/* Setpoints (só auto) */}
                    {mode === 'auto' && (
                        <>
                            <div className="dp-card">
                                <div className="dp-collapse-hd" onClick={() => setShowSP(!showSP)}>
                                    <span className="dp-card-title" style={{ marginBottom: 0 }}>Setpoints</span>
                                    <span className="dp-arrow">{showSP ? '▲' : '▼'}</span>
                                </div>
                                {showSP && (
                                    <div className="dp-collapse-body">
                                        {setpoints.map(sp => (
                                            <div key={sp.id} className="dp-sp-item">
                                                <div className="dp-sp-info">
                                                    <span className="dp-sp-name">{sp.name}</span>
                                                    <span className="dp-sp-sensor">{sp.sensor === 'temp' ? 'Temperatura' : 'Umidade'}</span>
                                                </div>
                                                <input type="number" className="dp-sp-input" defaultValue={sp.value}
                                                    onBlur={e => cmd('update_setpoint', { id: sp.id, value: parseFloat(e.target.value) })} />
                                                <button className="dp-rm" onClick={() => cmd('remove_setpoint', { id: sp.id })}>×</button>
                                            </div>
                                        ))}
                                        <div className="dp-add-form">
                                            <input placeholder="Nome" value={spName} onChange={e => setSpName(e.target.value)} />
                                            <select value={spSensor} onChange={e => setSpSensor(e.target.value)}>
                                                <option value="temp">Temp</option><option value="hum">Umid</option>
                                            </select>
                                            <input type="number" placeholder="Valor" value={spValue} onChange={e => setSpValue(e.target.value)} />
                                            <button className="dp-add-btn" onClick={() => { if (spName && spValue) { cmd('add_setpoint', { name: spName, sensor: spSensor, value: parseFloat(spValue) }); setSpName(''); setSpValue(''); } }}>+</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="dp-card">
                                <div className="dp-collapse-hd" onClick={() => setShowAct(!showAct)}>
                                    <span className="dp-card-title" style={{ marginBottom: 0 }}>Atuadores</span>
                                    <span className="dp-arrow">{showAct ? '▲' : '▼'}</span>
                                </div>
                                {showAct && (
                                    <div className="dp-collapse-body">
                                        {actions.map(a => (
                                            <div key={a.id} className="dp-sp-item">
                                                <div className="dp-sp-info">
                                                    <span className="dp-sp-name">{a.name}</span>
                                                    <span className="dp-sp-sensor">{relayNames[String(a.relay)]} | {a.condition === 'above' ? 'Acima' : 'Abaixo'} | {a.period}s</span>
                                                </div>
                                                <button className="dp-rm" onClick={() => cmd('remove_action', { id: a.id })}>×</button>
                                            </div>
                                        ))}
                                        <div className="dp-add-form">
                                            <input placeholder="Nome" value={actName} onChange={e => setActName(e.target.value)} />
                                            <select value={actRelay} onChange={e => setActRelay(e.target.value)}>
                                                <option value="1">{relayNames['1']}</option><option value="2">{relayNames['2']}</option>
                                            </select>
                                            <select value={actSP} onChange={e => setActSP(e.target.value)}>
                                                {setpoints.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                                            </select>
                                            <select value={actCond} onChange={e => setActCond(e.target.value)}>
                                                <option value="above">Acima</option><option value="below">Abaixo</option>
                                            </select>
                                            <input type="number" placeholder="Seg" value={actPeriod} onChange={e => setActPeriod(e.target.value)} style={{ width: 50 }} />
                                            <button className="dp-add-btn" onClick={() => { if (actName && actSP) { cmd('add_action', { name: actName, relay: parseInt(actRelay), setpoint_id: actSP, condition: actCond, period: parseInt(actPeriod) }); setActName(''); } }}>+</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* === CONFIG === */}
            {tab === 'config' && (
                <div className="dp-content">
                    <div className="dp-card">
                        <div className="dp-card-title">Modo de Operação</div>
                        <div className="dp-mode-btns">
                            <button className={`dp-mode-btn ${mode === 'auto' ? 'active' : ''}`} onClick={() => cmd('set_mode', 'auto')}>Auto</button>
                            <button className={`dp-mode-btn ${mode === 'manual' ? 'active' : ''}`} onClick={() => cmd('set_mode', 'manual')}>Manual</button>
                        </div>
                        <div className="dp-hint">Auto = PID controla relés | Manual = você liga/desliga</div>
                    </div>

                    <div className="dp-card">
                        <div className="dp-card-title">Nomes dos Relés</div>
                        <div className="dp-cfg-row">
                            <label>Relé 1</label>
                            <input value={r1Name || relayNames['1']} onChange={e => setR1Name(e.target.value)}
                                onBlur={e => { if (e.target.value) cmd('set_relay_name', { relay: 1, name: e.target.value }); }} />
                        </div>
                        <div className="dp-cfg-row">
                            <label>Relé 2</label>
                            <input value={r2Name || relayNames['2']} onChange={e => setR2Name(e.target.value)}
                                onBlur={e => { if (e.target.value) cmd('set_relay_name', { relay: 2, name: e.target.value }); }} />
                        </div>
                    </div>

                    {data.last_seen && (
                        <div className="dp-card">
                            <div className="dp-card-title">Informações</div>
                            <div className="dp-info-row"><span>Device ID</span><span>{deviceId}</span></div>
                            <div className="dp-info-row"><span>Última atualização</span><span>{new Date(data.last_seen).toLocaleString()}</span></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// === Funções auxiliares ===
function calcAQ(t, h) {
    let tS = 100, hS = 100;
    if (t >= 20 && t <= 25) tS = 100; else if (t < 20) tS = Math.max(0, 100 - (20 - t) * 10); else tS = Math.max(0, 100 - (t - 25) * 10);
    if (h >= 40 && h <= 60) hS = 100; else if (h < 40) hS = Math.max(0, 100 - (40 - h) * 3); else hS = Math.max(0, 100 - (h - 60) * 3);
    return Math.round(tS * 0.4 + hS * 0.6);
}
function getAQLabel(s) { if (s >= 80) return { l: 'Ótimo', c: '#00C853' }; if (s >= 60) return { l: 'Bom', c: '#66BB6A' }; if (s >= 40) return { l: 'Regular', c: '#FFEE58' }; if (s >= 20) return { l: 'Ruim', c: '#FFA726' }; return { l: 'Péssimo', c: '#FF5252' }; }

function drawGauge(canvas, score) {
    const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1;
    const cssW = 220, cssH = 130; canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    canvas.width = Math.floor(cssW * dpr); canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr);
    const cx = cssW / 2, cy = cssH - 18, r = 80, sA = Math.PI;
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.beginPath(); ctx.arc(cx, cy, r, sA, 2 * Math.PI); ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineCap = 'round'; ctx.stroke();
    const segs = [{ s: 0, e: .2, c: '#FF5252' }, { s: .2, e: .4, c: '#FFA726' }, { s: .4, e: .6, c: '#FFEE58' }, { s: .6, e: .8, c: '#66BB6A' }, { s: .8, e: 1, c: '#00C853' }];
    segs.forEach(seg => { ctx.beginPath(); ctx.arc(cx, cy, r, sA + seg.s * Math.PI, sA + seg.e * Math.PI); ctx.lineWidth = 14; ctx.strokeStyle = seg.c + '22'; ctx.lineCap = 'butt'; ctx.stroke(); });
    if (score > 0) { const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy); g.addColorStop(0, '#FF5252'); g.addColorStop(.25, '#FFA726'); g.addColorStop(.5, '#FFEE58'); g.addColorStop(.75, '#66BB6A'); g.addColorStop(1, '#00C853'); ctx.beginPath(); ctx.arc(cx, cy, r, sA, sA + (score / 100) * Math.PI); ctx.lineWidth = 14; ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.stroke(); }
    for (let i = 0; i <= 20; i++) { const a = sA + (i / 20) * Math.PI; const m = (i % 4 === 0); const tl = m ? 10 : 5; const x1 = cx + Math.cos(a) * (r - 10), y1 = cy + Math.sin(a) * (r - 10); const x2 = cx + Math.cos(a) * (r - 10 - tl), y2 = cy + Math.sin(a) * (r - 10 - tl); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineWidth = m ? 2 : 1; ctx.strokeStyle = m ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'; ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ['0', '25', '50', '75', '100'].forEach((lb, i) => { const a = sA + (i / 4) * Math.PI; ctx.fillText(lb, cx + Math.cos(a) * (r - 28), cy + Math.sin(a) * (r - 28)); });
    const na = sA + (score / 100) * Math.PI, nl = r - 5, nx = cx + Math.cos(na) * nl, ny = cy + Math.sin(na) * nl;
    const pa = na + Math.PI / 2, bw = 4;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(pa) * bw, cy + Math.sin(pa) * bw); ctx.lineTo(nx, ny); ctx.lineTo(cx - Math.cos(pa) * bw, cy - Math.sin(pa) * bw); ctx.closePath(); ctx.fillStyle = '#F0F4F2'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 2 * Math.PI); ctx.fillStyle = '#1e2823'; ctx.fill(); ctx.strokeStyle = '#F0F4F2'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI); ctx.fillStyle = '#F0F4F2'; ctx.fill();
}

function drawSensorChart(canvas, data) {
    const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.parentElement?.clientWidth || 340, cssH = 160;
    canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    canvas.width = Math.floor(cssW * dpr); canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH); if (data.length < 2) return;
    const temps = data.map(d => d.temperature).filter(v => v != null);
    const hums = data.map(d => d.humidity).filter(v => v != null);
    if (!temps.length || !hums.length) return;
    const minT = Math.min(...temps) - 2, maxT = Math.max(...temps) + 2, minH = Math.min(...hums) - 5, maxH = Math.max(...hums) + 5;
    const pad = { l: 30, r: 30, t: 10, b: 15 }, gW = cssW - pad.l - pad.r, gH = cssH - pad.t - pad.b, n = data.length, dx = gW / (n - 1);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(pad.l, pad.t, gW, gH);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) { const gy = pad.t + gH * (g / 4); ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(cssW - pad.r, gy); ctx.stroke(); }
    ctx.fillStyle = '#FF5252'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let g = 0; g <= 4; g++) ctx.fillText((maxT - (maxT - minT) * (g / 4)).toFixed(0) + '°', pad.l - 3, pad.t + gH * (g / 4));
    ctx.fillStyle = '#42A5F5'; ctx.textAlign = 'left';
    for (let g = 0; g <= 4; g++) ctx.fillText((maxH - (maxH - minH) * (g / 4)).toFixed(0) + '%', cssW - pad.r + 3, pad.t + gH * (g / 4));
    const mapT = v => pad.t + gH * (1 - (v - minT) / (maxT - minT));
    const mapH = v => pad.t + gH * (1 - (v - minH) / (maxH - minH));
    function drawL(arr, fn, col) { const pts = arr.map((v, i) => v != null ? { x: pad.l + i * dx, y: fn(v) } : null).filter(Boolean); if (pts.length < 2) return; const gr = ctx.createLinearGradient(0, pad.t, 0, pad.t + gH); gr.addColorStop(0, col + '40'); gr.addColorStop(1, col + '02'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(pts[0].x, pad.t + gH); for (let i = 0; i < pts.length; i++) { if (i === 0) ctx.lineTo(pts[i].x, pts[i].y); else { const xc = (pts[i].x + pts[i - 1].x) / 2; ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, (pts[i].y + pts[i - 1].y) / 2); } } ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); ctx.lineTo(pts[pts.length - 1].x, pad.t + gH); ctx.closePath(); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) { const xc = (pts[i].x + pts[i - 1].x) / 2; ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, (pts[i].y + pts[i - 1].y) / 2); } ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); ctx.stroke(); const last = pts[pts.length - 1]; ctx.beginPath(); ctx.arc(last.x, last.y, 3, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill(); }
    drawL(data.map(d => d.temperature), mapT, '#FF5252');
    drawL(data.map(d => d.humidity), mapH, '#42A5F5');
}

function drawRelayChart(canvas, data) {
    const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.parentElement?.clientWidth || 340, cssH = 80;
    canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    canvas.width = Math.floor(cssW * dpr); canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH); if (data.length < 2) return;
    const pad = { l: 35, r: 10, t: 8, b: 8 }, gW = cssW - pad.l - pad.r, gH = cssH - pad.t - pad.b, n = data.length, dx = gW / (n - 1);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(pad.l, pad.t, gW, gH);
    const rowH = gH / 2 - 2;
    function bars(field, top, color, label) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(label, pad.l - 3, top + rowH / 2); for (let i = 0; i < n; i++) { if (!data[i][field]) continue; const x = pad.l + i * dx, w = Math.max(dx - 1, 2); ctx.fillStyle = color; ctx.fillRect(x - w / 2, top, w, rowH); } }
    bars('relay1', pad.t, '#00C853', 'R1');
    bars('relay2', pad.t + rowH + 4, '#FFA726', 'R2');
}
