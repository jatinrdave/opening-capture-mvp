import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { insertSession } from "@/src/db/sessionsRepo";
import { createCaptureSession } from "@/src/domain/sessionFactory";
import { REQUIRED_PHOTO_KINDS, type RequiredPhotoKind, type RequiredPhotos } from "@/src/domain/models";
import { parseCaptureSessionDraft } from "@/src/domain/validation";
import { Button } from "@/src/ui/components/Button";
import { Screen } from "@/src/ui/components/Screen";
import { Section } from "@/src/ui/components/Section";
import { TextField } from "@/src/ui/components/TextField";

function emptyRequiredPhotos(): RequiredPhotos {
  return {
    overview: null,
    leftJamb: null,
    rightJamb: null,
    head: null,
    sill: null,
  };
}

const measurementFields = [
  ["widthTop", "Width (top)"],
  ["widthMid", "Width (mid)"],
  ["widthBottom", "Width (bottom)"],
  ["heightLeft", "Height (left)"],
  ["heightCenter", "Height (center)"],
  ["heightRight", "Height (right)"],
  ["depthLeft", "Depth (left) (optional)"],
  ["depthRight", "Depth (right) (optional)"],
] as const;

type MeasurementKey = (typeof measurementFields)[number][0];

export default function CaptureScreen() {
  const router = useRouter();
  const { openingId } = useLocalSearchParams<{ openingId: string }>();

  const [requiredPhotos, setRequiredPhotos] = useState<RequiredPhotos>(() => emptyRequiredPhotos());
  const [measurements, setMeasurements] = useState<Record<MeasurementKey, string>>({
    widthTop: "",
    widthMid: "",
    widthBottom: "",
    heightLeft: "",
    heightCenter: "",
    heightRight: "",
    depthLeft: "",
    depthRight: "",
  });
  const [tolerance, setTolerance] = useState({
    maxOutOfSquareMm: "3",
    maxWidthRangeMm: "5",
    maxHeightRangeMm: "5",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const missingPhotos = useMemo(() => {
    const missing: RequiredPhotoKind[] = [];
    for (const k of REQUIRED_PHOTO_KINDS) {
      if (!requiredPhotos[k]) missing.push(k);
    }
    return missing;
  }, [requiredPhotos]);

  async function pickPhoto(kind: RequiredPhotoKind) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Media library permission is required to pick photos.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });

    if (res.canceled) return;
    const uri = res.assets[0]?.uri;
    if (!uri) return;

    setRequiredPhotos((prev) => ({ ...prev, [kind]: uri }));
  }

  function parseMm(str: string): number | null {
    const trimmed = str.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  async function onSubmit() {
    if (!openingId) return;
    setSubmitError(null);
    setBusy(true);
    try {
      const draft = {
        openingId,
        requiredPhotos,
        measurements: {
          widthTop: parseMm(measurements.widthTop) ?? NaN,
          widthMid: parseMm(measurements.widthMid) ?? NaN,
          widthBottom: parseMm(measurements.widthBottom) ?? NaN,
          heightLeft: parseMm(measurements.heightLeft) ?? NaN,
          heightCenter: parseMm(measurements.heightCenter) ?? NaN,
          heightRight: parseMm(measurements.heightRight) ?? NaN,
          depthLeft: parseMm(measurements.depthLeft),
          depthRight: parseMm(measurements.depthRight),
        },
        toleranceConfig: {
          maxOutOfSquareMm: parseMm(tolerance.maxOutOfSquareMm) ?? NaN,
          maxWidthRangeMm: parseMm(tolerance.maxWidthRangeMm) ?? NaN,
          maxHeightRangeMm: parseMm(tolerance.maxHeightRangeMm) ?? NaN,
        },
      };

      const parsed = parseCaptureSessionDraft(draft);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        setSubmitError(issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid draft");
        return;
      }

      const session = createCaptureSession(parsed.data);
      await insertSession(session);
      router.replace(`/sessions/${session.sessionId}/review`);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Section
        title="Required photos"
        subtitle={missingPhotos.length ? `${missingPhotos.length} missing` : "All required photos captured"}>
        {REQUIRED_PHOTO_KINDS.map((k) => {
          const has = !!requiredPhotos[k];
          return (
            <View key={k} style={styles.photoRow}>
              <View style={styles.photoRowLeft}>
                <Text style={styles.photoKind}>{k}</Text>
                <Text style={styles.photoMeta}>{has ? "Selected" : "Missing"}</Text>
              </View>
              <Button onPress={() => void pickPhoto(k)} variant={has ? "secondary" : "primary"} disabled={busy}>
                {has ? "Replace" : "Pick"}
              </Button>
            </View>
          );
        })}
      </Section>

      <Section title="Measurements" subtitle="Enter millimeters (mm).">
        {measurementFields.map(([key, label]) => (
          <TextField
            key={key}
            label={label}
            value={measurements[key]}
            onChangeText={(t) => setMeasurements((p) => ({ ...p, [key]: t }))}
            keyboardType="numeric"
            placeholder={key.startsWith("depth") ? "optional" : "required"}
          />
        ))}
      </Section>

      <Section title="Tolerance config" subtitle="Defaults are MVP-sensible; tune as needed.">
        <TextField
          label="Max out-of-square (mm)"
          value={tolerance.maxOutOfSquareMm}
          onChangeText={(t) => setTolerance((p) => ({ ...p, maxOutOfSquareMm: t }))}
          keyboardType="numeric"
        />
        <TextField
          label="Max width range (mm)"
          value={tolerance.maxWidthRangeMm}
          onChangeText={(t) => setTolerance((p) => ({ ...p, maxWidthRangeMm: t }))}
          keyboardType="numeric"
        />
        <TextField
          label="Max height range (mm)"
          value={tolerance.maxHeightRangeMm}
          onChangeText={(t) => setTolerance((p) => ({ ...p, maxHeightRangeMm: t }))}
          keyboardType="numeric"
        />
      </Section>

      {submitError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      ) : null}

      <Button onPress={() => void onSubmit()} disabled={busy}>
        Create session
      </Button>
      <Text style={styles.footerHint}>This creates a canonical session after validation and saves it locally.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  photoRowLeft: {
    flex: 1,
    gap: 2,
  },
  photoKind: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    textTransform: "capitalize",
  },
  photoMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  errorBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: "#7F1D1D",
    fontSize: 13,
  },
  footerHint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
});

