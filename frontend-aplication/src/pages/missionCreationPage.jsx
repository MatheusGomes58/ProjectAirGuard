import React, { useState, useEffect } from 'react';
import { db, storage } from '../components/firebase/firebase';
import LogoJA from '../img/logo.png';
import Slides from '../components/slideShow/slideShow';
import '../css/missionCreationPage.css';

function MissionCreationPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [context, setContext] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [images, setImages] = useState([]);
    const [imageUrls, setImageUrls] = useState([]);

    useEffect(() => {
        // Fetch teams from the database
        const fetchTeams = async () => {
            try {
                const teamsSnapshot = await db.collection('teams').get();
                const teamsData = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTeams(teamsData);
            } catch (error) {
                console.error('Error fetching teams:', error);
            }
        };

        fetchTeams();
    }, []);

    useEffect(() => {
        // Fetch users based on selected team
        const fetchUsers = async () => {
            try {
                let usersQuery = db.collection('users');
                if (selectedTeam) {
                    usersQuery = usersQuery.where('team', '==', selectedTeam);
                }
                const usersSnapshot = await usersQuery.get();
                const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUsers(usersData);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, [selectedTeam]);

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

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            // Upload images to Firebase Storage
            const uploadTasks = images.map(image => storage.ref(`missionsImages/${image.name}`).put(image));
            await Promise.all(uploadTasks);

            // Get download URLs of uploaded images
            const imageUrls = await Promise.all(uploadTasks.map(task => task.snapshot.ref.getDownloadURL()));

            // Map selected users to their emails
            const selectedUsersEmails = selectedUsers.map(userId => {
                const user = users.find(user => user.id === userId);
                return user.email;
            });

            // Add mission to Firestore with image URLs and user emails
            const missionRef = await db.collection('missions').add({
                title,
                description,
                context,
                imageUrls,
                email: selectedUsersEmails, // Saving only emails of selected users
                team: selectedTeam // Save selected team
            });
            console.log('Mission created with ID: ', missionRef.id);

            setTitle('');
            setDescription('');
            setContext('');
            setImages([]);
            setSelectedUsers([]);
            setSelectedTeam('');
        } catch (error) {
            console.error('Error creating mission:', error);
        }
    };

    return (
        <div className="missionCreationPage">
            <div className='containerMission'>
                <img src={LogoJA} className='LogoJA' />
                <h2 className='functionLabel'>Criar Missão</h2>
            </div>
            <div className='containerMission'>
                <Slides images={images} />
            </div>
            <div className='containerMission'>
                <div className='missionsCard'>
                    <form onSubmit={handleSubmit}>
                        <label>Title:</label>
                        <input className='inputText' type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />

                        <div className='textareaContainer'>
                            <label>Description:</label>
                            <textarea className='inputText' value={description} onChange={(e) => setDescription(e.target.value)} required />
                        </div>

                        <div className='textareaContainer'>
                            <label>Context:</label>
                            <textarea className='inputText' value={context} onChange={(e) => setContext(e.target.value)} required />
                        </div>

                        <div className='selectContainer'>
                            <label>Team:</label>
                            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
                                <option value="">Select Team</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.name}>{team.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className='selectedUsersContainer'>
                            <label>Selected Users:</label>
                            <div className="user-select">
                                {users.map(user => (
                                    <label key={user.id} className='row'>
                                        <input
                                            className='checkbox'
                                            type="checkbox"
                                            value={user.id}
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedUsers([...selectedUsers, user.id]);
                                                } else {
                                                    setSelectedUsers(selectedUsers.filter(userId => userId !== user.id));
                                                }
                                            }}
                                        />
                                        {user.name}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className='fileInputContainer'>
                            <label>Images:</label>
                            <input type="file" accept="image/*" multiple onChange={handleImageChange} />
                        </div>


                        <button className='buttonMissions' type="submit">Create Mission</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default MissionCreationPage;
