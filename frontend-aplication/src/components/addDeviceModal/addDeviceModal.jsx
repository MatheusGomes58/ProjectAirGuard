import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebase.jsx';
import { Modal, Box, Button, TextField, FormControl, Switch, FormControlLabel } from '@mui/material';
import './addDeviceModal.css';
import { t } from '../../utils/i18n';

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
        if (!name) { alert(t('fieldNameRequired')); return; }
        if (!code && !deviceData) { alert(t('fieldCodeRequired')); return; }

        const newDevice = {
            state,
            code,
            usersData: [{ uid: currentUserUid, name: name }],
            uids: [currentUserUid]
        };

        try {
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
                    alert(t('codeNotFound'));
                }
            }
            handleClose();
        } catch (error) {
            alert(t('saveError') + ' ' + error.message);
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
            alert(t('deleteError') + ' ' + error.message);
        }
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
        >
            <Box className="modalBox">
                <h2 className="modalHeader">{deviceData ? t('editDevice') : t('addNewDevice')}</h2>
                <TextField
                    label={t('labelName')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                />
                {!deviceData && (
                    <TextField
                        label={t('labelCode')}
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
                        label={state ? t('deviceOn') : t('deviceOff')}
                    />
                </FormControl>
                <Box className="modalActions">
                    <Button onClick={handleClose}>{t('cancel')}</Button>
                    {deviceData?.id && (
                        <Button variant="contained" color="secondary" onClick={handleDelete}>{t('delete')}</Button>
                    )}
                    <Button variant="contained" color="primary" onClick={handleSave}>{t('save')}</Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default DeviceModal;
