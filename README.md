# 💎 Velvet Studio

> AI Model Management & Image Generation Studio — Desktop app for macOS & Windows

Velvet Studio is a premium prompt engineering workstation for AI image generation. Manage virtual model profiles, configure detailed scenes, and generate consistent images via Google Gemini — all from a sleek, dark-themed interface.

## Download

| Platform | Download |
|----------|----------|
| **macOS** (Apple Silicon) | [Velvet Studio-5.1.0-arm64.dmg](https://github.com/ledocsoff/velvet-studio/releases/latest) |
| **Windows** (x64) | [Velvet Studio Setup 5.1.0.exe](https://github.com/ledocsoff/velvet-studio/releases/latest) |

> **Note**: The app is not code-signed. On macOS, right-click → Open on first launch. On Windows, click "More info" → "Run anyway".

## Features

- **Multi-model management** — Create detailed AI model profiles with physical attributes, personality traits, and reference photos
- **Account system** — Organize models by Instagram/TikTok/Tinder/OnlyFans accounts
- **Location & scene editor** — Configure environments, outfits, poses, lighting, camera angles per location
- **Drag & drop reorder** — Reorganize models, accounts, and locations by dragging
- **AI prompt generation** — Automatic JSON + text prompt generation via Google Gemini API
- **Anchor matrix** — Visual consistency system that locks identity traits across generations
- **Reference images** — Upload face/body references for identity-locked generation
- **Multi-turn coherence** — Conversation history maintains visual consistency across batches
- **Image gallery** — Server-side storage with pagination, favorites, and lazy loading
- **Prompt history** — Browse, search, and reuse previous prompts with rich metadata badges
- **Scene templates** — Save and load scene presets for quick setup
- **Sandbox mode** — Free-form generation without location constraints
- **Seed management** — Reproducible outputs with per-location seed tracking
- **Auto-save & backups** — Atomic writes with 5-slot backup rotation and auto-recovery
- **Auto-update** — In-app updates via GitHub Releases (Electron only)
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

## Releases & CI/CD

Releases are automated via GitHub Actions. To create a new release:

```bash
# Tag and push to trigger the build pipeline
git tag v5.0.1
git push origin v5.0.1
```

The CI pipeline will:
1. Build macOS `.dmg` and Windows `.exe` in parallel
2. Upload both as GitHub Release artifacts
3. Auto-generate release notes from commits

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite 6 |
| Styling | Tailwind CSS 3 |
| Backend | Express.js (Node 20+) |
| Desktop | Electron 33 |
| AI | Google Gemini API (imagen / gemini-2.0-flash) |
| Packaging | electron-builder 25 |
| CI/CD | GitHub Actions |

## Architecture

```
velvet-studio/
├── src/                    # React frontend
│   ├── views/              # Page-level components (Models, Accounts, Locations, Generation)
│   ├── features/           # Feature modules (Gallery, SceneEditor, ImagePreview, etc.)
│   ├── components/         # Shared UI (Icons, etc.)
│   ├── store/              # React Context (StudioContext, ToastContext)
│   ├── utils/              # Storage, AI, helpers, prompt generators
│   └── constants/          # Scene options, outfit presets, controlnet presets
├── electron/               # Electron main + preload
├── server.js               # Express API server (persistence, gallery, backups)
├── sauvegarde/             # Persistent data (auto-created)
│   ├── data.json           # Models, templates, history (checksummed)
│   ├── gallery/            # Generated images (max 200)
│   └── data.backup.*.json  # 5-slot backup rotation
├── .github/workflows/      # CI/CD release pipeline
└── release/                # Built installers (local)
```

## API Configuration

No `.env` file required — the API key is configured directly in the app via the **API** button in the header. Two provider slots (Google AI Studio + Google Cloud) allow dual-quota management. The key is stored with base64 obfuscation in localStorage.

## License

Private project.
