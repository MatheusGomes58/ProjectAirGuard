import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../components/firebase/firebase';
import '../css/profilePage.css';
import LogoUnknow from '../img/userUnknow.png';

function ProfilePage() {
    const [user, setUser] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        userValidation();
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



    useEffect(() => {
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

        const unsubscribe = getUserFromFirestore();

        return () => {
            unsubscribe();
        };
    }, []);

    if (user.admin) {
        localStorage.setItem('admin', user.admin)
    }

    function editUserAcess() {
        localStorage.removeItem('editUser');
        navigate('/profileEdit');
    }

    function acessMissionsPage() {
        navigate('/missions');
    }

    return (
        <div className="profilePage">
            <div className='containerHome'>
                <div className="profileImage" style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={user.img ? user.img : LogoUnknow} alt="Profile" className="profileImg" />
                    <button className='configButton' onClick={editUserAcess}>
                        <i className="fas fa-cog"></i>
                    </button>
                </div>

                <h2 className='functionLabel'>{user.name ? user.name : 'Nome Indefinido'}</h2>
            </div>
            <div className='containerHome'>
                <div className="Card">
                    <input type="text" placeholder="Email:" value={user.email ? user.email : 'Email Indefinido'} readOnly />
                    <input type="text" placeholder="Nome:" value={user.address ? user.address : 'Endereço Indefinido'} readOnly />
                    <input type="text" placeholder="Nome:" value={user.city ? user.city : 'Cidade Indefinido'} readOnly />
                    <input type="text" placeholder="Nome:" value={user.state ? user.state : 'Estado Indefinido'} readOnly />
                    <input type="text" placeholder="Nome:" value={user.country ? user.country : 'Pais Indefinido'} readOnly />
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;
