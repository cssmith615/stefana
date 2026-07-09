/**
 * RevenueCat purchases wrapper.
 * Uses dynamic require() so the app doesn't crash in Expo Go.
 * In Expo Go, all methods return graceful no-ops or errors.
 * In a dev/production build, the real RevenueCat SDK is used.
 *
 * RevenueCat dashboard setup required:
 *  1. Create products in App Store Connect + Google Play Console
 *     Monthly:
 *       - com.stefana.weddingplanner.premium_monthly ($7.99/mo)
 *       - com.stefana.weddingplanner.pro_monthly ($19.99/mo)
 *     Yearly:
 *       - com.stefana.weddingplanner.premium_yearly ($74.99/yr)
 *       - com.stefana.weddingplanner.pro_yearly ($189.99/yr)
 *  2. Create entitlements in RevenueCat dashboard:
 *     - "premium" → premium_monthly + premium_yearly
 *     - "pro"     → pro_monthly + pro_yearly
 *  3. Fill in REVENUECAT_APPLE_KEY and REVENUECAT_GOOGLE_KEY below
 */

// ─── Keys (fill in from RevenueCat dashboard) ────────────────────────────────

const REVENUECAT_APPLE_KEY = 'appl_gjsAccdfHKSXfabKApYiOXrtjlK';
const REVENUECAT_GOOGLE_KEY = 'goog_CJOXhwvINHWikyCXHETMJtzNPhH';

// ─── Product IDs ─────────────────────────────────────────────────────────────

export const PRODUCT_IDS = {
  premium_monthly: 'com.stefana.weddingplanner.premium_monthly',
  premium_yearly: 'com.stefana.weddingplanner.premium_yearly',
  pro_monthly: 'com.stefana.weddingplanner.pro_monthly',
  pro_yearly: 'com.stefana.weddingplanner.pro_yearly',
} as const;

export type PurchasableTier = 'premium' | 'pro';
export type BillingPeriod = 'monthly' | 'yearly';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PurchaseResult {
  success: boolean;
  tier?: 'premium' | 'pro' | 'free';
  error?: string;
  cancelled?: boolean;
}

// ─── Module loader ────────────────────────────────────────────────────────────

let _Purchases: any = null;
let _initialized = false;

function isExpoGo(): boolean {
  try {
    const Constants = require('expo-constants').default;
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
}

function getModule(): any | null {
  if (isExpoGo()) return null; // RevenueCat native store unavailable in Expo Go
  if (_Purchases !== null) return _Purchases;
  try {
    _Purchases = require('react-native-purchases').default;
    return _Purchases;
  } catch {
    return null;
  }
}

// ─── Initialize ───────────────────────────────────────────────────────────────

export async function initializePurchases(userId: string): Promise<void> {
  const P = getModule();
  if (!P) return; // Expo Go — skip

  if (_initialized) {
    // Already set up — just log in with the current user
    try {
      await P.logIn(userId);
    } catch { }
    return;
  }

  try {
    const { Platform } = require('react-native');
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
    await P.configure({ apiKey });
    await P.logIn(userId);
    _initialized = true;
  } catch (e) {
    console.warn('[Purchases] init failed:', e);
  }
}

// ─── Get current tier from entitlements ──────────────────────────────────────

export async function getCurrentTier(): Promise<'free' | 'premium' | 'pro'> {
  const P = getModule();
  if (!P || !_initialized) return 'free';

  try {
    const info = await P.getCustomerInfo();
    if (info.entitlements.active['pro']) return 'pro';
    if (info.entitlements.active['premium']) return 'premium';
    return 'free';
  } catch {
    return 'free';
  }
}

// ─── Purchase a plan ─────────────────────────────────────────────────────────

export async function purchasePlan(tier: PurchasableTier, billing: BillingPeriod = 'monthly'): Promise<PurchaseResult> {
  const P = getModule();
  if (!P || !_initialized) {
    return { success: false, error: 'Purchases not available in Expo Go. Use a dev or production build.' };
  }

  const productKey = `${tier}_${billing}` as keyof typeof PRODUCT_IDS;
  const productId = PRODUCT_IDS[productKey];

  try {
    const offerings = await P.getOfferings();
    const pkg = offerings.current?.availablePackages?.find(
      (p: any) => p.product.identifier === productId
    );

    if (!pkg) {
      return { success: false, error: 'Product not found. Check RevenueCat dashboard configuration.' };
    }

    const { customerInfo } = await P.purchasePackage(pkg);

    if (customerInfo.entitlements.active['pro']) return { success: true, tier: 'pro' };
    if (customerInfo.entitlements.active['premium']) return { success: true, tier: 'premium' };
    return { success: true, tier: 'free' };

  } catch (e: any) {
    if (e?.userCancelled) return { success: false, cancelled: true };
    return { success: false, error: e?.message ?? 'Purchase failed' };
  }
}

// ─── Restore purchases ────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<PurchaseResult> {
  const P = getModule();
  if (!P || !_initialized) {
    return { success: false, error: 'Purchases not available in Expo Go.' };
  }

  try {
    const info = await P.restorePurchases();
    if (info.entitlements.active['pro']) return { success: true, tier: 'pro' };
    if (info.entitlements.active['premium']) return { success: true, tier: 'premium' };
    return { success: true, tier: 'free' };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Restore failed' };
  }
}

// ─── Check if running in Expo Go (purchases unavailable) ─────────────────────

export function isPurchasesAvailable(): boolean {
  return getModule() !== null;
}
