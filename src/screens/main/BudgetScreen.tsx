import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEventStore } from '../../store/eventStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { ChecklistCategory, ExpenseType, CreateExpenseInput } from '../../types';
import { MainStackParams } from '../../navigation';
import { Ionicons } from '@expo/vector-icons';
import { exportBudgetPdf } from '../../utils/exportUtils';
import { toAmount, parseAmountInput, budgetSummary, totalsByCategory } from '../../utils/budgetUtils';

const CATEGORIES: { key: ChecklistCategory; label: string; emoji: string }[] = [
  { key: 'venue',        label: 'Venue',        emoji: '🏛️' },
  { key: 'catering',     label: 'Catering',     emoji: '🍽️' },
  { key: 'photography',  label: 'Photography',  emoji: '📷' },
  { key: 'videography',  label: 'Videography',  emoji: '🎥' },
  { key: 'florals',      label: 'Florals',      emoji: '💐' },
  { key: 'music',        label: 'Music',        emoji: '🎵' },
  { key: 'attire',       label: 'Attire',       emoji: '👗' },
  { key: 'hair_makeup',  label: 'Hair & Makeup',emoji: '💄' },
  { key: 'cake',         label: 'Cake',         emoji: '🎂' },
  { key: 'invitations',  label: 'Invitations',  emoji: '✉️' },
  { key: 'transport',    label: 'Transport',    emoji: '🚗' },
  { key: 'accommodation',label: 'Accommodation',emoji: '🏨' },
  { key: 'honeymoon',    label: 'Honeymoon',    emoji: '✈️' },
  { key: 'favors',       label: 'Favors',       emoji: '🎁' },
  { key: 'officiant',    label: 'Officiant',    emoji: '📖' },
  { key: 'rentals',      label: 'Rentals',      emoji: '🪑' },
  { key: 'other',        label: 'Other',        emoji: '📌' },
];

const RING_SIZE = 160;
const STROKE = 14;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function BudgetScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const { expenses, vendors, activeEventId, events, loadExpenses, addExpense } = useEventStore();
  const activeEvent = events.find(e => e.id === activeEventId);
  const { bottom } = useSafeAreaInsets();
  const tabBarHeight = 60 + bottom;
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!expenses.length) { Alert.alert('No expenses', 'Add expenses before exporting.'); return; }
    setExporting(true);
    try {
      await exportBudgetPdf(expenses, vendors, activeEvent?.event_name ?? 'Wedding', activeEvent?.total_budget ?? null);
    } catch {
      Alert.alert('Export failed', 'Could not export budget PDF.');
    } finally {
      setExporting(false);
    }
  };

  const onRefresh = async () => {
    if (!activeEventId) return;
    setRefreshing(true);
    await loadExpenses(activeEventId);
    setRefreshing(false);
  };

  const totalBudget = activeEvent?.total_budget ?? 0;
  const { totalSpent, remaining, pct, overBudget } = useMemo(
    () => budgetSummary(activeEvent?.total_budget, expenses),
    [activeEvent?.total_budget, expenses],
  );
  const strokeDashoffset = CIRCUMFERENCE * (1 - pct);

  const byCategory = useMemo(() => totalsByCategory(expenses), [expenses]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + Spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Budget</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={handleExport} disabled={exporting} style={styles.exportBtn}>
              <Ionicons name="share-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ring chart */}
        <View style={styles.ringCard}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Background ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={Colors.border}
              strokeWidth={STROKE}
              fill="none"
            />
            {/* Progress ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={overBudget ? Colors.error : Colors.primary}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
            />
          </Svg>
          {/* Center text */}
          <View style={styles.ringCenter}>
            <Text style={[styles.ringPct, overBudget && { color: Colors.error }]}>
              {Math.round(pct * 100)}%
            </Text>
            <Text style={styles.ringLabel}>used</Text>
          </View>

          {/* Stats beside ring */}
          <View style={styles.ringStats}>
            <View style={styles.ringStat}>
              <Text style={styles.ringStatValue}>${totalSpent.toLocaleString()}</Text>
              <Text style={styles.ringStatLabel}>Spent</Text>
            </View>
            <View style={[styles.ringStat, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm }]}>
              <Text style={[styles.ringStatValue, overBudget && { color: Colors.error }]}>
                {overBudget ? '-' : ''}${Math.abs(remaining).toLocaleString()}
              </Text>
              <Text style={styles.ringStatLabel}>{overBudget ? 'Over budget' : 'Remaining'}</Text>
            </View>
            {totalBudget > 0 && (
              <View style={[styles.ringStat, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm }]}>
                <Text style={styles.ringStatValue}>${totalBudget.toLocaleString()}</Text>
                <Text style={styles.ringStatLabel}>Total budget</Text>
              </View>
            )}
          </View>
        </View>

        {/* Category breakdown */}
        <Text style={styles.sectionTitle}>By category</Text>
        {CATEGORIES.filter(c => byCategory[c.key] > 0).map(cat => {
          const spent = byCategory[cat.key] ?? 0;
          const catPct = totalBudget > 0 ? Math.min(spent / totalBudget, 1) : 0;
          return (
            <TouchableOpacity
              key={cat.key}
              style={styles.catCard}
              onPress={() => activeEventId && navigation.navigate('BudgetCategoryDetail', { category: cat.key, eventId: activeEventId })}
              activeOpacity={0.75}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <View style={styles.catInfo}>
                <View style={styles.catRow}>
                  <Text style={styles.catLabel}>{cat.label}</Text>
                  <Text style={styles.catAmount}>${spent.toLocaleString()}</Text>
                </View>
                <View style={styles.catBar}>
                  <View style={[styles.catFill, { width: `${catPct * 100}%` }]} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {Object.keys(byCategory).length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptyText}>Tap "+ Add" to log your first expense.</Text>
          </View>
        )}

        {/* Recent expenses */}
        {expenses.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Recent</Text>
            {expenses.slice(0, 10).map(exp => (
              <View key={exp.id} style={styles.expenseRow}>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseDesc}>{exp.description}</Text>
                  <Text style={styles.expenseMeta}>
                    {CATEGORIES.find(c => c.key === exp.category)?.label ?? exp.category} · {exp.expense_type.replace('_', ' ')}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>-${toAmount(exp.amount).toLocaleString()}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <AddExpenseModal
        visible={showAddModal}
        eventId={activeEventId ?? ''}
        onClose={() => setShowAddModal(false)}
        onSave={async (data) => {
          await addExpense(data);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowAddModal(false);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Add Expense Modal ───────────────────────────────────────────────────────

function AddExpenseModal({
  visible, eventId, onClose, onSave,
}: {
  visible: boolean;
  eventId: string;
  onClose: () => void;
  onSave: (data: CreateExpenseInput) => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ChecklistCategory>('venue');
  const [type, setType] = useState<ExpenseType>('misc');

  const reset = () => {
    setDescription(''); setAmount(''); setCategory('venue'); setType('misc');
  };

  const handleSave = () => {
    if (!description.trim() || !eventId) return;
    const parsedAmount = parseAmountInput(amount);
    if (parsedAmount === null) {
      Alert.alert('Invalid amount', 'Enter a positive dollar amount, e.g. 1200 or 1200.50.');
      return;
    }
    onSave({
      event_id: eventId,
      category,
      description: description.trim(),
      amount: parsedAmount,
      expense_type: type,
      paid_date: new Date().toISOString().split('T')[0],
    });
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
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.modalSave, (!description || !amount) && { opacity: 0.4 }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={styles.modalInput}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Venue deposit"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="sentences"
            />

            <Text style={styles.modalLabel}>Amount ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.typeRow}>
              {(['deposit', 'final_payment', 'misc'] as ExpenseType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, type === t && styles.typeChipActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                    {t === 'final_payment' ? 'Final' : t === 'deposit' ? 'Deposit' : 'Misc'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.catChip, category === c.key && styles.catChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={styles.catChipEmoji}>{c.emoji}</Text>
                  <Text style={[styles.catChipText, category === c.key && styles.catChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  exportBtn: { padding: 4 },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  addBtnText: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.sm,
  },
  ringCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadow.md,
  },
  ringCenter: {
    position: 'absolute',
    left: Spacing.xl + (RING_SIZE / 2) - 30,
    alignItems: 'center',
    width: 60,
  },
  ringPct: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  ringLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  ringStats: {
    flex: 1,
    marginLeft: Spacing.xl,
    gap: Spacing.sm,
  },
  ringStat: {},
  ringStatValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  ringStatLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  catEmoji: { fontSize: 22, marginRight: Spacing.md },
  catInfo: { flex: 1 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catLabel: { fontSize: Typography.sizes.md, color: Colors.textPrimary, fontWeight: Typography.weights.medium },
  catAmount: { fontSize: Typography.sizes.md, color: Colors.textPrimary, fontWeight: Typography.weights.semibold },
  catBar: { height: 4, backgroundColor: Colors.border, borderRadius: Radius.full },
  catFill: { height: 4, backgroundColor: Colors.primary, borderRadius: Radius.full },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: Typography.sizes.md, color: Colors.textPrimary, fontWeight: Typography.weights.medium },
  expenseMeta: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  expenseAmount: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.error },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.sizes.md, color: Colors.textMuted, textAlign: 'center' },

  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  modalCancel: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  modalTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  modalSave: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.primary },
  modalScroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  modalLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.textPrimary,
  },
  typeRow: { flexDirection: 'row', gap: Spacing.sm },
  typeChip: {
    flex: 1, paddingVertical: Spacing.sm,
    alignItems: 'center', borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeChipText: { fontSize: Typography.sizes.sm, color: Colors.textMuted, fontWeight: Typography.weights.medium },
  typeChipTextActive: { color: Colors.primaryDark, fontWeight: Typography.weights.semibold },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  catChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  catChipEmoji: { fontSize: 14 },
  catChipText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  catChipTextActive: { color: Colors.primaryDark, fontWeight: Typography.weights.semibold },
});
