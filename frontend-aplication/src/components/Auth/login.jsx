import React, { useState } from 'react';
import { auth } from '../firebase/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './login.css';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const history = useNavigate();

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleLogin = async () => {
    // Autenticação com e-mail e senha
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        localStorage.setItem('authTime', new Date().getTime().toString());
        localStorage.setItem('email',email);
        console.log('Usuário logado:', user);
        history('/home');
      })
      .catch((error) => {
        // Tratar erros de login
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Erro no login:', errorCode, errorMessage);
        // Adicione aqui a manipulação de erros
      });
  };

  const handleForgotPassword = () => {
    history('/fogotPassword');
  };

  return (
    <div id="loginForm">
      <input
        className="inputLogin"
        type="email"
        id="email"
        placeholder="Entrar com email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div className="password-container">
        <input
          className="inputLogin"
          type={passwordVisible ? 'text' : 'password'}
          id="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <span className="toggle-password" onClick={togglePasswordVisibility}>
          {passwordVisible ? <i className="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i>}
        </span>
      </div>
      <a className="resetPass" onClick={handleForgotPassword}>Esqueceu sua senha?</a>
      <div className="boxButton">
        <button className="btnAuth" onClick={handleLogin}>Log In</button>
      </div>
    </div>
  );
}

export default LoginForm;
