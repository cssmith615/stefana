import React, { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEventStore } from '../../store/eventStore';
import { TimelineCategory, TimelineEvent, CreateTimelineEventInput } from '../../types';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { exportTimelinePdf } from '../../utils/exportUtils';
import { daysUntilEvent } from '../../utils/dateUtils';

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORIES: { value: TimelineCategory; label: string; emoji: string; color: string }[] = [
  { value: 'getting_ready', label: 'Getting Ready', emoji: '💄', color: '#E8A0BF' },
  { value: 'ceremony',      label: 'Ceremony',      emoji: '💍', color: '#C9A96E' },
  { value: 'photos',        label: 'Photos',        emoji: '📸', color: '#9B8AC4' },
  { value: 'cocktail_hour', label: 'Cocktail Hour', emoji: '🥂', color: '#F5A623' },
  { value: 'reception',     label: 'Reception',     emoji: '🎉', color: '#4A90D9' },
  { value: 'travel',        label: 'Travel',        emoji: '🚗', color: '#6DB56D' },
  { value: 'other',         label: 'Other',         emoji: '⭐', color: '#A0A0A0' },
];

const catConfig = (cat: TimelineCategory) =>
  CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[CATEGORIES.length - 1];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function parseTimeInput(raw: string): string | null {
  const cleaned = raw.replace(/\D/g, '');
  if (cleaned.length < 3) return null;
  const h = parseInt(cleaned.slice(0, cleaned.length - 2), 10);
  const m = parseInt(cleaned.slice(-2), 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// ─── Add modal ───────────────────────────────────────────────────────────────

interface AddModalProps {
  eventId: string;
  visible: boolean;
  onClose: () => void;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180];

function AddModal({ eventId, visible, onClose }: AddModalProps) {
  const { addTimelineEvent } = useEventStore();
  const palette = useTheme();

  const [title, setTitle] = useState('');
  const [timeRaw, setTimeRaw] = useState('');
  const [duration, setDuration] = useState(60);
  const [category, setCategory] = useState<TimelineCategory>('other');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(''); setTimeRaw(''); setDuration(60);
    setCategory('other'); setLocation(''); setNotes('');
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Title required'); return; }
    const parsedTime = parseTimeInput(timeRaw);
    if (!parsedTime) { Alert.alert('Enter a valid time (e.g. 1300 for 1:00 PM)'); return; }

    setSaving(true);
    const input: CreateTimelineEventInput = {
      event_id: eventId,
      time: parsedTime,
      title: title.trim(),
      duration_minutes: duration,
      category,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    const { error } = await addTimelineEvent(input);
    setSaving(false);
    if (error) { Alert.alert('Error', error); return; }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={modal.safe} edges={['top', 'bottom']}>
          <View style={modal.header}>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Text style={modal.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={modal.title}>New Event</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[modal.save, { color: palette.primary }]}>{saving ? 'Saving…' : 'Add'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={modal.body} keyboardShouldPersistTaps="handled">
            <Text style={modal.label}>Title</Text>
            <TextInput
              style={modal.input}
              placeholder="e.g. First Dance"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={modal.label}>Time (24-hr, e.g. 1300 for 1:00 PM)</Text>
            <TextInput
              style={modal.input}
              placeholder="1300"
              placeholderTextColor={Colors.textMuted}
              value={timeRaw}
              onChangeText={setTimeRaw}
              keyboardType="numeric"
              maxLength={4}
            />

            <Text style={modal.label}>Duration</Text>
            <View style={modal.chips}>
              {DURATION_PRESETS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[modal.chip, duration === d && { backgroundColor: palette.primary }]}
                  onPress={() => setDuration(d)}
                >
                  <Text style={[modal.chipText, duration === d && { color: Colors.white }]}>
                    {formatDuration(d)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={modal.label}>Category</Text>
            <View style={modal.chips}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[modal.chip, category === c.value && { backgroundColor: c.color }]}
                  onPress={() => setCategory(c.value)}
                >
                  <Text style={[modal.chipText, category === c.value && { color: Colors.white }]}>
                    {c.emoji} {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={modal.label}>Location (optional)</Text>
            <TextInput
              style={modal.input}
              placeholder="e.g. Bridal Suite"
              placeholderTextColor={Colors.textMuted}
              value={location}
              onChangeText={setLocation}
            />

            <Text style={modal.label}>Notes (optional)</Text>
            <TextInput
              style={[modal.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Any details…"
              placeholderTextColor={Colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

interface WeatherDay {
  high: string;
  low: string;
  desc: string;
  icon: string;
  rain: string;
}

async function fetchWeather(location: string, targetDate: string): Promise<WeatherDay | null> {
  try {
    const encoded = encodeURIComponent(location);
    const res = await fetch(`https://wttr.in/${encoded}?format=j1`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = await res.json();
    const days: any[] = json.weather ?? [];
    const match = days.find((d: any) => d.date === targetDate) ?? days[0];
    if (!match) return null;
    const desc = match.hourly?.[4]?.weatherDesc?.[0]?.value ?? match.hourly?.[0]?.weatherDesc?.[0]?.value ?? '';
    const rain = match.hourly?.[4]?.chanceofrain ?? match.hourly?.[0]?.chanceofrain ?? '0';
    const wmoCode = parseInt(match.hourly?.[4]?.weatherCode ?? match.hourly?.[0]?.weatherCode ?? '113');
    let icon = '☀️';
    if (wmoCode >= 200 && wmoCode < 300) icon = '⛈️';
    else if (wmoCode >= 300 && wmoCode < 600) icon = '🌧️';
    else if (wmoCode >= 600 && wmoCode < 700) icon = '❄️';
    else if (wmoCode >= 700 && wmoCode < 800) icon = '🌫️';
    else if (wmoCode === 800) icon = '☀️';
    else if (wmoCode > 800) icon = '⛅';
    return {
      high: match.maxtempF,
      low: match.mintempF,
      desc,
      icon,
      rain,
    };
  } catch {
    return null;
  }
}

export default function DayOfTimelineScreen() {
  const navigation = useNavigation();
  const { bottom } = useSafeAreaInsets();
  const palette = useTheme();
  const { activeEventId, events, timelineEvents, deleteTimelineEvent, seedTimeline } = useEventStore();
  const [showAdd, setShowAdd] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [weather, setWeather] = useState<WeatherDay | null>(null);

  const handleExport = async () => {
    if (!timelineEvents.length) { Alert.alert('No events', 'Add timeline events before exporting.'); return; }
    setExporting(true);
    try {
      await exportTimelinePdf(timelineEvents, activeEvent?.event_name ?? 'Wedding', activeEvent?.event_date ?? null);
    } catch {
      Alert.alert('Export failed', 'Could not export timeline PDF.');
    } finally {
      setExporting(false);
    }
  };

  const activeEvent = events.find(e => e.id === activeEventId);

  const handleDelete = (item: TimelineEvent) => {
    Alert.alert('Delete Event', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTimelineEvent(item.id) },
    ]);
  };

  const handleSeed = async () => {
    if (!activeEventId) return;
    setSeeding(true);
    await seedTimeline(activeEventId);
    setSeeding(false);
  };

  const daysUntil = daysUntilEvent(activeEvent?.event_date ?? null);

  const showWeather = daysUntil !== null && daysUntil >= 0 && daysUntil <= 10;

  useEffect(() => {
    if (!showWeather || !activeEvent?.event_date) return;
    const location = activeEvent.venue_name ?? '';
    if (!location) return;
    fetchWeather(location, activeEvent.event_date).then(setWeather);
  }, [showWeather, activeEvent?.event_date, activeEvent?.venue_name]);

  const weddingDateStr = activeEvent?.event_date
    ? new Date(activeEvent.event_date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Day-of Timeline</Text>
          {weddingDateStr && <Text style={styles.dateLabel}>{weddingDateStr}</Text>}
        </View>
        {timelineEvents.length > 0 && (
          <TouchableOpacity onPress={handleExport} disabled={exporting} style={styles.exportBtn}>
            <Ionicons name="share-outline" size={22} color={palette.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Weather banner — shows within 10 days of wedding */}
      {showWeather && (
        <View style={[styles.weatherBanner, { borderColor: palette.primary + '44', backgroundColor: palette.primary + '0C' }]}>
          {weather ? (
            <>
              <Text style={styles.weatherIcon}>{weather.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.weatherTitle, { color: palette.primary }]}>
                  Wedding Day Forecast
                  {daysUntil === 0 ? ' · Today!' : ` · ${daysUntil} day${daysUntil !== 1 ? 's' : ''} away`}
                </Text>
                <Text style={styles.weatherDesc}>
                  {weather.desc} · {weather.high}°/{weather.low}°F · {weather.rain}% rain
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.weatherIcon}>🌤️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.weatherTitle, { color: palette.primary }]}>
                  Wedding Day is {daysUntil === 0 ? 'Today!' : `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}!`}
                </Text>
                <Text style={styles.weatherDesc}>
                  {activeEvent?.venue_name
                    ? 'Loading forecast…'
                    : 'Add your venue in Event Settings to see the forecast.'}
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Empty state */}
      {timelineEvents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🗓️</Text>
          <Text style={styles.emptyTitle}>No timeline yet</Text>
          <Text style={styles.emptySubtitle}>Build your perfect day hour by hour.</Text>
          <TouchableOpacity
            style={[styles.templateBtn, { backgroundColor: palette.primary }]}
            onPress={handleSeed}
            disabled={seeding}
          >
            <Text style={styles.templateBtnText}>{seeding ? 'Loading…' : 'Use Default Template'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.blankBtn} onPress={() => setShowAdd(true)}>
            <Text style={[styles.blankBtnText, { color: palette.primary }]}>Start from scratch</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {timelineEvents.map((item, index) => {
            const cat = catConfig(item.category);
            const isLast = index === timelineEvents.length - 1;
            return (
              <View key={item.id} style={styles.row}>
                {/* Left: time + line */}
                <View style={styles.timeCol}>
                  <Text style={styles.timeText}>{formatTime(item.time)}</Text>
                  <View style={[styles.dot, { backgroundColor: cat.color }]} />
                  {!isLast && <View style={styles.line} />}
                </View>

                {/* Right: card */}
                <TouchableOpacity
                  style={styles.card}
                  onLongPress={() => handleDelete(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={[styles.catBadge, { backgroundColor: cat.color + '22' }]}>
                      <Text style={[styles.catText, { color: cat.color }]}>{cat.emoji} {cat.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDuration}>{formatDuration(item.duration_minutes)}</Text>
                  {item.location ? (
                    <Text style={styles.cardLocation}>
                      <Ionicons name="location-outline" size={12} color={Colors.textMuted} /> {item.location}
                    </Text>
                  ) : null}
                  {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* FAB */}
      {timelineEvents.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: palette.primary, bottom: bottom + 24 }]}
          onPress={() => setShowAdd(true)}
        >
          <Ionicons name="add" size={28} color={Colors.white} />
        </TouchableOpacity>
      )}

      {activeEventId && (
        <AddModal
          eventId={activeEventId}
          visible={showAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { marginRight: Spacing.sm },
  exportBtn: { padding: Spacing.xs },
  screenTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  dateLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  weatherBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  weatherIcon: { fontSize: 28 },
  weatherTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  weatherDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  scroll: { padding: Spacing.lg },
  row: { flexDirection: 'row', marginBottom: Spacing.md },
  timeCol: { width: 76, alignItems: 'center', paddingTop: 2 },
  timeText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
    marginBottom: 6,
    textAlign: 'center',
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: { width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginLeft: Spacing.sm,
    marginBottom: 0,
    ...Shadow.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: Spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  catText: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium },
  cardDuration: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  cardLocation: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  cardNotes: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  templateBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  templateBtnText: { color: Colors.white, fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.md },
  blankBtn: { padding: Spacing.sm },
  blankBtnText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium },
});

const modal = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  cancel: { fontSize: Typography.sizes.md, color: Colors.textMuted },
  save: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
  body: { padding: Spacing.lg, gap: Spacing.sm },
  label: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, marginBottom: 4, marginTop: Spacing.sm },
  input: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.md,
    color: Colors.textPrimary,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
});
