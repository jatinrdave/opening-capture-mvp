import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

export function Screen({
  children,
  padded = true,
}: PropsWithChildren<{
  padded?: boolean;
}>) {
  return (
    <ScrollView contentContainerStyle={[styles.container, padded && styles.padded]}>
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  padded: {
    padding: 16,
  },
  inner: {
    gap: 12,
  },
});

