import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/authStore';
import { useEventStore } from '../../store/eventStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { MainStackParams } from '../../navigation';
import { Event } from '../../types';
import { daysUntilEvent } from '../../utils/dateUtils';

export default function ProDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const { profile } = useAuthStore();
  const { events, checklistItems, loadEvents, setActiveEvent, createEvent } = useEventStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const isPro = profile?.tier === 'pro';
  const clientEvents = events.filter(e => e.planner_id === profile?.id || e.owner_id === profile?.id);

  useEffect(() => {
    if (profile?.id) loadEvents(profile.id);
  }, [profile?.id]);

  const onRefresh = async () => {
    if (!profile?.id) return;
    setRefreshing(true);
    await loadEvents(profile.id);
    setRefreshing(false);
  };

  const handleOpenClient = async (event: Event) => {
    await setActiveEvent(event.id);
    navigation.navigate('ClientDetail', { eventId: event.id });
  };

  if (!isPro) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🗂️</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 8, textAlign: 'center' }}>Pro Feature</Text>
          <Text style={{ fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
            Client management is available on the Pro plan for professional wedding planners.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#9B59B6', borderRadius: 50, paddingVertical: 14, paddingHorizontal: 32 }}
            onPress={() => navigation.navigate('Upgrade')}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Clients</Text>
          <Text style={styles.subtitle}>{clientEvents.length} active events</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addBtnText}>+ Client</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={clientEvents}
        keyExtractor={e => e.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <ClientCard
            event={item}
            taskCount={checklistItems.filter(t => t.event_id === item.id).length}
            completedCount={checklistItems.filter(t => t.event_id === item.id && t.is_completed).length}
            onPress={() => handleOpenClient(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👰</Text>
            <Text style={styles.emptyTitle}>No clients yet</Text>
            <Text style={styles.emptyText}>Tap "+ Client" to add your first client event.</Text>
          </View>
        }
      />

      <AddClientModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={async (clientName, eventName, eventDate, budget) => {
          if (!profile) return;
          const result = await createEvent(
            { event_type: 'wedding', event_name: eventName, event_date: eventDate || undefined, total_budget: budget || undefined },
            profile.id,
            profile.tier
          );
          if (result.error === 'upgrade_required') {
            Alert.alert('Upgrade Required', 'Upgrade to Pro to manage multiple client events.');
          } else if (result.id) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowAddModal(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

function ClientCard({ event, taskCount, completedCount, onPress }: {
  event: Event;
  taskCount: number;
  completedCount: number;
  onPress: () => void;
}) {
  const daysUntil = daysUntilEvent(event.event_date);
  const pct = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <View style={styles.cardAvatar}>
          <Text style={styles.cardAvatarText}>{event.event_name[0].toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{event.event_name}</Text>
          {event.client_name && (
            <Text style={styles.cardClient}>{event.client_name}</Text>
          )}
          {daysUntil !== null && (
            <Text style={styles.cardDays}>
              {daysUntil > 0 ? `${daysUntil} days away` : 'Wedding day!'}
            </Text>
          )}
        </View>
        <View style={styles.cardPct}>
          <Text style={styles.cardPctNum}>{pct}%</Text>
          <Text style={styles.cardPctLabel}>done</Text>
        </View>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>{completedCount}/{taskCount} tasks</Text>
        {event.total_budget && (
          <Text style={styles.cardFooterText}>${event.total_budget.toLocaleString()} budget</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function AddClientModal({ visible, onClose, onSave }: {
  visible: boolean;
  onClose: () => void;
  onSave: (clientName: string, eventName: string, eventDate: string, budget: number | null) => void;
}) {
  const [clientName, setClientName] = useState('');
  const [eventName, setEventName] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [budget, setBudget] = useState('');

  const reset = () => {
    setClientName(''); setEventName(''); setMonth(''); setDay(''); setYear(''); setBudget('');
  };

  const getDate = () => {
    if (month && day && year.length === 4) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return '';
  };

  const handleSave = () => {
    if (!eventName) return;
    onSave(clientName, eventName, getDate(), budget ? parseFloat(budget) : null);
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Client Event</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalSave, !eventName && { opacity: 0.4 }]}>Create</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Client Name</Text>
            <TextInput style={styles.modalInput} value={clientName} onChangeText={setClientName}
              placeholder="e.g. Emily & Charles" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />

            <Text style={styles.modalLabel}>Event Name *</Text>
            <TextInput style={styles.modalInput} value={eventName} onChangeText={setEventName}
              placeholder="e.g. Smith Wedding" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />

            <Text style={styles.modalLabel}>Wedding Date</Text>
            <View style={styles.dateRow}>
              <TextInput style={[styles.modalInput, styles.dateInput]} value={month} onChangeText={t => setMonth(t.replace(/\D/g, '').slice(0, 2))}
                placeholder="MM" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" maxLength={2} />
              <Text style={styles.dateSep}>/</Text>
              <TextInput style={[styles.modalInput, styles.dateInput]} value={day} onChangeText={t => setDay(t.replace(/\D/g, '').slice(0, 2))}
                placeholder="DD" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" maxLength={2} />
              <Text style={styles.dateSep}>/</Text>
              <TextInput style={[styles.modalInput, styles.yearInput]} value={year} onChangeText={t => setYear(t.replace(/\D/g, '').slice(0, 4))}
                placeholder="YYYY" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" maxLength={4} />
            </View>

            <Text style={styles.modalLabel}>Total Budget ($)</Text>
            <TextInput style={styles.modalInput} value={budget} onChangeText={setBudget}
              placeholder="e.g. 25000" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  title: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sizes.sm, color: Colors.textMuted, marginTop: 2 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  addBtnText: { color: Colors.white, fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.sm },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  cardAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  cardAvatarText: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  cardInfo: { flex: 1 },
  cardName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  cardClient: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 1 },
  cardDays: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.medium, marginTop: 2 },
  cardPct: { alignItems: 'center' },
  cardPctNum: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  cardPctLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: Radius.full, marginBottom: Spacing.sm },
  progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: Radius.full },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardFooterText: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.sizes.md, color: Colors.textMuted, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  modalCancel: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  modalTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  modalSave: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.primary },
  modalScroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  modalLabel: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  modalInput: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dateInput: { flex: 1, textAlign: 'center', paddingHorizontal: Spacing.sm },
  yearInput: { flex: 1.5, textAlign: 'center' },
  dateSep: { fontSize: Typography.sizes.lg, color: Colors.textMuted, fontWeight: Typography.weights.bold },
});
