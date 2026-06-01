import { Routes, Route } from 'react-router-dom';
import AuthBootstrap from '@/components/auth/AuthBootstrap';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import GuestRoute from '@/components/auth/GuestRoute';
import InterviewRoute from '@/components/auth/InterviewRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import InterviewsDashboardPage from './pages/dashboard/InterviewsDashboardPage';
import ScheduleInterviewPage from './pages/dashboard/ScheduleInterviewPage';
import QuestionBankPage from './pages/dashboard/QuestionBankPage';
import QuestionFormPage from './pages/dashboard/QuestionFormPage';
import SessionPage from './pages/SessionPage';
import ReplayPage from './pages/ReplayPage';
import JoinPage from './pages/JoinPage';

function App() {
  return (
    <AuthBootstrap>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<InterviewsDashboardPage />} />
          <Route path="interviews/new" element={<ScheduleInterviewPage />} />
          <Route path="questions" element={<QuestionBankPage />} />
          <Route path="questions/new" element={<QuestionFormPage />} />
          <Route path="questions/:id/edit" element={<QuestionFormPage />} />
        </Route>

        <Route
          path="/session/:id"
          element={
            <InterviewRoute>
              <SessionPage />
            </InterviewRoute>
          }
        />
        <Route
          path="/replay/:id"
          element={
            <ProtectedRoute>
              <ReplayPage />
            </ProtectedRoute>
          }
        />

        <Route path="/join/:token" element={<JoinPage />} />
      </Routes>
    </AuthBootstrap>
  );
}

export default App;
