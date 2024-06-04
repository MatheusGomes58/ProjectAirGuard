import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { Modal, Box, Button, TextField, MenuItem, Select, FormControl, InputLabel, Switch, FormControlLabel } from '@mui/material';
import './addFunctionModal.css';

const AddFunctionModal = ({ open, handleClose, functionData }) => {
    const [devices, setDevices] = useState([]);
    const [name, setName] = useState(functionData?.name || '');
    const [device, setDevice] = useState(functionData?.deviceId || '');
    const [action, setAction] = useState(functionData?.action || '');
    const [webhookUrl, setWebhookUrl] = useState(functionData?.webhookUrl || '');
    const [notificationEmail, setNotificationEmail] = useState(functionData?.notificationEmail || '');
    const [isEnabled, setIsEnabled] = useState(functionData?.state || false);

    useEffect(() => {
        const fetchDevices = () => {
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

        const unsubscribe = fetchDevices();

        return () => {
            unsubscribe();
        };
    }, []);

    const handleSave = () => {
        const newFunction = {
            name,
            device,
            action,
            webhookUrl: action === 'Webhook' ? webhookUrl : '',
            notificationEmail: action === 'Notificação' ? notificationEmail : '',
            state: isEnabled
        };

        if (functionData?.id) {
            db.collection('functions').doc(functionData.id).update(newFunction).then(() => {
                handleClose();
            });
        } else {
            db.collection('functions').add(newFunction).then(() => {
                handleClose();
            });
        }
    };

    const handleDelete = () => {
        if (functionData?.id) {
            db.collection('functions').doc(functionData.id).delete().then(() => {
                handleClose();
            });
        }
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
        >
            <Box className="modalBox">
                <h2 className="modalHeader">{functionData ? 'Editar Função' : 'Adicionar Nova Função'}</h2>
                <TextField
                    label="Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    margin="normal"
                />
                <FormControl fullWidth margin="normal">
                    <InputLabel>Dispositivo</InputLabel>
                    <Select
                        value={device}
                        onChange={(e) => setDevice(e.target.value)}
                    >
                        {devices.map(dev => (
                            <MenuItem key={dev.id} value={dev.id}>{dev.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth margin="normal">
                    <InputLabel>Ação</InputLabel>
                    <Select
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                    >
                        <MenuItem value="Webhook">Webhook</MenuItem>
                        <MenuItem value="Notificação">Notificação</MenuItem>
                        <MenuItem value="Alerta">Alerta de Emergência</MenuItem>
                    </Select>
                </FormControl>
                {action === 'Webhook' && (
                    <TextField
                        label="Webhook URL"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                )}
                {action === 'Notificação' && (
                    <TextField
                        label="Email para Notificação"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                )}
                <FormControl fullWidth margin="normal">
                    <FormControlLabel
                        control={
                            <Switch
                                checked={isEnabled}
                                onChange={(e) => setIsEnabled(e.target.checked)}
                                color="primary"
                            />
                        }
                        label={isEnabled ? "Ligado" : "Desligado"}
                    />
                </FormControl>
                <Box className="modalActions">
                    <Button onClick={handleClose}>Cancelar</Button>
                    {functionData && <Button variant="contained" color="secondary" onClick={handleDelete}>Excluir</Button>}
                    <Button variant="contained" color="primary" onClick={handleSave}>Salvar</Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default AddFunctionModal;
