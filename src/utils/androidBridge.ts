import { Contact } from '../types/jarvis';

interface JarvisAndroidInterface {
  openApp: (packageName: string, fallbackUrl: string) => boolean;
  openAppByName?: (appQuery: string, packageHintsCsv: string, fallbackUrl: string) => boolean;
  searchInApp?: (appId: string, query: string, fallbackUrl: string) => boolean;
  getInstalledApps?: () => string;
  openExternalUrl: (url: string) => boolean;
  makePhoneCall: (phoneNumber: string) => boolean;
  makeDirectCall?: (phoneNumber: string, contactName: string) => string;
  sendWhatsApp: (phoneNumber: string, message: string) => boolean;
  sendWhatsAppDirect?: (phoneNumber: string, message: string, contactName: string) => string;
  sendInstagramDirect?: (recipientName: string, message: string) => string;
  playMusicOrMedia?: (action: string, songQuery: string) => string;
  askKnowledge?: (question: string, langCode: string) => string;
  getDeviceContacts: () => string;
  getDeviceTelemetry?: () => string;
  setRingerMode?: (mode: string) => string;
  controlDeviceSetting?: (settingType: string, action: string) => string;
  setPhoneVolume?: (percent: number) => boolean;
  setPhoneBrightness?: (percent: number) => string;
  setBackgroundMode: (enabled: boolean) => boolean;
  configureAssistant?: (wakeWord: string, langCode: string, backgroundEnabled: boolean, alwaysOnWakeWord: boolean) => boolean;
  getBackgroundStatus?: () => string;
  requestOverlayPermission?: () => boolean;
  requestBatteryOptimization?: () => boolean;
  requestAccessibilityPermission?: () => boolean;
  requestDndPermission?: () => boolean;
  requestWriteSettingsPermission?: () => boolean;
  requestCorePermissions?: () => boolean;
  moveToBackgroundStandby?: () => boolean;
  openDefaultAssistantSettings?: () => boolean;
  setTtsSpeakingState?: (speaking: boolean) => void;
  consumePendingWakeCommand?: () => string;
  startNativeListening: () => boolean;
  stopNativeListening: () => boolean;
  speakNativeText: (text: string, langCode: string, rate: number, pitch: number) => boolean;
  speakNativeHindi: (text: string, rate: number, pitch: number) => boolean;
  stopNativeSpeaking: () => boolean;
}

export interface InstalledPhoneApp {
  name: string;
  packageName: string;
}

interface PhoneAppDirectoryEntry {
  id: string;
  name: string;
  aliases: string[];
  packageNames: string[];
  fallbackUrl?: string;
}

export const PHONE_APP_DIRECTORY: PhoneAppDirectoryEntry[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    aliases: ['whatsapp', 'wa', 'whatsap'],
    packageNames: ['com.whatsapp', 'com.whatsapp.w4b'],
    fallbackUrl: 'https://web.whatsapp.com',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    aliases: ['youtube', 'yt'],
    packageNames: ['com.google.android.youtube'],
    fallbackUrl: 'https://www.youtube.com',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    aliases: ['spotify', 'spotifymusic'],
    packageNames: ['com.spotify.music'],
    fallbackUrl: 'https://open.spotify.com',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    aliases: ['instagram', 'insta', 'ig'],
    packageNames: ['com.instagram.android'],
    fallbackUrl: 'https://www.instagram.com',
  },
  {
    id: 'truecaller',
    name: 'Truecaller',
    aliases: ['truecaller', 'true caller'],
    packageNames: ['com.truecaller'],
    fallbackUrl: 'https://www.truecaller.com',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    aliases: ['calendar', 'calender', 'googlecalendar'],
    packageNames: [
      'com.google.android.calendar',
      'com.android.calendar',
      'com.samsung.android.calendar',
    ],
    fallbackUrl: 'https://calendar.google.com',
  },
  {
    id: 'dialer',
    name: 'Phone Dialer',
    aliases: ['dialer', 'call', 'phone', 'phonedialer', 'phoneapp', 'contacts'],
    packageNames: [
      'com.google.android.dialer',
      'com.android.dialer',
      'com.samsung.android.dialer',
      'com.android.contacts',
    ],
    fallbackUrl: 'tel:',
  },
  {
    id: 'google',
    name: 'Google',
    aliases: ['google', 'googleapp', 'googlesearch'],
    packageNames: ['com.google.android.googlequicksearchbox', 'com.android.chrome'],
    fallbackUrl: 'https://www.google.com',
  },
  {
    id: 'freefire',
    name: 'Free Fire',
    aliases: ['freefire', 'free fire', 'freef ire', 'freefiremax', 'free fire max', 'ff'],
    packageNames: ['com.dts.freefireth', 'com.dts.freefiremax'],
    fallbackUrl: 'https://play.google.com/store/apps/details?id=com.dts.freefireth',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    aliases: ['telegram', 'tg'],
    packageNames: ['org.telegram.messenger', 'org.telegram.plus'],
    fallbackUrl: 'https://web.telegram.org',
  },
  {
    id: 'maps',
    name: 'Google Maps',
    aliases: ['maps', 'googlemaps', 'map'],
    packageNames: ['com.google.android.apps.maps'],
    fallbackUrl: 'https://maps.google.com',
  },
  {
    id: 'browser',
    name: 'Chrome',
    aliases: ['browser', 'chrome', 'googlechrome'],
    packageNames: ['com.android.chrome'],
    fallbackUrl: 'https://www.google.com',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    aliases: ['gmail', 'email', 'mail'],
    packageNames: ['com.google.android.gm'],
    fallbackUrl: 'https://mail.google.com',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    aliases: ['snapchat', 'snap'],
    packageNames: ['com.snapchat.android'],
    fallbackUrl: 'https://www.snapchat.com',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    aliases: ['facebook', 'fb'],
    packageNames: ['com.facebook.katana', 'com.facebook.lite'],
    fallbackUrl: 'https://www.facebook.com',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    aliases: ['phonepe', 'phone pe'],
    packageNames: ['com.phonepe.app'],
    fallbackUrl: 'https://www.phonepe.com',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    aliases: ['paytm'],
    packageNames: ['net.one97.paytm'],
    fallbackUrl: 'https://paytm.com',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    aliases: ['gpay', 'googlepay', 'google pay'],
    packageNames: ['com.google.android.apps.nbu.paisa.user'],
    fallbackUrl: 'https://pay.google.com',
  },
  {
    id: 'playstore',
    name: 'Play Store',
    aliases: ['playstore', 'play store'],
    packageNames: ['com.android.vending'],
    fallbackUrl: 'https://play.google.com/store',
  },
  {
    id: 'photos',
    name: 'Photos',
    aliases: ['photos', 'gallery', 'googlephotos'],
    packageNames: ['com.google.android.apps.photos', 'com.sec.android.gallery3d'],
    fallbackUrl: 'https://photos.google.com',
  },
  {
    id: 'bgmi',
    name: 'BGMI',
    aliases: ['bgmi', 'pubg', 'battlegroundsmobileindia'],
    packageNames: ['com.pubg.imobile', 'com.tencent.ig'],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    aliases: ['netflix'],
    packageNames: ['com.netflix.mediaclient'],
    fallbackUrl: 'https://www.netflix.com',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    aliases: ['amazon'],
    packageNames: ['in.amazon.mShop.android.shopping', 'com.amazon.mShop.android.shopping'],
    fallbackUrl: 'https://www.amazon.in',
  },
  {
    id: 'flipkart',
    name: 'Flipkart',
    aliases: ['flipkart'],
    packageNames: ['com.flipkart.android'],
    fallbackUrl: 'https://www.flipkart.com',
  },
  {
    id: 'settings',
    name: 'Settings',
    aliases: ['settings', 'setting', 'systemconfig'],
    packageNames: ['com.android.settings'],
  },
];

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
  accessibilityEnabled: boolean;
  hasCallPermission: boolean;
  hasContactsPermission: boolean;
  hasDndAccess: boolean;
  canWriteSettings: boolean;
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
    accessibilityEnabled: false,
    hasCallPermission: false,
    hasContactsPermission: false,
    hasDndAccess: false,
    canWriteSettings: false,
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
      accessibilityEnabled: Boolean(parsed.accessibilityEnabled),
      hasCallPermission: Boolean(parsed.hasCallPermission),
      hasContactsPermission: Boolean(parsed.hasContactsPermission),
      hasDndAccess: Boolean(parsed.hasDndAccess),
      canWriteSettings: Boolean(parsed.canWriteSettings),
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

export function requestAccessibilityAutoSendPermission(): boolean {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.requestAccessibilityPermission) return false;
  try {
    return window.JarvisAndroid.requestAccessibilityPermission();
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

export function requestDndAccessPermission(): boolean {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.requestDndPermission) return false;
  try {
    return window.JarvisAndroid.requestDndPermission();
  } catch {
    return false;
  }
}

export function requestWriteSystemSettingsPermission(): boolean {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.requestWriteSettingsPermission) return false;
  try {
    return window.JarvisAndroid.requestWriteSettingsPermission();
  } catch {
    return false;
  }
}

export function requestCoreRuntimePermissions(): boolean {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.requestCorePermissions) return false;
  try {
    return window.JarvisAndroid.requestCorePermissions();
  } catch {
    return false;
  }
}

export function moveToBackgroundStandby(): boolean {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.moveToBackgroundStandby) return false;
  try {
    return window.JarvisAndroid.moveToBackgroundStandby();
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

export function loadInstalledPhoneApps(): InstalledPhoneApp[] {
  if (typeof window === 'undefined' || !window.JarvisAndroid?.getInstalledApps) {
    return [];
  }
  try {
    const raw = window.JarvisAndroid.getInstalledApps();
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.packageName && item.name)
      .map((item) => ({
        name: String(item.name).trim(),
        packageName: String(item.packageName).trim(),
      }));
  } catch (e) {
    console.warn('Could not load installed phone apps:', e);
    return [];
  }
}

export function openAnyPhoneApp(appQuery: string, packageHint?: string, fallbackUrl?: string): boolean {
  if (typeof window === 'undefined') return false;
  const cleanQuery = String(appQuery || '').trim();
  const normQuery = cleanQuery.toLowerCase().replace(/[^a-z0-9]/g, '');

  const directoryHit = PHONE_APP_DIRECTORY.find(
    (entry) =>
      entry.id === normQuery ||
      entry.aliases.some((alias) => alias.replace(/[^a-z0-9]/g, '') === normQuery) ||
      entry.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normQuery
  );

  const candidatePackages = Array.from(
    new Set([
      ...(packageHint ? packageHint.split(',').map((p) => p.trim()).filter(Boolean) : []),
      ...(directoryHit ? directoryHit.packageNames : []),
    ])
  );
  const resolvedFallbackUrl =
    fallbackUrl ||
    directoryHit?.fallbackUrl ||
    (cleanQuery ? `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}` : '');

  if (window.JarvisAndroid?.openAppByName) {
    try {
      return window.JarvisAndroid.openAppByName(
        cleanQuery || directoryHit?.name || '',
        candidatePackages.join(','),
        resolvedFallbackUrl
      );
    } catch (e) {
      console.warn('Native openAppByName failed:', e);
    }
  }

  if (window.JarvisAndroid?.openApp && candidatePackages.length > 0) {
    for (const pkg of candidatePackages) {
      try {
        if (window.JarvisAndroid.openApp(pkg, '')) return true;
      } catch {}
    }
  }

  if (resolvedFallbackUrl) {
    openExternalWebOrApp(resolvedFallbackUrl);
    return true;
  }
  return false;
}

export function searchInsidePhoneApp(appId: string, query: string): boolean {
  if (typeof window === 'undefined') return false;
  const cleanApp = String(appId || 'youtube').trim().toLowerCase();
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return false;

  const encoded = encodeURIComponent(cleanQuery);
  let fallbackUrl = `https://www.google.com/search?q=${encoded}`;
  if (cleanApp === 'youtube' || cleanApp === 'yt') {
    fallbackUrl = `https://www.youtube.com/results?search_query=${encoded}`;
  } else if (cleanApp === 'spotify') {
    fallbackUrl = `https://open.spotify.com/search/${encoded}`;
  } else if (cleanApp === 'maps' || cleanApp === 'googlemaps') {
    fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  } else if (cleanApp === 'playstore') {
    fallbackUrl = `https://play.google.com/store/search?q=${encoded}&c=apps`;
  }

  if (window.JarvisAndroid?.searchInApp) {
    try {
      const ok = window.JarvisAndroid.searchInApp(cleanApp, cleanQuery, fallbackUrl);
      if (ok) return true;
    } catch (e) {
      console.warn('Native searchInApp failed, using URL fallback:', e);
    }
  }

  openExternalWebOrApp(fallbackUrl);
  return true;
}

export function makeNativePhoneCall(phoneNumber: string, contactName: string = ''): string {
  if (typeof window === 'undefined') return 'error';
  const cleanPhone = String(phoneNumber || '').replace(/[^\d+]/g, '');
  const cleanContact = String(contactName || '').trim();

  if (window.JarvisAndroid?.makeDirectCall) {
    try {
      return String(window.JarvisAndroid.makeDirectCall(cleanPhone, cleanContact) || 'ok');
    } catch (e) {
      console.warn('Native makeDirectCall failed:', e);
    }
  }

  if (!cleanPhone) return 'no_number';

  if (window.JarvisAndroid?.makePhoneCall) {
    try {
      const ok = window.JarvisAndroid.makePhoneCall(cleanPhone);
      return ok ? 'ok' : 'error';
    } catch (e) {
      console.warn('Native makePhoneCall failed:', e);
    }
  }

  const a = document.createElement('a');
  a.href = `tel:${cleanPhone}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return 'web_tel';
}

export function dispatchNativeWhatsApp(
  phoneNumber: string,
  message: string,
  contactName: string = ''
): string {
  const cleanPhone = String(phoneNumber || '').replace(/[^0-9]/g, '');
  const cleanContact = String(contactName || '').trim();
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  if (typeof window !== 'undefined' && window.JarvisAndroid?.sendWhatsAppDirect) {
    try {
      const status = String(window.JarvisAndroid.sendWhatsAppDirect(cleanPhone, message, cleanContact) || '');
      if (status && !status.startsWith('error')) return status;
    } catch (e) {
      console.warn('Native sendWhatsAppDirect failed, falling back:', e);
    }
  }

  if (typeof window !== 'undefined' && window.JarvisAndroid?.sendWhatsApp) {
    try {
      const ok = window.JarvisAndroid.sendWhatsApp(cleanPhone, message);
      if (ok) return 'opened';
    } catch (e) {
      console.warn('Native sendWhatsApp failed, using URL fallback:', e);
    }
  }

  openExternalWebOrApp(url);
  return 'web_fallback';
}

export function dispatchNativeInstagram(recipientName: string, message: string): string {
  const cleanRecipient = String(recipientName || '').trim();
  const cleanMessage = String(message || '').trim();
  if (typeof window !== 'undefined' && window.JarvisAndroid?.sendInstagramDirect) {
    try {
      const status = String(window.JarvisAndroid.sendInstagramDirect(cleanRecipient, cleanMessage) || '');
      if (status && !status.startsWith('error')) return status;
    } catch (e) {
      console.warn('Native sendInstagramDirect failed:', e);
    }
  }
  openAnyPhoneApp('instagram', 'com.instagram.android', 'https://www.instagram.com/direct/inbox/');
  return 'web_fallback';
}

export function controlNativeMusicPlayback(
  action: 'play' | 'pause' | 'next' | 'previous',
  songQuery: string = ''
): string {
  if (typeof window !== 'undefined' && window.JarvisAndroid?.playMusicOrMedia) {
    try {
      const status = String(window.JarvisAndroid.playMusicOrMedia(action, songQuery) || '');
      if (status && !status.startsWith('error')) return status;
    } catch (e) {
      console.warn('Native playMusicOrMedia failed:', e);
    }
  }
  if (songQuery) {
    searchInsidePhoneApp('spotify', songQuery);
  } else {
    openAnyPhoneApp('spotify', 'com.spotify.music', 'https://open.spotify.com');
  }
  return 'web_fallback';
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

export interface LiveDeviceContext {
  localDate: string;
  localDay: string;
  localTime: string;
  timezone: string;
  isoTimestamp: string;
  batteryLevel?: number;
  isCharging?: boolean;
  deviceModel?: string;
  androidVersion?: string;
  memoryUsagePercent?: number;
  ringerMode?: 'normal' | 'vibrate' | 'silent';
  wifiEnabled?: boolean;
  networkConnected?: boolean;
  networkType?: string;
  volumePercent?: number;
  hasDndAccess?: boolean;
  canWriteSettings?: boolean;
}

let cachedWebBattery: { level: number; charging: boolean } | null = null;

export async function refreshWebBatteryTelemetry(): Promise<{ level: number; charging: boolean } | null> {
  if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return null;
  try {
    const bat = await (navigator as any).getBattery();
    if (bat && typeof bat.level === 'number') {
      cachedWebBattery = {
        level: Math.round(bat.level * 100),
        charging: Boolean(bat.charging),
      };
      return cachedWebBattery;
    }
  } catch {}
  return null;
}

export function setPhoneRingerMode(mode: 'normal' | 'vibrate' | 'silent'): string {
  if (typeof window === 'undefined') return 'web_simulated';
  if (window.JarvisAndroid?.setRingerMode) {
    try {
      return String(window.JarvisAndroid.setRingerMode(mode) || 'ok');
    } catch {
      return 'error';
    }
  }
  return 'web_simulated';
}

export function controlPhoneSetting(
  settingType: string,
  action: 'on' | 'off' | 'toggle' | 'open' = 'open'
): string {
  if (typeof window === 'undefined') return 'web_simulated';
  if (window.JarvisAndroid?.controlDeviceSetting) {
    try {
      return String(window.JarvisAndroid.controlDeviceSetting(settingType, action) || 'ok');
    } catch {
      return 'error';
    }
  }
  return 'web_simulated';
}

export function setDeviceHardwareVolume(percent: number): boolean {
  if (typeof window === 'undefined') return false;
  if (window.JarvisAndroid?.setPhoneVolume) {
    try {
      return Boolean(window.JarvisAndroid.setPhoneVolume(Math.max(0, Math.min(100, Math.round(percent)))));
    } catch {
      return false;
    }
  }
  return false;
}

export function setDeviceHardwareBrightness(percent: number): string {
  if (typeof window === 'undefined') return 'web_simulated';
  if (window.JarvisAndroid?.setPhoneBrightness) {
    try {
      return String(window.JarvisAndroid.setPhoneBrightness(Math.max(5, Math.min(100, Math.round(percent)))));
    } catch {
      return 'error';
    }
  }
  return 'web_simulated';
}

export function getLiveDeviceContext(): LiveDeviceContext {
  const now = new Date();
  let tz = 'Local';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  } catch {}

  const ctx: LiveDeviceContext = {
    localDate: now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    localDay: now.toLocaleDateString('en-US', { weekday: 'long' }),
    localTime: now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
    timezone: tz,
    isoTimestamp: now.toISOString(),
  };

  if (cachedWebBattery) {
    ctx.batteryLevel = cachedWebBattery.level;
    ctx.isCharging = cachedWebBattery.charging;
  }

  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    ctx.networkConnected = navigator.onLine;
  }

  if (typeof window !== 'undefined' && window.JarvisAndroid?.getDeviceTelemetry) {
    try {
      const raw = window.JarvisAndroid.getDeviceTelemetry();
      const parsed = JSON.parse(raw || '{}');
      if (parsed.localDate) ctx.localDate = String(parsed.localDate);
      if (parsed.localDay) ctx.localDay = String(parsed.localDay);
      if (parsed.localTime) ctx.localTime = String(parsed.localTime);
      if (parsed.timezone) ctx.timezone = String(parsed.timezone);
      if (typeof parsed.batteryLevel === 'number') ctx.batteryLevel = parsed.batteryLevel;
      if (typeof parsed.isCharging === 'boolean') ctx.isCharging = parsed.isCharging;
      if (parsed.deviceModel) ctx.deviceModel = String(parsed.deviceModel);
      if (parsed.androidVersion) ctx.androidVersion = String(parsed.androidVersion);
      if (typeof parsed.memoryUsagePercent === 'number') {
        ctx.memoryUsagePercent = parsed.memoryUsagePercent;
      }
      if (parsed.ringerMode === 'normal' || parsed.ringerMode === 'vibrate' || parsed.ringerMode === 'silent') {
        ctx.ringerMode = parsed.ringerMode;
      }
      if (typeof parsed.wifiEnabled === 'boolean') ctx.wifiEnabled = parsed.wifiEnabled;
      if (typeof parsed.networkConnected === 'boolean') ctx.networkConnected = parsed.networkConnected;
      if (parsed.networkType) ctx.networkType = String(parsed.networkType);
      if (typeof parsed.volumePercent === 'number') ctx.volumePercent = parsed.volumePercent;
      if (typeof parsed.hasDndAccess === 'boolean') ctx.hasDndAccess = parsed.hasDndAccess;
      if (typeof parsed.canWriteSettings === 'boolean') ctx.canWriteSettings = parsed.canWriteSettings;
    } catch {}
  }

  return ctx;
}

