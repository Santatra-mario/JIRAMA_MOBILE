import { useState } from 'react';

import {
  LayoutDashboard,
  Users,
  UserRound,
  TriangleAlert,
  Settings,
  LogOut,
  X,
  ChevronRight,
  GitCompare,
  ShieldCheck,
  CircleHelp,
} from 'lucide-react';

import ConfirmationDeconnexion from '../ui/ConfirmationDeconnexion.jsx';

function Sidebar({
  isOpen = false,
  onClose,
  activePath = '/dashboard/admin',
  onNavigate,
  onLogout,
  user,
}) {
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);

  const menuItems = [
    { label: 'Tableau de bord', icon: LayoutDashboard, path: '/dashboard/admin' },
    { label: 'Utilisateurs', icon: Users, path: '/dashboard/admin/utilisateurs' },
    { label: 'Abonnés', icon: UserRound, path: '/dashboard/admin/abonnes' },
    { label: 'Anomalies', icon: TriangleAlert, path: '/dashboard/admin/anomalies' },
    { label: 'Comparaison', icon: GitCompare, path: '/dashboard/admin/comparaison' },
  ];

  const nomComplet = user
    ? `${user.prenom || ''} ${user.nom || ''}`.trim()
    : 'Administrateur';

  const email = user?.email || 'admin@jirama.mg';

  const initiales = user
    ? `${user.prenom?.charAt(0) || ''}${user.nom?.charAt(0) || ''}`.toUpperCase()
    : 'AD';

  function handleNavigate(path) {
    if (onNavigate) {
      onNavigate(path);
    }

    if (onClose) {
      onClose();
    }
  }

  return (
    <>
      {/* ---------- Overlay mobile ---------- */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ---------- Sidebar ---------- */}
      <aside
        className={`jr-app-sidebar jr-verre-fort fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-72 flex-col overflow-hidden border-r border-jr-bordure shadow-xl backdrop-blur transition-transform duration-300 motion-reduce:transition-none lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-jr-bordure px-4">
          <div className="flex items-center gap-3">
            {/* Tuile claire : le logo reste lisible en mode sombre */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ffffff] p-1.5 shadow-sm ring-1 ring-jr-bordure transition duration-300 hover:scale-105 motion-reduce:transition-none">
              <img
                src="/images/Jirama.png"
                alt="Logo JIRAMA"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-wide text-jr-titre">
                JIRAMA
              </p>
              <p className="truncate text-[11px] font-medium text-jr-faible">
                Suivi des consommations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-2 text-jr-doux hover:bg-jr-eau-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec lg:hidden"
            aria-label="Fermer le menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Profil */}
        <div className="shrink-0 border-b border-jr-bordure p-3">
          <div className="jr-shell-profile flex items-center gap-3 rounded-2xl bg-jr-eau-pale p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-jr-eau text-sm font-bold text-white">
              {initiales}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-jr-texte">
                {nomComplet}
              </p>
              <p className="truncate text-xs text-jr-faible">{email}</p>
            </div>
          </div>
        </div>

        {/* Navigation principale : hauteur fixe, sans défilement indépendant */}
        <nav className="flex min-h-0 flex-1 flex-col overflow-hidden p-2" aria-label="Navigation administrateur">
          <p className="jr-shell-section-label mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-jr-faible">
            Administration
          </p>

          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = item.path === activePath;

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`jr-shell-nav-link relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec ${
                    active
                      ? 'bg-jr-eau-pale text-jr-lien shadow-sm'
                      : 'text-jr-doux hover:bg-jr-eau-pale hover:text-jr-lien'
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {active && <ChevronRight size={15} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Outils transversaux, distincts des menus métier */}
        <div className="shrink-0 space-y-0.5 border-t border-jr-bordure px-2 py-1.5">
          <button
            type="button"
            onClick={() => handleNavigate('/dashboard/admin/journal-audit')}
            aria-current={activePath === '/dashboard/admin/journal-audit' ? 'page' : undefined}
            className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-jr-doux transition hover:bg-jr-eau-pale hover:text-jr-lien"
          >
            <ShieldCheck size={17} aria-hidden="true" /> Journal d’audit
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('/dashboard/admin/aide')}
            aria-current={activePath === '/dashboard/admin/aide' ? 'page' : undefined}
            className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-jr-doux transition hover:bg-jr-eau-pale hover:text-jr-lien"
          >
            <CircleHelp size={17} aria-hidden="true" /> Centre d’aide
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('/dashboard/admin/parametres')}
            aria-current={activePath === '/dashboard/admin/parametres' ? 'page' : undefined}
            className={`flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition hover:bg-jr-eau-pale hover:text-jr-lien ${activePath === '/dashboard/admin/parametres' ? 'bg-jr-eau-pale text-jr-lien' : 'text-jr-doux'}`}
          >
            <Settings size={17} aria-hidden="true" /> Paramètres
          </button>
        </div>

        {/* Déconnexion */}
        <div className="shrink-0 border-t border-jr-bordure p-2.5">
          <button
            type="button"
            onClick={() => setConfirmationOuverte(true)}
            className="jr-shell-logout flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-jr-err transition hover:bg-jr-err-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec"
          >
            <LogOut size={20} aria-hidden="true" />
            Déconnexion
          </button>
        </div>
      </aside>

      <ConfirmationDeconnexion
        open={confirmationOuverte}
        onAnnuler={() => setConfirmationOuverte(false)}
        onConfirmer={() => {
          setConfirmationOuverte(false);

          if (onLogout) {
            onLogout();
          }
        }}
      />
    </>
  );
}

export default Sidebar;
