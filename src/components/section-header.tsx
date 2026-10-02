import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Brand, Spacing } from "@/constants/theme";

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      {actionLabel && (
        <Pressable onPress={onAction} hitSlop={8}>
          <ThemedText type="smallBold" style={styles.action}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
  },
  action: {
    color: Brand.purple,
  },
});
