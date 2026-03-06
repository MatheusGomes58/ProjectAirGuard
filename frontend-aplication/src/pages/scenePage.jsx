import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../components/firebase/firebase.jsx';
import Switch from '../components/switch/switch';
import '../css/scenePage.css';
import AddFunctionModal from '../components/addFunctionModal/addFunctionModal';
import { FiZap } from 'react-icons/fi';
import { t } from '../utils/i18n';

function ScenePage() {
    const [user, setUser] = useState({});
    const [devices, setDevices] = useState([]);
    const [functions, setFunctions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFunction, setSelectedFunction] = useState(null);
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

    useEffect(() => {
        const currentUserUid = localStorage.getItem('uid');
        const unsubscribe = db.collection('devices')
            .where('uids', 'array-contains', currentUserUid)
            .onSnapshot(snapshot => {
                const devicesData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const userData = data.usersData.find(u => u.uid === currentUserUid);
                    return { id: doc.id, ...data, name: userData ? userData.name : null };
                }).filter(d => d.name !== null);
                setDevices(devicesData);
            });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (devices.length > 0) {
            const deviceMap = devices.reduce((acc, d) => { acc[d.id] = d.name; return acc; }, {});
            const unsubscribe = db.collection('functions')
                .where('device', 'in', Object.keys(deviceMap))
                .onSnapshot(snapshot => {
                    const functionsData = snapshot.docs.map(doc => {
                        const fd = doc.data();
                        return { id: doc.id, ...fd, device: deviceMap[fd.device], deviceId: fd.device };
                    });
                    setFunctions(functionsData);
                });
            return () => unsubscribe();
        }
    }, [devices]);

    if (user.admin) localStorage.setItem('admin', user.admin);

    const handleEdit = (func) => { setSelectedFunction(func); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedFunction(null); };

    const actionIcon = (action) => {
        if (action === 'Webhook') return '🔗';
        if (action === 'Notificação') return '🔔';
        if (action === 'Alerta') return '🚨';
        return '⚡';
    };

    return (
        <div className="scenePage">
            <div className="homeHeader">
                <div className="homeHeaderText">
                    <p className="homeGreeting">{t('sceneGreeting')}</p>
                    <h2 className="homeTitle">{t('sceneTitle')}</h2>
                </div>
            </div>
            <div className='containerscene'>
                <div className='functionGrid'>
                    {functions.length === 0 && (
                        <div className="emptyState">
                            <FiZap size={48} />
                            <p>{t('noScenesHome')}<br />{t('noScenesHomeHint')}</p>
                        </div>
                    )}
                    {functions.map(func => (
                        <div className="functionCard" key={func.id} onClick={() => handleEdit(func)}>
                            <div className="functionCardTop">
                                <div className="functionIconWrapper">
                                    <span className="functionActionIcon">{actionIcon(func.action)}</span>
                                </div>
                                <div className='boxSwitch' onClick={e => e.stopPropagation()}>
                                    <Switch id={func.id} status={func.state} label="" readOnly />
                                </div>
                            </div>
                            <div className="functionName">{func.name}</div>
                            <div className='functionMeta'>
                                <span className="functionMetaTag">⚙️ {func.device}</span>
                                <span className="functionMetaTag">{actionIcon(func.action)} {func.action}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {isModalOpen && (
                <AddFunctionModal open={isModalOpen} handleClose={handleCloseModal} functionData={selectedFunction} />
            )}
        </div>
    );
}

export default ScenePage;
