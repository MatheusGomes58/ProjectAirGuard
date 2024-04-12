import React, { useState, useEffect } from 'react';
import Members from '../components/members/members';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../components/firebase/firebase';
import '../css/teamPage.css';
import LogoJA from '../img/logo.png';

function TeamPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [user, setUser] = useState({});

    useEffect(() => {
        getUserFromFirestore();
        userValidation();
        fetchUsers();
    }, []);

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

    async function fetchUsers() {
        const userEmail = localStorage.getItem('email');
        try {
            const usersCollection = await db.collection('users').get();

            const usersData = usersCollection.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(user => user.email !== userEmail);

            setUsers(usersData);
        } catch (error) {
            console.error('Error fetching users: ', error);
        }
    }

    const getUserFromFirestore = () => {
        const userEmail = localStorage.getItem('email');
        return db.collection('users')
            .where('email', '==', userEmail)
            .onSnapshot(snapshot => {
                if (!snapshot.empty) {
                    const userData = snapshot.docs[0].data();
                    const userId = snapshot.docs[0].id;
                    setUser({ id: userId, ...userData }); // Adicionando o ID do documento aos dados do usuário
                }
            });
    };

    return (
        <div className="teamPage">
            <div className='containerTeam'>
                <img src={LogoJA} className='LogoJA' />
                <h2 className='functionLabel'>Membros</h2>
            </div>
            <div className='containerTeam'>
                <Members
                    users={!user.admin ? users.filter(user => user.status === true) : users}
                    isAdmin={user.admin}
                />
            </div>
        </div>
    );
}

export default TeamPage;
