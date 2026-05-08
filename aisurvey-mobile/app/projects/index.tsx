import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { createProject, listProjects } from "@/src/db/projectsRepo";
import { newId } from "@/src/domain/ids";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";
import { TextField } from "@/src/ui/components/TextField";

type ProjectRow = { projectId: string; name: string; createdAt: string };

export default function ProjectsScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [busy, setBusy] = useState(false);

  const canCreate = useMemo(() => name.trim().length > 0 && !busy, [name, busy]);

  const refresh = useCallback(() => {
    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
        const rows = await listProjects();
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
  }, []);

  useFocusEffect(refresh);

  async function onCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await createProject(newId("project"), trimmed);
      setName("");
      setItems(await listProjects());
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section title="Create project" subtitle="Projects group your openings/surveys.">
        <TextField
          label="Project name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Acme HQ - Phase 1"
          returnKeyType="done"
          onSubmitEditing={() => void onCreate()}
        />
        <Button onPress={() => void onCreate()} disabled={!canCreate}>
          Create project
        </Button>
      </Section>

      <Section title="Projects" subtitle={busy ? "Loading…" : `${items.length} total`}>
        <FlatList
          data={items}
          keyExtractor={(it) => it.projectId}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/projects/${item.projectId}/openings`)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              <Text style={styles.rowChevron}>›</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No projects yet.</Text>
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
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

