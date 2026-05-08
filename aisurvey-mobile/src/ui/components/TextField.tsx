import type { ComponentProps } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

export function TextField({
  label,
  hint,
  error,
  ...props
}: ComponentProps<typeof TextInput> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[styles.input, !!error && styles.inputError, props.style]}
        placeholderTextColor="#9CA3AF"
      />
      {!!error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  input: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    fontSize: 16,
    color: "#111827",
  },
  inputError: {
    borderColor: "#F04438",
  },
  hint: {
    fontSize: 12,
    color: "#6B7280",
  },
  error: {
    fontSize: 12,
    color: "#B42318",
  },
});

