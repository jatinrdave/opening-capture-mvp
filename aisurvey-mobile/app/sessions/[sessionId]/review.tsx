import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { getSessionById, updateSessionRecord } from "@/src/db/sessionsRepo";
import { writeSessionExports, type ExportPaths } from "@/src/exports/writeExportFiles";
import type { CaptureSession, ToleranceResult } from "@/src/domain/models";
import { REQUIRED_PHOTO_KINDS } from "@/src/domain/models";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";
import { TextField } from "@/src/ui/components/TextField";

function labelForCheck(c: ToleranceResult["check"]): string {
  switch (c) {
    case "outOfSquare":
      return "Out of square";
    case "widthRange":
      return "Width range";
    case "heightRange":
      return "Height range";
  }
}

function bannerStyleForStatus(s: CaptureSession["overallStatus"]) {
  switch (s) {
    case "PASS":
      return [styles.banner, styles.passBanner];
    case "WARN":
      return [styles.banner, styles.warnBanner];
    case "FAIL":
      return [styles.banner, styles.failBanner];
  }
}

function toleranceCellStyle(st: ToleranceResult["status"]) {
  switch (st) {
    case "PASS":
      return styles.passText;
    case "WARN":
      return styles.warnText;
    case "FAIL":
      return styles.failText;
  }
}

export default function ReviewScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportsPaths, setExportsPaths] = useState<ExportPaths | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [signatureUri, setSignatureUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        if (!sessionId) return;
        const s = await getSessionById(sessionId);
        if (!cancelled && s) {
          setSession(s);
          setReviewerName(s.signOff?.reviewerName ?? "");
          setSignatureUri(s.signOff?.signatureUri ?? null);
        } else if (!cancelled) {
          setSession(s);
        }
      } catch (e) {
        if (!cancelled) Alert.alert("Error", e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const header = useMemo(() => {
    if (!session) return null;
    const title = session.overallStatus;
    const subtitle = `${new Date(session.startedAt).toLocaleString()} → ${new Date(session.endedAt).toLocaleString()}`;
    return { title, subtitle };
  }, [session]);

  async function persist(next: CaptureSession) {
    await updateSessionRecord(next);
    setSession(next);
  }

  async function onGenerateExports() {
    if (!session) return;
    setBusy(true);
    try {
      const p = await writeSessionExports(session);
      setExportsPaths(p);
      const generatedAt = new Date().toISOString();
      const next: CaptureSession = {
        ...session,
        exports: {
          pdfPath: p.pdfPath,
          jsonPath: p.jsonPath,
          csvPath: p.csvPath,
          generatedAt,
        },
      };
      await persist(next);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSharePdf() {
    const pdf = exportsPaths?.pdfPath ?? session?.exports?.pdfPath;
    if (!pdf) return;
    setBusy(true);
    try {
      const can = await Sharing.isAvailableAsync();
      if (!can) {
        Alert.alert("Unavailable", "Sharing is not available on this platform.");
        return;
      }
      await Sharing.shareAsync(pdf, { mimeType: "application/pdf", dialogTitle: "Share survey PDF" });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function pickSignature() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Media library permission is required.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (res.canceled) return;
    setSignatureUri(res.assets[0]?.uri ?? null);
  }

  async function onSaveSignOff() {
    if (!session) return;
    const name = reviewerName.trim();
    if (!name) {
      Alert.alert("Reviewer required", "Enter reviewer name before saving sign-off.");
      return;
    }
    setBusy(true);
    try {
      const next: CaptureSession = {
        ...session,
        signOff: {
          reviewerName: name,
          signatureUri: signatureUri ?? null,
          reviewedAt: new Date().toISOString(),
        },
      };
      await persist(next);
      Alert.alert("Saved", "Sign-off recorded on this session.");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading session…</Text>
        </View>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <Section title="Session not found">
          <Text style={styles.muted}>No session exists for id: {sessionId}</Text>
        </Section>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={bannerStyleForStatus(session.overallStatus)}>
        <Text style={styles.bannerTitle}>{header?.title}</Text>
        <Text style={styles.bannerSubtitle}>{header?.subtitle}</Text>
      </View>

      <Section title="Site context" subtitle="Snapshots frozen at capture time for audit exports.">
        <Kv label="Opening" value={session.openingSnapshot?.label ?? session.openingId} />
        {session.openingSnapshot?.openingType ? (
          <Kv label="Opening type" value={session.openingSnapshot.openingType} />
        ) : null}
        {session.openingSnapshot?.locationNotes ? (
          <Kv label="Opening location notes" value={session.openingSnapshot.locationNotes} />
        ) : null}
        {session.projectSnapshot ? <Kv label="Project" value={session.projectSnapshot.name} /> : null}
        {session.projectSnapshot?.siteAddress ? <Kv label="Project site address" value={session.projectSnapshot.siteAddress} /> : null}
        {session.projectSnapshot?.siteNotes ? <Kv label="Project site notes" value={session.projectSnapshot.siteNotes} /> : null}
      </Section>

      <Section title="Capture metadata">
        <Kv label="Operator" value={session.operatorUserId} />
        <Kv label="Offline capture" value={session.offlineCaptured ? "yes" : "no"} />
        <Kv label="Sync state" value={session.syncState} />
        <Kv label="Device" value={[session.device.manufacturer, session.device.modelName].filter(Boolean).join(" ") || "—"} />
        <Kv label="OS" value={[session.device.osName, session.device.osVersion].filter(Boolean).join(" ") || "—"} />
        <Kv label="App version" value={session.device.appVersion ?? "—"} />
        {session.location.status === "granted" ? (
          <>
            <Kv label="GPS" value={`${session.location.latitude.toFixed(6)}, ${session.location.longitude.toFixed(6)}`} />
            {session.location.accuracyM != null ? (
              <Kv label="GPS accuracy (m)" value={String(session.location.accuracyM)} />
            ) : null}
          </>
        ) : (
          <Kv label="GPS" value={`unavailable — ${session.location.reason}`} />
        )}
      </Section>

      <Section title="Manual plumb / level">
        {session.manualPlumbLevel?.plumbAssessment || session.manualPlumbLevel?.levelAssessment ? (
          <>
            <Kv label="Plumb" value={session.manualPlumbLevel?.plumbAssessment ?? "—"} />
            <Kv label="Level" value={session.manualPlumbLevel?.levelAssessment ?? "—"} />
          </>
        ) : (
          <Text style={styles.muted}>No qualitative plumb/level notes on this session.</Text>
        )}
      </Section>

      <Section title="Optional media">
        <Kv label="Depth artifact" value={session.mediaArtifacts?.optionalDepthArtifactUri ? "attached" : "—"} />
        <Kv label="Video" value={session.mediaArtifacts?.optionalVideoUri ? "attached" : "—"} />
      </Section>

      {session.measurements.annotationRefs && session.measurements.annotationRefs.length > 0 ? (
        <Section title="Measurement annotations" subtitle="Plumb / level evidence attached at capture (photo refs).">
          <View style={styles.thumbGrid}>
            {session.measurements.annotationRefs.map((uri, idx) => (
              <View key={`${uri}-${idx}`} style={styles.thumbCell}>
                <Text style={styles.thumbLabel}>Annotation {idx + 1}</Text>
                <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="Photos" subtitle="Required angles captured for this session.">
        <View style={styles.thumbGrid}>
          {REQUIRED_PHOTO_KINDS.map((k) => {
            const uri = session.requiredPhotos[k];
            return (
              <View key={k} style={styles.thumbCell}>
                <Text style={styles.thumbLabel}>{k}</Text>
                {uri ? (
                  <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Text style={styles.muted}>missing</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </Section>

      <Section title="Measurements (mm)">
        <Kv label="Width top / mid / bottom" value={`${session.measurements.widthTop} · ${session.measurements.widthMid} · ${session.measurements.widthBottom}`} />
        <Kv label="Height L / C / R" value={`${session.measurements.heightLeft} · ${session.measurements.heightCenter} · ${session.measurements.heightRight}`} />
        {(session.measurements.depthLeft != null || session.measurements.depthRight != null) && (
          <Kv
            label="Depth L / R"
            value={`${session.measurements.depthLeft ?? "—"} · ${session.measurements.depthRight ?? "—"}`}
          />
        )}
        {session.measurements.notes ? <Kv label="Notes" value={session.measurements.notes} /> : null}
      </Section>

      <Section title="Derived (audit)" subtitle="Nominal per MVP: mid width × center height.">
        <Kv label="Nominal W × H" value={`${session.derivedMeasurements.nominalWidthMm} × ${session.derivedMeasurements.nominalHeightMm} mm`} />
        <Kv label="Width min–max" value={`${session.derivedMeasurements.widthMinMm} – ${session.derivedMeasurements.widthMaxMm}`} />
        <Kv label="Height min–max" value={`${session.derivedMeasurements.heightMinMm} – ${session.derivedMeasurements.heightMaxMm}`} />
        <Kv label="Out-of-square (W top−bottom)" value={`${session.derivedMeasurements.outOfSquareWidthMm} mm`} />
        <Kv label="Out-of-square (H L−R)" value={`${session.derivedMeasurements.outOfSquareHeightMm} mm`} />
      </Section>

      <Section title="Tolerance results" subtitle={`Warn band uses ×${session.toleranceConfigSnapshot.warnBandMultiplier} over PASS limits.`}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colCheck]}>Check</Text>
          <Text style={[styles.th, styles.colNum]}>Value</Text>
          <Text style={[styles.th, styles.colNum]}>Limit</Text>
          <Text style={[styles.th, styles.colStatus]}>Status</Text>
        </View>
        {session.toleranceResults.map((r) => (
          <View key={r.check} style={styles.tableRow}>
            <Text style={[styles.td, styles.colCheck]}>{labelForCheck(r.check)}</Text>
            <Text style={[styles.td, styles.colNum]}>{r.valueMm.toFixed(1)}</Text>
            <Text style={[styles.td, styles.colNum]}>{r.limitMm.toFixed(1)}</Text>
            <Text style={[styles.td, styles.colStatus, toleranceCellStyle(r.status)]}>{r.status}</Text>
          </View>
        ))}
      </Section>

      <Section title="Sign-off" subtitle="Recorded on-device; included in PDF/CSV/JSON exports when present.">
        <TextField label="Reviewer name" value={reviewerName} onChangeText={setReviewerName} placeholder="Supervisor or QC lead" />
        <Button variant="secondary" onPress={() => void pickSignature()} disabled={busy}>
          {signatureUri ? "Replace signature image" : "Attach signature image (optional)"}
        </Button>
        {signatureUri ? <Image source={{ uri: signatureUri }} style={styles.signaturePreview} resizeMode="contain" /> : null}
        {session.signOff ? (
          <Text style={styles.muted}>Last saved: {new Date(session.signOff.reviewedAt).toLocaleString()}</Text>
        ) : null}
        <Button onPress={() => void onSaveSignOff()} disabled={busy}>
          Save sign-off
        </Button>
      </Section>

      <Section title="Exports">
        <Button onPress={() => void onGenerateExports()} disabled={busy}>
          Generate exports
        </Button>
        <Button onPress={() => void onSharePdf()} disabled={busy || !(exportsPaths?.pdfPath ?? session.exports?.pdfPath)} variant="secondary">
          Share PDF
        </Button>

        {exportsPaths || session.exports ? (
          <View style={styles.paths}>
            <Text style={styles.pathLine}>PDF: {(exportsPaths ?? session.exports)?.pdfPath ?? "—"}</Text>
            <Text style={styles.pathLine}>JSON: {(exportsPaths ?? session.exports)?.jsonPath ?? "—"}</Text>
            <Text style={styles.pathLine}>CSV: {(exportsPaths ?? session.exports)?.csvPath ?? "—"}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Generate exports to enable sharing and persist paths on the session.</Text>
        )}
      </Section>
    </Screen>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{label}</Text>
      <Text style={styles.kvVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 10,
  },
  muted: {
    color: "#6B7280",
    fontSize: 13,
  },
  banner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  passBanner: {
    backgroundColor: "#ECFDF3",
    borderColor: "#ABEFC6",
  },
  warnBanner: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  failBanner: {
    backgroundColor: "#FEF3F2",
    borderColor: "#FECDC9",
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "#111827",
  },
  bannerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  kvKey: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  kvVal: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  thumbGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  thumbCell: {
    width: "47%",
    gap: 6,
  },
  thumbLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    textTransform: "capitalize",
  },
  thumb: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  thumbPlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  signaturePreview: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  th: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },
  td: {
    fontSize: 13,
    color: "#111827",
  },
  colCheck: {
    flex: 1,
  },
  colNum: {
    width: 70,
    textAlign: "right",
  },
  colStatus: {
    width: 74,
    textAlign: "right",
    fontWeight: "800",
  },
  passText: {
    color: "#067647",
  },
  warnText: {
    color: "#B45309",
  },
  failText: {
    color: "#B42318",
  },
  paths: {
    gap: 6,
  },
  pathLine: {
    fontSize: 11,
    color: "#6B7280",
  },
});
