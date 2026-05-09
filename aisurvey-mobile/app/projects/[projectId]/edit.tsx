import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import { getProject, updateProject } from "@/src/db/projectsRepo";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";
import { TextField } from "@/src/ui/components/TextField";

export default function EditProjectScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [name, setName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteNotes, setSiteNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    void (async () => {
      const p = await getProject(projectId);
      if (!p || cancelled) return;
      setName(p.name);
      setSiteAddress(p.siteAddress ?? "");
      setSiteNotes(p.siteNotes ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function onSave() {
    if (!projectId) return;
    const n = name.trim();
    if (!n) {
      Alert.alert("Name required", "Project name cannot be empty.");
      return;
    }
    setBusy(true);
    try {
      await updateProject(projectId, { name: n, siteAddress, siteNotes });
      Alert.alert("Saved", "Project metadata updated.");
      router.back();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section title="Edit project" subtitle="Site fields appear on PDF/CSV exports via session snapshots when captured.">
        <TextField label="Project name" value={name} onChangeText={setName} />
        <TextField label="Site address (optional)" value={siteAddress} onChangeText={setSiteAddress} placeholder="Street, city…" />
        <TextField label="Site notes (optional)" value={siteNotes} onChangeText={setSiteNotes} placeholder="Gate codes, contacts…" />
        <Text style={styles.hint}>Default tolerances are unchanged here; adjust via DB tooling if needed later.</Text>
      </Section>
      <Button onPress={() => void onSave()} disabled={busy}>
        Save
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, color: "#6B7280", marginTop: 4 },
});
