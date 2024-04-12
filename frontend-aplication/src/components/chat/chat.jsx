import React, { useState, useEffect } from 'react';
import { db, realTimeDB } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import LogoJA from '../../img/userUnknow.png';
import './chat.css';

const Chat = ({ email, user }) => {
    const history = useNavigate();
    const [message, setMessage] = useState('');
    const [chatId, setChatId] = useState('');
    const [messages, setMessages] = useState([]);
    const [messagesRef, setMessagesRef] = useState(null); // Definir messagesRef como um estado

    function returnPage() {
        history('/team');
    }

    useEffect(() => {
        setChatId('');
        setMessages([])
        if (!user || !user.email) {
            console.error('Usuário ou email não definido.');
            return;
        }

        const setupChat = async () => {
            try {
                const chatsRef = db.collection('chats');
                const userEmails = [email, user.email];
                const userChatQuery = chatsRef.where('emails', 'array-contains', userEmails[0]);

                userChatQuery.get().then((snapshot) => {
                    const chats = [];
                    snapshot.forEach((doc) => {
                        const chat = doc.data();
                        if (chat.emails.includes(userEmails[0]) && chat.emails.includes(userEmails[1])) {
                            chats.push({ id: doc.id, ...chat });
                        }
                    });
                    if (chats.length === 0) {
                        chatsRef.add({ emails: [user.email, email] })
                            .then((newChatRef) => {
                                setChatId(newChatRef.id);
                                fetchMessages(newChatRef.id);
                            })
                            .catch((error) => {
                                console.log("Erro ao adicionar novo chat:", error);
                            });
                    } else {
                        const chatId = chats[0].id;
                        setChatId(chatId);
                        fetchMessages(chatId);
                    }
                }).catch((error) => {
                    console.log("Erro ao obter chats:", error);
                });


            } catch (error) {
                console.error('Erro ao configurar o chat:', error);
            }
        };


        const fetchMessages = (chatId) => {
            const ref = realTimeDB.ref(`chats/${chatId}/messages`);
            setMessagesRef(ref);

            ref.on('value', snapshot => {
                const messageData = snapshot.val();
                if (messageData) {
                    const messageList = Object.keys(messageData).map(key => ({
                        id: key,
                        ...messageData[key]
                    }));
                    setMessages(messageList);
                } else {
                    setMessages([]);
                }
            });
        };

        setupChat();

        // Clean up
        return () => {
            if (messagesRef) {
                messagesRef.off('value');
            }
        };
    }, [user]);

    const sendMessage = (chatId) => {
        if (message.trim() !== '') {
            const timestamp = Date.now();
            const newMessageRef = realTimeDB.ref(`chats/${chatId}/messages`).push();
            newMessageRef.set({
                user: email,
                text: message,
                timestamp: timestamp
            });
            setMessage('');
        }
    };

    return (
        <div className="chat-container" style={{ position: 'relative', display: 'inline-block' }}>
            <div className='headerChat'>
                <button className="configsButton" onClick={returnPage}>
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={user.img ? user.img : LogoJA} alt="Profile" className="profilesImg" />
                </div>
                <div className='functionLabel'>
                    <h2>{user.name ? user.name : 'Nome Indefinido'}</h2>
                    <h4>{user.team ? user.team : 'Time Indefinido'}</h4>
                </div>
            </div>
            <div className="chat-messages" >
                {messages.map(msg => (
                    <div className={`align-${msg.user === email ? 'right' : 'left'}`} key={msg.id}>
                        <div className={`message ${msg.user === email ? 'sent' : 'received'}`}>
                            <div className="message-content">
                                <strong>{msg.user === email ? 'eu' : user.name}:</strong>
                                {msg.text}
                                <span className="timestamp">
                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="input-container">
                <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                />
                <button onClick={() => sendMessage(chatId)}>Enviar</button>
            </div>
        </div>
    );
};

export default Chat;
