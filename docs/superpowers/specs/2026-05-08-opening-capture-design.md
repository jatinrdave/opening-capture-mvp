# Opening Capture & Surveying (Hybrid) — Design Spec

**Status:** Approved direction (2026-05-08)

**Goal**

Deliver an offline-capable mobile workflow (iOS + Android) that captures a fenestration opening and produces an engineering-usable **opening record** with **measurements + tolerance checks + media**, exported as **PDF + JSON/CSV** for downstream QA/manufacturing processes.

**Architecture (high level)**

- **Camera-first core** that works reliably on iOS + Android
- **Device-capability enhancements** when depth is available (iOS LiDAR; Android depth/ToF where supported) without changing the core data model
- **Offline-first** capture sessions stored locally and synchronized when online
- **Exports** generated from a single canonical `CaptureSession` record (same source for PDF + JSON/CSV)

---

## MVP Scope

### In-scope (MVP)

#### 1) Projects, Openings, and Capture Sessions

- User can create/select a **Project**
- User can create/select an **Opening** (identified by label + location metadata)
- User can create a **Capture Session** for an Opening
- Each Capture Session stores:
  - Timestamp (start/end)
  - Device info (make/model, OS, app version)
  - Operator identity (signed-in user id)
  - GPS coordinates (if granted) + a “location unavailable” reason
  - Offline flag + sync state

#### 2) Guided capture (media + optional depth)

- Capture **photos** required for MVP (minimum set per opening)
  - “Full opening” overview
  - Left jamb close-up
  - Right jamb close-up
  - Head close-up
  - Sill/threshold close-up
- Optional video capture (allowed, not required)
- Optional depth capture when supported (record as an attached artifact), but MVP logic must not depend on it to succeed

#### 3) Measurements + tolerance checks

**Measurements captured per session (MVP set):**
- Width: top / mid / bottom
- Height: left / center / right
- Depth (reveal): left / right (optional if not applicable)

**Derived / computed fields (MVP):**
- Nominal width, nominal height (choose a deterministic rule: e.g., mid width + center height, with min/max recorded)
- Out-of-square indication via deltas (e.g., |top - bottom|, |left - right|)
- Plumb/level: MVP is **manual assessment + photo annotation**; do not block release on sensor fusion

**Tolerance checks (rules-based, MVP):**
- Configurable tolerance thresholds at:
  - Project-level defaults
  - Opening-level overrides
- Produces:
  - PASS / WARN / FAIL per check
  - Overall “opening readiness” summary

#### 4) Review, sign-off, and audit trail

- Session review screen shows:
  - Measurements, derived deltas, tolerance results
  - Media thumbnails
  - Metadata (operator, time, location, device)
- Sign-off captured as:
  - Name + optional signature scribble
  - “Reviewed by” timestamp

#### 5) Exports (PDF + JSON/CSV)

**PDF export (MVP):**
- Project + Opening identifiers
- Session metadata
- Measurements table + tolerance results
- Selected images (at least overview + one close-up)
- Sign-off section
- QR code or short code referencing the session id (for later retrieval)

**Data export (MVP):**
- JSON export of the canonical record (recommended for integrations)
- CSV export for measurements + tolerance results (tabular)

#### 6) Multi-scan comparison (lightweight)

- View two sessions for the same Opening
- Show delta for each measurement and overall tolerance status changes
- Record “supersedes session X” relationship (optional)

#### 7) Offline-first + sync

- Full capture + review + export must work offline
- Sync policy:
  - Queue uploads for media + session JSON when online
  - Idempotent session upload via stable `sessionId`
  - Conflict rule: sessions are append-only; never overwrite an existing session, only add new

### Explicitly out-of-scope (MVP)

- AR installation overlays and step-by-step installation guidance
- ML defect detection (sealant gaps, anchoring, shims, etc.)
- BIM/CAD/digital twin round-trip
- Automated “surface irregularities” detection (MVP uses notes/annotations)
- Full sensor-based plumb/level computation across all devices
- Remote collaboration / live review

---

## Primary Personas (MVP)

- **Surveyor / Measurer**: captures opening data to avoid fabrication/fit issues
- **Installer Lead**: references opening record to anticipate install constraints
- **QA Inspector**: uses session evidence + tolerance checks for acceptance and documentation
- **Project Manager**: wants an auditable record and faster turnaround on rework decisions

---

## UX: Key Screens (MVP)

1) Project picker / recent projects
2) Opening list (search + status)
3) Opening detail (sessions timeline + compare)
4) Capture session wizard
   - Required photo checklist
   - Optional depth capture step (skippable)
   - Measurements entry / assisted capture
5) Review & tolerance results
6) Export & share (PDF + data), offline-aware
7) Sync status (background + manual retry)

---

## Data Model (canonical record)

**Org**
- `orgId`, name

**Project**
- `projectId`, `orgId`, name, address/site metadata, default tolerances

**Opening**
- `openingId`, `projectId`, label (e.g., “W-101”), location notes, opening type (window/door/etc.)

**CaptureSession**
- `sessionId`, `openingId`
- timestamps, operator, device, location, syncState
- `media[]`
- `measurements`
- `toleranceConfigSnapshot` (copy of tolerances used at time of capture)
- `toleranceResults`
- `signOff`
- `exports[]` (PDF + JSON + CSV references)

**MeasurementSet (MVP)**
- width: top/mid/bottom
- height: left/center/right
- depth: left/right (optional)
- notes + annotations references

---

## Technical Notes / Constraints (MVP)

- **Hybrid approach**: depth artifacts are optional inputs; do not make core correctness depend on depth availability.
- **Determinism**: derived values and tolerance results must be reproducible from stored inputs (no “magic” re-computation that changes after export).
- **Append-only sessions**: preserves auditability and reduces sync conflicts.

---

## Success Criteria (MVP)

- A surveyor can capture an Opening session fully offline in < 5 minutes.
- Exported PDF is acceptable as “job record” evidence (measurements + media + sign-off).
- JSON/CSV export matches PDF values (single source of truth).
- Multi-scan comparison clearly highlights deltas and changed PASS/WARN/FAIL states.

---

## Open Questions (deferred, not blocking MVP)

- Standard library of tolerance presets by region/standard (AAMA/ASTM/EN/etc.)
- Best-in-class automated measurement from imagery vs guided manual entry
- Depth normalization across Android device variants

