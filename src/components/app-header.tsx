import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoutIcon, ReceiptIcon, SparkleIcon, TweaksIcon } from '@/components/tab-icons';
import { Label, Segmented } from '@/components/ui';
import { FontFamily, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

type Density = 'tight' | 'normal' | 'wide';
type Motion = 'full' | 'reduced';

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [density, setDensity] = useState<Density>('normal');
  const [motion, setMotion] = useState<Motion>('full');

  return (
    <>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.brand}>
          <ReceiptIcon size={26} color={Palette.accent} />
          <Text style={styles.wordmark}>owetell</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => setTweaksOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.actionDark, pressed && styles.pressed]}
          >
            <TweaksIcon size={20} color={Palette.page} />
          </Pressable>
          <Pressable
            onPress={signOut}
            hitSlop={8}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <LogoutIcon size={20} color={Palette.ink} />
          </Pressable>
        </View>
      </View>

      <Modal transparent visible={tweaksOpen} animationType="fade" onRequestClose={() => setTweaksOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setTweaksOpen(false)}>
          <Pressable
            style={[styles.popover, { top: insets.top + 60 }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.popoverTitle}>
              <SparkleIcon size={20} color={Palette.accent} />
              <Label>Tweaks</Label>
            </View>

            <Text style={styles.field}>density</Text>
            <Segmented<Density>
              variant="ink"
              value={density}
              onChange={setDensity}
              style={styles.control}
              options={[
                { value: 'tight', label: 'tight' },
                { value: 'normal', label: 'normal' },
                { value: 'wide', label: 'wide' },
              ]}
            />

            <Text style={styles.field}>motion</Text>
            <Segmented<Motion>
              variant="ink"
              value={motion}
              onChange={setMotion}
              style={styles.control}
              options={[
                { value: 'full', label: 'full' },
                { value: 'reduced', label: 'reduced' },
              ]}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.pad,
    paddingBottom: Spacing.three,
    backgroundColor: Palette.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: Palette.hairline,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  wordmark: {
    fontFamily: FontFamily.medium,
    fontSize: 22,
    color: Palette.ink,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.pill,
    padding: 5,
    gap: Spacing.one,
    ...Shadow.sm,
  },
  action: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDark: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.ink,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 38, 28, 0.18)',
  },
  popover: {
    position: 'absolute',
    left: Spacing.pad,
    right: Spacing.pad,
    backgroundColor: Palette.surfaceRaised,
    borderRadius: Radius.card,
    padding: Spacing.pad,
    gap: Spacing.two,
    ...Shadow.lg,
  },
  popoverTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  field: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Palette.ink,
    marginTop: Spacing.two,
  },
  control: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.7,
  },
});
