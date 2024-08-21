import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import MenuOptions from '../components/menu/menu';
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
  //const [apiUrl, setApiUrl] = useState('');
  
  useEffect(() => {
    console.log("API URL:", data.API_URL);
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
      </Routes>
      {(location.pathname !== "/auth" && location.pathname !== "/fogotPassword" && location.pathname !== "/slides" && location.pathname !== "/") && <MenuOptions />}
    </React.Fragment>
  );
}

export default App;
