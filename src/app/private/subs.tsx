import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SubscriptionSheet } from '@/components/subscription-sheet';
import {
  CalendarIcon,
  ChevronIcon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/tab-icons';
import { EmojiTile, Money, Segmented } from '@/components/ui';
import {
  BottomTabInset,
  Categories,
  FontFamily,
  HeroCard,
  MaxContentWidth,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useRooms } from '@/contexts/rooms-context';
import { annualCents, monthlyCents, nextDueDate } from '@/utils/billing';
import { formatCents, formatCountdown, formatShortDate } from '@/utils/currency';
import { confirmCharge, deleteSubscription, listSubscriptions, type Subscription } from '@/utils/subscriptions-api';

type Scope = 'you' | 'group';
type View_ = 'list' | 'calendar';

/** The signed-in user's share of a subscription's per-period cost. */
function yourShareCents(sub: Subscription, uid?: string): number {
  if (!uid) return 0;
  if (!sub.roomId) return sub.createdBy === uid ? sub.amountCents : 0;
  if (!sub.splitWith || sub.splitWith.length === 0 || !sub.splitWith.includes(uid)) return 0;
  return Math.round(sub.amountCents / sub.splitWith.length);
}

export default function Subs() {
  const { user } = useAuth();
  const { rooms } = useRooms();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('you');
  const [view, setView] = useState<View_>('list');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const reload = async () => {
    if (!user) return;
    setSubscriptions(await listSubscriptions(user.uid));
  };

  useEffect(() => {
    let active = true;
    const load = user ? listSubscriptions(user.uid) : Promise.resolve([]);
    load.then((subs) => {
      if (!active) return;
      setSubscriptions(subs);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const roomName = (roomId: string | null) =>
    roomId ? (rooms.find((room) => room.id === roomId)?.name ?? 'shared') : 'personal';

  const monthlyTotal = subscriptions.reduce((sum, sub) => {
    const cents = scope === 'you' ? yourShareCents(sub, user?.uid) : sub.amountCents;
    return sum + monthlyCents(cents, sub.frequency);
  }, 0);

  const openAdd = () => {
    setEditing(null);
    setSheetKey((key) => key + 1);
    setSheetOpen(true);
  };

  const openEdit = (sub: Subscription) => {
    setEditing(sub);
    setSheetKey((key) => key + 1);
    setSheetOpen(true);
  };

  const handleDelete = (sub: Subscription) => {
    Alert.alert('Delete subscription', `Stop tracking ${sub.name}? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSubscription(sub.id);
          reload();
        },
      },
    ]);
  };

  const handleConfirmCharge = (sub: Subscription) => {
    Alert.alert('Log charge', `Mark ${sub.name} as billed?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log charge',
        onPress: async () => {
          await confirmCharge(sub);
          reload();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headRow}>
        <Segmented<Scope>
          value={scope}
          onChange={setScope}
          options={[
            { value: 'you', label: 'you' },
            { value: 'group', label: 'group' },
          ]}
        />
        <Pressable onPress={openAdd} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
          <PlusIcon size={18} color={Palette.ink} />
          <Text style={styles.addButtonText}>add</Text>
        </Pressable>
      </View>

      <View style={styles.totals}>
        <View style={styles.totalDark}>
          <Text style={styles.totalDarkLabel}>PER MONTH</Text>
          <Money fit size={28} color={Palette.page}>
            {formatCents(monthlyTotal)}
          </Money>
        </View>
        <View style={styles.totalLight}>
          <Text style={styles.totalLightLabel}>PER YEAR</Text>
          <Money fit size={28}>
            {formatCents(monthlyTotal * 12)}
          </Money>
        </View>
      </View>

      <Text style={styles.caption}>
        {scope === 'you'
          ? 'your share of anything split with a room.'
          : 'the full cost of everything a room shares.'}
      </Text>

      <Segmented<View_>
        value={view}
        onChange={setView}
        style={styles.viewToggle}
        options={[
          {
            value: 'list',
            label: 'list',
            icon: <ListIcon size={18} color={view === 'list' ? '#ffffff' : Palette.accent} />,
          },
          {
            value: 'calendar',
            label: 'calendar',
            icon: <CalendarIcon size={18} color={view === 'calendar' ? '#ffffff' : Palette.accent} />,
          },
        ]}
      />

      {loading ? (
        <ActivityIndicator color={Palette.accent} style={styles.loading} />
      ) : subscriptions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>no subscriptions yet</Text>
          <Text style={styles.emptyBody}>track a recurring bill to see it here.</Text>
        </View>
      ) : view === 'list' ? (
        <SubList
          subscriptions={subscriptions}
          scope={scope}
          userId={user?.uid}
          roomName={roomName}
          onEdit={openEdit}
          onDelete={handleDelete}
          onConfirmCharge={handleConfirmCharge}
        />
      ) : (
        <SubCalendar dueDates={subscriptions.map((sub) => nextDueDate(sub).toISOString().slice(0, 10))} />
      )}

      <SubscriptionSheet
        key={sheetKey}
        visible={sheetOpen}
        editing={editing}
        onClose={() => setSheetOpen(false)}
        onSaved={reload}
      />
    </ScrollView>
  );
}

function SubList({
  subscriptions,
  scope,
  userId,
  roomName,
  onEdit,
  onDelete,
  onConfirmCharge,
}: {
  subscriptions: Subscription[];
  scope: Scope;
  userId: string | undefined;
  roomName: (roomId: string | null) => string;
  onEdit: (sub: Subscription) => void;
  onDelete: (sub: Subscription) => void;
  onConfirmCharge: (sub: Subscription) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <View style={styles.list}>
      {subscriptions.map((sub) => {
        const amount = scope === 'you' ? yourShareCents(sub, userId) : sub.amountCents;
        const open = expanded === sub.id;
        const meta = Categories[sub.category as keyof typeof Categories] ?? Categories.other;
        const nextDate = nextDueDate(sub).toISOString().slice(0, 10);
        const splitWays = sub.roomId ? (sub.splitWith?.length ?? 1) : 1;
        const chargeCount = sub.charges.length;
        const paidSoFarCents = chargeCount * sub.amountCents;

        return (
          <View key={sub.id} style={styles.subCard}>
            <View style={styles.subMain}>
              <EmojiTile emoji={meta.emoji} tint={meta.tint} size={50} />

              <View style={styles.subBody}>
                <Text style={styles.subName}>{sub.name}</Text>
                <Text style={styles.subMeta}>
                  {roomName(sub.roomId)} · {sub.frequency} · {formatCents(annualCents(sub.amountCents, sub.frequency))}
                  /yr · next {formatShortDate(nextDate)} · {formatCountdown(nextDate)}
                  {splitWays > 1 ? ` · split ${splitWays} ways` : ''}
                </Text>
              </View>

              <View style={styles.subRight}>
                <Money size={19}>{formatCents(amount)}</Money>
                <Text style={styles.subOf}>of {formatCents(sub.amountCents)}</Text>
                <View style={styles.subActions}>
                  <Pressable hitSlop={6} onPress={() => onEdit(sub)} style={({ pressed }) => pressed && styles.pressed}>
                    <PencilIcon size={22} color={Palette.muted} />
                  </Pressable>
                  <Pressable hitSlop={6} onPress={() => onDelete(sub)} style={({ pressed }) => pressed && styles.pressed}>
                    <TrashIcon size={22} color={Palette.muted} />
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.subFooterRow}>
              <Pressable
                onPress={() => setExpanded(open ? null : sub.id)}
                style={({ pressed }) => [styles.subFooter, pressed && styles.pressed]}
              >
                <View style={[styles.footerCaret, open && styles.footerCaretOpen]}>
                  <ChevronIcon size={18} color={Palette.muted} />
                </View>
                <Text style={styles.subFooterText}>
                  {chargeCount} charge{chargeCount === 1 ? '' : 's'} · {formatCents(paidSoFarCents)} paid so far
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onConfirmCharge(sub)}
                style={({ pressed }) => [styles.logChargeButton, pressed && styles.pressed]}
              >
                <Text style={styles.logChargeText}>log charge</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function SubCalendar({ dueDates }: { dueDates: string[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - firstDay);

  const due = new Set(dueDates);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      iso,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: date.toDateString() === today.toDateString(),
      hasCharge: due.has(iso) || isRecurringMatch(iso, dueDates),
    };
  });

  const monthName = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.calendar}>
      <Text style={styles.monthTitle}>{monthName}</Text>

      <View style={styles.weekHead}>
        {WEEKDAYS.map((day, index) => (
          <Text key={index} style={styles.weekHeadText}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => (
          <View
            key={cell.iso}
            style={[
              styles.cell,
              cell.inMonth && styles.cellInMonth,
              cell.isToday && styles.cellToday,
            ]}
          >
            <Text style={[styles.cellDay, !cell.inMonth && styles.cellDayMuted]}>{cell.day}</Text>
            {cell.hasCharge && (
              <View style={[styles.chargeBar, !cell.inMonth && styles.chargeBarMuted]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Weekly subscriptions recur on the same weekday; monthly on the same date. */
function isRecurringMatch(iso: string, dueDates: string[]) {
  const date = new Date(iso);
  return dueDates.some((due) => {
    const dueDate = new Date(due);
    if (date < dueDate) return false;
    const sameWeekday = date.getDay() === dueDate.getDay();
    const sameDate = date.getDate() === dueDate.getDate();
    return sameWeekday || sameDate;
  });
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
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  addButton: {
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
  addButtonText: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Palette.ink,
  },
  loading: {
    marginTop: Spacing.six,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.five,
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
  totals: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  totalDark: {
    flex: 1,
    backgroundColor: HeroCard.to,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  totalDarkLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: HeroCard.label,
  },
  totalLight: {
    flex: 1,
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  totalLightLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: Palette.label,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    color: Palette.muted,
    marginTop: Spacing.four,
  },
  viewToggle: {
    marginTop: Spacing.four,
  },
  list: {
    marginTop: Spacing.five,
    gap: Spacing.four,
  },
  subCard: {
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  subMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  subBody: {
    flex: 1,
    gap: Spacing.two,
  },
  subName: {
    fontFamily: FontFamily.regular,
    fontSize: 19,
    color: Palette.ink,
  },
  subMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: Palette.muted,
  },
  subRight: {
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  subOf: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: Palette.faint,
  },
  subActions: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  subFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Palette.hairline,
  },
  subFooter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  footerCaret: {
    transform: [{ rotate: '90deg' }],
  },
  footerCaretOpen: {
    transform: [{ rotate: '270deg' }],
  },
  subFooterText: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Palette.ink,
  },
  logChargeButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  logChargeText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Palette.accent,
  },
  calendar: {
    marginTop: Spacing.five,
  },
  monthTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 26,
    color: Palette.ink,
    marginBottom: Spacing.four,
  },
  weekHead: {
    flexDirection: 'row',
    marginBottom: Spacing.two,
  },
  weekHeadText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Palette.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.92,
    padding: Spacing.two,
    justifyContent: 'space-between',
  },
  cellInMonth: {
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: Radius.control,
    backgroundColor: Palette.surfaceRaised,
  },
  cellToday: {
    borderColor: Palette.accent,
    backgroundColor: Palette.accentLight,
  },
  cellDay: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    color: Palette.ink,
  },
  cellDayMuted: {
    color: Palette.faint,
  },
  chargeBar: {
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accent,
  },
  chargeBarMuted: {
    backgroundColor: '#d3b0f0',
  },
  pressed: {
    opacity: 0.6,
  },
});
