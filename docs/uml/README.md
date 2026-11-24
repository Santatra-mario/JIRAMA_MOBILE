# Livrables UML — Projet JIRAMA

Ce dossier contient la modélisation fondée sur le dépôt `jirama-L3` et structurée selon le canevas UML ENI 2025-2026.

## Résumé
- Cas d’utilisation métier inventoriés : **22**.
- Diagrammes de cas d’utilisation : 4 (général + 3 par acteur).
- Diagrammes de séquence système : 22 (un par cas).
- Diagrammes de séquence de conception : 22 (un par cas).
- Diagrammes de classes par cas : 22 (un par cas).
- Diagrammes globaux : domaine, classes de conception globales, composants, paquetages et déploiement logique.
- Diagrammes complémentaires : activités, états de campagne/mission et ERD partiel.

## Correspondance avec le canevas ENI
### Chapitre 5 — Analyse conceptuelle
- 5.1 : `01_analyse_conceptuelle/methode_utilisee.md`
- 5.2 : `01_analyse_conceptuelle/dictionnaire_donnees.md`
- 5.3 : `01_analyse_conceptuelle/regles_gestion.md`
- 5.4.1 : `01_analyse_conceptuelle/cas_utilisation/`
- 5.4.2 : `01_analyse_conceptuelle/descriptions_textuelles.md`
- 5.4.3 : `01_analyse_conceptuelle/priorisation_cas_utilisation.md`
- 5.4.4 : `01_analyse_conceptuelle/sequences_systeme/`
- 5.5 : `01_analyse_conceptuelle/besoins_techniques.md`
- 5.6 : `01_analyse_conceptuelle/modele_domaine/DOMAINE_GLOBAL.puml`
### Chapitre 6 — Conception détaillée
- 6.1 : `02_conception_detaillee/architecture/COMPOSANTS_GLOBAL.puml`
- 6.2 : `02_conception_detaillee/sequences_conception/`
- 6.3 : `02_conception_detaillee/classes_par_cas_utilisation/`
- 6.4 : `02_conception_detaillee/classes_globales/DCL_GLOBAL.puml`
- 6.5 : `02_conception_detaillee/paquetages/PAQUETAGES_GLOBAL.puml`
- 6.6 : `02_conception_detaillee/deploiement/DEPLOIEMENT_LOGIQUE.puml`

## Prévisualisation dans VS Code
1. Ouvrir la racine `jirama-L3` dans VS Code.
2. Ouvrir un fichier `.puml`.
3. Utiliser `Alt + D` pour afficher l’aperçu PlantUML.
4. Depuis la palette `Ctrl + Shift + P`, utiliser `PlantUML: Export Current Diagram` ou `PlantUML: Export Workspace Diagrams`.

PlantUML est supposé déjà installé dans VS Code comme indiqué par l’utilisateur. Les fichiers ont été contrôlés structurellement (présence d’un unique `@startuml` et `@enduml` par fichier), mais la compilation/rendu par un moteur PlantUML CLI n’a pas pu être exécutée dans l’environnement de génération, car aucun `plantuml` ni `plantuml.jar` n’y était installé. Les exports SVG/PNG ne sont donc pas inclus; le code source `.puml` est prêt pour le rendu local dans VS Code et doit être prévisualisé avant insertion définitive dans le mémoire.

## Export en ligne de commande (si plantuml.jar local)
```powershell
java -jar "C:\CHEMIN\plantuml.jar" --check-syntax "docs/uml"
java -jar "C:\CHEMIN\plantuml.jar" --format svg --output-dir "docs/uml/export/svg" "docs/uml"
java -jar "C:\CHEMIN\plantuml.jar" --format png --output-dir "docs/uml/export/png" "docs/uml"
```

## Structure
- `00_audit/` : inventaires, rapport et matrice des droits.
- `01_analyse_conceptuelle/` : éléments du chapitre 5.
- `02_conception_detaillee/` : éléments du chapitre 6.
- `03_diagrammes_complementaires/` : diagrammes d’activité, états et ERD partiel.
- `MATRICE_TRACABILITE.md` : liens entre cas, API, contrôleurs, interfaces et tables.
- `LIMITES_ET_HYPOTHESES.md` : ce qui est vérifié et ce qui reste à confirmer.

## Convention des identifiants
Chaque CUxx possède trois fichiers indépendants : `DSYS_...` (système), `DSEQ_...` (conception), `DCL_...` (classes de conception). Le détail des sources est placé en commentaires en tête de chaque fichier.
