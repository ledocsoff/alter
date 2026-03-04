# 💎 Velvet Studio

> AI Model Management & Image Generation Studio — Desktop app for macOS & Windows

Velvet Studio is a premium prompt engineering workstation for AI image generation. Manage virtual model profiles, configure detailed scenes, and generate consistent images via Google Gemini — all from a sleek, dark-themed interface.

## Download

| Platform | Download |
|----------|----------|
| **macOS** (Apple Silicon) | [Velvet Studio-5.0.0-arm64.dmg](https://github.com/ledocsoff/nanabanana-studio/releases/latest) |
| **Windows** (x64) | [Velvet Studio Setup 5.0.0.exe](https://github.com/ledocsoff/nanabanana-studio/releases/latest) |

> **Note**: The app is not code-signed. On macOS, right-click → Open on first launch. On Windows, click "More info" → "Run anyway".

## Features

- **Multi-model management** — Create detailed AI model profiles with physical attributes, personality traits, and reference photos
- **Account system** — Organize models by Instagram/TikTok accounts
- **Location & scene editor** — Configure environments, outfits, poses, lighting, camera angles per location
- **AI prompt generation** — Automatic JSON + text prompt generation via Google Gemini API
- **Anchor matrix** — Visual consistency system that locks identity traits across generations
- **Reference images** — Upload face/body references for identity-locked generation
- **Multi-turn coherence** — Conversation history maintains visual consistency across batches
- **Image gallery** — Server-side storage with pagination, favorites, and lazy loading
- **Prompt history** — Browse, search, and reuse previous prompts
- **Scene templates** — Save and load scene presets for quick setup
- **Sandbox mode** — Free-form generation without location constraints
- **Seed management** — Reproducible outputs with per-location seed tracking
- **Auto-save & backups** — Atomic writes with 5-slot backup rotation and auto-recovery
- **Security hardened** — Rate limiting, input validation, path traversal protection, API key obfuscation

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Start dev server (API + Vite)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Electron (Desktop)

```bash
# Dev mode with Electron window
npm run electron:dev

# Build distributable (Mac .dmg / Windows .exe)
npm run electron:build
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 6 |
| Styling | Tailwind CSS 3 |
| Backend | Express.js (Node 18+) |
| Desktop | Electron 33 |
| AI | Google Gemini API (imagen / gemini-2.0-flash) |
| Packaging | electron-builder 25 |

## Architecture

```
velvet-studio/
├── src/                    # React frontend
│   ├── views/              # Page-level components
│   ├── features/           # Feature modules (Gallery, SceneEditor, etc.)
│   ├── components/         # Shared UI (Icons, etc.)
│   ├── store/              # React Context (StudioContext, ToastContext)
│   ├── utils/              # Storage, AI, helpers, prompt generators
│   └── constants/          # Scene options, outfit presets
├── electron/               # Electron main + preload
├── server.js               # Express API server
├── sauvegarde/             # Persistent data (auto-created)
│   ├── data.json           # Models, templates, history
│   ├── gallery/            # Generated images
│   └── data.backup.*.json  # Backup rotation
└── release/                # Built installers
```

## API Configuration

No `.env` file required — the API key is configured directly in the app via the API button in the header. The key is stored with base64 obfuscation in localStorage.

## License

Private project.
