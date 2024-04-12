import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../components/firebase/firebase';
import Slides from '../components/slideShow/slideShow';
import ReportForm from '../components/report/report';
import '../css/missionPage.css';

function MissionDetailsPage() {
    const [mission, setMission] = useState(null);
    const [reportMission, setReportMission] = useState(null);
    const [report, setReport] = useState('');
    const [reportId, setReportId] = useState('');
    const [images, setImages] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const missionId = localStorage.getItem('missionId');
        const email = localStorage.getItem('email');

        const unsubscribeMission = db.collection('missions').doc(missionId)
            .onSnapshot(snapshot => {
                if (snapshot.exists) {
                    setMission({ id: snapshot.id, ...snapshot.data() });
                } else {
                    navigate('/missions');
                }
            });

        const unsubscribeReport = db.collection('reports')
            .where('missionId', '==', missionId)
            .where('email', '==', email)
            .limit(1)
            .onSnapshot(snapshot => {
                if (!snapshot.empty) {
                    const reportData = snapshot.docs[0].data();
                    setReport(reportData.status);
                    setReportMission(reportData);
                    setReportId(snapshot.docs[0].id);
                }
            });

        return () => {
            unsubscribeMission();
            unsubscribeReport();
        };
    }, [navigate]);

    const handleAcceptMission = async () => {
        const confirmAccept = window.confirm('Tem certeza de que deseja aceitar esta missão?');

        if (confirmAccept) {
            try {
                await db.collection('reports').add({
                    email: localStorage.getItem('email'),
                    missionId: localStorage.getItem('missionId'),
                    status: 'in_progress'
                });
                setReport('in_progress');
            } catch (error) {
                console.error('Erro ao aceitar a missão:', error);
            }
        }
    };

    const handleRejectMission = async () => {
        const confirmReject = window.confirm('Tem certeza de que deseja recusar esta missão?');

        if (confirmReject) {
            try {
                await db.collection('reports').add({
                    email: localStorage.getItem('email'),
                    missionId: localStorage.getItem('missionId'),
                    status: 'error'
                });
                setReport('error');
            } catch (error) {
                console.error('Erro ao recusar a missão:', error);
            }
        }
    };

    const handleImageChange = (event) => {
        const files = event.target.files;
        const imagesArray = [...images];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();

            reader.onload = (e) => {
                imagesArray.push(e.target.result);

                if (imagesArray.length === files.length + images.length) {
                    setImages(imagesArray);
                }
            };

            reader.readAsDataURL(file);
        }
    };


    const handleSubmitReport = async (reportData) => {
        const email = localStorage.getItem('email');
        const missionId = localStorage.getItem('missionId');
    
        try {
            const imageUrls = await Promise.all(images.map(uploadImage));
            await db.collection('reports').doc(reportId).update({
                text: reportData,
                status: 'completed',
                images: imageUrls
            });
    
            const userRef = db.collection('users').where('email', '==', email).limit(1);
            const userSnapshot = await userRef.get(); // Obtenha o snapshot diretamente
    
            let missionsConcluded = 1;
    
            if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                missionsConcluded = userData.missionsConcluded || 0;
                missionsConcluded++;
                const userId = userSnapshot.docs[0].id; 
    
                await db.collection('users').doc(userId).update({
                    missionsConcluded: missionsConcluded
                });
            }
    
            setReport('completed');
            alert('Relatório atualizado com sucesso!');
    
        } catch (error) {
            console.error('Erro ao enviar/atualizar o relatório:', error);
            alert('Ocorreu um erro ao enviar/atualizar o relatório. Por favor, tente novamente.');
        }
    };
    



    const uploadImage = async (imageData) => {
        try {
            const storageRef = storage.ref();
            const imageRef = storageRef.child(`imagesReport/${Date.now()}`);
            const snapshot = await imageRef.putString(imageData, 'data_url');
            return await snapshot.ref.getDownloadURL();
        } catch (error) {
            console.error('Erro ao fazer upload da imagem:', error);
            throw error;
        }
    };

    return (
        <div className="homePage">
            <div className='containerHome'>
                <h1 className='functionLabel'>Missão: {mission && mission.title}</h1>
                <h3>{mission && mission.description}</h3>
                {mission && mission.imageUrls && <Slides images={mission.imageUrls} />}
            </div>

            {!report && report != 'error' && (
                <div className='button-container'>
                    <button className='accept' onClick={handleAcceptMission}>
                        <i className="fas fa-check-circle"></i>
                    </button>
                    <button className='reject' onClick={handleRejectMission}>
                        <i className="fas fa-times-circle text-danger"></i>
                    </button>
                </div>
            )}

            {report === 'in_progress' && (
                <div className='containerHome'>
                    <Slides images={images} />
                    <div className='missionsCard'>
                        <ReportForm onSubmit={handleSubmitReport} addImage={handleImageChange} />
                    </div>
                </div>
            )}

            {report === 'completed' && (
                <div className='containerHome'>
                    <h1 className='functionLabel'>Relatório da Missão: {mission && mission.title}</h1>
                    <p>{reportMission.text}</p>
                    <Slides images={reportMission.images} />
                </div>
            )}
        </div>
    );
}

export default MissionDetailsPage;
