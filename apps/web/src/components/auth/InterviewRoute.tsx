import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/** Live interview room — account holder or invite-link participant. */
export default function InterviewRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isInterviewAuthenticated = useAuthStore((s) => s.isInterviewAuthenticated);

  if (!isInterviewAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
