import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SessionPage from './pages/SessionPage';
import ReplayPage from './pages/ReplayPage';
import JoinPage from './pages/JoinPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/session/:id" element={<SessionPage />} />
      <Route path="/replay/:id" element={<ReplayPage />} />
      <Route path="/join/:token" element={<JoinPage />} />
    </Routes>
  );
}

export default App;
