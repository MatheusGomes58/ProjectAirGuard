import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import MenuOptions from '../components/menu/menu';
import ApiRest from '../components/apirest/apirest';
import '../css/App.css';
import Profile from './profilePage';
import Scene from './scenePage';
import ProfileEdit from './profilePageEdit';
import ForgotPassword from './fogotPassword';
import AutenticationPage from './autentication';
import HomePage from './homePage';
import Slideshow from './slideshow';
import data from '../data/config.json';

function App() {
  useEffect(() => {
    console.log("API URL:", data.propsValis);
  }, []);

  return (
    <Router>
      <div className="app-shell">
        <AppContent />
      </div>
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const hideMenu = ['/', '/forgotPassword', '/slides', '/apirest'].includes(location.pathname);

  return (
    <>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/scene" element={<Scene />} />
        <Route path="/profileEdit" element={<ProfileEdit />} />
        <Route path="/forgotPassword" element={<ForgotPassword />} />
        <Route path="/slides" element={<Slideshow />} />
        <Route path="/" element={<AutenticationPage />} />
        <Route path="/apirest" element={<ApiRest />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideMenu && <MenuOptions />}
    </>
  );
}

export default App;
