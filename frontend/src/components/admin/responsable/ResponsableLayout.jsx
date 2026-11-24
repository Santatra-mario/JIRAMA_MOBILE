import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  CircleHelp,
  ChevronRight,
  GitCompare,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  ShieldCheck,
  Settings,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';

import axiosClient from '../../../api/axiosClient';
import AdminShell from '../AdminShell.jsx';
import BoutonTheme from '../../BoutonTheme.jsx';
import DisplayControls from '../../DisplayControls.jsx';
import NotificationPopover from '../../notifications/NotificationPopover.jsx';
import {
  ToastProvider,
  useToast,
} from '../../ui/ToastProvider.jsx';
import { traiterErreurSession } from './sessionResponsable.js';
import ConfirmationDeconnexion from '../../ui/ConfirmationDeconnexion.jsx';

const INTERVALLE_COMPTEUR = 30000;

const menuItems = [
  {
    label: 'Tableau de bord',
    path: '/dashboard/responsable',
    icon: LayoutDashboard,
    description: 'Vue générale',
  },
  {
    label: 'Agents TSP',
    path: '/dashboard/responsable/agents',
    icon: Users,
    description: 'Agents, disponibilité et avancement',
  },
  {
    label: 'Anomalies',
    path: '/dashboard/responsable/anomalies',
    icon: TriangleAlert,
    description: 'Supervision des alertes',
  },
  {
    label: 'Planning des contrôles',
    path: '/dashboard/responsable/controles',
    icon: MapPin,
    description: 'Missions et carte des abonnés',
  },
  {
    label: 'Comparaison',
    path: '/dashboard/responsable/comparaison',
    icon: GitCompare,
    description: 'Écarts de consommation',
  },
];

function getInitials(user) {
  const first = String(user?.prenom || '').trim();
  const last = String(user?.nom || '').trim();
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

  return initials || 'R';
}

/* =========================================================
   CONTENU DU LAYOUT
   (doit être à l'intérieur du ToastProvider pour utiliser useToast)
========================================================= */

function ContenuLayout({ children, title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [user, setUser] = useState(null);
  const [deconnexionDemandee, setDeconnexionDemandee] = useState(false);

  const dernierCompteur = useRef(null);
  const cheminActuel = useRef(location.pathname);
  const enCours = useRef(false);
  const idRequete = useRef(0);
  const controleur = useRef(null);

  useEffect(() => {
    cheminActuel.current = location.pathname;
  }, [location.pathname]);

  /* ---------- Utilisateur connecté ---------- */

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');

      if (!storedUser) {
        navigate('/', { replace: true });
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      const role = String(parsedUser?.role || '').trim().toUpperCase();

      if (role !== 'RESPONSABLE') {
        console.error('Accès refusé : utilisateur non responsable.');
        navigate('/', { replace: true });
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.error('Erreur lecture utilisateur :', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/', { replace: true });
    }
  }, [navigate]);

  /* ---------- Compteur de notifications ---------- */

  const chargerCompteur = useCallback(async () => {
    // aucune requête concurrente
    if (enCours.current) {
      return;
    }

    enCours.current = true;
    idRequete.current += 1;

    const id = idRequete.current;
    const controle = new AbortController();

    controleur.current = controle;

    try {
      const response = await axiosClient.get(
        '/responsable/notifications/count',
        { signal: controle.signal }
      );

      const data = response?.data || {};

      const brut = Number(
        data.count ??
          data.unreadCount ??
          data.non_lues ??
          data.notificationsCount ??
          0
      );

      const compteur = Number.isFinite(brut) ? Math.max(0, brut) : 0;

      setUnread(compteur);

      const precedent = dernierCompteur.current;

      dernierCompteur.current = compteur;

      // toast seulement si le nombre augmente (jamais au premier chargement)
      // et si on n'est pas déjà sur la page des notifications
      const surPageNotifications = cheminActuel.current.startsWith(
        '/dashboard/responsable/notifications'
      );

      if (
        precedent !== null &&
        compteur > precedent &&
        !surPageNotifications
      ) {
        const nouvelles = compteur - precedent;

        notify({
          cle: 'nouvelles-notifications',
          genre: 'info',
          titre:
            nouvelles > 1
              ? `${nouvelles} nouvelles notifications`
              : 'Nouvelle notification',
          message: 'Une alerte vient d’arriver dans votre espace.',
          action: {
            label: 'Voir',
            onClick: () =>
              navigate('/dashboard/responsable/notifications'),
          },
        });
      }
    } catch (error) {
      if (
        error?.code === 'ERR_CANCELED' ||
        error?.name === 'CanceledError'
      ) {
        return;
      }

      console.error(
        'Erreur compteur notifications Responsable :',
        error?.message || error
      );

      traiterErreurSession(error, notify, navigate);
    } finally {
      if (idRequete.current === id) {
        enCours.current = false;
      }
    }
  }, [navigate, notify]);

  useEffect(() => {
    chargerCompteur();

    const minuteur = window.setInterval(() => {
      if (!document.hidden) {
        chargerCompteur();
      }
    }, INTERVALLE_COMPTEUR);

    // retour sur l'onglet : mise à jour immédiate
    function auRetour() {
      if (!document.hidden) {
        chargerCompteur();
      }
    }

    document.addEventListener('visibilitychange', auRetour);

    return () => {
      window.clearInterval(minuteur);
      document.removeEventListener('visibilitychange', auRetour);

      controleur.current?.abort();
      enCours.current = false;
    };
  }, [chargerCompteur]);

  useEffect(() => {
    chargerCompteur();
    setMobileOpen(false);
  }, [location.pathname, chargerCompteur]);

  /* ---------- Menu mobile : fermeture avec Échap ---------- */

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    function surTouche(event) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    }

    document.addEventListener('keydown', surTouche);

    return () => document.removeEventListener('keydown', surTouche);
  }, [mobileOpen]);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/', { replace: true });
  }

  function isActive(path) {
    if (path === '/dashboard/responsable') {
      return location.pathname === path;
    }

    return location.pathname.startsWith(path);
  }

  const fullName = useMemo(
    () =>
      [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Responsable',
    [user]
  );

  const initials = getInitials(user);


  return (
    <>
      {/* Liseré tricolore : eau, électricité, alerte */}
      <div
        aria-hidden="true"
        className="fixed left-0 right-0 top-0 z-[60] h-1 bg-gradient-to-r from-jr-eau via-jr-elec to-jr-err"
      />

      {/* ---------- Fond du menu mobile ---------- */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 lg:hidden"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--jr-eau-fonce) 55%, transparent)',
          }}
        />
      )}

      {/* ---------- Sidebar ---------- */}
      <aside
        className={`jr-app-sidebar jr-verre-fort fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-72 flex-col overflow-hidden border-r border-jr-bordure shadow-xl backdrop-blur transition-transform duration-300 motion-reduce:transition-none lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-jr-bordure px-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/responsable')}
            title="Retour au tableau de bord"
            className="flex items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec"
          >
            {/* Tuile claire : le logo reste lisible en mode sombre */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#ffffff] p-1.5 shadow-sm ring-1 ring-jr-bordure">
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
                Espace Responsable
              </p>
            </div>
          </button>

          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-2 text-jr-doux hover:bg-jr-eau-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec lg:hidden"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Profil */}
        <div className="shrink-0 border-b border-jr-bordure p-3">
          <div className="jr-shell-profile flex items-center gap-3 rounded-2xl bg-jr-eau-pale p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-jr-eau text-sm font-bold text-white">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-jr-texte">
                {fullName}
              </p>
              <p className="truncate text-xs text-jr-faible">
                {user?.email || 'Compte responsable'}
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-jr-bordure bg-jr-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-jr-lien">
                <ShieldCheck size={11} aria-hidden="true" />
                Responsable
              </span>
            </div>
          </div>
        </div>

        {/* Navigation principale fixe */}
        <nav
          className="flex min-h-0 flex-1 flex-col overflow-hidden p-3"
          aria-label="Navigation responsable"
        >
          <p className="jr-shell-section-label mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-jr-faible">
            Supervision
          </p>

          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`jr-shell-nav-link relative flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec motion-reduce:transition-none ${
                    active
                      ? 'bg-jr-eau text-white shadow-sm'
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

        <div className="shrink-0 space-y-0.5 border-t border-jr-bordure px-3 py-2">
          <button type="button" onClick={() => navigate('/dashboard/responsable/journal-audit')} aria-current={isActive('/dashboard/responsable/journal-audit') ? 'page' : undefined} className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-jr-doux transition hover:bg-jr-eau-pale hover:text-jr-lien">
            <ShieldCheck size={17} aria-hidden="true" /> Journal d’activité
          </button>
          <button type="button" onClick={() => navigate('/dashboard/responsable/aide')} aria-current={isActive('/dashboard/responsable/aide') ? 'page' : undefined} className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-jr-doux transition hover:bg-jr-eau-pale hover:text-jr-lien">
            <CircleHelp size={17} aria-hidden="true" /> Centre d’aide
          </button>
          <button type="button" onClick={() => navigate('/dashboard/responsable/parametres')} aria-current={isActive('/dashboard/responsable/parametres') ? 'page' : undefined} className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-jr-doux transition hover:bg-jr-eau-pale hover:text-jr-lien">
            <Settings size={17} aria-hidden="true" /> Paramètres
          </button>
        </div>

        {/* Déconnexion */}
        <div className="shrink-0 border-t border-jr-bordure p-2.5">
          <button
            type="button"
            onClick={() => setDeconnexionDemandee(true)}
            className="jr-shell-logout flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-jr-err transition hover:bg-jr-err-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec motion-reduce:transition-none"
          >
            <LogOut size={20} aria-hidden="true" />
            Déconnexion
          </button>
        </div>
      </aside>

      <ConfirmationDeconnexion
        open={deconnexionDemandee}
        onAnnuler={() => setDeconnexionDemandee(false)}
        onConfirmer={() => {
          setDeconnexionDemandee(false);
          logout();
        }}
      />

      {/* ---------- Contenu ---------- */}
      <div className="min-h-screen lg:pl-72">
        <header className="jr-app-header jr-verre-fort sticky top-0 z-30 border-b border-jr-bordure backdrop-blur">
          <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* Gauche */}
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                aria-label="Ouvrir le menu"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl p-2 text-jr-doux transition hover:bg-jr-eau-pale hover:text-jr-lien focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec motion-reduce:transition-none lg:hidden"
              >
                <Menu size={23} aria-hidden="true" />
              </button>

              <div className="min-w-0">
                <p className="hidden text-xs font-semibold uppercase tracking-wider text-jr-lien sm:block">
                  Supervision
                </p>
                <h1 className="truncate text-xl font-bold text-jr-titre sm:text-2xl">
                  {title}
                </h1>
              </div>
            </div>

            {/* Droite */}
            <div className="flex items-center gap-3">
              {/* Réglages de lisibilité et plein écran */}
              <DisplayControls />

              {/* Mode clair / sombre */}
              <BoutonTheme integre />

              {/* Centre de notifications en pop-up */}
              <NotificationPopover role="RESPONSABLE" initialCount={unread} onCountChange={setUnread} />

              {/* Profil */}
              <div className="hidden items-center gap-3 rounded-xl px-2 py-1.5 sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-jr-eau text-xs font-bold text-white">
                  {initials}
                </div>

                <div className="text-left">
                  <p className="max-w-32 truncate text-sm font-semibold text-jr-texte">
                    {fullName}
                  </p>
                  <p className="text-xs text-jr-faible">Responsable</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="jr-app-main p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </>
  );
}

/* =========================================================
   LAYOUT RESPONSABLE
   AdminShell (fond Jirama + thème clair/sombre) + toasts partagés
   par les 3 pages : tableau de bord, anomalies, notifications.
========================================================= */

export default function ResponsableLayout({
  children,
  title = 'Tableau de bord',
}) {
  return (
    <AdminShell intensite="calme">
      <ToastProvider>
        <ContenuLayout title={title}>{children}</ContenuLayout>
      </ToastProvider>
    </AdminShell>
  );
}
