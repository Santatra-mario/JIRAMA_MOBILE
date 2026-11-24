# Limites, hypothèses et points à confirmer

## Informations confirmées
- Stack React 18/Vite, Node.js/Express, PostgreSQL via `pg`, Axios, JWT, bcrypt.
- Trois rôles métier dans les contrôleurs et le middleware : ADMINISTRATEUR, RESPONSABLE, AGENT.
- Routes, méthodes HTTP et rôle de protection issus des routeurs.
- Statuts de campagne et de mission définis par les contraintes de la migration 009.
- Champs de localisation, statuts abonné, relevé INITIAL/PERIODIQUE, données d’affectation, résultats de visite, paiement et audit explicitement introduits dans les migrations présentes.
- Génération PDF côté navigateur dans `RelevesPage.jsx`; le code précise qu’elle n’enregistre pas une facture ni un paiement.

## Informations partielles
- Le schéma initial complet de plusieurs tables n’est pas fourni. Les attributs/types non définis par migration restent à confirmer.
- Certaines relations métier sont démontrées par les requêtes JOIN du backend, sans que le DDL initial de leurs contraintes FK soit dans l’archive.
- Les transitions de mission vers TERMINEE, ANNULEE et certains retours de reprogrammation ne sont pas toutes établies par l’extrait direct de la route Agent. Le diagramme des états marque ces transitions comme à confirmer.
- Le statut ANNULEE est autorisé pour une campagne dans le CHECK SQL, mais aucune route d’annulation dédiée n’a été identifiée dans `responsableRoutes.js`.
- L’environnement de production, l’hébergement du frontend, la topologie réseau, les certificats TLS et la politique de sauvegarde ne sont pas établis par le dépôt.

## Écarts d’interface constatés
- `/dashboard/admin/compteurs` et `/dashboard/admin/releves` redirigent actuellement vers le dashboard, bien que des composants correspondants existent.
- `/dashboard/admin/statistiques` et `/dashboard/admin/graphiques` redirigent aussi vers le dashboard; les APIs sont appelées depuis le dashboard.
- La page `RelevesPage` est montée dans l’espace Responsable. Ne pas considérer l’écran admin comme accessible tant que la redirection n’est pas corrigée.

## Hypothèses de modélisation
- Les classes `<<boundary>>`, `<<control>>`, `<<entity>>` sont des abstractions de conception; elles ne signifient pas que les composants fonctionnels écrits en JavaScript sont des classes natives.
- Le modèle de domaine représente les concepts métier et les liens employés dans les requêtes. Le modèle ERD ne revendique que les champs/contraintes documentés et porte l’étiquette PARTIEL.
- Les diagrammes de séquence système restent une vue boîte noire; les diagrammes de séquence de conception montrent les composants internes.
- Le visiteur d’inscription est un acteur non authentifié de l’API publique, pas un quatrième rôle métier.

## À obtenir pour une validation complète
1. Un export du schéma PostgreSQL effectif : `pg_dump --schema-only --no-owner --no-privileges -d jirama_db > schema_jirama.sql` (adapter la connexion localement; ne pas partager de mots de passe).
2. Confirmation de la méthode de conduite de projet réellement utilisée pendant le développement.
3. Confirmation de l’hébergement et du déploiement de production.
4. Validation par l’encadreur des cas d’utilisation retenus et de la granularité des diagrammes par cas.
