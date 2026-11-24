import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, RefreshCw, Search, ShieldCheck, UserRound, XCircle } from 'lucide-react';
import axiosClient from '../../api/axiosClient.js';
import SharedSupportLayout from './SharedSupportLayout.jsx';

function lireRole() {
  try { return String(JSON.parse(localStorage.getItem('user') || '{}')?.role || '').trim().toUpperCase(); }
  catch { return ''; }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function logDay(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function detailsText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

export default function JournalAuditPage() {
  const role = lireRole();
  const isAdmin = role === 'ADMINISTRATEUR';
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadLogs = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const response = await axiosClient.get('/settings/audit', { params: { limit: 100 } });
      if (response.data?.status !== 'success' || !Array.isArray(response.data?.logs)) {
        throw new Error(response.data?.message || 'Le journal ne peut pas être chargé.');
      }
      setLogs(response.data.logs);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Erreur lors du chargement du journal.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const actors = useMemo(() => Array.from(new Map(logs.map((log) => [String(log.user_id ?? log.actor_role ?? 'inconnu'), {
    value: String(log.user_id ?? log.actor_role ?? 'inconnu'),
    label: [log.prenom, log.nom].filter(Boolean).join(' ') || log.actor_role || 'Utilisateur',
  }])).values()), [logs]);

  const actions = useMemo(() => [...new Set(logs.map((log) => String(log.action || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('fr');
    return logs.filter((log) => {
      const userName = [log.prenom, log.nom, log.actor_role].filter(Boolean).join(' ').toLocaleLowerCase('fr');
      const content = [userName, log.action, log.resource_type, log.resource_id, detailsText(log.details)].join(' ').toLocaleLowerCase('fr');
      if (q && !content.includes(q)) return false;
      if (actorFilter && String(log.user_id ?? log.actor_role ?? 'inconnu') !== actorFilter) return false;
      if (actionFilter && log.action !== actionFilter) return false;
      const day = logDay(log.created_at);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [logs, search, actorFilter, actionFilter, dateFrom, dateTo]);

  const summary = useMemo(() => ({
    total: logs.length,
    actors: new Set(logs.map((log) => log.user_id).filter(Boolean)).size,
    actions: new Set(logs.map((log) => log.action).filter(Boolean)).size,
  }), [logs]);

  const clearFilters = () => { setSearch(''); setActorFilter(''); setActionFilter(''); setDateFrom(''); setDateTo(''); };

  return (
    <SharedSupportLayout title={isAdmin ? 'Journal d’audit' : 'Journal de mes activités'}>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-jr-bordure bg-jr-surface p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-jr-lien"><ShieldCheck size={15} /> Traçabilité</p>
            <h2 className="mt-2 text-2xl font-extrabold text-jr-titre">{isAdmin ? 'Journal d’audit global' : 'Mes activités enregistrées'}</h2>
            <p className="mt-1 max-w-2xl text-sm text-jr-doux">{isAdmin ? 'Consultez les événements enregistrés sur la plateforme.' : 'Consultez les actions prises en charge par le journal pour votre compte.'}</p>
          </div>
          <button type="button" onClick={() => loadLogs(true)} disabled={refreshing || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-jr-bordure bg-jr-surface px-4 py-2.5 text-sm font-semibold text-jr-lien transition hover:bg-jr-eau-pale disabled:opacity-60">
            <RefreshCw size={16} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} /> Actualiser
          </button>
        </section>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="Synthèse du journal">
          <div className="jr-verre rounded-2xl border border-jr-bordure p-5"><div className="flex items-center gap-2 text-jr-lien"><Activity size={18} /><span className="text-sm font-semibold">Événements chargés</span></div><p className="mt-2 text-3xl font-extrabold tabular-nums text-jr-titre">{loading ? '—' : summary.total}</p></div>
          <div className="jr-verre rounded-2xl border border-jr-bordure p-5"><div className="flex items-center gap-2 text-jr-lien"><UserRound size={18} /><span className="text-sm font-semibold">Utilisateurs concernés</span></div><p className="mt-2 text-3xl font-extrabold tabular-nums text-jr-titre">{loading ? '—' : summary.actors}</p></div>
          <div className="jr-verre rounded-2xl border border-jr-bordure p-5"><div className="flex items-center gap-2 text-jr-lien"><ShieldCheck size={18} /><span className="text-sm font-semibold">Types d’actions</span></div><p className="mt-2 text-3xl font-extrabold tabular-nums text-jr-titre">{loading ? '—' : summary.actions}</p></div>
        </section>

        <section className="jr-verre space-y-4 rounded-2xl border border-jr-bordure p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-jr-titre">Filtres du journal</h3><button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 text-xs font-semibold text-jr-lien hover:underline"><XCircle size={14} /> Réinitialiser</button></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="relative sm:col-span-2 xl:col-span-2"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-jr-faible" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une action, une ressource…" aria-label="Rechercher dans le journal" className="jr-field w-full rounded-xl border border-jr-bordure bg-jr-champ py-2.5 pl-9 pr-3 text-sm" /></div>
            {isAdmin && <select value={actorFilter} onChange={(event) => setActorFilter(event.target.value)} aria-label="Filtrer par utilisateur" className="jr-field w-full rounded-xl border border-jr-bordure bg-jr-champ px-3 py-2.5 text-sm"><option value="">Tous les utilisateurs</option>{actors.map((actor) => <option key={actor.value} value={actor.value}>{actor.label}</option>)}</select>}
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} aria-label="Filtrer par action" className="jr-field w-full rounded-xl border border-jr-bordure bg-jr-champ px-3 py-2.5 text-sm"><option value="">Toutes les actions</option>{actions.map((action) => <option key={action} value={action}>{action.replaceAll('_', ' ')}</option>)}</select>
            <label className="flex items-center gap-2 rounded-xl border border-jr-bordure bg-jr-champ px-3"><CalendarDays size={15} className="shrink-0 text-jr-faible" /><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Date de début" className="min-w-0 w-full bg-transparent py-2 text-xs text-jr-texte" /></label>
            <label className="flex items-center gap-2 rounded-xl border border-jr-bordure bg-jr-champ px-3"><CalendarDays size={15} className="shrink-0 text-jr-faible" /><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Date de fin" className="min-w-0 w-full bg-transparent py-2 text-xs text-jr-texte" /></label>
          </div>
        </section>

        <section className="jr-verre overflow-hidden rounded-2xl border border-jr-bordure shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-jr-bordure px-5 py-4"><div><h3 className="font-bold text-jr-titre">Historique des actions</h3><p className="mt-1 text-xs text-jr-faible">{filtered.length} événement(s) affiché(s) · limite de consultation : 100 événements récents</p></div><span className="rounded-full bg-jr-eau-pale px-3 py-1 text-xs font-bold text-jr-lien">{isAdmin ? 'Vue globale' : 'Vue personnelle'}</span></div>
          {loading ? <div className="p-10 text-center text-sm text-jr-doux">Chargement du journal…</div> : error ? <div role="alert" className="m-5 rounded-xl border border-jr-err-bordure bg-jr-err-pale p-4 text-sm text-jr-err">{error}</div> : filtered.length === 0 ? <div className="p-12 text-center"><ShieldCheck size={30} className="mx-auto text-jr-faible" /><p className="mt-3 font-semibold text-jr-titre">Aucun événement à afficher</p><p className="mt-1 text-sm text-jr-doux">Aucune entrée ne correspond aux filtres sélectionnés.</p></div> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr>{(isAdmin ? ['Date et heure', 'Utilisateur', 'Action', 'Ressource', 'Résultat', 'Détails'] : ['Date et heure', 'Action', 'Ressource', 'Résultat', 'Détails']).map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{filtered.map((log) => <tr key={`${log.source || 'log'}-${log.id}`} className="align-top"><td className="whitespace-nowrap px-4 py-3 text-xs text-jr-doux">{formatDate(log.created_at)}</td>{isAdmin && <td className="px-4 py-3"><p className="font-semibold text-jr-texte">{[log.prenom, log.nom].filter(Boolean).join(' ') || 'Utilisateur supprimé'}</p><p className="mt-1 text-xs text-jr-faible">{log.actor_role || '—'}</p></td>}<td className="px-4 py-3"><span className="font-semibold text-jr-titre">{String(log.action || 'ACTION').replaceAll('_', ' ')}</span></td><td className="px-4 py-3 text-jr-doux">{log.resource_type || '—'}{log.resource_id ? ` · ${log.resource_id}` : ''}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${String(log.result || 'SUCCES').toUpperCase() === 'SUCCES' ? 'bg-jr-ok-pale text-jr-ok' : 'bg-jr-err-pale text-jr-err'}`}>{log.result || 'SUCCES'}</span></td><td className="px-4 py-3"><details className="max-w-xs"><summary className="cursor-pointer text-xs font-semibold text-jr-lien">Voir les détails</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-jr-fond p-2 text-[11px] text-jr-doux">{detailsText(log.details) || 'Aucun détail.'}</pre></details></td></tr>)}</tbody></table></div>
          )}
        </section>
      </div>
    </SharedSupportLayout>
  );
}
