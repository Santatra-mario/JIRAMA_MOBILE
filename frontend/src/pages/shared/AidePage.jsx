import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  CircleHelp,
  Compass,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import SharedSupportLayout from './SharedSupportLayout.jsx';

const GUIDES = {
  AGENT: [
    {
      category: 'Interventions',
      title: 'Consulter mes missions',
      description: 'Retrouver les missions qui vous sont attribuées et consulter les informations nécessaires à la visite.',
      path: '/dashboard/agent/missions',
      label: 'Ouvrir Mes contrôles',
      steps: ['Ouvrez le menu « Mes contrôles ».', 'Consultez l’abonné, le compteur, l’adresse et la date prévue.', 'Vérifiez le statut de la mission avant de commencer l’intervention.'],
    },
    {
      category: 'Relevés',
      title: 'Enregistrer un relevé de compteur',
      description: 'Saisir un index réel et vérifier les informations du compteur avant transmission.',
      path: '/dashboard/agent/releves',
      label: 'Ouvrir les relevés',
      steps: ['Ouvrez « Relevés » et sélectionnez le compteur concerné.', 'Vérifiez l’ancien index et la date proposés à partir de l’historique.', 'Saisissez le nouvel index réellement observé puis vérifiez le récapitulatif.', 'Enregistrez et attendez la confirmation du serveur.'],
    },
    {
      category: 'Compteurs',
      title: 'Retrouver un compteur',
      description: 'Consulter les compteurs accessibles et identifier leur type et leur abonné associé.',
      path: '/dashboard/agent/compteurs',
      label: 'Ouvrir les compteurs',
      steps: ['Ouvrez le menu « Compteurs ».', 'Utilisez la recherche ou les filtres disponibles.', 'Consultez la fiche du compteur pour vérifier son abonné et son type.'],
    },
    {
      category: 'Abonnés',
      title: 'Consulter les informations d’un abonné',
      description: 'Retrouver les coordonnées et l’adresse utiles à une intervention.',
      path: '/dashboard/agent/abonnes',
      label: 'Ouvrir les abonnés',
      steps: ['Ouvrez « Abonnés ».', 'Recherchez le numéro ou le nom de l’abonné.', 'Vérifiez le quartier et les informations de contact disponibles.'],
    },
    {
      category: 'Notifications',
      title: 'Lire les consignes et alertes',
      description: 'Consulter les messages reçus dans votre espace Agent.',
      path: '/dashboard/agent/notifications',
      label: 'Ouvrir les notifications',
      steps: ['Ouvrez « Notifications ».', 'Lisez le message et son éventuel motif.', 'Suivez l’action demandée si une intervention est nécessaire.'],
    },
  ],
  RESPONSABLE: [
    {
      category: 'Planning',
      title: 'Préparer les contrôles',
      description: 'Consulter le planning, les zones et les contrôles organisés.',
      path: '/dashboard/responsable/controles',
      label: 'Ouvrir le planning',
      steps: ['Ouvrez « Planning des contrôles ».', 'Sélectionnez la période ou la zone disponible.', 'Consultez les abonnés concernés et l’état d’avancement.'],
    },
    {
      category: 'Missions',
      title: 'Suivre les interventions',
      description: 'Vérifier les missions et les résultats qui remontent des Agents.',
      path: '/dashboard/responsable/controles',
      label: 'Consulter les contrôles',
      steps: ['Ouvrez le planning des contrôles.', 'Repérez les missions en attente, en cours ou terminées selon les statuts présents.', 'Consultez le résultat ou les informations de suivi disponibles.'],
    },
    {
      category: 'Anomalies',
      title: 'Suivre les anomalies',
      description: 'Examiner les anomalies accessibles à votre rôle.',
      path: '/dashboard/responsable/anomalies',
      label: 'Ouvrir les anomalies',
      steps: ['Ouvrez « Anomalies ».', 'Filtrez la liste selon les critères disponibles.', 'Consultez le compteur, l’abonné, le statut et les détails de l’anomalie.'],
    },
    {
      category: 'Analyse',
      title: 'Comparer les consommations',
      description: 'Utiliser les outils de comparaison disponibles dans votre espace.',
      path: '/dashboard/responsable/comparaison',
      label: 'Ouvrir la comparaison',
      steps: ['Ouvrez « Comparaison ».', 'Choisissez les critères ou la période proposés.', 'Interprétez les valeurs avec leurs unités et leur période de référence.'],
    },
    {
      category: 'Notifications',
      title: 'Consulter les alertes',
      description: 'Lire les notifications liées à votre activité de supervision.',
      path: '/dashboard/responsable/notifications',
      label: 'Ouvrir les notifications',
      steps: ['Ouvrez « Notifications ».', 'Consultez le détail de chaque message.', 'Traitez les actions qui relèvent de vos permissions.'],
    },
  ],
  ADMINISTRATEUR: [
    {
      category: 'Abonnés',
      title: 'Ajouter ou modifier un abonné',
      description: 'Gérer les dossiers des abonnés et vérifier leurs coordonnées.',
      path: '/dashboard/admin/abonnes',
      label: 'Ouvrir les abonnés',
      steps: ['Ouvrez « Abonnés ».', 'Choisissez « Ajouter un abonné » ou l’action de modification autorisée.', 'Complétez les informations et vérifiez les champs obligatoires.', 'Enregistrez et attendez le retour du serveur.'],
    },
    {
      category: 'Utilisateurs',
      title: 'Gérer les comptes utilisateurs',
      description: 'Consulter les utilisateurs, leurs rôles et les actions disponibles.',
      path: '/dashboard/admin/utilisateurs',
      label: 'Ouvrir les utilisateurs',
      steps: ['Ouvrez « Utilisateurs ».', 'Utilisez la recherche et les filtres disponibles.', 'Effectuez uniquement les actions permises par votre profil.'],
    },
    {
      category: 'Anomalies',
      title: 'Examiner les anomalies',
      description: 'Consulter les alertes et les informations de traitement.',
      path: '/dashboard/admin/anomalies',
      label: 'Ouvrir les anomalies',
      steps: ['Ouvrez « Anomalies ».', 'Consultez le type, le statut et les détails de chaque dossier.', 'Utilisez les actions de traitement réellement disponibles.'],
    },
    {
      category: 'Analyse',
      title: 'Comparer les consommations',
      description: 'Utiliser les graphiques et comparaisons alimentés par les données disponibles.',
      path: '/dashboard/admin/comparaison',
      label: 'Ouvrir la comparaison',
      steps: ['Ouvrez « Comparaison ».', 'Sélectionnez la période et les critères proposés.', 'Vérifiez toujours les unités et les périodes affichées.'],
    },
    {
      category: 'Sécurité',
      title: 'Consulter le journal d’audit',
      description: 'Examiner les traces des actions enregistrées par le système.',
      path: '/dashboard/admin/journal-audit',
      label: 'Ouvrir le journal d’audit',
      steps: ['Ouvrez « Journal d’audit ».', 'Filtrez les événements par utilisateur ou par action.', 'Consultez la date, la ressource et les détails disponibles.'],
    },
    {
      category: 'Paramètres',
      title: 'Gérer les préférences',
      description: 'Adapter le thème et les préférences disponibles dans votre compte.',
      path: '/dashboard/admin/parametres',
      label: 'Ouvrir les paramètres',
      steps: ['Ouvrez « Paramètres ».', 'Modifiez les préférences proposées.', 'Enregistrez puis vérifiez le retour de confirmation.'],
    },
  ],
};

function roleActuel() {
  try {
    return String(JSON.parse(localStorage.getItem('user') || '{}')?.role || 'AGENT').trim().toUpperCase();
  } catch {
    return 'AGENT';
  }
}

export default function AidePage() {
  const role = roleActuel();
  const guides = GUIDES[role] || GUIDES.AGENT;
  const [search, setSearch] = useState('');
  const [openGuide, setOpenGuide] = useState(0);
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('fr');
    if (!q) return guides;
    return guides.filter((guide) => [guide.category, guide.title, guide.description, ...guide.steps].join(' ').toLocaleLowerCase('fr').includes(q));
  }, [guides, search]);
  const roleLabel = role === 'ADMINISTRATEUR' ? 'Administrateur' : role === 'RESPONSABLE' ? 'Responsable' : 'Agent';

  return (
    <SharedSupportLayout title="Centre d’aide">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-jr-bordure bg-gradient-to-r from-jr-eau-fonce to-jr-eau p-6 text-white shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-8 -top-10 opacity-15" aria-hidden="true"><BookOpen size={190} /></div>
          <div className="relative z-10 max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider"><CircleHelp size={14} /> Assistance JIRAMA</p>
            <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">Comment utiliser votre espace ?</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">Retrouvez des guides pratiques adaptés à votre rôle de {roleLabel.toLowerCase()} et aux menus disponibles dans votre application.</p>
          </div>
        </section>

        <section className="jr-verre rounded-2xl border border-jr-bordure p-4 shadow-sm sm:p-5">
          <label htmlFor="recherche-aide" className="mb-2 block text-sm font-semibold text-jr-titre">Rechercher dans les guides</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-jr-faible" size={18} aria-hidden="true" />
            <input id="recherche-aide" value={search} onChange={(event) => { setSearch(event.target.value); setOpenGuide(0); }} placeholder="Ex. enregistrer un relevé, affecter une mission…" className="jr-field w-full rounded-xl border border-jr-bordure bg-jr-champ py-3 pl-10 pr-4 text-sm" />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-3" aria-label="Guides disponibles">
            {filtered.length === 0 ? (
              <div className="jr-verre rounded-2xl border border-dashed border-jr-bordure p-10 text-center">
                <Search className="mx-auto text-jr-faible" size={28} aria-hidden="true" />
                <p className="mt-3 font-semibold text-jr-titre">Aucun guide correspondant</p>
                <p className="mt-1 text-sm text-jr-doux">Essayez un autre mot-clé.</p>
              </div>
            ) : filtered.map((guide, index) => {
              const isOpen = openGuide === index;
              return (
                <article key={`${guide.category}-${guide.title}`} className="jr-verre overflow-hidden rounded-2xl border border-jr-bordure shadow-sm transition-shadow hover:shadow-md">
                  <button type="button" onClick={() => setOpenGuide(isOpen ? -1 : index)} aria-expanded={isOpen} className="flex w-full items-center gap-3 p-4 text-left sm:p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jr-eau-pale text-jr-lien"><BookOpen size={19} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold uppercase tracking-wider text-jr-lien">{guide.category}</span>
                      <span className="mt-1 block font-bold text-jr-titre">{guide.title}</span>
                      <span className="mt-1 block text-sm text-jr-doux">{guide.description}</span>
                    </span>
                    <ChevronDown size={19} className={`shrink-0 text-jr-faible transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <div className="border-t border-jr-bordure bg-jr-fond/55 px-5 py-4 sm:px-6">
                      <ol className="space-y-2.5">
                        {guide.steps.map((step, stepIndex) => <li key={step} className="flex gap-3 text-sm text-jr-texte"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-jr-eau text-xs font-bold text-white">{stepIndex + 1}</span><span className="pt-0.5">{step}</span></li>)}
                      </ol>
                      <Link to={guide.path} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-jr-eau px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jr-elec focus-visible:ring-offset-2"><Compass size={16} aria-hidden="true" />{guide.label}</Link>
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <aside className="space-y-4">
            <div className="jr-verre rounded-2xl border border-jr-bordure p-5 shadow-sm">
              <div className="flex items-center gap-2 text-jr-lien"><ShieldCheck size={18} /><h3 className="font-bold text-jr-titre">Votre espace</h3></div>
              <p className="mt-2 text-sm text-jr-doux">Les guides affichés correspondent au rôle <strong className="text-jr-texte">{roleLabel}</strong>. Les actions restent soumises aux permissions de votre compte.</p>
            </div>
            <div className="jr-verre rounded-2xl border border-jr-bordure p-5 shadow-sm">
              <div className="flex items-center gap-2 text-jr-lien"><Users size={18} /><h3 className="font-bold text-jr-titre">Bonnes pratiques</h3></div>
              <ul className="mt-3 space-y-2 text-sm text-jr-doux">
                <li>• Vérifiez les informations avant validation.</li>
                <li>• Attendez la confirmation après chaque enregistrement.</li>
                <li>• Ne partagez jamais votre mot de passe ou votre jeton de connexion.</li>
                <li>• En cas d'erreur, conservez le message affiché pour faciliter le diagnostic.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-jr-elec/40 bg-jr-elec-pale p-5 text-jr-sur-elec">
              <div className="flex items-center gap-2 font-bold"><Zap size={17} />Conseil JIRAMA</div>
              <p className="mt-2 text-sm leading-6">Utilisez les filtres et les périodes pour retrouver plus rapidement les informations utiles à votre travail.</p>
            </div>
          </aside>
        </div>
      </div>
    </SharedSupportLayout>
  );
}
