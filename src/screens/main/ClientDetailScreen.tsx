import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useEventStore } from '../../store/eventStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { MainStackParams } from '../../navigation';
import { daysUntilEvent } from '../../utils/dateUtils';
import ChecklistScreen from './ChecklistScreen';
import BudgetScreen from './BudgetScreen';
import VendorsScreen from './VendorsScreen';
import GuestListScreen from './GuestListScreen';

type Tab = 'Checklist' | 'Budget' | 'Vendors' | 'Guests';
const TABS: Tab[] = ['Checklist', 'Budget', 'Vendors', 'Guests'];

export default function ClientDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MainStackParams, 'ClientDetail'>>();
  const { events, checklistItems } = useEventStore();
  const [activeTab, setActiveTab] = useState<Tab>('Checklist');

  const event = events.find(e => e.id === route.params.eventId);
  const completed = checklistItems.filter(i => i.is_completed).length;
  const total = checklistItems.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const daysUntil = daysUntilEvent(event?.event_date ?? null);

  const renderTab = () => {
    switch (activeTab) {
      case 'Checklist': return <ChecklistScreen />;
      case 'Budget':    return <BudgetScreen />;
      case 'Vendors':   return <VendorsScreen />;
      case 'Guests':    return <GuestListScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Clients</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eventName} numberOfLines={1}>{event?.event_name ?? 'Client Event'}</Text>
          {event?.client_name && <Text style={styles.clientName}>{event.client_name}</Text>}
        </View>
        <View style={styles.headerRight}>
          {daysUntil !== null && (
            <Text style={styles.daysAway}>{daysUntil}d</Text>
          )}
        </View>
      </View>

      {/* Progress strip */}
      <View style={styles.progressStrip}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{pct}% planned · {completed}/{total} tasks</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        {renderTab()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  back: { fontSize: Typography.sizes.md, color: Colors.primary, width: 70 },
  headerCenter: { flex: 1, alignItems: 'center' },
  eventName: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  clientName: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  headerRight: { width: 70, alignItems: 'flex-end' },
  daysAway: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.bold },
  progressStrip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: Radius.full, marginBottom: 4 },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: Radius.full },
  progressLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: Typography.sizes.sm, color: Colors.textMuted, fontWeight: Typography.weights.medium },
  tabTextActive: { color: Colors.primary, fontWeight: Typography.weights.bold },
  content: { flex: 1 },
});
