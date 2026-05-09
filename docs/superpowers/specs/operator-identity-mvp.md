# Operator identity — MVP clarification

The Opening Capture design spec ([`2026-05-08-opening-capture-design.md`](./2026-05-08-opening-capture-design.md)) refers to **operator identity (signed-in user id)**.

## MVP implementation (2026)

Until platform authentication ships:

1. **Capture screen** collects operator id/name per session (required field).
2. **Operator profile** (`Settings → Operator`) persists a **device-local default** only (JSON file under app documents via `operatorStore`). This is **not** SSO and **not** tamper-proof.
3. **Exports** stamp whatever string the operator entered for that session.

## Alignment with full PRD

Full PRD assumes multi-tenant SaaS accounts. See [`docs/prd-rollout/platform-foundation.md`](../../prd-rollout/platform-foundation.md) for replacing local defaults with authenticated subjects and org-scoped RBAC.
