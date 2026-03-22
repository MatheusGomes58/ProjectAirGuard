import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../components/firebase/firebase.jsx';
import { useLocale } from '../context/LocaleContext.jsx';
import slidePt from '../data/strings/slides/pt.json';
import slideEn from '../data/strings/slides/en.json';
import slideEs from '../data/strings/slides/es.json';
import logo from '../img/logo.png';
import '../css/slideshow.css';

const slideImages = import.meta.glob('../img/slides/*.png', { eager: true });
const getImage = (name) => {
  if (!name) return null;
  const entry = Object.entries(slideImages).find(([k]) => k.includes(name));
  return entry ? entry[1].default : null;
};

const slideDicts = { pt: slidePt, en: slideEn, es: slideEs };
const FS = { col: 'slides', doc: 'current' };

// ─── accent always green ──────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// COVER — logo + big title (like slide 1)
// ─────────────────────────────────────────────────────────────
const SlideCover = ({ slide }) => (
  <div className="sl sl-cover">
    <div className="sl-cover-ring">
      <img src={logo} alt="EcoBreath" className="sl-cover-logo" />
    </div>
    <h1 className="sl-cover-title">{slide.title}</h1>
    {slide.subtitle && <p className="sl-cover-sub">{slide.subtitle}</p>}
    <div className="sl-cover-bar" />
  </div>
);

// ─────────────────────────────────────────────────────────────
// TEAM — photo grid (like slide 2)
// ─────────────────────────────────────────────────────────────
const SlideTeam = ({ slide }) => (
  <div className="sl sl-team">
    <h2 className="sl-h2">{slide.title}</h2>
    <div className="sl-team-grid">
      {slide.members?.map((m, i) => (
        <div key={i} className="sl-team-card">
          <div className="sl-team-avatar">
            {m.photo
              ? <img src={m.photo} alt={m.name} />
              : <i className={`fas ${m.icon || 'fa-user'}`} />}
          </div>
          <span className="sl-team-name">{m.name}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// BULLETS — icon + title + bullet list (like slide 3 / 11)
// ─────────────────────────────────────────────────────────────
const SlideBullets = ({ slide }) => (
  <div className="sl sl-bullets">
    {slide.icon && (
      <div className="sl-icon-badge">
        <i className={`fas ${slide.icon}`} />
      </div>
    )}
    <h2 className="sl-h2">{slide.title}</h2>
    <ul className="sl-bullet-list">
      {slide.bullets?.map((b, i) => (
        <li key={i}>
          <span className="sl-bullet-dot" />
          {b}
        </li>
      ))}
    </ul>
  </div>
);

// ─────────────────────────────────────────────────────────────
// OBJECTIVES — icon + title + arrow items (like slide 4)
// ─────────────────────────────────────────────────────────────
const SlideObjectives = ({ slide }) => (
  <div className="sl sl-objectives">
    {slide.icon && (
      <div className="sl-icon-badge">
        <i className={`fas ${slide.icon}`} />
      </div>
    )}
    <h2 className="sl-h2">{slide.title}</h2>
    <div className="sl-obj-items">
      {slide.items?.map((item, i) => (
        <div key={i} className="sl-obj-row">
          <span className="sl-obj-arrow"><i className="fas fa-arrow-right" /></span>
          <p>{item}</p>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// TOOLS — 3 tool cards + description (like slide 5)
// ─────────────────────────────────────────────────────────────
const SlideTools = ({ slide }) => (
  <div className="sl sl-tools">
    <h2 className="sl-h2">{slide.title}</h2>
    <div className="sl-tools-row">
      {slide.tools?.map((t, i) => (
        <div key={i} className="sl-tool-card">
          <i className={`fas ${t.icon}`} />
          <span>{t.label}</span>
        </div>
      ))}
    </div>
    {slide.description && <p className="sl-tools-desc">{slide.description}</p>}
  </div>
);

// ─────────────────────────────────────────────────────────────
// DIAGRAM — hub + satellite nodes (like slides 6 / 9)
// ─────────────────────────────────────────────────────────────
const SlideDiagram = ({ slide }) => (
  <div className="sl sl-diagram">
    <h2 className="sl-h2 sl-h2-top">{slide.title}</h2>
    <div className="sl-diagram-body">
      <div className="sl-diagram-center">
        <i className="fas fa-fire" />
        <span>{slide.center}</span>
      </div>
      <div className="sl-diagram-nodes">
        {slide.nodes?.map((n, i) => (
          <div key={i} className="sl-diagram-node" style={{ borderColor: n.color + '60', color: n.color }}>
            {n.label}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// HARDWARE — component cards with label + description (slide 11)
// ─────────────────────────────────────────────────────────────
const SlideHardware = ({ slide }) => (
  <div className="sl sl-hardware">
    <h2 className="sl-h2">{slide.title}</h2>
    <div className="sl-hw-grid">
      {slide.items?.map((item, i) => (
        <div key={i} className="sl-hw-card">
          <i className="fas fa-microchip" />
          <div>
            <strong>{item.label}</strong>
            <p>{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// PHOTO-TITLE — full-bleed app screenshot + overlay title (slides 7/8/10)
// ─────────────────────────────────────────────────────────────
const SlidePhotoTitle = ({ slide }) => {
  const img = getImage(slide.image);
  return (
    <div className="sl sl-photo">
      {img && <img src={img} alt={slide.title} className="sl-photo-bg" />}
      <div className="sl-photo-overlay" />
      <div className="sl-photo-content">
        <div className="sl-photo-chip"><i className="fas fa-display" /> EcoBreath WEB</div>
        <h2 className="sl-photo-title">{slide.title}</h2>
        {slide.subtitle && <p className="sl-photo-sub">{slide.subtitle}</p>}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// THREE-COLS — conclusion slide (slide 12)
// ─────────────────────────────────────────────────────────────
const SlideThreeCols = ({ slide }) => (
  <div className="sl sl-three-cols">
    <h2 className="sl-h2 sl-h2-top">{slide.title}</h2>
    <div className="sl-cols-divider" />
    <div className="sl-cols-row">
      {slide.cols?.map((col, i) => (
        <div key={i} className="sl-col-card">
          <div className="sl-col-icon"><i className={`fas ${col.icon}`} /></div>
          <h3>{col.heading}</h3>
          <ul>
            {col.items?.map((item, j) => (
              <li key={j}><i className="fas fa-circle-dot" />{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// CENTER-WORD — simple word centered (slides 13/14)
// ─────────────────────────────────────────────────────────────
const SlideCenterWord = ({ slide }) => (
  <div className="sl sl-center-word">
    <div className="sl-cw-bg" />
    <h1 className="sl-cw-title">{slide.title}</h1>
  </div>
);

// ─────────────────────────────────────────────────────────────
const LAYOUTS = {
  cover: SlideCover,
  team: SlideTeam,
  bullets: SlideBullets,
  objectives: SlideObjectives,
  tools: SlideTools,
  diagram: SlideDiagram,
  hardware: SlideHardware,
  'photo-title': SlidePhotoTitle,
  'three-cols': SlideThreeCols,
  'center-word': SlideCenterWord,
};

// ─────────────────────────────────────────────────────────────
// Main Slideshow
// ─────────────────────────────────────────────────────────────
const Slideshow = () => {
  const { locale, setLocale } = useLocale();
  const slides = slideDicts[locale] || slidePt;
  const navigate = useNavigate();

  const [current, setCurrent] = useState(0);
  const [isAuth, setIsAuth] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [sync, setSync] = useState(false);
  const [animDir, setAnimDir] = useState('next');
  const [animKey, setAnimKey] = useState(0);

  const syncRef = useRef(sync);
  const localeRef = useRef(locale);

  useEffect(() => { syncRef.current = sync; }, [sync]);
  useEffect(() => { localeRef.current = locale; }, [locale]);

  useEffect(() => auth.onAuthStateChanged((u) => setIsAuth(!!u)), []);

  // Listen to Firestore
  useEffect(() => {
    const ref = db.collection(FS.col).doc(FS.doc);
    return ref.onSnapshot((snap) => {
      if (snap.exists) {
        const data = snap.data();

        // Index and Locale only sync if sync toggle is ON
        if (syncRef.current) {
          if (typeof data.index === 'number') setCurrent(data.index);
          if (data.locale && data.locale !== localeRef.current) {
            setLocale(data.locale);
          }
        }
      }
    });
  }, [setLocale]);

  // Push index changes
  const pushIndex = useCallback((idx) => {
    if (!isAuth || !sync) return;
    db.collection(FS.col).doc(FS.doc).update({ index: idx }).catch(() => {
      // If doc doesn't exist, set it
      db.collection(FS.col).doc(FS.doc).set({ index: idx, locale: localeRef.current }, { merge: true });
    });
  }, [isAuth, sync]);

  // Push locale changes
  useEffect(() => {
    if (!isAuth || !sync) return;
    db.collection(FS.col).doc(FS.doc).update({ locale });
  }, [locale, isAuth, sync]);

  const goTo = useCallback((next, dir) => {
    setAnimDir(dir); setAnimKey((k) => k + 1); setCurrent(next);
    pushIndex(next);
  }, [pushIndex]);

  const prev = useCallback(() => { if (current > 0) goTo(current - 1, 'prev'); }, [current, goTo]);
  const next = useCallback(() => { if (current < slides.length - 1) goTo(current + 1, 'next'); }, [current, slides.length, goTo]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [prev, next]);

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

  // Cleanup attribute on unmount or escape key
  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        document.documentElement.removeAttribute('data-fullscreen');
        setFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.documentElement.removeAttribute('data-fullscreen');
    };
  }, []);

  const toggleSync = () => {
    const n = !sync; setSync(n); syncRef.current = n;
    if (n && isAuth) db.collection(FS.col).doc(FS.doc).set({ index: current, locale });
  };

  const slide = slides[Math.min(current, slides.length - 1)];
  const Layout = LAYOUTS[slide.layout] || SlideBullets;

  return (
    <div className="slideshow">
      {/* toolbar */}
      <div className="sl-toolbar">
        <button className="sl-tbtn" onClick={() => navigate('/home')}><i className="fas fa-house" /></button>
        <div className="sl-toolbar-r">
          {isAuth && (
            <button className={`sl-sync ${sync ? 'on' : ''}`} onClick={toggleSync}>
              <i className={`fas fa-${sync ? 'wifi' : 'wifi-slash'}`} />
              <span>{sync ? 'Sync on' : 'Local'}</span>
            </button>
          )}
          {/* Theme is now handled by the global ThemeManager FAB */}
          <button className="sl-tbtn" onClick={toggleFs} title={fullscreen ? 'Sair' : 'Tela Cheia'}>
            <i className={`fas fa-${fullscreen ? 'compress' : 'expand'}`} />
          </button>
        </div>
      </div>

      {/* slide */}
      <div className={`sl-wrapper sl-anim-${animDir}`} key={animKey}>
        <Layout slide={slide} />
      </div>

      {/* nav */}
      <div className="sl-nav">
        <button className="sl-nav-btn" onClick={prev} disabled={current === 0}><i className="fas fa-arrow-left" /></button>
        <div className="sl-nav-dots">
          {slides.map((_, i) => <span key={i} className={`sl-dot ${i === current ? 'on' : ''}`} />)}
        </div>
        <button className="sl-nav-btn" onClick={next} disabled={current === slides.length - 1}><i className="fas fa-arrow-right" /></button>
      </div>
    </div>
  );
};

export default Slideshow;
