# Raid Arena Tracker - Classic 4v4

Mini web app statique (HTML/CSS/JS vanilla) pour suivre tes combats **Classic Arena Raid: Shadow Legends**.

- ✅ 100% local (aucun backend)
- ✅ Données stockées dans le navigateur via `localStorage`
- ✅ Backup automatique supplémentaire dans le profil navigateur (`IndexedDB`)
- ✅ Export/Import JSON pour backup et synchronisation manuelle entre appareils

## Installation et lancement

### Option 1 — Local (le plus simple)
1. Clone le repo :
   ```bash
   git clone <url-du-repo>
   cd raid-arena-tracker
   ```
2. Ouvre `index.html` dans ton navigateur (double-clic ou glisser-déposer).

### Option 2 — GitHub Pages
1. Push le repo sur GitHub.
2. Active **Settings → Pages** sur la branche principale.
3. Ouvre l'URL GitHub Pages fournie.

> Les données restent propres à chaque navigateur/appareil, même via GitHub Pages.

## Qualité de code (linting)

Ce projet utilise **ESLint** pour vérifier la qualité du JavaScript.

```bash
npm install
npm run lint
```

Pour appliquer automatiquement les corrections possibles :

```bash
npm run lint:fix
```

## Utilisation

### Ajouter un combat
- Remplis la team joueur (**1 à 4 champions**, séparés par virgules)
- Team adverse (optionnelle, mais si remplie : **1 à 4**)
- Victoire : Oui/Non
- Clique **Ajouter**

Les noms de champions sont automatiquement convertis en **Title Case**.

## Sauvegarde et synchronisation

### Export JSON
- Clique **Exporter JSON**
- Le fichier `raid-arena-data.json` est téléchargé

### Import JSON
- Clique **Importer JSON**
- Sélectionne un fichier JSON précédemment exporté
- Les données locales sont remplacées par le contenu importé

## Effacer toutes les données

Ouvre la console navigateur et exécute :

```js
localStorage.removeItem('raid_arena_fights');
```

Puis recharge la page.

Pour vider aussi le backup interne (`IndexedDB`), ouvre DevTools → Application/Storage → IndexedDB et supprime
la base `raid_arena_tracker_backup`.

## Où sont stockées les données sous Windows ?

L'app est 100% statique: elle écrit automatiquement dans le **profil du navigateur Windows** (pas dans un backend).

- `localStorage`: clé `raid_arena_fights`
- Backup interne: base IndexedDB `raid_arena_tracker_backup`

Emplacements typiques (gérés par le navigateur):

- Chrome: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage` et `...\IndexedDB`
- Edge: `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage` et `...\IndexedDB`
- Firefox: `%APPDATA%\Mozilla\Firefox\Profiles\<profil>\storage\default`

> Important: ce n'est pas un fichier JSON directement éditable, c'est du stockage interne navigateur.
> Pour obtenir un vrai fichier JSON portable, utilise le bouton **Exporter JSON**.

## Schéma des données

Clé localStorage utilisée :

- `raid_arena_fights`

Chaque combat :

```json
{
  "timestamp": 1730000000000,
  "player_team": ["Arbiter", "Duchess Lilitu", "Mithrala", "Rotos"],
  "opponent_team": ["Siphi", "Rotos"],
  "win": true
}
```
