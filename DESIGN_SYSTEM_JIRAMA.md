# Système de design JIRAMA — novembre 2026

## Intention
Une interface de service public lisible et opérationnelle pour le suivi des consommations d’eau et d’électricité. La hiérarchie repose sur des surfaces neutres, des titres bleus institutionnels et des couleurs d’état réservées à leur signification.

## Fondations
- **Marque eau :** `--jr-eau-fonce`, `--jr-eau`, `--jr-eau-clair`, `--jr-eau-pale`. Utilisation : navigation, liens, éléments institutionnels.
- **Marque électricité :** `--jr-elec`, `--jr-elec-fonce`, `--jr-elec-pale`. Utilisation : accent énergétique et actions nécessitant une attention ; ne remplace pas les couleurs d’état.
- **Surfaces :** `--jr-fond`, `--jr-surface`, `--jr-surface-secondaire`, `--jr-champ`.
- **Texte :** `--jr-texte`, `--jr-texte-doux`, `--jr-texte-faible`, `--jr-titre`.
- **États :** `--jr-ok`, `--jr-attention`, `--jr-err`, `--jr-focus`.
- **Mode sombre :** valeurs alternatives sous `.dark`; ne pas coder de couleurs de texte ou de fond directement dans les composants partagés.

## Typographie
- Famille principale : Nunito Variable (déjà chargée par `main.jsx`).
- Titres de page : 20–24 px, poids 700–800.
- Texte courant : 14–16 px.
- Libellés secondaires : 12–13 px, contraste vérifié.
- Données numériques : `font-variant-numeric: tabular-nums`.

## Échelle et formes
- Espacement sur une base de 4/8 px.
- Contrôles : hauteur minimale 42 px, rayon 10 px.
- Panneaux : rayon 16 px.
- Dialogues : rayon 20 px.
- Ombres : `--jr-shadow-card` pour les surfaces usuelles, `--jr-shadow-elevated` uniquement pour les éléments superposés.

## Navigation partagée
- Sidebar fixe sur desktop et panneau mobile existant sur petits écrans.
- Une seule page active, matérialisée par un fond bleu pâle, une bordure et un repère latéral.
- En-tête clair, compact et collant, sans effet de verre dominant.
- Les libellés et routes proviennent des menus et du routeur existants.

## Données et tableaux
- En-têtes différenciés des lignes de données.
- Chiffres alignés et unités explicites.
- Survol de ligne discret ; conserver les états de traitement/alerte définis par le métier.
- Filtres, pagination, recherche, tri et actions restent pilotés par le code existant.

## Accessibilité et responsive
- Focus clavier visible et contraste explicite.
- Les informations ne reposent jamais uniquement sur la couleur.
- Les tableaux conservent leur défilement horizontal lorsqu’ils ne peuvent pas être réorganisés sans perte.
- Points de contrôle : environ 360 px, 768 px et 1280 px et plus.
- Respect de `prefers-reduced-motion` et des préférences persistées de l’application.

## Règles de gouvernance
1. Réutiliser les variables `--jr-*`; ne pas créer de deuxième palette parallèle.
2. Ne pas mettre de valeurs métier fictives dans les écrans.
3. Ne pas modifier les routes, endpoints, payloads, permissions, calculs ou schéma PostgreSQL pour un besoin purement visuel.
4. Avant de modifier un composant partagé, contrôler ses trois profils utilisateurs.

## Bannières par rôle
- `banner-admin.svg` : supervision globale et infrastructures.
- `banner-responsable.svg` : coordination territoriale et contrôles.
- `banner-agent.svg` : intervention terrain et compteurs.
Les illustrations restent dans les en-têtes des tableaux de bord ; elles ne sont jamais utilisées comme fond de tableau ou de formulaire.

## Graphiques et données
- Courbes pour les évolutions dans le temps.
- Barres pour comparer des catégories ou des agents.
- Anneaux pour une répartition limitée.
- Toujours afficher période, unité, légende et infobulle lorsque ces éléments sont pertinents.
- Les graphiques doivent utiliser les données de l'API ; aucun chiffre de maquette ne doit être repris.
- Une série EAU et une série ÉLECTRICITÉ ne doivent pas partager une échelle trompeuse si les unités diffèrent.

## Notifications Toast
Les quatre types utilisent les tokens sémantiques existants : `succes`, `info`, `attention` et `erreur`. Le fond complet du message est teinté, avec une bordure assortie et un contraste adapté au thème. Les Toasts sont positionnés en haut à droite sur grand écran et restent empilés dans une zone accessible sur mobile.

## Pages partagées
- Le Centre d'aide présente des guides adaptés au rôle et pointe vers les routes réellement déclarées.
- Le Journal d'audit agrège les sources déjà présentes (`audit_logs` et `user_audit_logs`). Les vues Agent et Responsable restent personnelles côté backend ; l'Administrateur peut consulter la vue globale.
- Le journal ne remplace pas la journalisation métier : chaque action doit être explicitement enregistrée côté serveur pour apparaître.

## Ergonomie des pages prioritaires
- **Agent / Relevés :** zone de saisie et tableau avant l'historique ; l'historique complet est placé en bas et la courbe s'appuie sur les consommations enregistrées du compteur sélectionné.
- **Administrateur / Abonnés :** formulaire plus large, organisé en sections ; les champs, règles de validation et appels existants sont conservés.
