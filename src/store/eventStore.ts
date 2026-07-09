import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import { subtractMonthsFromDate } from '../utils/dateUtils';
import {
  Event, ChecklistItem, Vendor, Expense, Guest, AiConversation,
  WeddingPartyMember, WeddingPartyRole,
  TimelineEvent, TimelineCategory, CreateTimelineEventInput,
  MoodboardItem, CreateMoodboardItemInput,
  Registry, CreateRegistryInput,
  Song, CreateSongInput,
  CreateEventInput, CreateChecklistItemInput, CreateVendorInput,
  CreateExpenseInput, CreateGuestInput,
} from '../types';

async function generateShareCode(length = 10): Promise<string> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = await Crypto.getRandomBytesAsync(length);
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
}

interface EventState {
  activeEventId: string | null;
  events: Event[];
  checklistItems: ChecklistItem[];
  vendors: Vendor[];
  expenses: Expense[];
  guests: Guest[];
  aiConversation: AiConversation | null;
  weddingParty: WeddingPartyMember[];
  timelineEvents: TimelineEvent[];
  moodboardItems: MoodboardItem[];
  registries: Registry[];
  songs: Song[];

  loadingEvents: boolean;
  loadingChecklist: boolean;

  loadEvents: (userId: string) => Promise<void>;
  createEvent: (data: CreateEventInput, userId: string, tier: string) => Promise<{ id?: string; error?: string }>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<{ error?: string }>;
  setActiveEvent: (id: string) => Promise<void>;

  loadChecklist: (eventId: string) => Promise<void>;
  addChecklistItem: (item: CreateChecklistItemInput) => Promise<{ error?: string }>;
  toggleChecklistItem: (id: string) => Promise<void>;
  deleteChecklistItem: (id: string) => Promise<void>;
  seedChecklistFromTemplate: (eventId: string, eventDate: string | null) => Promise<void>;

  loadVendors: (eventId: string) => Promise<void>;
  addVendor: (vendor: CreateVendorInput) => Promise<{ id?: string; error?: string }>;
  updateVendor: (id: string, updates: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;

  loadExpenses: (eventId: string) => Promise<void>;
  addExpense: (expense: CreateExpenseInput) => Promise<{ error?: string }>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  loadGuests: (eventId: string) => Promise<void>;
  addGuest: (guest: CreateGuestInput) => Promise<{ error?: string }>;
  updateGuest: (id: string, updates: Partial<Guest>) => Promise<void>;
  deleteGuest: (id: string) => Promise<void>;

  loadWeddingParty: (eventId: string) => Promise<void>;
  addWeddingPartyMember: (eventId: string, name: string, role: WeddingPartyRole, email?: string) => Promise<{ id?: string; error?: string }>;
  removeWeddingPartyMember: (id: string) => Promise<void>;
  assignTask: (taskId: string, memberId: string | null) => Promise<void>;
  getAssigneeTasks: (shareCode: string) => Promise<{ member?: WeddingPartyMember; tasks?: ChecklistItem[]; eventName?: string; error?: string }>;

  loadMoodboard: (eventId: string) => Promise<void>;
  addMoodboardItem: (item: CreateMoodboardItemInput) => Promise<{ error?: string }>;
  deleteMoodboardItem: (id: string) => Promise<void>;

  loadRegistries: (eventId: string) => Promise<void>;
  addRegistry: (registry: CreateRegistryInput) => Promise<{ error?: string }>;
  updateRegistry: (id: string, updates: Partial<Registry>) => Promise<void>;
  deleteRegistry: (id: string) => Promise<void>;

  loadSongs: (eventId: string) => Promise<void>;
  addSong: (song: CreateSongInput) => Promise<{ error?: string }>;
  deleteSong: (id: string) => Promise<void>;

  loadTimeline: (eventId: string) => Promise<void>;
  addTimelineEvent: (item: CreateTimelineEventInput) => Promise<{ error?: string }>;
  updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => Promise<void>;
  deleteTimelineEvent: (id: string) => Promise<void>;
  seedTimeline: (eventId: string) => Promise<void>;
}

export const useEventStore = create<EventState>((set, get) => ({
  activeEventId: null,
  events: [],
  checklistItems: [],
  vendors: [],
  expenses: [],
  guests: [],
  aiConversation: null,
  weddingParty: [],
  timelineEvents: [],
  moodboardItems: [],
  registries: [],
  songs: [],
  loadingEvents: false,
  loadingChecklist: false,

  loadEvents: async (userId) => {
    set({ loadingEvents: true });
    const { data } = await supabase
      .from('events')
      .select('*')
      .or(`owner_id.eq.${userId},planner_id.eq.${userId}`)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });
    set({ events: (data as Event[]) ?? [], loadingEvents: false });
  },

  createEvent: async (data, userId, tier) => {
    const events = get().events;
    if (tier === 'free' && events.length >= 1) return { error: 'upgrade_required' };

    const { data: created, error } = await supabase
      .from('events')
      .insert({ ...data, owner_id: userId })
      .select()
      .single();

    if (error) return { error: error.message };
    set({ events: [created as Event, ...get().events] });
    return { id: created.id };
  },

  updateEvent: async (id, updates) => {
    const { data, error } = await supabase
      .from('events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { error: error.message };
    set({ events: get().events.map(e => e.id === id ? data as Event : e) });
    if (get().activeEventId === id) {
      // refresh checklist due dates if event_date changed
      if (updates.event_date) await get().loadChecklist(id);
    }
    return {};
  },

  setActiveEvent: async (id) => {
    set({ activeEventId: id });
    await Promise.all([
      get().loadChecklist(id),
      get().loadVendors(id),
      get().loadExpenses(id),
      get().loadGuests(id),
      get().loadWeddingParty(id),
      get().loadTimeline(id),
      get().loadMoodboard(id),
      get().loadRegistries(id),
      get().loadSongs(id),
    ]);
  },

  loadChecklist: async (eventId) => {
    set({ loadingChecklist: true });
    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('event_id', eventId)
      .order('months_before', { ascending: false })
      .order('sort_order', { ascending: true });
    set({ checklistItems: (data as ChecklistItem[]) ?? [], loadingChecklist: false });
  },

  addChecklistItem: async (item) => {
    const { data, error } = await supabase
      .from('checklist_items')
      .insert({ ...item, is_custom: true })
      .select()
      .single();
    if (error) return { error: error.message };
    set({ checklistItems: [...get().checklistItems, data as ChecklistItem] });
    return {};
  },

  toggleChecklistItem: async (id) => {
    const item = get().checklistItems.find(i => i.id === id);
    if (!item) return;
    const newValue = !item.is_completed;
    // Optimistic update
    set({
      checklistItems: get().checklistItems.map(i =>
        i.id === id ? { ...i, is_completed: newValue, completed_at: newValue ? new Date().toISOString() : null } : i
      ),
    });
    const { error } = await supabase
      .from('checklist_items')
      .update({ is_completed: newValue, completed_at: newValue ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      // Roll back
      set({
        checklistItems: get().checklistItems.map(i =>
          i.id === id ? { ...i, is_completed: item.is_completed, completed_at: item.completed_at } : i
        ),
      });
    }
  },

  deleteChecklistItem: async (id) => {
    await supabase.from('checklist_items').delete().eq('id', id);
    set({ checklistItems: get().checklistItems.filter(i => i.id !== id) });
  },

  seedChecklistFromTemplate: async (eventId, eventDate) => {
    const { data: templates } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('event_type', 'wedding')
      .order('months_before', { ascending: false })
      .order('sort_order', { ascending: true });

    if (!templates || templates.length === 0) return;

    const items = templates.map((t: any) => {
      let due_date: string | null = null;
      if (eventDate) {
        due_date = subtractMonthsFromDate(eventDate, t.months_before);
      }
      return {
        event_id: eventId,
        title: t.title,
        category: t.category,
        months_before: t.months_before,
        due_date,
        sort_order: t.sort_order,
        is_custom: false,
        ai_generated: false,
      };
    });

    const { data } = await supabase.from('checklist_items').insert(items).select();
    if (data) set({ checklistItems: data as ChecklistItem[] });
  },

  loadVendors: async (eventId) => {
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    set({ vendors: (data as Vendor[]) ?? [] });
  },

  addVendor: async (vendor) => {
    const { data, error } = await supabase.from('vendors').insert(vendor).select().single();
    if (error) return { error: error.message };
    set({ vendors: [data as Vendor, ...get().vendors] });
    return { id: data.id };
  },

  updateVendor: async (id, updates) => {
    const { data } = await supabase
      .from('vendors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (data) set({ vendors: get().vendors.map(v => v.id === id ? data as Vendor : v) });
  },

  deleteVendor: async (id) => {
    await supabase.from('vendors').delete().eq('id', id);
    set({ vendors: get().vendors.filter(v => v.id !== id) });
  },

  loadExpenses: async (eventId) => {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('event_id', eventId)
      .order('paid_date', { ascending: false });
    set({ expenses: (data as Expense[]) ?? [] });
  },

  addExpense: async (expense) => {
    const { data, error } = await supabase.from('expenses').insert(expense).select().single();
    if (error) return { error: error.message };
    set({ expenses: [data as Expense, ...get().expenses] });
    return {};
  },

  updateExpense: async (id, updates) => {
    const { data } = await supabase.from('expenses').update(updates).eq('id', id).select().single();
    if (data) set({ expenses: get().expenses.map(e => e.id === id ? data as Expense : e) });
  },

  deleteExpense: async (id) => {
    await supabase.from('expenses').delete().eq('id', id);
    set({ expenses: get().expenses.filter(e => e.id !== id) });
  },

  loadGuests: async (eventId) => {
    const { data } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .order('last_name', { ascending: true });
    set({ guests: (data as Guest[]) ?? [] });
  },

  addGuest: async (guest) => {
    const { data, error } = await supabase.from('guests').insert(guest).select().single();
    if (error) return { error: error.message };
    set({ guests: [...get().guests, data as Guest] });
    return {};
  },

  updateGuest: async (id, updates) => {
    const { data } = await supabase
      .from('guests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (data) set({ guests: get().guests.map(g => g.id === id ? data as Guest : g) });
  },

  deleteGuest: async (id) => {
    await supabase.from('guests').delete().eq('id', id);
    set({ guests: get().guests.filter(g => g.id !== id) });
  },

  loadWeddingParty: async (eventId) => {
    const { data } = await supabase
      .from('wedding_party')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    set({ weddingParty: (data as WeddingPartyMember[]) ?? [] });
  },

  addWeddingPartyMember: async (eventId, name, role, email) => {
    const share_code = await generateShareCode();

    const { data, error } = await supabase
      .from('wedding_party')
      .insert({ event_id: eventId, name, role, email: email ?? null, share_code })
      .select()
      .single();

    if (error) return { error: error.message };
    set({ weddingParty: [...get().weddingParty, data as WeddingPartyMember] });
    return { id: data.id };
  },

  removeWeddingPartyMember: async (id) => {
    // Unassign their tasks first
    await supabase.from('checklist_items').update({ assigned_to_id: null }).eq('assigned_to_id', id);
    await supabase.from('wedding_party').delete().eq('id', id);
    set({ weddingParty: get().weddingParty.filter(m => m.id !== id) });
    set({ checklistItems: get().checklistItems.map(i => i.assigned_to_id === id ? { ...i, assigned_to_id: null } : i) });
  },

  assignTask: async (taskId, memberId) => {
    set({
      checklistItems: get().checklistItems.map(i =>
        i.id === taskId ? { ...i, assigned_to_id: memberId } : i
      ),
    });
    await supabase
      .from('checklist_items')
      .update({ assigned_to_id: memberId, updated_at: new Date().toISOString() })
      .eq('id', taskId);
  },

  loadMoodboard: async (eventId) => {
    const { data } = await supabase
      .from('moodboard_items')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    set({ moodboardItems: (data as MoodboardItem[]) ?? [] });
  },

  addMoodboardItem: async (item) => {
    const { data, error } = await supabase
      .from('moodboard_items')
      .insert(item)
      .select()
      .single();
    if (error) return { error: error.message };
    set({ moodboardItems: [data as MoodboardItem, ...get().moodboardItems] });
    return {};
  },

  deleteMoodboardItem: async (id) => {
    await supabase.from('moodboard_items').delete().eq('id', id);
    set({ moodboardItems: get().moodboardItems.filter(m => m.id !== id) });
  },

  loadRegistries: async (eventId) => {
    const { data } = await supabase
      .from('registries')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    set({ registries: (data as Registry[]) ?? [] });
  },

  addRegistry: async (registry) => {
    const { data, error } = await supabase.from('registries').insert(registry).select().single();
    if (error) return { error: error.message };
    set({ registries: [...get().registries, data as Registry] });
    return {};
  },

  updateRegistry: async (id, updates) => {
    const { data } = await supabase.from('registries').update(updates).eq('id', id).select().single();
    if (data) set({ registries: get().registries.map(r => r.id === id ? data as Registry : r) });
  },

  deleteRegistry: async (id) => {
    await supabase.from('registries').delete().eq('id', id);
    set({ registries: get().registries.filter(r => r.id !== id) });
  },

  loadSongs: async (eventId) => {
    const { data } = await supabase
      .from('songs')
      .select('*')
      .eq('event_id', eventId)
      .order('moment', { ascending: true })
      .order('created_at', { ascending: true });
    set({ songs: (data as Song[]) ?? [] });
  },

  addSong: async (song) => {
    const { data, error } = await supabase.from('songs').insert(song).select().single();
    if (error) return { error: error.message };
    set({ songs: [...get().songs, data as Song] });
    return {};
  },

  deleteSong: async (id) => {
    await supabase.from('songs').delete().eq('id', id);
    set({ songs: get().songs.filter(s => s.id !== id) });
  },

  loadTimeline: async (eventId) => {
    const { data } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('event_id', eventId)
      .order('time', { ascending: true });
    set({ timelineEvents: (data as TimelineEvent[]) ?? [] });
  },

  addTimelineEvent: async (item) => {
    const { data, error } = await supabase
      .from('timeline_events')
      .insert(item)
      .select()
      .single();
    if (error) return { error: error.message };
    const updated = [...get().timelineEvents, data as TimelineEvent]
      .sort((a, b) => a.time.localeCompare(b.time));
    set({ timelineEvents: updated });
    return {};
  },

  updateTimelineEvent: async (id, updates) => {
    const { data } = await supabase
      .from('timeline_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (data) {
      const updated = get().timelineEvents
        .map(e => e.id === id ? data as TimelineEvent : e)
        .sort((a, b) => a.time.localeCompare(b.time));
      set({ timelineEvents: updated });
    }
  },

  deleteTimelineEvent: async (id) => {
    await supabase.from('timeline_events').delete().eq('id', id);
    set({ timelineEvents: get().timelineEvents.filter(e => e.id !== id) });
  },

  seedTimeline: async (eventId) => {
    const defaults: { time: string; title: string; duration_minutes: number; category: TimelineCategory }[] = [
      { time: '08:00', title: 'Hair & Makeup', duration_minutes: 180, category: 'getting_ready' },
      { time: '11:00', title: 'Getting Dressed', duration_minutes: 60, category: 'getting_ready' },
      { time: '12:00', title: 'First Look & Photos', duration_minutes: 60, category: 'photos' },
      { time: '13:00', title: 'Ceremony', duration_minutes: 60, category: 'ceremony' },
      { time: '14:00', title: 'Family & Wedding Party Photos', duration_minutes: 45, category: 'photos' },
      { time: '15:00', title: 'Cocktail Hour', duration_minutes: 60, category: 'cocktail_hour' },
      { time: '16:00', title: 'Reception Begins', duration_minutes: 30, category: 'reception' },
      { time: '16:30', title: 'First Dance', duration_minutes: 15, category: 'reception' },
      { time: '17:00', title: 'Dinner Service', duration_minutes: 90, category: 'reception' },
      { time: '18:30', title: 'Speeches & Toasts', duration_minutes: 30, category: 'reception' },
      { time: '19:00', title: 'Cake Cutting', duration_minutes: 20, category: 'reception' },
      { time: '19:30', title: 'Dancing', duration_minutes: 120, category: 'reception' },
      { time: '21:30', title: 'Grand Send-off', duration_minutes: 30, category: 'reception' },
    ];
    const items = defaults.map((d, i) => ({ ...d, event_id: eventId, sort_order: i }));
    const { data } = await supabase.from('timeline_events').insert(items).select();
    if (data) {
      set({ timelineEvents: (data as TimelineEvent[]).sort((a, b) => a.time.localeCompare(b.time)) });
    }
  },

  getAssigneeTasks: async (shareCode) => {
    const { data: member, error } = await supabase
      .from('wedding_party')
      .select('*')
      .eq('share_code', shareCode)
      .single();

    if (error || !member) return { error: 'Invalid code. Please check and try again.' };

    const { data: tasks } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('assigned_to_id', member.id)
      .order('due_date', { ascending: true });

    const { data: event } = await supabase
      .from('events')
      .select('event_name')
      .eq('id', member.event_id)
      .single();

    return {
      member: member as WeddingPartyMember,
      tasks: (tasks as ChecklistItem[]) ?? [],
      eventName: event?.event_name,
    };
  },
}));
