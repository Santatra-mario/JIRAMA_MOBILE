import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  Users,
  UserCheck,
  UserRoundX,
  ClipboardList,
  ArrowLeft,
  TriangleAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import axiosClient from '../../api/axiosClient';
import ResponsableLayout from '../../components/admin/responsable/ResponsableLayout';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR');
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-FR');
}

function normalizeStatut(value) {
  return String(value || '').trim().toUpperCase();
}

function statutMissionLabel(value) {
  const labels = {
    EN_ATTENTE: 'En attente',
    PLANIFIEE: 'Planifiée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    A_REPROGRAMMER: 'À reprogrammer',
    ANNULEE: 'Annulée',
  };
  return labels[normalizeStatut(value)] || value || '—';
}

function statutMissionClass(value) {
  const styles = {
    EN_ATTENTE: 'border-slate-200 bg-slate-50 text-slate-600',
    PLANIFIEE: 'border-blue-200 bg-blue-50 text-blue-700',
    EN_COURS: 'border-amber-200 bg-amber-50 text-amber-700',
    TERMINEE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    A_REPROGRAMMER: 'border-orange-200 bg-orange-50 text-orange-700',
    ANNULEE: 'border-red-200 bg-red-50 text-red-700',
  };
  return styles[normalizeStatut(value)] || 'border-slate-200 bg-slate-50 text-slate-600';
}

function StatCard({ label, value, tone = 'slate', icon: Icon }) {
  const tones = {
    slate: 'text-slate-900',
    blue: 'text-blue-700',
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {Icon ? <Icon size={18} className="text-slate-400" /> : null}
      </div>
      <p className={`mt-2 text-2xl font-black ${tones[tone] || tones.slate}`}>{value}</p>
    </div>
  );
}

export default function ResponsableAgentsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [resume, setResume] = useState(null);
  const [search, setSearch] = useState('');
  const [disponibilite, setDisponibilite] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  function traiterErreurSession(requestError) {
    if ([401, 403].includes(requestError?.response?.status)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/', { replace: true });
      return true;
    }
    return false;
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await axiosClient.get('/responsable/agents');
      if (response.data?.status !== 'success') {
        throw new Error(response.data?.message || 'Impossible de charger les Agents TSP.');
      }
      setAgents(Array.isArray(response.data.data) ? response.data.data : []);
      setResume(response.data.resume || null);
    } catch (requestError) {
      if (traiterErreurSession(requestError)) return;
      console.error('Erreur Agents TSP Responsable :', requestError);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Erreur de chargement des Agents.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function ouvrirAgent(agentId) {
    setSelectedId(agentId);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const response = await axiosClient.get(`/responsable/agents/${agentId}`);
      if (response.data?.status !== 'success') {
        throw new Error(response.data?.message || 'Détail Agent indisponible.');
      }
      setDetail(response.data.data);
    } catch (requestError) {
      if (traiterErreurSession(requestError)) return;
      console.error('Erreur détail Agent :', requestError);
      setDetailError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Impossible de charger cet Agent.'
      );
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Chargement initial unique.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter((agent) => {
      const matchesSearch =
        !q ||
        [agent.nom, agent.prenom, agent.identifiant, agent.email].some((value) =>
          String(value || '').toLowerCase().includes(q)
        );
      const matchesDispo =
        !disponibilite ||
        (disponibilite === 'DISPONIBLE' && agent.disponible) ||
        (disponibilite === 'EN_MISSION' && agent.en_mission) ||
        (disponibilite === 'INACTIF' && !agent.actif);
      return matchesSearch && matchesDispo;
    });
  }, [agents, search, disponibilite]);

  const compteurs = resume || {
    total_agents: agents.length,
    agents_actifs: agents.filter((agent) => agent.actif).length,
    agents_disponibles: agents.filter((agent) => agent.disponible).length,
    agents_en_mission: agents.filter((agent) => agent.en_mission).length,
  };

  if (selectedId) {
    const agentResume = agents.find((agent) => Number(agent.id) === Number(selectedId));
    const agent = detail || agentResume;
    return (
      <ResponsableLayout title="Détail de l'Agent TSP">
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setDetail(null);
              setDetailError('');
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} /> Retour à la liste des Agents
          </button>

          {detailError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {detailError}
            </div>
          )}

          {detailLoading && (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              Chargement du dossier Agent...
            </div>
          )}

          {!detailLoading && agent && (
            <>
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {[agent.prenom, agent.nom].filter(Boolean).join(' ') || agent.identifiant}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Identifiant : {agent.identifiant || '—'} · {agent.email || '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-black ${
                        agent.actif
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {agent.actif ? 'COMPTE ACTIF' : 'COMPTE INACTIF'}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-black ${
                        agent.en_mission
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                      }`}
                    >
                      {agent.en_mission ? 'EN MISSION' : 'DISPONIBLE'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Missions affectées" value={agent.total_missions ?? 0} icon={ClipboardList} />
                  <StatCard label="Missions en cours" value={agent.missions_en_cours ?? 0} tone="amber" />
                  <StatCard label="Missions terminées" value={agent.missions_terminees ?? 0} tone="green" />
                  <StatCard label="Anomalies signalées" value={agent.nombre_anomalies ?? 0} tone="red" icon={TriangleAlert} />
                  <StatCard label="Abonnés affectés" value={agent.abonnes_affectes ?? 0} tone="blue" />
                  <StatCard label="Relevés saisis" value={agent.releves_saisis ?? 0} tone="green" />
                  <StatCard label="À reprogrammer" value={agent.missions_a_reprogrammer ?? 0} tone="red" />
                  <StatCard label="En attente" value={agent.missions_en_attente ?? 0} />
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <p className="rounded-2xl bg-slate-50 p-3 text-slate-600">
                    <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Prochaine date prévue
                    </span>
                    {formatDate(agent.prochaine_date_prevue)}
                  </p>
                  <p className="rounded-2xl bg-slate-50 p-3 text-slate-600">
                    <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Dernière date prévue
                    </span>
                    {formatDate(agent.derniere_date_prevue)}
                  </p>
                  <p className="rounded-2xl bg-slate-50 p-3 text-slate-600">
                    <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Dernière activité
                    </span>
                    {formatDateTime(agent.derniere_activite)}
                  </p>
                </div>
              </section>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <h3 className="text-lg font-black text-slate-900">Missions de cet Agent</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Missions issues des plannings que vous avez créés. Les anciens index restent en lecture seule.
                  </p>
                </div>

                {!Array.isArray(agent.missions) ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Le détail des missions n'est pas disponible.
                  </div>
                ) : agent.missions.length === 0 ? (
                  <div className="p-12 text-center">
                    <ClipboardList size={38} className="mx-auto text-slate-300" />
                    <p className="mt-4 font-bold text-slate-700">
                      Aucune mission affectée à cet Agent dans vos plannings.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-3">Mission</th>
                          <th className="px-5 py-3">Abonné</th>
                          <th className="px-5 py-3">Compteur</th>
                          <th className="px-5 py-3">Quartier</th>
                          <th className="px-5 py-3">Date prévue</th>
                          <th className="px-5 py-3">Statut</th>
                          <th className="px-5 py-3">Ancien index</th>
                          <th className="px-5 py-3">Nouvel index</th>
                          <th className="px-5 py-3">Consommation</th>
                          <th className="px-5 py-3">Anomalie / motif</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {agent.missions.map((mission) => (
                          <tr key={mission.id} className="hover:bg-slate-50">
                            <td className="px-5 py-4 font-bold text-slate-800">#{mission.id}</td>
                            <td className="px-5 py-4 text-slate-600">
                              {[mission.abonne_prenom, mission.abonne_nom].filter(Boolean).join(' ') ||
                                mission.numero_abonne ||
                                '—'}
                              <span className="block text-xs text-slate-400">
                                {mission.numero_abonne || ''}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {mission.numero_compteur || '—'}
                              <span className="block text-xs text-slate-400">
                                {mission.type_compteur || ''}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-600">{mission.quartier || '—'}</td>
                            <td className="px-5 py-4 text-slate-500">{formatDate(mission.date_prevue)}</td>
                            <td className="px-5 py-4">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${statutMissionClass(
                                  mission.statut
                                )}`}
                              >
                                {statutMissionLabel(mission.statut)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {mission.ancien_index_releve ?? '—'}
                            </td>
                            <td className="px-5 py-4 font-bold text-slate-800">
                              {mission.index_releve ?? '—'}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {mission.consommation_releve ?? '—'}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {mission.resultat_visite || mission.motif_reprogrammation || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </ResponsableLayout>
    );
  }

  return (
    <ResponsableLayout title="Agents TSP">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Agents TSP</h2>
              <p className="mt-1 text-sm text-slate-500">
                Consultation des Agents, de leur disponibilité et de leur avancement. Les comptes Agent sont créés
                par l'Administrateur sur le Web.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              <RefreshCw size={17} /> Actualiser
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_200px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher par nom, identifiant ou e-mail..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={disponibilite}
              onChange={(event) => setDisponibilite(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-blue-500"
            >
              <option value="">Toutes les disponibilités</option>
              <option value="DISPONIBLE">Disponibles</option>
              <option value="EN_MISSION">En mission</option>
              <option value="INACTIF">Comptes inactifs</option>
            </select>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Agents enregistrés" value={compteurs.total_agents ?? 0} icon={Users} />
            <StatCard label="Comptes actifs" value={compteurs.agents_actifs ?? 0} tone="green" icon={UserCheck} />
            <StatCard label="Disponibles" value={compteurs.agents_disponibles ?? 0} tone="blue" />
            <StatCard label="En mission" value={compteurs.agents_en_mission ?? 0} tone="amber" />
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Chargement des Agents...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <UserRoundX size={38} className="mx-auto text-slate-300" />
              <p className="mt-4 font-bold text-slate-700">Aucun Agent ne correspond à cette recherche.</p>
              <p className="mt-1 text-sm text-slate-500">
                Les comptes Agent sont créés par l'Administrateur dans la gestion des utilisateurs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Agent</th>
                    <th className="px-5 py-3">Identifiant</th>
                    <th className="px-5 py-3">État</th>
                    <th className="px-5 py-3">Disponibilité</th>
                    <th className="px-5 py-3">Missions</th>
                    <th className="px-5 py-3">Terminées</th>
                    <th className="px-5 py-3">Relevés</th>
                    <th className="px-5 py-3">Anomalies</th>
                    <th className="px-5 py-3">Prochaine mission</th>
                    <th className="px-5 py-3">Détail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {[agent.prenom, agent.nom].filter(Boolean).join(' ') || '—'}
                        <span className="block text-xs font-normal text-slate-400">{agent.email || ''}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{agent.identifiant || '—'}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                            agent.actif
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          {agent.actif ? 'ACTIF' : 'INACTIF'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                            agent.en_mission
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : agent.actif
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          {agent.en_mission ? 'EN MISSION' : agent.actif ? 'DISPONIBLE' : 'INDISPONIBLE'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800">{agent.total_missions ?? 0}</td>
                      <td className="px-5 py-4 text-slate-600">{agent.missions_terminees ?? 0}</td>
                      <td className="px-5 py-4 text-slate-600">{agent.releves_saisis ?? 0}</td>
                      <td className="px-5 py-4 text-slate-600">{agent.nombre_anomalies ?? 0}</td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(agent.prochaine_date_prevue)}</td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => ouvrirAgent(agent.id)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          Consulter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ResponsableLayout>
  );
}
