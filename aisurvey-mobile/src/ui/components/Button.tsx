import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function Button({
  children,
  onPress,
  variant = "primary",
  disabled,
}: PropsWithChildren<{
  onPress: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}>) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <View style={styles.row}>
        <Text style={[styles.text, variant !== "secondary" ? styles.textOnDark : styles.textOnLight]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: "#0B57D0",
  },
  secondary: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  danger: {
    backgroundColor: "#B42318",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
  textOnDark: {
    color: "#FFFFFF",
  },
  textOnLight: {
    color: "#111827",
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.45,
  },
});

