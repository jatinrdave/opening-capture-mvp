import { useFocusEffect, useRouter, type Href } from "expo-router";
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
  const [siteAddress, setSiteAddress] = useState("");
  const [siteNotes, setSiteNotes] = useState("");
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
      await createProject(newId("project"), trimmed, {
        siteAddress,
        siteNotes,
      });
      setName("");
      setSiteAddress("");
      setSiteNotes("");
      setItems(await listProjects());
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section title="Create project" subtitle="Projects group openings. Optional site metadata is copied onto capture exports.">
        <TextField
          label="Project name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Acme HQ - Phase 1"
          returnKeyType="done"
          onSubmitEditing={() => void onCreate()}
        />
        <TextField
          label="Site address (optional)"
          value={siteAddress}
          onChangeText={setSiteAddress}
          placeholder="Street, city, region…"
        />
        <TextField label="Site notes (optional)" value={siteNotes} onChangeText={setSiteNotes} placeholder="Contacts, gate codes…" />
        <Button onPress={() => void onCreate()} disabled={!canCreate}>
          Create project
        </Button>
        <View style={styles.rowBtns}>
          <Button variant="secondary" onPress={() => router.push("/sync" as Href)}>
            Sync queue
          </Button>
          <Button variant="secondary" onPress={() => router.push("/settings/operator" as Href)}>
            Operator profile
          </Button>
        </View>
      </Section>

      <Section title="Projects" subtitle={busy ? "Loading…" : `${items.length} total`}>
        <FlatList
          data={items}
          keyExtractor={(it) => it.projectId}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <View style={styles.projRow}>
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/projects/[projectId]/openings", params: { projectId: item.projectId } })
                }
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/projects/[projectId]/edit", params: { projectId: item.projectId } })
                }
                style={({ pressed }) => [styles.editLink, pressed && styles.editLinkPressed]}
                hitSlop={8}>
                <Text style={styles.editLinkText}>Edit</Text>
              </Pressable>
            </View>
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
  rowBtns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sep: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  projRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  row: {
    flex: 1,
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
  editLink: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  editLinkPressed: { opacity: 0.7 },
  editLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  empty: {
    paddingVertical: 16,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 13,
  },
});
