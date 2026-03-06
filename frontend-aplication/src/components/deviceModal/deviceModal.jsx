import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebase.jsx';
import { Modal, Box, Button } from '@mui/material';
import { WiHumidity, WiThermometer } from 'react-icons/wi';
import { AiOutlineRobot } from 'react-icons/ai';
import './deviceModal.css';
import { t } from '../../utils/i18n';

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
                        setAiClassification(data.classificacao || t('undefined'));
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
                    <h2>{t('sensorData')}</h2>
                    <div className="sensor-data">
                        {/* Umidade */}
                        <div className="sensor" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                            <WiHumidity size={40} className="sensor-icon" style={{ marginRight: '12px' }} />
                            <div className="sensor-info" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <label style={{ fontWeight: 'bold' }}>{t('labelHumidity')}</label>
                                <span id="humidityValue">{humidity}%</span>
                            </div>
                        </div>

                        {/* Temperatura */}
                        <div className="sensor" style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                            <WiThermometer size={40} className="sensor-icon" style={{ marginRight: '12px' }} />
                            <div className="sensor-info" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <label style={{ fontWeight: 'bold' }}>{t('labelTemperature')}</label>
                                <span id="temperatureValue">{temperature}°C</span>
                            </div>
                        </div>

                        {/* Classificação de IA */}
                        <div className="sensor" style={{ display: 'flex', alignItems: 'center' }}>
                            <AiOutlineRobot size={40} className="sensor-icon" style={{ marginRight: '12px' }} />
                            <div className="sensor-info" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <label style={{ fontWeight: 'bold' }}>{t('labelAiClass')}</label>
                                <span id="aiClassificationValue">{aiClassification}</span>
                            </div>
                        </div>


                        <Box className="modalActions">
                            <Button variant="contained" color="primary" onClick={handleClose}>{t('close')}</Button>
                            <Button variant="contained" color="primary" onClick={editDevice}>{t('edit')}</Button>
                        </Box>
                    </div>
                </div>
            </Box>
        </Modal>
    );
};

export default DeviceModal;
