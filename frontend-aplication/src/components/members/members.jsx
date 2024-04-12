import React from 'react';
import './members.css';
import { useNavigate } from 'react-router-dom';
import LogoJA from '../../img/userUnknow.png';

function Members({ users, isAdmin }) {
    const navigate = useNavigate();
    const handleEditButtonClick = (email) => {
        localStorage.setItem('editUser', email)
        navigate('/profile');
    };

    const handleChatButtonClick = (user) => {
        const userString = JSON.stringify(user);
        localStorage.setItem('chat', userString);
        navigate('/chat');
    };


    return (
        users.map(user => (
            <label key={user.id} className={user.status ? 'userList userActive' : 'userList userInactive'}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={user.img ? user.img : LogoJA} alt="Profile" className="profilesImg" />
                </div>
                <div className='functionLabel'>
                    <h2>{user.name ? user.name : 'Nome Indefinido'}</h2>
                    <h4>{user.team ? user.team : 'Time Indefinido'}</h4>
                </div>
                {isAdmin && (
                    <button className="configsButton" onClick={() => handleEditButtonClick(user.email)}>
                        <i className="fas fa-cog"></i>
                    </button>
                )}
                <button className="configsButton" onClick={() => handleChatButtonClick(user)}>
                    <i className="fas fa-comment"></i>
                </button>
            </label>
        ))
    );
}

export default Members;
