import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { initializePurchases } from '../utils/purchases';

function safeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('invalid login') ||
    lower.includes('invalid credentials') ||
    lower.includes('email not confirmed')
  ) {
    return 'The email or password is not correct.';
  }
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('password')) {
    return 'Please choose a stronger password.';
  }
  return 'Something went wrong. Please try again.';
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  profileLoading: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: string }>;
  updateTier: (tier: 'free' | 'premium' | 'pro') => Promise<void>;
  deleteAccount: () => Promise<{ error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,
  profileLoading: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null });

    if (session?.user) {
      await get().loadProfile();
      initializePurchases(session.user.id);
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ session, user: session.user, profileLoading: true });
        await get().loadProfile();
        initializePurchases(session.user.id);
      } else {
        set({ session: null, user: null, profile: null, profileLoading: false });
      }
    });

    set({ initialized: true });
  },

  signUp: async (email, password, displayName, role) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ loading: false });
      return { error: safeAuthError(error.message) };
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: data.user.id,
        display_name: displayName,
        role,
        tier: 'free',
        onboarding_done: false,
      });
      if (profileError) {
        set({ loading: false });
        return { error: 'We could not finish creating your profile. Please try again.' };
      }
      await get().loadProfile();
    }

    set({ loading: false });
    return {};
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false });
      return { error: safeAuthError(error.message) };
    }
    set({ loading: false });
    return {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  loadProfile: async () => {
    set({ profileLoading: true });
    const user = get().user ?? (await supabase.auth.getUser()).data.user;
    if (!user) {
      set({ profileLoading: false });
      return;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      // Profile may not exist yet — create a fallback
      const meta = user.user_metadata ?? {};
      const displayName = meta.full_name || meta.name || meta.email?.split('@')[0] || 'User';
      const { data: created } = await supabase
        .from('user_profiles')
        .insert({ id: user.id, display_name: displayName, tier: 'free', role: 'user', onboarding_done: false })
        .select()
        .single();
      set({ profile: created ?? null, profileLoading: false });
      return;
    }

    set({ profile: data as UserProfile, profileLoading: false });
  },

  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) return { error: error.message };
    set({ profile: data as UserProfile });
    return {};
  },

  updateTier: async (tier) => {
    await get().updateProfile({ tier } as any);
  },

  deleteAccount: async () => {
    const user = get().user;
    if (!user) return { error: 'Not authenticated' };
    try {
      // Delete all user data — CASCADE on events handles guests/checklist/vendors/expenses/etc.
      // Then delete the auth record via RPC (requires delete_user_account() DB function)
      const { error: rpcError } = await supabase.rpc('delete_user_account');
      if (rpcError) {
        // Fallback: delete profile row only (cascade handles the rest)
        await supabase.from('user_profiles').delete().eq('id', user.id);
      }
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null });
      return {};
    } catch (e: any) {
      return { error: e?.message ?? 'Failed to delete account' };
    }
  },
}));
