import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { getOpening } from "@/src/db/openingsRepo";
import { listSessions } from "@/src/db/sessionsRepo";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";

type SessionRow = { sessionId: string; createdAt: string; overallStatus: string };

export default function OpeningDetailScreen() {
  const router = useRouter();
  const { openingId } = useLocalSearchParams<{ openingId: string }>();
  const [label, setLabel] = useState("");
  const [meta, setMeta] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    if (!openingId) return;
    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
        const o = await getOpening(openingId);
        if (!o || cancelled) {
          if (!o) Alert.alert("Not found", "Opening could not be loaded.");
          return;
        }
        const parts = [o.locationNotes?.trim(), o.openingType?.trim()].filter(Boolean);
        setLabel(o.label);
        setMeta(parts.length ? parts.join(" · ") : "No location notes or type set.");
        const rows = await listSessions(openingId);
        if (!cancelled) setSessions(rows);
      } catch (e) {
        if (!cancelled) Alert.alert("Error", e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openingId]);

  useFocusEffect(refresh);

  if (!openingId) {
    return (
      <Screen>
        <Section title="Missing opening">
          <Text style={styles.empty}>Invalid route.</Text>
        </Section>
      </Screen>
    );
  }

  function statusStyle(code: string) {
    switch (code) {
      case "PASS":
        return styles.stPass;
      case "WARN":
        return styles.stWarn;
      case "FAIL":
        return styles.stFail;
      default:
        return styles.stMuted;
    }
  }

  return (
    <Screen>
      <Section title={label || "Opening"} subtitle={busy ? "Loading…" : meta}>
        <View style={styles.actions}>
          <Button onPress={() => router.push({ pathname: "/openings/[openingId]/capture", params: { openingId } })}>
            New capture
          </Button>
          <Button
            variant="secondary"
            onPress={() => router.push({ pathname: "/openings/[openingId]/compare", params: { openingId } })}>
            Compare scans
          </Button>
        </View>
        <View style={styles.actions}>
          <Button
            variant="secondary"
            onPress={() => router.push({ pathname: "/openings/[openingId]/tolerance", params: { openingId } })}>
            Tolerance overrides
          </Button>
          <Button
            variant="secondary"
            onPress={() => router.push({ pathname: "/openings/[openingId]/edit", params: { openingId } })}>
            Edit opening
          </Button>
        </View>
      </Section>

      <Section title="Sessions" subtitle={`${sessions.length} recorded · newest first`}>
        <FlatList
          data={sessions}
          keyExtractor={(it) => it.sessionId}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: "/sessions/[sessionId]/review", params: { sessionId: item.sessionId } })
              }
              style={({ pressed }) => [styles.sRow, pressed && styles.sRowPressed]}>
              <View style={styles.sLeft}>
                <Text style={styles.sTitle}>{new Date(item.createdAt).toLocaleString()}</Text>
                <Text style={styles.sMeta}>…{item.sessionId.slice(-10)}</Text>
              </View>
              <Text style={[styles.sBadge, statusStyle(item.overallStatus)]}>{item.overallStatus}</Text>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No sessions yet. Start with New capture.</Text>
          }
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sep: { height: 1, backgroundColor: "#F3F4F6" },
  sRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  sRowPressed: { backgroundColor: "#F9FAFB" },
  sLeft: { flex: 1, gap: 2 },
  sTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  sMeta: { fontSize: 12, color: "#6B7280" },
  sBadge: { fontSize: 13, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: "hidden" },
  stPass: { backgroundColor: "#DCFCE7", color: "#166534" },
  stWarn: { backgroundColor: "#FEF3C7", color: "#B45309" },
  stFail: { backgroundColor: "#FEE2E2", color: "#B42318" },
  stMuted: { backgroundColor: "#F3F4F6", color: "#4B5563" },
  chev: { fontSize: 20, color: "#9CA3AF" },
  empty: { fontSize: 13, color: "#6B7280", paddingVertical: 12 },
});

