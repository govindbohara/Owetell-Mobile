import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExpenseRow } from '@/components/expense-row';
import { ManageRoomSheet } from '@/components/manage-room-sheet';
import { SettlementRow } from '@/components/settlement-row';
import {
  ArrowRightIcon,
  ChevronIcon,
  DownloadIcon,
  ReceiptIcon,
} from '@/components/tab-icons';
import { AvatarStack, Card, Heading, Label, Money } from '@/components/ui';
import {
  BottomTabInset,
  FontFamily,
  HeroCard,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useRooms } from '@/contexts/rooms-context';
import type { Room } from '@/data/fixtures';
import { formatCents, formatWeekRange, mondayOf } from '@/utils/currency';
import { getRoom, getRoomWithExpenses } from '@/utils/rooms-api';

export default function RoomDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { rooms, openSettleUp, refresh } = useRooms();
  const [manageOpen, setManageOpen] = useState(false);
  const cached = rooms.find((entry) => entry.id === id) ?? null;

  // `fetchedRoom` only ever holds the result of an explicit `getRoom` call
  // (the not-in-the-shared-list case) — the cached case is derived directly
  // during render, no effect needed for it.
  const [fetchedRoom, setFetchedRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(!cached);
  const room = cached ?? fetchedRoom;

  useEffect(() => {
    if (cached || !user) return;

    let active = true;
    getRoom(id)
      .then((record) => (record ? getRoomWithExpenses(record, user.uid) : null))
      .then((hydrated) => {
        if (!active) return;
        setFetchedRoom(hydrated);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, user, cached]);

  const weekKeys = room ? Object.keys(room.summary.weeks).sort().reverse() : [];
  // `null` means "no explicit pick yet" — falls back to the latest week
  // below, so switching rooms doesn't need an effect to resync this.
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const activeWeek = selectedWeek && weekKeys.includes(selectedWeek) ? selectedWeek : weekKeys[0];
  const [noticeShown, setNoticeShown] = useState(true);

  if (loading || !room) {
    return (
      <View style={styles.stateWrap}>
        {loading ? (
          <ActivityIndicator color={Palette.accent} />
        ) : (
          <Text style={styles.emptyBody}>room not found.</Text>
        )}
      </View>
    );
  }

  const maxWeek = Math.max(...Object.values(room.summary.weeks), 1);
  const expenses = room.summary.recentExpenses.filter(
    (expense) => expense.weekStart === activeWeek,
  );
  const weekSettlements = room.settlements.filter(
    (settlement) => mondayOf(new Date(settlement.date)) === activeWeek,
  );
  const activity: ({ kind: 'expense'; date: string; item: (typeof expenses)[number] } | {
    kind: 'settlement';
    date: string;
    item: (typeof weekSettlements)[number];
  })[] = [
    ...expenses.map((item) => ({ kind: 'expense' as const, date: item.date, item })),
    ...weekSettlements.map((item) => ({ kind: 'settlement' as const, date: item.date, item })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const viewOnly = room.roomRole === 'read';
  const owing = room.position.balanceCents < 0;

  return (
    <>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/private'))}
        hitSlop={8}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <View style={styles.backIcon}>
          <ChevronIcon size={18} color={Palette.ink} />
        </View>
        <Text style={styles.backText}>rooms</Text>
      </Pressable>

      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Label>Room ledger</Label>
          <Text style={styles.pageTitle}>{room.name}</Text>
        </View>
        <Pressable style={({ pressed }) => [styles.export, pressed && styles.pressed]}>
          <DownloadIcon size={22} color={Palette.ink} />
          <Text style={styles.exportText}>export</Text>
        </Pressable>
      </View>

      <Card style={styles.stats}>
        <Stat label="Spent" value={formatCents(room.summary.totalCents, room.currencyCode)} grow={2.4} />
        <Stat label="Items" value={String(room.summary.count)} />
        <Stat label="Weeks" value={String(room.weeks)} />
        <Pressable style={styles.manage} onPress={() => setManageOpen(true)}>
          <View style={styles.manageHead}>
            <Text style={styles.manageLabel}>PEOPLE</Text>
            <ChevronIcon size={16} color={Palette.accent} />
          </View>
          <Money size={22} color={Palette.ink}>
            {room.members.length}
          </Money>
          <Text style={styles.manageAction}>MANAGE</Text>
        </Pressable>
      </Card>

      {noticeShown && viewOnly && (
        <View style={styles.notice}>
          <View style={styles.noticeBar} />
          <Text style={styles.noticeText}>Your access to this room is now view-only.</Text>
          <Pressable
            onPress={() => setNoticeShown(false)}
            style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
          >
            <Text style={styles.dismissText}>dismiss</Text>
          </Pressable>
        </View>
      )}

      <LinearGradient
        colors={[HeroCard.from, HeroCard.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroLabel}>YOUR POSITION</Text>
        <Money fit size={40} color={owing ? Palette.oweBright : Palette.owedBright}>
          {formatCents(room.position.balanceCents, room.currencyCode)}
        </Money>
        <Text style={styles.heroCaption}>
          paid {formatCents(room.position.paidCents, room.currencyCode)} · your share{' '}
          {formatCents(room.position.shareCents, room.currencyCode)}
        </Text>

        <View style={styles.heroDivider} />

        <View style={styles.heroFooter}>
          <AvatarStack names={room.members.map((member) => member.name)} size={40} onDark />
          <Text style={styles.heroCaption}>
            {room.members.length} people · {room.position.settlement}
          </Text>
        </View>

        {!viewOnly && room.position.balanceCents !== 0 && (
          <Pressable
            onPress={() => openSettleUp(room.id)}
            style={({ pressed }) => [styles.settleUp, pressed && styles.pressed]}
          >
            <Text style={styles.settleUpText}>settle up</Text>
          </Pressable>
        )}
      </LinearGradient>

      {viewOnly && (
        <Card style={styles.block}>
          <Label>View only</Label>
          <Text style={styles.blockBody}>
            you can see this room’s history and balances, but only editors can add expenses or
            payments.
          </Text>
        </Card>
      )}

      <Card style={styles.block}>
        <View style={styles.blockHead}>
          <Heading style={styles.blockHeading}>history by week</Heading>
          <View style={styles.swipeHint}>
            <Text style={styles.swipeText}>swipe for older</Text>
            <ArrowRightIcon size={14} color={Palette.faint} />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekStrip}
        >
          {weekKeys.map((week, index) => {
            const cents = room.summary.weeks[week];
            const active = week === activeWeek;
            const items = room.summary.recentExpenses.filter((e) => e.weekStart === week).length;

            return (
              <Pressable key={week} onPress={() => setSelectedWeek(week)}>
                <View style={[styles.weekCard, active && styles.weekCardActive]}>
                  <View style={styles.weekTop}>
                    <View style={[styles.weekTag, active && styles.weekTagActive]}>
                      <Text style={[styles.weekTagText, active && styles.weekTagTextActive]}>
                        {index === 0 ? 'THIS WEEK' : index === 1 ? 'LAST WEEK' : `${index} WEEKS AGO`}
                      </Text>
                    </View>
                    <Text style={[styles.weekItems, active && styles.weekItemsActive]}>
                      {items} ITEMS
                    </Text>
                  </View>
                  <Text style={[styles.weekRange, active && styles.weekRangeActive]}>
                    {formatWeekRange(week)}
                  </Text>
                  <Money size={24} color={active ? '#ffffff' : Palette.ink}>
                    {formatCents(cents, room.currencyCode)}
                  </Money>
                  <View style={[styles.track, active && styles.trackActive]}>
                    <View
                      style={[
                        styles.fill,
                        active && styles.fillActive,
                        { width: `${Math.max((cents / maxWeek) * 100, 2)}%` },
                      ]}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.expenses}>
          {activity.length === 0 ? (
            <View style={styles.empty}>
              <ReceiptIcon size={72} color={Palette.accent} />
              <Text style={styles.emptyTitle}>no expenses yet</Text>
              <Text style={styles.emptyBody}>add the first line and the history starts here.</Text>
            </View>
          ) : (
            activity.map((entry) =>
              entry.kind === 'expense' ? (
                <ExpenseRow
                  key={`expense-${entry.item.id}`}
                  expense={entry.item}
                  members={room.members}
                  currency={room.currencyCode}
                />
              ) : (
                <SettlementRow
                  key={`settlement-${entry.item.id}`}
                  settlement={entry.item}
                  members={room.members}
                  currencyCode={room.currencyCode}
                />
              ),
            )
          )}
        </View>
      </Card>
    </ScrollView>
    <ManageRoomSheet
      roomId={room.id}
      visible={manageOpen}
      onClose={() => setManageOpen(false)}
      onChanged={refresh}
    />
    </>
  );
}

function Stat({ label, value, grow = 1 }: { label: string; value: string; grow?: number }) {
  return (
    <View style={[styles.stat, { flexGrow: grow }]}>
      <Label>{label}</Label>
      <Money size={17}>{value}</Money>
    </View>
  );
}

const styles = StyleSheet.create({
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.page,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.pad,
    paddingTop: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  backIcon: {
    transform: [{ rotate: '180deg' }],
  },
  backText: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    color: Palette.ink,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  titleBlock: {
    flex: 1,
  },
  pageTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 46,
    lineHeight: 54,
    color: Palette.ink,
    marginTop: Spacing.one,
  },
  export: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  exportText: {
    fontFamily: FontFamily.regular,
    fontSize: 18,
    color: Palette.ink,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.four,
  },
  stat: {
    flexShrink: 1,
    justifyContent: 'center',
    gap: Spacing.two,
  },
  manage: {
    backgroundColor: Palette.accentLight,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  manageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  manageLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: Palette.onPrimaryContainer,
  },
  manageAction: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: Palette.accent,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Palette.surface,
    borderRadius: Radius.control,
    padding: Spacing.four,
    marginTop: Spacing.five,
    overflow: 'hidden',
  },
  noticeBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: Palette.accent,
  },
  noticeText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 17,
    lineHeight: 24,
    color: Palette.ink,
    marginLeft: Spacing.two,
  },
  dismiss: {
    backgroundColor: Palette.surfaceContainer,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  dismissText: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    color: Palette.ink,
  },
  hero: {
    borderRadius: 22,
    padding: Spacing.pad,
    marginTop: Spacing.five,
    gap: Spacing.two,
  },
  heroLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: HeroCard.label,
  },
  heroCaption: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 21,
    color: HeroCard.body,
  },
  heroDivider: {
    height: 1,
    backgroundColor: HeroCard.divider,
    marginVertical: Spacing.three,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  settleUp: {
    alignSelf: 'flex-start',
    marginTop: Spacing.four,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  settleUpText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: '#ffffff',
  },
  block: {
    marginTop: Spacing.four,
    gap: Spacing.three,
  },
  blockBody: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    lineHeight: 25,
    color: Palette.muted,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  blockHeading: {
    flexShrink: 1,
    fontSize: 23,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 0,
  },
  swipeText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Palette.faint,
  },
  weekStrip: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  weekCard: {
    width: 210,
    borderRadius: Radius.card,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.hairline,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  weekCardActive: {
    backgroundColor: Palette.accent,
    borderColor: Palette.accent,
  },
  weekTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekTag: {
    backgroundColor: Palette.accentLight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  weekTagActive: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  weekTagText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    letterSpacing: 0.8,
    color: Palette.onPrimaryContainer,
  },
  weekTagTextActive: {
    color: '#ffffff',
  },
  weekItems: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    letterSpacing: 0.8,
    color: Palette.faint,
  },
  weekItemsActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  weekRange: {
    fontFamily: FontFamily.regular,
    fontSize: 19,
    color: Palette.ink,
  },
  weekRangeActive: {
    color: '#ffffff',
  },
  track: {
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Palette.subtle,
    marginTop: Spacing.one,
  },
  trackActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  fill: {
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accent,
  },
  fillActive: {
    backgroundColor: '#ffffff',
  },
  expenses: {
    marginTop: Spacing.three,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.line,
    borderRadius: Radius.card,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.pad,
  },
  emptyTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 22,
    color: Palette.ink,
    marginTop: Spacing.two,
  },
  emptyBody: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    lineHeight: 25,
    color: Palette.muted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
