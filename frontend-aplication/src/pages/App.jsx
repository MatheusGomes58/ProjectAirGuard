import React, { useEffect, useState } from 'react';
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
import DevicePage from './devicePage';
import Slideshow from './slideshow';
import data from '../data/config.json';
import MapPage from './mapPage';
import ThemeManager from '../components/ThemeManager/ThemeManager';
import LanguageFab from '../components/LanguageFab/LanguageFab';
import { LocaleProvider, useLocale } from '../context/LocaleContext';
import PrivateRoute from '../components/PrivateRoute/PrivateRoute';

function App() {
  useEffect(() => {
    console.log("API URL:", data.propsValis);
  }, []);

  return (
    <LocaleProvider>
      <Router>
        <div className="app-shell">
          <AppContent />
        </div>
      </Router>
    </LocaleProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const { locale } = useLocale();
  const hideMenu = ['/', '/forgotPassword', '/slides', '/apirest'].includes(location.pathname) || location.pathname.startsWith('/device/');
  const isSlides = location.pathname === '/slides';

  // Force re-render of non-slide pages when locale changes
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    window.addEventListener('localechange', handler);
    return () => window.removeEventListener('localechange', handler);
  }, []);

  return (
    <>
      {!isSlides && <ThemeManager />}
      {!isSlides && <LanguageFab />}
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<AutenticationPage />} />
        <Route path="/forgotPassword" element={<ForgotPassword />} />

        {/* ── Protected routes ── */}
        <Route path="/home" element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/device/:deviceId" element={<PrivateRoute><DevicePage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/scene" element={<PrivateRoute><Scene /></PrivateRoute>} />
        <Route path="/profileEdit" element={<PrivateRoute><ProfileEdit /></PrivateRoute>} />
        <Route path="/slides" element={<Slideshow />} />
        <Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />
        <Route path="/apirest" element={<PrivateRoute><ApiRest /></PrivateRoute>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideMenu && <MenuOptions />}
    </>
  );
}

export default App;
