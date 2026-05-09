# aisurvey-mobile

Expo (React Native) app for **opening capture**: projects → openings → capture sessions → review/exports → compare. Offline-first SQLite storage.

## Full specification

See the repo-level document:

**[`docs/specifications/opening-capture-mobile-application-spec.md`](../../../docs/specifications/opening-capture-mobile-application-spec.md)**

(path from this folder: up to AISurvey root, then `docs/specifications/...`)

## Quick start

```bash
npm install
npm start
```

Then open iOS simulator, Android emulator, or Expo Go using the CLI prompts.

```bash
npm test              # Vitest
npx tsc --noEmit      # Typecheck
```

## Optional sync API

Set `EXPO_PUBLIC_SYNC_API_BASE` before `expo start` if you have a backend implementing [`sync-upload-api.md`](../../../docs/prd-rollout/sync-upload-api.md).
