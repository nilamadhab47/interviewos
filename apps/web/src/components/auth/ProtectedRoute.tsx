import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/** Requires a logged-in account (not interview guest token). */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isUserAuthenticated = useAuthStore((s) => s.isUserAuthenticated);

  if (!isUserAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
