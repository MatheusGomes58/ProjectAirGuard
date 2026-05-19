import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSun, FiMoon, FiHome, FiMaximize, FiMinimize, FiWifi, FiWifiOff, FiChevronLeft, FiChevronRight, FiGlobe } from 'react-icons/fi';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useLocale } from '../contexts/LocaleContext.jsx';
import slidePt from '../data/slides/pt.json';
import slideEn from '../data/slides/en.json';
import slideEs from '../data/slides/es.json';
import styles from './StaticPresenter.module.css';

const slideDicts = { pt: slidePt, en: slideEn, es: slideEs };
const FS = { col: 'slides', doc: 'current' };

// ─── Slide image loader (placeholder for now) ───
const slideImages = import.meta.glob('../assets/slides/*.png', { eager: true });
const getImage = (name) => {
  if (!name) return null;
  const entry = Object.entries(slideImages).find(([k]) => k.includes(name));
  return entry ? entry[1].default : null;
};

// ─────────────────────────────────────────────────────────────
// LAYOUT COMPONENTS
// ─────────────────────────────────────────────────────────────

const SlideCover = ({ slide }) => (
  <div className={`${styles.sl} ${styles.slCover}`}>
    <div className={styles.slCoverRing}>
      <i className="fas fa-leaf" />
    </div>
    <h1 className={styles.slCoverTitle}>{slide.title}</h1>
    {slide.subtitle && <p className={styles.slCoverSub}>{slide.subtitle}</p>}
    <div className={styles.slCoverBar} />
  </div>
);

const SlideTeam = ({ slide }) => (
  <div className={`${styles.sl} ${styles.slTeam}`}>
    <h2 className={styles.slH2}>{slide.title}</h2>
    <div className={styles.slTeamGrid}>
      {slide.members?.map((m, i) => (
        <div key={i} className={styles.slTeamCard}>
          <div className={styles.slTeamAvatar}>
            <i className={`fas ${m.icon || 'fa-user'}`} />
          </div>
          <span className={styles.slTeamName}>{m.name}</span>
        </div>
      ))}
    </div>
  </div>
);

const SlideBullets = ({ slide }) => (
  <div className={`${styles.sl} ${styles.slBullets}`}>
    {slide.icon && (
      <div className={styles.slIconBadge}>
        <i className={`fas ${slide.icon}`} />
      </div>
    )}
    <h2 className={styles.slH2}>{slide.title}</h2>
    <ul className={styles.slBulletList}>
      {slide.bullets?.map((b, i) => (
        <li key={i}>
          <span className={styles.slBulletDot} />
          {b}
        </li>
      ))}
    </ul>
  </div>
);

const SlideObjectives = ({ slide }) => (
  <div className={`${styles.sl} ${styles.slObjectives}`}>
    {slide.icon && (
      <div className={styles.slIconBadge}>
        <i className={`fas ${slide.icon}`} />
      </div>
    )}
    <h2 className={styles.slH2}>{slide.title}</h2>
    <div className={styles.slObjItems}>
      {slide.items?.map((item, i) => (
        <div key={i} className={styles.slObjRow}>
          <span className={styles.slObjArrow}><i className="fas fa-arrow-right" /></span>
          <p>{item}</p>
        </div>
      ))}
    </div>
  </div>
);

const SlideTools = ({ slide }) => (
  <div className={`${styles.sl} ${styles.slTools}`}>
    <h2 className={styles.slH2}>{slide.title}</h2>
    <div className={styles.slToolsRow}>
      {slide.tools?.map((t, i) => (
        <div key={i} className={styles.slToolCard}>
          <i className={`fas ${t.icon}`} />
          <span>{t.label}</span>
        </div>
      ))}
    </div>
    {slide.description && <p className={styles.slToolsDesc}>{slide.description}</p>}
  </div>
);

const SlideDiagram = ({ slide }) => (
  <div className={`${styles.sl} ${styles.slDiagram}`}>
    <h2 className={`${styles.slH2} ${styles.slH2Top}`}>{slide.title}</h2>
    <div className={styles.slDiagramBody}>
      <div className={styles.slDiagramCenter}>
        <i className="fas fa-fire" />
        <span>{slide.center}</span>
      </div>
      <div className={styles.slDiagramNodes}>
        {slide.nodes?.map((n, i) => (
          <div key={i} className={styles.slDiagramNode} style={{ borderColor: n.color + '60', color: n.color }}>
            {n.label}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SlideHardware = ({ slide }) => (
  <div className={`${styles.sl} ${styles.slHardware}`}>
    <h2 className={styles.slH2}>{slide.title}</h2>
    <div className={styles.slHwGrid}>
      {slide.items?.map((item, i) => (
        <div key={i} className={styles.slHwCard}>
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

const SlidePhotoTitle = ({ slide }) => {
  const img = getImage(slide.image);
  return (
    <div className={`${styles.sl} ${styles.slPhoto}`}>
      {img && <img src={img} alt={slide.title} className={styles.slPhotoBg} />}
      <div className={styles.slPhotoOverlay} />
      <div className={styles.slPhotoContent}>
        <div className={styles.slPhotoChip}><i className="fas fa-display" /> EcoBreath WEB</div>
        <h2 className={styles.slPhotoTitle}>{slide.title}</h2>
        {slide.subtitle && <p className={styles.slPhotoSub}>{slide.subtitle}</p>}
      </div>
    </div>
  );
};

const SlideThreeCols = ({ slide }) => (
  <div className={`${styles.sl} ${styles.slThreeCols}`}>
    <h2 className={`${styles.slH2} ${styles.slH2Top}`}>{slide.title}</h2>
    <div className={styles.slColsDivider} />
    <div className={styles.slColsRow}>
      {slide.cols?.map((col, i) => (
        <div key={i} className={styles.slColCard}>
          <div className={styles.slColIcon}><i className={`fas ${col.icon}`} /></div>
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

const SlideCenterWord = ({ slide }) => (
  <div className={`${styles.sl} ${styles.slCenterWord}`}>
    <div className={styles.slCwBg} />
    <h1 className={styles.slCwTitle}>{slide.title}</h1>
  </div>
);

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
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function StaticPresenter() {
  const { locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const slides = slideDicts[locale] || slidePt;
  const navigate = useNavigate();

  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [sync, setSync] = useState(false);
  const [animDir, setAnimDir] = useState('next');
  const [animKey, setAnimKey] = useState(0);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const syncRef = useRef(sync);
  const localeRef = useRef(locale);

  useEffect(() => { syncRef.current = sync; }, [sync]);
  useEffect(() => { localeRef.current = locale; }, [locale]);

  // Listen to Firestore for sync
  useEffect(() => {
    const ref = doc(db, FS.col, FS.doc);
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
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
    if (!sync) return;
    const ref = doc(db, FS.col, FS.doc);
    updateDoc(ref, { index: idx }).catch(() => {
      setDoc(ref, { index: idx, locale: localeRef.current }, { merge: true });
    });
  }, [sync]);

  // Push locale changes
  useEffect(() => {
    if (!sync) return;
    const ref = doc(db, FS.col, FS.doc);
    updateDoc(ref, { locale }).catch(() => {});
  }, [locale, sync]);

  const goTo = useCallback((next, dir) => {
    setAnimDir(dir);
    setAnimKey((k) => k + 1);
    setCurrent(next);
    pushIndex(next);
  }, [pushIndex]);

  const prev = useCallback(() => { if (current > 0) goTo(current - 1, 'prev'); }, [current, goTo]);
  const next = useCallback(() => { if (current < slides.length - 1) goTo(current + 1, 'next'); }, [current, slides.length, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'f' || e.key === 'F') toggleFs();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [prev, next]);

  // Touch swipe
  useEffect(() => {
    let touchStartX = 0;
    function handleTouchStart(e) { touchStartX = e.touches[0].clientX; }
    function handleTouchEnd(e) {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) next();
        else prev();
      }
    }
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [next, prev]);

  const toggleFs = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleSync = () => {
    const n = !sync;
    setSync(n);
    syncRef.current = n;
    if (n) {
      const ref = doc(db, FS.col, FS.doc);
      setDoc(ref, { index: current, locale }, { merge: true });
    }
  };

  const cycleLocale = () => {
    const locales = ['pt', 'en', 'es'];
    const idx = locales.indexOf(locale);
    setLocale(locales[(idx + 1) % locales.length]);
    setShowLangMenu(false);
  };

  const slide = slides[Math.min(current, slides.length - 1)];
  const Layout = LAYOUTS[slide.layout] || SlideBullets;
  const isLight = theme === 'light';

  return (
    <div className={`${styles.slideshow} ${isLight ? styles.slideshowLight : ''}`}>
      {/* Toolbar */}
      <div className={`${styles.toolbar} ${fullscreen ? styles.toolbarHidden : ''}`}>
        <button className={styles.tbtn} onClick={() => navigate('/')} title="Voltar">
          <FiHome size={16} />
        </button>
        <div className={styles.toolbarR}>
          <button className={`${styles.syncBtn} ${sync ? styles.syncOn : ''}`} onClick={toggleSync} title={sync ? 'Sync ativo' : 'Sync desativado'}>
            {sync ? <FiWifi size={14} /> : <FiWifiOff size={14} />}
            <span className={styles.syncLabel}>{sync ? 'Sync' : 'Local'}</span>
          </button>
          <button className={styles.tbtn} onClick={cycleLocale} title="Idioma">
            <FiGlobe size={14} />
            <span className={styles.localeTag}>{locale.toUpperCase()}</span>
          </button>
          <button className={styles.tbtn} onClick={toggleTheme} title="Tema">
            {isLight ? <FiMoon size={14} /> : <FiSun size={14} />}
          </button>
          <button className={styles.tbtn} onClick={toggleFs} title={fullscreen ? 'Sair' : 'Tela Cheia'}>
            {fullscreen ? <FiMinimize size={14} /> : <FiMaximize size={14} />}
          </button>
        </div>
      </div>

      {/* Slide */}
      <div className={`${styles.slWrapper} ${animDir === 'next' ? styles.slAnimNext : styles.slAnimPrev}`} key={animKey}>
        <Layout slide={slide} />
      </div>

      {/* Nav */}
      <div className={styles.slNav}>
        <button className={styles.slNavBtn} onClick={prev} disabled={current === 0}>
          <FiChevronLeft size={18} />
        </button>
        <div className={styles.slNavDots}>
          {slides.map((_, i) => (
            <span key={i} className={`${styles.slDot} ${i === current ? styles.slDotOn : ''}`} />
          ))}
        </div>
        <button className={styles.slNavBtn} onClick={next} disabled={current === slides.length - 1}>
          <FiChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
