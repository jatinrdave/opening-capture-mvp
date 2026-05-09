# Session sync upload API (draft contract)

This document defines an **idempotent** HTTP contract aligned with the Opening Capture MVP spec (offline-first queue, append-only sessions, stable `sessionId`). The mobile client stub lives at `.worktrees/opening-capture-mvp/aisurvey-mobile/src/sync/sessionUploader.ts` and activates when `EXPO_PUBLIC_SYNC_API_BASE` is set at build time.

## Endpoint

`PUT /v1/sessions/{sessionId}`

- **Path:** `sessionId` — opaque stable identifier generated client-side (same id used in SQLite + exports).
- **Body:** JSON `{ "session": <CaptureSession> }` matching canonical schema v2 (same object as `recordJson` locally).

## Semantics

1. **Idempotent:** Re-sending the same `sessionId` with an identical canonical payload MUST return **200** or **204** without creating duplicate logical sessions.
2. **Append-only:** If the server already has a session with this `sessionId`, the server MUST NOT mutate measurement history or replace audit fields in a way that breaks reproducibility; versioning or rejection policies are implementation-defined.
3. **Conflict:** If a second client invents a conflicting payload for the same `sessionId` (hash mismatch), respond **409** with an error body; client keeps local queue in `error` / retry state (future enhancement).

## Follow-ups (not in MVP stub)

- Separate **multipart** uploads for binary assets (`requiredPhotos`, signatures, optional depth/video) keyed by `sessionId` + asset hash.
- AuthN/Z (org/project scoped bearer tokens).
- ETag or payload digest for true idempotent merges.

## Environment

Set in `.env` or CI for Expo:

```bash
EXPO_PUBLIC_SYNC_API_BASE=https://api.example.com
```

Without this variable, Retry in the app remains **local-only** and surfaces an explanatory alert.
