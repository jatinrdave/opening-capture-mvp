import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import { getOpening, updateOpening } from "@/src/db/openingsRepo";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";
import { TextField } from "@/src/ui/components/TextField";

export default function EditOpeningScreen() {
  const router = useRouter();
  const { openingId } = useLocalSearchParams<{ openingId: string }>();
  const [label, setLabel] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [openingType, setOpeningType] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!openingId) return;
    let cancelled = false;
    void (async () => {
      const o = await getOpening(openingId);
      if (!o || cancelled) return;
      setLabel(o.label);
      setLocationNotes(o.locationNotes ?? "");
      setOpeningType(o.openingType ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [openingId]);

  async function onSave() {
    if (!openingId) return;
    const L = label.trim();
    if (!L) {
      Alert.alert("Label required", "Opening label cannot be empty.");
      return;
    }
    setBusy(true);
    try {
      await updateOpening(openingId, {
        label: L,
        locationNotes,
        openingType,
      });
      Alert.alert("Saved", "Opening metadata updated.");
      router.back();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section title="Edit opening" subtitle="Label, location notes, and fenestration type are stamped on new captures.">
        <TextField label="Label" value={label} onChangeText={setLabel} placeholder="e.g. W-101" />
        <TextField
          label="Location notes"
          value={locationNotes}
          onChangeText={setLocationNotes}
          placeholder="Floor, elevation, grid reference…"
        />
        <TextField
          label="Opening type"
          value={openingType}
          onChangeText={setOpeningType}
          placeholder="window, door, curtain wall…"
        />
        <Text style={styles.hint}>Tolerance overrides remain under Limits on the openings list.</Text>
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
