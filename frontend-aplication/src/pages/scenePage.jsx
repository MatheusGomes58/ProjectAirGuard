import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../components/firebase/firebase';
import Switch from '../components/switch/switch';
import '../css/scenePage.css';
import FunctionIcon from '@mui/icons-material/Functions';
import { Button } from '@mui/material';
import AddFunctionModal from '../components/addFunctionModal/addFunctionModal'; // Verifique se o caminho de importação está correto

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

    useEffect(() => {
        if (devices.length > 0) {
            const deviceMap = devices.reduce((acc, device) => {
                acc[device.id] = device.name;
                return acc;
            }, {});

            const getFunctionsFromFirestore = () => {
                return db.collection('functions')
                    .where('device', 'in', Object.keys(deviceMap))
                    .onSnapshot(snapshot => {
                        const functionsData = snapshot.docs.map(doc => {
                            const functionData = doc.data();
                            return {
                                id: doc.id,
                                ...functionData,
                                device: deviceMap[functionData.device],
                                deviceId: functionData.device
                            };
                        });
                        setFunctions(functionsData);
                    });
            };

            const unsubscribe = getFunctionsFromFirestore();

            return () => {
                unsubscribe();
            };
        }
    }, [devices]);

    if (user.admin) {
        localStorage.setItem('admin', user.admin);
    }

    function editUserAccess() {
        localStorage.removeItem('editUser');
        navigate('/profile');
    }

    function accessMissionsPage() {
        navigate('/missions');
    }

    const handleEdit = (func) => {
        setSelectedFunction(func);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedFunction(null);
    };

    return (
        <div className="scenePage">
            <div className='containerscene'>
                <div className='functionGrid'>
                    {functions.map(func => (
                        <div className="functionCard" key={func.id} onClick={() => handleEdit(func)}>
                            <FunctionIcon className="functionIcon" />
                            <div className='boxSwitch'>
                                <Switch
                                    id={func.id}
                                    status={func.state}
                                    label=""
                                    readOnly
                                />
                            </div>
                            <div className="functionName">
                                <p>{func.name}</p>
                            </div>
                            <div className='textFunction'>⚙️ : {func.device}</div>
                            <div className='textFunction'>⚡️ : {func.action}</div>
                        </div>
                    ))}
                </div>
            </div>
            {isModalOpen && (
                <AddFunctionModal
                    open={isModalOpen}
                    handleClose={handleCloseModal}
                    functionData={selectedFunction}
                />
            )}
        </div>
    );
}

export default ScenePage;
