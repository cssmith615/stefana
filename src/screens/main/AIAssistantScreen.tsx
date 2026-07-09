import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParams } from '../../navigation';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/authStore';
import { useEventStore } from '../../store/eventStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import { sendMessage, getApiKey, saveApiKey, AiMessage, EventContext } from '../../utils/aiAssistant';
import { daysUntilEvent, toDateOnlyString } from '../../utils/dateUtils';

const QUICK_PROMPTS = [
  "What should I focus on right now?",
  "What vendors do I still need to book?",
  "Am I on track with my budget?",
  "Draft a vendor inquiry email",
  "Build my day-of timeline",
  "What am I probably forgetting?",
  "How do I follow up on RSVPs?",
  "Give me a 4-week action plan",
];

export default function AIAssistantScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParams>>();
  const { profile } = useAuthStore();
  const isPremium = profile?.tier === 'premium' || profile?.tier === 'pro';
  const { events, activeEventId, checklistItems, guests, vendors, expenses, timelineEvents, moodboardItems } = useEventStore();
  const activeEvent = events.find(e => e.id === activeEventId);

  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    getApiKey().then(k => setHasKey(!!k));
  }, []);

  const getContext = (): EventContext => {
    const daysUntil = daysUntilEvent(activeEvent?.event_date ?? null);

    const now = new Date();
    const in30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);

    // Budget
    const totalBudget = activeEvent?.total_budget ?? null;
    const budgetSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const budgetRemaining = (totalBudget ?? 0) - budgetSpent;
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(e => { categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + Number(e.amount); });
    const topSpendCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a).slice(0, 3)
      .map(([cat, amt]) => `${cat} ($${Math.round(amt / 1000)}k)`).join(', ');

    // Checklist
    const today = toDateOnlyString(now);
    const overdueTasks = checklistItems.filter(i => !i.is_completed && i.due_date && i.due_date < today).length;
    const upcomingTaskTitles = checklistItems
      .filter(i => !i.is_completed && i.due_date && i.due_date >= today && i.due_date <= toDateOnlyString(in30))
      .sort((a, b) => a.due_date! > b.due_date! ? 1 : -1)
      .slice(0, 3).map(t => t.title).join(', ');

    // Vendors
    const KEY_CATEGORIES = ['venue','catering','photography','videography','florals','music','attire','hair_makeup','cake','officiant'];
    const bookedVendors = vendors.filter(v => v.status === 'booked');
    const bookedCats = new Set(bookedVendors.map(v => v.category));
    const missingCats = KEY_CATEGORIES.filter(c => !bookedCats.has(c as any));
    const upcomingPayments = vendors
      .flatMap(v => (v.payment_schedule ?? []).filter(p => !p.paid && p.due_date >= today).map(p => ({ ...p, vendorName: v.business_name })))
      .sort((a, b) => a.due_date > b.due_date ? 1 : -1).slice(0, 3)
      .map(p => `${p.vendorName} ${p.label} $${p.amount.toLocaleString()} due ${new Date(p.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
      .join('; ');

    // Guests
    const moodCats = [...new Set(moodboardItems.map(m => m.category))].join(', ');

    return {
      eventName: activeEvent?.event_name ?? 'your wedding',
      eventDate: activeEvent?.event_date ?? null,
      daysUntil,
      venueName: activeEvent?.venue_name ?? null,
      totalBudget,
      budgetSpent,
      budgetRemaining,
      budgetOverBudget: budgetRemaining < 0,
      topSpendCategories,
      completedTasks: checklistItems.filter(i => i.is_completed).length,
      totalTasks: checklistItems.length,
      overdueTasks,
      upcomingTaskTitles,
      guestCountEstimate: activeEvent?.guest_count_estimate ?? null,
      guestsTotal: guests.length,
      guestsAttending: guests.filter(g => g.rsvp_status === 'attending').length,
      guestsDeclined: guests.filter(g => g.rsvp_status === 'declined').length,
      guestsAwaitingRsvp: guests.filter(g => g.rsvp_status === 'no_response').length,
      guestsSeated: guests.filter(g => g.table_number != null).length,
      guestsUnseated: guests.filter(g => g.table_number == null && g.rsvp_status === 'attending').length,
      vendorsBooked: bookedVendors.length,
      vendorsTotal: vendors.length,
      bookedCategories: [...bookedCats].join(', '),
      missingCategories: missingCats.slice(0, 5).join(', '),
      upcomingPayments,
      hasTimeline: timelineEvents.length > 0,
      timelineEventCount: timelineEvents.length,
      moodboardCount: moodboardItems.length,
      moodboardCategories: moodCats,
    };
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: AiMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    const { reply, error } = await sendMessage(updated, getContext());

    if (error === 'no_key') {
      setHasKey(false);
      setLoading(false);
      return;
    }

    const assistantMsg: AiMessage = {
      role: 'assistant',
      content: reply ?? error ?? 'Something went wrong.',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, assistantMsg]);
    setLoading(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    setSavingKey(true);
    await saveApiKey(keyInput.trim());
    setHasKey(true);
    setKeyInput('');
    setSavingKey(false);
  };

  if (hasKey === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!hasKey) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.setupContainer}>
          <Text style={styles.setupEmoji}>🤖</Text>
          <Text style={styles.setupTitle}>Connect your AI assistant</Text>
          <Text style={styles.setupText}>
            Stefana uses Claude AI to answer your planning questions, draft vendor emails, and more.
            {'\n\n'}
            You'll need a free Anthropic API key to get started. Visit console.anthropic.com to get yours.
          </Text>
          <TextInput
            style={styles.keyInput}
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="Paste your API key here"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.saveKeyBtn, !keyInput && { opacity: 0.4 }]}
            onPress={handleSaveKey}
            disabled={!keyInput || savingKey}
          >
            {savingKey
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.saveKeyBtnText}>Connect</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isPremium) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>✨</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 8, textAlign: 'center' }}>Premium Feature</Text>
          <Text style={{ fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
            The AI Assistant is available on Premium and Pro plans.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#C9A96E', borderRadius: 50, paddingVertical: 14, paddingHorizontal: 32 }}
            onPress={() => navigation.navigate('Upgrade')}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Upgrade to Premium</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💍</Text>
            <Text style={styles.emptyTitle}>How can I help?</Text>
            <Text style={styles.emptyText}>Ask me anything about your wedding planning.</Text>
            <View style={styles.quickPrompts}>
              {QUICK_PROMPTS.map((p, i) => (
                <TouchableOpacity key={i} style={styles.quickChip} onPress={() => handleSend(p)}>
                  <Text style={styles.quickChipText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => <MessageBubble message={item} />}
            ListFooterComponent={loading ? (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.typingText}>Thinking...</Text>
              </View>
            ) : null}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputBox}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything..."
            placeholderTextColor={Colors.textMuted}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            blurOnSubmit
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: AiMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
      {!isUser && <Text style={styles.bubbleName}>Stefana ✨</Text>}
      <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
        {message.content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backBtn: { fontSize: Typography.sizes.md, color: Colors.primary, width: 60 },
  headerTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  setupContainer: {
    flex: 1, paddingHorizontal: Spacing.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  setupEmoji: { fontSize: 56, marginBottom: Spacing.lg },
  setupTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: Spacing.md, textAlign: 'center' },
  setupText: { fontSize: Typography.sizes.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: Typography.sizes.md * 1.6, marginBottom: Spacing.xl },
  keyInput: { width: '100%', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: Typography.sizes.md, color: Colors.textPrimary, marginBottom: Spacing.md },
  saveKeyBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxxl, alignItems: 'center' },
  saveKeyBtnText: { color: Colors.white, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  emptyContainer: { flexGrow: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.sizes.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  quickPrompts: { width: '100%', gap: Spacing.sm },
  quickChip: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  quickChipText: { fontSize: Typography.sizes.md, color: Colors.textSecondary },
  messageList: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  bubble: { maxWidth: '85%', marginBottom: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleAssistant: { alignSelf: 'flex-start', backgroundColor: Colors.white, borderBottomLeftRadius: 4, ...Shadow.sm },
  bubbleName: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginBottom: 4, fontWeight: Typography.weights.semibold },
  bubbleText: { fontSize: Typography.sizes.md, color: Colors.textPrimary, lineHeight: Typography.sizes.md * 1.5 },
  bubbleTextUser: { color: Colors.white },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  typingText: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.white, gap: Spacing.sm,
  },
  inputBox: { flex: 1, backgroundColor: Colors.cream, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: Typography.sizes.md, color: Colors.textPrimary, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: Colors.white, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
});
