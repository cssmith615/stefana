import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { useEventStore } from '../../store/eventStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { MainStackParams } from '../../navigation';
import { useTheme } from '../../context/ThemeContext';
import { SafeAreaView as SAV } from 'react-native-safe-area-context';
import { EventType } from '../../types';
import { daysUntilEvent, toDateOnlyString } from '../../utils/dateUtils';

export default function DashboardScreen() {
  const { profile } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const { bottom } = useSafeAreaInsets();
  const tabBarHeight = 60 + bottom;
  const palette = useTheme();
  const { events, checklistItems, expenses, guests, vendors, timelineEvents, moodboardItems, activeEventId, loadEvents, setActiveEvent, createEvent, seedChecklistFromTemplate } = useEventStore();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [nameBannerDismissed, setNameBannerDismissed] = useState(false);

  const activeEvent = events.find(e => e.id === activeEventId);

  useEffect(() => {
    if (profile?.id) {
      loadEvents(profile.id).then(() => {
        const store = useEventStore.getState();
        if (store.events.length > 0 && !store.activeEventId) {
          setActiveEvent(store.events[0].id);
        }
      });
    }
  }, [profile?.id]);

  // Derived values
  const daysUntil = daysUntilEvent(activeEvent?.event_date ?? null);

  const totalTasks = checklistItems.length;
  const completedTasks = checklistItems.filter(i => i.is_completed).length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const budgetSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const budgetTotal = activeEvent?.total_budget ?? 0;
  const budgetPct = budgetTotal > 0 ? Math.min(Math.round((budgetSpent / budgetTotal) * 100), 100) : 0;

  const attendingCount = guests.filter(g => g.rsvp_status === 'attending').length;
  const noResponseCount = guests.filter(g => g.rsvp_status === 'no_response').length;

  const urgentTasks = checklistItems
    .filter(i => !i.is_completed && i.due_date)
    .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1))
    .slice(0, 3);

  // Setup checklist steps
  const setupSteps = [
    { key: 'date',     label: 'Set your wedding date',     done: !!activeEvent?.event_date,       screen: 'EventSettings', params: { eventId: activeEventId ?? '' } },
    { key: 'budget',   label: 'Set your budget',           done: !!activeEvent?.total_budget,     screen: 'EventSettings', params: { eventId: activeEventId ?? '' } },
    { key: 'guest',    label: 'Add your first guest',      done: guests.length > 0,               screen: 'GuestList',     params: undefined },
    { key: 'vendor',   label: 'Add a vendor',              done: vendors.length > 0,              screen: 'Vendors',       params: undefined },
    { key: 'timeline', label: 'Build your day-of timeline',done: timelineEvents.length > 0,       screen: 'DayOfTimeline', params: undefined },
    { key: 'moodboard',label: 'Add inspiration photos',   done: moodboardItems.length > 0,       screen: 'Moodboard',     params: undefined },
  ];
  const setupDone = setupSteps.filter(s => s.done).length;
  const showSetup = setupDone < setupSteps.length && setupDone < 5;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + Spacing.lg }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {profile?.display_name?.split(' ')[0]?.replace(/@.*/, '') ?? 'there'} 👋</Text>
          <View style={styles.headerRight}>
            <Text style={[styles.wordmark, { color: palette.primary }]}>Stefana</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.gearButton}>
              <Ionicons name="settings-outline" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Name nudge banner */}
        {profile?.display_name === 'User' && !nameBannerDismissed && (
          <TouchableOpacity
            style={[styles.featureBanner, { borderColor: palette.primary + '44', marginBottom: Spacing.md }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={[styles.bannerIconWrap, { backgroundColor: palette.primary + '18' }]}>
              <Text style={styles.bannerEmoji}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Tell us your name</Text>
              <Text style={styles.bannerSub}>Personalize your Stefana experience</Text>
            </View>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); setNameBannerDismissed(true); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Hero countdown card */}
        <LinearGradient
          colors={palette.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <TouchableOpacity style={styles.heroEventNameRow} onPress={() => setShowSwitcher(true)}>
            <Text style={styles.heroEventName}>{activeEvent?.event_name ?? 'Your Wedding'}</Text>
            <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4, marginTop: 1 }} />
          </TouchableOpacity>
          {daysUntil !== null ? (
            <>
              <Text style={styles.heroDays}>{daysUntil}</Text>
              <Text style={styles.heroDaysLabel}>days to go</Text>
            </>
          ) : (
            <Text style={styles.heroNoDate}>Set your wedding date to start the countdown</Text>
          )}
          <View style={styles.heroProgressBar}>
            <View style={[styles.heroProgressFill, { width: `${completionPct}%` }]} />
          </View>
          <Text style={styles.heroProgressLabel}>{completionPct}% planned</Text>
        </LinearGradient>

        {/* Setup checklist */}
        {showSetup && (
          <View style={styles.setupCard}>
            <View style={styles.setupHeader}>
              <Text style={styles.setupTitle}>Get started</Text>
              <Text style={styles.setupProgress}>{setupDone}/{setupSteps.length} done</Text>
            </View>
            <View style={styles.setupBar}>
              <View style={[styles.setupBarFill, { width: `${(setupDone / setupSteps.length) * 100}%`, backgroundColor: palette.primary }]} />
            </View>
            {setupSteps.map(step => (
              <TouchableOpacity
                key={step.key}
                style={styles.setupRow}
                onPress={() => navigation.navigate(step.screen as any, step.params as any)}
              >
                <View style={[styles.setupCheck, step.done && { backgroundColor: palette.primary, borderColor: palette.primary }]}>
                  {step.done && <Text style={styles.setupCheckMark}>✓</Text>}
                </View>
                <Text style={[styles.setupLabel, step.done && styles.setupLabelDone]}>{step.label}</Text>
                {!step.done && <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedTasks}/{totalTasks}</Text>
            <Text style={styles.statLabel}>Tasks done</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {budgetTotal > 0 ? `$${Math.round(budgetSpent / 1000)}k` : '—'}
            </Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{attendingCount}</Text>
            <Text style={styles.statLabel}>Attending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{noResponseCount}</Text>
            <Text style={styles.statLabel}>Awaiting RSVP</Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          {[
            { emoji: '💐', label: 'Wedding Party', screen: 'WeddingParty' },
            { emoji: '👥', label: 'Guests',         screen: 'GuestList' },
            { emoji: '📋', label: 'My Tasks',       screen: 'AssigneePortal' },
            { emoji: '🤖', label: 'AI Assistant',   screen: 'AIAssistant' },
          ].map(({ emoji, label, screen }) => (
            <TouchableOpacity
              key={screen}
              style={styles.quickCard}
              onPress={() => navigation.navigate(screen as any)}
            >
              <Text style={styles.quickEmoji}>{emoji}</Text>
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {profile?.role === 'planner' && (
          <TouchableOpacity style={styles.plannerCard} onPress={() => navigation.navigate('ProDashboard' as any)}>
            <Text style={styles.quickEmoji}>👔</Text>
            <Text style={styles.quickLabel}>Clients</Text>
          </TouchableOpacity>
        )}

        {/* Feature banners */}
        <TouchableOpacity
          style={[styles.featureBanner, { borderColor: palette.primary + '44' }]}
          onPress={() => navigation.navigate('DayOfTimeline' as any)}
        >
          <View style={[styles.bannerIconWrap, { backgroundColor: palette.primary + '18' }]}>
            <Text style={styles.bannerEmoji}>🗓️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Day-of Timeline</Text>
            <Text style={styles.bannerSub}>Build your hour-by-hour schedule</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.featureBanner, { borderColor: palette.primary + '44' }]}
          onPress={() => navigation.navigate('Moodboard' as any)}
        >
          <View style={[styles.bannerIconWrap, { backgroundColor: palette.primary + '18' }]}>
            <Text style={styles.bannerEmoji}>🌸</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Inspiration Board</Text>
            <Text style={styles.bannerSub}>Save photos for your wedding vision</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.featureBanner, { borderColor: palette.primary + '44' }]}
          onPress={() => navigation.navigate('Registries' as any)}
        >
          <View style={[styles.bannerIconWrap, { backgroundColor: palette.primary + '18' }]}>
            <Text style={styles.bannerEmoji}>🎁</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Gift Registries</Text>
            <Text style={styles.bannerSub}>Keep all your registry links in one place</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.featureBanner, { borderColor: palette.primary + '44' }]}
          onPress={() => navigation.navigate('SongWishlist' as any)}
        >
          <View style={[styles.bannerIconWrap, { backgroundColor: palette.primary + '18' }]}>
            <Text style={styles.bannerEmoji}>🎵</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Song Wishlist</Text>
            <Text style={styles.bannerSub}>Plan your music from first dance to last</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Urgent tasks */}
        {urgentTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Up next</Text>
            {urgentTasks.map(task => (
              <View key={task.id} style={styles.taskCard}>
                <View style={[styles.taskDot, { backgroundColor: palette.primary }]} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.due_date && (
                    <Text style={styles.taskDue}>
                      Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Budget bar */}
        {budgetTotal > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget</Text>
            <View style={styles.budgetCard}>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetSpent}>${budgetSpent.toLocaleString()} spent</Text>
                <Text style={styles.budgetTotal}>of ${budgetTotal.toLocaleString()}</Text>
              </View>
              <View style={styles.budgetBar}>
                <View
                  style={[
                    styles.budgetFill,
                    { width: `${budgetPct}%`, backgroundColor: palette.primary },
                    budgetPct > 90 && { backgroundColor: Colors.error },
                  ]}
                />
              </View>
              <Text style={styles.budgetRemaining}>
                ${(budgetTotal - budgetSpent).toLocaleString()} remaining
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Event Switcher */}
      <Modal visible={showSwitcher} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSwitcher(false)}>
        <SAV style={sw.safe} edges={['top', 'bottom']}>
          <View style={sw.header}>
            <Text style={sw.title}>My Events</Text>
            <TouchableOpacity onPress={() => setShowSwitcher(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={events}
            keyExtractor={e => e.id}
            contentContainerStyle={{ padding: Spacing.lg }}
            renderItem={({ item }) => {
              const isActive = item.id === activeEventId;
              return (
                <TouchableOpacity
                  style={[sw.eventRow, isActive && { borderColor: palette.primary, backgroundColor: palette.primary + '0A' }]}
                  onPress={async () => {
                    if (!isActive) await setActiveEvent(item.id);
                    setShowSwitcher(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[sw.eventName, isActive && { color: palette.primary }]}>{item.event_name}</Text>
                    <Text style={sw.eventDate}>
                      {item.event_date
                        ? new Date(item.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : 'No date set'}
                    </Text>
                  </View>
                  {isActive && <Ionicons name="checkmark-circle" size={22} color={palette.primary} />}
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              <TouchableOpacity
                style={[sw.newBtn, { borderColor: palette.primary }]}
                onPress={() => {
                  setShowSwitcher(false);
                  if (profile?.tier === 'free' && events.length >= 1) {
                    Alert.alert('Upgrade to Premium', 'Create unlimited events with Premium.', [
                      { text: 'Maybe Later', style: 'cancel' },
                      { text: 'Upgrade', onPress: () => navigation.navigate('Upgrade') },
                    ]);
                  } else {
                    setShowNewEvent(true);
                  }
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color={palette.primary} />
                <Text style={[sw.newBtnText, { color: palette.primary }]}>New Event</Text>
              </TouchableOpacity>
            }
          />
        </SAV>
      </Modal>

      {/* New Event Modal */}
      <Modal visible={showNewEvent} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNewEvent(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <NewEventForm
            onClose={() => setShowNewEvent(false)}
            onCreate={async (name, date, eventType, budget) => {
              if (!profile?.id) return;
              const { id, error } = await createEvent(
                { event_name: name, event_type: eventType, event_date: date || undefined, total_budget: budget || undefined },
                profile.id,
                profile.tier,
              );
              if (error) { Alert.alert('Error', error); return; }
              if (id) {
                await seedChecklistFromTemplate(id, date || null);
                await setActiveEvent(id);
              }
              setShowNewEvent(false);
            }}
          />
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

// ─── New Event Form ───────────────────────────────────────────────────────────

const EVENT_TYPES: { value: EventType; label: string; emoji: string }[] = [
  { value: 'wedding',     label: 'Wedding',      emoji: '💍' },
  { value: 'baby_shower', label: 'Baby Shower',  emoji: '🍼' },
  { value: 'birthday',    label: 'Birthday',     emoji: '🎂' },
  { value: 'graduation',  label: 'Graduation',   emoji: '🎓' },
  { value: 'corporate',   label: 'Corporate',    emoji: '💼' },
  { value: 'other',       label: 'Other',        emoji: '🎉' },
];

function NewEventForm({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, date: string, type: EventType, budget?: number) => Promise<void>;
}) {
  const palette = useTheme();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [eventType, setEventType] = useState<EventType>('wedding');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Event name required'); return; }
    setSaving(true);
    await onCreate(name.trim(), date, eventType, budget ? parseFloat(budget) : undefined);
    setSaving(false);
  };

  return (
    <SAV style={nef.safe} edges={['top', 'bottom']}>
      <View style={nef.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={nef.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={nef.title}>New Event</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[nef.save, { color: palette.primary }, !name && { opacity: 0.4 }]}>
            {saving ? 'Creating…' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={nef.body} keyboardShouldPersistTaps="handled">
        <Text style={nef.label}>Event Name *</Text>
        <TextInput
          style={nef.input}
          placeholder="e.g. Emily & Jake's Wedding"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={nef.label}>Type</Text>
        <View style={nef.chips}>
          {EVENT_TYPES.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[nef.chip, eventType === t.value && { backgroundColor: palette.primary, borderColor: palette.primary }]}
              onPress={() => setEventType(t.value)}
            >
              <Text style={[nef.chipText, eventType === t.value && { color: Colors.white }]}>
                {t.emoji} {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={nef.label}>Date (optional)</Text>
        <TextInput
          style={nef.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textMuted}
          value={date}
          onChangeText={setDate}
          keyboardType="numbers-and-punctuation"
        />

        <Text style={nef.label}>Budget (optional)</Text>
        <TextInput
          style={nef.input}
          placeholder="e.g. 25000"
          placeholderTextColor={Colors.textMuted}
          value={budget}
          onChangeText={setBudget}
          keyboardType="decimal-pad"
        />
      </ScrollView>
    </SAV>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  greeting: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  wordmark: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.black,
    color: Colors.primary,
    letterSpacing: 1,
  },
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadow.lg,
  },
  heroEventNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroEventName: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: Typography.weights.medium,
  },
  heroDays: {
    fontSize: 72,
    fontWeight: Typography.weights.black,
    color: Colors.white,
    lineHeight: 76,
  },
  heroDaysLabel: {
    fontSize: Typography.sizes.lg,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.xl,
  },
  heroNoDate: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.xl,
    lineHeight: Typography.sizes.md * 1.5,
  },
  heroProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  heroProgressFill: {
    height: 6,
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
  },
  heroProgressLabel: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  taskDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary, // overridden inline with palette
    marginRight: Spacing.md,
  },
  taskInfo: { flex: 1 },
  taskTitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
  },
  taskDue: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  budgetCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  budgetSpent: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  budgetTotal: {
    fontSize: Typography.sizes.md,
    color: Colors.textMuted,
  },
  budgetBar: {
    height: 8,
    backgroundColor: Colors.cream,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  budgetFill: {
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  setupCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadow.sm,
  },
  setupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  setupTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  setupProgress: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  setupBar: { height: 4, backgroundColor: Colors.cream, borderRadius: Radius.full, marginBottom: Spacing.md },
  setupBarFill: { height: 4, borderRadius: Radius.full },
  setupRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  setupCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  setupCheckMark: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  setupLabel: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.textPrimary },
  setupLabelDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  gearButton: { padding: 4 },
  quickRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  quickCard: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', ...Shadow.sm },
  plannerCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg, ...Shadow.sm },
  quickEmoji: { fontSize: 24, marginBottom: 4 },
  quickLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium, textAlign: 'center' },
  budgetRemaining: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  featureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  bannerIconWrap: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerEmoji: { fontSize: 22 },
  bannerTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  bannerSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

// ─── Event Switcher styles ────────────────────────────────────────────────────
const sw = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  eventRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border,
    ...Shadow.sm,
  },
  eventName: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  eventDate: { fontSize: Typography.sizes.sm, color: Colors.textMuted, marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.lg,
    borderWidth: 1.5, borderStyle: 'dashed', marginTop: Spacing.sm,
  },
  newBtnText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
});

// ─── New Event Form styles ────────────────────────────────────────────────────
const nef = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  cancel: { fontSize: Typography.sizes.md, color: Colors.textMuted },
  save: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
  body: { padding: Spacing.lg, gap: Spacing.sm },
  label: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, marginBottom: 4, marginTop: Spacing.sm },
  input: {
    backgroundColor: Colors.white, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.md, color: Colors.textPrimary,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full, backgroundColor: Colors.cream,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
});
