import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import MenuOptions from '../components/menu/menu';
import ApiRest from '../components/apirest/apirest';
import '../css/App.css';
import Profile from './profilePage';
import Scene from './scenePage';
import ProfileEdit from './profilePageEdit';
import FogotPassword from './fogotPassword';
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
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();

  return (
    <React.Fragment>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/scene" element={<Scene />} />
        <Route path="/profileEdit" element={<ProfileEdit />} />
        <Route path="/fogotPassword" element={<FogotPassword />} />
        <Route path="/slides" element={<Slideshow />} />
        <Route path="/" element={<AutenticationPage />} />
        <Route path="/apirest" element={<ApiRest />} />
        {/* Redireciona para / se a rota não existir */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {(location.pathname !== "/auth" && location.pathname !== "/fogotPassword" && location.pathname !== "/slides" && location.pathname !== "/" && location.pathname !== "/apirest") && <MenuOptions />}
    </React.Fragment>
  );
}

export default App;
