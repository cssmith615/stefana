import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../theme';
import { useTheme } from '../context/ThemeContext';

// Auth screens
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';

// Onboarding screens
import OnboardingWelcomeScreen from '../screens/onboarding/OnboardingWelcomeScreen';
import OnboardingEventDateScreen from '../screens/onboarding/OnboardingEventDateScreen';
import OnboardingEventScaleScreen from '../screens/onboarding/OnboardingEventScaleScreen';
import OnboardingGeneratingScreen from '../screens/onboarding/OnboardingGeneratingScreen';

// Main screens
import DashboardScreen from '../screens/main/DashboardScreen';
import ChecklistScreen from '../screens/main/ChecklistScreen';
import BudgetScreen from '../screens/main/BudgetScreen';
import VendorsScreen from '../screens/main/VendorsScreen';
import GuestListScreen from '../screens/main/GuestListScreen';
import AIAssistantScreen from '../screens/main/AIAssistantScreen';
import ProDashboardScreen from '../screens/main/ProDashboardScreen';
import ClientDetailScreen from '../screens/main/ClientDetailScreen';
import WeddingPartyScreen from '../screens/main/WeddingPartyScreen';
import AssigneePortalScreen from '../screens/main/AssigneePortalScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import UpgradeScreen from '../screens/main/UpgradeScreen';
import EventSettingsScreen from '../screens/main/EventSettingsScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import DayOfTimelineScreen from '../screens/main/DayOfTimelineScreen';
import MoodboardScreen from '../screens/main/MoodboardScreen';
import SeatingChartScreen from '../screens/main/SeatingChartScreen';
import ChecklistItemDetailScreen from '../screens/main/ChecklistItemDetailScreen';
import BudgetCategoryDetailScreen from '../screens/main/BudgetCategoryDetailScreen';
import RegistriesScreen from '../screens/main/RegistriesScreen';
import SongWishlistScreen from '../screens/main/SongWishlistScreen';

// Placeholder — screens will be replaced sprint by sprint
const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
    <Text style={{ color: Colors.textSecondary, fontSize: 16 }}>{name}</Text>
  </View>
);

// ─── Stack param lists ───────────────────────────────────────────────────────

export type AuthStackParams = {
  SignIn: undefined;
  SignUp: undefined;
};

export type OnboardingStackParams = {
  OnboardingWelcome: undefined;
  OnboardingEventType: undefined;
  OnboardingEventDate: { eventType: string };
  OnboardingEventScale: { eventType: string; eventDate?: string; eventName: string };
  OnboardingGenerating: { eventType: string; eventDate?: string; eventName: string; guestCount?: number; budget?: number };
};

export type MainTabParams = {
  Dashboard: undefined;
  Plan: undefined;
  Budget: undefined;
  Vendors: undefined;
};

export type MainStackParams = {
  MainTabs: undefined;
  WeddingParty: undefined;
  AssigneePortal: undefined;
  ChecklistItemDetail: { itemId: string };
  BudgetCategoryDetail: { category: string; eventId: string };
  GuestList: undefined;
  SeatingChart: undefined;
  AIAssistant: undefined;
  EventSettings: { eventId: string };
  Profile: undefined;
  Notifications: undefined;
  Upgrade: undefined;
  ProDashboard: undefined;
  ClientDetail: { eventId: string };
  DayOfTimeline: undefined;
  Moodboard: undefined;
  Registries: undefined;
  SongWishlist: undefined;
};

// ─── Navigators ──────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParams>();
const MainTab = createBottomTabNavigator<MainTabParams>();
const MainStack = createNativeStackNavigator<MainStackParams>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <OnboardingStack.Screen name="OnboardingEventType" children={() => <PlaceholderScreen name="Event Type" />} />
      <OnboardingStack.Screen name="OnboardingEventDate" component={OnboardingEventDateScreen} />
      <OnboardingStack.Screen name="OnboardingEventScale" component={OnboardingEventScaleScreen} />
      <OnboardingStack.Screen name="OnboardingGenerating" component={OnboardingGeneratingScreen} />
    </OnboardingStack.Navigator>
  );
}

function MainTabs() {
  const palette = useTheme();
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: 'home-outline',
            Plan: 'checkbox-outline',
            Budget: 'wallet-outline',
            Vendors: 'storefront-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <MainTab.Screen name="Dashboard" component={DashboardScreen} />
      <MainTab.Screen name="Plan" component={ChecklistScreen} />
      <MainTab.Screen name="Budget" component={BudgetScreen} />
      <MainTab.Screen name="Vendors" component={VendorsScreen} />
    </MainTab.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainTabs" component={MainTabs} />
      <MainStack.Screen name="ChecklistItemDetail" component={ChecklistItemDetailScreen} />
      <MainStack.Screen name="BudgetCategoryDetail" component={BudgetCategoryDetailScreen} />
      <MainStack.Screen name="SeatingChart" component={SeatingChartScreen} />
      <MainStack.Screen name="GuestList" component={GuestListScreen} />
      <MainStack.Screen name="AIAssistant" component={AIAssistantScreen} />
      <MainStack.Screen name="EventSettings" component={EventSettingsScreen} />
      <MainStack.Screen name="Profile" component={ProfileScreen} />
      <MainStack.Screen name="Notifications" component={NotificationsScreen} />
      <MainStack.Screen name="Upgrade" component={UpgradeScreen} />
      <MainStack.Screen name="ProDashboard" component={ProDashboardScreen} />
      <MainStack.Screen name="ClientDetail" component={ClientDetailScreen} />
      <MainStack.Screen name="WeddingParty" component={WeddingPartyScreen} />
      <MainStack.Screen name="AssigneePortal" component={AssigneePortalScreen} />
      <MainStack.Screen name="DayOfTimeline" component={DayOfTimelineScreen} />
      <MainStack.Screen name="Moodboard" component={MoodboardScreen} />
      <MainStack.Screen name="Registries" component={RegistriesScreen} />
      <MainStack.Screen name="SongWishlist" component={SongWishlistScreen} />
    </MainStack.Navigator>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

function useNotificationTapHandler(navRef: React.RefObject<NavigationContainerRef<any>>) {
  useEffect(() => {
    let isExpoGo = false;
    try { isExpoGo = require('expo-constants').default?.appOwnership === 'expo'; } catch {}
    if (isExpoGo) return;

    let Notifications: any;
    try { Notifications = require('expo-notifications'); } catch { return; }
    if (!Notifications?.addNotificationResponseReceivedListener) return;

    const sub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response?.notification?.request?.content?.data;
      if (!data || !navRef.current) return;

      switch (data.type) {
        case 'task':
          navRef.current.dispatch(CommonActions.navigate('Plan'));
          break;
        case 'rsvp':
          navRef.current.dispatch(CommonActions.navigate('GuestList'));
          break;
        case 'countdown':
        case 'milestone':
          navRef.current.dispatch(CommonActions.navigate('Dashboard'));
          break;
      }
    });

    return () => sub.remove();
  }, []);
}

export default function RootNavigator() {
  const { session, profile, initialized, profileLoading, initialize } = useAuthStore();
  const navRef = useRef<NavigationContainerRef<any>>(null!) as React.RefObject<NavigationContainerRef<any>>;
  useNotificationTapHandler(navRef);

  useEffect(() => {
    initialize();
  }, []);

  if (!initialized || profileLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const showOnboarding = session && profile && !profile.onboarding_done;
  const showMain = session && profile && profile.onboarding_done;

  return (
    <NavigationContainer ref={navRef}>
      {!session && <AuthNavigator />}
      {showOnboarding && <OnboardingNavigator />}
      {showMain && <MainNavigator />}
    </NavigationContainer>
  );
}
