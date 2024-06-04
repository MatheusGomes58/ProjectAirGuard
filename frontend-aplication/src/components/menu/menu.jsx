import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AddFunctionModal from '../addFunctionModal/addFunctionModal';
import DeviceModal from '../addDeviceModal/addDeviceModal'; // Importe o DeviceModal
import './menu.css'

function MenuOptions() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isFunctionModalOpen, setIsFunctionModalOpen] = useState(false);
    const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
    const [modalDevice, setModalDevice] = useState(null); // Estado para o dispositivo no modal

    function acessHome() {
        navigate('/home');
    }

    function acessScene() {
        navigate('/scene');
    }

    function acessProfile() {
        navigate('/profile');
    }

    function logout() {
        localStorage.clear();
        navigate('/');
    }

    const handleOpenModal = () => {
        if (location.pathname === '/scene') {
            setIsFunctionModalOpen(true);
        } else {
            setIsDeviceModalOpen(true);
        }
    };

    const handleCloseDeviceModal = () => {
        setIsDeviceModalOpen(false);
    };

    const handleCloseFunctionModal = () => {
        setIsFunctionModalOpen(false);
    };

    return (
        <div className='addEvent'>
            <button className='btnCircle Dow' onClick={acessHome}>
                <i className="fas fa-home"></i>
            </button>
            <button className='btnCircle' onClick={acessScene}>
                <i className="fas fa-cube"></i>
            </button>
            <button className='btnCircle Plus' onClick={handleOpenModal}>
                <i className="fas fa-plus"></i>
            </button>
            <button className='btnCircle' onClick={acessProfile}>
                <i className="fas fa-user"></i>
            </button>
            <button className='btnCircle Dow' onClick={logout}>
                <i className="fas fa-sign-out-alt"></i>
            </button>
            <AddFunctionModal open={isFunctionModalOpen} handleClose={handleCloseFunctionModal} />
            <DeviceModal
                open={isDeviceModalOpen}
                handleClose={handleCloseDeviceModal}
                deviceData={modalDevice}
            />
        </div>
    );
}

export default MenuOptions;
