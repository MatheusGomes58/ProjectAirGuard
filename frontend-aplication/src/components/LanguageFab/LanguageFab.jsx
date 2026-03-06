import React, { useState } from 'react';
import { LANGUAGES, getLocale, setLocale } from '../../utils/i18n';

export default function LanguageFab() {
    const [showOptions, setShowOptions] = useState(false);
    const locale = getLocale();

    const current = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

    const handleSet = (code) => {
        if (code === locale) { setShowOptions(false); return; }
        setLocale(code);
        setShowOptions(false);
        window.location.reload();
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
                            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{lang.flag}</span>
                        </div>
                    ))}
                </>
            )}

            <button
                className="fabMain"
                onClick={() => setShowOptions(s => !s)}
                title="Idioma"
            >
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{current.flag}</span>
            </button>
        </div>
    );
}
