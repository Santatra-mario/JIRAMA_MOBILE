import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell.jsx';
import Sidebar from '../../components/admin/Sidebar.jsx';
import Header from '../../components/admin/Header.jsx';
import AgentLayout from '../../components/admin/agent/AgentLayout.jsx';
import ResponsableLayout from '../../components/admin/responsable/ResponsableLayout.jsx';

function readCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export default function SharedSupportLayout({ title, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useMemo(readCurrentUser, []);
  const role = String(user?.role || '').trim().toUpperCase();
  const pathname = location.pathname;

  if (role === 'AGENT') {
    return <AgentLayout title={title}>{children}</AgentLayout>;
  }

  if (role === 'RESPONSABLE') {
    return <ResponsableLayout title={title}>{children}</ResponsableLayout>;
  }

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/', { replace: true });
  };

  return (
    <AdminShell intensite="calme">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activePath={pathname}
        onNavigate={navigate}
        onLogout={logout}
        user={user}
      />
      <div className="min-h-screen lg:pl-72">
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          onProfile={() => navigate('/dashboard/admin/parametres')}
          onNotifications={() => navigate('/dashboard/admin/notifications')}
          user={user}
        />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </AdminShell>
  );
}
