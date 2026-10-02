import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MemberPicker } from '@/components/member-picker';
import { Heading, Label } from '@/components/ui';
import { FontFamily, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useRooms } from '@/contexts/rooms-context';
import { addSettlement } from '@/utils/settlements-api';

export function SettleUpSheet() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { rooms, settleUpRoomId, closeSettleUp, refresh } = useRooms();
  const room = rooms.find((entry) => entry.id === settleUpRoomId) ?? null;

  // Default: the signed-in user is paying whoever they currently owe the most (a two-person
  // room's only other member, if any) — the picker below lets either side be changed.
  const defaultTo = useMemo(() => {
    if (!room || !user) return '';
    return room.members.find((member) => member.id !== user.uid)?.id ?? '';
  }, [room, user]);

  const [from, setFrom] = useState(user?.uid ?? '');
  const [to, setTo] = useState(defaultTo);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFrom(user?.uid ?? '');
    setTo(defaultTo);
    setAmount('');
    setNote('');
    setError(null);
  };

  const handleClose = () => {
    reset();
    closeSettleUp();
  };

  const handleSubmit = async () => {
    if (!user || !room) return;

    const amountCents = Math.round(Number(amount) * 100);
    if (!from || !to) {
      setError('Pick who paid and who received it.');
      return;
    }
    if (from === to) {
      setError('Pick two different people.');
      return;
    }
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError('Enter an amount.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addSettlement(room.id, user.uid, { from, to, amountCents, note });
      reset();
      closeSettleUp();
      refresh();
    } catch (err) {
      console.error('addSettlement failed', err);
      setError(err instanceof Error ? err.message : "Couldn't record the payment. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal transparent visible={!!room} animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.pad }]}>
        <View style={styles.grabber} />

        <Label>{room?.name}</Label>
        <Heading style={styles.title}>settle up</Heading>

        <Text style={styles.field}>who paid</Text>
        <MemberPicker members={room?.members ?? []} value={from} onChange={setFrom} />

        <Text style={styles.field}>who received it</Text>
        <MemberPicker members={room?.members ?? []} value={to} onChange={setTo} />

        <Text style={styles.field}>amount</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={Palette.faint}
          keyboardType="decimal-pad"
          style={[styles.input, amount.length > 0 && styles.inputFocused]}
        />

        <Text style={styles.field}>note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="cash, bank transfer, etc."
          placeholderTextColor={Palette.faint}
          style={[styles.input, note.length > 0 && styles.inputFocused]}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          disabled={submitting}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, submitting && styles.ctaDisabled]}
          onPress={handleSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.ctaText}>record payment</Text>
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
  pressed: {
    opacity: 0.7,
  },
});
