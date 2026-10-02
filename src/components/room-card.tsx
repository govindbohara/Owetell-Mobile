import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronIcon, ReceiptIcon } from '@/components/tab-icons';
import { AvatarStack, InitialTile, Pill } from '@/components/ui';
import { FontFamily, Palette, Radius, Spacing } from '@/constants/theme';
import type { Room } from '@/data/fixtures';
import { formatCents, formatRelativeDate } from '@/utils/currency';

export function RoomCard({ room, onPress }: { room: Room; onPress?: () => void }) {
  const latest = room.summary.recentExpenses[0];
  const payer = room.members.find((member) => member.id === latest?.paidBy)?.name;
  const owed = room.position.balanceCents < 0;
  const settled = room.position.balanceCents === 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <LinearGradient
        colors={['#f7edd4', '#fbf3e2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <InitialTile label={room.name} tint="#dca92a" size={62} />

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{room.name}</Text>
            <View style={styles.currency}>
              <Text style={styles.currencyText}>{room.currencyCode}</Text>
            </View>
          </View>

          {latest && (
            <Text style={styles.meta} numberOfLines={2}>
              {latest.description} · {formatRelativeDate(latest.date)} · {payer}
            </Text>
          )}

          <AvatarStack names={room.members.map((member) => member.name)} size={38} />

          <Pill
            background={settled ? Palette.posBg : Palette.negBg}
            color={settled ? Palette.pos : Palette.neg}
            style={styles.balancePill}
          >
            {settled
              ? 'settled up'
              : `${owed ? 'owe' : 'owed'} ${formatCents(Math.abs(room.position.balanceCents), room.currencyCode)}  ·  ${room.position.staleDays} days`}
          </Pill>
        </View>

        <ChevronIcon size={22} color={Palette.faint} />
      </LinearGradient>

      <View style={styles.watermark}>
        <ReceiptIcon size={30} color={Palette.accent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.six,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: '#e8d9b4',
    padding: Spacing.four,
  },
  body: {
    flex: 1,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    fontFamily: FontFamily.medium,
    fontSize: 24,
    color: Palette.ink,
  },
  currency: {
    backgroundColor: 'rgba(22, 38, 28, 0.07)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  currencyText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.8,
    color: Palette.muted,
  },
  meta: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 21,
    color: Palette.muted,
  },
  balancePill: {
    marginTop: Spacing.one,
  },
  watermark: {
    position: 'absolute',
    right: Spacing.four,
    bottom: -14,
  },
  pressed: {
    opacity: 0.88,
  },
});
