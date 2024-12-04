import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { Modal, Box, Button, TextField, FormControl, Switch, FormControlLabel } from '@mui/material';
import './addDeviceModal.css'; // Crie um arquivo CSS para estilização personalizada

const DeviceModal = ({ open, handleClose, deviceData }) => {
    const [name, setName] = useState(deviceData?.name || '');
    const [state, setState] = useState(deviceData?.state || false);
    const [code, setCode] = useState(deviceData?.code || '');
    const currentUserUid = localStorage.getItem('uid');

    useEffect(() => {
        if (deviceData) {
            setName(deviceData.name || '');
            setState(deviceData.state || false);
            setCode(deviceData.code || '');
        }
    }, [deviceData]);

    const handleSave = async () => {
        if (!name) {
            alert("O campo Nome é obrigatório.");
            return;
        }

        if (!code && !deviceData) {
            alert("O campo Código é obrigatório.");
            return;
        }

        const newDevice = {
            state,
            code,
            usersData: [{ uid: currentUserUid, name: name }],
            uids: [currentUserUid]
        };

        try {
            debugger
            if (deviceData?.id) {
                let usersDataArray = deviceData.usersData || [];
                let uidsArray = deviceData.uids || [];

                const userIndex = usersDataArray.findIndex(user => user.uid === currentUserUid);
                const uidExists = uidsArray.includes(currentUserUid);

                if (userIndex !== -1) {
                    usersDataArray[userIndex].name = name;
                } else {
                    usersDataArray.push({ uid: currentUserUid, name: name });
                }

                if (!uidExists) {
                    uidsArray.push(currentUserUid);
                }

                await db.collection('devices').doc(deviceData.id).update({
                    usersData: usersDataArray,
                    uids: uidsArray
                });
            } else {
                const deviceQueryUser = await db.collection('devices')
                    .where('code', '==', code)
                    .where('uids', 'array-contains', currentUserUid)
                    .get();

                const deviceQuery = await db.collection('devices')
                    .where('code', '==', code)
                    .get();

                if (!deviceQuery.empty || !deviceQueryUser.empty) {
                    const existingDeviceDoc = !deviceQuery.empty ? deviceQuery.docs[0] : deviceQueryUser.docs[0];
                    const existingDeviceId = existingDeviceDoc.id;

                    let usersDataArray = existingDeviceDoc.data().usersData || [];
                    let uidsArray = existingDeviceDoc.data().uids || [];

                    const userExists = usersDataArray.some(user => user.uid === currentUserUid);
                    const uidExists = uidsArray.includes(currentUserUid);

                    if (!userExists) {
                        usersDataArray.push({ uid: currentUserUid, name: name });
                    }

                    if (!uidExists) {
                        uidsArray.push(currentUserUid);
                    }

                    await db.collection('devices').doc(existingDeviceId).update({
                        usersData: usersDataArray,
                        uids: uidsArray
                    });
                } else {
                    alert("O código inserido é inexistente.");
                }
            }
            handleClose();
        } catch (error) {
            alert("Ocorreu um erro ao salvar o dispositivo: " + error.message);
        }
    };

    const handleDelete = async () => {
        try {
            if (deviceData?.id) {
                let usersDataArray = deviceData.usersData || [];
                let uidsArray = deviceData.uids || [];

                usersDataArray = usersDataArray.filter(user => user.uid !== currentUserUid);
                uidsArray = uidsArray.filter(uid => uid !== currentUserUid);

                await db.collection('devices').doc(deviceData.id).update({
                    usersData: usersDataArray,
                    uids: uidsArray
                });
                handleClose();
            }
        } catch (error) {
            alert("Ocorreu um erro ao remover o usuário do dispositivo: " + error.message);
        }
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
        >
            <Box className="modalBox">
                <h2 className="modalHeader">{deviceData ? 'Editar Dispositivo' : 'Adicionar Novo Dispositivo'}</h2>
                <TextField
                    label="Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                />
                {!deviceData && (
                    <TextField
                        label="Código"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        fullWidth
                        margin="normal"
                        required
                    />
                )}
                <FormControl fullWidth margin="normal">
                    <FormControlLabel
                        control={
                            <Switch
                                checked={state}
                                onChange={(e) => setState(e.target.checked)}
                                color="primary"
                            />
                        }
                        label={state ? "Ligado" : "Desligado"}
                    />
                </FormControl>
                <Box className="modalActions">
                    <Button onClick={handleClose}>Cancelar</Button>
                    {deviceData?.id && (
                        <Button variant="contained" color="secondary" onClick={handleDelete}>Excluir</Button>
                    )}
                    <Button variant="contained" color="primary" onClick={handleSave}>Salvar</Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default DeviceModal;
