import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiSun, FiMoon, FiEdit3, FiTrash2, FiXCircle, FiMaximize2, FiMinimize2,
  FiSkipBack, FiHash, FiSquare, FiX, FiMousePointer, FiMinus, FiMessageSquare,
  FiClock, FiLayout, FiType, FiFileText,
} from 'react-icons/fi';
import {
  subscribeLiveSession, updateCurrentSlide, getPresentation, startSession,
  endLiveSession, updateSessionTheme, updateSessionPointer, updateSessionDrawing,
  clearSessionDrawing, updateSessionBlackScreen, updateSessionNotes,
  updateSessionWhiteboard, updateSessionWhiteboardText, updateSessionShowWhiteboard,
} from '../services/presentationService';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './RemoteControl.module.css';

const STORAGE_KEY = 'sp-last-session-code';

export default function RemoteControl() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [inputCode, setInputCode] = useState('');
  const [session, setSession] = useState(null);
  const [presentation, setPresentation] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [allStrokes, setAllStrokes] = useState([]);
  const [showEndModal, setShowEndModal] = useState(false);
  const [blackScreen, setBlackScreen] = useState(false);
  const [goToInput, setGoToInput] = useState('');
  const [showGoTo, setShowGoTo] = useState(false);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawWidth, setDrawWidth] = useState(0.4);
  const [rulerMode, setRulerMode] = useState(false);
  const [rulerStart, setRulerStart] = useState(null);
  // Notes
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  // Whiteboard
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [wbStrokes, setWbStrokes] = useState([]);
  const [wbCurrentStroke, setWbCurrentStroke] = useState([]);
  const [wbIsDrawing, setWbIsDrawing] = useState(false);
  const [wbTexts, setWbTexts] = useState([]);
  const [wbTextInput, setWbTextInput] = useState('');
  const [wbAddingText, setWbAddingText] = useState(false);
  // Timer
  const [timerStart, setTimerStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  // Script view
  const [showScript, setShowScript] = useState(false);

  const drawCanvasRef = useRef(null);
  const wbCanvasRef = useRef(null);
  const wbWrapperRef = useRef(null);
  const canvasWrapperRef = useRef(null);
  const unsubRef = useRef(null);

  // Timer
  useEffect(() => {
    if (!sessionStarted) return;
    if (!timerStart) setTimerStart(Date.now());
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (timerStart || Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStarted, timerStart]);

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // Connection
  useEffect(() => {
    const savedCode = localStorage.getItem(STORAGE_KEY);
    if (code) attemptConnect(code);
    else if (savedCode) attemptConnect(savedCode);
  }, [code]);

  function attemptConnect(sessionCode) {
    setConnecting(true);
    const normalizedCode = sessionCode.trim().toUpperCase();
    if (unsubRef.current) unsubRef.current();

    const unsub = subscribeLiveSession(normalizedCode, async (sessionData) => {
      if (sessionData && sessionData.isActive) {
        setSession(sessionData);
        setCurrentSlide(sessionData.currentSlide);
        setConnected(true);
        setConnecting(false);
        setSessionStarted(!!sessionData.started);
        if (sessionData.drawing) setAllStrokes(sessionData.drawing);
        if (sessionData.blackScreen !== undefined) setBlackScreen(sessionData.blackScreen);
        if (sessionData.notes !== undefined) setNotes(sessionData.notes);
        if (sessionData.whiteboard) setWbStrokes(sessionData.whiteboard);
        if (sessionData.whiteboardTexts) setWbTexts(sessionData.whiteboardTexts);
        if (sessionData.showWhiteboard !== undefined) setShowWhiteboard(sessionData.showWhiteboard);

        if (sessionData.theme && sessionData.theme !== theme) {
          if (sessionData.theme === 'light' && theme === 'dark') toggleTheme();
          if (sessionData.theme === 'dark' && theme === 'light') toggleTheme();
        }
        localStorage.setItem(STORAGE_KEY, normalizedCode);
        if (!presentation) {
          const presData = await getPresentation(sessionData.presentationId);
          if (presData) setPresentation(presData);
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
        if (connected) toast.error('Sessão encerrada');
        setConnected(false); setConnecting(false); setSession(null); setPresentation(null);
      }
    });
    unsubRef.current = unsub;
  }

  function handleConnect() {
    if (inputCode.trim().length >= 4) {
      const c = inputCode.trim().toUpperCase();
      navigate(`/remote/${c}`, { replace: true });
      attemptConnect(c);
    } else toast.error('Digite um código válido');
  }

  async function goNext() { if (!session || !presentation) return; await updateCurrentSlide(session.code, Math.min(presentation.slides.length - 1, currentSlide + 1)); }
  async function goPrev() { if (!session) return; await updateCurrentSlide(session.code, Math.max(0, currentSlide - 1)); }
  async function goToSlide(index) { if (!session) return; await updateCurrentSlide(session.code, index); }
  async function goToFirst() { await goToSlide(0); }

  async function handleGoToSlide() {
    const num = parseInt(goToInput);
    if (!num || num < 1 || num > (presentation?.slides?.length || 0)) { toast.error('Número inválido'); return; }
    await goToSlide(num - 1); setShowGoTo(false); setGoToInput('');
  }

  async function handleStartSession() { if (!session) return; await startSession(session.code); setSessionStarted(true); setTimerStart(Date.now()); }
  async function handleToggleTheme() { toggleTheme(); if (session) await updateSessionTheme(session.code, theme === 'dark' ? 'light' : 'dark'); }
  async function handleToggleBlackScreen() { if (!session) return; await updateSessionBlackScreen(session.code, !blackScreen); setBlackScreen(!blackScreen); }

  async function handleEndSession() {
    if (!session) return;
    localStorage.removeItem(STORAGE_KEY);
    await endLiveSession(session.code);
    setShowEndModal(false); setConnected(false); setSession(null); setPresentation(null);
    navigate('/remote', { replace: true });
  }

  // Notes
  async function handleSaveNotes() {
    if (!session) return;
    await updateSessionNotes(session.code, notes);
    toast.success('Notas salvas');
  }

  // Whiteboard toggle
  async function handleToggleWhiteboard() {
    if (!session) return;
    const newVal = !showWhiteboard;
    setShowWhiteboard(newVal);
    await updateSessionShowWhiteboard(session.code, newVal);
  }

  // Canvas fullscreen
  function toggleCanvasFullscreen() {
    const el = canvasWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { el.requestFullscreen().catch(() => {}); setCanvasFullscreen(true); }
    else { document.exitFullscreen(); setCanvasFullscreen(false); }
  }

  useEffect(() => {
    function handleFsChange() { setCanvasFullscreen(!!document.fullscreenElement); }
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Drawing on slide
  function getRelativePos(e, ref) {
    const rect = (ref || drawCanvasRef.current)?.getBoundingClientRect();
    if (!rect) return null;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 100 };
  }

  function handleDrawStart(e) {
    if (!drawMode) { const pos = getRelativePos(e); if (pos && session) updateSessionPointer(session.code, pos); return; }
    e.preventDefault();
    const pos = getRelativePos(e);
    if (!pos) return;
    if (rulerMode) { setRulerStart(pos); setCurrentStroke([pos, pos]); }
    else setCurrentStroke([pos]);
    setIsDrawing(true);
  }

  function handleDrawMove(e) {
    const pos = getRelativePos(e);
    if (!pos) return;
    if (!drawMode) { if (session) updateSessionPointer(session.code, pos); return; }
    if (!isDrawing) return;
    e.preventDefault();
    if (rulerMode && rulerStart) setCurrentStroke([rulerStart, pos]);
    else setCurrentStroke((prev) => [...prev, pos]);
  }

  const handleDrawEnd = useCallback(async () => {
    if (!drawMode || !isDrawing) { if (session) updateSessionPointer(session.code, null); return; }
    setIsDrawing(false); setRulerStart(null);
    if (currentStroke.length >= 2 && session) {
      const newStroke = { points: currentStroke, color: drawColor, width: drawWidth };
      const newStrokes = [...allStrokes, newStroke];
      setAllStrokes(newStrokes);
      await updateSessionDrawing(session.code, newStrokes);
    }
    setCurrentStroke([]);
  }, [drawMode, isDrawing, currentStroke, allStrokes, session, drawColor, drawWidth]);

  async function handleClearDrawing() { if (!session) return; setAllStrokes([]); await clearSessionDrawing(session.code); }

  // Whiteboard drawing
  function handleWbDrawStart(e) {
    if (wbAddingText) return;
    e.preventDefault();
    const pos = getRelativePos(e, wbCanvasRef.current);
    if (pos) { setWbCurrentStroke([pos]); setWbIsDrawing(true); }
  }

  function handleWbDrawMove(e) {
    if (!wbIsDrawing || wbAddingText) return;
    e.preventDefault();
    const pos = getRelativePos(e, wbCanvasRef.current);
    if (pos) {
      if (rulerMode && wbCurrentStroke.length > 0) setWbCurrentStroke([wbCurrentStroke[0], pos]);
      else setWbCurrentStroke((prev) => [...prev, pos]);
    }
  }

  const handleWbDrawEnd = useCallback(async () => {
    if (!wbIsDrawing) return;
    setWbIsDrawing(false);
    if (wbCurrentStroke.length >= 2 && session) {
      const newStroke = { points: wbCurrentStroke, color: drawColor, width: drawWidth };
      const newStrokes = [...wbStrokes, newStroke];
      setWbStrokes(newStrokes);
      await updateSessionWhiteboard(session.code, newStrokes);
    }
    setWbCurrentStroke([]);
  }, [wbIsDrawing, wbCurrentStroke, wbStrokes, session, drawColor, drawWidth]);

  async function handleWbClear() {
    if (!session) return;
    setWbStrokes([]); setWbTexts([]);
    await updateSessionWhiteboard(session.code, []);
    await updateSessionWhiteboardText(session.code, []);
  }

  async function handleWbAddText() {
    if (!wbTextInput.trim() || !session) return;
    const newTexts = [...wbTexts, { text: wbTextInput.trim(), x: 10, y: 10 + wbTexts.length * 8, color: drawColor }];
    setWbTexts(newTexts);
    await updateSessionWhiteboardText(session.code, newTexts);
    setWbTextInput(''); setWbAddingText(false);
  }

  // ===== NOT CONNECTED =====
  if (!connected) {
    return (
      <div className={styles.connectScreen}>
        <div className={styles.connectCard}>
          <button onClick={handleToggleTheme} className={styles.themeToggle}>
            {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
          </button>
          <h1 className={styles.connectTitle}>Controle Remoto</h1>
          {connecting ? (
            <p className={styles.connectDesc}>Reconectando...</p>
          ) : (
            <>
              <p className={styles.connectDesc}>Digite o código exibido na tela da apresentação</p>
              <input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO" maxLength={6} className={styles.codeInput}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()} autoFocus />
              <button onClick={handleConnect} className={styles.connectBtn}>Conectar</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const totalSlides = presentation?.slides?.length || 0;
  const currentSlideData = presentation?.slides?.[currentSlide];
  const nextSlideData = presentation?.slides?.[currentSlide + 1];

  function getSlideBackground(bg) {
    if (!bg) return '#1a1a2e';
    if (bg.type === 'gradient') return `linear-gradient(${bg.gradientDirection || '135deg'}, ${bg.value}, ${bg.secondaryValue})`;
    if (bg.type === 'image') return `url(${bg.value}) center/cover no-repeat`;
    return bg.value;
  }

  // ===== CONNECTED =====
  return (
    <div className={styles.container}>
      {/* Header with timer */}
      <header className={styles.header}>
        <h2 className={styles.title}>{presentation?.title || 'Apresentação'}</h2>
        <div className={styles.headerRight}>
          {sessionStarted && (
            <span className={styles.timer}><FiClock size={12} /> {formatTime(elapsed)}</span>
          )}
          <span className={styles.badge}>{currentSlide + 1} / {totalSlides}</span>
          <button onClick={handleToggleTheme} className={styles.themeToggleSmall}>
            {theme === 'dark' ? <FiSun size={14} /> : <FiMoon size={14} />}
          </button>
        </div>
      </header>

      {!sessionStarted && (
        <button onClick={handleStartSession} className={styles.startPresentationBtn}>Iniciar Apresentação</button>
      )}

      {/* === SCRIPT FULLSCREEN VIEW === */}
      {showScript ? (
        <>
          <div className={styles.scriptFullView}>
            <div className={styles.scriptFullHeader}>
              <h3>Roteiro</h3>
              <button onClick={() => setShowScript(false)} className={styles.scriptCloseBtn}><FiX size={16} /></button>
            </div>
            {presentation?.script && presentation.script.length > 0 ? (
              <div className={styles.scriptFullList}>
                {presentation.script.map((item) => (
                  <div key={item.id} className={item.type === 'title' ? styles.scriptTitle : styles.scriptSection}>
                    {item.type === 'title' ? (
                      <>
                        <h3 className={styles.scriptTitleText}>{item.title}</h3>
                        {item.subtitle && <p className={styles.scriptSubtitle}>{item.subtitle}</p>}
                      </>
                    ) : (
                      <button
                        className={styles.scriptSectionBtn}
                        onClick={() => {
                          if (item.slideRef !== null && item.slideRef !== undefined) {
                            goToSlide(item.slideRef);
                          }
                        }}
                      >
                        <span className={styles.scriptSectionName}>{item.title}</span>
                        {item.slideRef !== null && item.slideRef !== undefined && (
                          <span className={styles.scriptSlideRef}>Slide {item.slideRef + 1}</span>
                        )}
                        {item.content && <p className={styles.scriptContent}>{item.content}</p>}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.scriptEmpty}>Nenhum roteiro definido. Crie um no editor.</p>
            )}
          </div>

          {/* Navigation stays visible */}
          <div className={styles.controls}>
            <button onClick={goPrev} disabled={currentSlide === 0} className={styles.controlBtn}><FiSkipBack size={16} /></button>
            <button onClick={goNext} disabled={currentSlide >= totalSlides - 1} className={styles.controlBtnNext}>Próximo</button>
          </div>
        </>
      ) : (
        <>
          {/* Slide preview with drawing */}
          <div className={styles.previewSection} ref={canvasWrapperRef}>
        <div className={styles.previewHeader}>
          <label className={styles.previewLabel}>Slide Atual</label>
          <div className={styles.drawTools}>
            <button onClick={() => { setDrawMode(false); }} className={`${styles.drawToggle} ${!drawMode ? styles.drawToggleActive : ''}`} title="Ponteiro"><FiMousePointer size={14} /></button>
            <button onClick={() => { setDrawMode(true); setRulerMode(false); }} className={`${styles.drawToggle} ${drawMode && !rulerMode ? styles.drawToggleActive : ''}`} title="Desenho livre"><FiEdit3 size={14} /></button>
            <button onClick={() => { setDrawMode(true); setRulerMode(!rulerMode); }} className={`${styles.drawToggle} ${rulerMode ? styles.drawToggleActive : ''}`} title="Régua"><FiMinus size={14} /></button>
            {allStrokes.length > 0 && <button onClick={handleClearDrawing} className={styles.clearDrawBtn} title="Limpar"><FiTrash2 size={14} /></button>}
            <button onClick={toggleCanvasFullscreen} className={styles.drawToggle} title="Expandir">{canvasFullscreen ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}</button>
          </div>
        </div>

        {drawMode && (
          <div className={styles.drawSettings}>
            <div className={styles.colorPicker}>
              {['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a78bfa', '#ffffff', '#000000'].map((c) => (
                <button key={c} className={`${styles.colorDot} ${drawColor === c ? styles.colorDotActive : ''}`} style={{ background: c }} onClick={() => setDrawColor(c)} />
              ))}
              <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className={styles.colorCustom} title="Cor personalizada" />
            </div>
            <div className={styles.widthPicker}>
              {[0.2, 0.4, 0.8, 1.2].map((w) => (
                <button key={w} className={`${styles.widthBtn} ${drawWidth === w ? styles.widthBtnActive : ''}`} onClick={() => setDrawWidth(w)}>
                  <span className={styles.widthLine} style={{ height: `${Math.max(2, w * 4)}px`, background: drawColor }} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={drawCanvasRef} className={`${styles.slidePreview} ${canvasFullscreen ? styles.slidePreviewFullscreen : ''}`}
          style={{ background: getSlideBackground(currentSlideData?.background) }}
          onMouseDown={handleDrawStart} onMouseMove={handleDrawMove} onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd}
          onTouchStart={handleDrawStart} onTouchMove={handleDrawMove} onTouchEnd={handleDrawEnd}>
          {currentSlideData?.elements?.map((el) => {
            if (el.type === 'title' || el.type === 'text') {
              return (<div key={el.id} style={{ position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, fontSize: `${Math.max(8, (el.style.fontSize || 16) * (canvasFullscreen ? 0.5 : 0.3))}px`, fontWeight: el.style.fontWeight, color: el.style.color, textAlign: el.style.textAlign, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', pointerEvents: 'none', whiteSpace: 'pre-wrap' }}>{el.content}</div>);
            }
            if (el.type === 'image' && el.content) {
              return (<div key={el.id} style={{ position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, overflow: 'hidden', pointerEvents: 'none' }}><img src={el.content} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: el.style.borderRadius }} /></div>);
            }
            return null;
          })}
          <svg className={styles.drawOverlay} viewBox="0 0 100 100" preserveAspectRatio="none">
            {allStrokes.map((stroke, i) => (<polyline key={i} points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={stroke.color || '#ef4444'} strokeWidth={stroke.width || 0.4} strokeLinecap="round" strokeLinejoin="round" />))}
            {currentStroke.length > 1 && (<polyline points={currentStroke.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={drawColor} strokeWidth={drawWidth} strokeLinecap="round" strokeLinejoin="round" />)}
          </svg>
        </div>
      </div>

      {/* Next slide */}
      {nextSlideData && !canvasFullscreen && (
        <div className={styles.previewSection}>
          <label className={styles.previewLabel}>Próximo Slide</label>
          <div className={styles.slidePreviewSmall} style={{ background: getSlideBackground(nextSlideData?.background) }}>
            {nextSlideData?.elements?.map((el) => {
              if (el.type === 'title' || el.type === 'text') return (<div key={el.id} style={{ position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, fontSize: `${Math.max(6, (el.style.fontSize || 16) * 0.2)}px`, fontWeight: el.style.fontWeight, color: el.style.color, textAlign: el.style.textAlign, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{el.content}</div>);
              return null;
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className={styles.controls}>
        <button onClick={goPrev} disabled={currentSlide === 0} className={styles.controlBtn}><FiSkipBack size={16} /></button>
        <button onClick={goNext} disabled={currentSlide >= totalSlides - 1} className={styles.controlBtnNext}>Próximo</button>
      </div>

      {/* Extra controls */}
      <div className={styles.extraControls}>
        <button onClick={goToFirst} className={styles.extraBtn} title="Primeiro slide"><FiSkipBack size={12} /> Início</button>
        <button onClick={() => setShowGoTo(true)} className={styles.extraBtn} title="Ir para slide"><FiHash size={12} /> Ir para</button>
        <button onClick={handleToggleBlackScreen} className={`${styles.extraBtn} ${blackScreen ? styles.extraBtnActive : ''}`}><FiSquare size={12} /> {blackScreen ? 'Mostrar' : 'Tela Preta'}</button>
        <button onClick={handleToggleWhiteboard} className={`${styles.extraBtn} ${showWhiteboard ? styles.extraBtnActive : ''}`}><FiLayout size={12} /> Lousa</button>
        <button onClick={() => setShowScript(!showScript)} className={`${styles.extraBtn} ${showScript ? styles.extraBtnActive : ''}`}><FiFileText size={12} /> Roteiro</button>
      </div>

      {showGoTo && (
        <div className={styles.goToRow}>
          <input type="number" value={goToInput} onChange={(e) => setGoToInput(e.target.value)} placeholder={`1 - ${totalSlides}`} min={1} max={totalSlides} className={styles.goToInput} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleGoToSlide()} />
          <button onClick={handleGoToSlide} className={styles.goToBtn}>Ir</button>
          <button onClick={() => { setShowGoTo(false); setGoToInput(''); }} className={styles.goToCancelBtn}><FiX size={14} /></button>
        </div>
      )}

      {/* Whiteboard */}
      {showWhiteboard && (
        <div className={styles.whiteboardSection} ref={wbWrapperRef}>
          <div className={styles.previewHeader}>
            <label className={styles.previewLabel}>Lousa</label>
            <div className={styles.drawTools}>
              <button onClick={() => { setRulerMode(false); }} className={`${styles.drawToggle} ${!rulerMode ? styles.drawToggleActive : ''}`} title="Desenho livre"><FiEdit3 size={14} /></button>
              <button onClick={() => { setRulerMode(!rulerMode); }} className={`${styles.drawToggle} ${rulerMode ? styles.drawToggleActive : ''}`} title="Régua"><FiMinus size={14} /></button>
              {wbAddingText ? (
                <button onClick={() => setWbAddingText(false)} className={styles.clearDrawBtn}><FiX size={14} /></button>
              ) : (
                <button onClick={() => setWbAddingText(true)} className={styles.drawToggle} title="Adicionar texto"><FiType size={14} /></button>
              )}
              <button onClick={handleWbClear} className={styles.clearDrawBtn} title="Limpar lousa"><FiTrash2 size={14} /></button>
              <button onClick={() => {
                const el = wbWrapperRef.current;
                if (!el) return;
                if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
                else document.exitFullscreen();
              }} className={styles.drawToggle} title="Tela cheia">
                {document.fullscreenElement ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
              </button>
            </div>
          </div>
          <div className={styles.drawSettings}>
            <div className={styles.colorPicker}>
              {['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a78bfa', '#ffffff', '#000000'].map((c) => (
                <button key={c} className={`${styles.colorDot} ${drawColor === c ? styles.colorDotActive : ''}`} style={{ background: c }} onClick={() => setDrawColor(c)} />
              ))}
              <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className={styles.colorCustom} />
            </div>
            <div className={styles.widthPicker}>
              {[0.2, 0.4, 0.8, 1.2].map((w) => (
                <button key={w} className={`${styles.widthBtn} ${drawWidth === w ? styles.widthBtnActive : ''}`} onClick={() => setDrawWidth(w)}>
                  <span className={styles.widthLine} style={{ height: `${Math.max(2, w * 4)}px`, background: drawColor }} />
                </button>
              ))}
            </div>
          </div>
          {wbAddingText && (
            <div className={styles.wbTextRow}>
              <input type="text" value={wbTextInput} onChange={(e) => setWbTextInput(e.target.value)} placeholder="Digite o texto..." className={styles.wbTextInput} onKeyDown={(e) => e.key === 'Enter' && handleWbAddText()} autoFocus />
              <button onClick={handleWbAddText} className={styles.goToBtn}>Adicionar</button>
            </div>
          )}
          <div ref={wbCanvasRef} className={styles.whiteboardCanvas}
            onMouseDown={handleWbDrawStart} onMouseMove={handleWbDrawMove} onMouseUp={handleWbDrawEnd} onMouseLeave={handleWbDrawEnd}
            onTouchStart={handleWbDrawStart} onTouchMove={handleWbDrawMove} onTouchEnd={handleWbDrawEnd}>
            {wbTexts.map((t, i) => (
              <div key={i} style={{ position: 'absolute', left: `${t.x}%`, top: `${t.y}%`, color: t.color, fontSize: '14px', fontWeight: '600', pointerEvents: 'none' }}>{t.text}</div>
            ))}
            <svg className={styles.drawOverlay} viewBox="0 0 100 100" preserveAspectRatio="none">
              {wbStrokes.map((stroke, i) => (<polyline key={i} points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={stroke.color || '#ef4444'} strokeWidth={stroke.width || 0.4} strokeLinecap="round" strokeLinejoin="round" />))}
              {wbCurrentStroke.length > 1 && (<polyline points={wbCurrentStroke.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={drawColor} strokeWidth={drawWidth} strokeLinecap="round" strokeLinejoin="round" />)}
            </svg>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className={styles.notesSection}>
        <button onClick={() => setShowNotes(!showNotes)} className={styles.notesToggle}>
          <FiMessageSquare size={14} /> Notas {showNotes ? '(ocultar)' : '(mostrar)'}
        </button>
        {showNotes && (
          <div className={styles.notesArea}>
            {currentSlideData?.notes && (
              <div className={styles.slideNotes}>
                <label className={styles.previewLabel}>Notas do Slide (editor)</label>
                <div className={styles.slideNotesContent}>{currentSlideData.notes}</div>
              </div>
            )}
            <label className={styles.previewLabel}>Notas da sessão</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações para esta apresentação..." className={styles.notesTextarea} rows={3} />
            <button onClick={handleSaveNotes} className={styles.notesSaveBtn}>Salvar notas</button>
          </div>
        )}
      </div>

      {/* Dots */}
      <div className={styles.dots}>
        {presentation?.slides?.map((_, index) => (
          <button key={index} className={`${styles.dot} ${index === currentSlide ? styles.dotActive : ''}`} onClick={() => goToSlide(index)} />
        ))}
      </div>
        </>
      )}

      {/* End session */}
      <button onClick={() => setShowEndModal(true)} className={styles.endSessionBtn}><FiXCircle size={16} /> Encerrar Apresentação</button>

      {showEndModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEndModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Encerrar Apresentação?</h3>
            <p>Isso vai encerrar a sessão live e desconectar todos os dispositivos.</p>
            <div className={styles.modalActions}>
              <button onClick={() => setShowEndModal(false)} className={styles.modalCancel}>Cancelar</button>
              <button onClick={handleEndSession} className={styles.modalConfirm}>Encerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
