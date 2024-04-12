import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../components/firebase/firebase';
import Narrator from '../components/narrador/narrador';
import LevelProgressBar from '../components/progressbar/progressBar';
import '../css/missionsListPage.css';
import LogoJA from '../img/userUnknow.png';

function MissionsListPage() {
    const [user, setUser] = useState({});
    const [missions, setMissions] = useState([]);
    const [mensager, setMensager] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        getMensagerFromFirestore();
        userValidation();
    }, []);

    async function getMensagerFromFirestore() {
        db.collection('mensagers')
            .where('mensager', '==', 'missionsListPage')
            .onSnapshot(snapshot => {
                if (!snapshot.empty) {
                    const mensagerData = snapshot.docs[0].data();
                    setMensager(mensagerData.text);
                }
            });
    };

    useEffect(() => {
        const userEmail = localStorage.getItem('email');
        const getUserFromFirestore = () => {
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

        function getMissionsFromFirestore() {
            return db.collection('missions')
                .where('email', 'array-contains', userEmail)
                .onSnapshot(async missionSnapshot => {
                    const missionsData = [];
                    for (const doc of missionSnapshot.docs) {
                        const missionData = doc.data();
                        const jsonMission = { id: doc.id, ...missionData };
                        const reportSnapshot = await db.collection('reports')
                            .where('missionId', '==', jsonMission.id)
                            .where('email', '==', userEmail)
                            .get();
                        reportSnapshot.forEach(report => {
                            const reportData = report.data();
                            jsonMission.status = reportData.status;
                        });
                        missionsData.push(jsonMission);
                    }
                    setMissions(missionsData);
                });
        }

        const unsubscribeUser = getUserFromFirestore();
        const unsubscribeMissions = getMissionsFromFirestore();

        return () => {
            unsubscribeUser();
            unsubscribeMissions();
        };
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

    if (user.admin) {
        localStorage.setItem('admin', user.admin)
    }

    function handleMissionClick(missonID) {
        localStorage.setItem('missionId', missonID);
        navigate('/mission');
    }

    function calculateLevel() {
        const missionsConcluded = user.missionsConcluded ? user.missionsConcluded : 0;
        let userLevel = 0;

        if (missionsConcluded >= 2) {
            userLevel = Math.floor(Math.log2(missionsConcluded / 2)) + 1;
        }

        return userLevel;
    }


    return (
        <div className="missionsListPage">
            <div className='containerListMissions'>
                <div className="profileImage" style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={user.img ? user.img : LogoJA} alt="Profile" className="profileImg" />
                </div>
                <h2 className='functionLabel'>{user.function ? user.function : 'Cargo Indefinido'}</h2>
            </div>
            <div className='containerListMissions'>
                <div className='missionCards'>
                    <div className='missionCardHeader' >
                        <h2>Agente Nivel: {calculateLevel()}</h2>
                        <LevelProgressBar user={user} />
                    </div>
                    <div className='missionCardList'>
                        {missions.map(mission => (
                            <div key={mission.id} className="missionCardBody" onClick={() => handleMissionClick(mission.id)}>
                                <div className='missionCardContent'>
                                    <h3>{mission.title}</h3>
                                    <p>{mission.description}</p>
                                </div>
                                <div className='missionCardStatus'>
                                    {mission.status === 'completed' && <i className="fas fa-check-circle"></i>}
                                    {mission.status === 'error' && <i className="fas fa-times-circle text-danger"></i>}
                                    {mission.status === 'in_progress' && <i className="fas fa-circle-notch"></i>}
                                    {!mission.status && <i className="fas fa-bullseye"></i>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <h2 className='missionCardFooter'>{mensager ? mensager : 'Protocolo Indefinido'}</h2>
                </div>
            </div>
        </div>
    );
}

export default MissionsListPage;
