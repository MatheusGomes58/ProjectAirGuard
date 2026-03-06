import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../components/firebase/firebase.jsx';
import { auth } from '../components/firebase/firebase.jsx';
import UserUnknow from '../img/userUnknow.png';
import '../css/profilePageEdit.css';
import { useLocale } from '../context/LocaleContext';

function ProfilePageEdit() {
    const { t } = useLocale();
    const [user, setUser] = useState({});
    const [editableFields, setEditableFields] = useState({
        name: '',
        email: '',
        address: '',
        city: '',
        state: '',
        country: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        userValidation();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditableFields({ ...editableFields, [name]: value });
    };

    async function userValidation() {
        const authTime = localStorage.getItem('authTime');
        if (!authTime) { navigate('/'); return; }
        const currentTime = new Date().getTime();
        const timeElapsed = currentTime - parseInt(authTime, 10);
        if (timeElapsed > 3 * 60 * 60 * 1000) { navigate('/'); return; }

        const userEmail = localStorage.getItem('email');
        try {
            const userEdit = localStorage.getItem('editUser');
            let userQuerySnapshot;
            if (userEdit) {
                userQuerySnapshot = await db.collection('users').where('email', '==', userEdit).get();
            } else {
                userQuerySnapshot = await db.collection('users').where('email', '==', userEmail).get();
            }
            if (!userQuerySnapshot.empty) {
                userQuerySnapshot.forEach(doc => {
                    const userData = doc.data();
                    setUser({ id: doc.id, ...userData });
                    setEditableFields({
                        address: userData.address || '',
                        city: userData.city || '',
                        state: userData.state || '',
                        country: userData.country || '',
                        name: userData.name || '',
                        email: userData.email || '',
                    });
                });
            }
        } catch (error) {
            console.error('Erro ao recuperar informações do usuário do Firestore:', error);
        }
    }

    const handleImageClick = () => {
        const confirmChange = window.confirm(t('confirmChangePhoto'));
        if (confirmChange) document.getElementById('fileInput').click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            setIsLoading(true);
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`users/${file.name}`);
            await fileRef.put(file);
            const fileUrl = await fileRef.getDownloadURL();
            await db.collection('users').doc(user.id).update({ img: fileUrl });
            setIsLoading(false);
            setUser(prev => ({ ...prev, img: fileUrl }));
        }
    };

    const handleEditButtonClick = async () => {
        if (!isEditing) { setIsEditing(true); return; }
        try {
            await db.collection('users').doc(user.id).update({
                address: editableFields.address,
                city: editableFields.city,
                state: editableFields.state,
                country: editableFields.country,
                name: editableFields.name,
                email: editableFields.email,
            });
            setIsEditing(false);
            localStorage.removeItem('editUser');
            navigate(-1);
        } catch (error) {
            console.error('Erro ao atualizar informações do usuário:', error);
        }
    };

    function logout() {
        localStorage.clear();
        navigate('/');
    }

    return (
        <div className="ProfilePageEdit">
            <div className='containerProfile'>
                <div className="profileImage" onClick={handleImageClick} style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={user.img ? user.img : UserUnknow} alt="Profile" className="profileImg" />
                    <button className='configButton'>
                        <i className="fas fa-pencil-alt"></i>
                    </button>
                </div>
                {isLoading && <div className="loadingOverlay">Carregando...</div>}
                <input
                    className='inputFunction'
                    type="text"
                    name="name"
                    placeholder={t('namePlaceholder')}
                    value={editableFields.name}
                    onChange={handleChange}
                />
                <input id="fileInput" type="file" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>

            <div className='containerProfile'>
                <div className="profileCard">
                    <input className='inputText' type="text" name="email"
                        placeholder={t('emailPlaceholder')} value={editableFields.email}
                        onChange={handleChange} disabled={!isEditing} />
                    <input className='inputText' type="text" name="address"
                        placeholder={t('addressPlaceholder')} value={editableFields.address}
                        onChange={handleChange} disabled={!isEditing} />
                    <input className='inputText' type="text" name="city"
                        placeholder={t('cityPlaceholder')} value={editableFields.city}
                        onChange={handleChange} disabled={!isEditing} />
                    <input className='inputText' type="text" name="state"
                        placeholder={t('statePlaceholder')} value={editableFields.state}
                        onChange={handleChange} disabled={!isEditing} />
                    <input className='inputText' type="text" name="country"
                        placeholder={t('countryPlaceholder')} value={editableFields.country}
                        onChange={handleChange} disabled={!isEditing} />

                    <button className='buttonMissions' onClick={handleEditButtonClick} disabled={isLoading}>
                        <h2>{isEditing ? t('save') : t('enableEdit')}</h2>
                    </button>
                    <button className='buttonLogout' onClick={logout}>
                        <i className="fas fa-sign-out-alt"></i>
                        <h2>{t('logout')}</h2>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProfilePageEdit;
