import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Code2, LogOut, Calendar, Library } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-accent/10 text-accent-glow'
      : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
  }`;

export default function DashboardLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      <header className="glass border-b border-border shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold">
              Interview<span className="text-accent-glow">OS</span>
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            <NavLink to="/dashboard" end className={navLinkClass}>
              <Calendar className="w-4 h-4" />
              Interviews
            </NavLink>
            <NavLink to="/dashboard/questions" className={navLinkClass}>
              <Library className="w-4 h-4" />
              Question Bank
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary hidden md:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>

        <div className="sm:hidden max-w-6xl mx-auto px-6 pb-3 flex gap-2">
          <NavLink to="/dashboard" end className={navLinkClass}>
            <Calendar className="w-4 h-4" />
            Interviews
          </NavLink>
          <NavLink to="/dashboard/questions" className={navLinkClass}>
            <Library className="w-4 h-4" />
            Question Bank
          </NavLink>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
