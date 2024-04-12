import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import AutenticationPage from './autentication';
import HomePage from './homePage';
import MenuOptions from '../components/menu/menu';
import '../css/App.css';
import SchedulePage from './schedulePage';
import TeamPage from './teamPage';
import Profile from './profilePage';
import ChatPage from './chatPage';
import FogotPassword from './fogotPassword';
import MissionsPage from './missionsPage';
import MissionsListPage from './missionsListPage';
import MissionPage from './missionPage';
import MissionCreationPage from './missionCreationPage';

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
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/missions" element={<MissionsPage />} />
        <Route path="/fogotPassword" element={<FogotPassword />} />
        <Route path="/missionslist" element={<MissionsListPage />} />
        <Route path="/mission" element={<MissionPage />} />
        <Route path="/missioncreation" element={<MissionCreationPage />} />
        <Route path="/" element={<AutenticationPage />} />
      </Routes>
      {(location.pathname !== "/" && location.pathname !== "/fogotPassword") && <MenuOptions />}
    </React.Fragment>
  );
}

export default App;
