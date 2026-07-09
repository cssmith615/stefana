import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useEventStore } from '../../store/eventStore';
import {
  loadPrefs, savePrefs, requestPermission, getPermissionStatus,
  scheduleAll, cancelAllNotifications, NotifPrefs, DEFAULT_PREFS,
} from '../../utils/notifications';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';

const DAYS_OPTIONS = [1, 3, 7] as const;

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { events, activeEventId, checklistItems } = useEventStore();
  const activeEvent = events.find(e => e.id === activeEventId);

  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [permStatus, setPermStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastScheduled, setLastScheduled] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [p, status] = await Promise.all([loadPrefs(), getPermissionStatus()]);
      setPrefs(p);
      setPermStatus(status);
      setLoading(false);
    })();
  }, []);

  const handleToggle = (key: keyof NotifPrefs, value: boolean | number) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setLastScheduled(null);
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    setPermStatus(granted ? 'granted' : 'denied');
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications for Stefana in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const handleSave = async () => {
    if (permStatus !== 'granted') {
      const granted = await requestPermission();
      setPermStatus(granted ? 'granted' : 'denied');
      if (!granted) {
        Alert.alert('Permission Denied', 'Enable notifications in Settings to use this feature.');
        return;
      }
    }

    setSaving(true);
    await savePrefs(prefs);

    const anyEnabled = prefs.taskReminders || prefs.countdown || prefs.milestones || prefs.rsvpNudge;
    if (anyEnabled) {
      const count = await scheduleAll(
        prefs,
        checklistItems,
        activeEvent?.event_date ?? null,
        activeEvent?.event_name ?? 'Your Wedding',
      );
      setLastScheduled(count);
    } else {
      await cancelAllNotifications();
      setLastScheduled(0);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Permission banner */}
        {permStatus !== 'granted' && (
          <TouchableOpacity style={styles.permBanner} onPress={handleRequestPermission}>
            <Ionicons name="notifications-off-outline" size={22} color={Colors.white} />
            <View style={styles.permText}>
              <Text style={styles.permTitle}>Notifications are off</Text>
              <Text style={styles.permSub}>Tap to enable so Stefana can remind you</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        )}

        {/* Task reminders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="checkbox-outline" size={20} color={Colors.primary} style={styles.rowIcon} />
                <View>
                  <Text style={styles.rowLabel}>Task Due Reminders</Text>
                  <Text style={styles.rowSub}>Get reminded before tasks are due</Text>
                </View>
              </View>
              <Switch
                value={prefs.taskReminders}
                onValueChange={v => handleToggle('taskReminders', v)}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor={Colors.white}
              />
            </View>

            {prefs.taskReminders && (
              <>
                <View style={styles.divider} />
                <View style={styles.subRow}>
                  <Text style={styles.subLabel}>Remind me</Text>
                  <View style={styles.chipRow}>
                    {DAYS_OPTIONS.map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.chip, prefs.taskDaysBefore === d && styles.chipActive]}
                        onPress={() => handleToggle('taskDaysBefore', d)}
                      >
                        <Text style={[styles.chipText, prefs.taskDaysBefore === d && styles.chipTextActive]}>
                          {d} {d === 1 ? 'day' : 'days'} before
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Countdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wedding Day</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} style={styles.rowIcon} />
                <View>
                  <Text style={styles.rowLabel}>Weekly Countdown</Text>
                  <Text style={styles.rowSub}>
                    {activeEvent?.event_date
                      ? 'Weekly reminders as your date approaches'
                      : 'Set a wedding date to enable'}
                  </Text>
                </View>
              </View>
              <Switch
                value={prefs.countdown}
                onValueChange={v => handleToggle('countdown', v)}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor={Colors.white}
                disabled={!activeEvent?.event_date}
              />
            </View>
          </View>
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="flag-outline" size={20} color={Colors.primary} style={styles.rowIcon} />
                <View>
                  <Text style={styles.rowLabel}>Planning Milestones</Text>
                  <Text style={styles.rowSub}>Alerts at 6mo · 3mo · 1mo · 2wk · 1wk · 1 day out</Text>
                </View>
              </View>
              <Switch
                value={prefs.milestones}
                onValueChange={v => handleToggle('milestones', v)}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor={Colors.white}
                disabled={!activeEvent?.event_date}
              />
            </View>
          </View>
        </View>

        {/* RSVP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guests</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="people-outline" size={20} color={Colors.primary} style={styles.rowIcon} />
                <View>
                  <Text style={styles.rowLabel}>RSVP Follow-up Nudges</Text>
                  <Text style={styles.rowSub}>Reminders at 6mo, 3mo, and 6 weeks out</Text>
                </View>
              </View>
              <Switch
                value={prefs.rsvpNudge}
                onValueChange={v => handleToggle('rsvpNudge', v)}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor={Colors.white}
                disabled={!activeEvent?.event_date}
              />
            </View>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={Colors.white} />
            : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                <Text style={styles.saveBtnText}>Save & Schedule</Text>
              </>
            )
          }
        </TouchableOpacity>

        {lastScheduled !== null && (
          <View style={styles.successRow}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
            <Text style={styles.successText}>
              {lastScheduled === 0
                ? 'All notifications cleared.'
                : `${lastScheduled} notification${lastScheduled !== 1 ? 's' : ''} scheduled.`}
            </Text>
          </View>
        )}

        <Text style={styles.note}>
          Notifications are scheduled locally on your device. They will fire even if you close the app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, paddingTop: Spacing.lg },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  permText: { flex: 1 },
  permTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.white },
  permSub: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: Spacing.md },
  rowIcon: { marginRight: Spacing.md },
  rowLabel: { fontSize: Typography.sizes.md, color: Colors.textPrimary, fontWeight: Typography.weights.medium },
  rowSub: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
  subRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  subLabel: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  chipText: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  chipTextActive: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  saveBtnText: { color: Colors.white, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  successText: { fontSize: Typography.sizes.sm, color: Colors.primary },
  note: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: Typography.sizes.xs * 1.6,
  },
});
