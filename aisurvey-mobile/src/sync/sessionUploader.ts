import type { CaptureSession } from "@/src/domain/models";

export type UploadAttemptResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * MVP placeholder for idempotent session upload (see docs/prd-rollout/sync-upload-api.md).
 * Wire `EXPO_PUBLIC_SYNC_API_BASE` to enable HTTP retry against a real backend.
 */
export async function attemptUploadSession(session: CaptureSession): Promise<UploadAttemptResult> {
  const base = typeof process.env.EXPO_PUBLIC_SYNC_API_BASE === "string" ? process.env.EXPO_PUBLIC_SYNC_API_BASE.trim() : "";
  if (!base) {
    return {
      ok: false,
      error:
        "No sync endpoint configured (EXPO_PUBLIC_SYNC_API_BASE). Queue stays local until backend is available.",
    };
  }

  try {
    const url = `${base.replace(/\/$/, "")}/v1/sessions/${encodeURIComponent(session.sessionId)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
    });
    if (!res.ok) {
      return { ok: false, error: `Upload failed HTTP ${res.status}` };
    }
    return { ok: true, message: "Session uploaded (dev endpoint)." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
