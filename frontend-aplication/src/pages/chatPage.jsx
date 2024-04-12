import React, { useState, useEffect } from 'react';
import Chat from '../components/chat/chat';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../components/firebase/firebase';
import '../css/chatPage.css';
import LogoJA from '../img/logo.png';

function ChatPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState({});
    const [userChat, setUserChat] = useState({});

    useEffect(() => {
        getUserFromFirestore();
        userValidation();
    }, []);

    const storedUser = localStorage.getItem('chat');

    useEffect(() => {
        try {
            const parsedUser = JSON.parse(storedUser);
            setUserChat(parsedUser ? parsedUser : {});
        } catch (error) {
            console.error('Erro ao analisar o usuário do localStorage:', error);
        }
    }, [storedUser]);

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

    const userEmail = localStorage.getItem('email');

    const getUserFromFirestore = () => {
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
        <div className="chatPage">
            <div className='containerChat'>
                <img src={LogoJA} className='LogoJA' />
                <h2 className='functionLabel'>Membros</h2>
            </div>
            <div className='containerChat'>
                <Chat
                    email={userEmail}
                    user={userChat}
                />
            </div>
        </div>
    );
}

export default ChatPage;
