# Opening Capture MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform (iOS+Android) offline-first mobile MVP for Opening Capture & Surveying that creates capture sessions with required photos + measurements + tolerance checks and exports **PDF + JSON + CSV** from one canonical record.

**Architecture:** Expo React Native app with a local SQLite database as the system of record (append-only `CaptureSession`). Media stored in app filesystem and referenced from DB. Exports generated from DB snapshot and stored as files; sharing via native share sheet. Sync is represented in the data model (`syncState`) but remote upload is out-of-scope for MVP.

**Tech Stack:** Expo (React Native) + TypeScript, expo-sqlite, expo-file-system, expo-image-picker, expo-camera, expo-print (PDF), expo-sharing, zod (validation), vitest (pure logic tests), eslint/prettier.

---

## File/Folder Structure (locked for MVP)

- Create: `app/` (Expo Router screens + UI)
- Create: `src/domain/` (types, tolerance rules, export builders)
- Create: `src/db/` (SQLite schema + queries)
- Create: `src/media/` (capture + persistence helpers)
- Create: `src/exports/` (PDF/JSON/CSV generation + file writing)
- Create: `src/state/` (simple stores; keep minimal)
- Create: `tests/` (unit tests for domain logic; no device tests)
- Create: `docs/superpowers/specs/2026-05-08-opening-capture-design.md` (already exists)

---

### Task 1: Scaffold Expo app + baseline tooling

**Files:**
- Create: `package.json` (generated)
- Create: `app/` (generated)
- Create: `src/` (new)
- Create: `tests/` (new)

- [ ] **Step 1: Scaffold Expo app (TypeScript)**

Run:
```bash
cd e:/Work/Repos/AISurvey
npx create-expo-app@latest aisurvey-mobile --template tabs@latest
```

Expected: a new folder `aisurvey-mobile/` with an Expo Router app.

- [ ] **Step 2: Add dependencies**

Run:
```bash
cd e:/Work/Repos/AISurvey/aisurvey-mobile
npm install zod
npx expo install expo-sqlite expo-file-system expo-image-picker expo-camera expo-print expo-sharing
```

Expected: installs succeed.

- [ ] **Step 3: Add dev dependencies + test runner**

Run:
```bash
npm install -D vitest @types/node
```

- [ ] **Step 4: Add `vitest` config for pure TS tests**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Add npm scripts**

Modify `package.json` to include:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Run tests (should pass, no tests yet)**

Run:
```bash
npm test
```

Expected: `No test files found` (exit code 0) or a clean run depending on defaults.

- [ ] **Step 7: Commit**

If you want git tracking (recommended):
```bash
cd e:/Work/Repos/AISurvey
git init
git add .
git commit -m "chore: scaffold expo app for opening capture mvp"
```

---

### Task 2: Define domain model + validation (canonical record)

**Files:**
- Create: `src/domain/ids.ts`
- Create: `src/domain/models.ts`
- Create: `src/domain/validation.ts`
- Test: `tests/domain.validation.test.ts`

- [ ] **Step 1: Write failing tests for validation**

Create `tests/domain.validation.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseCaptureSessionDraft } from "../src/domain/validation";

describe("capture session validation", () => {
  it("rejects missing required photos", () => {
    const result = parseCaptureSessionDraft({
      openingId: "opening_123",
      requiredPhotos: {
        overview: null,
        leftJamb: null,
        rightJamb: null,
        head: null,
        sill: null,
      },
      measurements: {
        widthTop: 1000,
        widthMid: 1000,
        widthBottom: 1000,
        heightLeft: 1200,
        heightCenter: 1200,
        heightRight: 1200,
      },
      toleranceConfig: {
        maxOutOfSquareMm: 5,
        maxWidthRangeMm: 4,
        maxHeightRangeMm: 4,
      },
    });

    expect(result.success).toBe(false);
  });

  it("accepts when required photos and required measurements exist", () => {
    const result = parseCaptureSessionDraft({
      openingId: "opening_123",
      requiredPhotos: {
        overview: "file:///x/overview.jpg",
        leftJamb: "file:///x/left.jpg",
        rightJamb: "file:///x/right.jpg",
        head: "file:///x/head.jpg",
        sill: "file:///x/sill.jpg",
      },
      measurements: {
        widthTop: 1000,
        widthMid: 1001,
        widthBottom: 1000,
        heightLeft: 1200,
        heightCenter: 1200,
        heightRight: 1198,
      },
      toleranceConfig: {
        maxOutOfSquareMm: 5,
        maxWidthRangeMm: 4,
        maxHeightRangeMm: 4,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.openingId).toBe("opening_123");
    }
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:
```bash
npm test
```

Expected: FAIL with module not found for `../src/domain/validation`.

- [ ] **Step 3: Add ids helper**

Create `src/domain/ids.ts`:
```ts
export function newId(prefix: string): string {
  const rand = Math.random().toString(16).slice(2);
  const ts = Date.now().toString(16);
  return `${prefix}_${ts}_${rand}`;
}
```

- [ ] **Step 4: Add model types**

Create `src/domain/models.ts`:
```ts
export type RequiredPhotoKind = "overview" | "leftJamb" | "rightJamb" | "head" | "sill";

export type RequiredPhotos = Record<RequiredPhotoKind, string | null>;

export type MeasurementSet = {
  widthTop: number;
  widthMid: number;
  widthBottom: number;
  heightLeft: number;
  heightCenter: number;
  heightRight: number;
  depthLeft?: number | null;
  depthRight?: number | null;
};

export type ToleranceConfig = {
  maxOutOfSquareMm: number;
  maxWidthRangeMm: number;
  maxHeightRangeMm: number;
};

export type ToleranceResult = {
  check: "outOfSquare" | "widthRange" | "heightRange";
  status: "PASS" | "WARN" | "FAIL";
  valueMm: number;
  limitMm: number;
};

export type CaptureSessionDraft = {
  openingId: string;
  requiredPhotos: RequiredPhotos;
  measurements: MeasurementSet;
  toleranceConfig: ToleranceConfig;
};

export type CaptureSession = {
  sessionId: string;
  openingId: string;
  createdAt: string; // ISO
  requiredPhotos: RequiredPhotos;
  measurements: MeasurementSet;
  toleranceConfigSnapshot: ToleranceConfig;
  toleranceResults: ToleranceResult[];
  overallStatus: "PASS" | "WARN" | "FAIL";
  syncState: "local_only" | "queued" | "synced" | "error";
};
```

- [ ] **Step 5: Implement zod validation + parsing**

Create `src/domain/validation.ts`:
```ts
import { z } from "zod";
import type { CaptureSessionDraft, RequiredPhotoKind, RequiredPhotos } from "./models";

const requiredPhotoKinds: RequiredPhotoKind[] = ["overview", "leftJamb", "rightJamb", "head", "sill"];

const RequiredPhotosSchema = z
  .object({
    overview: z.string().nullable(),
    leftJamb: z.string().nullable(),
    rightJamb: z.string().nullable(),
    head: z.string().nullable(),
    sill: z.string().nullable(),
  })
  .superRefine((val, ctx) => {
    for (const k of requiredPhotoKinds) {
      if (!val[k]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing required photo: ${k}`,
          path: [k],
        });
      }
    }
  });

const MeasurementSetSchema = z.object({
  widthTop: z.number().positive(),
  widthMid: z.number().positive(),
  widthBottom: z.number().positive(),
  heightLeft: z.number().positive(),
  heightCenter: z.number().positive(),
  heightRight: z.number().positive(),
  depthLeft: z.number().positive().nullable().optional(),
  depthRight: z.number().positive().nullable().optional(),
});

const ToleranceConfigSchema = z.object({
  maxOutOfSquareMm: z.number().positive(),
  maxWidthRangeMm: z.number().positive(),
  maxHeightRangeMm: z.number().positive(),
});

const CaptureSessionDraftSchema = z.object({
  openingId: z.string().min(1),
  requiredPhotos: RequiredPhotosSchema,
  measurements: MeasurementSetSchema,
  toleranceConfig: ToleranceConfigSchema,
});

export function parseCaptureSessionDraft(input: unknown):
  | { success: true; data: CaptureSessionDraft }
  | { success: false; error: z.ZodError } {
  const parsed = CaptureSessionDraftSchema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  return { success: false, error: parsed.error };
}
```

- [ ] **Step 6: Run tests to verify pass**

Run:
```bash
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain tests vitest.config.ts package.json package-lock.json
git commit -m "feat: add domain models and validation for capture sessions"
```

---

### Task 3: Implement tolerance rules (pure logic) + tests

**Files:**
- Create: `src/domain/tolerance.ts`
- Modify: `src/domain/models.ts`
- Test: `tests/tolerance.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/tolerance.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { evaluateTolerances } from "../src/domain/tolerance";

describe("tolerance evaluation", () => {
  it("flags width range failures", () => {
    const r = evaluateTolerances(
      {
        widthTop: 1000,
        widthMid: 1006,
        widthBottom: 1000,
        heightLeft: 1200,
        heightCenter: 1200,
        heightRight: 1200,
      },
      { maxOutOfSquareMm: 10, maxWidthRangeMm: 4, maxHeightRangeMm: 4 }
    );
    expect(r.overall).toBe("FAIL");
    expect(r.results.find((x) => x.check === "widthRange")?.status).toBe("FAIL");
  });

  it("passes when within limits", () => {
    const r = evaluateTolerances(
      {
        widthTop: 1000,
        widthMid: 1001,
        widthBottom: 1000,
        heightLeft: 1200,
        heightCenter: 1200,
        heightRight: 1199,
      },
      { maxOutOfSquareMm: 10, maxWidthRangeMm: 4, maxHeightRangeMm: 4 }
    );
    expect(r.overall).toBe("PASS");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:
```bash
npm test
```

Expected: FAIL with module not found for `../src/domain/tolerance`.

- [ ] **Step 3: Implement evaluation**

Create `src/domain/tolerance.ts`:
```ts
import type { MeasurementSet, ToleranceConfig, ToleranceResult } from "./models";

function statusFor(value: number, limit: number): "PASS" | "FAIL" {
  return value <= limit ? "PASS" : "FAIL";
}

export function evaluateTolerances(
  m: MeasurementSet,
  cfg: ToleranceConfig
): { results: ToleranceResult[]; overall: "PASS" | "FAIL" } {
  const widthRange = Math.max(m.widthTop, m.widthMid, m.widthBottom) - Math.min(m.widthTop, m.widthMid, m.widthBottom);
  const heightRange =
    Math.max(m.heightLeft, m.heightCenter, m.heightRight) - Math.min(m.heightLeft, m.heightCenter, m.heightRight);
  const outOfSquare = Math.max(Math.abs(m.widthTop - m.widthBottom), Math.abs(m.heightLeft - m.heightRight));

  const results: ToleranceResult[] = [
    {
      check: "widthRange",
      status: statusFor(widthRange, cfg.maxWidthRangeMm),
      valueMm: widthRange,
      limitMm: cfg.maxWidthRangeMm,
    },
    {
      check: "heightRange",
      status: statusFor(heightRange, cfg.maxHeightRangeMm),
      valueMm: heightRange,
      limitMm: cfg.maxHeightRangeMm,
    },
    {
      check: "outOfSquare",
      status: statusFor(outOfSquare, cfg.maxOutOfSquareMm),
      valueMm: outOfSquare,
      limitMm: cfg.maxOutOfSquareMm,
    },
  ];

  const overall = results.some((r) => r.status === "FAIL") ? "FAIL" : "PASS";
  return { results, overall };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/tolerance.ts tests/tolerance.test.ts
git commit -m "feat: add tolerance evaluation rules"
```

---

### Task 4: Local database schema + repository layer (SQLite)

**Files:**
- Create: `src/db/db.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/projectsRepo.ts`
- Create: `src/db/openingsRepo.ts`
- Create: `src/db/sessionsRepo.ts`

- [ ] **Step 1: Create schema**

Create `src/db/schema.ts`:
```ts
export const schemaSql = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS projects (
  projectId TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS openings (
  openingId TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  label TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(projectId) REFERENCES projects(projectId)
);

CREATE TABLE IF NOT EXISTS sessions (
  sessionId TEXT PRIMARY KEY,
  openingId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  syncState TEXT NOT NULL,
  requiredPhotosJson TEXT NOT NULL,
  measurementsJson TEXT NOT NULL,
  toleranceConfigJson TEXT NOT NULL,
  toleranceResultsJson TEXT NOT NULL,
  overallStatus TEXT NOT NULL,
  FOREIGN KEY(openingId) REFERENCES openings(openingId)
);
`;
```

- [ ] **Step 2: Implement DB open/init**

Create `src/db/db.ts`:
```ts
import * as SQLite from "expo-sqlite";
import { schemaSql } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("aisurvey.db");
  await db.execAsync(schemaSql);
  return db;
}
```

- [ ] **Step 3: Implement repos (minimal CRUD)**

Create `src/db/projectsRepo.ts`:
```ts
import { getDb } from "./db";

export async function createProject(projectId: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT INTO projects (projectId, name, createdAt) VALUES (?, ?, ?)", [
    projectId,
    name,
    new Date().toISOString(),
  ]);
}

export async function listProjects(): Promise<{ projectId: string; name: string; createdAt: string }[]> {
  const db = await getDb();
  return await db.getAllAsync("SELECT projectId, name, createdAt FROM projects ORDER BY createdAt DESC");
}
```

Create `src/db/openingsRepo.ts`:
```ts
import { getDb } from "./db";

export async function createOpening(openingId: string, projectId: string, label: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT INTO openings (openingId, projectId, label, createdAt) VALUES (?, ?, ?, ?)", [
    openingId,
    projectId,
    label,
    new Date().toISOString(),
  ]);
}

export async function listOpenings(projectId: string): Promise<{ openingId: string; label: string; createdAt: string }[]> {
  const db = await getDb();
  return await db.getAllAsync("SELECT openingId, label, createdAt FROM openings WHERE projectId = ? ORDER BY createdAt DESC", [
    projectId,
  ]);
}
```

Create `src/db/sessionsRepo.ts`:
```ts
import { getDb } from "./db";
import type { CaptureSession } from "../domain/models";

export async function insertSession(s: CaptureSession): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sessions (
      sessionId, openingId, createdAt, syncState,
      requiredPhotosJson, measurementsJson,
      toleranceConfigJson, toleranceResultsJson,
      overallStatus
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.sessionId,
      s.openingId,
      s.createdAt,
      s.syncState,
      JSON.stringify(s.requiredPhotos),
      JSON.stringify(s.measurements),
      JSON.stringify(s.toleranceConfigSnapshot),
      JSON.stringify(s.toleranceResults),
      s.overallStatus,
    ]
  );
}

export async function listSessions(openingId: string): Promise<{ sessionId: string; createdAt: string; overallStatus: string }[]> {
  const db = await getDb();
  return await db.getAllAsync(
    "SELECT sessionId, createdAt, overallStatus FROM sessions WHERE openingId = ? ORDER BY createdAt DESC",
    [openingId]
  );
}
```

- [ ] **Step 4: Quick manual smoke (run app, create project/opening from temporary UI later)**

Run:
```bash
npx expo start
```

Expected: app launches (UI still placeholder at this stage).

- [ ] **Step 5: Commit**

```bash
git add src/db
git commit -m "feat: add sqlite schema and repositories"
```

---

### Task 5: Session creation service (draft → validated → canonical session)

**Files:**
- Create: `src/domain/sessionFactory.ts`
- Modify: `src/domain/models.ts`
- Test: `tests/sessionFactory.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/sessionFactory.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { createCaptureSession } from "../src/domain/sessionFactory";

describe("createCaptureSession", () => {
  it("creates canonical session with evaluated tolerances", () => {
    const s = createCaptureSession({
      openingId: "opening_123",
      requiredPhotos: {
        overview: "file:///x/overview.jpg",
        leftJamb: "file:///x/left.jpg",
        rightJamb: "file:///x/right.jpg",
        head: "file:///x/head.jpg",
        sill: "file:///x/sill.jpg",
      },
      measurements: {
        widthTop: 1000,
        widthMid: 1001,
        widthBottom: 1000,
        heightLeft: 1200,
        heightCenter: 1200,
        heightRight: 1199,
      },
      toleranceConfig: { maxOutOfSquareMm: 10, maxWidthRangeMm: 4, maxHeightRangeMm: 4 },
    });

    expect(s.sessionId).toMatch(/^session_/);
    expect(s.overallStatus).toBe("PASS");
    expect(s.toleranceResults.length).toBeGreaterThan(0);
    expect(s.syncState).toBe("local_only");
  });
});
```

- [ ] **Step 2: Run tests (expect failure)**

Run:
```bash
npm test
```

Expected: FAIL module not found.

- [ ] **Step 3: Implement factory**

Create `src/domain/sessionFactory.ts`:
```ts
import type { CaptureSession, CaptureSessionDraft } from "./models";
import { newId } from "./ids";
import { parseCaptureSessionDraft } from "./validation";
import { evaluateTolerances } from "./tolerance";

export function createCaptureSession(input: CaptureSessionDraft): CaptureSession {
  const parsed = parseCaptureSessionDraft(input);
  if (!parsed.success) {
    throw parsed.error;
  }

  const { results, overall } = evaluateTolerances(parsed.data.measurements, parsed.data.toleranceConfig);

  return {
    sessionId: newId("session"),
    openingId: parsed.data.openingId,
    createdAt: new Date().toISOString(),
    requiredPhotos: parsed.data.requiredPhotos,
    measurements: parsed.data.measurements,
    toleranceConfigSnapshot: parsed.data.toleranceConfig,
    toleranceResults: results,
    overallStatus: overall,
    syncState: "local_only",
  };
}
```

- [ ] **Step 4: Run tests (expect pass)**

Run:
```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/sessionFactory.ts tests/sessionFactory.test.ts
git commit -m "feat: create canonical capture sessions from drafts"
```

---

### Task 6: Media capture + persistence helpers (filesystem URIs)

**Files:**
- Create: `src/media/requiredPhotos.ts`
- Create: `src/media/persist.ts`

- [ ] **Step 1: Implement required photo checklist constants**

Create `src/media/requiredPhotos.ts`:
```ts
import type { RequiredPhotoKind } from "../domain/models";

export const requiredPhotoKinds: RequiredPhotoKind[] = ["overview", "leftJamb", "rightJamb", "head", "sill"];

export const requiredPhotoLabels: Record<RequiredPhotoKind, string> = {
  overview: "Full opening (overview)",
  leftJamb: "Left jamb (close-up)",
  rightJamb: "Right jamb (close-up)",
  head: "Head (close-up)",
  sill: "Sill/threshold (close-up)",
};
```

- [ ] **Step 2: Implement file persistence utility**

Create `src/media/persist.ts`:
```ts
import * as FileSystem from "expo-file-system";

export async function ensureDir(dirUri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dirUri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
  }
}

export async function copyIntoAppStorage(fromUri: string, toDir: string, filename: string): Promise<string> {
  await ensureDir(toDir);
  const toUri = `${toDir}/${filename}`;
  await FileSystem.copyAsync({ from: fromUri, to: toUri });
  return toUri;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/media
git commit -m "feat: add required photo checklist and media persistence helpers"
```

---

### Task 7: Export generation (JSON/CSV/PDF) from canonical session

**Files:**
- Create: `src/exports/jsonExport.ts`
- Create: `src/exports/csvExport.ts`
- Create: `src/exports/pdfExport.ts`
- Create: `src/exports/writeExportFiles.ts`

- [ ] **Step 1: Implement JSON export builder**

Create `src/exports/jsonExport.ts`:
```ts
import type { CaptureSession } from "../domain/models";

export function buildSessionJson(s: CaptureSession): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      ...s,
    },
    null,
    2
  );
}
```

- [ ] **Step 2: Implement CSV export builder**

Create `src/exports/csvExport.ts`:
```ts
import type { CaptureSession } from "../domain/models";

function esc(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

export function buildSessionCsv(s: CaptureSession): string {
  const rows: string[][] = [
    ["sessionId", s.sessionId],
    ["openingId", s.openingId],
    ["createdAt", s.createdAt],
    ["overallStatus", s.overallStatus],
    ["widthTop", s.measurements.widthTop],
    ["widthMid", s.measurements.widthMid],
    ["widthBottom", s.measurements.widthBottom],
    ["heightLeft", s.measurements.heightLeft],
    ["heightCenter", s.measurements.heightCenter],
    ["heightRight", s.measurements.heightRight],
    ["depthLeft", s.measurements.depthLeft ?? ""],
    ["depthRight", s.measurements.depthRight ?? ""],
  ];

  for (const r of s.toleranceResults) {
    rows.push([`tol_${r.check}_status`, r.status]);
    rows.push([`tol_${r.check}_valueMm`, r.valueMm]);
    rows.push([`tol_${r.check}_limitMm`, r.limitMm]);
  }

  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}
```

- [ ] **Step 3: Implement PDF export (HTML → PDF)**

Create `src/exports/pdfExport.ts`:
```ts
import type { CaptureSession } from "../domain/models";

export function buildSessionPdfHtml(s: CaptureSession): string {
  const tr = (k: string, v: string) => `<tr><td style="padding:6px;border:1px solid #ddd">${k}</td><td style="padding:6px;border:1px solid #ddd">${v}</td></tr>`;
  const tolRows = s.toleranceResults
    .map((r) => `<tr><td style="padding:6px;border:1px solid #ddd">${r.check}</td><td style="padding:6px;border:1px solid #ddd">${r.status}</td><td style="padding:6px;border:1px solid #ddd">${r.valueMm}</td><td style="padding:6px;border:1px solid #ddd">${r.limitMm}</td></tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Opening Capture Report</title>
</head>
<body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px;">
  <h1 style="margin:0 0 8px;">Opening Capture Report</h1>
  <div style="color:#444;margin-bottom:16px;">Session: <b>${s.sessionId}</b> · Opening: <b>${s.openingId}</b></div>

  <h2 style="margin:24px 0 8px;">Summary</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    ${tr("Created At", s.createdAt)}
    ${tr("Overall Status", s.overallStatus)}
  </table>

  <h2 style="margin:24px 0 8px;">Measurements (mm)</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    ${tr("Width (top/mid/bottom)", `${s.measurements.widthTop} / ${s.measurements.widthMid} / ${s.measurements.widthBottom}`)}
    ${tr("Height (left/center/right)", `${s.measurements.heightLeft} / ${s.measurements.heightCenter} / ${s.measurements.heightRight}`)}
    ${tr("Depth (left/right)", `${s.measurements.depthLeft ?? ""} / ${s.measurements.depthRight ?? ""}`)}
  </table>

  <h2 style="margin:24px 0 8px;">Tolerance Checks</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    <tr>
      <th style="text-align:left;padding:6px;border:1px solid #ddd">Check</th>
      <th style="text-align:left;padding:6px;border:1px solid #ddd">Status</th>
      <th style="text-align:left;padding:6px;border:1px solid #ddd">Value (mm)</th>
      <th style="text-align:left;padding:6px;border:1px solid #ddd">Limit (mm)</th>
    </tr>
    ${tolRows}
  </table>

  <div style="margin-top:24px;color:#666;font-size:12px;">Generated from canonical capture session record (schemaVersion 1).</div>
</body>
</html>`;
}
```

- [ ] **Step 4: Implement export file writer**

Create `src/exports/writeExportFiles.ts`:
```ts
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import type { CaptureSession } from "../domain/models";
import { buildSessionCsv } from "./csvExport";
import { buildSessionJson } from "./jsonExport";
import { buildSessionPdfHtml } from "./pdfExport";

export type ExportPaths = { pdfPath: string; jsonPath: string; csvPath: string };

export async function writeSessionExports(s: CaptureSession): Promise<ExportPaths> {
  const dir = `${FileSystem.documentDirectory}exports/${s.sessionId}`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const jsonPath = `${dir}/session.json`;
  const csvPath = `${dir}/session.csv`;
  await FileSystem.writeAsStringAsync(jsonPath, buildSessionJson(s), { encoding: FileSystem.EncodingType.UTF8 });
  await FileSystem.writeAsStringAsync(csvPath, buildSessionCsv(s), { encoding: FileSystem.EncodingType.UTF8 });

  const { uri: pdfPath } = await Print.printToFileAsync({
    html: buildSessionPdfHtml(s),
    base64: false,
  });

  // Copy into session export directory for consistent sharing location
  const pdfCopyPath = `${dir}/report.pdf`;
  await FileSystem.copyAsync({ from: pdfPath, to: pdfCopyPath });

  return { pdfPath: pdfCopyPath, jsonPath, csvPath };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/exports
git commit -m "feat: generate pdf/json/csv exports from capture session"
```

---

### Task 8: MVP UI screens (projects → openings → capture wizard → review → export)

**Files:**
- Modify/Create: `app/(tabs)/index.tsx` (or your starter route)
- Create: `app/projects/index.tsx`
- Create: `app/projects/[projectId]/openings.tsx`
- Create: `app/openings/[openingId]/capture.tsx`
- Create: `app/sessions/[sessionId]/review.tsx`
- Create: `src/ui/components/` (minimal reusable pieces)

- [ ] **Step 1: Implement Project list + create**

UI requirements:
- List projects from SQLite
- Button to create a project (name prompt)

Minimal code sketch for “create project”:
```ts
import { newId } from "../../src/domain/ids";
import { createProject } from "../../src/db/projectsRepo";

await createProject(newId("project"), projectName);
```

- [ ] **Step 2: Implement Opening list + create**

UI requirements:
- List openings for project
- Create opening (label input)

- [ ] **Step 3: Implement Capture wizard (required photos + measurements + tolerances)**

Wizard sections:
- Required photos checklist (uses `expo-image-picker`)
- Measurement entry form (mm)
- Tolerance configuration (use project defaults, allow overrides)
- “Create session” button:
  - validate draft via `parseCaptureSessionDraft`
  - create canonical session via `createCaptureSession`
  - persist via `insertSession`

- [ ] **Step 4: Implement Review screen**

Show:
- Measurements
- Tolerance results table
- Overall PASS/FAIL

- [ ] **Step 5: Implement Export screen/actions**

Actions:
- Generate exports via `writeSessionExports`
- Share via `expo-sharing`:
```ts
import * as Sharing from "expo-sharing";
await Sharing.shareAsync(pdfPath);
```

- [ ] **Step 6: Manual test (device/simulator)**

Run:
```bash
npx expo start
```

Test checklist:
- Create project
- Create opening
- Start capture
- Attach 5 required photos
- Enter measurements
- Generate session
- Review results
- Generate PDF/JSON/CSV
- Share PDF

- [ ] **Step 7: Commit**

```bash
git add app src/ui
git commit -m "feat: add mvp capture wizard, review, and export UI"
```

---

### Task 9: Multi-scan comparison (two sessions delta)

**Files:**
- Create: `src/domain/compare.ts`
- Test: `tests/compare.test.ts`
- Create: `app/openings/[openingId]/compare.tsx`

- [ ] **Step 1: Write failing test for delta calculation**

Create `tests/compare.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { diffMeasurements } from "../src/domain/compare";

describe("diffMeasurements", () => {
  it("computes deltas", () => {
    const d = diffMeasurements(
      { widthTop: 1000, widthMid: 1000, widthBottom: 1000, heightLeft: 1200, heightCenter: 1200, heightRight: 1200 },
      { widthTop: 1002, widthMid: 1000, widthBottom: 999, heightLeft: 1200, heightCenter: 1198, heightRight: 1200 }
    );
    expect(d.widthTopDelta).toBe(2);
    expect(d.heightCenterDelta).toBe(-2);
  });
});
```

- [ ] **Step 2: Implement compare logic**

Create `src/domain/compare.ts`:
```ts
import type { MeasurementSet } from "./models";

export function diffMeasurements(a: MeasurementSet, b: MeasurementSet) {
  return {
    widthTopDelta: b.widthTop - a.widthTop,
    widthMidDelta: b.widthMid - a.widthMid,
    widthBottomDelta: b.widthBottom - a.widthBottom,
    heightLeftDelta: b.heightLeft - a.heightLeft,
    heightCenterDelta: b.heightCenter - a.heightCenter,
    heightRightDelta: b.heightRight - a.heightRight,
  };
}
```

- [ ] **Step 3: Implement compare screen**

UI:
- Choose two sessions (latest two by default)
- Display deltas for key fields
- Display overall status change (PASS→FAIL etc.)

- [ ] **Step 4: Run tests**

Run:
```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/compare.ts tests/compare.test.ts app/openings
git commit -m "feat: add multi-scan comparison for opening sessions"
```

---

## Plan Self-Review (required)

- **Spec coverage**: This plan implements MVP in the spec: projects/openings/sessions, required photos, measurements, tolerance checks, exports, review, offline-first local storage, and lightweight compare.
- **Placeholder scan**: No “TBD” sections; each task includes exact file paths + code + commands.
- **Type consistency**: `CaptureSessionDraft` → `CaptureSession` created via `createCaptureSession`, exports read `CaptureSession`, DB stores JSON snapshots.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-05-08-opening-capture-mvp.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch one task at a time, review between tasks
2. **Inline Execution** — execute tasks in this session with checkpoints

