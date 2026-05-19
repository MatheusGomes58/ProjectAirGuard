import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSun, FiMoon, FiEdit2, FiPlay, FiChevronLeft, FiChevronRight, FiMaximize, FiMinimize, FiX, FiLogOut } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  getPresentation,
  createLiveSession,
  updateCurrentSlide,
  endLiveSession,
  subscribeLiveSession,
  updateSessionTheme,
} from '../services/presentationService';
import { useTheme } from '../contexts/ThemeContext.jsx';
import styles from './LivePresenter.module.css';

export default function LivePresenter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [presentation, setPresentation] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [session, setSession] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [started, setStarted] = useState(false);
  const [pointer, setPointer] = useState(null);
  const [drawing, setDrawing] = useState([]);
  const [blackScreen, setBlackScreen] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [wbStrokes, setWbStrokes] = useState([]);
  const [wbTexts, setWbTexts] = useState([]);

  const audioRef = useRef(null);
  const isLight = theme === 'light';

  useEffect(() => {
    if (id) init(id);
  }, [id]);

  // Listen for fullscreen changes
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  async function init(presentationId) {
    try {
      const data = await getPresentation(presentationId);
      if (!data) {
        toast.error('Apresentação não encontrada');
        navigate('/');
        return;
      }
      setPresentation(data);

      const liveSession = await createLiveSession(presentationId);
      setSession(liveSession);

      // Subscribe to session changes
      subscribeLiveSession(liveSession.code, (sessionData) => {
        if (sessionData) {
          setCurrentSlide(sessionData.currentSlide);
          setPointer(sessionData.pointer || null);
          setDrawing(sessionData.drawing || []);
          setBlackScreen(!!sessionData.blackScreen);
          setShowWhiteboard(!!sessionData.showWhiteboard);
          setWbStrokes(sessionData.whiteboard || []);
          setWbTexts(sessionData.whiteboardTexts || []);

          // Sync theme from remote
          if (sessionData.theme && sessionData.theme !== theme) {
            if (sessionData.theme === 'light' && theme === 'dark') toggleTheme();
            if (sessionData.theme === 'dark' && theme === 'light') toggleTheme();
          }

          // When remote control starts the session
          if (sessionData.started && !started) {
            setStarted(true);
            enterFullscreen();
          }
        } else {
          // Session was deleted (ended from remote)
          toast('Sessão encerrada');
          if (document.fullscreenElement) document.exitFullscreen();
          navigate('/');
        }
      });
    } catch (error) {
      toast.error('Erro ao iniciar apresentação');
      console.error(error);
    }
  }

  function enterFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  // Auto-play audio when slide changes
  useEffect(() => {
    if (!presentation || !started) return;
    const slide = presentation.slides[currentSlide];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (slide?.audio) {
      const audio = new Audio(slide.audio);
      audio.play().catch(() => {});
      audioRef.current = audio;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentSlide, started, presentation]);

  const goToSlide = useCallback(
    async (index) => {
      if (!presentation || !session) return;
      const newIndex = Math.max(0, Math.min(presentation.slides.length - 1, index));
      setCurrentSlide(newIndex);
      await updateCurrentSlide(session.code, newIndex);
    },
    [presentation, session]
  );

  const nextSlide = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const prevSlide = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (!started && e.key === 'Enter') {
        setStarted(true);
        enterFullscreen();
        return;
      }
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSlide();
          break;
        case 'Escape':
          if (isFullscreen) document.exitFullscreen();
          else handleExit();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 't':
        case 'T':
          handleToggleTheme();
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, started, isFullscreen]);

  // Touch swipe
  useEffect(() => {
    if (!started) return;
    let touchStartX = 0;
    function handleTouchStart(e) { touchStartX = e.touches[0].clientX; }
    function handleTouchEnd(e) {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) nextSlide();
        else prevSlide();
      }
    }
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [nextSlide, prevSlide, started]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }

  async function handleToggleTheme() {
    toggleTheme();
    if (session) {
      await updateSessionTheme(session.code, theme === 'dark' ? 'light' : 'dark');
    }
  }

  function handleStartPresentation() {
    setStarted(true);
    enterFullscreen();
  }

  async function handleExit() {
    if (session) await endLiveSession(session.code);
    if (document.fullscreenElement) document.exitFullscreen();
    navigate('/');
  }

  function handleBackToEditor() {
    if (session) endLiveSession(session.code);
    if (document.fullscreenElement) document.exitFullscreen();
    navigate(`/editor/${id}`);
  }

  if (!presentation) {
    return <div className={styles.loading}>Carregando apresentação...</div>;
  }

  const remoteUrl = (() => {
    const { protocol, hostname, port } = window.location;
    const host = port ? `${hostname}:${port}` : hostname;
    return `${protocol}//${host}/remote/${session?.code || ''}`;
  })();

  const slide = presentation.slides[currentSlide];

  // Color utilities
  function lightenColor(hex, factor) {
    if (!hex || !hex.startsWith('#')) return hex;
    try {
      const num = parseInt(hex.slice(1), 16);
      const r = Math.min(255, Math.round(((num >> 16) & 0xff) + (255 - ((num >> 16) & 0xff)) * factor));
      const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * factor));
      const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * factor));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    } catch { return hex; }
  }

  function darkenColor(hex, factor) {
    if (!hex || !hex.startsWith('#')) return hex;
    try {
      const num = parseInt(hex.slice(1), 16);
      const r = Math.round(((num >> 16) & 0xff) * (1 - factor));
      const g = Math.round(((num >> 8) & 0xff) * (1 - factor));
      const b = Math.round((num & 0xff) * (1 - factor));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    } catch { return hex; }
  }

  function getTextColor(originalColor) {
    if (!isLight) return originalColor;
    if (!originalColor) return '#1a1a2e';
    const hex = originalColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (luminance > 0.6) return darkenColor(originalColor, 0.8);
    }
    return originalColor;
  }

  function getSlideBackgroundStyle(bg) {
    if (bg.type === 'image') {
      return { backgroundImage: `url(${bg.value})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
    }
    if (bg.type === 'gradient') {
      const val = isLight ? lightenColor(bg.value, 0.6) : bg.value;
      const sec = isLight ? lightenColor(bg.secondaryValue, 0.6) : bg.secondaryValue;
      return { background: `linear-gradient(${bg.gradientDirection || '135deg'}, ${val}, ${sec})` };
    }
    return { background: isLight ? lightenColor(bg.value, 0.7) : bg.value };
  }

  function renderElement(element) {
    const baseStyle = {
      position: 'absolute',
      left: `${element.x}%`, top: `${element.y}%`,
      width: `${element.width}%`, height: `${element.height}%`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    };

    switch (element.type) {
      case 'title':
      case 'text':
        return (
          <div key={element.id} style={baseStyle}>
            <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center',
              justifyContent: element.style.textAlign === 'center' ? 'center' : element.style.textAlign === 'right' ? 'flex-end' : 'flex-start',
              fontSize: element.style.fontSize, fontWeight: element.style.fontWeight,
              color: getTextColor(element.style.color), textAlign: element.style.textAlign,
              fontFamily: presentation.theme.fontFamily, padding: '8px', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
            }}>
              {element.content}
            </div>
          </div>
        );
      case 'image':
        return (<div key={element.id} style={baseStyle}>{element.content && <img src={element.content} alt="" style={{ width: '100%', height: '100%', objectFit: element.style.objectFit || 'cover', borderRadius: element.style.borderRadius }} />}</div>);
      case 'video':
        return (<div key={element.id} style={baseStyle}>{element.content && <video src={element.content} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: element.style.borderRadius }} autoPlay muted loop />}</div>);
      case 'iframe':
        return (<div key={element.id} style={baseStyle}>{element.content && <iframe src={element.content} style={{ width: '100%', height: '100%', border: 'none', borderRadius: element.style.borderRadius }} title="Embed" allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups" />}</div>);
      case 'table': {
        try {
          const tableData = JSON.parse(element.content);
          return (
            <div key={element.id} style={baseStyle}>
              <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', color: getTextColor(element.style.color), fontSize: element.style.fontSize }}>
                <tbody>{tableData.data.map((row, ri) => (<tr key={ri}>{row.map((cell, ci) => (<td key={ci} style={{ border: element.style.border, padding: '8px 12px', textAlign: 'center', fontWeight: ri === 0 ? '600' : '400' }}>{cell}</td>))}</tr>))}</tbody>
              </table>
            </div>
          );
        } catch { return null; }
      }
      case 'shape': {
        const shapeBg = isLight ? lightenColor(element.style.backgroundColor, 0.3) : element.style.backgroundColor;
        return (<div key={element.id} style={baseStyle}><div style={{ width: '100%', height: '100%', backgroundColor: shapeBg, borderRadius: element.style.borderRadius, opacity: element.style.opacity, border: element.style.border }} /></div>);
      }
      default: return null;
    }
  }

  // ===== WAITING SCREEN =====
  if (!started) {
    return (
      <div className={`${styles.waitingScreen} ${isLight ? styles.waitingLight : ''}`}>
        <div className={styles.waitingContent}>
          <h1 className={styles.waitingTitle}>{presentation.title}</h1>
          <p className={styles.waitingSubtitle}>Conecte seu dispositivo para controlar a apresentação</p>
          <div className={styles.qrSection}>
            <div className={styles.qrCard}>
              <QRCodeSVG value={remoteUrl} size={180} bgColor="transparent" fgColor={isLight ? '#1a1a2e' : '#ffffff'} level="M" />
            </div>
            <div className={styles.codeSection}>
              <span className={styles.codeLabel}>Código da sessão</span>
              <span className={styles.codeValue}>{session?.code || '...'}</span>
              <span className={styles.codeHint}>ou escaneie o QR Code</span>
            </div>
          </div>
          <div className={styles.waitingActions}>
            <button onClick={handleStartPresentation} className={styles.startBtn}><FiPlay size={18} /> Iniciar Apresentação</button>
            <p className={styles.startHint}>Ou pressione Enter - Também inicia pelo controle remoto</p>
          </div>
          <div className={styles.waitingFooter}>
            <button onClick={handleBackToEditor} className={styles.footerBtn}><FiEdit2 size={14} /> Voltar ao Editor</button>
            <button onClick={handleToggleTheme} className={styles.footerBtn}>{isLight ? <FiMoon size={14} /> : <FiSun size={14} />} Tema</button>
            <button onClick={handleExit} className={styles.footerBtnDanger}><FiLogOut size={14} /> Sair</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== PRESENTATION MODE =====
  return (
    <div className={`${styles.container} ${isLight ? styles.containerLight : ''}`}>
      {/* Black screen overlay */}
      {blackScreen && <div className={styles.blackScreenOverlay} />}

      {/* Whiteboard overlay */}
      {showWhiteboard && (
        <div className={styles.whiteboardOverlay}>
          {wbTexts.map((t, i) => (
            <div key={i} style={{ position: 'absolute', left: `${t.x}%`, top: `${t.y}%`, color: t.color, fontSize: '2rem', fontWeight: '700', pointerEvents: 'none' }}>{t.text}</div>
          ))}
          <svg className={styles.drawingOverlay} viewBox="0 0 100 100" preserveAspectRatio="none">
            {wbStrokes.map((stroke, i) => (
              <polyline key={i} points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={stroke.color || '#ef4444'} strokeWidth={stroke.width || 0.4} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>
        </div>
      )}

      <div className={styles.slideDisplay} style={getSlideBackgroundStyle(slide.background)}>
        {isLight && slide.background.type === 'image' && <div className={styles.lightOverlay} />}
        {slide.elements.map(renderElement)}

        {/* Pointer from remote */}
        {pointer && (
          <div className={styles.pointer} style={{ left: `${pointer.x}%`, top: `${pointer.y}%` }} />
        )}

        {/* Drawing from remote */}
        {drawing && drawing.length > 0 && (
          <svg className={styles.drawingOverlay} viewBox="0 0 100 100" preserveAspectRatio="none">
            {drawing.map((stroke, i) => (
              <polyline
                key={i}
                points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={stroke.color || '#ef4444'}
                strokeWidth={stroke.width || 0.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        )}
      </div>

      {/* Controls */}
      <div className={`${styles.controls} ${isLight ? styles.controlsLight : ''}`}>
        <div className={styles.leftControls}>
          <button onClick={handleExit} className={styles.exitBtn}><FiLogOut size={14} /> Sair</button>
          <button onClick={handleBackToEditor} className={styles.editorBtn}><FiEdit2 size={14} /> <span className={styles.btnLabel}>Editor</span></button>
        </div>
        <div className={styles.navControls}>
          <button onClick={prevSlide} disabled={currentSlide === 0} className={styles.navBtn}><FiChevronLeft size={20} /></button>
          <span className={styles.slideCounter}>{currentSlide + 1} / {presentation.slides.length}</span>
          <button onClick={nextSlide} disabled={currentSlide === presentation.slides.length - 1} className={styles.navBtn}><FiChevronRight size={20} /></button>
        </div>
        <div className={styles.rightControls}>
          <button onClick={handleToggleTheme} className={styles.themeBtn} title="Tema (T)">{isLight ? <FiMoon size={16} /> : <FiSun size={16} />}</button>
          <button onClick={toggleFullscreen} className={styles.fullscreenBtn}>{isFullscreen ? <FiMinimize size={16} /> : <FiMaximize size={16} />} <span className={styles.btnLabel}>Tela Cheia</span></button>
        </div>
      </div>
    </div>
  );
}
