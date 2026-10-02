import { StyleSheet, Text, View } from 'react-native';

import { Avatar, EmojiTile, Money } from '@/components/ui';
import { category, FontFamily, Palette, Radius, Spacing } from '@/constants/theme';
import type { Expense, Member } from '@/data/fixtures';
import { formatCents } from '@/utils/currency';

export function ExpenseRow({
  expense,
  members,
  currency,
}: {
  expense: Expense;
  members: Member[];
  currency: string;
}) {
  const meta = category(expense.category);
  const payer = members.find((member) => member.id === expense.paidBy)?.name ?? 'someone';
  const splitNames = expense.splitWith
    .map((id) => members.find((member) => member.id === id)?.name)
    .filter((name): name is string => !!name);

  return (
    <View style={styles.row}>
      <EmojiTile emoji={meta.emoji} tint={meta.tint} size={48} />

      <View style={styles.body}>
        <Text style={styles.description} numberOfLines={2}>
          {expense.description}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.avatars}>
            {splitNames.map((name, index) => (
              <View key={`${name}-${index}`} style={index > 0 && styles.overlap}>
                <Avatar name={name} size={22} index={index} />
              </View>
            ))}
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {meta.label} · {payer} paid
          </Text>
        </View>
      </View>

      <Money size={19}>{formatCents(expense.amountCents, currency)}</Money>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Palette.surface,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Palette.hairline,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  body: {
    flex: 1,
    gap: Spacing.two,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    lineHeight: 22,
    color: Palette.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatars: {
    flexDirection: 'row',
  },
  overlap: {
    marginLeft: -8,
  },
  meta: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Palette.muted,
  },
});
