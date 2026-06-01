import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { setAuthRefreshHandler } from '@/lib/api';
import AuthLoadingScreen from './AuthLoadingScreen';

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    setAuthRefreshHandler(refreshToken);
    initializeAuth();
  }, [initializeAuth, refreshToken]);

  if (!isInitialized) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}
