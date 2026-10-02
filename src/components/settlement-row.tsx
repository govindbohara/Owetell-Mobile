import { StyleSheet, Text, View } from 'react-native';

import { EmojiTile, Money } from '@/components/ui';
import { FontFamily, Palette, Radius, Spacing } from '@/constants/theme';
import type { Member, Settlement } from '@/data/fixtures';
import { formatCents } from '@/utils/currency';

export function SettlementRow({
  settlement,
  members,
  currencyCode,
}: {
  settlement: Settlement;
  members: Member[];
  currencyCode: string;
}) {
  const fromName = members.find((member) => member.id === settlement.from)?.name ?? 'someone';
  const toName = members.find((member) => member.id === settlement.to)?.name ?? 'someone';

  return (
    <View style={styles.row}>
      <EmojiTile emoji="🤝" tint={Palette.posBg} size={48} />

      <View style={styles.body}>
        <Text style={styles.description} numberOfLines={2}>
          {fromName} paid {toName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          settled{settlement.note ? ` · ${settlement.note}` : ''}
        </Text>
      </View>

      <Money size={19} color={Palette.pos}>
        {formatCents(settlement.amountCents, currencyCode)}
      </Money>
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
  meta: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Palette.muted,
  },
});
