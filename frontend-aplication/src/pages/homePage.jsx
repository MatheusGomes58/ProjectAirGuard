import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../components/firebase/firebase';
import Switch from '../components/switch/switch';
import '../css/homePage.css';
import DeviceIcon from '@mui/icons-material/Devices';
import DeviceModalEdit from '../components/addDeviceModal/addDeviceModal';
import DeviceModal from '../components/deviceModal/deviceModal';

function HomePage() {
    const [user, setUser] = useState({});
    const [devices, setDevices] = useState([]);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [modalEditIsOpen, setEditModalIsOpen] = useState(false);
    const [modalDevice, setModalDevice] = useState(null);
    const currentUserUid = localStorage.getItem('uid');
    const navigate = useNavigate();
    const openEditModal = () => setEditModalIsOpen(true);
    const closeEditModal = () => setEditModalIsOpen(false);

    useEffect(() => {
        userValidation();
    }, []);

    async function userValidation() {
        const authTime = localStorage.getItem('authTime');
        if (!authTime) {
            navigate('/');
            return;
        }

        const currentTime = new Date().getTime();
        const timeElapsed = currentTime - parseInt(authTime, 10);

        const threeHoursInMs = 3 * 60 * 60 * 1000;
        if (timeElapsed > threeHoursInMs) {
            navigate('/');
            return;
        }
    }

    useEffect(() => {
        const getUserFromFirestore = () => {
            const userEmail = localStorage.getItem('email');
            return db.collection('users')
                .where('email', '==', userEmail)
                .onSnapshot(snapshot => {
                    if (!snapshot.empty) {
                        const userData = snapshot.docs[0].data();
                        const userId = snapshot.docs[0].id;
                        setUser({ id: userId, ...userData });
                    }
                });
        };

        const unsubscribe = getUserFromFirestore();

        return () => {
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const getDevicesFromFirestore = () => {
            const currentUserUid = localStorage.getItem('uid');

            return db.collection('devices')
                .where('uids', 'array-contains', currentUserUid)
                .onSnapshot(snapshot => {
                    const devicesData = snapshot.docs.map(doc => {
                        const data = doc.data();
                        const userData = data.usersData.find(user => user.uid === currentUserUid);
                        return {
                            id: doc.id,
                            ...data,
                            name: userData ? userData.name : null // Adiciona o nome apenas se o userData for encontrado
                        };
                    }).filter(device => device.name !== null); // Filtra dispositivos onde o nome não é nulo

                    setDevices(devicesData);
                });
        };


        const unsubscribe = getDevicesFromFirestore();

        return () => {
            unsubscribe();
        };
    }, []);

    if (user.admin) {
        localStorage.setItem('admin', user.admin);
    }

    function editUserAcess() {
        localStorage.removeItem('editUser');
        navigate('/profile');
    }

    function acessMissionsPage() {
        navigate('/missions');
    }

    const handleToggle = (deviceId, newState) => {
        db.collection('devices').doc(deviceId).update({ state: newState });
    };

    const openModal = (device) => {
        setModalDevice(device || { name: '', state: false, id: null });
        setModalIsOpen(true);
    };

    const closeModal = () => {
        setModalIsOpen(false);
    };

    return (
        <div className="homePage">
            <div className='containerHome'>
                <div className='deviceGrid'>
                    {devices.map(device => (
                        <div>
                            <div className="deviceCard">
                                <DeviceIcon className="deviceIcon" key={device.id} onClick={() => openModal(device)} />
                                <div className='boxSwitch'>
                                    <Switch
                                        id={device.id}
                                        status={device.state}
                                        label=""
                                        onToggle={handleToggle}
                                    />
                                </div>
                                <div className="deviceName" key={device.id} onClick={() => openModal(device)}>{device.name}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <DeviceModal
                open={modalIsOpen}
                handleClose={closeModal}
                deviceData={modalDevice}
                currentUser={user}
                editDevice={openEditModal} // Passando a função que abre o modal de edição
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
