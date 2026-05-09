import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";

import { getSessionById, listSyncQueue, retrySyncQueueMarkQueued } from "@/src/db/sessionsRepo";
import { attemptUploadSession } from "@/src/sync/sessionUploader";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";

type Row = { sessionId: string; openingId: string; enqueuedAt: string; status: string };

export default function SyncQueueScreen() {
  const [items, setItems] = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listSyncQueue();
        if (!cancelled) setItems(rows);
      } catch (e) {
        Alert.alert("Error", e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(refresh);

  async function onRetry(sessionId: string) {
    setBusyId(sessionId);
    try {
      await retrySyncQueueMarkQueued(sessionId);
      const session = await getSessionById(sessionId);
      const upload = session ? await attemptUploadSession(session) : { ok: false as const, error: "Session not found" };
      setItems(await listSyncQueue());

      if (upload.ok) {
        Alert.alert("Retry complete", `${upload.message} Queue timestamp refreshed for session …${sessionId.slice(-10)}.`);
      } else {
        Alert.alert(
          "Retry complete (local only)",
          `${upload.error}\n\nLocal queue row was reset to pending. See docs/prd-rollout/sync-upload-api.md for the HTTP contract when a backend is available.`
        );
      }
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <Section
        title="Sync queue"
        subtitle="Sessions enqueue after capture. With EXPO_PUBLIC_SYNC_API_BASE unset, upload stays offline-only; Retry runs the uploader stub + resets queue state.">
        <FlatList
          data={items}
          keyExtractor={(it) => it.sessionId}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>…{item.sessionId.slice(-12)}</Text>
                <Text style={styles.rowMeta}>
                  opening …{item.openingId.slice(-8)} · {item.status} · {new Date(item.enqueuedAt).toLocaleString()}
                </Text>
              </View>
              <Button variant="secondary" onPress={() => void onRetry(item.sessionId)} disabled={busyId === item.sessionId}>
                Retry
              </Button>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nothing queued yet.</Text>
            </View>
          }
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sep: { height: 1, backgroundColor: "#F3F4F6" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  rowLeft: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  rowMeta: { fontSize: 12, color: "#6B7280" },
  empty: { paddingVertical: 16 },
  emptyText: { fontSize: 13, color: "#6B7280" },
});
