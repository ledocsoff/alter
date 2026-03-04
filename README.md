# 💎 Velvet Studio

> AI Model Management & Prompt Generation Studio

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Features

- Gestion multi-modèles avec profils détaillés
- Comptes Instagram/TikTok par modèle
- Lieux et scènes personnalisables
- Génération de prompts (JSON + texte) via Gemini
- Matrice d'ancrage pour la cohérence visuelle
- Galerie d'images générées avec favoris
- Historique des prompts
- PWA installable (Chrome/Edge)
- Sauvegarde automatique serveur avec backups

## Stack

- **Frontend** : React + Vite
- **Backend** : Express.js (Node 18+)
- **AI** : Google Gemini API

## .env

Pas de fichier `.env` requis — la clé API est configurée dans l'app (bouton API dans le header).
