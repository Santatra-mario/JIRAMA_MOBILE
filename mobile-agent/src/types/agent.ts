export type AgentUser = {
  id: number;
  nom: string;
  prenom: string;
  identifiant: string;
  email?: string | null;
  role: 'AGENT';
  statut: string;
};

export type AgentMission = {
  id: number;
  campagne_id: number;
  abonne_id: number;
  compteur_id: number;
  agent_id?: number;
  date_prevue: string | null;
  date_limite?: string | null;
  date_visite_reelle?: string | null;
  suivi_periodique?: boolean;
  observations?: string | null;
  statut: string;
  priorite?: string | null;
  nouvelle_visite?: boolean;
  motif_reprogrammation?: string | null;
  releve_id?: number | null;
  resultat_visite?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  statut_campagne?: string;
  numero_abonne?: string | null;
  abonne_nom?: string | null;
  abonne_prenom?: string | null;
  statut_abonne?: string;
  adresse?: string | null;
  quartier?: string | null;
  commune?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  numero_compteur?: string | null;
  type_compteur?: 'EAU' | 'ELECTRICITE' | string;
  date_releve_realisee?: string | null;
  type_releve?: string | null;
  index_releve?: number | string | null;
  consommation_releve?: number | string | null;
  releve_exploitable?: boolean;
  dernier_releve?: string | null;
  dernier_index?: number | string | null;
};

export type AgentCompteur = {
  id: number;
  numero_compteur: string;
  type: 'EAU' | 'ELECTRICITE' | string;
  date_installation?: string | null;
  statut: string;
  abonne_id: number;
  numero_abonne?: string | null;
  abonne_nom?: string | null;
  abonne_prenom?: string | null;
  abonne_adresse?: string | null;
  abonne_telephone?: string | null;
  dernier_releve?: string | null;
  dernier_index?: number | string | null;
  derniere_consommation?: number | string | null;
};

export type AgentAbonne = {
  id: number;
  numero_abonne: string;
  nom: string;
  prenom?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  statut: string;
  nombre_compteurs?: number | string;
  dernier_releve?: string | null;
};

export type AgentReleve = {
  id: number;
  compteur_id: number;
  numero_compteur: string;
  type_compteur: string;
  statut_compteur?: string;
  date_installation?: string | null;
  numero_abonne?: string;
  abonne_nom?: string;
  abonne_prenom?: string;
  date_releve: string;
  date_ancien_releve?: string | null;
  nouvel_index: number | string;
  ancien_index?: number | string | null;
  consommation?: number | string | null;
  type_releve?: string;
  observation?: string | null;
  unite?: string;
  created_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AgentAnomalie = {
  id: number;
  releve_id: number;
  compteur_id: number;
  type_anomalie: string;
  niveau: string;
  direction?: string | null;
  valeur?: number | string | null;
  valeur_reference?: number | string | null;
  variation?: number | string | null;
  statut: string;
  description?: string | null;
  commentaire?: string | null;
  date_detection?: string | null;
  date_releve?: string | null;
  ancien_index?: number | string | null;
  nouvel_index?: number | string | null;
  numero_compteur?: string | null;
  type_compteur?: string | null;
  numero_abonne?: string | null;
  abonne_nom?: string | null;
  abonne_prenom?: string | null;
  abonne_adresse?: string | null;
  unite?: string;
};

export type AgentNotification = {
  id: number;
  type?: string;
  sujet?: string;
  message?: string;
  date_envoi?: string | null;
  created_at?: string | null;
  statut: string;
  mission_id?: number | null;
  anomalie_id?: number | null;
  releve_id?: number | null;
  numero_compteur?: string | null;
  numero_abonne?: string | null;
  type_anomalie?: string | null;
  niveau?: string | null;
  valeur?: number | string | null;
  valeur_reference?: number | string | null;
  variation?: number | string | null;
};

export type AgentDashboardData = {
  status: string;
  stats: {
    compteurs?: number;
    compteursActifs?: number;
    abonnes?: number;
    abonnesActifs?: number;
    relevesMois?: number;
    anomalies?: number;
    notifications?: number;
  };
  relevesRecents: Array<Record<string, unknown>>;
  anomaliesRecentes: AgentAnomalie[];
};

export type ApiEnvelope<T> = { status: 'success' | 'error'; message?: string; data?: T };
