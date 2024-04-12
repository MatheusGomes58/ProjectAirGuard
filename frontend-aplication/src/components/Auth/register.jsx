import React, { useState } from 'react';
import { auth, db } from '../firebase/firebase'; // Importe o firestore também
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore'; // Importe as funções necessárias para o Firestore
import './login.css';

function RegisterForm() {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await addDoc(collection(db, 'users'), {
                email: email,
                name: name,
                status: false
            });

            alert('Usuário cadastrado com sucesso!');
            window.location.reload();
        } catch (error) {
            alert(`Erro no cadastro: ${error.message}`);
        }
    };

    return (
        <div id="RegisterForm">
            <input
                className="inputLogin"
                type="text"
                id="NameUser"
                placeholder="Nome do Usuário"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
            />
            <input
                className="inputLogin"
                type="email"
                id="EmailUser"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <div className="password-container">
                <input
                    className="inputLogin"
                    type={passwordVisible ? 'text' : 'password'}
                    id="password"
                    placeholder="Crie uma Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <span className="toggle-password" onClick={togglePasswordVisibility}>
                    {passwordVisible ? <i className="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i>}
                </span>
            </div>
            <div className="password-container">
                <input
                    className="inputLogin"
                    type={passwordVisible ? 'text' : 'password'}
                    id="confirmPassword"
                    placeholder="Confirme a sua Senha"
                    required
                />
                <span className="toggle-password" onClick={togglePasswordVisibility}>
                    {passwordVisible ? <i className="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i>}
                </span>
            </div>
            <div className="boxButton">
                <button className="btnAuth" onClick={handleRegister}>Cadastrar</button>
            </div>
        </div>
    );
}

export default RegisterForm;
