import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  Bell,
  Check,
  CheckCheck,
  CircleAlert,
  ClipboardList,
  Info,
  RefreshCw,
  X,
  Zap,
  Droplets,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import axiosClient from '../../api/axiosClient.js';

const CONFIG = {
  ADMINISTRATEUR: {
    liste: '/notifications',
    compteur: '/notifications/count',
    lireTout: '/notifications/lire-tout',
    lireUne: (id) => `/notifications/${id}/lue`,
    page: '/dashboard/admin/notifications',
  },
  RESPONSABLE: {
    liste: '/responsable/notifications',
    compteur: '/responsable/notifications/count',
    lireTout: '/responsable/notifications/lire-tout',
    lireUne: (id) => `/responsable/notifications/${id}/lue`,
    page: '/dashboard/responsable/notifications',
  },
  AGENT: {
    liste: '/agent/notifications',
    compteur: '/agent/notifications/count',
    lireTout: '/agent/notifications/lire-tout',
    lireUne: (id) => `/agent/notifications/${id}/lue`,
    page: '/dashboard/agent/notifications',
  },
};

function normaliserListe(payload) {
  const valeurs = payload?.notifications ?? payload?.data ?? payload?.liste;
  return Array.isArray(valeurs) ? valeurs : [];
}

function dateCourte(value) {
  if (!value) return 'Date non précisée';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date non précisée';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function presentation(notification) {
  const type = String(notification?.type || '').toUpperCase();
  const service = String(notification?.type_compteur || '').toUpperCase();
  if (type.includes('ALERTE') || type.includes('ANOMALIE') || notification?.anomalie_id) {
    return { Icon: CircleAlert, style: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300', label: 'Alerte' };
  }
  if (type.includes('MISSION')) {
    return { Icon: ClipboardList, style: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300', label: 'Mission' };
  }
  if (service === 'EAU' || type.includes('EAU')) {
    return { Icon: Droplets, style: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300', label: 'Eau' };
  }
  if (service === 'ELECTRICITE' || type.includes('ELECTRICITE')) {
    return { Icon: Zap, style: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300', label: 'Électricité' };
  }
  if (type.startsWith('INFO')) {
    return { Icon: Info, style: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300', label: 'Information' };
  }
  return { Icon: Bell, style: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200', label: 'Notification' };
}

export default function NotificationPopover({
  role = 'ADMINISTRATEUR',
  initialCount = 0,
  onCountChange,
}) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const roleNormalise = String(role || '').trim().toUpperCase();
  const config = CONFIG[roleNormalise] || CONFIG.ADMINISTRATEUR;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(Number(initialCount) || 0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [busyAll, setBusyAll] = useState(false);
  const [error, setError] = useState('');

  const publierCompteur = useCallback((value) => {
    const safe = Math.max(0, Number(value) || 0);
    setCount(safe);
    onCountChange?.(safe);
  }, [onCountChange]);

  const chargerCompteur = useCallback(async () => {
    try {
      const response = await axiosClient.get(config.compteur);
      const data = response?.data || {};
      const value = data.unreadCount ?? data.non_lues ?? data.count ?? data.total ?? 0;
      publierCompteur(value);
    } catch (requestError) {
      // Le compteur n'empêche pas l'ouverture du centre de notifications.
      console.warn('Compteur des notifications indisponible :', requestError?.message || requestError);
    }
  }, [config, publierCompteur]);

  const chargerListe = useCallback(async (silencieux = false) => {
    if (silencieux) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await axiosClient.get(config.liste, {
        params: roleNormalise === 'ADMINISTRATEUR' ? { vue: 'actives' } : undefined,
      });
      const payload = response?.data || {};
      if (payload.status === 'error') throw new Error(payload.message || 'Chargement impossible.');
      const liste = normaliserListe(payload).sort((a, b) => {
        const aDate = new Date(a.created_at || a.date_envoi || 0).getTime();
        const bDate = new Date(b.created_at || b.date_envoi || 0).getTime();
        return bDate - aDate;
      });
      // Le compteur est calculé sur toute la réponse ; seuls les huit
      // éléments les plus récents sont rendus dans le panneau compact.
      const nonLues = liste.filter((item) => String(item.statut || '').trim().toUpperCase() === 'EN_ATTENTE').length;
      setItems(liste.slice(0, 8));
      publierCompteur(nonLues);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Impossible de charger les notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [config, publierCompteur, roleNormalise]);

  useEffect(() => {
    chargerCompteur();
    const timer = window.setInterval(chargerCompteur, 30000);
    return () => window.clearInterval(timer);
  }, [chargerCompteur]);

  useEffect(() => {
    if (open) chargerListe();
  }, [open, chargerListe]);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const keyboard = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keyboard);
    };
  }, [open]);

  const nonLuesDansListe = useMemo(
    () => items.filter((item) => String(item.statut || '').trim().toUpperCase() === 'EN_ATTENTE').length,
    [items]
  );

  const marquerCommeLue = async (item) => {
    const id = Number(item?.id);
    if (!Number.isInteger(id) || id <= 0) return;
    if (String(item.statut || '').trim().toUpperCase() === 'EN_ATTENTE') {
      setBusyId(id);
      try {
        await axiosClient.patch(config.lireUne(id));
        setItems((previous) => previous.map((entry) => String(entry.id) === String(id) ? { ...entry, statut: 'ENVOYE' } : entry));
        publierCompteur(Math.max(0, count - 1));
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Impossible de marquer cette notification comme lue.');
        setBusyId(null);
        return;
      } finally {
        setBusyId(null);
      }
    }
    setOpen(false);
    navigate(config.page);
  };

  const toutMarquerCommeLu = async () => {
    if (count <= 0 || busyAll) return;
    setBusyAll(true);
    setError('');
    try {
      await axiosClient.patch(config.lireTout);
      setItems((previous) => previous.map((item) => ({ ...item, statut: 'ENVOYE' })));
      publierCompteur(0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible de mettre toutes les notifications à jour.');
    } finally {
      setBusyAll(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="jr-notifications-popover"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-jr-doux transition-colors hover:bg-jr-eau-pale hover:text-jr-lien focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-focus"
        aria-label={count > 0 ? `Ouvrir les notifications, ${count} non lue${count > 1 ? 's' : ''}` : 'Ouvrir les notifications'}
        title="Notifications"
      >
        <Bell size={21} aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full border-2 border-jr-surface bg-jr-err px-1 text-center text-[10px] font-bold leading-4 text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.section
            id="jr-notifications-popover"
            role="dialog"
            aria-label="Notifications récentes"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+0.65rem)] z-[90] flex max-h-[min(80vh,38rem)] w-[min(26rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-jr-bordure bg-jr-surface shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-jr-bordure px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-2">
                <Bell size={17} className="shrink-0 text-jr-lien" />
                <h2 className="font-bold text-jr-titre">Notifications</h2>
                <span className="rounded-full bg-jr-err-pale px-2 py-0.5 text-xs font-bold text-jr-err">{count}</span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => chargerListe(true)} disabled={refreshing || loading} className="rounded-lg p-2 text-jr-faible hover:bg-jr-champ hover:text-jr-lien disabled:opacity-50" aria-label="Actualiser les notifications" title="Actualiser">
                  <RefreshCw size={15} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-jr-faible hover:bg-jr-champ hover:text-jr-texte" aria-label="Fermer les notifications">
                  <X size={16} />
                </button>
              </div>
            </header>

            {count > 0 && (
              <div className="flex items-center justify-between gap-3 border-b border-jr-bordure bg-jr-eau-pale/55 px-4 py-2.5">
                <p className="text-xs font-semibold text-jr-doux">{count} notification{count > 1 ? 's' : ''} non lue{count > 1 ? 's' : ''}</p>
                <button type="button" onClick={toutMarquerCommeLu} disabled={busyAll} className="inline-flex items-center gap-1.5 text-xs font-bold text-jr-lien hover:underline disabled:opacity-50">
                  <CheckCheck size={14} /> {busyAll ? 'Mise à jour…' : 'Tout marquer comme lu'}
                </button>
              </div>
            )}

            {error && <p role="alert" className="mx-3 mt-3 rounded-lg border border-jr-err-bordure bg-jr-err-pale px-3 py-2 text-xs text-jr-err">{error}</p>}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {loading ? (
                <div className="space-y-3 p-4" aria-busy="true">
                  {[0, 1, 2].map((key) => <div key={key} className="animate-pulse space-y-2"><div className="h-3 w-2/5 rounded bg-jr-champ" /><div className="h-3 w-4/5 rounded bg-jr-champ" /></div>)}
                </div>
              ) : items.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-jr-eau-pale text-jr-lien"><Bell size={21} /></span>
                  <p className="mt-3 text-sm font-bold text-jr-titre">Aucune notification</p>
                  <p className="mt-1 text-xs text-jr-faible">Les nouvelles alertes et consignes apparaîtront ici.</p>
                </div>
              ) : (
                <ul className="divide-y divide-jr-bordure">
                  {items.map((item) => {
                    const view = presentation(item);
                    const Icon = view.Icon;
                    const unread = String(item.statut || '').trim().toUpperCase() === 'EN_ATTENTE';
                    return (
                      <li key={item.id}>
                        <button type="button" onClick={() => marquerCommeLue(item)} disabled={busyId === item.id} className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-jr-champ/70 disabled:opacity-60 ${unread ? 'bg-jr-eau-pale/20' : ''}`}>
                          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${view.style}`}><Icon size={17} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="line-clamp-1 text-sm font-bold text-jr-titre">{item.sujet || view.label}</span>
                              <span className="shrink-0 text-[10px] text-jr-faible">{dateCourte(item.created_at || item.date_envoi)}</span>
                            </span>
                            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-jr-doux">{item.message || 'Aucun détail supplémentaire.'}</span>
                            <span className="mt-2 flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${unread ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' : 'bg-jr-champ text-jr-faible'}`}>{unread ? 'Non lue' : 'Lue'}</span>
                              {item.numero_compteur && <span className="truncate text-[10px] text-jr-faible">Compteur {item.numero_compteur}</span>}
                              {busyId === item.id && <span className="text-[10px] text-jr-lien">Mise à jour…</span>}
                            </span>
                          </span>
                          {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-jr-lien" aria-label="Non lue" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <footer className="flex border-t border-jr-bordure bg-jr-surface-muted">
              <button type="button" onClick={() => { setOpen(false); navigate(config.page); }} className="flex flex-1 items-center justify-center gap-2 px-3 py-3 text-sm font-bold text-jr-lien transition-colors hover:bg-jr-eau-pale">
                Voir toutes les notifications <span aria-hidden="true">→</span>
              </button>
            </footer>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
