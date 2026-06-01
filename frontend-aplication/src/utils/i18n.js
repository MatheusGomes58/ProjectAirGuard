import pt from '../data/strings/pt.json';
import en from '../data/strings/en.json';
import es from '../data/strings/es.json';
import { useState, useEffect, useCallback } from 'react';

const locales = { pt, en, es };

export const LANGUAGES = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export function getLocale() {
  return localStorage.getItem('locale') || 'pt';
}

export function t(key) {
  const locale = getLocale();
  const dict = locales[locale] || locales['pt'];
  return dict[key] || key;
}

export function setLocale(l) {
  localStorage.setItem('locale', l);
  window.dispatchEvent(new Event('localechange'));
}

// Hook that re-renders component when locale changes
export function useTranslation() {
  const [locale, setLocaleState] = useState(getLocale);

  useEffect(() => {
    const handler = () => setLocaleState(getLocale());
    window.addEventListener('localechange', handler);
    return () => window.removeEventListener('localechange', handler);
  }, []);

  const translate = useCallback((key) => {
    const dict = locales[locale] || locales['pt'];
    return dict[key] || key;
  }, [locale]);

  return { t: translate, locale };
}
