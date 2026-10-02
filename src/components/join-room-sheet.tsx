import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlusIcon } from '@/components/tab-icons';
import { Heading, Label } from '@/components/ui';
import { FontFamily, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useRooms } from '@/contexts/rooms-context';
import { joinRoomByToken } from '@/utils/room-invites-api';

/** Accepts either a raw invite token or a full `owetell://join/<token>` (or web) link and
 * pulls the token off the end. */
function extractToken(input: string): string {
  const trimmed = input.trim();
  const lastSegment = trimmed.split(/[/?#]/).filter(Boolean).pop();
  return lastSegment ?? trimmed;
}

export function JoinRoomSheet() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { joinOpen, closeJoin, refresh } = useRooms();

  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setValue('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    closeJoin();
  };

  const handleJoin = async () => {
    if (!user) return;
    const token = extractToken(value);
    if (!token) {
      setError('Paste an invite link or code.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const roomId = await joinRoomByToken(token, user);
      reset();
      closeJoin();
      await refresh();
      router.push(`/private/room/${roomId}`);
    } catch (err) {
      console.error('joinRoomByToken failed', err);
      setError(err instanceof Error ? err.message : "Couldn't join that room. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal transparent visible={joinOpen} animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.pad }]}>
        <View style={styles.grabber} />

        <Label>Join a room</Label>
        <Heading style={styles.title}>join room</Heading>

        <Text style={styles.field}>invite link or code</Text>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="owetell://join/..."
          placeholderTextColor={Palette.faint}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, value.length > 0 && styles.inputFocused]}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          disabled={submitting}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, submitting && styles.ctaDisabled]}
          onPress={handleJoin}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <PlusIcon size={22} color="#ffffff" />
              <Text style={styles.ctaText}>join room</Text>
            </>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 38, 28, 0.32)',
  },
  sheet: {
    backgroundColor: Palette.surfaceContainerLow,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.pad,
    paddingTop: Spacing.three,
    ...Shadow.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: Palette.line,
    marginBottom: Spacing.four,
  },
  title: {
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
  field: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    color: Palette.ink,
    marginBottom: Spacing.two,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 62,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.line,
    backgroundColor: Palette.surfaceRaised,
    paddingHorizontal: Spacing.pad,
    marginBottom: Spacing.four,
    fontFamily: FontFamily.regular,
    fontSize: 19,
    color: Palette.ink,
  },
  inputFocused: {
    borderColor: Palette.accent,
  },
  error: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Palette.neg,
    marginBottom: Spacing.three,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 66,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accent,
  },
  ctaPressed: {
    backgroundColor: Palette.accentHover,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontFamily: FontFamily.medium,
    fontSize: 20,
    color: '#ffffff',
  },
});
