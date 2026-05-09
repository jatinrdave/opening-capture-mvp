import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { getOpening, updateOpeningToleranceOverrides } from "@/src/db/openingsRepo";
import { getProject } from "@/src/db/projectsRepo";
import { resolveToleranceConfig } from "@/src/domain/resolveToleranceConfig";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";
import { TextField } from "@/src/ui/components/TextField";

function parseOverrideMm(raw: string): number | null | "invalid" {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return "invalid";
  return n;
}

export default function OpeningToleranceScreen() {
  const router = useRouter();
  const { openingId } = useLocalSearchParams<{ openingId: string }>();
  const [openingLabel, setOpeningLabel] = useState("");
  const [fields, setFields] = useState({
    overrideMaxOutOfSquareMm: "",
    overrideMaxWidthRangeMm: "",
    overrideMaxHeightRangeMm: "",
  });
  const [effectiveSummary, setEffectiveSummary] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!openingId) return;
    let cancelled = false;
    void (async () => {
      try {
        const opening = await getOpening(openingId);
        if (!opening || cancelled) {
          if (!opening) Alert.alert("Not found", "Opening could not be loaded.");
          return;
        }
        const project = await getProject(opening.projectId);
        if (!project || cancelled) return;
        setOpeningLabel(opening.label);
        setFields({
          overrideMaxOutOfSquareMm:
            opening.overrideMaxOutOfSquareMm != null ? String(opening.overrideMaxOutOfSquareMm) : "",
          overrideMaxWidthRangeMm:
            opening.overrideMaxWidthRangeMm != null ? String(opening.overrideMaxWidthRangeMm) : "",
          overrideMaxHeightRangeMm:
            opening.overrideMaxHeightRangeMm != null ? String(opening.overrideMaxHeightRangeMm) : "",
        });
        const eff = resolveToleranceConfig(project, opening);
        setEffectiveSummary(
          `Effective at capture: out-of-square ≤ ${eff.maxOutOfSquareMm} mm, width range ≤ ${eff.maxWidthRangeMm} mm, height range ≤ ${eff.maxHeightRangeMm} mm (warn ×${eff.warnBandMultiplier}).`
        );
      } catch (e) {
        Alert.alert("Error", e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openingId]);

  const dirtyHint = useMemo(() => "Leave a field blank to inherit the project default for that limit.", []);

  async function onSave() {
    if (!openingId) return;
    const oSq = parseOverrideMm(fields.overrideMaxOutOfSquareMm);
    const wR = parseOverrideMm(fields.overrideMaxWidthRangeMm);
    const hR = parseOverrideMm(fields.overrideMaxHeightRangeMm);
    if (oSq === "invalid" || wR === "invalid" || hR === "invalid") {
      Alert.alert("Invalid", "Overrides must be positive numbers or empty.");
      return;
    }
    setBusy(true);
    try {
      await updateOpeningToleranceOverrides(openingId, {
        overrideMaxOutOfSquareMm: oSq,
        overrideMaxWidthRangeMm: wR,
        overrideMaxHeightRangeMm: hR,
      });
      Alert.alert("Saved", "Tolerance overrides stored on this opening.");
      router.back();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section title={`Tolerance overrides`} subtitle={openingLabel ? openingLabel : "Opening"}>
        <Text style={styles.hint}>{dirtyHint}</Text>
        <Text style={styles.effective}>{effectiveSummary}</Text>
        <Text style={styles.note}>Warn band multiplier stays at the project level — capture resolves effective PASS/WARN/FAIL from both.</Text>
        <TextField
          label="Max out-of-square override (mm)"
          value={fields.overrideMaxOutOfSquareMm}
          onChangeText={(t) => setFields((p) => ({ ...p, overrideMaxOutOfSquareMm: t }))}
          keyboardType="numeric"
          placeholder="blank = project default"
        />
        <TextField
          label="Max width range override (mm)"
          value={fields.overrideMaxWidthRangeMm}
          onChangeText={(t) => setFields((p) => ({ ...p, overrideMaxWidthRangeMm: t }))}
          keyboardType="numeric"
          placeholder="blank = project default"
        />
        <TextField
          label="Max height range override (mm)"
          value={fields.overrideMaxHeightRangeMm}
          onChangeText={(t) => setFields((p) => ({ ...p, overrideMaxHeightRangeMm: t }))}
          keyboardType="numeric"
          placeholder="blank = project default"
        />
      </Section>

      <Button onPress={() => void onSave()} disabled={busy}>
        Save overrides
      </Button>
      <View style={{ height: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 8,
  },
  effective: {
    fontSize: 12,
    color: "#111827",
    marginBottom: 10,
    lineHeight: 18,
  },
  note: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 17,
  },
});
