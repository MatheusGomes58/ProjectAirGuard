import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AddFunctionModal from '../addFunctionModal/addFunctionModal';
import DeviceModal from '../addDeviceModal/addDeviceModal';
import './menu.css';
import { useLocale } from '../../context/LocaleContext';

function MenuOptions() {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLocale();
    const [isFunctionModalOpen, setIsFunctionModalOpen] = useState(false);
    const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
    const [modalDevice] = useState(null);

    const isActive = (path) => location.pathname === path;

    const handleOpenModal = () => {
        if (location.pathname === '/scene') {
            setIsFunctionModalOpen(true);
        } else {
            setIsDeviceModalOpen(true);
        }
    };

    function logout() {
        localStorage.clear();
        navigate('/');
    }

    return (
        <div className='addEvent'>
            <nav className="navBar">
                <button
                    className={`btnCircle ${isActive('/home') ? 'navActive' : ''}`}
                    onClick={() => navigate('/home')}
                    title={t('home')}
                >
                    <i className="fas fa-home"></i>
                </button>
                <button
                    className={`btnCircle ${isActive('/scene') ? 'navActive' : ''}`}
                    onClick={() => navigate('/scene')}
                    title={t('scene')}
                >
                    <i className="fas fa-bolt"></i>
                </button>
                <button
                    className="btnCircle Plus"
                    onClick={handleOpenModal}
                    title={t('add')}
                >
                    <i className="fas fa-plus"></i>
                </button>
                <button
                    className={`btnCircle ${isActive('/profile') ? 'navActive' : ''}`}
                    onClick={() => navigate('/profile')}
                    title={t('profile')}
                >
                    <i className="fas fa-user"></i>
                </button>
                <button
                    className={`btnCircle ${isActive('/map') ? 'navActive' : ''}`}
                    onClick={() => navigate('/map')}
                    title={t('mapTitle')}
                >
                    <i className="fas fa-map-marker-alt"></i>
                </button>
            </nav>

            <AddFunctionModal open={isFunctionModalOpen} handleClose={() => setIsFunctionModalOpen(false)} />
            <DeviceModal
                open={isDeviceModalOpen}
                handleClose={() => setIsDeviceModalOpen(false)}
                deviceData={modalDevice}
            />
        </div>
    );
}

export default MenuOptions;
