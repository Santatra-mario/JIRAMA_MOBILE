# JIRAMA Agent Mobile — reprise de l'espace Agent Web

Cette version développe l'application React Native / Expo déjà présente dans `mobile-agent/` pour reprendre les rubriques de l'espace Agent Web JIRAMA. Elle conserve l'API Express existante et utilise les routes du rôle `AGENT` déjà présentes dans le projet.

## 1. Navigation mobile

L'application utilise une barre latérale verticale à gauche, et non une barre d'onglets inférieure.

- Sur téléphone, la barre latérale est compacte (icônes) et peut être agrandie/réduite.
- Sur tablette, elle s'ouvre par défaut.
- Le contenu de la page s'affiche à droite.
- L'en-tête propose l'accès aux notifications et au profil.
- Le logo et l'arrière-plan JIRAMA sont fournis dans `assets/`.

La reproduction est native React Native. Les proportions sont adaptées à l'écran Android : les effets de survol Web deviennent des états tactiles, et certaines listes/tableaux se présentent sous forme de cartes ou de défilement adapté. Il ne s'agit pas d'une WebView ni d'une copie pixel par pixel du DOM/CSS Web.

## 2. Correspondance des rubriques Web et Mobile

| Route Web Agent | Écran React Native |
|---|---|
| `/dashboard/agent` | `src/features/dashboard/AgentDashboardScreen.tsx` |
| `/dashboard/agent/compteurs` | `src/features/compteurs/CompteursScreen.tsx` |
| `/dashboard/agent/abonnes` | `src/features/abonnes/AbonnesScreen.tsx` |
| `/dashboard/agent/releves` | `src/features/releves/RelevesScreen.tsx` et `ReleveFormScreen.tsx` |
| `/dashboard/agent/missions` | `src/features/missions/MissionsScreen.tsx` et `MissionDetailScreen.tsx` |
| `/dashboard/agent/anomalies` | `src/features/anomalies/AnomaliesScreen.tsx` |
| `/dashboard/agent/notifications` | `src/features/notifications/NotificationsScreen.tsx` |
| `/dashboard/agent/journal-audit` | `src/features/support/AgentSupportScreens.tsx` — `JournalAuditScreen` |
| `/dashboard/agent/aide` | `src/features/support/AgentSupportScreens.tsx` — `AideScreen` |
| `/dashboard/agent/parametres` | `src/features/support/AgentSupportScreens.tsx` — `SettingsScreen` |

Le profil est conservé depuis la version mobile existante dans `src/features/profil/ProfileScreen.tsx`.

## 3. API Express réutilisée

Les écrans utilisent notamment les endpoints suivants, présents dans le backend audité :

- `GET /api/agent/dashboard`
- `GET /api/agent/compteurs`
- `GET /api/agent/abonnes`
- `GET /api/agent/releves`
- `GET /api/agent/releves/compteur/:compteurId`
- `POST /api/agent/releves`
- `PUT /api/agent/releves/:id`
- `GET /api/agent/missions`
- `GET /api/agent/missions/:id`
- `PATCH /api/agent/missions/:id/statut`
- `GET /api/agent/anomalies`
- `GET /api/agent/notifications`
- `GET /api/agent/notifications/count`
- `PATCH /api/agent/notifications/:id/lue`
- `PATCH /api/agent/notifications/lire-tout`
- `GET /api/notifications?vue=archivees`
- `PATCH /api/notifications/:id/archiver`
- `DELETE /api/notifications/:id`
- `GET/PATCH /api/settings...`

L'accès reste authentifié avec le JWT existant. Le mobile ne communique jamais directement avec PostgreSQL. Les rôles et permissions sont toujours contrôlés par le backend.

## 4. Design

Les couleurs sont reprises des tokens du Web JIRAMA dans `src/theme/colors.ts`. Les assets visuels sont :

- `assets/jirama-logo.png`
- `assets/jirama-background.jpg`

Les composants communs se trouvent dans `src/components/AgentUI.tsx`.

## 5. Installation sous Windows avec Expo Go

Ouvrir PowerShell dans le dossier mobile :

```powershell
Set-Location "C:\Users\ASUS\Desktop\JIRAMA_L3_UML(ProjetComplet1)1\mobile-agent"
Copy-Item .env.example .env -ErrorAction SilentlyContinue
notepad .env
```

Dans `.env`, remplacer l'adresse d'exemple par l'adresse IPv4 du PC obtenue avec `ipconfig`. Exemple :

```env
EXPO_PUBLIC_API_URL=http://192.168.43.137:5000/api
```

Ne pas utiliser `localhost` dans l'URL configurée sur un téléphone Android physique. Le téléphone et le PC doivent être sur le même réseau Wi-Fi, et le pare-feu Windows doit autoriser le port du backend.

Installer les dépendances :

```powershell
npm install
npx expo install expo-secure-store expo-print expo-sharing expo-clipboard
npm run typecheck
npx expo-doctor
npx expo start --go -c
```

`expo-print` et `expo-sharing` servent à préparer et partager le document PDF des relevés. Expo choisit les versions compatibles avec le SDK déclaré dans `package.json`.

Scanner le QR code avec Expo Go sur Android.

## 6. Déploiement dans le projet existant

Avant de remplacer le dossier Mobile, faire une copie de sauvegarde :

```powershell
Set-Location "C:\Users\ASUS\Desktop\JIRAMA_L3_UML(ProjetComplet1)1"
Copy-Item .\mobile-agent .\mobile-agent.backup -Recurse -Force
```

Extraire ensuite l'archive de livraison à la racine du projet (elle contient le dossier `mobile-agent/` et ce README). Conserver ton `.env` local : ne le remplace pas par `.env.example`.

## 7. Limites à connaître — ne pas les confondre avec des fonctionnalités livrées

- La présente version mobile charge et transmet les données via l'API en ligne. Dans l'archive source auditée, `src/database/` ne contient pas encore une implémentation SQLite opérationnelle, et aucune file de synchronisation hors connexion complète n'a été trouvée. Cette livraison ne prétend donc pas activer le mode offline.
- L'upload de photos, les pièces jointes terrain et la création autonome d'une anomalie ne sont pas ajoutés car aucune chaîne API complète correspondante n'a été vérifiée dans le backend.
- Les pages et actions mobiles sont une adaptation native des parcours Web existants ; les effets propres à une souris (hover) deviennent des interactions tactiles.
- Les paramètres envoyés au serveur sont enregistrés via les routes existantes. Le thème d'affichage mobile utilise actuellement les couleurs JIRAMA définies dans `src/theme/colors.ts` ; un moteur dynamique multithème complet n'est pas inclus.
- La modification d'un relevé reste soumise au contrôle du backend. L'application ne permet pas à l'Agent de changer arbitrairement l'ancien index officiel.
- Le document PDF exporté depuis le mobile est un document de consultation/partage, pas une facture officielle.

## 8. Vérifications effectuées pendant la préparation

- Analyse des routes et pages Agent Web de l'archive du projet.
- Correspondance des rubriques Web / Mobile et des endpoints existants.
- Transpilation syntaxique TypeScript/TSX : 25 fichiers analysés, aucun diagnostic de syntaxe.
- Le contrôle TypeScript complet (`npm run typecheck`) n'a pas pu être exécuté ici car les dépendances npm n'ont pas été installées dans l'environnement de préparation.
- Aucun test réel sur téléphone Android et aucun test connecté à la base PostgreSQL locale n'ont été exécutés dans cet environnement.

Après installation sur ton PC, exécuter obligatoirement `npm run typecheck`, `npx expo-doctor`, puis tester chaque écran avec un compte AGENT réel.
