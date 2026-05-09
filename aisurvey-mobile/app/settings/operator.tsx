import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import { loadOperatorUserId, saveOperatorUserId } from "@/src/settings/operatorStore";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";
import { TextField } from "@/src/ui/components/TextField";

export default function OperatorSettingsScreen() {
  const router = useRouter();
  const [operatorUserId, setOperatorUserId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadOperatorUserId().then(setOperatorUserId);
  }, []);

  async function onSave() {
    const v = operatorUserId.trim();
    if (!v) {
      Alert.alert("Required", "Enter an operator id or name to save.");
      return;
    }
    setBusy(true);
    try {
      await saveOperatorUserId(v);
      Alert.alert("Saved", "Default operator is stored only on this device (not cloud SSO).");
      router.back();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section
        title="Default operator"
        subtitle="MVP uses device-local identity as a stand-in for signed-in users. Sessions still record whatever operator you enter on each capture; this value pre-fills that field.">
        <TextField
          label="Operator id / name"
          value={operatorUserId}
          onChangeText={setOperatorUserId}
          placeholder="Employee id, email, or initials"
        />
        <Text style={styles.note}>
          Full authentication and org-scoped accounts belong to the platform phase (see docs/prd-rollout/platform-foundation.md).
        </Text>
      </Section>
      <Button onPress={() => void onSave()} disabled={busy}>
        Save default
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 12, color: "#6B7280", lineHeight: 17 },
});
