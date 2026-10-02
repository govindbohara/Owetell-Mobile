import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MemberMultiPicker, MemberPicker } from '@/components/member-picker';
import { PlusIcon } from '@/components/tab-icons';
import { EmojiTile, Heading, Label } from '@/components/ui';
import {
  Categories,
  type CategoryKey,
  FontFamily,
  Palette,
  Radius,
  Shadow,
  Spacing,
} from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useRooms } from '@/contexts/rooms-context';
import { formatCents } from '@/utils/currency';
import { addExpense } from '@/utils/expenses-api';

const CATEGORY_KEYS = Object.keys(Categories) as CategoryKey[];

export function AddExpenseSheet() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { rooms, addExpenseRoomId, closeAddExpense, refresh } = useRooms();
  const room = rooms.find((entry) => entry.id === addExpenseRoomId) ?? null;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryKey>('other');
  // `null` means "use the default" (the signed-in user paid; everyone in the room splits it)
  // rather than a stale copy of the previous room's members — see `reset()`.
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [splitWith, setSplitWith] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectivePaidBy = paidBy ?? user?.uid ?? '';
  const effectiveSplitWith = splitWith ?? room?.members.map((member) => member.id) ?? [];

  const amountCents = Math.round(Number(amount) * 100);
  const perPersonCents =
    effectiveSplitWith.length > 0 && Number.isFinite(amountCents) && amountCents > 0
      ? Math.round(amountCents / effectiveSplitWith.length)
      : null;
  // Shown under each selected member's name in the "split with" picker.
  const splitAmounts =
    perPersonCents !== null
      ? Object.fromEntries(effectiveSplitWith.map((id) => [id, formatCents(perPersonCents, room?.currencyCode)]))
      : undefined;

  const reset = () => {
    setDescription('');
    setAmount('');
    setCategory('other');
    setPaidBy(null);
    setSplitWith(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    closeAddExpense();
  };

  const handleAdd = async () => {
    if (!user || !room) return;

    if (!description.trim()) {
      setError('Enter a description.');
      return;
    }
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError('Enter an amount.');
      return;
    }
    if (effectiveSplitWith.length === 0) {
      setError('Pick at least one person to split with.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addExpense(room.id, room.members, user.uid, {
        description,
        amountCents,
        category,
        paidBy: effectivePaidBy,
        splitWith: effectiveSplitWith,
      });
      reset();
      closeAddExpense();
      refresh();
    } catch (err) {
      console.error('addExpense failed', err);
      setError(err instanceof Error ? err.message : "Couldn't add the expense. Try again.");
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
        <Heading style={styles.title}>add expense</Heading>

        <Text style={styles.field}>description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="groceries"
          placeholderTextColor={Palette.faint}
          style={[styles.input, description.length > 0 && styles.inputFocused]}
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

        <Text style={styles.field}>paid by</Text>
        <MemberPicker members={room?.members ?? []} value={effectivePaidBy} onChange={setPaidBy} />

        <Text style={styles.field}>split with</Text>
        <MemberMultiPicker
          members={room?.members ?? []}
          value={effectiveSplitWith}
          onChange={setSplitWith}
          amounts={splitAmounts}
        />
        {perPersonCents !== null && (
          <Text style={styles.splitHint}>
            split evenly · {formatCents(perPersonCents, room?.currencyCode)} each ·{' '}
            {effectiveSplitWith.length} {effectiveSplitWith.length === 1 ? 'person' : 'people'}
          </Text>
        )}

        <Text style={styles.field}>category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          style={styles.categoryScroll}
        >
          {CATEGORY_KEYS.map((key) => {
            const meta = Categories[key];
            const active = key === category;
            return (
              <Pressable
                key={key}
                onPress={() => setCategory(key)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  active && styles.categoryChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <EmojiTile emoji={meta.emoji} tint={meta.tint} size={32} />
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          disabled={submitting}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, submitting && styles.ctaDisabled]}
          onPress={handleAdd}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <PlusIcon size={22} color="#ffffff" />
              <Text style={styles.ctaText}>add expense</Text>
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
  splitHint: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Palette.muted,
    marginTop: -Spacing.two,
    marginBottom: Spacing.four,
  },
  categoryScroll: {
    marginBottom: Spacing.four,
  },
  categoryRow: {
    gap: Spacing.two,
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
