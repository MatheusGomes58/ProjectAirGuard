import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import MenuOptions from '../components/menu/menu';
import '../css/App.css';
import Profile from './profilePage';
import FogotPassword from './fogotPassword';
import AutenticationPage from './autentication';
import HomePage from './homePage';
import PortfolioPage from './PortfolioPage';
import Slideshow from './slideshow';

function App() {
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
        <Route path="/fogotPassword" element={<FogotPassword />} />
        <Route path="/auth" element={<AutenticationPage />} />
        <Route path="/slides" element={<Slideshow />} />
        <Route path="/" element={<PortfolioPage />} />
      </Routes>
      {(location.pathname !== "/auth" && location.pathname !== "/fogotPassword" && location.pathname !== "/slides" && location.pathname !== "/") && <MenuOptions />}
    </React.Fragment>
  );
}

export default App;
