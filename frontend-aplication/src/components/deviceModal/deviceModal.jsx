import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/firebase.jsx';
import { Modal, Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, IconButton, Divider, Collapse, Typography } from '@mui/material';
import { WiHumidity, WiThermometer } from 'react-icons/wi';
import { MdPowerSettingsNew, MdDelete, MdExpandMore, MdExpandLess } from 'react-icons/md';
import './deviceModal.css';
import { t } from '../../utils/i18n';

const CLOUD_FUNCTION_URL = 'https://us-central1-projectairguard.cloudfunctions.net/sendCommand';

const DeviceModal = ({ open, handleClose, deviceData, editDevice }) => {
    const [humidity, setHumidity] = useState(null);
    const [temperature, setTemperature] = useState(null);
    const [relay1, setRelay1] = useState(false);
    const [relay2, setRelay2] = useState(false);
    const [lastSeen, setLastSeen] = useState('');
    const [history, setHistory] = useState([]);
    const [airQuality, setAirQuality] = useState(0);
    const [mode, setMode] = useState('manual');
    const [setpoints, setSetpoints] = useState([]);
    const [actions, setActions] = useState([]);
    const [relayNames, setRelayNames] = useState({ '1': 'Relé 1', '2': 'Relé 2' });
    // UI state
    const [showConfig, setShowConfig] = useState(false);
    const [showSP, setShowSP] = useState(false);
    const [showAct, setShowAct] = useState(false);
    // Forms
    const [newSPName, setNewSPName] = useState('');
    const [newSPSensor, setNewSPSensor] = useState('temp');
    const [newSPValue, setNewSPValue] = useState('');
    const [newActName, setNewActName] = useState('');
    const [newActRelay, setNewActRelay] = useState('1');
    const [newActSP, setNewActSP] = useState('');
    const [newActCond, setNewActCond] = useState('above');
    const [newActPeriod, setNewActPeriod] = useState('10');

    const gaugeRef = useRef(null);
    const chartRef = useRef(null);

    const deviceId = deviceData?.code || '';

    // Listener tempo real
    useEffect(() => {
        if (!deviceId) return;
        const unsub = db.collection('devices').doc(deviceId).onSnapshot(doc => {
            if (doc.exists) {
                const d = doc.data();
                setTemperature(d.temperature ?? null);
                setHumidity(d.humidity ?? null);
                setRelay1(d.relay1 || false);
                setRelay2(d.relay2 || false);
                setLastSeen(d.last_seen || '');
                setMode(d.mode || 'manual');
                setSetpoints(d.setpoints || []);
                setActions(d.actions || []);
                setRelayNames(d.relay_names || { '1': 'Relé 1', '2': 'Relé 2' });
                if (d.temperature != null && d.humidity != null) {
                    setAirQuality(calcAQ(d.temperature, d.humidity));
                }
            }
        });
        return () => unsub();
    }, [deviceId]);

    // Histórico
    useEffect(() => {
        if (!deviceId) return;
        const unsub = db.collection('devices').doc(deviceId).collection('readings')
            .orderBy('timestamp', 'desc').limit(30).onSnapshot(snap => {
                const r = []; snap.forEach(doc => r.push(doc.data()));
                setHistory(r.reverse());
            });
        return () => unsub();
    }, [deviceId]);

    useEffect(() => { if (gaugeRef.current) drawGauge(gaugeRef.current, airQuality); }, [airQuality, open]);
    useEffect(() => { if (chartRef.current && history.length > 1) drawChart(chartRef.current, history); }, [history, open]);

    // === Enviar comando ===
    async function sendCmd(type, value) {
        try {
            await fetch(CLOUD_FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: deviceId, type, value })
            });
        } catch (e) { console.error('sendCmd err:', e); }
    }

    // === Handlers ===
    function handleModeChange(newMode) { sendCmd('set_mode', newMode); }
    function handleRelayToggle(relay) {
        const current = relay === 1 ? relay1 : relay2;
        sendCmd('set_relay', { relay, state: !current });
    }
    function handleAddSP() {
        if (!newSPName || !newSPValue) return;
        sendCmd('add_setpoint', { name: newSPName, sensor: newSPSensor, value: parseFloat(newSPValue) });
        setNewSPName(''); setNewSPValue('');
    }
    function handleRemoveSP(id) { sendCmd('remove_setpoint', { id }); }
    function handleUpdateSP(id, value) { sendCmd('update_setpoint', { id, value: parseFloat(value) }); }
    function handleAddAct() {
        if (!newActName || !newActSP) return;
        sendCmd('add_action', { name: newActName, relay: parseInt(newActRelay), setpoint_id: newActSP, condition: newActCond, period: parseInt(newActPeriod) });
        setNewActName('');
    }
    function handleRemoveAct(id) { sendCmd('remove_action', { id }); }
    function handleRelayName(relay, name) { if (name) sendCmd('set_relay_name', { relay, name }); }

    // === Cálculos ===
    function calcAQ(temp, hum) {
        let tS = 100, hS = 100;
        if (temp >= 20 && temp <= 25) tS = 100; else if (temp < 20) tS = Math.max(0, 100 - (20 - temp) * 10); else tS = Math.max(0, 100 - (temp - 25) * 10);
        if (hum >= 40 && hum <= 60) hS = 100; else if (hum < 40) hS = Math.max(0, 100 - (40 - hum) * 3); else hS = Math.max(0, 100 - (hum - 60) * 3);
        return Math.round(tS * 0.4 + hS * 0.6);
    }
    function getAirLabel(s) { if (s >= 80) return { l: 'Ótimo', c: '#00C853' }; if (s >= 60) return { l: 'Bom', c: '#66BB6A' }; if (s >= 40) return { l: 'Regular', c: '#FFEE58' }; if (s >= 20) return { l: 'Ruim', c: '#FFA726' }; return { l: 'Péssimo', c: '#FF5252' }; }

    function drawGauge(canvas, score) {
        const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1;
        const cssW = 180, cssH = 105; canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
        canvas.width = Math.floor(cssW * dpr); canvas.height = Math.floor(cssH * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr);
        const cx = cssW / 2, cy = cssH - 12, r = 65, sA = Math.PI;
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.beginPath(); ctx.arc(cx, cy, r, sA, 2 * Math.PI); ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineCap = 'round'; ctx.stroke();
        const segs = [{ s: 0, e: .2, c: '#FF5252' }, { s: .2, e: .4, c: '#FFA726' }, { s: .4, e: .6, c: '#FFEE58' }, { s: .6, e: .8, c: '#66BB6A' }, { s: .8, e: 1, c: '#00C853' }];
        segs.forEach(seg => { ctx.beginPath(); ctx.arc(cx, cy, r, sA + seg.s * Math.PI, sA + seg.e * Math.PI); ctx.lineWidth = 10; ctx.strokeStyle = seg.c + '33'; ctx.lineCap = 'butt'; ctx.stroke(); });
        if (score > 0) { const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy); g.addColorStop(0, '#FF5252'); g.addColorStop(.25, '#FFA726'); g.addColorStop(.5, '#FFEE58'); g.addColorStop(.75, '#66BB6A'); g.addColorStop(1, '#00C853'); ctx.beginPath(); ctx.arc(cx, cy, r, sA, sA + (score / 100) * Math.PI); ctx.lineWidth = 10; ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.stroke(); }
        const na = sA + (score / 100) * Math.PI, nl = r - 3, nx = cx + Math.cos(na) * nl, ny = cy + Math.sin(na) * nl;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.lineWidth = 2.5; ctx.strokeStyle = '#F0F4F2'; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 2 * Math.PI); ctx.fillStyle = '#1e2823'; ctx.fill(); ctx.strokeStyle = '#F0F4F2'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    function drawChart(canvas, data) {
        const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.parentElement?.clientWidth || 300, cssH = 120;
        canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
        canvas.width = Math.floor(cssW * dpr); canvas.height = Math.floor(cssH * dpr);
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, cssW, cssH); if (data.length < 2) return;
        const temps = data.map(d => d.temperature).filter(v => v != null);
        const hums = data.map(d => d.humidity).filter(v => v != null);
        if (!temps.length || !hums.length) return;
        const minT = Math.min(...temps) - 2, maxT = Math.max(...temps) + 2, minH = Math.min(...hums) - 5, maxH = Math.max(...hums) + 5;
        const pad = { l: 28, r: 28, t: 8, b: 12 }, gW = cssW - pad.l - pad.r, gH = cssH - pad.t - pad.b, n = data.length, dx = gW / (n - 1);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
        for (let g = 0; g <= 3; g++) { const gy = pad.t + gH * (g / 3); ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(cssW - pad.r, gy); ctx.stroke(); }
        const mapT = v => pad.t + gH * (1 - (v - minT) / (maxT - minT));
        const mapH = v => pad.t + gH * (1 - (v - minH) / (maxH - minH));
        function drawL(arr, fn, col) { const pts = arr.map((v, i) => v != null ? { x: pad.l + i * dx, y: fn(v) } : null).filter(Boolean); if (pts.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) { const xc = (pts[i].x + pts[i - 1].x) / 2; ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, (pts[i].y + pts[i - 1].y) / 2); } ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); ctx.stroke(); }
        drawL(data.map(d => d.temperature), mapT, '#FF5252');
        drawL(data.map(d => d.humidity), mapH, '#42A5F5');
    }

    const { l: airLabel, c: airColor } = getAirLabel(airQuality);

    return (
        <Modal open={open} onClose={handleClose}>
            <Box className="modalBox" sx={{ maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginBottom: 12 }}>{deviceData?.name || 'Dispositivo'}</h2>

                {/* Gauge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                    <canvas ref={gaugeRef} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -6 }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{airQuality}%</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 16, background: airColor + '22', color: airColor }}>{airLabel}</span>
                    </div>
                </div>

                {/* Sensores */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <WiThermometer size={28} style={{ color: '#FF5252' }} />
                        <div><div style={{ fontSize: '0.6rem', color: '#8A9A92' }}>Temp</div><div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{temperature != null ? `${temperature.toFixed(1)}°C` : '--'}</div></div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <WiHumidity size={28} style={{ color: '#42A5F5' }} />
                        <div><div style={{ fontSize: '0.6rem', color: '#8A9A92' }}>Umid</div><div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{humidity != null ? `${humidity.toFixed(1)}%` : '--'}</div></div>
                    </div>
                </div>

                {/* Relés */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[1, 2].map(r => {
                        const on = r === 1 ? relay1 : relay2;
                        return (
                            <div key={r} onClick={() => mode === 'manual' && handleRelayToggle(r)}
                                style={{ flex: 1, padding: 10, borderRadius: 12, background: on ? 'rgba(0,200,83,0.12)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${on ? 'rgba(0,200,83,0.3)' : 'rgba(255,255,255,0.08)'}`, textAlign: 'center', cursor: mode === 'manual' ? 'pointer' : 'default' }}>
                                <MdPowerSettingsNew size={18} style={{ color: on ? '#00C853' : '#8A9A92' }} />
                                <div style={{ fontSize: '0.6rem', color: '#8A9A92' }}>{relayNames[String(r)]}</div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: on ? '#00C853' : '#8A9A92' }}>{on ? 'ON' : 'OFF'}</div>
                            </div>
                        );
                    })}
                </div>
                {mode === 'manual' && <div style={{ fontSize: '0.6rem', color: '#8A9A92', textAlign: 'center', marginBottom: 8 }}>Toque nos relés para ligar/desligar</div>}

                {/* Gráfico */}
                {history.length > 1 && (
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ background: 'rgba(0,0,0,0.12)', borderRadius: 10, padding: 4 }}><canvas ref={chartRef} /></div>
                    </div>
                )}

                {/* Modo */}
                <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Typography variant="caption" sx={{ color: '#8A9A92' }}>Modo</Typography>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <Button size="small" variant={mode === 'auto' ? 'contained' : 'outlined'} onClick={() => handleModeChange('auto')} sx={{ fontSize: '0.65rem', minWidth: 50 }}>Auto</Button>
                        <Button size="small" variant={mode === 'manual' ? 'contained' : 'outlined'} onClick={() => handleModeChange('manual')} sx={{ fontSize: '0.65rem', minWidth: 50 }}>Manual</Button>
                    </div>
                </div>

                {/* Config colapsável */}
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => setShowConfig(!showConfig)}>
                    <Typography variant="caption" sx={{ color: '#8A9A92', textTransform: 'uppercase' }}>Configurações</Typography>
                    {showConfig ? <MdExpandLess /> : <MdExpandMore />}
                </div>
                <Collapse in={showConfig}>
                    {/* Nomes relés */}
                    <div style={{ marginTop: 8 }}>
                        {[1, 2].map(r => (
                            <TextField key={r} size="small" fullWidth label={`Nome Relé ${r}`} defaultValue={relayNames[String(r)]}
                                onBlur={e => handleRelayName(r, e.target.value)} sx={{ mb: 1 }} />
                        ))}
                    </div>

                    {/* Setpoints (só em auto) */}
                    {mode === 'auto' && (
                        <>
                            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }} onClick={() => setShowSP(!showSP)}>
                                <Typography variant="caption" sx={{ color: '#8A9A92' }}>Setpoints</Typography>
                                {showSP ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
                            </div>
                            <Collapse in={showSP}>
                                {setpoints.map(sp => (
                                    <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <div style={{ flex: 1 }}><div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{sp.name}</div><div style={{ fontSize: '0.6rem', color: '#8A9A92' }}>{sp.sensor === 'temp' ? 'Temp' : 'Umid'}</div></div>
                                        <TextField size="small" type="number" defaultValue={sp.value} sx={{ width: 70 }} onBlur={e => handleUpdateSP(sp.id, e.target.value)} />
                                        <IconButton size="small" onClick={() => handleRemoveSP(sp.id)}><MdDelete color="#FF5252" /></IconButton>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                    <TextField size="small" placeholder="Nome" value={newSPName} onChange={e => setNewSPName(e.target.value)} sx={{ flex: 1, minWidth: 80 }} />
                                    <Select size="small" value={newSPSensor} onChange={e => setNewSPSensor(e.target.value)} sx={{ width: 90 }}>
                                        <MenuItem value="temp">Temp</MenuItem><MenuItem value="hum">Umid</MenuItem>
                                    </Select>
                                    <TextField size="small" type="number" placeholder="Valor" value={newSPValue} onChange={e => setNewSPValue(e.target.value)} sx={{ width: 60 }} />
                                    <Button size="small" variant="contained" onClick={handleAddSP}>+</Button>
                                </div>
                            </Collapse>

                            {/* Ações */}
                            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }} onClick={() => setShowAct(!showAct)}>
                                <Typography variant="caption" sx={{ color: '#8A9A92' }}>Ações</Typography>
                                {showAct ? <MdExpandLess size={16} /> : <MdExpandMore size={16} />}
                            </div>
                            <Collapse in={showAct}>
                                {actions.map(a => (
                                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <div style={{ flex: 1 }}><div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: '0.6rem', color: '#8A9A92' }}>{relayNames[String(a.relay)]} | {a.condition === 'above' ? 'Acima' : 'Abaixo'} | {a.period}s</div></div>
                                        <IconButton size="small" onClick={() => handleRemoveAct(a.id)}><MdDelete color="#FF5252" /></IconButton>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                    <TextField size="small" placeholder="Nome" value={newActName} onChange={e => setNewActName(e.target.value)} sx={{ flex: 1, minWidth: 80 }} />
                                    <Select size="small" value={newActRelay} onChange={e => setNewActRelay(e.target.value)} sx={{ width: 70 }}>
                                        <MenuItem value="1">{relayNames['1']}</MenuItem><MenuItem value="2">{relayNames['2']}</MenuItem>
                                    </Select>
                                    <Select size="small" value={newActSP} onChange={e => setNewActSP(e.target.value)} sx={{ width: 90 }}>
                                        {setpoints.map(sp => <MenuItem key={sp.id} value={sp.id}>{sp.name}</MenuItem>)}
                                    </Select>
                                    <Select size="small" value={newActCond} onChange={e => setNewActCond(e.target.value)} sx={{ width: 80 }}>
                                        <MenuItem value="above">Acima</MenuItem><MenuItem value="below">Abaixo</MenuItem>
                                    </Select>
                                    <TextField size="small" type="number" placeholder="Seg" value={newActPeriod} onChange={e => setNewActPeriod(e.target.value)} sx={{ width: 50 }} />
                                    <Button size="small" variant="contained" onClick={handleAddAct}>+</Button>
                                </div>
                            </Collapse>
                        </>
                    )}
                </Collapse>

                {lastSeen && <div style={{ fontSize: '0.55rem', color: '#8A9A92', textAlign: 'center', marginTop: 8 }}>Atualizado: {new Date(lastSeen).toLocaleString()}</div>}

                <Box className="modalActions">
                    <Button variant="contained" color="primary" onClick={handleClose}>{t('close')}</Button>
                    <Button variant="contained" color="primary" onClick={editDevice}>{t('edit')}</Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default DeviceModal;
