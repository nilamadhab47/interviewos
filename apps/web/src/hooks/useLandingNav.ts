import { useAuthStore } from '@/stores/authStore';

/** Routes for landing-page CTAs */
export function useLandingNav() {
  const isLoggedIn = useAuthStore((s) => Boolean(s.accessToken && s.user));

  return {
    login: '/login',
    /** Primary “get started” — create account or open the app */
    start: isLoggedIn ? '/dashboard' : '/register',
    /** Marketing CTAs (Start Free, trials, etc.) */
    startFree: isLoggedIn ? '/dashboard' : '/login',
  };
}
