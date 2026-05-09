import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { diffMeasurements } from "@/src/domain/compare";
import type { CaptureSession } from "@/src/domain/models";
import { getSessionById, listSessions } from "@/src/db/sessionsRepo";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";

type SessionSummary = { sessionId: string; createdAt: string; overallStatus: string };

function formatMm(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} mm`;
}

function statusStyle(code: string) {
  switch (code) {
    case "PASS":
      return styles.statusPass;
    case "WARN":
      return styles.statusWarn;
    case "FAIL":
      return styles.statusFail;
    default:
      return styles.statusNeutral;
  }
}

export default function CompareSessionsScreen() {
  const { openingId } = useLocalSearchParams<{ openingId: string }>();

  const [summaries, setSummaries] = useState<SessionSummary[]>([]);
  const [pickA, setPickA] = useState<string | null>(null);
  const [pickB, setPickB] = useState<string | null>(null);
  const [sessionA, setSessionA] = useState<CaptureSession | null>(null);
  const [sessionB, setSessionB] = useState<CaptureSession | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    if (!openingId) return;
    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
        const rows = await listSessions(openingId);
        if (cancelled) return;
        setSummaries(rows);
        if (rows.length >= 2) {
          setPickB(rows[0].sessionId);
          setPickA(rows[1].sessionId);
        } else if (rows.length === 1) {
          setPickA(rows[0].sessionId);
          setPickB(rows[0].sessionId);
        } else {
          setPickA(null);
          setPickB(null);
        }
      } catch (e) {
        Alert.alert("Error", e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openingId]);

  useFocusEffect(refresh);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!pickA) {
        setSessionA(null);
        return;
      }
      const s = await getSessionById(pickA);
      if (!cancelled) setSessionA(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [pickA]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!pickB) {
        setSessionB(null);
        return;
      }
      const s = await getSessionById(pickB);
      if (!cancelled) setSessionB(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [pickB]);

  const deltas = useMemo(() => {
    if (!sessionA || !sessionB) return null;
    return diffMeasurements(sessionA.measurements, sessionB.measurements);
  }, [sessionA, sessionB]);

  const samePick = pickA && pickB && pickA === pickB;

  function renderPicker(label: string, selectedId: string | null, onSelect: (id: string) => void) {
    return (
      <Section title={label} subtitle={busy ? "Loading…" : `${summaries.length} session(s)`}>
        {summaries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No sessions yet for this opening.</Text>
          </View>
        ) : (
          summaries.map((item, index) => {
            const selected = item.sessionId === selectedId;
            const shortId = item.sessionId.slice(-10);
            return (
              <View key={item.sessionId}>
                {index > 0 ? <View style={styles.sep} /> : null}
                <Pressable
                  onPress={() => onSelect(item.sessionId)}
                  style={({ pressed }) => [
                    styles.pickRow,
                    selected && styles.pickRowSelected,
                    pressed && styles.pickRowPressed,
                  ]}>
                  <View style={styles.pickLeft}>
                    <Text style={styles.pickTitle}>{new Date(item.createdAt).toLocaleString()}</Text>
                    <Text style={styles.pickMeta}>
                      …{shortId} · {item.overallStatus}
                    </Text>
                  </View>
                  <Text style={styles.pickChevron}>{selected ? "●" : "○"}</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </Section>
    );
  }

  return (
    <Screen>
      {renderPicker("Baseline scan (A)", pickA, setPickA)}
      {renderPicker("Compare scan (B)", pickB, setPickB)}

      <Section title="Overall status" subtitle={samePick ? "Pick two different sessions to compare." : undefined}>
        {sessionA && sessionB ? (
          <Text style={styles.statusLine}>
            {samePick ? (
              <Text style={styles.warn}>Select two different sessions.</Text>
            ) : (
              <>
                <Text style={[styles.statusBefore, statusStyle(sessionA.overallStatus)]}>{sessionA.overallStatus}</Text>
                <Text style={styles.arrow}> → </Text>
                <Text style={[styles.statusAfter, statusStyle(sessionB.overallStatus)]}>{sessionB.overallStatus}</Text>
              </>
            )}
          </Text>
        ) : (
          <Text style={styles.muted}>Loading sessions…</Text>
        )}
      </Section>

      <Section title="Measurement deltas (B − A)" subtitle="Positive means scan B is larger on that dimension.">
        {!samePick && deltas ? (
          <View style={styles.deltaGrid}>
            <DeltaRow label="Width top" value={formatMm(deltas.widthTopDelta)} />
            <DeltaRow label="Width mid" value={formatMm(deltas.widthMidDelta)} />
            <DeltaRow label="Width bottom" value={formatMm(deltas.widthBottomDelta)} />
            <DeltaRow label="Height left" value={formatMm(deltas.heightLeftDelta)} />
            <DeltaRow label="Height center" value={formatMm(deltas.heightCenterDelta)} />
            <DeltaRow label="Height right" value={formatMm(deltas.heightRightDelta)} />
          </View>
        ) : (
          <Text style={styles.muted}>{summaries.length < 2 ? "Need at least two scans." : "Pick two sessions above."}</Text>
        )}
      </Section>
    </Screen>
  );
}

function DeltaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.deltaRow}>
      <Text style={styles.deltaLabel}>{label}</Text>
      <Text style={styles.deltaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sep: { height: 1, backgroundColor: "#F3F4F6" },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  pickRowSelected: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  pickRowPressed: {
    opacity: 0.85,
  },
  pickLeft: { flex: 1, gap: 2 },
  pickTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  pickMeta: { fontSize: 12, color: "#6B7280" },
  pickChevron: { fontSize: 18, color: "#2563EB", paddingLeft: 8 },
  empty: { paddingVertical: 12 },
  emptyText: { fontSize: 13, color: "#6B7280" },
  statusLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 },
  statusBefore: { fontSize: 15, fontWeight: "700" },
  arrow: { fontSize: 15, color: "#9CA3AF" },
  statusAfter: { fontSize: 15, fontWeight: "700" },
  statusPass: { color: "#067647" },
  statusWarn: { color: "#B45309" },
  statusFail: { color: "#B42318" },
  statusNeutral: { color: "#374151" },
  warn: { fontSize: 14, color: "#B45309", fontWeight: "600" },
  muted: { fontSize: 13, color: "#6B7280" },
  deltaGrid: { gap: 8 },
  deltaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  deltaLabel: { fontSize: 14, color: "#374151" },
  deltaValue: { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"], color: "#111827" },
});
