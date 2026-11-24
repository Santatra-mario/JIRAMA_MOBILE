const pool = require('../config/db');

/* =========================================================
   CONSULTATION DES AGENTS TSP — ESPACE RESPONSABLE
   Lecture seule. Toutes les statistiques proviennent des
   tables réelles : users, campagnes_controle, missions_controle,
   releves, anomalies.
   Aucune table, colonne ou statut n'est inventé.
========================================================= */

function idPositif(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function erreur(res, status, message) {
  return res.status(status).json({ status: 'error', message });
}

async function verifierResponsableActif(userId) {
  if (!userId) return null;
  const result = await pool.query(
    `SELECT id, nom, prenom, email, identifiant, role, statut
     FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const user = result.rows[0];
  if (
    !user ||
    String(user.role || '').trim().toUpperCase() !== 'RESPONSABLE' ||
    String(user.statut || '').trim().toLowerCase() !== 'actif'
  ) {
    return null;
  }
  return user;
}

/* Statistiques établies à partir des missions réellement affectées
   à l'Agent dans les plannings créés par le Responsable connecté.
   Les missions annulées sont exclues des compteurs. */
const STATISTIQUES_AGENT_SQL = `
  SELECT
    COUNT(*)::int AS total_missions,
    COUNT(*) FILTER (WHERE mc.statut = 'PLANIFIEE')::int AS missions_planifiees,
    COUNT(*) FILTER (WHERE mc.statut = 'EN_COURS')::int AS missions_en_cours,
    COUNT(*) FILTER (WHERE mc.statut = 'TERMINEE')::int AS missions_terminees,
    COUNT(*) FILTER (WHERE mc.statut = 'A_REPROGRAMMER')::int AS missions_a_reprogrammer,
    COUNT(*) FILTER (WHERE mc.statut = 'EN_ATTENTE')::int AS missions_en_attente,
    COUNT(DISTINCT mc.abonne_id)::int AS abonnes_affectes,
    COUNT(*) FILTER (WHERE mc.releve_id IS NOT NULL)::int AS releves_saisis,
    MAX(mc.date_prevue)::text AS derniere_date_prevue,
    MIN(mc.date_prevue) FILTER (
      WHERE mc.statut IN ('PLANIFIEE', 'EN_COURS')
    )::text AS prochaine_date_prevue,
    MAX(mc.updated_at) FILTER (
      WHERE mc.statut = 'TERMINEE' OR mc.releve_id IS NOT NULL
    )::text AS derniere_activite
  FROM missions_controle mc
  INNER JOIN campagnes_controle cc ON cc.id = mc.campagne_id
  WHERE mc.agent_id = u.id
    AND cc.created_by = $1
    AND mc.statut <> 'ANNULEE'
`;

async function getAgentsResponsable(req, res) {
  try {
    const responsable = await verifierResponsableActif(idPositif(req.user?.id));
    if (!responsable) {
      return erreur(res, 403, 'Accès réservé à un responsable actif.');
    }

    const result = await pool.query(
      `SELECT
         u.id, u.identifiant, u.nom, u.prenom, u.email, u.role, u.statut,
         COALESCE(s.total_missions, 0) AS total_missions,
         COALESCE(s.missions_planifiees, 0) AS missions_planifiees,
         COALESCE(s.missions_en_cours, 0) AS missions_en_cours,
         COALESCE(s.missions_terminees, 0) AS missions_terminees,
         COALESCE(s.missions_a_reprogrammer, 0) AS missions_a_reprogrammer,
         COALESCE(s.missions_en_attente, 0) AS missions_en_attente,
         COALESCE(s.abonnes_affectes, 0) AS abonnes_affectes,
         COALESCE(s.releves_saisis, 0) AS releves_saisis,
         s.derniere_date_prevue,
         s.prochaine_date_prevue,
         s.derniere_activite,
         COALESCE(an.nombre_anomalies, 0) AS nombre_anomalies
       FROM users u
       LEFT JOIN LATERAL (${STATISTIQUES_AGENT_SQL}) s ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS nombre_anomalies
         FROM anomalies x
         INNER JOIN releves r ON r.id = x.releve_id
         WHERE r.created_by = u.id
       ) an ON TRUE
       WHERE UPPER(TRIM(u.role)) = 'AGENT'
       ORDER BY LOWER(TRIM(u.nom)), LOWER(TRIM(u.prenom)), u.id`,
      [responsable.id]
    );

    const agents = result.rows.map((agent) => ({
      ...agent,
      actif: String(agent.statut || '').trim().toLowerCase() === 'actif',
      en_mission: Number(agent.missions_en_cours) > 0,
      disponible:
        String(agent.statut || '').trim().toLowerCase() === 'actif' &&
        Number(agent.missions_en_cours) === 0,
    }));

    const actifs = agents.filter((agent) => agent.actif);

    return res.json({
      status: 'success',
      data: agents,
      resume: {
        total_agents: agents.length,
        agents_actifs: actifs.length,
        agents_disponibles: actifs.filter((agent) => agent.disponible).length,
        agents_en_mission: actifs.filter((agent) => agent.en_mission).length,
      },
    });
  } catch (error) {
    console.error('Erreur chargement des Agents TSP :', error);
    return erreur(res, 500, 'Impossible de charger les Agents TSP.');
  }
}

async function getAgentResponsable(req, res) {
  try {
    const responsable = await verifierResponsableActif(idPositif(req.user?.id));
    if (!responsable) {
      return erreur(res, 403, 'Accès réservé à un responsable actif.');
    }

    const agentId = idPositif(req.params.id);
    if (!agentId) return erreur(res, 400, 'Identifiant Agent invalide.');

    const agentResult = await pool.query(
      `SELECT
         u.id, u.identifiant, u.nom, u.prenom, u.email, u.role, u.statut,
         COALESCE(s.total_missions, 0) AS total_missions,
         COALESCE(s.missions_planifiees, 0) AS missions_planifiees,
         COALESCE(s.missions_en_cours, 0) AS missions_en_cours,
         COALESCE(s.missions_terminees, 0) AS missions_terminees,
         COALESCE(s.missions_a_reprogrammer, 0) AS missions_a_reprogrammer,
         COALESCE(s.missions_en_attente, 0) AS missions_en_attente,
         COALESCE(s.abonnes_affectes, 0) AS abonnes_affectes,
         COALESCE(s.releves_saisis, 0) AS releves_saisis,
         s.derniere_date_prevue,
         s.prochaine_date_prevue,
         s.derniere_activite,
         COALESCE(an.nombre_anomalies, 0) AS nombre_anomalies
       FROM users u
       LEFT JOIN LATERAL (${STATISTIQUES_AGENT_SQL}) s ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS nombre_anomalies
         FROM anomalies x
         INNER JOIN releves r ON r.id = x.releve_id
         WHERE r.created_by = u.id
       ) an ON TRUE
       WHERE u.id = $2 AND UPPER(TRIM(u.role)) = 'AGENT'
       LIMIT 1`,
      [responsable.id, agentId]
    );

    const agent = agentResult.rows[0];
    if (!agent) {
      return erreur(res, 404, 'Agent introuvable ou ne possédant pas le rôle AGENT.');
    }

    const missionsResult = await pool.query(
      `SELECT
         mc.id,
         mc.campagne_id,
         mc.statut,
         mc.priorite,
         mc.date_prevue::text AS date_prevue,
         mc.date_limite::text AS date_limite,
         mc.date_visite_reelle::text AS date_visite_reelle,
         mc.resultat_visite,
         mc.motif_reprogrammation,
         mc.observations,
         mc.releve_id,
         mc.created_at,
         cc.mois::text AS mois,
         cc.date_debut::text AS date_debut,
         cc.date_fin::text AS date_fin,
         cc.statut AS statut_campagne,
         a.numero_abonne,
         a.nom AS abonne_nom,
         a.prenom AS abonne_prenom,
         a.adresse,
         a.quartier,
         a.commune,
         c.numero_compteur,
         c.type AS type_compteur,
         r.nouvel_index AS index_releve,
         r.ancien_index AS ancien_index_releve,
         r.consommation AS consommation_releve,
         r.date_releve::text AS date_releve,
         r.observation AS observation_releve
       FROM missions_controle mc
       INNER JOIN campagnes_controle cc ON cc.id = mc.campagne_id
       INNER JOIN abonnes a ON a.id = mc.abonne_id
       INNER JOIN compteurs c ON c.id = mc.compteur_id
       LEFT JOIN releves r ON r.id = mc.releve_id
       WHERE mc.agent_id = $1
         AND cc.created_by = $2
         AND mc.statut <> 'ANNULEE'
       ORDER BY COALESCE(mc.date_prevue, mc.created_at::date) DESC, mc.id DESC
       LIMIT 200`,
      [agentId, responsable.id]
    );

    return res.json({
      status: 'success',
      data: {
        ...agent,
        actif: String(agent.statut || '').trim().toLowerCase() === 'actif',
        en_mission: Number(agent.missions_en_cours) > 0,
        disponible:
          String(agent.statut || '').trim().toLowerCase() === 'actif' &&
          Number(agent.missions_en_cours) === 0,
        missions: missionsResult.rows,
      },
    });
  } catch (error) {
    console.error('Erreur chargement du détail Agent :', error);
    return erreur(res, 500, 'Impossible de charger le détail de cet Agent.');
  }
}

module.exports = {
  getAgentsResponsable,
  getAgentResponsable,
};
