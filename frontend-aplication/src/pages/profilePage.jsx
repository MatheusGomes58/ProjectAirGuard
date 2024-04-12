import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, storage } from '../components/firebase/firebase';
import UserUnknow from '../img/userUnknow.png';
import Switch from '../components/switch/switch';
import '../css/profilePage.css';

function ProfilePage() {
    const [user, setUser] = useState({});
    const [admin, setAdmin] = useState(false);
    const [editableFields, setEditableFields] = useState({
        name: '',
        age: '',
        team: '',
        status: false,
        leader: false,
        admin: false,
        function: '',
        adminMessage: '' // New state for admin message
    });
    const [teams, setTeams] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        userValidation();
        fetchAdminMessage();
        fetchTeams();
    }, []);

    async function fetchTeams() {
        try {
            const teamsSnapshot = await db.collection('teams').get();
            const teamsList = teamsSnapshot.docs.map(doc => doc.data().name);
            setTeams(teamsList);
        } catch (error) {
            console.error('Erro ao recuperar times do Firestore:', error);
        }
    }

    async function fetchAdminMessage() {
        try {
            const messageSnapshot = await db.collection('mensagers').where('mensager', '==', 'missionsListPage').get();
            if (!messageSnapshot.empty) {
                const messageData = messageSnapshot.docs[0].data();
                setEditableFields(prevState => ({
                    ...prevState,
                    adminMessage: messageData.text || ''
                }));
            }
        } catch (error) {
            console.error('Erro ao recuperar mensagem do Firestore:', error);
        }
    }

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

        const userEmail = localStorage.getItem('email');

        setAdmin(localStorage.getItem('admin'));

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
                        name: userData.name || '',
                        age: userData.age || '',
                        team: userData.team || '',
                        email: userData.email || '',
                        status: userData.status || false,
                        leader: userData.leader || false,
                        admin: userData.admin || false,
                        function: userData.function || ''
                    });
                });
            }
        } catch (error) {
            console.error('Erro ao recuperar informações do usuário do Firestore:', error);
        }
    }

    const handleImageClick = () => {
        const confirmChange = window.confirm("Deseja trocar a foto de perfil?");
        if (confirmChange) {
            document.getElementById('fileInput').click();
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            setIsLoading(true);
            const storageRef = storage.ref();
            const fileRef = storageRef.child(`users/${file.name}`);
            await fileRef.put(file);
            const fileUrl = await fileRef.getDownloadURL();
            await db.collection('users').doc(user.id).update({
                img: fileUrl
            });
            setIsLoading(false);
            setUser(prevUser => ({
                ...prevUser,
                img: fileUrl
            }));
        }
    };

    const handleEditButtonClick = async () => {
        try {
            await db.collection('users').doc(user.id).update({
                name: editableFields.name,
                age: editableFields.age,
                team: editableFields.team,
                status: editableFields.status,
                leader: editableFields.leader,
                admin: editableFields.admin,
                function: editableFields.function
            });
            console.log('Informações do usuário atualizadas com sucesso.');

            if (admin) {
                await db.collection('mensagers').where('mensager', '==', 'missionsListPage').get()
                    .then(querySnapshot => {
                        querySnapshot.forEach(doc => {
                            doc.ref.update({
                                text: editableFields.adminMessage
                            });
                        });
                    });
            }

            localStorage.removeItem('editUser');
            navigate(-1);
        } catch (error) {
            console.error('Erro ao atualizar informações do usuário ou mensagem do administrador:', error);
        }
    };


    return (
        <div className="ProfilePage">
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
                    placeholder="Cargo:"
                    value={editableFields.function}
                    onChange={(e) => setEditableFields({ ...editableFields, function: e.target.value })}
                    readOnly={!admin}
                />
                <input id="fileInput" type="file" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
            <div className='containerProfile'>
                <div className="profileCard">
                    <input
                        className='inputText'
                        type="text"
                        placeholder="Email:"
                        value={editableFields.email}
                        readOnly
                    />
                    <input
                        className='inputText'
                        type="text"
                        placeholder="Nome:"
                        value={editableFields.name}
                        onChange={(e) => setEditableFields({ ...editableFields, name: e.target.value })}
                    />
                    <input
                        className='inputText'
                        type="number"
                        placeholder="Idade:"
                        value={editableFields.age}
                        onChange={(e) => setEditableFields({ ...editableFields, age: e.target.value })}
                    />
                    {admin && (
                        <input
                            className='inputText'
                            type="text"
                            placeholder="Protocolo:"
                            value={editableFields.adminMessage}
                            onChange={(e) => setEditableFields({ ...editableFields, adminMessage: e.target.value })}
                        />
                    )}
                    <div className='selectContainer'>
                        <select
                            value={editableFields.team}
                            onChange={(e) => setEditableFields({ ...editableFields, team: e.target.value })}
                            disabled={admin ? false : true}
                        >
                            <option value="">Selecione um time</option>
                            {teams.map((team, index) => (
                                <option key={index} value={team}>{team}</option>
                            ))}
                        </select>
                    </div>

                    {admin && (
                        <div>
                            <Switch
                                id={'statusUser'}
                                label={'Status'}
                                status={editableFields.status}
                                onToggle={() => setEditableFields({ ...editableFields, status: !editableFields.status })}
                            />
                            <Switch
                                id={'leaderUser'}
                                label={'Líder de Equipe'}
                                status={editableFields.leader}
                                onToggle={() => setEditableFields({ ...editableFields, leader: !editableFields.leader })}
                            />
                            <Switch
                                id={'adminUser'}
                                label={'Administrador'}
                                status={editableFields.admin}
                                onToggle={() => setEditableFields({ ...editableFields, admin: !editableFields.admin })}
                            />
                        </div>
                    )}
                    <button className='buttonMissions' onClick={handleEditButtonClick} disabled={isLoading}>
                        <h2>Editar</h2>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;
