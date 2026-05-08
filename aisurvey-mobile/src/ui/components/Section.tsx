import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

export function Section({
  title,
  subtitle,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
}>) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  header: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  body: {
    padding: 14,
    gap: 10,
  },
});

