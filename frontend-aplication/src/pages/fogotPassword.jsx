import '../css/autenticationPage.css';
import { db, auth } from '../components/firebase/firebase';
import { useNavigate } from 'react-router-dom';
import LogoJA from '../img/logo.png';
import React, { useState } from 'react';
import ForgotPasswordForm from '../components/Auth/fogotPassword';

function Auth() {
    const [activeTab, setActiveTab] = useState('login');
    const navigate = useNavigate();



    const handleTabSwitch = (tab) => {
        navigate('/');
    };

    return (
        <div className="Auth">
            <div className='containerAuth'>
                <img src={LogoJA} className='LogoJA' />
            </div>
            <div className='containerAuth'>
                <div className="container">
                    <div className="sliderLogin">
                        <div
                            className={`switch ${activeTab === 'login' ? 'active' : ''}`}
                            onClick={() => handleTabSwitch('login')}
                        >
                            Logar
                        </div>
                        <div
                            className={`switch ${activeTab === 'register' ? 'active' : ''}`}
                            onClick={() => handleTabSwitch('register')}
                        >
                            Registrar
                        </div>
                    </div>
                    <ForgotPasswordForm />
                </div>
            </div>
        </div>
    );
}

export default Auth;

