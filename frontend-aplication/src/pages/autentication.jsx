import '../css/autenticationPage.css';
import LoginForm from '../components/Auth/login'
import RegisterForm from '../components/Auth/register'
import { t } from '../utils/i18n';
import { useNavigate } from 'react-router-dom';
import LogoJA from '../img/logo.png';
import React, { useState, useEffect } from 'react';

function Auth() {
    const [activeTab, setActiveTab] = useState('login');
    const navigate = useNavigate();

    useEffect(() => {
        userValidation();
    }, []);

    async function userValidation() {
        const authTime = localStorage.getItem('authTime');
        if (!authTime) return; // Nenhum token — permanece na tela de auth

        const currentTime = new Date().getTime();
        const timeElapsed = currentTime - parseInt(authTime, 10);
        const threeHoursInMs = 3 * 60 * 60 * 1000;

        if (timeElapsed <= threeHoursInMs) {
            // Sessão ainda válida — redirecionar para home
            navigate('/home');
        }
        // Se expirado, permanece na tela de login para reautenticar
    }

    const handleTabSwitch = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className="Auth">
            <div className='containerAuth logoArea'>
                <img src={LogoJA} className='LogoJA' alt={t('brandName') + ' Logo'} />
                <h1 className="brandName">{t('brandName')}</h1>
                <p className="brandTagline">{t('brandTagline')}</p>
            </div>
            <div className='containerAuth'>
                <div className="container">
                    <div className="sliderLogin">
                        <div
                            className={`switch ${activeTab === 'login' ? 'active' : ''}`}
                            onClick={() => handleTabSwitch('login')}
                        >
                            {t('logIn')}
                        </div>
                        <div
                            className={`switch ${activeTab === 'register' ? 'active' : ''}`}
                            onClick={() => handleTabSwitch('register')}
                        >
                            {t('register')}
                        </div>
                    </div>
                    {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
                </div>
            </div>
        </div>
    );
}

export default Auth;
