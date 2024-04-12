import React from 'react';
import { useNavigate } from 'react-router-dom';
import './menu.css'

function MenuOptions() {
    const history = useNavigate();

    function acessHome() {
        history('/home');
    }

    function acessTeam() {
        history('/team');
    }

    function acessSchedule() {
        history('/schedule');
    }

    function acessCard() {
        const url = 'https://sg.sdasystems.org/liderja/br/';
        window.open(url, '_blank');
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
            <button className='btnCircle' onClick={acessTeam}>
                <i className="fas fa-users"></i>
            </button>
            <button className='btnCircle' onClick={acessSchedule}>
                <i className="fas fa-calendar-alt"></i>
            </button>
            <button className='btnCircle' onClick={acessCard}>
                <i className="fas fa-chalkboard"></i>
            </button>
            <button className='btnCircle' onClick={logout}>
                <i className="fas fa-sign-out-alt"></i>
            </button>
        </div>
    );
}

export default MenuOptions;

