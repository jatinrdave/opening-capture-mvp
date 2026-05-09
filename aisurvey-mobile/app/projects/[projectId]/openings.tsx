import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { createOpening, listOpenings, type OpeningListRow } from "@/src/db/openingsRepo";
import { newId } from "@/src/domain/ids";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";
import { TextField } from "@/src/ui/components/TextField";

function openingMatchesSearch(row: OpeningListRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [row.label, row.locationNotes, row.openingType].join(" ").toLowerCase();
  return hay.includes(needle);
}

function statusBadgeStyle(code: string | null) {
  switch (code) {
    case "PASS":
      return styles.badgePass;
    case "WARN":
      return styles.badgeWarn;
    case "FAIL":
      return styles.badgeFail;
    default:
      return styles.badgeNone;
  }
}

export default function OpeningsScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [label, setLabel] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [openingType, setOpeningType] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<OpeningListRow[]>([]);
  const [busy, setBusy] = useState(false);

  const canCreate = useMemo(() => label.trim().length > 0 && !busy, [label, busy]);

  const visibleItems = useMemo(() => items.filter((row) => openingMatchesSearch(row, search)), [items, search]);

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
      await createOpening(newId("opening"), projectId, trimmed, {
        locationNotes,
        openingType,
      });
      setLabel("");
      setLocationNotes("");
      setOpeningType("");
      setItems(await listOpenings(projectId));
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section title="Create opening" subtitle="Label plus optional location metadata (MVP spec).">
        <TextField
          label="Opening label"
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. Lobby Door - North"
          returnKeyType="done"
        />
        <TextField
          label="Location notes (optional)"
          value={locationNotes}
          onChangeText={setLocationNotes}
          placeholder="Floor, grid, elevation…"
        />
        <TextField
          label="Opening type (optional)"
          value={openingType}
          onChangeText={setOpeningType}
          placeholder="window, door, …"
        />
        <Button onPress={() => void onCreate()} disabled={!canCreate}>
          Create opening
        </Button>
      </Section>

      <Section
        title="Openings"
        subtitle={
          busy
            ? "Loading…"
            : `${visibleItems.length} shown${search.trim() ? ` (filtered)` : ""} · ${items.length} total`
        }>
        <TextField label="Search" value={search} onChangeText={setSearch} placeholder="Filter by label, notes, type" />
        <Text style={styles.statusLegend}>
          Status = overall PASS/WARN/FAIL from the latest session, or none if no scans yet.
        </Text>
        <FlatList
          data={visibleItems}
          keyExtractor={(it) => it.openingId}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/openings/[openingId]/index", params: { openingId: item.openingId } })
                }
                style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}>
                <View style={styles.rowLeft}>
                  <View style={styles.titleRow}>
                    <Text style={styles.rowTitle}>{item.label}</Text>
                    <Text style={[styles.badge, statusBadgeStyle(item.latestSessionStatus)]}>
                      {item.latestSessionStatus ?? "none"}
                    </Text>
                  </View>
                  <Text style={styles.rowMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
                  {(item.locationNotes?.trim() || item.openingType?.trim()) && (
                    <Text style={styles.rowSub} numberOfLines={2}>
                      {[item.openingType?.trim(), item.locationNotes?.trim()].filter(Boolean).join(" · ")}
                    </Text>
                  )}
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/openings/[openingId]/capture", params: { openingId: item.openingId } })
                }
                style={({ pressed }) => [styles.sideLink, pressed && styles.sideLinkPressed]}
                hitSlop={8}>
                <Text style={styles.sideLinkText}>Capture</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/openings/[openingId]/tolerance", params: { openingId: item.openingId } })
                }
                style={({ pressed }) => [styles.sideLink, pressed && styles.sideLinkPressed]}
                hitSlop={8}>
                <Text style={styles.sideLinkText}>Limits</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/openings/[openingId]/compare", params: { openingId: item.openingId } })
                }
                style={({ pressed }) => [styles.sideLink, pressed && styles.sideLinkPressed]}
                hitSlop={8}>
                <Text style={styles.sideLinkText}>Compare</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{items.length ? "No matches." : "No openings yet."}</Text>
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
  sideLink: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  sideLinkPressed: {
    opacity: 0.7,
  },
  sideLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  rowPressed: {
    backgroundColor: "#F9FAFB",
  },
  rowLeft: {
    flex: 1,
    paddingRight: 8,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  badge: {
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
    textTransform: "uppercase",
  },
  badgePass: { backgroundColor: "#DCFCE7", color: "#166534" },
  badgeWarn: { backgroundColor: "#FEF3C7", color: "#B45309" },
  badgeFail: { backgroundColor: "#FEE2E2", color: "#B42318" },
  badgeNone: { backgroundColor: "#F3F4F6", color: "#6B7280" },
  rowMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  rowSub: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
  },
  statusLegend: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 8,
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
