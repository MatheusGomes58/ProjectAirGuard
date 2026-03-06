import React, { createContext, useContext, useState, useCallback } from 'react';
import pt from '../data/strings/pt.json';
import en from '../data/strings/en.json';
import es from '../data/strings/es.json';

const dicts = { pt, en, es };

export const LANGUAGES = [
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
];

// Context
export const LocaleContext = createContext({ locale: 'pt', t: (k) => k, setLocale: () => { } });

// Provider — wraps the whole app
export function LocaleProvider({ children }) {
    const [locale, setLocaleState] = useState(
        () => localStorage.getItem('locale') || 'pt'
    );

    const setLocale = useCallback((code) => {
        localStorage.setItem('locale', code);
        setLocaleState(code);
    }, []);

    const t = useCallback((key) => {
        const dict = dicts[locale] || dicts['pt'];
        return dict[key] || key;
    }, [locale]);

    return (
        <LocaleContext.Provider value={{ locale, t, setLocale }}>
            {children}
        </LocaleContext.Provider>
    );
}

// Hook
export function useLocale() {
    return useContext(LocaleContext);
}
