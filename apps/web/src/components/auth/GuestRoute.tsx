import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/** Login / register — redirect to dashboard if already signed in. */
export default function GuestRoute({ children }: { children: React.ReactNode }) {
  const isUserAuthenticated = useAuthStore((s) => s.isUserAuthenticated);

  if (isUserAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
