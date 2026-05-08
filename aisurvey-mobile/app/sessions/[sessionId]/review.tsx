import * as Sharing from "expo-sharing";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getSessionById } from "@/src/db/sessionsRepo";
import { writeSessionExports, type ExportPaths } from "@/src/exports/writeExportFiles";
import type { CaptureSession, ToleranceResult } from "@/src/domain/models";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";

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

export default function ReviewScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [exports, setExports] = useState<ExportPaths | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        if (!sessionId) return;
        const s = await getSessionById(sessionId);
        if (!cancelled) setSession(s);
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
    const pass = session.overallStatus === "PASS";
    return { pass, title: pass ? "PASS" : "FAIL", subtitle: new Date(session.createdAt).toLocaleString() };
  }, [session]);

  async function onGenerateExports() {
    if (!session) return;
    setBusy(true);
    try {
      const p = await writeSessionExports(session);
      setExports(p);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSharePdf() {
    if (!exports?.pdfPath) return;
    setBusy(true);
    try {
      const can = await Sharing.isAvailableAsync();
      if (!can) {
        Alert.alert("Unavailable", "Sharing is not available on this platform.");
        return;
      }
      await Sharing.shareAsync(exports.pdfPath, { mimeType: "application/pdf", dialogTitle: "Share survey PDF" });
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
      <View style={[styles.banner, header?.pass ? styles.passBanner : styles.failBanner]}>
        <Text style={styles.bannerTitle}>{header?.title}</Text>
        <Text style={styles.bannerSubtitle}>{header?.subtitle}</Text>
      </View>

      <Section title="Measurements (mm)">
        {Object.entries(session.measurements).map(([k, v]) => (
          <View key={k} style={styles.kvRow}>
            <Text style={styles.kvKey}>{k}</Text>
            <Text style={styles.kvVal}>{v ?? "—"}</Text>
          </View>
        ))}
      </Section>

      <Section title="Tolerance results">
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
            <Text style={[styles.td, styles.colStatus, r.status === "PASS" ? styles.passText : styles.failText]}>
              {r.status}
            </Text>
          </View>
        ))}
      </Section>

      <Section title="Exports">
        <Button onPress={() => void onGenerateExports()} disabled={busy}>
          Generate exports
        </Button>
        <Button onPress={() => void onSharePdf()} disabled={busy || !exports} variant="secondary">
          Share PDF
        </Button>

        {exports ? (
          <View style={styles.paths}>
            <Text style={styles.pathLine}>PDF: {exports.pdfPath}</Text>
            <Text style={styles.pathLine}>JSON: {exports.jsonPath}</Text>
            <Text style={styles.pathLine}>CSV: {exports.csvPath}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Generate exports to enable sharing.</Text>
        )}
      </Section>
    </Screen>
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
    width: 70,
    textAlign: "right",
    fontWeight: "800",
  },
  passText: {
    color: "#067647",
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

