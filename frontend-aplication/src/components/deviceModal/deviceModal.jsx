import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { Modal, Box, Button } from '@mui/material';
import { WiHumidity, WiThermometer } from 'react-icons/wi';
import { AiOutlineRobot } from 'react-icons/ai'; // Ícone de IA
import './deviceModal.css';

const DeviceModal = ({ open, handleClose, deviceData, editDevice }) => {
    const [humidity, setHumidity] = useState('0');
    const [temperature, setTemperature] = useState('0');
    const [aiClassification, setAiClassification] = useState('');

    useEffect(() => {
        if (deviceData?.id) {
            const unsubscribe = db.collection('clima')
                .doc(deviceData.id)
                .onSnapshot(doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        setHumidity(data.umidade || '0');
                        setTemperature(data.temperatura || '0')
                        setAiClassification(data.classificacao || 'Indefinido');
                    }
                });
            return () => unsubscribe(); // Cleanup listener
        }
    }, [deviceData?.id]);

    return (
        <Modal
            open={open}
            onClose={handleClose}
        >
            <Box className="modalBox">
                <div id="sensorsPage" className="page">
                    <h2>Dados dos Sensores</h2>
                    <div className="sensor-data">
                        {/* Umidade */}
                        <div className="sensor" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                            <WiHumidity size={40} className="sensor-icon" style={{ marginRight: '12px' }} />
                            <div className="sensor-info" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <label style={{ fontWeight: 'bold' }}>Umidade:</label>
                                <span id="humidityValue">{humidity}%</span>
                            </div>
                        </div>

                        {/* Temperatura */}
                        <div className="sensor" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                            <WiThermometer size={40} className="sensor-icon" style={{ marginRight: '12px' }} />
                            <div className="sensor-info" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <label style={{ fontWeight: 'bold' }}>Temperatura:</label>
                                <span id="temperatureValue">{temperature}°C</span>
                            </div>
                        </div>

                        {/* Classificação de IA */}
                        <div className="sensor" style={{ display: 'flex', alignItems: 'center' }}>
                            <AiOutlineRobot size={40} className="sensor-icon" style={{ marginRight: '12px' }} />
                            <div className="sensor-info" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <label style={{ fontWeight: 'bold' }}>Classificação IA:</label>
                                <span id="aiClassificationValue">{aiClassification}</span>
                            </div>
                        </div>


                        <Box className="modalActions">
                            <Button variant="contained" color="primary" onClick={handleClose}>Fechar</Button>
                            <Button variant="contained" color="primary" onClick={editDevice}>Editar</Button>
                        </Box>
                    </div>
                </div>
            </Box>
        </Modal>
    );
};

export default DeviceModal;
