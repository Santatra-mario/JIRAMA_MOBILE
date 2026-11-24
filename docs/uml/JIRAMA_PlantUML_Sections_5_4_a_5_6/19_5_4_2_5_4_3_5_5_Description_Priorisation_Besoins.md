# Dossier PlantUML — Mémoire JIRAMA Antsirabe

Ce dossier couvre les rubriques du canevas ENI : 5.4.1 à 5.6. Le canevas distingue le diagramme de cas d'utilisation, les descriptions textuelles, la priorisation, les diagrammes de séquence système, la spécification des besoins techniques et la modélisation du domaine. Les descriptions textuelles et la priorisation sont des contenus rédactionnels/tableaux, pas des diagrammes UML obligatoires.

## Contenu

| Fichier | Section | Contenu |
|---|---|---|
| `01_5_4_1_Cas_Utilisation_Global.puml` | 5.4.1 | Diagramme global des cas d'utilisation |
| `02_...` à `16_...` | 5.4.4 | Diagrammes de séquence système (un diagramme par parcours métier principal) |
| `17_5_5_Architecture_Technique.puml` | 5.5 | Vue technique complémentaire (ce n'est pas le tableau des besoins) |
| `18_5_6_Modele_Domaine.puml` | 5.6 | Modèle conceptuel du domaine sous forme de diagramme de classes |
| `19_5_4_2_5_4_3_5_5_Description_Priorisation_Besoins.md` | 5.4.2, 5.4.3, 5.5 | Descriptions textuelles, priorisation proposée et spécifications techniques |

## Ouverture dans VS Code

1. Installer l'extension **PlantUML** (jebbs).
2. Ouvrir un fichier `.puml`.
3. Utiliser `Alt + D` pour ouvrir la prévisualisation.
4. Pour une exportation, utiliser la commande PlantUML de l'extension et privilégier SVG pour le mémoire.

## Important sur la portée

Les diagrammes de séquence de la section 5.4.4 sont des **diagrammes de séquence système** : ils montrent les échanges entre un acteur et le système considéré comme une boîte noire. Ils ne détaillent pas les contrôleurs, services, API ou tables internes ; ce niveau de détail appartient à la conception détaillée (chapitre 6).

Le fichier `17_5_5_Architecture_Technique.puml` est fourni comme illustration technique complémentaire. Pour la section 5.5, le tableau des besoins techniques dans le fichier Markdown reste le support principal.

Les attributs et cardinalités du modèle de domaine sont conceptuels et doivent être confrontés au schéma PostgreSQL réellement livré avant d'être présentés comme le modèle physique de la base.

## Hypothèses et éléments à valider

- Les profils applicatifs documentés sont Administrateur, Responsable et Agent.
- Les droits précis doivent rester alignés sur les routes et middlewares backend.
- La création de compteur par l'Agent dépend de la route et de ses autorisations.
- La correction d'un relevé par l'Agent est représentée sous réserve du contrôle de propriété du relevé.
- Les fonctions mobiles sont prises en compte à partir des écrans Agent fournis dans les échanges. Le dépôt complet du frontend Web et du backend n'étant pas joint à ce lot, les noms exacts de routes, tous les champs SQL et certains états de workflow doivent encore être vérifiés.
- Les critères de détection d'anomalies et les transitions de statut doivent être confirmés avec les règles métier de la JIRAMA ; un signal atypique n'est pas une preuve de fraude.


# 5.4.2. Description textuelle des cas d'utilisation

Les scénarios ci-dessous sont rédigés au niveau système. Les acteurs et les droits reprennent les profils décrits dans le dossier de projet ; les étapes conditionnelles doivent être confirmées avec la version finale du backend.

## UC01 — S'authentifier
- **Acteur principal :** Utilisateur (Administrateur, Responsable ou Agent).
- **Objectif :** Accéder à l'espace correspondant au rôle attribué.
- **Préconditions :** Le compte existe ; l'utilisateur possède ses identifiants.
- **Scénario nominal :** 1) L'utilisateur saisit son identifiant et son mot de passe. 2) Le système vérifie les informations et le statut du compte. 3) Le système ouvre l'espace autorisé.
- **Variantes :** Identifiants erronés, compte désactivé ou accès refusé : le système affiche un message et ne crée pas de session valide.
- **Postcondition :** Une session authentifiée est ouverte en cas de succès.

## UC02 — Gérer les utilisateurs et les rôles
- **Acteur principal :** Administrateur.
- **Objectif :** Administrer les comptes applicatifs et leurs rôles.
- **Préconditions :** L'Administrateur est authentifié et autorisé.
- **Scénario nominal :** 1) Il ouvre la gestion des utilisateurs. 2) Il recherche ou sélectionne un compte. 3) Il crée ou modifie les informations et le rôle. 4) Le système valide et enregistre les changements.
- **Variantes :** Données invalides, compte inexistant ou droit insuffisant : l'opération est refusée.
- **Postcondition :** Le compte est créé ou mis à jour conformément aux autorisations.

## UC03 — Consulter les abonnés et les compteurs
- **Acteurs principaux :** Administrateur, Responsable, Agent.
- **Objectif :** Retrouver les dossiers d'abonnés et les compteurs associés.
- **Préconditions :** L'utilisateur est authentifié et autorisé à consulter.
- **Scénario nominal :** 1) Il ouvre le module. 2) Il saisit un critère de recherche ou un filtre. 3) Le système affiche les résultats. 4) Il sélectionne une fiche pour consulter ses informations.
- **Variantes :** Aucun résultat ou données non accessibles.
- **Postcondition :** Les informations sont consultées sans modification.

## UC04 — Gérer les abonnés
- **Acteur principal :** Administrateur.
- **Objectif :** Administrer les informations des abonnés dans les limites des droits.
- **Préconditions :** Administrateur authentifié.
- **Scénario nominal :** 1) L'Administrateur recherche un abonné. 2) Il ouvre sa fiche. 3) Il effectue une modification, un changement de statut ou une suppression autorisée. 4) Le système valide et enregistre.
- **Variantes :** Abonné inexistant, données invalides ou contrainte empêchant l'opération.
- **Postcondition :** La fiche est mise à jour ou l'action est refusée.

## UC05 — Gérer les compteurs
- **Acteurs principaux :** Administrateur ; Agent pour la création limitée si la route l'autorise.
- **Objectif :** Consulter ou mettre à jour les informations des compteurs selon les rôles.
- **Préconditions :** Utilisateur authentifié ; autorisation correspondant à l'opération.
- **Scénario nominal :** 1) L'utilisateur recherche un compteur. 2) Le système affiche sa fiche. 3) L'acteur habilité demande la modification ou le changement de statut. 4) Le système vérifie les champs et enregistre.
- **Variantes :** Droit absent, compteur introuvable ou données invalides.
- **Postcondition :** Les informations autorisées sont actualisées.

## UC06 — Consulter les relevés et l'historique
- **Acteurs principaux :** Administrateur, Responsable, Agent.
- **Objectif :** Consulter les index successifs d'un compteur.
- **Préconditions :** Utilisateur authentifié ; compteur identifiable.
- **Scénario nominal :** 1) L'utilisateur sélectionne un compteur. 2) Il demande l'historique. 3) Le système affiche les relevés et leurs dates. 4) L'utilisateur ouvre un relevé pour en voir le détail.
- **Variantes :** Aucun relevé antérieur disponible ; le système signale l'absence d'historique sans inventer un ancien index.
- **Postcondition :** L'historique est consulté.

## UC07 — Enregistrer un relevé
- **Acteurs principaux :** Agent, Responsable.
- **Objectif :** Enregistrer l'index réellement observé sur un compteur.
- **Préconditions :** Utilisateur autorisé ; compteur sélectionné ; date et nouvel index disponibles.
- **Scénario nominal :** 1) L'utilisateur choisit le compteur. 2) Le système affiche l'ancien index lorsqu'il existe. 3) L'utilisateur saisit la date, le nouvel index et éventuellement une observation. 4) Le système vérifie les champs et la cohérence. 5) Le système enregistre le relevé. 6) La consommation est calculée si les deux index de référence sont valides et comparables.
- **Variantes :** Relevé initial ou historique précédent indisponible : la consommation est indiquée comme non calculable. Index incohérent : l'enregistrement est refusé ou soumis aux règles de validation configurées.
- **Postcondition :** Le relevé est enregistré et rattaché au compteur.

## UC08 — Corriger un relevé
- **Acteurs principaux :** Agent et Responsable selon les droits ; l'Agent est limité aux relevés que le contrôle backend lui autorise.
- **Objectif :** Corriger une information erronée sans altérer abusivement l'historique.
- **Préconditions :** Relevé existant ; utilisateur habilité ; données de correction disponibles.
- **Scénario nominal :** 1) L'utilisateur demande la correction. 2) Le système vérifie le rôle et, pour l'Agent, le droit sur le relevé. 3) Le système affiche les champs modifiables. 4) L'utilisateur soumet la correction. 5) Le système vérifie les dates et les index, puis enregistre.
- **Variantes :** Relevé appartenant à un autre compte Agent, dates incohérentes ou nouvel index invalide : correction refusée.
- **Postcondition :** Le relevé est corrigé selon les règles d'accès.

## UC09 — Supprimer un relevé
- **Acteur principal :** Administrateur.
- **Objectif :** Supprimer un relevé dans les cas autorisés.
- **Préconditions :** Administrateur authentifié ; relevé existant.
- **Scénario nominal :** 1) L'Administrateur sélectionne le relevé. 2) Il confirme la suppression. 3) Le système vérifie les contraintes. 4) Le système exécute l'opération et confirme le résultat.
- **Variantes :** Relevé introuvable ou contrainte empêchant la suppression.
- **Postcondition :** Le relevé est supprimé si l'opération est autorisée.

## UC10 — Consulter et analyser les anomalies
- **Acteurs principaux :** Administrateur, Responsable, Agent pour les consultations et analyses autorisées.
- **Objectif :** Examiner les situations inhabituelles liées aux compteurs ou aux consommations.
- **Préconditions :** Utilisateur authentifié ; données nécessaires disponibles.
- **Scénario nominal :** 1) L'utilisateur ouvre les anomalies. 2) Il sélectionne un compteur ou une anomalie. 3) Il demande l'analyse. 4) Le système applique les critères définis et présente les résultats.
- **Variantes :** Données insuffisantes : le système indique les limites de l'analyse.
- **Postcondition :** Le résultat est consulté ; un signal n'est pas assimilé automatiquement à une fraude.

## UC11 — Définir le statut final d'une anomalie
- **Acteur principal :** Administrateur.
- **Objectif :** Enregistrer la décision finale autorisée concernant une anomalie.
- **Préconditions :** Anomalie existante ; Administrateur authentifié.
- **Scénario nominal :** 1) Il ouvre le dossier. 2) Il examine les informations. 3) Il choisit un statut autorisé. 4) Le système vérifie les droits et la valeur. 5) Il enregistre le statut.
- **Variantes :** Droit insuffisant ou statut non valide.
- **Postcondition :** Le statut final est actualisé si la validation est réussie.

## UC12 — Créer et organiser une campagne de contrôle
- **Acteur principal :** Responsable.
- **Objectif :** Préparer une campagne comprenant ses dates et ses missions.
- **Préconditions :** Responsable authentifié et autorisé.
- **Scénario nominal :** 1) Il crée une campagne. 2) Il renseigne les informations et les dates. 3) Il ajoute les missions. 4) Le système vérifie la cohérence et enregistre.
- **Variantes :** Dates incohérentes ou informations obligatoires absentes.
- **Postcondition :** La campagne et ses missions sont enregistrées dans leur état courant.

## UC13 — Affecter des agents et publier une campagne
- **Acteur principal :** Responsable.
- **Objectif :** Affecter les agents et rendre la campagne disponible selon le processus prévu.
- **Préconditions :** Campagne et missions créées ; agents disponibles et identifiables.
- **Scénario nominal :** 1) Le Responsable sélectionne les missions. 2) Il affecte un ou plusieurs agents. 3) Le système vérifie les affectations. 4) Le Responsable demande la publication. 5) Le système vérifie les éléments requis et publie la campagne.
- **Variantes :** Agent non admissible, mission incomplète ou campagne non prête.
- **Postcondition :** Les affectations et l'état de publication sont mis à jour.

## UC14 — Clôturer une campagne et suivre les missions
- **Acteur principal :** Responsable.
- **Objectif :** Suivre les missions et clôturer une campagne selon les conditions définies.
- **Préconditions :** Campagne existante.
- **Scénario nominal :** 1) Le Responsable consulte l'avancement. 2) Il examine les états des missions. 3) Il demande la clôture. 4) Le système vérifie les conditions et enregistre la clôture si elle est autorisée.
- **Variantes :** Des missions restent à traiter ou les conditions de clôture ne sont pas satisfaites.
- **Postcondition :** L'état de la campagne reflète la décision validée.

## UC15 — Consulter et préparer une mission
- **Acteur principal :** Agent.
- **Objectif :** Prendre connaissance des missions qui lui sont affectées et préparer l'intervention.
- **Préconditions :** Agent authentifié ; affectation existante.
- **Scénario nominal :** 1) L'Agent consulte ses missions. 2) Il sélectionne une mission. 3) Le système affiche le détail et les informations accessibles. 4) L'Agent prépare son intervention.
- **Variantes :** Aucune mission affectée ou détails indisponibles.
- **Postcondition :** L'Agent dispose des informations nécessaires à l'intervention.

## UC16 — Réaliser un contrôle et mettre à jour une mission
- **Acteur principal :** Agent.
- **Objectif :** Enregistrer les résultats d'une intervention sur le terrain.
- **Préconditions :** Mission affectée à l'Agent ; intervention autorisée.
- **Scénario nominal :** 1) L'Agent ouvre la mission. 2) Il effectue le contrôle prévu. 3) Il saisit les observations et informations constatées. 4) Il demande la mise à jour du statut. 5) Le système vérifie les données et la transition permise. 6) Le système confirme l'enregistrement.
- **Variantes :** Données incomplètes ou transition de statut non autorisée.
- **Postcondition :** Les résultats et l'avancement de la mission sont enregistrés.

## UC17 — Gérer les notifications
- **Acteur principal :** Agent ; Responsable pour la consultation des notifications qui lui sont accessibles.
- **Objectif :** Consulter et traiter les notifications du compte.
- **Préconditions :** Utilisateur authentifié.
- **Scénario nominal :** 1) L'utilisateur consulte ses notifications. 2) Il ouvre une notification. 3) Il peut la marquer comme lue, l'archiver ou la supprimer selon les droits. 4) Il peut consulter les archives.
- **Variantes :** Notification absente ou action refusée.
- **Postcondition :** Le statut de notification est mis à jour.

## UC18 — Consulter le tableau de bord et les statistiques
- **Acteur principal :** Responsable (autres rôles seulement si les droits de l'application les autorisent).
- **Objectif :** Obtenir une synthèse des relevés, anomalies et missions.
- **Préconditions :** Données disponibles ; droit de consultation.
- **Scénario nominal :** 1) Le Responsable ouvre le tableau de bord. 2) Le système calcule ou récupère les indicateurs disponibles. 3) Il affiche graphiques, comparaisons et statistiques. 4) L'utilisateur applique un filtre si cette fonction existe.
- **Variantes :** Données insuffisantes ou filtre sans résultat.
- **Postcondition :** Les indicateurs et visualisations sont consultés.

## UC19 — Générer et partager un relevé PDF
- **Acteur principal :** Agent.
- **Objectif :** Produire une copie PDF consultative d'un relevé.
- **Préconditions :** Relevé accessible ; terminal mobile permettant l'impression ou le partage.
- **Scénario nominal :** 1) L'Agent sélectionne un relevé. 2) Il demande l'export PDF. 3) Le système compose le document. 4) Le système ouvre le partage natif ou l'impression. 5) L'Agent choisit une destination ou l'enregistrement PDF.
- **Variantes :** Fichier impossible à générer ou partage indisponible : une solution d'impression de secours est proposée lorsque disponible.
- **Postcondition :** Le document est partagé ou enregistré par l'utilisateur.

## UC20 — Consulter le journal, l'aide et les préférences
- **Acteur principal :** Agent pour les écrans mobiles documentés.
- **Objectif :** Consulter les traces accessibles, l'assistance et gérer ses préférences.
- **Préconditions :** Agent authentifié.
- **Scénario nominal :** L'Agent ouvre le journal, l'aide ou les paramètres, consulte les informations et enregistre les préférences modifiables.
- **Variantes :** Fonction indisponible sur le serveur ou sauvegarde refusée.
- **Postcondition :** Les informations sont consultées ou les préférences sont enregistrées après confirmation.

# 5.4.3. Priorisation des cas d'utilisation

La priorisation ci-dessous est une **proposition de travail** fondée sur la criticité opérationnelle et les dépendances fonctionnelles. Elle doit être validée par l'encadreur et, si possible, par un représentant du service JIRAMA.

| ID | Cas d'utilisation | Acteur principal | Priorité | Justification |
|---|---|---|---|---|
| UC01 | S'authentifier | Tous | Haute | Conditionne l'accès sécurisé aux modules |
| UC02 | Gérer les utilisateurs et les rôles | Administrateur | Haute | Permet l'administration des accès |
| UC03 | Consulter abonnés et compteurs | Tous | Haute | Base des opérations métier |
| UC04 | Gérer les abonnés | Administrateur | Haute | Maintient les dossiers abonnés |
| UC05 | Gérer les compteurs | Administrateur / Agent selon route | Haute | Identifie les équipements contrôlés |
| UC06 | Consulter les relevés et l'historique | Tous | Haute | Nécessaire à la continuité des index |
| UC07 | Enregistrer un relevé | Agent / Responsable | Haute | Fonction métier centrale |
| UC08 | Corriger un relevé autorisé | Agent / Responsable | Moyenne | Rectification sous contrôle des droits |
| UC09 | Supprimer un relevé | Administrateur | Moyenne | Opération sensible et restreinte |
| UC10 | Consulter et analyser les anomalies | Tous selon droits | Haute | Soutient le repérage des situations à vérifier |
| UC11 | Définir le statut final d'une anomalie | Administrateur | Haute | Formalise la décision autorisée |
| UC12 | Créer et organiser une campagne | Responsable | Haute | Prépare les opérations de contrôle |
| UC13 | Affecter des agents et publier | Responsable | Haute | Rend les interventions exécutables |
| UC14 | Clôturer et suivre les missions | Responsable | Haute | Assure le suivi opérationnel |
| UC15 | Consulter et préparer une mission | Agent | Haute | Nécessaire au travail terrain |
| UC16 | Réaliser un contrôle et mettre à jour une mission | Agent | Haute | Enregistre le résultat de terrain |
| UC17 | Gérer les notifications | Agent / Responsable | Moyenne | Facilite la circulation des informations |
| UC18 | Consulter tableau de bord et statistiques | Responsable | Moyenne | Aide à la supervision |
| UC19 | Générer et partager un PDF | Agent | Moyenne | Facilite la restitution d'un relevé |
| UC20 | Journal, aide et préférences | Agent | Basse à moyenne | Fonctions de support et de personnalisation |

# 5.5. Spécification des besoins techniques

Le tableau ci-dessous reprend les choix techniques connus du projet. Les versions exactes, ressources matérielles, exigences de disponibilité et performances chiffrées doivent être complétées à partir des fichiers `package.json`, de la configuration PostgreSQL et des essais réalisés.

| Catégorie | Besoin technique / spécification | Vérification attendue |
|---|---|---|
| Interface Web | React et Vite ; accès par navigateur compatible | Vérifier les pages et les rôles dans le navigateur |
| Interface mobile | React Native, Expo et TypeScript ; terminal Android ciblé | Vérifier les écrans et parcours de l'Agent sur terminal |
| Backend | Node.js et Express ; API REST commune | Vérifier les routes et les réponses API |
| Base de données | PostgreSQL pour les données métier centralisées | Vérifier les tables, clés et contraintes SQL |
| Authentification | JWT pour les sessions ; bcrypt pour le hachage des mots de passe selon les composants documentés | Tester connexion, expiration et refus d'accès |
| Autorisations | Contrôle des rôles et des droits dans le backend | Tester chaque route avec les trois profils |
| Échanges | Format JSON via HTTP en développement ; HTTPS à imposer en production | Vérifier les échanges et certificats en environnement déployé |
| Intégrité des relevés | Validation des dates, index, unités et existence de l'index de référence | Tester les relevés initiaux et ordinaires |
| Notifications et audit | Traçabilité et notifications selon les modules implémentés | Vérifier les routes et les enregistrements |
| PDF mobile | Génération PDF et partage/impression via les modules Expo installés | Tester création, partage et solution de secours sur Android |
| Réseau | Connectivité entre terminal, poste Web et API selon l'environnement | Tester sur réseau local puis environnement de déploiement |
| Maintenance | Code organisé par modules, versions contrôlées avec Git | Vérifier scripts, dépendances et procédures de mise à jour |
| Sauvegarde et disponibilité | Définir une stratégie adaptée à PostgreSQL et au serveur de déploiement | À documenter et tester avant mise en exploitation |

# 5.6. Modélisation du domaine

Le modèle de domaine fourni dans `18_5_6_Modele_Domaine.puml` représente les concepts métier principaux : Utilisateur, Abonné, Compteur, Relevé, Anomalie, Campagne de contrôle, Mission, Affectation, Notification, Journal d'audit et Préférence utilisateur.

Les relations représentent les règles conceptuelles suivantes :

- Un abonné peut être associé à plusieurs compteurs ; chaque compteur est rattaché à un abonné dans le modèle simplifié.
- Un compteur peut posséder plusieurs relevés successifs.
- Un relevé est saisi ou corrigé par un utilisateur habilité.
- Une anomalie concerne un compteur et le dossier d'un abonné.
- Une campagne regroupe des missions.
- Une mission peut avoir des affectations d'agents.
- Un utilisateur peut recevoir plusieurs notifications et déclencher plusieurs événements d'audit.
- Un utilisateur peut disposer d'un ensemble de préférences.

**Précaution :** ce diagramme est un modèle conceptuel du domaine, non un schéma SQL certifié. Avant le dépôt du mémoire, comparer chaque classe, attribut et cardinalité avec les migrations, scripts SQL et modèles réellement utilisés par le backend. Supprimer ou adapter toute propriété qui n'existe pas dans le projet.
