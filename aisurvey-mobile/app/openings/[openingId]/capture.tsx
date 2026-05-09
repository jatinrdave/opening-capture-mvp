import * as Device from "expo-device";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { getOpening } from "@/src/db/openingsRepo";
import { getProject } from "@/src/db/projectsRepo";
import { insertSession } from "@/src/db/sessionsRepo";
import { createCaptureSession } from "@/src/domain/sessionFactory";
import type { LocationSnapshot, ProjectSnapshot, ToleranceConfig } from "@/src/domain/models";
import { REQUIRED_PHOTO_KINDS, type RequiredPhotoKind, type RequiredPhotos } from "@/src/domain/models";
import { parseCaptureSessionDraft } from "@/src/domain/validation";
import { resolveToleranceConfig } from "@/src/domain/resolveToleranceConfig";
import { loadOperatorUserId } from "@/src/settings/operatorStore";
import { Button } from "@/src/ui/components/Button";
import { PhotoCaptureModal } from "@/src/ui/components/PhotoCaptureModal";
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

async function captureLocationSnapshot(): Promise<LocationSnapshot> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) {
    return { status: "unavailable", reason: "Location permission denied" };
  }
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      status: "granted",
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracyM: pos.coords.accuracy ?? null,
    };
  } catch {
    return { status: "unavailable", reason: "Could not read GPS fix (offline or sensors unavailable)" };
  }
}

function deviceSnapshot() {
  return {
    manufacturer: Device.manufacturer,
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    appVersion:
      Constants.expoConfig?.version ??
      (typeof Constants.nativeApplicationVersion === "string" ? Constants.nativeApplicationVersion : null) ??
      "unknown",
  };
}

export default function CaptureScreen() {
  const router = useRouter();
  const { openingId } = useLocalSearchParams<{ openingId: string }>();

  const startedAtRef = useRef<string>(new Date().toISOString());

  const [requiredPhotos, setRequiredPhotos] = useState<RequiredPhotos>(() => emptyRequiredPhotos());
  const [cameraKind, setCameraKind] = useState<RequiredPhotoKind | null>(null);
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
  const [measurementNotes, setMeasurementNotes] = useState("");
  const [plumbNotes, setPlumbNotes] = useState("");
  const [levelNotes, setLevelNotes] = useState("");
  const [plumbAnnotationUri, setPlumbAnnotationUri] = useState<string | null>(null);
  const [levelAnnotationUri, setLevelAnnotationUri] = useState<string | null>(null);
  const [annotationCamera, setAnnotationCamera] = useState<"plumb" | "level" | null>(null);

  const [operatorUserId, setOperatorUserId] = useState("");
  const [optionalDepthUri, setOptionalDepthUri] = useState<string | null>(null);
  const [optionalVideoUri, setOptionalVideoUri] = useState<string | null>(null);

  const [resolvedTolerance, setResolvedTolerance] = useState<ToleranceConfig | null>(null);
  const [tolerance, setTolerance] = useState({
    maxOutOfSquareMm: "",
    maxWidthRangeMm: "",
    maxHeightRangeMm: "",
  });

  const [openingSnapshot, setOpeningSnapshot] = useState<{
    openingId: string;
    projectId: string;
    label: string;
    locationNotes: string;
    openingType: string;
  } | null>(null);
  const [projectSnapshot, setProjectSnapshot] = useState<ProjectSnapshot | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    startedAtRef.current = new Date().toISOString();
  }, [openingId]);

  useEffect(() => {
    void loadOperatorUserId().then((id) => {
      if (id) setOperatorUserId(id);
    });
  }, []);

  useEffect(() => {
    if (!openingId) return;
    let cancelled = false;
    void (async () => {
      try {
        const opening = await getOpening(openingId);
        if (!opening) {
          Alert.alert("Not found", "Opening could not be loaded.");
          return;
        }
        const project = await getProject(opening.projectId);
        if (!project || cancelled) return;

        const tol = resolveToleranceConfig(project, opening);
        setResolvedTolerance(tol);
        setTolerance({
          maxOutOfSquareMm: String(tol.maxOutOfSquareMm),
          maxWidthRangeMm: String(tol.maxWidthRangeMm),
          maxHeightRangeMm: String(tol.maxHeightRangeMm),
        });
        setOpeningSnapshot({
          openingId: opening.openingId,
          projectId: opening.projectId,
          label: opening.label,
          locationNotes: opening.locationNotes,
          openingType: opening.openingType,
        });
        setProjectSnapshot({
          projectId: project.projectId,
          name: project.name,
          siteAddress: project.siteAddress?.trim() ? project.siteAddress : null,
          siteNotes: project.siteNotes?.trim() ? project.siteNotes : null,
        });
      } catch (e) {
        Alert.alert("Error", e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openingId]);

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

  async function pickAnnotation(which: "plumb" | "level") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (res.canceled) return;
    const uri = res.assets[0]?.uri ?? null;
    if (which === "plumb") setPlumbAnnotationUri(uri);
    else setLevelAnnotationUri(uri);
  }

  async function pickOptionalVideo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Media library permission is required.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.8,
    });
    if (res.canceled) return;
    const uri = res.assets[0]?.uri;
    setOptionalVideoUri(uri ?? null);
  }

  async function pickOptionalDepthImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (res.canceled) return;
    setOptionalDepthUri(res.assets[0]?.uri ?? null);
  }

  function parseMm(str: string): number | null {
    const trimmed = str.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  async function onSubmit() {
    if (!openingId || !openingSnapshot || !projectSnapshot || !resolvedTolerance) return;
    const op = operatorUserId.trim();
    if (!op) {
      setSubmitError("Operator identity is required (use email, employee id, or initials).");
      return;
    }

    const annotationRefs = [plumbAnnotationUri, levelAnnotationUri].filter((u): u is string => !!u);

    setSubmitError(null);
    setBusy(true);
    try {
      const tolCfg: ToleranceConfig = {
        maxOutOfSquareMm: parseMm(tolerance.maxOutOfSquareMm) ?? NaN,
        maxWidthRangeMm: parseMm(tolerance.maxWidthRangeMm) ?? NaN,
        maxHeightRangeMm: parseMm(tolerance.maxHeightRangeMm) ?? NaN,
        warnBandMultiplier: resolvedTolerance.warnBandMultiplier,
      };

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
          notes: measurementNotes.trim() ? measurementNotes.trim() : undefined,
          annotationRefs: annotationRefs.length ? annotationRefs : undefined,
        },
        toleranceConfig: tolCfg,
      };

      const parsed = parseCaptureSessionDraft(draft);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        setSubmitError(issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid draft");
        return;
      }

      const location = await captureLocationSnapshot();
      const endedAt = new Date().toISOString();

      const session = createCaptureSession({
        draft: parsed.data,
        startedAt: startedAtRef.current,
        endedAt,
        operatorUserId: op,
        offlineCaptured: true,
        device: deviceSnapshot(),
        location,
        projectSnapshot,
        openingSnapshot: {
          openingId: openingSnapshot.openingId,
          label: openingSnapshot.label,
          locationNotes: openingSnapshot.locationNotes || null,
          openingType: openingSnapshot.openingType || null,
        },
        manualPlumbLevel:
          plumbNotes.trim() || levelNotes.trim()
            ? { plumbAssessment: plumbNotes.trim() || null, levelAssessment: levelNotes.trim() || null }
            : null,
        mediaArtifacts:
          optionalDepthUri || optionalVideoUri
            ? { optionalDepthArtifactUri: optionalDepthUri, optionalVideoUri: optionalVideoUri }
            : null,
      });

      await insertSession(session);
      router.replace({ pathname: "/sessions/[sessionId]/review", params: { sessionId: session.sessionId } });
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const warnMultiplierLabel = resolvedTolerance ? String(resolvedTolerance.warnBandMultiplier) : "—";

  return (
    <Screen>
      <PhotoCaptureModal
        visible={cameraKind !== null}
        title={cameraKind ? `Camera: ${cameraKind}` : ""}
        onClose={() => setCameraKind(null)}
        onCaptured={(uri) => {
          if (cameraKind) setRequiredPhotos((p) => ({ ...p, [cameraKind]: uri }));
        }}
      />
      <PhotoCaptureModal
        visible={annotationCamera !== null}
        title={annotationCamera === "plumb" ? "Plumb annotation photo" : "Level annotation photo"}
        onClose={() => setAnnotationCamera(null)}
        onCaptured={(uri) => {
          if (annotationCamera === "plumb") setPlumbAnnotationUri(uri);
          if (annotationCamera === "level") setLevelAnnotationUri(uri);
        }}
      />

      <Section title="Operator" subtitle="Who performed this capture? Default comes from Operator profile (device-local).">
        <TextField label="Operator id / name" value={operatorUserId} onChangeText={setOperatorUserId} placeholder="e.g. jdoe / Crew lead A" />
      </Section>

      <Section
        title="Required photos"
        subtitle={`Camera-first (recommended) or gallery. ${missingPhotos.length ? `${missingPhotos.length} missing` : "All required photos captured"}`}>
        {REQUIRED_PHOTO_KINDS.map((k) => {
          const has = !!requiredPhotos[k];
          return (
            <View key={k} style={styles.photoRow}>
              <View style={styles.photoRowLeft}>
                <Text style={styles.photoKind}>{k}</Text>
                <Text style={styles.photoMeta}>{has ? "Captured" : "Missing"}</Text>
              </View>
              <View style={styles.photoActions}>
                <Button onPress={() => setCameraKind(k)} variant={has ? "secondary" : "primary"} disabled={busy}>
                  Camera
                </Button>
                <Button onPress={() => void pickPhoto(k)} variant="secondary" disabled={busy}>
                  Gallery
                </Button>
              </View>
            </View>
          );
        })}
      </Section>

      <Section title="Optional media" subtitle="Depth/video artifacts are optional; tolerance logic never depends on them.">
        <Text style={styles.smallMeta}>Depth artifact: {optionalDepthUri ? "attached" : "none"}</Text>
        <Button variant="secondary" onPress={() => void pickOptionalDepthImage()} disabled={busy}>
          Attach depth scan image (optional)
        </Button>
        <Text style={[styles.smallMeta, { marginTop: 8 }]}>Video: {optionalVideoUri ? "attached" : "none"}</Text>
        <Button variant="secondary" onPress={() => void pickOptionalVideo()} disabled={busy}>
          Attach optional video (optional)
        </Button>
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
        <TextField label="Measurement notes" value={measurementNotes} onChangeText={setMeasurementNotes} placeholder="Site notes, shim instructions…" />
      </Section>

      <Section
        title="Manual plumb / level (MVP)"
        subtitle="Qualitative notes plus optional annotated photos (stored as measurement annotation refs).">
        <TextField label="Plumb assessment" value={plumbNotes} onChangeText={setPlumbNotes} placeholder="Looks plumb / slight twist …" />
        <Text style={styles.smallMeta}>Plumb photo: {plumbAnnotationUri ? "attached" : "none"}</Text>
        <View style={styles.photoActions}>
          <Button variant="secondary" onPress={() => setAnnotationCamera("plumb")} disabled={busy}>
            Camera
          </Button>
          <Button variant="secondary" onPress={() => void pickAnnotation("plumb")} disabled={busy}>
            Gallery
          </Button>
        </View>
        <TextField label="Level assessment" value={levelNotes} onChangeText={setLevelNotes} placeholder="Header level / sill slope …" />
        <Text style={styles.smallMeta}>Level photo: {levelAnnotationUri ? "attached" : "none"}</Text>
        <View style={styles.photoActions}>
          <Button variant="secondary" onPress={() => setAnnotationCamera("level")} disabled={busy}>
            Camera
          </Button>
          <Button variant="secondary" onPress={() => void pickAnnotation("level")} disabled={busy}>
            Gallery
          </Button>
        </View>
      </Section>

      <Section
        title="Tolerance config"
        subtitle={`Opened from project defaults + opening overrides (warn band multiplier fixed from project: ${warnMultiplierLabel}×). Edit numeric limits below for this session only.`}>
        <TextField
          label="Max out-of-square (mm)"
          value={tolerance.maxOutOfSquareMm}
          onChangeText={(t) => setTolerance((p) => ({ ...p, maxOutOfSquareMm: t }))}
          keyboardType="numeric"
          editable={!!resolvedTolerance}
        />
        <TextField
          label="Max width range (mm)"
          value={tolerance.maxWidthRangeMm}
          onChangeText={(t) => setTolerance((p) => ({ ...p, maxWidthRangeMm: t }))}
          keyboardType="numeric"
          editable={!!resolvedTolerance}
        />
        <TextField
          label="Max height range (mm)"
          value={tolerance.maxHeightRangeMm}
          onChangeText={(t) => setTolerance((p) => ({ ...p, maxHeightRangeMm: t }))}
          keyboardType="numeric"
          editable={!!resolvedTolerance}
        />
      </Section>

      {submitError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      ) : null}

      <Button onPress={() => void onSubmit()} disabled={busy || !resolvedTolerance}>
        Create session
      </Button>
      <Text style={styles.footerHint}>
        GPS is requested at submit time when permitted; otherwise the session records why location is unavailable.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  photoActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  photoRowLeft: {
    flex: 1,
    gap: 2,
    minWidth: 120,
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
  smallMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
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
