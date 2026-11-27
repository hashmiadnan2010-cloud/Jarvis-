import { Contact } from '../types/jarvis';

interface JarvisAndroidInterface {
  openApp: (packageName: string, fallbackUrl: string) => boolean;
  openExternalUrl: (url: string) => boolean;
  makePhoneCall: (phoneNumber: string) => boolean;
  sendWhatsApp: (phoneNumber: string, message: string) => boolean;
  getDeviceContacts: () => string;
  setBackgroundMode: (enabled: boolean) => boolean;
  configureAssistant?: (wakeWord: string, langCode: string, backgroundEnabled: boolean, alwaysOnWakeWord: boolean) => boolean;
  getBackgroundStatus?: () => string;
  requestOverlayPermission?: () => boolean;
  requestBatteryOptimization?: () => boolean;
  openDefaultAssistantSettings?: () => boolean;
  setTtsSpeakingState?: (speaking: boolean) => void;
  consumePendingWakeCommand?: () => string;
  startNativeListening: () => boolean;
  stopNativeListening: () => boolean;
  speakNativeText: (text: string, langCode: string, rate: number, pitch: number) => boolean;
  speakNativeHindi: (text: string, rate: number, pitch: number) => boolean;
  stopNativeSpeaking: () => boolean;
}

declare global {
  interface Window {
    JarvisAndroid?: JarvisAndroidInterface;
  }
}

export interface AndroidBackgroundStatus {
  isNativeAndroid: boolean;
  canDrawOverlays: boolean;
  ignoringBatteryOptimizations: boolean;
  hasMicPermission: boolean;
  alwaysOnServiceRunning: boolean;
}

let wakeLockSentinel: WakeLockSentinel | null = null;

export function isAndroidNativeApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.JarvisAndroid);
}

export function getAndroidBackgroundStatus(): AndroidBackgroundStatus {
  const fallback: AndroidBackgroundStatus = {
    isNativeAndroid: isAndroidNativeApp(),
    canDrawOverlays: false,
    ignoringBatteryOptimizations: false,
    hasMicPermission: false,
    alwaysOnServiceRunning: false,
  };
  if (typeof window === 'undefined' || !window.JarvisAndroid?.getBackgroundStatus) {
    return fallback;
  }
  try {
    const raw = window.JarvisAndroid.getBackgroundStatus();
    const parsed = JSON.parse(raw || '{}');
    return {
      isNativeAndroid: true,
      canDrawOverlays: Boolean(parsed.canDrawOverlays),
      ignoringBatteryOptimizations: Boolean(parsed.ignoringBatteryOptimizations),
      hasMicPermission: Boolean(parsed.hasMicPermission),
      alwaysOnServiceRunning: Boolean(parsed.alwaysOnServiceRunning),
    };
  } catch {
    return fallback;
  }
}

export function syncAssistantNativeConfig(
  wakeWord: string,
  langCode: string,
  backgroundEnabled: boolean,
  alwaysOnWakeWord: boolean
): boolean {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.configureAssistant) {
    return false;
  }
  try {
    return window.JarvisAndroid.configureAssistant(
      wakeWord || 'Jarvis',
      langCode || 'en-US',
      backgroundEnabled,
      alwaysOnWakeWord
    );
  } catch (e) {
    console.warn('configureAssistant failed:', e);
    return false;
  }
}

export function requestOverlayDisplayPermission(): boolean {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.requestOverlayPermission) return false;
  try {
    return window.JarvisAndroid.requestOverlayPermission();
  } catch {
    return false;
  }
}

export function requestUnrestrictedBatteryPermission(): boolean {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.requestBatteryOptimization) return false;
  try {
    return window.JarvisAndroid.requestBatteryOptimization();
  } catch {
    return false;
  }
}

export function openAndroidDefaultAssistantSettings(): boolean {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.openDefaultAssistantSettings) return false;
  try {
    return window.JarvisAndroid.openDefaultAssistantSettings();
  } catch {
    return false;
  }
}

export function consumeNativePendingWakeCommand(): string {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.consumePendingWakeCommand) return '';
  try {
    return String(window.JarvisAndroid.consumePendingWakeCommand() || '').trim();
  } catch {
    return '';
  }
}

export function openExternalWebOrApp(url: string): void {
  if (typeof window === 'undefined') return;
  if (window.JarvisAndroid?.openExternalUrl) {
    try {
      const ok = window.JarvisAndroid.openExternalUrl(url);
      if (ok) return;
    } catch (e) {
      console.warn('Native openExternalUrl failed, falling back to anchor click:', e);
    }
  }
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function openPhoneApp(packageName: string | undefined, fallbackUrl?: string): boolean {
  if (typeof window === 'undefined') return false;
  if (window.JarvisAndroid?.openApp && packageName) {
    try {
      return window.JarvisAndroid.openApp(packageName, fallbackUrl || '');
    } catch (e) {
      console.warn('Native openApp failed:', e);
    }
  }
  if (fallbackUrl) {
    openExternalWebOrApp(fallbackUrl);
    return true;
  }
  return false;
}

export function makeNativePhoneCall(phoneNumber: string): boolean {
  if (typeof window === 'undefined') return false;
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  if (!cleanPhone) return false;

  if (window.JarvisAndroid?.makePhoneCall) {
    try {
      return window.JarvisAndroid.makePhoneCall(cleanPhone);
    } catch (e) {
      console.warn('Native makePhoneCall failed:', e);
    }
  }

  const a = document.createElement('a');
  a.href = `tel:${cleanPhone}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
}

export function dispatchNativeWhatsApp(phoneNumber: string, message: string): void {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  if (typeof window !== 'undefined' && window.JarvisAndroid?.sendWhatsApp) {
    try {
      const ok = window.JarvisAndroid.sendWhatsApp(cleanPhone, message);
      if (ok) return;
    } catch (e) {
      console.warn('Native sendWhatsApp failed, using URL fallback:', e);
    }
  }

  openExternalWebOrApp(url);
}

export function loadDevicePhoneContacts(): Contact[] {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.getDeviceContacts) {
    return [];
  }
  try {
    const raw = window.JarvisAndroid.getDeviceContacts();
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.name && item.phone)
      .map((item, idx) => ({
        id: `phone-${idx}-${String(item.phone).replace(/\D/g, '').slice(-6)}`,
        name: String(item.name).trim(),
        relation: String(item.name).trim(),
        phone: String(item.phone).trim(),
        avatar: '',
        status: 'online' as const,
      }));
  } catch (e) {
    console.warn('Could not load device contacts:', e);
    return [];
  }
}

export async function toggleBackgroundKeepAlive(enabled: boolean): Promise<boolean> {
  let active = false;
  if (typeof window !== 'undefined' && window.JarvisAndroid?.setBackgroundMode) {
    try {
      active = window.JarvisAndroid.setBackgroundMode(enabled);
    } catch (e) {
      console.warn('Native setBackgroundMode failed:', e);
    }
  }

  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (enabled && !wakeLockSentinel) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        active = true;
      } else if (!enabled && wakeLockSentinel) {
        await wakeLockSentinel.release();
        wakeLockSentinel = null;
      }
    } catch {
      // Browser wake lock may require user interaction or visibility
    }
  }
  return active || enabled;
}
