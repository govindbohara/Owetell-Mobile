import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlusIcon } from '@/components/tab-icons';
import { EmojiTile, Heading, Label, Segmented } from '@/components/ui';
import { Categories, type CategoryKey, FontFamily, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useRooms } from '@/contexts/rooms-context';
import type { Frequency } from '@/utils/billing';
import { addSubscription, type Subscription, updateSubscription } from '@/utils/subscriptions-api';

const CATEGORY_KEYS = Object.keys(Categories) as CategoryKey[];
const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'weekly' },
  { value: 'monthly', label: 'monthly' },
  { value: 'quarterly', label: 'quarterly' },
  { value: 'yearly', label: 'yearly' },
];

export function SubscriptionSheet({
  visible,
  editing,
  onClose,
  onSaved,
}: {
  visible: boolean;
  /** Present when editing an existing subscription instead of creating one. */
  editing: Subscription | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { rooms } = useRooms();

  // Initialized straight from `editing` — the parent remounts this component (via a `key`
  // that changes on every open) whenever the sheet opens, so this is the only reset needed;
  // no effect required. See `subs.tsx`'s `sheetKey`.
  const [name, setName] = useState(editing?.name ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amountCents / 100) : '');
  const [frequency, setFrequency] = useState<Frequency>(editing?.frequency ?? 'monthly');
  const [category, setCategory] = useState<CategoryKey>((editing?.category as CategoryKey) ?? 'other');
  const [roomId, setRoomId] = useState<string | null>(editing?.roomId ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) return;
    const amountCents = Math.round(Number(amount) * 100);
    if (!name.trim()) {
      setError('Enter a name.');
      return;
    }
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError('Enter an amount.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await updateSubscription(editing, { name, amountCents, frequency, category });
      } else {
        const room = roomId ? rooms.find((entry) => entry.id === roomId) : null;
        await addSubscription(user.uid, room?.members ?? [], {
          name,
          amountCents,
          frequency,
          category,
          startDate: new Date().toISOString().slice(0, 10),
          roomId: roomId ?? undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('save subscription failed', err);
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.pad }]}>
        <View style={styles.grabber} />
        <Label>{editing ? 'Edit subscription' : 'New subscription'}</Label>
        <Heading style={styles.title}>{editing ? 'edit subscription' : 'add subscription'}</Heading>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.field}>name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Netflix"
            placeholderTextColor={Palette.faint}
            style={[styles.input, name.length > 0 && styles.inputFocused]}
          />

          <Text style={styles.field}>amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={Palette.faint}
            keyboardType="decimal-pad"
            style={[styles.input, amount.length > 0 && styles.inputFocused]}
          />

          <Text style={styles.field}>cadence</Text>
          <Segmented<Frequency>
            value={frequency}
            onChange={setFrequency}
            style={styles.segmented}
            options={FREQUENCIES}
          />

          <Text style={styles.field}>category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORY_KEYS.map((key) => {
              const meta = Categories[key];
              const active = key === category;
              return (
                <Pressable
                  key={key}
                  onPress={() => setCategory(key)}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                >
                  <EmojiTile emoji={meta.emoji} tint={meta.tint} size={32} />
                  <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!editing && (
            <>
              <Text style={styles.field}>share with</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                <Pressable
                  onPress={() => setRoomId(null)}
                  style={[styles.roomChip, roomId === null && styles.roomChipActive]}
                >
                  <Text style={[styles.roomChipText, roomId === null && styles.roomChipTextActive]}>
                    just you
                  </Text>
                </Pressable>
                {rooms.map((room) => (
                  <Pressable
                    key={room.id}
                    onPress={() => setRoomId(room.id)}
                    style={[styles.roomChip, roomId === room.id && styles.roomChipActive]}
                  >
                    <Text style={[styles.roomChipText, roomId === room.id && styles.roomChipTextActive]}>
                      {room.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            disabled={submitting}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, submitting && styles.ctaDisabled]}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <PlusIcon size={22} color="#ffffff" />
                <Text style={styles.ctaText}>{editing ? 'save changes' : 'add subscription'}</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
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
    maxHeight: '88%',
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
  segmented: {
    marginBottom: Spacing.four,
  },
  categoryRow: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  categoryChip: {
    alignItems: 'center',
    gap: 6,
    width: 68,
    paddingVertical: Spacing.two,
    borderRadius: Radius.control,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    borderColor: Palette.accent,
    backgroundColor: Palette.accentLight,
  },
  categoryLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Palette.muted,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: Palette.accent,
    fontFamily: FontFamily.medium,
  },
  roomChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.line,
    backgroundColor: Palette.surfaceRaised,
  },
  roomChipActive: {
    borderColor: Palette.accent,
    backgroundColor: Palette.accentLight,
  },
  roomChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Palette.muted,
  },
  roomChipTextActive: {
    color: Palette.accent,
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
    marginBottom: Spacing.four,
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
