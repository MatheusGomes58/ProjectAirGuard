import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../components/firebase/firebase.jsx';
import { useLocale, LANGUAGES } from '../context/LocaleContext.jsx';
import slidePt from '../data/strings/slides/pt.json';
import slideEn from '../data/strings/slides/en.json';
import slideEs from '../data/strings/slides/es.json';
import logo from '../img/logo.png';
import '../css/slideshow.css';

// ─── MAPEAMENTO DINÂMICO DOS ARQUIVOS (VITE) ─────────────────
const slideImages = import.meta.glob('../img/slides/*.{png,jpg,jpeg,svg,PNG,JPG,JPEG}', { eager: true });
const teamImages = import.meta.glob('../img/team/*.{png,jpg,jpeg,svg,PNG,JPG,JPEG}', { eager: true });
const slideVideos = import.meta.glob(['../video/*.{mp4,webm,MP4,WEBM}', '../img/slides/*.{mp4,webm,MP4,WEBM}'], { eager: true });

const getImage = (pathOrName) => {
  if (!pathOrName) return null;
  const fileName = pathOrName.split('/').pop().toLowerCase();
  const slideEntry = Object.entries(slideImages).find(([k]) => k.toLowerCase().includes(fileName));
  if (slideEntry) return slideEntry[1].default;
  const teamEntry = Object.entries(teamImages).find(([k]) => k.toLowerCase().includes(fileName));
  if (teamEntry) return teamEntry[1].default;
  return pathOrName;
};

const getVideo = (pathOrName) => {
  if (!pathOrName) return null;
  const fileName = pathOrName.split('/').pop().toLowerCase();
  const entry = Object.entries(slideVideos).find(([k]) => k.toLowerCase().includes(fileName));
  return entry ? entry[1].default : pathOrName;
};

const slideDicts = { pt: slidePt, en: slideEn, es: slideEs };
const FS = { col: 'slides', doc: 'current' };
const PRESENTER_PASSWORD = 'eco2024';

// ─── COMPONENTES AUXILIARES DE MÍDIA ──────────────────────────
const SlideBackground = ({ background }) => {
  if (!background) return null;
  if (background.type === 'color') return <div className="sl-bg-layer" style={{ backgroundColor: background.value }} />;
  if (background.type === 'image') {
    const imgUrl = getImage(background.url);
    return <div className="sl-bg-layer sl-bg-img" style={{ backgroundImage: `url(${imgUrl})` }} />;
  }
  if (background.type === 'video') {
    const videoUrl = getVideo(background.url);
    return (
      <div className="sl-bg-layer sl-bg-video">
        <video src={videoUrl} autoPlay loop={background.loop !== false} muted={background.muted !== false} playsInline />
      </div>
    );
  }
  return null;
};

const SlideMediaElement = ({ media, className = "sl-media-content" }) => {
  if (!media) return null;
  if (media.type === 'image') return <img src={getImage(media.url)} alt="Conteúdo" className={className} />;
  if (media.type === 'video') return <video src={getVideo(media.url)} controls autoPlay={media.autoplay} playsInline className={className} />;
  return null;
};

// ─────────────────────────────────────────────────────────────
// LAYOUTS DOS SLIDES
// ─────────────────────────────────────────────────────────────
const SlideCover = ({ slide }) => (
  <div className="sl sl-cover"><SlideBackground background={slide.background} /><div className="sl-content-container"><div className="sl-cover-ring"><img src={logo} alt="EcoBreath" className="sl-cover-logo" /></div><h1 className="sl-cover-title">{slide.title}</h1>{slide.subtitle && <p className="sl-cover-sub">{slide.subtitle}</p>}<div className="sl-cover-bar" /></div></div>
);
const SlideTeam = ({ slide }) => (
  <div className="sl sl-team"><SlideBackground background={slide.background} /><div className="sl-content-container"><h2 className="sl-h2">{slide.title}</h2><div className="sl-team-grid">{slide.members?.map((m, i) => { const av = getImage(m.avatar); return (<div key={i} className="sl-team-card"><div className="sl-team-avatar">{av ? <img src={av} alt={m.name} /> : <i className={`fas ${m.icon || 'fa-user'}`} />}</div><span className="sl-team-name">{m.name}</span></div>);})}</div></div></div>
);
const SlideBullets = ({ slide }) => (
  <div className="sl sl-bullets"><SlideBackground background={slide.background} /><div className="sl-content-container">{slide.icon && <div className="sl-icon-badge"><i className={`fas ${slide.icon}`} /></div>}<h2 className="sl-h2">{slide.title}</h2><ul className="sl-bullet-list">{slide.bullets?.map((b, i) => <li key={i}><span className="sl-bullet-dot" />{b}</li>)}</ul>{slide.ods && <div className="sl-ods-container">{slide.ods.map((o, i) => <span key={i} className="sl-ods-badge">{o}</span>)}</div>}</div></div>
);
const SlideObjectives = ({ slide }) => (
  <div className="sl sl-objectives"><SlideBackground background={slide.background} /><div className="sl-content-container">{slide.icon && <div className="sl-icon-badge"><i className={`fas ${slide.icon}`} /></div>}<h2 className="sl-h2">{slide.title}</h2><div className="sl-obj-items">{slide.items?.map((item, i) => <div key={i} className="sl-obj-row"><span className="sl-obj-arrow"><i className="fas fa-arrow-right" /></span><p>{item}</p></div>)}</div></div></div>
);
const SlideTools = ({ slide }) => {
  const icon = (t) => ({ 'vs code': 'fa-code', 'firebase': 'fa-database', 'arduino ide': 'fa-microchip' }[t.toLowerCase()] || 'fa-toolbox');
  return (<div className="sl sl-tools"><SlideBackground background={slide.background} /><div className="sl-content-container"><h2 className="sl-h2">{slide.title}</h2><div className="sl-tools-row">{slide.tools?.map((t, i) => <div key={i} className="sl-tool-card"><i className={`fas ${icon(t)}`} /><span>{t}</span></div>)}</div>{slide.description && <p className="sl-tools-desc">{slide.description}</p>}</div></div>);
};
const SlideDiagram = ({ slide }) => (
  <div className="sl sl-diagram"><SlideBackground background={slide.background} /><div className="sl-content-container"><h2 className="sl-h2">{slide.title}</h2>{slide.media ? <div className="sl-diagram-media-wrapper"><SlideMediaElement media={slide.media} className="sl-diagram-img" /></div> : <div className="sl-diagram-body"><div className="sl-diagram-nodes">{slide.components?.map((c, i) => <div key={i} className="sl-diagram-node">{c}</div>)}</div></div>}</div></div>
);
const SlideMockup = ({ slide }) => (
  <div className="sl sl-mockup"><SlideBackground background={slide.background} /><div className="sl-content-container sl-mockup-split"><div className="sl-mockup-info"><div className="sl-photo-chip"><i className="fas fa-display" /> {slide.title}</div>{slide.subtitle && <h3 className="sl-mockup-subtitle">{slide.subtitle}</h3>}<ul className="sl-mockup-fields">{slide.fields?.map((f, i) => <li key={i}><i className="fas fa-check-circle" /> {f}</li>)}</ul></div><div className="sl-mockup-preview"><SlideMediaElement media={slide.media} className="sl-mockup-media" /></div></div></div>
);
const SlideHardware = ({ slide }) => (
  <div className="sl sl-hardware"><SlideBackground background={slide.background} /><div className="sl-content-container sl-hw-split"><div className="sl-hw-info"><h2 className="sl-h2">{slide.title}</h2>{slide.subtitle && <p className="sl-hw-sub">{slide.subtitle}</p>}<div className="sl-hw-grid">{(slide.components || slide.items)?.map((item, i) => <div key={i} className="sl-hw-card"><i className="fas fa-microchip" /><span>{typeof item === 'string' ? item : item.label}</span></div>)}</div></div>{slide.media && <div className="sl-hw-preview"><SlideMediaElement media={slide.media} className="sl-hw-media" /></div>}</div></div>
);
const SlideThreeCols = ({ slide }) => (
  <div className="sl sl-three-cols"><SlideBackground background={slide.background} /><div className="sl-content-container"><h2 className="sl-h2">{slide.title}</h2><div className="sl-cols-divider" /><div className="sl-cols-row">{slide.cols?.map((col, i) => <div key={i} className="sl-col-card"><div className="sl-col-icon"><i className={`fas ${col.icon}`} /></div><h3>{col.heading}</h3><ul>{col.items?.map((item, j) => <li key={j}><i className="fas fa-circle-dot" /> {item}</li>)}</ul></div>)}</div></div></div>
);
const SlideCenterWord = ({ slide }) => (
  <div className="sl sl-center-word"><SlideBackground background={slide.background} /><div className="sl-content-container"><h1 className="sl-cw-title">{slide.title}</h1></div></div>
);
const SlideStats = ({ slide }) => (
  <div className="sl sl-stats"><SlideBackground background={slide.background} /><div className="sl-content-container">{slide.icon && <div className="sl-icon-badge"><i className={`fas ${slide.icon}`} /></div>}<h2 className="sl-h2">{slide.title}</h2><div className="sl-stats-grid">{slide.stats?.map((s, i) => <div key={i} className="sl-stat-card"><span className="sl-stat-number">{s.value}</span><span className="sl-stat-label">{s.label}</span></div>)}</div>{slide.footnote && <p className="sl-stat-footnote">{slide.footnote}</p>}</div></div>
);
const SlideIconList = ({ slide }) => (
  <div className="sl sl-icon-list"><SlideBackground background={slide.background} /><div className="sl-content-container">{slide.icon && <div className="sl-icon-badge"><i className={`fas ${slide.icon}`} /></div>}<h2 className="sl-h2">{slide.title}</h2><div className="sl-ilist-grid">{slide.items?.map((item, i) => <div key={i} className="sl-ilist-card"><div className="sl-ilist-icon"><i className={`fas ${item.icon || 'fa-check'}`} /></div><div className="sl-ilist-text"><strong>{item.heading}</strong>{item.desc && <p>{item.desc}</p>}</div></div>)}</div></div></div>
);
const SlideHighlight = ({ slide }) => (
  <div className="sl sl-highlight"><SlideBackground background={slide.background} /><div className="sl-content-container">{slide.icon && <div className="sl-icon-badge"><i className={`fas ${slide.icon}`} /></div>}<h2 className="sl-hl-title">{slide.title}</h2>{slide.subtitle && <p className="sl-hl-sub">{slide.subtitle}</p>}{slide.ods && <div className="sl-ods-container">{slide.ods.map((o, i) => <span key={i} className="sl-ods-badge">{o}</span>)}</div>}</div></div>
);
const SlideBlackout = () => (<div className="sl sl-blackout" />);

const LAYOUTS = {
  'cover': SlideCover, 'team': SlideTeam, 'bullets': SlideBullets, 'objectives': SlideObjectives,
  'tools': SlideTools, 'diagram': SlideDiagram, 'mockup': SlideMockup, 'hardware': SlideHardware,
  'hardware-spec': SlideHardware, 'three-cols': SlideThreeCols, 'center-word': SlideCenterWord,
  'stats': SlideStats, 'icon-list': SlideIconList, 'highlight': SlideHighlight, 'blackout': SlideBlackout,
};


// ─────────────────────────────────────────────────────────────
// WHITEBOARD (LOUSA) — Desenho livre + texto, salvo no Firebase
// ─────────────────────────────────────────────────────────────
const Whiteboard = ({ visible, onClose, isPresenter }) => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // pen | line | eraser | text
  const [color, setColor] = useState('#10b981');
  const [lineWidth, setLineWidth] = useState(3);
  const [fontSize, setFontSize] = useState(24);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState(null);
  const textInputRef = useRef(null);
  const startPos = useRef(null);
  const snapshot = useRef(null);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Load initial image
    db.collection('whiteboard').doc('canvas').get().then(snap => {
      if (snap.exists && snap.data().image) {
        const img = new Image();
        img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0);
        img.src = snap.data().image;
      }
    });
    // Screen mode: listen for realtime updates
    if (!isPresenter) {
      const unsub = db.collection('whiteboard').doc('canvas').onSnapshot(snap => {
        if (snap.exists && snap.data().image) {
          const img = new Image();
          img.onload = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
          img.src = snap.data().image;
        }
      });
      return () => unsub();
    }
  }, [visible, isPresenter]);

  const saveToFirebase = useCallback(() => {
    if (!canvasRef.current) return;
    const image = canvasRef.current.toDataURL('image/png');
    db.collection('whiteboard').doc('canvas').set({ image, updatedAt: Date.now() });
  }, []);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const commitText = useCallback(() => {
    if (!textInput || !textPos || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.fillText(textInput, textPos.x, textPos.y);
    setTextInput('');
    setTextPos(null);
    saveToFirebase();
  }, [textInput, textPos, fontSize, color, saveToFirebase]);

  const startDraw = (e) => {
    if (tool === 'text') {
      if (textPos) commitText();
      const pos = getPos(e);
      setTextPos(pos);
      setTextInput('');
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    setDrawing(true);
    startPos.current = pos;
    if (tool === 'line') {
      snapshot.current = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    } else {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e) => {
    if (!drawing) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.strokeStyle = tool === 'eraser' ? '#000000' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'line') {
      ctx.putImageData(snapshot.current, 0, 0);
      ctx.beginPath();
      ctx.moveTo(startPos.current.x, startPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    saveToFirebase();
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    saveToFirebase();
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter') { commitText(); }
    if (e.key === 'Escape') { setTextInput(''); setTextPos(null); }
  };

  if (!visible) return null;

  return (
    <div className="sl-whiteboard-overlay">
      {isPresenter && (
        <div className="sl-wb-toolbar">
          <button className={`sl-wb-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')} title="Caneta"><i className="fas fa-pen" /></button>
          <button className={`sl-wb-btn ${tool === 'line' ? 'active' : ''}`} onClick={() => setTool('line')} title="Linha reta"><i className="fas fa-minus" /></button>
          <button className={`sl-wb-btn ${tool === 'text' ? 'active' : ''}`} onClick={() => setTool('text')} title="Texto"><i className="fas fa-font" /></button>
          <button className={`sl-wb-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Borracha"><i className="fas fa-eraser" /></button>
          <div className="sl-wb-separator" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="sl-wb-color" title="Cor" />
          {tool !== 'text' && <input type="range" min="1" max="12" value={lineWidth} onChange={(e) => setLineWidth(+e.target.value)} className="sl-wb-size" title="Espessura" />}
          {tool === 'text' && <input type="range" min="12" max="72" value={fontSize} onChange={(e) => setFontSize(+e.target.value)} className="sl-wb-size" title="Tamanho da fonte" />}
          {tool === 'text' && <span className="sl-wb-font-label">{fontSize}px</span>}
          <div className="sl-wb-separator" />
          <button className="sl-wb-btn" onClick={clearCanvas} title="Limpar tudo"><i className="fas fa-trash" /></button>
          <button className="sl-wb-btn sl-wb-close" onClick={() => { if (textPos) commitText(); onClose(); }} title="Fechar"><i className="fas fa-xmark" /></button>
        </div>
      )}
      <div className="sl-wb-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="sl-wb-canvas"
          {...(isPresenter ? { onMouseDown: startDraw, onMouseMove: draw, onMouseUp: endDraw, onMouseLeave: endDraw, onTouchStart: startDraw, onTouchMove: draw, onTouchEnd: endDraw } : {})}
          style={isPresenter ? { cursor: 'crosshair' } : { cursor: 'default' }}
        />
        {textPos && (
          <input
            ref={textInputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleTextKeyDown}
            onBlur={commitText}
            className="sl-wb-text-input"
            style={{
              left: textPos.x,
              top: textPos.y,
              fontSize: `${fontSize}px`,
              color: color,
            }}
            placeholder="Digite..."
          />
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// ANNOTATION OVERLAY — Desenhar sobre os slides (sync via Firebase)
// ─────────────────────────────────────────────────────────────
const AnnotationOverlay = ({ visible, isPresenter, slideIndex }) => {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // pen | eraser
  const [color, setColor] = useState('#ef4444');
  const penWidth = 3;
  const eraserWidth = 24;

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    db.collection('annotations').doc(`slide-${slideIndex}`).get().then(snap => {
      if (snap.exists && snap.data().image) {
        const img = new Image();
        img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0);
        img.src = snap.data().image;
      }
    });
    if (!isPresenter) {
      const unsub = db.collection('annotations').doc(`slide-${slideIndex}`).onSnapshot(snap => {
        if (snap.exists && snap.data().image) {
          const img = new Image();
          img.onload = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
          img.src = snap.data().image;
        } else {
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        }
      });
      return () => unsub();
    }
  }, [visible, slideIndex, isPresenter]);

  const saveAnnotation = useCallback(() => {
    if (!canvasRef.current || !isPresenter) return;
    const image = canvasRef.current.toDataURL('image/png');
    db.collection('annotations').doc(`slide-${slideIndex}`).set({ image, updatedAt: Date.now() });
  }, [slideIndex, isPresenter]);

  const clearAnnotation = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    db.collection('annotations').doc(`slide-${slideIndex}`).delete();
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    if (!isPresenter) return;
    setDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing || !isPresenter) return;
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserWidth;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineWidth = penWidth;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    if (canvasRef.current) canvasRef.current.getContext('2d').globalCompositeOperation = 'source-over';
    saveAnnotation();
  };

  if (!visible) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="sl-annotation-canvas"
        {...(isPresenter ? { onMouseDown: startDraw, onMouseMove: draw, onMouseUp: endDraw, onMouseLeave: endDraw, onTouchStart: startDraw, onTouchMove: draw, onTouchEnd: endDraw } : {})}
        style={{ cursor: isPresenter ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default', pointerEvents: isPresenter ? 'auto' : 'none' }}
      />
      {isPresenter && (
        <div className="sl-annot-toolbar">
          <button className={`sl-wb-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')} title="Caneta"><i className="fas fa-pen" /></button>
          <button className={`sl-wb-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Borracha"><i className="fas fa-eraser" /></button>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="sl-wb-color" title="Cor" />
          <button className="sl-wb-btn" onClick={clearAnnotation} title="Apagar tudo"><i className="fas fa-trash" /></button>
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// MODAL DE ROLE (Tela vs Apresentador)
// ─────────────────────────────────────────────────────────────
const RoleModal = ({ onSelect, onClose }) => {
  const [mode, setMode] = useState(null); // null | 'password'
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);

  const handlePresenter = () => {
    if (pwd === PRESENTER_PASSWORD) { onSelect('presenter'); }
    else { setError(true); setTimeout(() => setError(false), 1500); }
  };

  return (
    <div className="sl-modal-overlay">
      <div className="sl-modal">
        {!mode ? (
          <>
            <h3>Como deseja participar?</h3>
            <div className="sl-modal-options">
              <button onClick={() => onSelect('screen')} className="sl-modal-opt">
                <i className="fas fa-tv" />
                <span>Tela</span>
                <small>Apenas acompanha</small>
              </button>
              <button onClick={() => setMode('password')} className="sl-modal-opt">
                <i className="fas fa-wand-magic-sparkles" />
                <span>Apresentador</span>
                <small>Controla os slides</small>
              </button>
            </div>
            <button className="sl-modal-cancel" onClick={onClose}>Cancelar</button>
          </>
        ) : (
          <>
            <h3>Senha do Apresentador</h3>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePresenter()}
              placeholder="Digite a senha..."
              className={`sl-modal-input ${error ? 'error' : ''}`}
              autoFocus
            />
            <div className="sl-modal-actions">
              <button onClick={() => setMode(null)} className="sl-modal-cancel">Voltar</button>
              <button onClick={handlePresenter} className="sl-modal-confirm">Entrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
const Slideshow = () => {
  const { locale, setLocale } = useLocale();
  const slides = slideDicts[locale] || slidePt;
  const navigate = useNavigate();

  const [current, setCurrent] = useState(0);
  const [isAuth, setIsAuth] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [sync, setSync] = useState(false);
  const [role, setRole] = useState(null); // null | 'screen' | 'presenter'
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [blackout, setBlackout] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [annotating, setAnnotating] = useState(false);
  const [hiddenSlides, setHiddenSlides] = useState(new Set());
  const [showPreview, setShowPreview] = useState(true);
  const [animDir, setAnimDir] = useState('next');
  const [animKey, setAnimKey] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const syncRef = useRef(sync);
  const localeRef = useRef(locale);
  const roleRef = useRef(role);

  useEffect(() => { syncRef.current = sync; }, [sync]);
  useEffect(() => { localeRef.current = locale; }, [locale]);
  useEffect(() => { roleRef.current = role; }, [role]);

  const canControl = !sync || role === 'presenter';

  useEffect(() => auth.onAuthStateChanged((u) => setIsAuth(!!u)), []);

  // Firebase sync listener
  useEffect(() => {
    const ref = db.collection(FS.col).doc(FS.doc);
    return ref.onSnapshot((snap) => {
      if (snap.exists) {
        const data = snap.data();
        if (syncRef.current) {
          if (typeof data.index === 'number') setCurrent(data.index);
          if (data.locale && data.locale !== localeRef.current) setLocale(data.locale);
          if (data.blackout !== undefined) setBlackout(data.blackout);
          if (data.whiteboardOpen !== undefined && roleRef.current === 'screen') setShowWhiteboard(data.whiteboardOpen);
          if (data.annotating !== undefined && roleRef.current === 'screen') setAnnotating(data.annotating);
        }
      }
    });
  }, [setLocale]);

  const pushState = useCallback((updates) => {
    if (!sync || role !== 'presenter') return;
    db.collection(FS.col).doc(FS.doc).update(updates).catch(() => {
      db.collection(FS.col).doc(FS.doc).set({ index: current, locale: localeRef.current, blackout: false, ...updates }, { merge: true });
    });
  }, [sync, role, current]);

  useEffect(() => {
    if (!sync || role !== 'presenter') return;
    db.collection(FS.col).doc(FS.doc).update({ locale });
  }, [locale, sync, role]);

  // Sync whiteboard & annotation state to Firebase (presenter pushes)
  useEffect(() => {
    if (!sync || role !== 'presenter') return;
    db.collection(FS.col).doc(FS.doc).update({ whiteboardOpen: showWhiteboard }).catch(() => {});
  }, [showWhiteboard, sync, role]);

  useEffect(() => {
    if (!sync || role !== 'presenter') return;
    db.collection(FS.col).doc(FS.doc).update({ annotating }).catch(() => {});
  }, [annotating, sync, role]);

  // Encontra o próximo slide visível (pula ocultos)
  const getNextVisible = useCallback((from, dir) => {
    let idx = from + dir;
    while (idx >= 0 && idx < slides.length && hiddenSlides.has(idx)) { idx += dir; }
    return (idx >= 0 && idx < slides.length) ? idx : from;
  }, [slides.length, hiddenSlides]);

  const goTo = useCallback((next, dir) => {
    if (!canControl) return;
    setAnimDir(dir); setAnimKey((k) => k + 1); setCurrent(next);
    pushState({ index: next });
  }, [canControl, pushState]);

  const prev = useCallback(() => { const n = getNextVisible(current, -1); if (n !== current) goTo(n, 'prev'); }, [current, goTo, getNextVisible]);
  const next = useCallback(() => { const n = getNextVisible(current, 1); if (n !== current) goTo(n, 'next'); }, [current, goTo, getNextVisible]);

  useEffect(() => {
    const h = (e) => {
      if (!canControl) return;
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'b' || e.key === 'B') toggleBlackout();
      if (e.key === 'w' || e.key === 'W') setShowWhiteboard(v => !v);
      if (e.key === 'a' || e.key === 'A') setAnnotating(v => !v);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [prev, next, canControl]);

  const toggleFs = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      document.documentElement.setAttribute('data-fullscreen', 'true');
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      document.documentElement.removeAttribute('data-fullscreen');
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        document.documentElement.removeAttribute('data-fullscreen');
        setFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => { document.removeEventListener('fullscreenchange', handleFsChange); document.documentElement.removeAttribute('data-fullscreen'); };
  }, []);

  const toggleBlackout = useCallback(() => {
    if (!canControl) return;
    const next = !blackout;
    setBlackout(next);
    pushState({ blackout: next });
  }, [blackout, canControl, pushState]);

  const handleSyncToggle = () => {
    if (sync) {
      setSync(false); syncRef.current = false; setRole(null);
    } else {
      setShowRoleModal(true);
    }
  };

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole); setSync(true); syncRef.current = true; setShowRoleModal(false);
    if (selectedRole === 'presenter') {
      db.collection(FS.col).doc(FS.doc).set({ index: current, locale, blackout }, { merge: true });
    }
  };

  const toggleHideSlide = (idx) => {
    setHiddenSlides(prev => {
      const n = new Set(prev);
      if (n.has(idx)) n.delete(idx); else n.add(idx);
      return n;
    });
  };

  const slide = slides[Math.min(current, slides.length - 1)];
  const Layout = LAYOUTS[slide.layout] || SlideBullets;
  const nextSlideIdx = getNextVisible(current, 1);
  const nextSlide = nextSlideIdx !== current ? slides[nextSlideIdx] : null;
  const NextLayout = nextSlide ? (LAYOUTS[nextSlide.layout] || SlideBullets) : null;

  const [previewPos, setPreviewPos] = useState({ x: 20, y: 70 });
  const dragRef = useRef(null);

  const onPreviewDragStart = (e) => {
    const el = e.currentTarget.closest('.sl-preview-panel');
    const rect = el.getBoundingClientRect();
    dragRef.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    const onMove = (ev) => {
      setPreviewPos({ x: ev.clientX - dragRef.current.offsetX, y: ev.clientY - dragRef.current.offsetY });
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div className={`slideshow ${blackout ? 'sl-blackout-mode' : ''}`}>
      {/* Progress bar */}
      {!fullscreen && (
        <div className="sl-progress">
          <div className="sl-progress-fill" style={{ width: `${((current + 1) / slides.length) * 100}%` }} />
        </div>
      )}

      {/* Toolbar — esconde em fullscreen */}
      {!fullscreen && (
        <div className="sl-toolbar">
          <div className="sl-toolbar-l">
            <button className="sl-tbtn" onClick={() => navigate('/home')}><i className="fas fa-house" /></button>
            <span className="sl-counter">{current + 1} / {slides.length}</span>
          </div>
          <div className="sl-toolbar-r">
            {/* ── Controles exclusivos do Apresentador ── */}
            {role === 'presenter' && (
              <>
                <button className={`sl-tbtn ${showPreview ? 'sl-tbtn-active' : ''}`} onClick={() => setShowPreview(!showPreview)} title="Preview (V)"><i className="fas fa-eye" /></button>
                <button className="sl-tbtn" onClick={() => setShowWhiteboard(true)} title="Lousa (W)"><i className="fas fa-chalkboard" /></button>
                <button className={`sl-tbtn ${annotating ? 'sl-tbtn-active' : ''}`} onClick={() => setAnnotating(!annotating)} title="Anotar no slide (A)"><i className="fas fa-pen-fancy" /></button>
                <button className={`sl-tbtn ${blackout ? 'sl-tbtn-active' : ''}`} onClick={toggleBlackout} title="Tela preta (B)"><i className="fas fa-moon" /></button>
                <div className="sl-lang-wrap">
                  <button className="sl-tbtn" onClick={() => { setThemeOpen(!themeOpen); setLangOpen(false); }} title="Tema"><i className="fas fa-circle-half-stroke" /></button>
                  {themeOpen && (
                    <div className="sl-lang-dropdown">
                      {[{ id: 'auto', label: 'Auto', icon: 'fa-desktop' }, { id: 'light', label: 'Claro', icon: 'fa-sun' }, { id: 'dark', label: 'Escuro', icon: 'fa-moon' }].map(t => (
                        <button key={t.id} className={`sl-lang-opt ${(localStorage.getItem('themePref') || 'auto') === t.id ? 'active' : ''}`} onClick={() => {
                          localStorage.setItem('themePref', t.id);
                          if (t.id === 'auto') {
                            const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                            document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
                          } else {
                            document.documentElement.setAttribute('data-theme', t.id);
                          }
                          setThemeOpen(false);
                        }}><i className={`fas ${t.icon}`} style={{ width: 16 }} /> {t.label}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="sl-lang-wrap">
                  <button className="sl-tbtn" onClick={() => { setLangOpen(!langOpen); setThemeOpen(false); }} title="Idioma"><i className="fas fa-globe" /></button>
                  {langOpen && (
                    <div className="sl-lang-dropdown">
                      {LANGUAGES.map(l => <button key={l.code} className={`sl-lang-opt ${l.code === locale ? 'active' : ''}`} onClick={() => { setLocale(l.code); setLangOpen(false); }}>{l.label}</button>)}
                    </div>
                  )}
                </div>
              </>
            )}
            {/* ── Sempre visíveis ── */}
            <button className={`sl-tbtn ${sync ? 'sl-tbtn-active' : ''}`} onClick={handleSyncToggle} title={sync ? (role === 'presenter' ? 'Presenter' : 'Tela') : 'Modo Live (offline)'}>
              <i className={sync ? 'fas fa-wifi' : 'fas fa-wifi sl-icon-slashed'} />
            </button>
            <button className="sl-tbtn" onClick={toggleFs} title="Tela Cheia"><i className={`fas fa-${fullscreen ? 'compress' : 'expand'}`} /></button>
          </div>
        </div>
      )}

      {/* Slide content */}
      {!blackout && (
        <div className={`sl-wrapper sl-anim-${animDir}`} key={animKey}>
          <Layout slide={slide} />
        </div>
      )}

      {/* Nav — esconde em fullscreen */}
      {!fullscreen && (
        <div className="sl-nav">
          <button className="sl-nav-btn" onClick={prev} disabled={!canControl || current === 0}><i className="fas fa-arrow-left" /></button>
          <div className="sl-nav-dots">
            {slides.map((_, i) => (
              <span key={i} className={`sl-dot ${i === current ? 'on' : ''} ${hiddenSlides.has(i) ? 'hidden-dot' : ''}`} onClick={() => canControl && goTo(i, i > current ? 'next' : 'prev')} />
            ))}
          </div>
          <button className="sl-nav-btn" onClick={next} disabled={!canControl || current === slides.length - 1}><i className="fas fa-arrow-right" /></button>
        </div>
      )}

      {/* Presenter preview panel — draggable */}
      {role === 'presenter' && showPreview && !fullscreen && (
        <div className="sl-preview-panel" style={{ left: previewPos.x, top: previewPos.y, right: 'auto', bottom: 'auto' }}>
          <div className="sl-preview-header" onMouseDown={onPreviewDragStart}>
            <span>{nextSlide ? 'Próximo' : 'Último slide'}</span>
            <div className="sl-preview-actions">
              {nextSlide && (
                <button onClick={() => toggleHideSlide(nextSlideIdx)} title="Ocultar/mostrar próximo slide">
                  <i className={`fas fa-${hiddenSlides.has(nextSlideIdx) ? 'eye-slash' : 'eye'}`} />
                </button>
              )}
              {hiddenSlides.size > 0 && (
                <button onClick={() => setHiddenSlides(new Set())} title="Desocultar todos">
                  <i className="fas fa-rotate-left" />
                </button>
              )}
              <button onClick={() => setShowPreview(false)} title="Fechar preview">
                <i className="fas fa-xmark" />
              </button>
            </div>
          </div>
          <div className="sl-preview-content">
            {nextSlide ? <NextLayout slide={nextSlide} /> : <div className="sl-preview-empty">Fim</div>}
          </div>
        </div>
      )}

      {/* Whiteboard — presenter draws, screen sees */}
      <Whiteboard visible={showWhiteboard} onClose={() => setShowWhiteboard(false)} isPresenter={role === 'presenter'} />

      {/* Annotation overlay on slides — presenter draws, screen always shows if data exists */}
      <AnnotationOverlay visible={annotating || role === 'screen'} isPresenter={role === 'presenter'} slideIndex={current} />

      {/* Role selection modal */}
      {showRoleModal && <RoleModal onSelect={handleRoleSelect} onClose={() => setShowRoleModal(false)} />}
    </div>
  );
};

export default Slideshow;
