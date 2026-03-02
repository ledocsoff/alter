# 🍌 NanaBanana Studio

**AI Model Prompt Engine** — Créez des prompts JSON ultra-détaillés pour la génération d'images IA, avec des presets visuels pour les tenues, environnements, poses, éclairages et expressions.

![Version](https://img.shields.io/badge/version-3.1.0-gold)
![React](https://img.shields.io/badge/React-19-61dafb)
![Vite](https://img.shields.io/badge/Vite-6-646cff)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Fonctionnalités

- 👤 **Éditeur de Modèle** — Configurez chaque détail physique (visage, yeux, lèvres, nez, cheveux, peau, corps) via des menus déroulants
- 🎬 **Constructeur de Scène** — Choisissez tenue, environnement, pose, caméra, éclairage et expression en un clic
- 📋 **Sortie JSON** — Générez un JSON structuré prêt pour ComfyUI, Stable Diffusion, ou tout pipeline IA
- 📝 **Prompt Higgsfield** — Version texte plat du prompt, prête à copier-coller
- 🚫 **Negative Prompt** — Prompt négatif complet inclus automatiquement
- 💾 **Profils sauvegardables** — Sauvegardez, chargez et exportez vos modèles
- 🎲 **Générateur aléatoire** — Créez un modèle aléatoire en un clic
- 📜 **Historique** — Retrouvez et rechargez vos 50 dernières générations
- 🌙 **Interface Dark Mode** — Design premium avec thème sombre et accents dorés

---

## 🚀 Installation

### Prérequis

- [Node.js](https://nodejs.org/) (v18 ou supérieur)
- [npm](https://www.npmjs.com/) (inclus avec Node.js)

### Étapes

```bash
# 1. Cloner le repository
git clone https://github.com/ledocsoff/nanabanana-studio.git

# 2. Accéder au dossier
cd nanabanana-studio

# 3. Installer les dépendances
npm install

# 4. Lancer l'application
npm run dev
```

L'application s'ouvre automatiquement dans votre navigateur par défaut à l'adresse `http://localhost:5173/`.

---

## 📖 Utilisation

### 1. Configurer le Modèle (onglet 👤 Modèle)

Personnalisez chaque aspect physique :

| Catégorie | Options |
|-----------|---------|
| 🪪 Identité | Nom, âge |
| 👤 Visage | Forme, mâchoire, front |
| 👁️ Yeux | Couleur, forme, taille, cils, sourcils |
| 👄 Bouche & Nez | Forme des lèvres, nez |
| 💇 Cheveux | Couleur, longueur, texture, style |
| ✨ Peau | Teint, texture, traits, éclat, détails |
| 🏋️ Corps | Silhouette, buste, taille, hanches, etc. |
| 🛡️ Anatomical Fidelity | Préréglages de fidélité anatomique |
| 🎯 Signature | Style visuel du modèle |

Vous pouvez aussi :
- **🎲 Aléatoire** — Générer un modèle au hasard
- **💾 Sauvegarder** — Enregistrer le profil actuel
- **📤 Exporter** — Copier le JSON du profil dans le presse-papier
- **📥 Importer** — Coller un JSON pour charger un profil

### 2. Construire la Scène (onglet 🎬 Scène)

Sélectionnez parmi les presets :

- **👗 Tenue** — 12 options (bikini, crop top, lingerie, gym, etc.)
- **🌍 Environnement** — 12 décors (plage, piscine, chambre, yacht, etc.)
- **🤸 Pose** — 10 positions (selfie, debout, allongée, etc.)
- **📷 Caméra** — 5 angles (selfie, candid, plein pied, gros plan, contre-plongée)
- **💡 Éclairage** — 8 types (golden hour, flash, néons, etc.)
- **😏 Expression** — 8 moods (sultry, sourire, candid, playful, etc.)

### 3. Générer (bouton ⚡)

Cliquez sur **⚡ Générer JSON Nano Banana** pour obtenir :

- **JSON structuré** — Pour intégration dans vos pipelines IA
- **Prompt Higgsfield** — Version texte plat prête à l'emploi
- **Negative Prompt** — Anti-artefacts IA complet

Chaque section est copiable en un clic.

### 4. Historique (onglet 📜)

Consultez et rechargez vos 50 dernières générations.

---

## 🏗️ Build pour production

```bash
# Créer un build optimisé
npm run build

# Prévisualiser le build
npm run preview
```

Le build de production est généré dans le dossier `dist/` et peut être déployé sur n'importe quel hébergement web statique (Netlify, Vercel, GitHub Pages, etc.).

---

## 🛠️ Stack technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 19 | UI Components |
| Vite | 6 | Build tool & dev server |
| localStorage | — | Persistance des données |
| Google Fonts | — | DM Mono + Outfit |

---

## 📁 Structure du projet

```
nanabanana-studio/
├── index.html          # Point d'entrée HTML
├── package.json        # Dépendances & scripts
├── vite.config.js      # Configuration Vite
└── src/
    ├── main.jsx        # Entry point React
    └── App.jsx         # Application principale (1000+ lignes)
```

---

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

## 📄 Licence

MIT © [ledocsoff](https://github.com/ledocsoff)
