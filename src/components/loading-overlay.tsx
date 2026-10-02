import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Palette, Radius, Shadow, Spacing } from '@/constants/theme';

/**
 * Blocking overlay shown while an auth round-trip is in flight, so the tap
 * clearly registered and the app is visibly doing something.
 */
export function LoadingOverlay({ visible, message }: { visible: boolean; message: string }) {
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={Palette.accent} />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 38, 28, 0.45)',
  },
  card: {
    alignItems: 'center',
    gap: Spacing.four,
    minWidth: 200,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.six,
    borderRadius: Radius.card,
    backgroundColor: Palette.surfaceRaised,
    ...Shadow.lg,
  },
  message: {
    fontFamily: FontFamily.medium,
    fontSize: 17,
    color: Palette.ink,
    textAlign: 'center',
  },
});
