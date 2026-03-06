import pt from '../data/strings/pt.json';
import en from '../data/strings/en.json';
import es from '../data/strings/es.json';

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
  // Dispatch a custom event so components can re-render if needed
  window.dispatchEvent(new Event('localechange'));
}
