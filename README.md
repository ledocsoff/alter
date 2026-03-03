# 🍌 NanaBanana Studio

**Gestionnaire de prompts pour Influenceuses Virtuelles — OFM Hub v4.3**

NanaBanana Studio est une application **React SPA** conçue pour les agences OFM (Only Fans Management) utilisant des mannequins IA. Elle permet de structurer, gérer et générer des **prompts Natural Language** ultra-cohérents pour Google AI Studio (Gemini), en maintenant la cohérence visuelle entre chaque génération.

![Version](https://img.shields.io/badge/version-4.3.0-gold)
![React](https://img.shields.io/badge/React-19-61DAFB)
![React Router](https://img.shields.io/badge/React_Router-v6-CA4245)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC)
![Vite](https://img.shields.io/badge/Vite-6-646cff)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 Philosophie : Le Tunnel OFM

Le défi principal d'une agence OFM IA est la **cohérence narrative**. Si un profil Instagram est celui d'une étudiante, l'IA ne doit jamais générer un décor de yacht par erreur.

L'application impose un **entonnoir strict en 4 niveaux** via React Router :

```
👱‍♀️ Niveau 1 : Modèles      →  Créez les fiches DNA de vos influenceuses
📱 Niveau 2 : Comptes       →  TikTok, Instagram, Tinder... par modèle
📍 Niveau 3 : Lieux          →  Décors récurrents + Mode Sandbox
⚡ Niveau 4 : Générateur     →  Studio verrouillé sur le contexte du lieu
```

Ce tunnel garantit qu'il est **impossible** de générer une image incohérente avec l'univers du personnage.

---

## ✨ Fonctionnalités

### 👱‍♀️ Gestion des Modèles (Niveau 1)
- **Import JSON** : collez directement le JSON généré par Google AI Studio
- **Template AI Studio** : prompt prêt à copier pour extraire les caractéristiques physiques d'une photo avec une précision chirurgicale
- Validation JSON en temps réel (bordure verte/rouge + badge)
- Injection **stricte** dans les niveaux inférieurs — aucune sur-interprétation, cohérence maximale
- Sauvegarde automatique (serveur local + localStorage)

### 📱 Gestion des Comptes (Niveau 2)
- Multi-comptes par modèle (Instagram, TikTok, OnlyFans, etc.)
- Handle de compte pour identifier chaque persona

### 📍 Gestion des Lieux (Niveau 3)
- CRUD complet de lieux récurrents par compte (chambre, salle de sport, etc.)
- Chaque lieu définit : environnement, éclairage par défaut, ambiance, heure du jour, détails d'ancrage, palette de couleurs
- Score de verrouillage du lieu (indique à l'IA à quel point le décor est contraint)
- **Mode Sandbox** : génération libre sans contexte de lieu

### ⚡ Générateur de Prompt (Niveau 4)
- Studio verrouillé automatiquement sur les paramètres du lieu choisi
- Personnalisation de la scène : tenue, pose, angle caméra, lumière, expression, ambiance
- Vue **JSON** du prompt structuré (prêt à copier dans Google AI Studio)
- Vue **Image** : génération directe via l'API Gemini (nécessite une clé API)
- Randomisation de scène (raccourci `Cmd+R`)
- Génération directe (raccourci `Cmd+G`)
- Historique des 50 derniers prompts générés
- Sauvegarde de templates de scènes réutilisables

### 🔧 Outils Globaux
- **Export / Import** de toute la base de données (JSON backup)
- **Gestion de clé API** Google AI Studio (stockée dans `localStorage`, jamais dans le code)
- Dark Mode UI

---

## 🔒 Sécurité

> **Aucune clé API n'est stockée dans le code source.**

La clé API Google AI Studio est saisie par l'utilisateur via la modale "API" dans la barre de navigation. Elle est sauvegardée **uniquement dans `localStorage` de votre navigateur**, locallement sur votre machine. Elle n'est jamais envoyée à un serveur tiers ni commitée dans git.

---

## 🚀 Installation & Lancement

### Prérequis

Avant de commencer, assurez-vous d'avoir installé sur votre machine :

| Outil | Version minimale | Vérification | Téléchargement |
|---|---|---|---|
| **Node.js** | v18 ou supérieure | `node -v` | [nodejs.org](https://nodejs.org) |
| **npm** | v9 ou supérieure | `npm -v` | (inclus avec Node.js) |
| **Git** | — | `git --version` | [git-scm.com](https://git-scm.com) *(optionnel)* |

---

### Méthode 1 — Téléchargement ZIP (sans Git)

1. Rendez-vous sur **[github.com/ledocsoff/nanabanana-studio](https://github.com/ledocsoff/nanabanana-studio)**
2. Cliquez sur le bouton vert **`<> Code`** → **`Download ZIP`**
3. Décompressez l'archive **où vous voulez** sur votre ordinateur (Bureau, Documents, `C:\Dev\`, `/home/user/projets/`, etc.)
4. Ouvrez un terminal dans le dossier décompressé

### Méthode 2 — Clonage Git (recommandé)

```bash
# Cloner dans le dossier de votre choix
# Exemple : dans ~/Documents/mes-projets/
cd ~/Documents/mes-projets

# Cloner le projet (crée automatiquement le sous-dossier nanabanana-studio/)
git clone https://github.com/ledocsoff/nanabanana-studio.git

# Entrer dans le dossier du projet
cd nanabanana-studio
```

> 💡 Remplacez `~/Documents/mes-projets` par n'importe quel chemin de votre choix. Le dossier `nanabanana-studio/` sera créé à l'intérieur.

---

### Installation des dépendances

Depuis le dossier du projet, exécutez :

```bash
npm install
```

Cette commande télécharge toutes les librairies nécessaires (React, Vite, TailwindCSS...) dans un dossier `node_modules/`. Cela peut prendre 1 à 2 minutes selon votre connexion.

---

### Lancer l'application

```bash
npm run dev
```

Vous devriez voir apparaître dans le terminal :

```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Ouvrez votre navigateur** et rendez-vous sur **`http://localhost:5173/`** — l'application est prête.

> 📌 **L'onglet du terminal doit rester ouvert** pendant toute l'utilisation. C'est le serveur local qui fait tourner l'app. Pour arrêter, appuyez sur `Ctrl+C` dans le terminal.

> 🔄 **Rechargement automatique :** toute modification de fichier source relancera automatiquement l'app dans le navigateur.

---

### Configurer la clé API (pour la génération d'images)

Au premier lancement, pour utiliser la génération d'images directement dans le studio :

1. Créez une clé API sur **[aistudio.google.com](https://aistudio.google.com)**
2. Dans NanaBanana Studio, cliquez sur le bouton **`API`** dans la barre de navigation (en haut à droite)
3. Collez votre clé → **Sauvegarder**

La clé est stockée localement dans votre navigateur et n'est jamais envoyée ailleurs.

---

### Build production *(optionnel)*

Pour compiler une version optimisée de l'application à déployer sur un serveur :

```bash
npm run build
```

Les fichiers compilés sont générés dans le dossier `/dist`. Vous pouvez les héberger sur n'importe quel hébergeur statique (Netlify, Vercel, GitHub Pages...).

---

## 🛠️ Stack Technique

| Technologie | Version | Usage |
|---|---|---|
| **React** | 19 | Cœur applicatif, composants |
| **React Router DOM** | v6 | Navigation SPA en entonnoir (URLs propres) |
| **TailwindCSS** | 3 | UI système, grilles, dark mode |
| **Context API** | — | State global (`DatabaseContext` + `PromptContext`) |
| **Vite** | 6 | Dev server et build ultrarapide |

---

## 📁 Structure du Projet

```
nanabanana-studio/
├── src/
│   ├── constants/
│   │   ├── modelOptions.js    # Options physiques (corps, visage, cheveux...)
│   │   └── sceneOptions.js    # Options de scène (poses, lumières, ambiances...)
│   │
│   ├── features/              # Composants métier isolés et réutilisables
│   │   ├── ApiKeyModal/       # Modale de saisie/validation de clé API Google
│   │   ├── ImagePreview/      # Panneau génération image (appel API Gemini)
│   │   ├── ModelTemplateModal/ # Template/Prompt pour Google AI Studio
│   │   ├── OutputPanel/       # Panneau JSON du prompt (copie clipboard)
│   │   └── SceneEditor/       # Formulaire de personnalisation de scène
│   │
│   ├── store/
│   │   ├── StudioContext.jsx  # Deux contexts : DatabaseContext + PromptContext
│   │   └── ToastContext.jsx   # Notifications toast globales
│   │
│   ├── utils/
│   │   ├── googleAI.js        # Wrapper API Gemini (validation + génération image)
│   │   ├── promptGenerators.js # Assembleur de prompts JSON structurés
│   │   ├── promptToText.js    # Convertisseur JSON → Natural Language
│   │   └── storage.js         # CRUD localStorage (modèles, comptes, lieux, templates)
│   │
│   ├── views/                 # Pages du routeur React Router
│   │   ├── ModelsView.jsx          # (Niveau 1) Liste des modèles
│   │   ├── ModelEditorShell.jsx    # (Niveau 1b) Création / édition modèle
│   │   ├── AccountsView.jsx        # (Niveau 2) Comptes du modèle
│   │   ├── LocationsAndSandboxView.jsx  # (Niveau 3) Lieux + Sandbox
│   │   └── GenerationView.jsx      # (Niveau 4) Studio de génération
│   │
│   ├── App.jsx                # Shell React Router + Navbar globale
│   ├── main.jsx               # Point d'entrée React
│   └── index.css              # Styles globaux
│
├── index.html                 # Template HTML Vite
├── vite.config.js             # Configuration Vite
├── tailwind.config.js         # Configuration TailwindCSS
├── postcss.config.js          # Configuration PostCSS
└── package.json               # Dépendances et scripts npm
```

---

## 🔄 Workflow d'Utilisation

1. **Copiez le Template** → Utilisez le bouton "Template AI Studio" pour obtenir le prompt d'extraction
2. **Générez le JSON** → Collez le prompt dans Google AI Studio avec une photo de la modèle
3. **Créez un modèle** → Collez le JSON retourné dans NanaBanana Studio
4. **Ajoutez un compte** → Associez un ou plusieurs comptes sociaux au modèle (ex: `@clara_officiel`)
5. **Créez des lieux** → Définissez les décors récurrents du compte (ex: `Studio Paris`, `Chambre Bohème`)
6. **Générez** → Entrez dans un lieu → personnalisez la scène → copiez le JSON ou générez l'image directement

---

## 📄 License

MIT © 2025 — [ledocsoff](https://github.com/ledocsoff)
