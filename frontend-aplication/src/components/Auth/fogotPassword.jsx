import React, { useState } from 'react';
import { auth } from '../firebase/firebase.jsx';
import { sendPasswordResetEmail } from 'firebase/auth';
import './login.css';
import { t } from '../../utils/i18n';

function ForgotPasswordForm() {
    const [email, setEmail] = useState('');

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        try {
            await sendPasswordResetEmail(auth, email);
            alert(t('passwordResetSent'));
        } catch (error) {
            alert(t('passwordResetError') + ' ' + error.message);
        }
    };

    return (
        <div id="ForgotPasswordForm">
            <a className='resetPass'>{t('forgotPasswordHint')}</a>
            <input
                className="inputLogin"
                type="email"
                id="EmailUser"
                placeholder={t('emailPlaceholderForgot')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <div className="boxButton">
                <button className="btnAuth" onClick={handleForgotPassword}>{t('sendEmail')}</button>
            </div>
        </div>
    );
}

export default ForgotPasswordForm;
