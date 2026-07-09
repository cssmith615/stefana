import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/authStore';
import { useEventStore } from '../../store/eventStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { WeddingPartyMember, WeddingPartyRole, ChecklistItem } from '../../types';
import { MainStackParams } from '../../navigation';

const ROLES: { key: WeddingPartyRole; label: string; emoji: string }[] = [
  { key: 'maid_of_honor', label: 'Maid of Honor', emoji: '👑' },
  { key: 'bridesmaid',    label: 'Bridesmaid',    emoji: '💐' },
  { key: 'best_man',      label: 'Best Man',      emoji: '🤵' },
  { key: 'groomsman',     label: 'Groomsman',     emoji: '🎩' },
  { key: 'flower_girl',   label: 'Flower Girl',   emoji: '🌸' },
  { key: 'ring_bearer',   label: 'Ring Bearer',   emoji: '💍' },
  { key: 'parent',        label: 'Parent',        emoji: '👨‍👩‍👧' },
  { key: 'other',         label: 'Other',         emoji: '⭐' },
];

export default function WeddingPartyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const { profile } = useAuthStore();
  const { weddingParty, checklistItems, activeEventId, addWeddingPartyMember, removeWeddingPartyMember, assignTask } = useEventStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WeddingPartyMember | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const isPremium = profile?.tier === 'premium' || profile?.tier === 'pro';

  const getTasksForMember = (memberId: string) =>
    checklistItems.filter(i => i.assigned_to_id === memberId);

  const unassignedTasks = checklistItems.filter(i => !i.is_completed && !i.assigned_to_id);

  if (!isPremium) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wedding Party</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.gateContainer}>
          <Text style={styles.gateEmoji}>👑</Text>
          <Text style={styles.gateTitle}>Premium Feature</Text>
          <Text style={styles.gateText}>
            Task assignment for your wedding party is available on Premium and Pro plans.
          </Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Upgrade')}>
            <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Wedding Party</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Text style={styles.addLink}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={weddingParty}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Add wedding party members and assign them tasks. Each person gets a unique share code to view and complete their tasks.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const tasks = getTasksForMember(item.id);
          const done = tasks.filter(t => t.is_completed).length;
          const roleConfig = ROLES.find(r => r.key === item.role);
          return (
            <TouchableOpacity
              style={styles.memberCard}
              onPress={() => { setSelectedMember(item); setShowAssignModal(true); }}
              activeOpacity={0.8}
            >
              <View style={styles.memberTop}>
                <Text style={styles.memberEmoji}>{roleConfig?.emoji ?? '⭐'}</Text>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberRole}>{roleConfig?.label ?? item.role}</Text>
                </View>
                <View style={styles.memberStats}>
                  <Text style={styles.memberTaskCount}>{done}/{tasks.length}</Text>
                  <Text style={styles.memberTaskLabel}>tasks</Text>
                </View>
              </View>
              {tasks.length > 0 && (
                <View style={styles.taskPreview}>
                  {tasks.slice(0, 2).map(t => (
                    <Text key={t.id} style={[styles.taskPreviewText, t.is_completed && styles.taskPreviewDone]}>
                      {t.is_completed ? '✓' : '·'} {t.title}
                    </Text>
                  ))}
                  {tasks.length > 2 && (
                    <Text style={styles.taskPreviewMore}>+{tasks.length - 2} more</Text>
                  )}
                </View>
              )}
              <TouchableOpacity
                style={styles.shareRow}
                onPress={() => {
                  Share.share({
                    message: `Hi ${item.name}! You've been assigned tasks for our wedding. Use code ${item.share_code} in the Stefana app to view and complete them. 💍`,
                    title: 'Your Wedding Tasks',
                  });
                }}
              >
                <Text style={styles.shareCode}>{item.share_code}</Text>
                <Text style={styles.shareLabel}>Tap to share code</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💐</Text>
            <Text style={styles.emptyTitle}>No members yet</Text>
            <Text style={styles.emptyText}>Add your wedding party to start assigning tasks.</Text>
          </View>
        }
      />

      <AddMemberModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={async (name, role, email) => {
          if (!activeEventId) return;
          await addWeddingPartyMember(activeEventId, name, role, email);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowAddModal(false);
        }}
      />

      {selectedMember && (
        <AssignTasksModal
          member={selectedMember}
          tasks={checklistItems.filter(i => !i.is_completed)}
          visible={showAssignModal}
          onClose={() => { setShowAssignModal(false); setSelectedMember(null); }}
          onAssign={async (taskId, assign) => {
            await assignTask(taskId, assign ? selectedMember.id : null);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          onRemoveMember={async () => {
            Alert.alert('Remove Member', `Remove ${selectedMember.name} from the wedding party?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                  await removeWeddingPartyMember(selectedMember.id);
                  setShowAssignModal(false);
                  setSelectedMember(null);
                },
              },
            ]);
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Assign Tasks Modal ───────────────────────────────────────────────────────

function AssignTasksModal({ member, tasks, visible, onClose, onAssign, onRemoveMember }: {
  member: WeddingPartyMember;
  tasks: ChecklistItem[];
  visible: boolean;
  onClose: () => void;
  onAssign: (taskId: string, assign: boolean) => void;
  onRemoveMember: () => void;
}) {
  const roleConfig = ROLES.find(r => r.key === member.role);
  const assignedToMe = tasks.filter(t => t.assigned_to_id === member.id);
  const unassigned = tasks.filter(t => !t.assigned_to_id);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{roleConfig?.emoji} {member.name}</Text>
          <TouchableOpacity onPress={onRemoveMember}>
            <Text style={[styles.modalCancel, { color: Colors.error }]}>Remove</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalScroll}>
          {/* Share code */}
          <TouchableOpacity
            style={styles.shareCodeCard}
            onPress={() => Share.share({
              message: `Hi ${member.name}! Use code ${member.share_code} in the Stefana app to view your wedding tasks. 💍`,
            })}
          >
            <Text style={styles.shareCodeBig}>{member.share_code}</Text>
            <Text style={styles.shareCodeHint}>Tap to share this code with {member.name}</Text>
          </TouchableOpacity>

          {/* Assigned tasks */}
          {assignedToMe.length > 0 && (
            <>
              <Text style={styles.modalLabel}>Assigned to {member.name} ({assignedToMe.length})</Text>
              {assignedToMe.map(task => (
                <TouchableOpacity key={task.id} style={styles.taskRow} onPress={() => onAssign(task.id, false)}>
                  <View style={[styles.taskCheck, styles.taskCheckActive]}>
                    <Text style={styles.taskCheckText}>✓</Text>
                  </View>
                  <Text style={styles.taskRowTitle}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Unassigned tasks */}
          {unassigned.length > 0 && (
            <>
              <Text style={styles.modalLabel}>Unassigned tasks — tap to assign</Text>
              {unassigned.map(task => (
                <TouchableOpacity key={task.id} style={styles.taskRow} onPress={() => onAssign(task.id, true)}>
                  <View style={styles.taskCheck}>
                    <Text style={{ color: Colors.textMuted }}>+</Text>
                  </View>
                  <Text style={styles.taskRowTitle}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

function AddMemberModal({ visible, onClose, onSave }: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, role: WeddingPartyRole, email?: string) => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<WeddingPartyRole>('bridesmaid');
  const [email, setEmail] = useState('');

  const reset = () => { setName(''); setRole('bridesmaid'); setEmail(''); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Member</Text>
            <TouchableOpacity onPress={() => { if (name) { onSave(name, role, email || undefined); reset(); } }}>
              <Text style={[styles.modalSave, !name && { opacity: 0.4 }]}>Add</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Name *</Text>
            <TextInput style={styles.modalInput} value={name} onChangeText={setName}
              placeholder="e.g. Sarah" placeholderTextColor={Colors.textMuted} autoCapitalize="words" />

            <Text style={styles.modalLabel}>Role</Text>
            <View style={styles.roleGrid}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleChip, role === r.key && styles.roleChipActive]}
                  onPress={() => setRole(r.key)}
                >
                  <Text style={styles.roleEmoji}>{r.emoji}</Text>
                  <Text style={[styles.roleText, role === r.key && styles.roleTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Email (optional)</Text>
            <TextInput style={styles.modalInput} value={email} onChangeText={setEmail}
              placeholder="sarah@example.com" placeholderTextColor={Colors.textMuted}
              autoCapitalize="none" keyboardType="email-address" />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  back: { fontSize: Typography.sizes.md, color: Colors.primary, width: 60 },
  headerTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  addLink: { fontSize: Typography.sizes.md, color: Colors.primary, fontWeight: Typography.weights.semibold, width: 60, textAlign: 'right' },
  list: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  infoCard: { backgroundColor: Colors.primaryLight, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg },
  infoText: { fontSize: Typography.sizes.sm, color: Colors.primaryDark, lineHeight: Typography.sizes.sm * 1.6 },
  memberCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.md },
  memberTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  memberEmoji: { fontSize: 32, marginRight: Spacing.md },
  memberInfo: { flex: 1 },
  memberName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  memberRole: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  memberStats: { alignItems: 'center' },
  memberTaskCount: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  memberTaskLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  taskPreview: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginBottom: Spacing.sm, gap: 2 },
  taskPreviewText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  taskPreviewDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  taskPreviewMore: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  shareRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cream, borderRadius: Radius.md, padding: Spacing.sm, gap: Spacing.sm },
  shareCode: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.primary, letterSpacing: 2 },
  shareLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.sizes.md, color: Colors.textMuted, textAlign: 'center' },
  gateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  gateEmoji: { fontSize: 56, marginBottom: Spacing.lg },
  gateTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  gateText: { fontSize: Typography.sizes.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: Typography.sizes.md * 1.6, marginBottom: Spacing.xl },
  upgradeBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxxl },
  upgradeBtnText: { color: Colors.white, fontWeight: Typography.weights.bold, fontSize: Typography.sizes.md },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  modalCancel: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  modalTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  modalSave: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.primary },
  modalScroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  modalLabel: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  modalInput: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  roleChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  roleEmoji: { fontSize: 14 },
  roleText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  roleTextActive: { color: Colors.primaryDark, fontWeight: Typography.weights.semibold },
  shareCodeCard: { backgroundColor: Colors.primaryLight, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md },
  shareCodeBig: { fontSize: Typography.sizes.xxxl, fontWeight: Typography.weights.black, color: Colors.primary, letterSpacing: 4, marginBottom: Spacing.sm },
  shareCodeHint: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  taskRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm },
  taskCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  taskCheckActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  taskCheckText: { color: Colors.white, fontWeight: Typography.weights.bold },
  taskRowTitle: { flex: 1, fontSize: Typography.sizes.md, color: Colors.textPrimary },
});
