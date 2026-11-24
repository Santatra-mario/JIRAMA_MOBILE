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
  ShieldCheck,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TriangleAlert,
  UserCheck,
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
import ConfirmationDeconnexion from '../../ui/ConfirmationDeconnexion.jsx';
import {
  estAnnulation,
  traiterErreurSession,
} from '../sessionUtilisateur.js';
import { EVENEMENT_NOTIFICATIONS_AGENT } from './notificationsAgent.js';

const INTERVALLE_COMPTEUR = 30000;
const CHEMIN_NOTIFICATIONS = '/dashboard/agent/notifications';

const menuItems = [
  {
    label: 'Tableau de bord',
    description: 'Ma tournée du jour',
    path: '/dashboard/agent',
    icon: LayoutDashboard,
  },
  {
    label: 'Compteurs',
    description: 'Compteurs à relever',
    path: '/dashboard/agent/compteurs',
    icon: Gauge,
  },
  {
    label: 'Abonnés',
    description: 'Fichier des abonnés',
    path: '/dashboard/agent/abonnes',
    icon: Users,
  },
  {
    label: 'Relevés',
    description: 'Saisie et historique des index',
    path: '/dashboard/agent/releves',
    icon: ClipboardList,
  },
  {
    label: 'Mes contrôles',
    description: 'Missions attribuées',
    path: '/dashboard/agent/missions',
    icon: ClipboardCheck,
  },
  {
    label: 'Anomalies',
    description: 'Écarts à vérifier',
    path: '/dashboard/agent/anomalies',
    icon: TriangleAlert,
  },
];

function lireUtilisateur() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function lireCompteur(data) {
  const brut = Number(
    data?.total ??
      data?.count ??
      data?.unreadCount ??
      data?.non_lues ??
      data?.notificationsCount ??
      0
  );

  return Number.isFinite(brut) ? Math.max(0, brut) : 0;
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
  const [user] = useState(lireUtilisateur);
  const [deconnexionDemandee, setDeconnexionDemandee] = useState(false);

  const dernierCompteur = useRef(null);
  const cheminActuel = useRef(location.pathname);
  const controleur = useRef(null);
  const idRequete = useRef(0);
  const boutonMenu = useRef(null);

  useEffect(() => {
    cheminActuel.current = location.pathname;
  }, [location.pathname]);

  /* ---------- Compteur de notifications ---------- */

  const chargerCompteur = useCallback(async () => {
    // une seule requête à la fois : la nouvelle annule l'ancienne
    controleur.current?.abort();

    const controle = new AbortController();

    controleur.current = controle;
    idRequete.current += 1;

    const id = idRequete.current;

    try {
      const response = await axiosClient.get(
        '/agent/notifications/count',
        { signal: controle.signal }
      );

      if (idRequete.current !== id) {
        return;
      }

      const compteur = lireCompteur(response?.data);
      const precedent = dernierCompteur.current;

      setUnread(compteur);
      dernierCompteur.current = compteur;

      // toast seulement si le nombre augmente (jamais au premier
      // chargement) et si l'agent n'est pas déjà sur les notifications
      const surPageNotifications = cheminActuel.current.startsWith(
        CHEMIN_NOTIFICATIONS
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
          message:
            compteur > 1
              ? `${compteur} notifications non lues dans votre espace.`
              : 'Une consigne ou une alerte vient d’arriver.',
          action: {
            label: 'Voir',
            onClick: () => navigate(CHEMIN_NOTIFICATIONS),
          },
        });
      }
    } catch (error) {
      if (estAnnulation(error)) {
        return;
      }

      console.error(
        'Erreur compteur notifications Agent :',
        error?.message || error
      );

      traiterErreurSession(error, notify, navigate);
    }
  }, [navigate, notify]);

  // Rafraîchissement : au montage, à chaque changement de page,
  // au retour sur l'onglet, puis toutes les ~30 s (onglet visible).
  useEffect(() => {
    chargerCompteur();
  }, [location.pathname, chargerCompteur]);

  useEffect(() => {
    const minuteur = window.setInterval(() => {
      if (!document.hidden) {
        chargerCompteur();
      }
    }, INTERVALLE_COMPTEUR);

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
    };
  }, [chargerCompteur]);

  /* ---------- Synchro avec les pages (marquer comme lu...) ---------- */

  useEffect(() => {
    function auChangement(event) {
      const valeur = event?.detail?.count;

      if (Number.isFinite(Number(valeur)) && valeur !== undefined) {
        const compteur = Math.max(0, Number(valeur));

        // met la pastille à jour sans déclencher de toast
        controleur.current?.abort();
        idRequete.current += 1;
        dernierCompteur.current = compteur;
        setUnread(compteur);
        return;
      }

      chargerCompteur();
    }

    window.addEventListener(
      EVENEMENT_NOTIFICATIONS_AGENT,
      auChangement
    );

    return () =>
      window.removeEventListener(
        EVENEMENT_NOTIFICATIONS_AGENT,
        auChangement
      );
  }, [chargerCompteur]);

  /* ---------- Menu mobile ---------- */

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    function surTouche(event) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        boutonMenu.current?.focus();
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
    if (path === '/dashboard/agent') {
      return location.pathname === path;
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  }

  const nomComplet = useMemo(
    () =>
      `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Agent',
    [user]
  );

  const initiales = useMemo(() => {
    const valeur = `${String(user?.prenom || '').trim().charAt(0)}${String(
      user?.nom || ''
    )
      .trim()
      .charAt(0)}`.toUpperCase();

    return valeur || 'AG';
  }, [user]);

  const texteCompteur = unread > 99 ? '99+' : String(unread);


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
        id="menu-agent"
        className={`jr-app-sidebar jr-verre-fort fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-72 flex-col overflow-hidden border-r border-jr-bordure shadow-xl backdrop-blur transition-transform duration-300 motion-reduce:transition-none lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-jr-bordure px-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/agent')}
            title="Retour au tableau de bord"
            className="flex items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec"
          >
            {/* Tuile claire : le logo reste lisible en mode sombre */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-jr-logo p-1.5 shadow-sm ring-1 ring-jr-bordure">
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
                Espace Agent
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
          <div className="jr-shell-profile flex items-center gap-3 rounded-lg bg-jr-eau-pale p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-jr-eau text-sm font-bold text-white">
              {initiales}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-jr-texte">
                {nomComplet}
              </p>
              <p className="truncate text-xs text-jr-faible">
                {user?.email || 'Compte agent'}
              </p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-jr-bordure bg-jr-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-jr-lien">
                <UserCheck size={11} aria-hidden="true" />
                Agent de relevé
              </span>
            </div>
          </div>
        </div>

        {/* Navigation principale fixe : les outils transversaux sont placés en bas */}
        <nav
          className="flex min-h-0 flex-1 flex-col overflow-hidden p-3"
          aria-label="Navigation agent"
        >
          <p className="jr-shell-section-label mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-jr-faible">
            Tournées et relevés
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
          <button type="button" onClick={() => navigate('/dashboard/agent/journal-audit')} aria-current={isActive('/dashboard/agent/journal-audit') ? 'page' : undefined} className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-jr-doux transition hover:bg-jr-eau-pale hover:text-jr-lien">
            <ShieldCheck size={17} aria-hidden="true" /> Journal d’activité
          </button>
          <button type="button" onClick={() => navigate('/dashboard/agent/aide')} aria-current={isActive('/dashboard/agent/aide') ? 'page' : undefined} className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-jr-doux transition hover:bg-jr-eau-pale hover:text-jr-lien">
            <CircleHelp size={17} aria-hidden="true" /> Centre d’aide
          </button>
          <button type="button" onClick={() => navigate('/dashboard/agent/parametres')} aria-current={isActive('/dashboard/agent/parametres') ? 'page' : undefined} className="flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-jr-doux transition hover:bg-jr-eau-pale hover:text-jr-lien">
            <Settings size={17} aria-hidden="true" /> Paramètres
          </button>
        </div>

        {/* Déconnexion */}
        <div className="shrink-0 border-t border-jr-bordure p-2.5">
          <button
            type="button"
            onClick={() => setDeconnexionDemandee(true)}
            className="jr-shell-logout flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-jr-err transition-colors hover:bg-jr-err-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec motion-reduce:transition-none"
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
                ref={boutonMenu}
                type="button"
                aria-label="Ouvrir le menu"
                aria-expanded={mobileOpen}
                aria-controls="menu-agent"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-jr-doux transition-colors hover:bg-jr-eau-pale hover:text-jr-lien focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec motion-reduce:transition-none lg:hidden"
              >
                <Menu size={23} aria-hidden="true" />
              </button>

              <div className="min-w-0">
                <p className="hidden text-xs font-semibold uppercase tracking-wider text-jr-lien sm:block">
                  Espace Agent
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
              <NotificationPopover role="AGENT" initialCount={unread} onCountChange={setUnread} />

              {/* Profil */}
              <button
                type="button"
                onClick={() => navigate('/dashboard/agent')}
                title="Tableau de bord"
                className="hidden items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-jr-eau-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec motion-reduce:transition-none sm:flex"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-jr-eau text-xs font-bold text-white">
                  {initiales}
                </div>

                <div className="text-left">
                  <p className="max-w-32 truncate text-sm font-semibold text-jr-texte">
                    {nomComplet}
                  </p>
                  <p className="text-xs text-jr-faible">
                    Agent de relevé
                  </p>
                </div>
              </button>
            </div>
          </div>
        </header>

        <main className="jr-app-main p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </>
  );
}

/* =========================================================
   LAYOUT AGENT
   AdminShell (fond Jirama + thème clair/sombre) + toasts partagés
   par toutes les pages de l'espace Agent.

   intensite : « calme » (défaut, pages à tableaux et formulaires)
               ou « vivant » (tableau de bord).

   ATTENTION : useToast() ne fonctionne que dans un composant
   rendu À L'INTÉRIEUR de <AgentLayout>. Dans chaque page, le
   contenu doit donc être un composant interne :
     export default function AgentXxxPage() {
       return <AgentLayout title="..."><Contenu /></AgentLayout>;
     }
========================================================= */

export default function AgentLayout({
  children,
  title = 'Tableau de bord',
  intensite = 'calme',
}) {
  return (
    <AdminShell intensite={intensite}>
      <ToastProvider>
        <ContenuLayout title={title}>{children}</ContenuLayout>
      </ToastProvider>
    </AdminShell>
  );
}
