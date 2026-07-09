import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useEventStore } from '../../store/eventStore';
import { useTheme } from '../../context/ThemeContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { ChecklistCategory, ExpenseType } from '../../types';
import { MainStackParams } from '../../navigation';
import { toAmount, sumExpenses } from '../../utils/budgetUtils';

const CAT_CONFIG: Record<string, { label: string; emoji: string }> = {
  venue:          { label: 'Venue',          emoji: '🏛️' },
  catering:       { label: 'Catering',       emoji: '🍽️' },
  photography:    { label: 'Photography',    emoji: '📷' },
  videography:    { label: 'Videography',    emoji: '🎥' },
  florals:        { label: 'Florals',        emoji: '💐' },
  music:          { label: 'Music',          emoji: '🎵' },
  attire:         { label: 'Attire',         emoji: '👗' },
  hair_makeup:    { label: 'Hair & Makeup',  emoji: '💄' },
  cake:           { label: 'Cake',           emoji: '🎂' },
  invitations:    { label: 'Invitations',    emoji: '✉️' },
  transport:      { label: 'Transport',      emoji: '🚗' },
  accommodation:  { label: 'Accommodation',  emoji: '🏨' },
  honeymoon:      { label: 'Honeymoon',      emoji: '✈️' },
  favors:         { label: 'Favors',         emoji: '🎁' },
  officiant:      { label: 'Officiant',      emoji: '📖' },
  legal:          { label: 'Legal',          emoji: '⚖️' },
  rentals:        { label: 'Rentals',        emoji: '🪑' },
  other:          { label: 'Other',          emoji: '📌' },
};

const EXPENSE_TYPE_CONFIG: Record<ExpenseType, { label: string; color: string; bg: string }> = {
  deposit:       { label: 'Deposit',       color: Colors.warning,      bg: '#FFF8E1' },
  final_payment: { label: 'Final Payment', color: Colors.error,        bg: '#FDECEA' },
  misc:          { label: 'Misc',          color: Colors.textSecondary, bg: Colors.cream },
};

type RouteType = RouteProp<MainStackParams, 'BudgetCategoryDetail'>;

export default function BudgetCategoryDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { category, eventId } = route.params;

  const { expenses, events, vendors } = useEventStore();
  const palette = useTheme();
  const insets = useSafeAreaInsets();

  const event = useMemo(() => events.find(e => e.id === eventId), [events, eventId]);

  const categoryExpenses = useMemo(
    () => expenses.filter(e => e.category === category).sort((a, b) => b.paid_date.localeCompare(a.paid_date)),
    [expenses, category]
  );

  const totalSpent = useMemo(
    () => sumExpenses(categoryExpenses),
    [categoryExpenses]
  );

  const allocated = event?.budget_allocations?.[category as ChecklistCategory] ?? 0;
  const remaining = allocated - totalSpent;
  const overBudget = allocated > 0 && remaining < 0;
  const barPct = allocated > 0 ? Math.min(totalSpent / allocated, 1) : 0;

  const catCfg = CAT_CONFIG[category] ?? { label: category, emoji: '📌' };

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const findVendorName = (vendorId: string | null) => {
    if (!vendorId) return null;
    return vendors.find(v => v.id === vendorId)?.business_name ?? null;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {catCfg.emoji} {catCfg.label}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxxl }]}>
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <Text style={styles.spentLabel}>Spent</Text>
            <Text style={[styles.spentAmount, { color: palette.primary }]}>
              ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>Allocated</Text>
              <Text style={styles.summaryStatValue}>
                {allocated > 0
                  ? `$${allocated.toLocaleString()}`
                  : 'No allocation set'}
              </Text>
            </View>
            {allocated > 0 && (
              <View style={[styles.summaryStat, styles.summaryStatRight]}>
                <Text style={styles.summaryStatLabel}>Remaining</Text>
                <Text style={[styles.summaryStatValue, overBudget && { color: Colors.error }]}>
                  {overBudget ? '-' : ''}${Math.abs(remaining).toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Bar */}
          {allocated > 0 && (
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${barPct * 100}%`,
                    backgroundColor: overBudget ? Colors.error : palette.primary,
                  },
                ]}
              />
            </View>
          )}
        </View>

        {/* Expenses list */}
        <Text style={styles.sectionTitle}>Expenses</Text>

        {categoryExpenses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{catCfg.emoji}</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptyText}>Expenses logged under {catCfg.label} will appear here.</Text>
          </View>
        ) : (
          categoryExpenses.map(exp => {
            const typeCfg = EXPENSE_TYPE_CONFIG[exp.expense_type];
            const vendorName = findVendorName(exp.vendor_id);
            return (
              <View key={exp.id} style={styles.expenseCard}>
                <View style={styles.expenseTop}>
                  <Text style={styles.expenseDesc}>{exp.description}</Text>
                  <Text style={styles.expenseAmount}>
                    -${toAmount(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.expenseMeta}>
                  <Text style={styles.expenseDate}>{formatDate(exp.paid_date)}</Text>
                  <View style={styles.expenseMetaRight}>
                    {vendorName && (
                      <View style={styles.vendorBadge}>
                        <Ionicons name="storefront-outline" size={11} color={Colors.textSecondary} />
                        <Text style={styles.vendorBadgeText}>{vendorName}</Text>
                      </View>
                    )}
                    <View style={[styles.typeBadge, { backgroundColor: typeCfg.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: typeCfg.color }]}>{typeCfg.label}</Text>
                    </View>
                  </View>
                </View>
                {exp.notes ? (
                  <Text style={styles.expenseNotes}>{exp.notes}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backBtn: { padding: 4, width: 32 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },

  scroll: { padding: Spacing.lg },

  // Summary card
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadow.md,
  },
  summaryMain: { alignItems: 'center', marginBottom: Spacing.lg },
  spentLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  spentAmount: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  summaryStat: { flex: 1 },
  summaryStatRight: { alignItems: 'flex-end' },
  summaryStatLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  summaryStatValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  barTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: Radius.full,
  },

  // Section title
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  // Expense cards
  expenseCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  expenseTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  expenseDesc: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    marginRight: Spacing.md,
  },
  expenseAmount: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.error,
  },
  expenseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  expenseDate: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  expenseMetaRight: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  vendorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.cream,
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  vendorBadgeText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  typeBadge: {
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  typeBadgeText: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium },
  expenseNotes: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },

  // Empty
  empty: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.sizes.md, color: Colors.textMuted, textAlign: 'center' },
});
