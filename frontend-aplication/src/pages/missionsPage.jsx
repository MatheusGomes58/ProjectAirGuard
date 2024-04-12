import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../components/firebase/firebase';
import Narrator from '../components/narrador/narrador';
import '../css/missionsPage.css';
import alert from '../img/alerta.png';

function MissionsPage() {
    const navigate = useNavigate();
    const [mensager, setMensager] = useState('');
    const [narrationFinished, setNarrationFinished] = useState(false);

    const handleNarrationFinish = () => {
        setNarrationFinished(true);
    };


    useEffect(() => {
        getMensagerFromFirestore();
        userValidation();
    }, []);

    async function getMensagerFromFirestore() {
        db.collection('mensagers').where('mensager', '==', 'alertAcess')
            .onSnapshot(snapshot => {
                if (!snapshot.empty) {
                    const mensagerData = snapshot.docs[0].data();
                    setMensager(mensagerData.text);
                }
            });
    };

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

    function missionsListAcess() {
        navigate('/missionslist');
    }

    return (
        <div className="missionsPage">
            <Narrator textArray={mensager} />
            <div className='containerMissions'>
                <img src={alert} className="Img" />
                <h1 className='functionLabel'>Acesso Restrito</h1>
                <button className='button' onClick={missionsListAcess}>
                    Acessar Missões
                </button>
            </div>
        </div>
    );
}

export default MissionsPage;
