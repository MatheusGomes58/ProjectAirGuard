import React, { useState } from 'react';
import { useLocale } from '../../context/LocaleContext';

const LANGUAGES = [
    { code: 'pt', label: 'Português', short: 'PT' },
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'es', label: 'Español', short: 'ES' },
];

export default function LanguageFab() {
    const [showOptions, setShowOptions] = useState(false);
    const { locale, setLocale } = useLocale();

    const current = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

    const handleSet = (code) => {
        setLocale(code);          // updates React state & localStorage — no reload
        setShowOptions(false);
    };

    return (
        <div className="langFab">
            {showOptions && (
                <>
                    {LANGUAGES.map(lang => (
                        <div
                            key={lang.code}
                            className={`fabOption ${locale === lang.code ? 'active' : ''}`}
                            onClick={() => handleSet(lang.code)}
                            title={lang.label}
                        >
                            <span className="label">{lang.label}</span>
                            <span className="fabShort">{lang.short}</span>
                        </div>
                    ))}
                </>
            )}

            <button
                className="fabMain"
                onClick={() => setShowOptions(s => !s)}
                title="Idioma"
            >
                <span className="fabShort">{current.short}</span>
            </button>
        </div>
    );
}
