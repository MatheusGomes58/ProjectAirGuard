import React, { useEffect, useState, useRef } from 'react';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import { db, auth } from '../firebase/firebase.jsx';
import '../../css/index.css';

export default function ThemeManager() {
  const [themePref, setThemePref] = useState(() => localStorage.getItem('themePref') || 'auto');
  const [showOptions, setShowOptions] = useState(false);
  const location = useLocation();
  const isSlides = location.pathname === '/slides';
  const themeRef = useRef(themePref);

  useEffect(() => {
    themeRef.current = themePref;
  }, [themePref]);

  // Sync with Firebase if on /slides
  useEffect(() => {
    if (!isSlides) return;

    const FS = { col: 'slides', doc: 'current' };
    const ref = db.collection(FS.col).doc(FS.doc);

    const unsubscribe = ref.onSnapshot((snap) => {
      if (snap.exists) {
        const data = snap.data();
        if (data.theme && data.theme !== themeRef.current && (data.theme === 'light' || data.theme === 'dark')) {
          setThemePref(data.theme);
        }
      }
    });

    return () => unsubscribe();
  }, [isSlides]);

  const pushToFirebase = (pref) => {
    if (!isSlides) return;
    const user = auth.currentUser;
    if (!user) return; // Only authenticated users (presenters) push updates

    const FS = { col: 'slides', doc: 'current' };
    db.collection(FS.col).doc(FS.doc).update({ theme: pref }).catch(() => {
      // If doc doesn't exist, it might be safer not to create it here to avoid overwriting other fields
      // but slideshow.jsx already handles creating it.
    });
  };

  useEffect(() => {
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

    function apply(pref) {
      if (pref === 'auto') {
        const systemDark = mq ? mq.matches : false;
        document.documentElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', pref);
      }
    }

    apply(themePref);

    let listener = null;
    if (themePref === 'auto' && mq && mq.addEventListener) {
      listener = () => apply('auto');
      mq.addEventListener('change', listener);
    }

    return () => {
      if (mq && listener && mq.removeEventListener) mq.removeEventListener('change', listener);
    };
  }, [themePref]);

  const handleSet = (pref) => {
    try { localStorage.setItem('themePref', pref); } catch (e) {}
    setThemePref(pref);
    setShowOptions(false);
    if (pref !== 'auto') pushToFirebase(pref);
  };

  return (
    <div className="themeFab" aria-hidden={false}>
      {showOptions && (
        <>
          <div className={`fabOption ${themePref === 'auto' ? 'active' : ''}`} onClick={() => handleSet('auto')} title="Automático">
            <span className="label">Auto</span>
            <FiMonitor size={16} />
          </div>
          <div className={`fabOption ${themePref === 'light' ? 'active' : ''}`} onClick={() => handleSet('light')} title="Light">
            <span className="label">Light</span>
            <FiSun size={16} />
          </div>
          <div className={`fabOption ${themePref === 'dark' ? 'active' : ''}`} onClick={() => handleSet('dark')} title="Dark">
            <span className="label">Dark</span>
            <FiMoon size={16} />
          </div>
        </>
      )}

      <button className="fabMain" onClick={() => setShowOptions(s => !s)} title="Tema">
        {themePref === 'light' ? <FiSun size={18} /> : themePref === 'dark' ? <FiMoon size={18} /> : <FiMonitor size={18} />}
      </button>
    </div>
  );
}
