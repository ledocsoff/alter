# 🍌 NanaBanana Studio (OFM Hub v4.1)

**Le système d'opérations ultime pour les Agences IA (OFM).**

NanaBanana Studio v4.1 est une application **SaaS Multi-Pages** conçue spécifiquement pour structurer et générer des prompts ultra-réalistes (Natural Language) destinés à **Google Nano Banana Pro** et autres modèles IA haut-de-gamme. Fini les générateurs "une page" désorganisés : place à une véritable gestion de base de données relationnelle locale pour vos Influenceuses Virtuelles.

![Version](https://img.shields.io/badge/version-4.1.0-gold)
![React](https://img.shields.io/badge/ReactRouter-v6-red)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)
![Vite](https://img.shields.io/badge/Vite-6-646cff)

---

## 🎯 Philosophie de l'Outil : Le "Tunnel OFM"

Le défi majeur d'une agence est la **Cohérence Narrative**. Si un profil Instagram est censé être celui d'une étudiante modeste, l’IA ne doit jamais générer un décor de yacht de luxe par erreur.

L'application est structurée en un **Entonnoir strict (4 Niveaux)** garanti par le routeur :

1.  👱‍♀️ **Niveau 1 : Base d'Influenceuses** — Un CRM de vos Fiches Modèles. Vous sculptez leur visage, leur corps (Face ID / Body Type) dans l'éditeur pleine page.
2.  📱 **Niveau 2 : Architecture Réseaux Sociaux** — Pour un modèle donné (ex: *Clara*), vous gérez sa flotte d'avatars numériques (Son Instagram officiel, son TikTok, son Tinder...).
3.  📍 **Niveau 3 : Les Lieux Récurrents & Sandbox** — Pour un compte donné (ex: *TikTok @clara*), vous créez ses lieux de vie habituels (Chambre, Salle de sport). Un **Mode Bac à sable (Sandbox)** est dispo pour les fictions ponctuelles.
4.  ⚡ **Niveau 4 : Générateur Intelligent (Nano Banana Pro)** — Selon le Lieu d'où vous venez, le studio **se verrouille automatiquement** (ex: impossible de choisir une ambiance Cyberpunk si vous avez cliqué sur "Salle de Bain de Clara"). Le rendu textuel sort sous forme de "Natural Language" ultra-structuré.

---

## ✨ Fonctionnalités Clés

- 🏗️ **Architecture Feature-Based :** Code modulaire (Features, Views, Store, Constants). Fini le composant monolithique de 2000 lignes.
- 🌑 **Dark Mode UI :** Propulsé par TailwindCSS pour un confort visuel pendant les longues sessions de prompt.
- 💾 **Persistance Locale :** Toutes vos fiches modèles, comptes et restrictions de décors sont sauvegardés dans votre navigateur (`localStorage`).
- 🤖 **Prompt Generator "Natural Language" :** Optimisé pour Google AI Studio, structurant parfaitement le Base Subject > Setting > Face > Body > Rigid Directives.

---

## 🚀 Installation & Lancement

```bash
# 1. Cloner le repository
git clone https://github.com/ledocsoff/nanabanana-studio.git

# 2. Accéder au dossier
cd nanabanana-studio

# 3. Installer les dépendances (React Router DOM, Tailwind...)
npm install

# 4. Lancer l'application
npm run dev
```

L'application s'ouvrira en `http://localhost:5173/`.

---

## 🛠️ Stack technique v4

| Technologie | Usage |
|-------------|-------|
| **React 19** | Cœur Applicatif |
| **React Router v6** | Navigation SPA en Entonnoir (URLs propres) |
| **TailwindCSS 3** | UI Systèm, Grilles, Dark Mode |
| **Context API** | State Global (StudioContext.jsx) |
| **Vite 6** | Build & Dev Server fulgurant |

---

## 📁 Structure du projet

La nouvelle arborescence est taillée pour la scalabilité :

```text
src/
├── constants/         # Listes déroulantes brutes (Yeux, Cheveux, Poses...)
├── features/          # Composants métier isolés
│   ├── ModelEditor/   # Les curseurs physiques
│   ├── OutputPanel/   # Le bloc noir copiable
│   └── SceneEditor/   # L'éditeur de décors/lumières
├── store/
│   └── StudioContext.jsx # Le Cerveau : Base de données en mémoire
├── utils/
│   ├── promptGenerators.js # Assembleur de chaînes Nano Banana Pro
│   └── storage.js          # Helpers LocalStorage relationnels
├── views/             # Les "Pages" du Routeur
│   ├── ModelsView.jsx     # (Niveau 1) Liste des modèles
│   ├── ModelEditorShell   # (Niveau 1b) Création
│   ├── AccountsView       # (Niveau 2) Les réseaux du modèle
│   ├── LocationsAnd...    # (Niveau 3) CRUD des lieux + Sandbox Launcher
│   └── GenerationView     # (Niveau 4) L'éditeur de scène intelligent
├── App.jsx            # Shell React Router (Navbar)
└── main.jsx           # Point d'entrée
```
