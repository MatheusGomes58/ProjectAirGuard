import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../components/firebase/firebase.jsx';
import Switch from '../components/switch/switch';
import '../css/homePage.css';
import DeviceModalEdit from '../components/addDeviceModal/addDeviceModal';
import DeviceModal from '../components/deviceModal/deviceModal';
import { FiWifi, FiHome } from 'react-icons/fi';

function HomePage() {
    const [user, setUser] = useState({});
    const [devices, setDevices] = useState([]);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [modalEditIsOpen, setEditModalIsOpen] = useState(false);
    const [modalDevice, setModalDevice] = useState(null);
    const navigate = useNavigate();

    const openEditModal = () => setEditModalIsOpen(true);
    const closeEditModal = () => setEditModalIsOpen(false);

    useEffect(() => {
        userValidation();
    }, []);

    async function userValidation() {
        const authTime = localStorage.getItem('authTime');
        if (!authTime) { navigate('/'); return; }
        const timeElapsed = new Date().getTime() - parseInt(authTime, 10);
        if (timeElapsed > 3 * 60 * 60 * 1000) { navigate('/'); return; }
    }

    useEffect(() => {
        const userEmail = localStorage.getItem('email');
        const unsubscribe = db.collection('users')
            .where('email', '==', userEmail)
            .onSnapshot(snapshot => {
                if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data();
                    setUser({ id: snapshot.docs[0].id, ...userData });
                }
            });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const currentUserUid = localStorage.getItem('uid');
        const unsubscribe = db.collection('devices')
            .where('uids', 'array-contains', currentUserUid)
            .onSnapshot(snapshot => {
                const devicesData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const userData = data.usersData.find(u => u.uid === currentUserUid);
                    return { id: doc.id, ...data, name: userData ? userData.name : null };
                }).filter(device => device.name !== null);
                setDevices(devicesData);
            });
        return () => unsubscribe();
    }, []);

    if (user.admin) localStorage.setItem('admin', user.admin);

    const handleToggle = (deviceId, newState) => {
        db.collection('devices').doc(deviceId).update({ state: newState });
    };

    const openModal = (device) => {
        setModalDevice(device || { name: '', state: false, id: null });
        setModalIsOpen(true);
    };

    const activeCount = devices.filter(d => d.state).length;

    return (
        <div className="homePage">
            <div className="homeHeader">
                <div className="homeHeaderText">
                    <p className="homeGreeting">Olá, {user.name?.split(' ')[0] || 'Usuário'} 👋</p>
                    <h2 className="homeTitle">Seus dispositivos</h2>
                </div>
                <div className="homeStats">
                    <span className="statBadge"><FiWifi /> {activeCount} ativos</span>
                </div>
            </div>

            <div className='containerHome'>
                <div className='deviceGrid'>
                    {devices.length === 0 && (
                        <div className="emptyState">
                            <FiHome size={48} />
                            <p>Nenhum dispositivo ainda.<br />Adicione um pelo botão +</p>
                        </div>
                    )}
                    {devices.map(device => (
                        <div key={device.id} className="deviceCard" onClick={() => openModal(device)}>
                            <div className={`deviceStatus ${device.state ? 'on' : 'off'}`}></div>
                            <div className="deviceCardTop">
                                <div className="deviceIconWrapper">
                                    <i className="fas fa-microchip"></i>
                                </div>
                                <div className='boxSwitch' onClick={e => e.stopPropagation()}>
                                    <Switch
                                        id={device.id}
                                        status={device.state}
                                        label=""
                                        onToggle={handleToggle}
                                    />
                                </div>
                            </div>
                            <div className="deviceName">{device.name}</div>
                            <div className="deviceStateLabel">{device.state ? 'Ligado' : 'Desligado'}</div>
                        </div>
                    ))}
                </div>
            </div>

            <DeviceModal
                open={modalIsOpen}
                handleClose={() => setModalIsOpen(false)}
                deviceData={modalDevice}
                currentUser={user}
                editDevice={openEditModal}
            />
            <DeviceModalEdit
                open={modalEditIsOpen}
                handleClose={closeEditModal}
                deviceData={modalDevice}
                currentUser={user}
            />
        </div>
    );
}

export default HomePage;
