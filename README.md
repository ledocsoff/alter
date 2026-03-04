# 🍌 NanaBanana Studio

Studio de génération de prompts pour modèles IA virtuels. Gère les profils, comptes, lieux, et produit des prompts JSON ultra-détaillés pour la génération d'images cohérentes.

## Prérequis

- **Node.js** ≥ 18
- **npm** ≥ 9
- Une clé API **Google AI Studio** (Gemini) — configurable dans l'app

## Installation

```bash
git clone https://github.com/your-repo/nanabanana-studio.git
cd nanabanana-studio
npm install
```

## Lancement

```bash
npm run dev
```

Cela démarre simultanément :
- **Vite** (frontend) → `http://localhost:5173`
- **Express** (API de sauvegarde) → `http://localhost:3001`

## Configuration API

1. Ouvrir l'app dans le navigateur
2. Cliquer sur le bouton **● API** en haut à droite
3. Coller votre clé Google AI Studio
4. La clé est stockée uniquement en `localStorage` (jamais envoyée au serveur)

## Structure

```
nanabanana-studio/
├── src/
│   ├── views/           # Pages principales (Models, Accounts, Locations, Studio)
│   ├── features/        # Composants métier (SceneEditor, ImagePreview, Gallery...)
│   ├── store/           # Context React (StudioContext, ToastContext)
│   ├── utils/           # Storage, Google AI, prompt generators
│   └── constants/       # Options de scène, presets
├── server.js            # API Express pour la persistance fichier
├── sauvegarde/          # Données locales (gitignored)
│   ├── data.json        # Données courantes
│   ├── data.backup.1.json  # Backup N-1
│   ├── data.backup.2.json  # Backup N-2
│   └── data.backup.3.json  # Backup N-3
└── package.json
```

## Sauvegarde & Backups

Les données sont auto-sauvegardées dans `sauvegarde/data.json` via le serveur Express.

**Backup rotatif automatique** : à chaque sauvegarde, les 3 versions précédentes sont conservées :
- `data.backup.1.json` — version précédente
- `data.backup.2.json` — avant-dernière
- `data.backup.3.json` — la plus ancienne

### Restaurer un backup

```bash
# Via l'API
curl -X POST http://localhost:3001/api/restore/1

# Ou manuellement
cp sauvegarde/data.backup.1.json sauvegarde/data.json
```

## Export / Import

- **Export** : bouton "Export" dans la barre de navigation → télécharge un fichier `.json`
- **Import** : bouton "Import" → charge un fichier `.json` précédemment exporté

## Build production

```bash
npm run build    # → dist/
npm run preview  # Prévisualiser le build
```

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Cmd+G` | Générer l'image |
