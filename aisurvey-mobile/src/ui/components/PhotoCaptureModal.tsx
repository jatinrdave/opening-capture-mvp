import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";

import { Button } from "@/src/ui/components/Button";

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Called with a file URI from the camera capture. */
  onCaptured: (uri: string) => void;
};

export function PhotoCaptureModal({ visible, title, onClose, onCaptured }: Props) {
  const camRef = useRef<CameraView>(null);
  const [perm, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    if (!visible) setCameraReady(false);
  }, [visible]);

  async function takePicture() {
    const cam = camRef.current;
    if (!cam || !cameraReady) return;
    setBusy(true);
    try {
      const photo = await cam.takePictureAsync({ quality: 0.85, skipProcessing: false });
      if (photo?.uri) {
        onCaptured(photo.uri);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        {!perm?.granted ? (
          <View style={styles.center}>
            <Text style={styles.hint}>Camera access is needed for capture-first workflow.</Text>
            <Button onPress={() => void requestPermission()}>Grant camera permission</Button>
            <Button variant="secondary" onPress={onClose}>
              Cancel
            </Button>
          </View>
        ) : (
          <>
            <CameraView
              ref={camRef}
              style={styles.camera}
              facing="back"
              mode="picture"
              onCameraReady={() => setCameraReady(true)}
            />
            <View style={styles.actions}>
              <Button variant="secondary" onPress={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button onPress={() => void takePicture()} disabled={busy || !cameraReady}>
                Capture
              </Button>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#000", paddingTop: 48 },
  title: { color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  camera: { flex: 1, borderRadius: 12, overflow: "hidden", marginHorizontal: 12 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  center: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  hint: { color: "#e5e7eb", fontSize: 14, textAlign: "center", marginBottom: 8 },
});
