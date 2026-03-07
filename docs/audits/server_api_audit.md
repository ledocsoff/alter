# 🔧 Alter v5.2.1 — Audit Server API & Intégrité des Données

🤖 **Agent : `@backend-specialist`** | Skills : `api-patterns` + `database-design`

---

## 📡 Inventaire des 18 Endpoints REST

| Méthode | Route | Payload | Validation | Verdict |
|---|---|---|---|---|
| GET | `/api/health` | — | — | ✅ |
| GET | `/api/version` | — | — | ✅ |
| GET | `/api/load` | — | — | ✅ |
| POST | `/api/save` | 2MB | `validatePayload()` | ✅ |
| GET | `/api/backups` | — | — | ✅ |
| POST | `/api/restore/:n` | — | `parseInt` + range check | ✅ |
| GET | `/api/gallery` | query params | `parseInt` + `Math.min/max` | ✅ |
| GET | `/api/gallery/:id` | — | `isValidGalleryId` | ✅ |
| GET | `/api/gallery/:id/image` | — | `isValidGalleryId` + `path.basename` | ✅ |
| POST | `/api/gallery` | 50MB | MIME whitelist + size limit | ✅ |
| PATCH | `/api/gallery/:id/star` | — | `isValidGalleryId` | ✅ |
| DELETE | `/api/gallery/:id` | — | `isValidGalleryId` | ✅ |
| DELETE | `/api/gallery` | — | — | ✅ |
| POST | `/api/refs/:modelId` | 50MB | `isValidModelId` + MIME + size | ✅ |
| GET | `/api/refs/:modelId` | — | `isValidModelId` | ✅ |
| GET | `/api/refs/:modelId/:refId/image` | — | Both IDs validated | ✅ |
| DELETE | `/api/refs/:modelId/:refId` | — | Both IDs validated | ✅ |
| POST | `/api/location-refs/:locationId` | 50MB | `isValidLocationId` + MIME + size | ✅ |

---

## 🐛 Bugs Trouvés & Corrigés

### Bug 1 : Double `unhandledRejection` listener

- **Fichier :** [server.js](file:///Users/quentin/Desktop/nanabanana-studio/server.js) L1033 + L1039
- **Problème :** Deux handlers `process.on('unhandledRejection')` enregistrés, le 2ème étant un doublon créé par erreur. Chaque erreur était loggée 2 fois.
- **Fix :** Supprimé le doublon, gardé un seul handler.

### Bug 2 : Écriture non-atomique des index de références

- **Fichier :** [server.js](file:///Users/quentin/Desktop/nanabanana-studio/server.js) — `writeRefsIndex` + `writeLocRefsIndex`
- **Problème :** Utilisaient `fs.writeFileSync()` directement, alors que `writeGalleryIndex` et `writeDataAtomic` utilisent le pattern **tmp→rename** (écriture atomique). Si le serveur crash pendant l'écriture de l'index des refs, le fichier serait corrompu (tronqué ou vide).
- **Fix :** Les deux fonctions utilisent maintenant le même pattern :

```diff
-fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(entries, null, 2));
+const tmpFile = path.join(dir, `.tmp.${crypto.randomBytes(4).toString('hex')}.json`);
+fs.writeFileSync(tmpFile, JSON.stringify(entries, null, 2), 'utf-8');
+fs.renameSync(tmpFile, indexPath);
```

---

## ✅ Points Validés

### Protection des Entrées

| Mécanisme | Couverture |
|---|---|
| `sanitizeFilename()` | Tous les chemins de fichier utilisateur |
| `isValidGalleryId()` | Regex strict `^gal_\d+_[a-f0-9]+$` |
| `isValidModelId()` | Regex `^[a-zA-Z0-9_\-]{3,80}$` |
| `isValidRefId()` | Regex `^ref_[a-zA-Z0-9_\-]+$` |
| `isValidLocationId()` | Regex `^[a-zA-Z0-9_\-]{3,80}$` |
| `isValidLocRefId()` | Regex `^locref_[a-zA-Z0-9_\-]+$` |
| `path.basename()` | Utilisé avant chaque accès fichier image |
| MIME whitelist | `image/png`, `image/jpeg`, `image/webp` uniquement |
| Taille max image | 20MB par image |

### Résilience aux Pannes

| Mécanisme | Statut |
|---|---|
| Écriture atomique `data.json` | ✅ tmp→rename |
| Écriture atomique gallery index | ✅ tmp→rename |
| Écriture atomique ref index | ✅ **Corrigé** (était non-atomique) |
| Écriture atomique loc ref index | ✅ **Corrigé** (était non-atomique) |
| Rotation 5 backups | ✅ Avant chaque save |
| Auto-recovery depuis backups | ✅ `tryRestoreFromBackup()` |
| Checksum SHA-256 | ✅ Vérification à la lecture |
| Nettoyage .tmp orphelins | ✅ Au startup + shutdown |
| Graceful shutdown (SIGTERM/SIGINT) | ✅ Avec timeout 5s |
| `uncaughtException` handler | ✅ Continue de servir |
| `unhandledRejection` handler | ✅ **Corrigé** (était dupliqué) |

### Garbage Collection

| Type | Mécanisme |
|---|---|
| Images galerie | ✅ Max 200 (FIFO auto-purge) |
| Dossiers modèle orphelins | ✅ GC après chaque save |
| Dossiers lieu orphelins | ✅ GC après chaque save |
| Fichiers .tmp | ✅ Nettoyage au startup/shutdown |
