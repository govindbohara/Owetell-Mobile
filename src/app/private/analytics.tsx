import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EyeIcon, TweaksIcon } from '@/components/tab-icons';
import { Card, Heading, Label, Money, Segmented } from '@/components/ui';
import {
  BottomTabInset,
  category,
  FontFamily,
  HeroCard,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useRooms } from '@/contexts/rooms-context';
import { monthlyCents as periodMonthlyCents } from '@/utils/billing';
import { formatCents, formatCompactCents, monthLabel } from '@/utils/currency';
import { listSubscriptions, type Subscription } from '@/utils/subscriptions-api';

type Range = 'week' | 'month' | 'quarter' | 'year';

const WEEKDAY_LABELS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function Analytics() {
  const [range, setRange] = useState<Range>('month');
  const { user } = useAuth();
  const { rooms, loading } = useRooms();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    let active = true;
    const load = user ? listSubscriptions(user.uid) : Promise.resolve([]);
    load.then((subs) => {
      if (active) setSubscriptions(subs);
    });
    return () => {
      active = false;
    };
  }, [user]);

  // All amounts below are summed across every room the user's in. Rooms can technically use
  // different currencies; this display picks the first room's code rather than converting —
  // fine for the common case (one household, one currency), lossy otherwise.
  const currencyCode = rooms[0]?.currencyCode ?? 'USD';
  const uid = user?.uid ?? '';

  const months = useMemo(() => {
    const merged: Record<string, number> = {};
    for (const room of rooms) {
      for (const [month, cents] of Object.entries(room.summary.months)) {
        merged[month] = (merged[month] ?? 0) + cents;
      }
    }
    return Object.entries(merged).sort(([a], [b]) => a.localeCompare(b));
  }, [rooms]);
  const maxMonth = Math.max(...months.map(([, cents]) => cents), 1);
  const average = months.length ? months.reduce((sum, [, cents]) => sum + cents, 0) / months.length : 0;

  // "your breakdown" is the user's own share, not the whole room's spend.
  const categoryEntries = useMemo(() => {
    const merged: Record<string, number> = {};
    for (const room of rooms) {
      for (const [key, cents] of Object.entries(room.summary.yourCategories)) {
        merged[key] = (merged[key] ?? 0) + cents;
      }
    }
    return Object.entries(merged).sort(([, a], [, b]) => b - a);
  }, [rooms]);
  const categoryTotal = categoryEntries.reduce((sum, [, cents]) => sum + cents, 0);
  const top = categoryEntries.slice(0, 5);
  const rest = categoryEntries.slice(5).reduce((sum, [, cents]) => sum + cents, 0);

  const yourShareCents = rooms.reduce((sum, room) => sum + room.position.shareCents, 0);
  const groupSpendCents = rooms.reduce((sum, room) => sum + room.summary.totalCents, 0);
  const netBalanceCents = rooms.reduce((sum, room) => sum + room.position.balanceCents, 0);

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const yourThisMonthCents = rooms.reduce((sum, room) => {
    const monthCents = room.summary.recentExpenses
      .filter((expense) => expense.date.slice(0, 7) === thisMonthKey)
      .reduce((total, expense) => total + Math.round((expense.amountCents * (expense.splitPercentages[uid] ?? 0)) / 100), 0);
    return sum + monthCents;
  }, 0);

  const typicalDay = useMemo(() => {
    const buckets: Record<number, { total: number; count: number }> = {};
    for (const room of rooms) {
      for (const expense of room.summary.recentExpenses) {
        const day = new Date(expense.date).getUTCDay();
        const bucket = buckets[day] ?? { total: 0, count: 0 };
        bucket.total += expense.amountCents;
        bucket.count += 1;
        buckets[day] = bucket;
      }
    }
    return WEEKDAY_LABELS.map((day, index) => {
      const bucket = buckets[index];
      return { day, cents: bucket ? Math.round(bucket.total / bucket.count) : 0 };
    });
  }, [rooms]);
  const maxDay = Math.max(...typicalDay.map((entry) => entry.cents), 1);

  const biggestShares = useMemo(() => {
    const items: { id: string; name: string; roomName: string; cents: number }[] = [];
    for (const room of rooms) {
      for (const expense of room.summary.recentExpenses) {
        const share = expense.splitPercentages[uid] ?? 0;
        if (!share) continue;
        items.push({
          id: expense.id,
          name: expense.description,
          roomName: room.name,
          cents: Math.round((expense.amountCents * share) / 100),
        });
      }
    }
    return items.sort((a, b) => b.cents - a.cents).slice(0, 4);
  }, [rooms, uid]);

  const subscriptionMonthlyCents = subscriptions.reduce((sum, sub) => {
    const share = sub.roomId
      ? sub.splitWith?.includes(uid)
        ? Math.round(sub.amountCents / (sub.splitWith.length || 1))
        : 0
      : sub.amountCents;
    return sum + periodMonthlyCents(share, sub.frequency);
  }, 0);

  const insights = useMemo(() => {
    const list: { id: string; title: string; body: string }[] = [];
    if (netBalanceCents < 0) {
      list.push({
        id: 'balance',
        title: 'your tab is building up',
        body: `${formatCents(Math.abs(netBalanceCents), currencyCode)} owed to others — a settle-up would clear the air.`,
      });
    }
    const [topCategoryKey, topCategoryCents] = top[0] ?? [];
    if (topCategoryKey && categoryTotal > 0) {
      const share = Math.round((topCategoryCents / categoryTotal) * 100);
      list.push({
        id: 'category',
        title: `${category(topCategoryKey).label.toLowerCase()} is ${share}% of your spend`,
        body: `${formatCents(topCategoryCents, currencyCode)} of ${formatCents(categoryTotal, currencyCode)} across your rooms.`,
      });
    }
    if (subscriptionMonthlyCents > 0) {
      list.push({
        id: 'subs',
        title: 'subscriptions add up',
        body: `${formatCents(subscriptionMonthlyCents, currencyCode)}/mo of recurring charges — ${formatCents(subscriptionMonthlyCents * 12, currencyCode)} a year.`,
      });
    }
    return list;
  }, [netBalanceCents, top, categoryTotal, subscriptionMonthlyCents, currencyCode]);

  if (!loading && rooms.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>no data yet</Text>
          <Text style={styles.emptyBody}>join or create a room to see your analytics here.</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Segmented<Range>
        value={range}
        onChange={setRange}
        options={[
          { value: 'week', label: 'week' },
          { value: 'month', label: 'month' },
          { value: 'quarter', label: 'quarter' },
          { value: 'year', label: 'year' },
        ]}
      />

      <View style={styles.chartsButton}>
        <TweaksIcon size={20} color={Palette.ink} />
        <Text style={styles.chartsText}>charts</Text>
      </View>

      <View style={styles.tiles}>
        <View style={[styles.tile, styles.tileDark]}>
          <Text style={styles.tileDarkLabel}>YOUR THIS MONTH</Text>
          <Money fit size={26} color={Palette.page}>
            {formatCents(yourThisMonthCents, currencyCode)}
          </Money>
        </View>
        <Tile label="PERSONAL SPEND" value={formatCents(yourShareCents, currencyCode)} />
        <Tile label="GROUP SPEND" value={formatCents(groupSpendCents, currencyCode)} />
        <Tile
          label="NET BALANCE"
          value={formatCents(netBalanceCents, currencyCode)}
          color={netBalanceCents < 0 ? Palette.neg : Palette.pos}
        />
      </View>

      {insights.length > 0 && (
        <Card style={styles.block}>
          <Label>Insights</Label>
          <Heading>what stands out</Heading>
          {insights.map((insight) => (
            <View key={insight.id} style={styles.insight}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightBody}>{insight.body}</Text>
            </View>
          ))}
        </Card>
      )}

      {months.length > 0 && (
        <Card style={styles.block}>
          <Label>Trend</Label>
          <Heading>month by month</Heading>

          <View style={styles.barChart}>
            {months.map(([month, cents], index) => (
              <View key={month} style={styles.barColumn}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max((cents / maxMonth) * 150, 3) },
                    index % 2 === 0 ? styles.barStrong : styles.barSoft,
                  ]}
                />
                <Text style={styles.barLabel}>{monthLabel(month)}</Text>
              </View>
            ))}

            {/* Drawn last so the average sits above the bars rather than behind them. */}
            <View
              style={[styles.average, { bottom: (average / maxMonth) * 150 + 26 }]}
              pointerEvents="none"
            >
              <Text style={styles.averageText}>{formatCompactCents(average)}</Text>
              <View style={styles.averageLine} />
            </View>
          </View>
        </Card>
      )}

      {top.length > 0 && (
        <Card style={styles.block}>
          <Label>Category</Label>
          <Heading>your breakdown</Heading>

          <View style={styles.ribbon}>
            {top.map(([key, cents]) => (
              <View
                key={key}
                style={{
                  flex: cents / categoryTotal,
                  backgroundColor: category(key).accent,
                }}
              />
            ))}
            {rest > 0 && <View style={{ flex: rest / categoryTotal, backgroundColor: Palette.subtle }} />}
          </View>

          {top.map(([key, cents]) => (
            <View key={key} style={styles.categoryRow}>
              <View style={[styles.dot, { backgroundColor: category(key).accent }]} />
              <Text style={styles.categoryName}>{category(key).label}</Text>
              <Money size={17}>{formatCents(cents, currencyCode)}</Money>
              <Text style={styles.percent}>{Math.round((cents / categoryTotal) * 100)}%</Text>
              <EyeIcon size={20} color={Palette.faint} />
            </View>
          ))}

          {rest > 0 && (
            <View style={styles.categoryRow}>
              <View style={[styles.dot, { backgroundColor: Palette.subtle }]} />
              <Text style={styles.categoryName}>everything else</Text>
              <Money size={17}>{formatCents(rest, currencyCode)}</Money>
              <Text style={styles.percent}>{Math.round((rest / categoryTotal) * 100)}%</Text>
              <View style={styles.eyeSpacer} />
            </View>
          )}
        </Card>
      )}

      <Card style={styles.block}>
        <Label>Rhythm</Label>
        <Heading>typical day</Heading>

        <View style={styles.dayChart}>
          {typicalDay.map((entry) => (
            <View key={entry.day} style={styles.dayColumn}>
              <View style={[styles.dayBar, { height: Math.max((entry.cents / maxDay) * 120, 4) }]} />
              <Text style={styles.dayLabel}>{entry.day}</Text>
              <Money size={13} color={Palette.muted}>
                {formatCents(entry.cents, currencyCode).replace(/\.\d0$/, '')}
              </Money>
            </View>
          ))}
        </View>

        <Text style={styles.blockBody}>average per expense, by day of week.</Text>
      </Card>

      {biggestShares.length > 0 && (
        <Card style={styles.block}>
          <Label>Top</Label>
          <Heading>your biggest shares</Heading>

          {biggestShares.map((share) => (
            <View key={share.id} style={styles.shareRow}>
              <View style={styles.shareBody}>
                <Text style={styles.shareName}>{share.name}</Text>
                <Text style={styles.shareRoom}>{share.roomName}</Text>
              </View>
              <Money size={22}>{formatCents(share.cents, currencyCode)}</Money>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Money fit size={26} color={color}>
        {value}
      </Money>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.pad,
    paddingTop: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.six,
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
  },
  emptyBody: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    lineHeight: 25,
    color: Palette.muted,
    textAlign: 'center',
  },
  chartsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    marginTop: Spacing.four,
  },
  chartsText: {
    fontFamily: FontFamily.regular,
    fontSize: 18,
    color: Palette.ink,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  tileDark: {
    backgroundColor: HeroCard.to,
    borderColor: HeroCard.to,
  },
  tileLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: Palette.label,
  },
  tileDarkLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: HeroCard.label,
  },
  block: {
    marginTop: Spacing.five,
    gap: Spacing.three,
  },
  blockBody: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    lineHeight: 25,
    color: Palette.muted,
  },
  insight: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: Radius.control,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  insightTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 20,
    color: Palette.ink,
  },
  insightBody: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    lineHeight: 25,
    color: Palette.muted,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 200,
    paddingTop: Spacing.four,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  bar: {
    width: '62%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barStrong: {
    backgroundColor: Palette.accent,
  },
  barSoft: {
    backgroundColor: '#ece0fb',
  },
  barLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Palette.muted,
  },
  average: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  averageText: {
    width: 40,
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: Palette.muted,
  },
  averageLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.accent,
    opacity: 0.45,
  },
  ribbon: {
    flexDirection: 'row',
    height: 16,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginVertical: Spacing.two,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 18,
    color: Palette.ink,
  },
  percent: {
    fontFamily: FontFamily.mono,
    fontSize: 15,
    color: Palette.muted,
    width: 38,
    textAlign: 'right',
  },
  eyeSpacer: {
    width: 20,
  },
  dayChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 190,
    marginTop: Spacing.four,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  dayBar: {
    width: '70%',
    backgroundColor: Palette.accent,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  dayLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Palette.muted,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Palette.surfaceContainer,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: Radius.control,
    padding: Spacing.four,
  },
  shareBody: {
    flex: 1,
    gap: Spacing.one,
  },
  shareName: {
    fontFamily: FontFamily.regular,
    fontSize: 20,
    color: Palette.ink,
  },
  shareRoom: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Palette.muted,
  },
});
