import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../components/firebase/firebase.jsx';
import '../css/profilePage.css';
import LogoUnknow from '../img/userUnknow.png';
import { useLocale } from '../context/LocaleContext';

function ProfilePage() {
    const { t } = useLocale();
    const [user, setUser] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        userValidation();
    }, []);

    async function userValidation() {
        const authTime = localStorage.getItem('authTime');
        if (!authTime) { navigate('/'); return; }
        const timeElapsed = new Date().getTime() - parseInt(authTime, 10);
        if (timeElapsed > 3 * 60 * 60 * 1000) { navigate('/'); return; }
    }

    function logout() {
        localStorage.clear();
        navigate('/');
    }

    useEffect(() => {
        const userEmail = localStorage.getItem('email');
        const unsubscribe = db.collection('users')
            .where('email', '==', userEmail)
            .onSnapshot(snapshot => {
                if (!snapshot.empty) {
                    setUser({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
                }
            });
        return () => unsubscribe();
    }, []);

    if (user.admin) localStorage.setItem('admin', user.admin);

    return (
        <div className="profilePage">
            {/* Header / Avatar */}
            <div className="profileHeader">
                <div className="profileImageWrapper">
                    <img
                        src={user.img ? user.img : LogoUnknow}
                        alt="Foto de perfil"
                        className="profileImg"
                    />
                    <button className='configButton' onClick={() => navigate('/profileEdit')}>
                        <i className="fas fa-pen"></i>
                    </button>
                </div>
                <h2 className='functionLabel'>{user.name || 'Nome Indefinido'}</h2>
                <p className="profileSubtitle">{user.email || ''}</p>
            </div>

            {/* Info Card */}
            <div className='containerHome'>
                <div className="Card">
                    <div className="profileInfoRow">
                        <div className="profileInfoIcon"><i className="fas fa-envelope"></i></div>
                        <div className="profileInfoContent">
                            <span className="profileInfoLabel">Email</span>
                            <span className="profileInfoValue">{user.email || 'Indefinido'}</span>
                        </div>
                    </div>
                    <div className="profileInfoRow">
                        <div className="profileInfoIcon"><i className="fas fa-map-marker-alt"></i></div>
                        <div className="profileInfoContent">
                            <span className="profileInfoLabel">Endereço</span>
                            <span className="profileInfoValue">{user.address || 'Indefinido'}</span>
                        </div>
                    </div>
                    <div className="profileInfoRow">
                        <div className="profileInfoIcon"><i className="fas fa-city"></i></div>
                        <div className="profileInfoContent">
                            <span className="profileInfoLabel">Cidade</span>
                            <span className="profileInfoValue">{user.city || 'Indefinido'}</span>
                        </div>
                    </div>
                    <div className="profileInfoRow">
                        <div className="profileInfoIcon"><i className="fas fa-flag"></i></div>
                        <div className="profileInfoContent">
                            <span className="profileInfoLabel">Estado / País</span>
                            <span className="profileInfoValue">
                                {[user.state, user.country].filter(Boolean).join(', ') || 'Indefinido'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Logout */}
            <div className="profileLogoutArea">
                <button className="buttonLogout profileLogoutBtn" onClick={logout}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>{t('logout')}</span>
                </button>
            </div>
        </div>
    );
}

export default ProfilePage;
