# 💎 Alter

> AI Model Management & Image Generation Studio — Desktop app for macOS & Windows

Alter is a premium prompt engineering workstation for AI image generation. Manage virtual model profiles, configure detailed scenes, and generate consistent images via Google Gemini — all from a sleek, dark-themed interface.

## Download

| Platform | Download |
| Platform | Download |
|----------|----------|
| **macOS** (Apple Silicon) | [Alter-5.3.10-arm64.dmg](https://github.com/ledocsoff/alter/releases/latest) |
| **Windows** (x64) | [Alter Setup 5.3.10.exe](https://github.com/ledocsoff/alter/releases/latest) |

### 🍏 macOS Installation Guide (Important)
Since Alter is downloaded from GitHub and is not signed by a paid Apple Developer certificate, macOS enforces strict security rules (Gatekeeper and App Translocation). To ensure the app can save your generation data and automatically update itself, please follow these exact steps:
1. Open the downloaded `.dmg` file.
2. **CRITICAL:** Drag and drop the `Alter` icon into the `Applications` folder shortcut right next to it. *Do not launch it directly from the DMG window or your Downloads folder.*
3. Open your Mac's `Applications` folder.
4. **Right-click** (or Control+Click) on the `Alter` app and select **Open**.
5. A security prompt will appear. Click **Open** again to bypass Gatekeeper. 
*(You only need to do this step once. Future launches can be done with a normal double-click).*

> **Windows Users**: Click "More info" → "Run anyway" if Microsoft Defender SmartScreen appears on the first launch.

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
- **Dual API keys** — Two API key slots with automatic failover on quota exhaustion
- **Unified logging** — Activity + Technical logs panel with export for diagnosis
- **Auto-save & backups** — Atomic writes with 5-slot backup rotation and auto-recovery
- **Data validation** — Automatic repair of corrupted data on load
- **Auto-update** — In-app updates via GitHub Releases (Electron only)
- **Security hardened** — Rate limiting, input validation, path traversal protection, XSS protection, API key obfuscation
- **Remote Access (Tailscale/LAN)** — Dynamic CORS routing to access the studio from a phone on a private network
- **Mobile Responsive UI** — Touch targets, safe-areas, and fully responsive layouts for mobile usage

## Audits & Quality Control

Alter (v5.3.0) has passed a rigorous 6-phase master technical audit. The detailed reports (Cybersecurity OWASP 2025, Performance, Accessibility, and Server Integrity) can be found in the [`docs/audits/`](docs/audits/) directory.

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
git tag v5.2.0
git push origin v5.2.0
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
| AI | Google Gemini API (gemini-3-pro-image-preview) |
| Packaging | electron-builder 25 |
| CI/CD | GitHub Actions |

## Architecture

```
alter/
├── src/                    # React frontend
│   ├── views/              # Page-level components (Models, Accounts, Locations, Generation)
│   ├── features/           # Feature modules (Gallery, SceneEditor, ImagePreview, etc.)
│   ├── components/         # Shared UI (Icons, etc.)
│   ├── store/              # React Context (StudioContext, ToastContext)
│   ├── utils/              # Storage, AI, helpers, prompt generators
│   └── constants/          # Scene options, outfit presets
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

No `.env` file required — the API key is configured directly in the app via the **API** button in the header. Two key slots (primary + secondary) allow dual-quota management with automatic failover. Keys are stored with base64 obfuscation in localStorage.

## Data Persistence

All data is stored in the `sauvegarde/` folder at the project root:
- **Backup**: Copy the `sauvegarde/` folder to preserve all data
- **Restore**: Replace the `sauvegarde/` folder and restart
- **Export/Import**: Use the built-in Export/Import buttons in the header

## License

Private project.
 
