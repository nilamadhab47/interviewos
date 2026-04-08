import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface JoinResult {
  session: { id: string; title: string; language: string };
  participant: { id: string; name: string; role: string };
  accessToken: string;
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setSessionAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    api<JoinResult>(`/api/sessions/join/${token}`)
      .then((result) => {
        // Store the session token so SessionPage can use it
        if (result.accessToken) {
          setSessionAuth(result.accessToken, result.participant, result.session.id);
        }
        navigate(`/session/${result.session.id}`, { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Invalid or expired invite link');
      });
  }, [token, navigate, setSessionAuth]);

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
            <Code2 className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Unable to Join</h1>
          <p className="text-sm text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-text-muted">Joining session...</p>
      </div>
    </div>
  );
}
