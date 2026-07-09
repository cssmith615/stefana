import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useEventStore } from '../../store/eventStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { MainStackParams } from '../../navigation';

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  premium: 'Premium',
  pro: 'Pro',
};

const TIER_COLORS: Record<string, string> = {
  free: Colors.textMuted,
  premium: Colors.primary,
  pro: '#9B59B6',
};

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const { profile, user, updateProfile, signOut } = useAuthStore();
  const { activeEventId, events } = useEventStore();

  const activeEvent = events.find(e => e.id === activeEventId);

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);

  const initials = (profile?.display_name ?? 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    const { error } = await updateProfile({ display_name: displayName.trim() });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setEditing(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all wedding data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { deleteAccount } = useAuthStore.getState();
            const { error } = await deleteAccount();
            if (error) Alert.alert('Error', error);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)}>
          <Text style={styles.editBtn}>{editing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {editing ? (
            <View style={styles.nameRow}>
              <TextInput
                style={styles.nameInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.saveBtn, (!displayName.trim() || saving) && { opacity: 0.4 }]}
                onPress={handleSave}
                disabled={!displayName.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.saveBtnText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.displayName}>{profile?.display_name}</Text>
          )}
          <Text style={styles.email}>{user?.email}</Text>

          {/* Tier badge */}
          <View style={[styles.tierBadge, { borderColor: TIER_COLORS[profile?.tier ?? 'free'] }]}>
            <Text style={[styles.tierText, { color: TIER_COLORS[profile?.tier ?? 'free'] }]}>
              {TIER_LABELS[profile?.tier ?? 'free']} Plan
            </Text>
          </View>
        </View>

        {/* Upgrade banner for free users */}
        {profile?.tier === 'free' && (
          <TouchableOpacity style={styles.upgradeBanner} onPress={() => navigation.navigate('Upgrade')}>
            <View>
              <Text style={styles.upgradeTitle}>Unlock Premium</Text>
              <Text style={styles.upgradeSubtitle}>Wedding party, custom tasks & more</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        )}

        {/* Event settings */}
        {activeEvent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wedding</Text>
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('EventSettings', { eventId: activeEvent.id })}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} style={styles.rowIcon} />
                <View>
                  <Text style={styles.rowLabel}>{activeEvent.event_name}</Text>
                  <Text style={styles.rowSub}>
                    {activeEvent.event_date
                      ? new Date(activeEvent.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'No date set'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Notifications')}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Upgrade')}>
            <View style={styles.rowLeft}>
              <Ionicons name="diamond-outline" size={20} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Subscription</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowBadge}>{TIER_LABELS[profile?.tier ?? 'free']}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Legal */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://cssmith615.github.io/stefana')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://cssmith615.github.io/stefana/support.html')}>
            <Text style={styles.legalLink}>Support</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Stefana v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  back: { fontSize: Typography.sizes.md, color: Colors.primary, width: 60 },
  headerTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  editBtn: { fontSize: Typography.sizes.md, color: Colors.primary, width: 60, textAlign: 'right' },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: Typography.weights.bold, color: Colors.white },
  displayName: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: 4 },
  email: { fontSize: Typography.sizes.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  nameInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  saveBtnText: { color: Colors.white, fontWeight: Typography.weights.bold, fontSize: Typography.sizes.sm },
  tierBadge: {
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
  },
  tierText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  upgradeTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.white },
  upgradeSubtitle: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xs,
    ...Shadow.sm,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: { marginRight: Spacing.md },
  rowLabel: { fontSize: Typography.sizes.md, color: Colors.textPrimary, fontWeight: Typography.weights.medium },
  rowSub: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rowBadge: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  signOutText: { fontSize: Typography.sizes.md, color: Colors.error, fontWeight: Typography.weights.medium },
  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  legalLink: { fontSize: Typography.sizes.xs, color: Colors.primary },
  legalDot: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  deleteBtn: { alignItems: 'center', paddingVertical: Spacing.sm, marginBottom: Spacing.md },
  deleteText: { fontSize: Typography.sizes.xs, color: Colors.error },
  version: { textAlign: 'center', fontSize: Typography.sizes.xs, color: Colors.textMuted },
});
