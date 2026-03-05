import '../css/autenticationPage.css';
import { useNavigate } from 'react-router-dom';
import LogoJA from '../img/logo.png';
import React, { useState } from 'react';
import ForgotPasswordForm from '../components/Auth/fogotPassword';

function ForgotPassword() {
    const navigate = useNavigate();

    return (
        <div className="Auth">
            <div className='containerAuth logoArea'>
                <img src={LogoJA} className='LogoJA' alt="AirGuard Logo" />
                <h1 className="brandName">AirGuard</h1>
            </div>
            <div className='containerAuth'>
                <div className="container">
                    <div className="sliderLogin">
                        <div
                            className="switch active"
                            onClick={() => navigate('/')}
                        >
                            Voltar ao Login
                        </div>
                    </div>
                    <ForgotPasswordForm />
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;
