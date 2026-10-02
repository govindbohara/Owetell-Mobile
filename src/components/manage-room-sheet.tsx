import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { Avatar, Heading, Label, Pill } from '@/components/ui';
import { ChevronIcon } from '@/components/tab-icons';
import { FontFamily, Palette, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { currencies } from '@/data/fixtures';
import {
  leaveRoom,
  removeMember,
  setMemberRole,
  setRolesEnabled,
  transferOwnership,
  type RoomMemberRole,
} from '@/utils/members-api';
import { mintInvite } from '@/utils/room-invites-api';
import { getRoom, roomRole, softDeleteRoom, updateRoom, type RoomRecord } from '@/utils/rooms-api';

const ROLE_LABEL: Record<string, string> = {
  owner: 'owner',
  admin: 'admin',
  edit: 'editor',
  read: 'viewer',
};

export function ManageRoomSheet({
  roomId,
  visible,
  onClose,
  onChanged,
}: {
  roomId: string | null;
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [record, setRecord] = useState<RoomRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [qrVisible, setQrVisible] = useState(false);
  const showLoading = !record || record.id !== roomId;
  const inviteLink = record?.inviteToken ? `owetell://join/${record.inviteToken}` : null;

  const reload = async () => {
    if (!roomId) return;
    const fetched = await getRoom(roomId);
    setRecord(fetched);
    setName(fetched?.name ?? '');
  };

  useEffect(() => {
    if (!visible || !roomId) return;
    let active = true;
    getRoom(roomId).then((fetched) => {
      if (!active) return;
      setRecord(fetched);
      setName(fetched?.name ?? '');
    });
    return () => {
      active = false;
    };
  }, [visible, roomId]);

  const actorRole = record && user ? roomRole(record, user.uid) : null;
  const isOwner = actorRole === 'owner';
  const isAdmin = actorRole === 'admin';

  const withBusy = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await reload();
      onChanged();
    } catch (err) {
      console.error('manage room action failed', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRename = () => {
    if (!record) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === record.name) return;
    withBusy(() => updateRoom(record.id, { name: trimmed }));
  };

  const handleShareInvite = async () => {
    if (!record || !user) return;
    setBusy(true);
    setError(null);
    try {
      const token = record.inviteToken ?? (await mintInvite(record.id, user));
      await Share.share({ message: `Join "${record.name}" on Owetell: owetell://join/${token}` });
    } catch (err) {
      console.error('share invite failed', err);
      setError(err instanceof Error ? err.message : "Couldn't create an invite link.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleQr = async () => {
    if (!record || !user) return;
    if (qrVisible) {
      setQrVisible(false);
      return;
    }
    // Mint the room's first invite on demand — most rooms already have one from creation,
    // but an older room or one whose invite was revoked won't.
    if (!record.inviteToken) {
      setBusy(true);
      setError(null);
      try {
        await mintInvite(record.id, user);
        await reload();
      } catch (err) {
        console.error('mint invite for QR failed', err);
        setError(err instanceof Error ? err.message : "Couldn't create an invite link.");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setQrVisible(true);
  };

  const handleRemove = (memberId: string, memberName: string) => {
    Alert.alert('Remove member', `Remove ${memberName} from this room?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          record && user && withBusy(() => removeMember(record, memberId, user)),
      },
    ]);
  };

  const handleLeave = () => {
    Alert.alert('Leave room', 'You can rejoin later with a new invite.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () =>
          record &&
          user &&
          withBusy(async () => {
            await leaveRoom(record, user);
            onClose();
            router.replace('/private');
          }),
      },
    ]);
  };

  const handleTransfer = (memberId: string, memberName: string) => {
    Alert.alert('Make owner', `Make ${memberName} the owner of this room?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Transfer',
        onPress: () =>
          record && user && withBusy(() => transferOwnership(record, memberId, user)),
      },
    ]);
  };

  const cycleRole = (current: RoomMemberRole): RoomMemberRole => {
    if (current === 'edit') return 'admin';
    if (current === 'admin') return 'read';
    return 'edit';
  };

  const handleCycleRole = (memberId: string, current: RoomMemberRole) => {
    if (!record || !user) return;
    withBusy(() => setMemberRole(record, memberId, cycleRole(current), user));
  };

  const handleDelete = () => {
    Alert.alert('Delete room', 'This can be undone later, but the room will disappear from everyone’s list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          user &&
          record &&
          withBusy(async () => {
            await softDeleteRoom(record.id, user.uid);
            onClose();
            router.replace('/private');
          }),
      },
    ]);
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.pad }]}>
        <View style={styles.grabber} />
        <Label>Room settings</Label>
        <Heading style={styles.title}>manage room</Heading>

        {showLoading || !record ? (
          <ActivityIndicator color={Palette.accent} style={styles.loading} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <Text style={styles.field}>room name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={handleRename}
              placeholderTextColor={Palette.faint}
              style={[styles.input, name.length > 0 && styles.inputFocused]}
            />

            <Text style={styles.field}>currency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyRow}>
              {currencies.map((code) => (
                <Pressable
                  key={code}
                  disabled={code === record.currencyCode}
                  onPress={() => withBusy(() => updateRoom(record.id, { currencyCode: code }))}
                  style={[styles.currencyChip, code === record.currencyCode && styles.currencyChipActive]}
                >
                  <Text
                    style={[styles.currencyChipText, code === record.currencyCode && styles.currencyChipTextActive]}
                  >
                    {code}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.field}>members</Text>
            <View style={styles.members}>
              {record.members.map((member, index) => {
                const memberRole = roomRole(record, member.id);
                const isSelf = member.id === user?.uid;
                const canRemove =
                  !isSelf && memberRole !== 'owner' && (isOwner || (isAdmin && memberRole !== 'admin'));
                const canCycleRole = isOwner && memberRole !== 'owner';
                const canTransfer = isOwner && !isSelf;

                return (
                  <View key={member.id} style={styles.memberRow}>
                    <Avatar name={member.name} size={36} index={index} />
                    <View style={styles.memberBody}>
                      <Text style={styles.memberName}>
                        {member.name}
                        {isSelf ? ' (you)' : ''}
                      </Text>
                      <Pressable
                        disabled={!canCycleRole || busy}
                        onPress={() => handleCycleRole(member.id, memberRole as RoomMemberRole)}
                      >
                        <Pill background={Palette.accentLight} color={Palette.onPrimaryContainer}>
                          {ROLE_LABEL[memberRole] ?? memberRole}
                          {canCycleRole ? '  ·  tap to change' : ''}
                        </Pill>
                      </Pressable>
                    </View>

                    {canTransfer && (
                      <Pressable
                        disabled={busy}
                        onPress={() => handleTransfer(member.id, member.name)}
                        style={styles.memberAction}
                      >
                        <Text style={styles.memberActionText}>make owner</Text>
                      </Pressable>
                    )}
                    {canRemove && (
                      <Pressable
                        disabled={busy}
                        onPress={() => handleRemove(member.id, member.name)}
                        style={styles.memberAction}
                      >
                        <Text style={[styles.memberActionText, styles.memberActionDanger]}>remove</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>

            {isOwner && (
              <Pressable
                style={styles.rolesToggle}
                disabled={busy}
                onPress={() =>
                  user && withBusy(() => setRolesEnabled(record, !record.settings.rolesEnabled, user))
                }
              >
                <Text style={styles.toggleLabel}>
                  {record.settings.rolesEnabled ? 'roles enforced' : 'everyone can edit'}
                </Text>
                <ChevronIcon size={16} color={Palette.accent} />
              </Pressable>
            )}

            {actorRole !== 'owner' && actorRole !== null && (
              <Pressable
                disabled={busy}
                onPress={handleLeave}
                style={({ pressed }) => [styles.dangerRow, pressed && styles.pressed]}
              >
                <Text style={styles.dangerText}>leave room</Text>
              </Pressable>
            )}

            <Pressable
              disabled={busy}
              onPress={handleShareInvite}
              style={({ pressed }) => [styles.inviteRow, pressed && styles.pressed]}
            >
              <Text style={styles.inviteText}>share invite link</Text>
            </Pressable>

            <Pressable
              disabled={busy}
              onPress={handleToggleQr}
              style={({ pressed }) => [styles.inviteRow, pressed && styles.pressed]}
            >
              <Text style={styles.inviteText}>{qrVisible ? 'hide qr code' : 'show qr code'}</Text>
            </Pressable>

            {qrVisible && inviteLink && (
              <View style={styles.qrWrap}>
                <View style={styles.qrCard}>
                  <QRCode value={inviteLink} size={180} backgroundColor="#ffffff" color={Palette.ink} />
                </View>
                <Text style={styles.qrHint}>scan to join &ldquo;{record.name}&rdquo;</Text>
              </View>
            )}

            {isOwner && (
              <Pressable
                disabled={busy}
                onPress={handleDelete}
                style={({ pressed }) => [styles.dangerRow, pressed && styles.pressed]}
              >
                <Text style={styles.dangerText}>delete room</Text>
              </Pressable>
            )}

            {error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>
        )}
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
    maxHeight: '85%',
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
  loading: {
    marginVertical: Spacing.six,
  },
  scroll: {
    marginBottom: Spacing.three,
  },
  field: {
    fontFamily: FontFamily.regular,
    fontSize: 17,
    color: Palette.ink,
    marginBottom: Spacing.two,
  },
  input: {
    height: 56,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.line,
    backgroundColor: Palette.surfaceRaised,
    paddingHorizontal: Spacing.pad,
    marginBottom: Spacing.four,
    fontFamily: FontFamily.regular,
    fontSize: 18,
    color: Palette.ink,
  },
  inputFocused: {
    borderColor: Palette.accent,
  },
  currencyRow: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  currencyChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.line,
    backgroundColor: Palette.surfaceRaised,
  },
  currencyChipActive: {
    borderColor: Palette.accent,
    backgroundColor: Palette.accentLight,
  },
  currencyChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Palette.muted,
  },
  currencyChipTextActive: {
    color: Palette.accent,
  },
  members: {
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  memberBody: {
    flex: 1,
    gap: Spacing.one,
  },
  memberName: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Palette.ink,
  },
  memberAction: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  memberActionText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Palette.accent,
  },
  memberActionDanger: {
    color: Palette.neg,
  },
  rolesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Palette.hairline,
  },
  toggleLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Palette.ink,
  },
  inviteRow: {
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Palette.hairline,
  },
  inviteText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Palette.accent,
  },
  qrWrap: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: Palette.hairline,
  },
  qrCard: {
    padding: Spacing.three,
    borderRadius: Radius.control,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  qrHint: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Palette.muted,
  },
  dangerRow: {
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Palette.hairline,
  },
  dangerText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Palette.neg,
  },
  error: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Palette.neg,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
