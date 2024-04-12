import React from 'react';
import { useNavigate } from 'react-router-dom';
import './menu.css'

function MenuOptions() {
    const history = useNavigate();

    function acessHome() {
        history('/home');
    }


    function logout() {
        localStorage.clear();
        history('/');
    }

    return (
        <div className='addEvent'>
            <button className='btnCircle' onClick={acessHome}>
                <i className="fas fa-user"></i>
            </button>
            <button className='btnCircle' onClick={logout}>
                <i className="fas fa-sign-out-alt"></i>
            </button>
        </div>
    );
}

export default MenuOptions;

