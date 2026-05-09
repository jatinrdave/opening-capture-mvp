# PRD phase: Platform foundation (post-MVP)

For **how the current mobile MVP behaves today** (screens, SQLite, exports, sync stub), see [`docs/specifications/opening-capture-mobile-application-spec.md`](../specifications/opening-capture-mobile-application-spec.md).

This phase corresponds to **program phase 2** in the MVP vs PRD gap roadmap: enable multi-tenant SaaS properties assumed by the full PRD ([`You are a senior Product Manager...`](../../You%20are%20a%20senior%20Product%20Manager,%20Solution%20Archite.md)) without implementing domain ML/AR yet.

## Goals

| Area | Outcomes |
|------|-----------|
| **Identity** | Org + user accounts, SSO optional, device binding for field tablets |
| **Authorization** | RBAC: org admin, project editor, surveyor read/write, QA read-only exports |
| **APIs** | Versioned REST or GraphQL for projects, openings, sessions, media presigned URLs |
| **Storage** | Object store for photos/video; PostgreSQL or equivalent for relational core |
| **Sync** | Implement [`sync-upload-api.md`](./sync-upload-api.md); background worker retries |
| **Audit** | Immutable session ledger; who exportedShared PDF; GPS consent logs |
| **Observability** | Structured logs, tracing for upload pipeline, mobile crash reporting |

## Dependencies for later PRD slices

- **AI/ML validation** needs labeled media references server-side and batch export APIs.
- **AR installation** needs stable session anchors + calibration metadata APIs.
- **Digital twin / BIM** needs geometry interchange (glTF/IFC hand-off) built on top of durable session storage.

## Mobile app touchpoints

- Replace device-local operator profile with authenticated subject claims (while retaining offline capture).
- Wire `EXPO_PUBLIC_SYNC_API_BASE` (or runtime remote config) per environment.
- Expand `sync_queue` statuses: `pending` → `uploading` → `synced` | `error` with server ack.
