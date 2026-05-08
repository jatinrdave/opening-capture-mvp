import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { createOpening, listOpenings } from "@/src/db/openingsRepo";
import { newId } from "@/src/domain/ids";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";
import { TextField } from "@/src/ui/components/TextField";

type OpeningRow = { openingId: string; label: string; createdAt: string };

export default function OpeningsScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [label, setLabel] = useState("");
  const [items, setItems] = useState<OpeningRow[]>([]);
  const [busy, setBusy] = useState(false);

  const canCreate = useMemo(() => label.trim().length > 0 && !busy, [label, busy]);

  const refresh = useCallback(() => {
    if (!projectId) return;
    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
        const rows = await listOpenings(projectId);
        if (!cancelled) setItems(rows);
      } catch (e) {
        if (!cancelled) Alert.alert("Error", e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useFocusEffect(refresh);

  async function onCreate() {
    const trimmed = label.trim();
    if (!trimmed || !projectId) return;
    setBusy(true);
    try {
      await createOpening(newId("opening"), projectId, trimmed);
      setLabel("");
      setItems(await listOpenings(projectId));
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section title="Create opening" subtitle="Each opening can have multiple capture sessions.">
        <TextField
          label="Opening label"
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. Lobby Door - North"
          returnKeyType="done"
          onSubmitEditing={() => void onCreate()}
        />
        <Button onPress={() => void onCreate()} disabled={!canCreate}>
          Create opening
        </Button>
      </Section>

      <Section title="Openings" subtitle={busy ? "Loading…" : `${items.length} total`}>
        <FlatList
          data={items}
          keyExtractor={(it) => it.openingId}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                onPress={() => router.push(`/openings/${item.openingId}/capture`)}
                style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push(`/openings/${item.openingId}/compare`)}
                style={({ pressed }) => [styles.compareLink, pressed && styles.compareLinkPressed]}
                hitSlop={8}>
                <Text style={styles.compareLinkText}>Compare</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No openings yet.</Text>
            </View>
          }
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sep: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowMain: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compareLink: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  compareLinkPressed: {
    opacity: 0.7,
  },
  compareLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  rowPressed: {
    backgroundColor: "#F9FAFB",
  },
  rowLeft: {
    flex: 1,
    paddingRight: 12,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  rowMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  rowChevron: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  empty: {
    paddingVertical: 16,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13,
  },
});

