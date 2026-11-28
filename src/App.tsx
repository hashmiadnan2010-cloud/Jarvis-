import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Settings,
  Terminal,
  MessageSquare,
  Laptop,
  Shield,
  Zap,
  Power,
  RotateCcw,
  Sparkles,
  Search,
  ExternalLink,
  Camera as CameraIcon,
  Calculator as CalcIcon,
  X,
  Lock,
  Unlock,
  Radio,
  Battery,
  BatteryWarning,
  Download,
} from 'lucide-react';
import { ArcReactorHUD } from './components/ArcReactorHUD';
import { WhatsAppAutomationModal } from './components/WhatsAppAutomationModal';
import { PCControlsPanel } from './components/PCControlsPanel';
import { TerminalConsole } from './components/TerminalConsole';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { CompanionBridgeModal } from './components/CompanionBridgeModal';
import { CommandFeed } from './components/CommandFeed';
import { LowBatteryWarningOverlay } from './components/LowBatteryWarningOverlay';
import { DownloadModal } from './components/DownloadModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Contact, PCApp, SystemState, VoiceSettings, CommandLog, TerminalEntry } from './types/jarvis';
import { jarvisSpeech } from './utils/speech';
import { jarvisAudio } from './utils/audioFx';
import {
  getJarvisApiBaseUrls,
  isHighConfidenceFastAction,
  parseCommandLocallyClient,
} from './utils/localCommandParser';
import {
  consumeNativePendingWakeCommand,
  controlPhoneSetting,
  dispatchNativeWhatsApp,
  getLiveDeviceContext,
  loadDevicePhoneContacts,
  loadInstalledPhoneApps,
  makeNativePhoneCall,
  openAnyPhoneApp,
  openExternalWebOrApp,
  refreshWebBatteryTelemetry,
  searchInsidePhoneApp,
  setDeviceHardwareBrightness,
  setDeviceHardwareVolume,
  setPhoneRingerMode,
  syncAssistantNativeConfig,
  toggleBackgroundKeepAlive,
} from './utils/androidBridge';

function evaluateMathExpression(expr: string): number {
  const sanitized = expr.replace(/\s+/g, '');
  if (!sanitized || !/^[0-9+\-*/.%()]+$/.test(sanitized)) {
    throw new Error('Invalid expression');
  }
  let pos = 0;

  const parseExpression = (): number => {
    let left = parseTerm();
    while (pos < sanitized.length && (sanitized[pos] === '+' || sanitized[pos] === '-')) {
      const op = sanitized[pos++];
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number => {
    let left = parseFactor();
    while (
      pos < sanitized.length &&
      (sanitized[pos] === '*' || sanitized[pos] === '/' || sanitized[pos] === '%')
    ) {
      const op = sanitized[pos++];
      const right = parseFactor();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left /= right;
      } else {
        left %= right;
      }
    }
    return left;
  };

  const parseFactor = (): number => {
    if (sanitized[pos] === '+') {
      pos++;
      return parseFactor();
    }
    if (sanitized[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    if (sanitized[pos] === '(') {
      pos++;
      const val = parseExpression();
      if (sanitized[pos] !== ')') throw new Error('Mismatched parentheses');
      pos++;
      return val;
    }
    const start = pos;
    while (pos < sanitized.length && /[0-9.]/.test(sanitized[pos])) {
      pos++;
    }
    if (start === pos) throw new Error('Unexpected token');
    const num = Number(sanitized.slice(start, pos));
    if (Number.isNaN(num)) throw new Error('Invalid number');
    return num;
  };

  const result = parseExpression();
  if (pos !== sanitized.length || !Number.isFinite(result)) {
    throw new Error('Invalid expression');
  }
  return Number(result.toFixed(8));
}

// Initial default contacts
const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c-mother',
    name: 'Martha Stark',
    relation: 'Mother',
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    status: 'online',
    lastMessage: 'Take care and eat dinner on time!',
  },
  {
    id: 'c-father',
    name: 'Howard Stark',
    relation: 'Father',
    phone: '+91 98111 22233',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    status: 'away',
    lastMessage: 'Check the workshop telemetry.',
  },
  {
    id: 'c-boss',
    name: 'Nick Fury',
    relation: 'Boss',
    phone: '+1 415 555 0199',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    status: 'online',
    lastMessage: 'Status report on the initiative.',
  },
  {
    id: 'c-priya',
    name: 'Priya Sharma',
    relation: 'Colleague',
    phone: '+91 98222 33445',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    status: 'online',
    lastMessage: 'Shared the UI mockups.',
  },
];

// Initial PC & Mobile Apps (opens real phone apps or external URLs)
const INITIAL_APPS: PCApp[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    category: 'Communication',
    icon: '💬',
    description: 'Open phone WhatsApp Messenger',
    status: 'running',
    url: 'https://web.whatsapp.com',
    packageName: 'com.whatsapp',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'Media',
    icon: '▶️',
    description: 'Open phone YouTube App',
    status: 'idle',
    url: 'https://www.youtube.com',
    packageName: 'com.google.android.youtube',
  },
  {
    id: 'spotify',
    name: 'Spotify Music',
    category: 'Media',
    icon: '🎵',
    description: 'Open phone Spotify App',
    status: 'idle',
    url: 'https://open.spotify.com',
    packageName: 'com.spotify.music',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'Communication',
    icon: '📸',
    description: 'Open phone Instagram App',
    status: 'idle',
    url: 'https://www.instagram.com',
    packageName: 'com.instagram.android',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    category: 'Productivity',
    icon: '📅',
    description: 'Open phone Calendar App',
    status: 'idle',
    url: 'https://calendar.google.com',
    packageName: 'com.google.android.calendar,com.android.calendar,com.samsung.android.calendar',
  },
  {
    id: 'dialer',
    name: 'Phone Dialer',
    category: 'Communication',
    icon: '📞',
    description: 'Open phone Call & Dialer App',
    status: 'idle',
    url: 'tel:',
    packageName: 'com.google.android.dialer,com.android.dialer,com.samsung.android.dialer',
  },
  {
    id: 'truecaller',
    name: 'Truecaller',
    category: 'Communication',
    icon: '🛡️',
    description: 'Open phone Truecaller App',
    status: 'idle',
    url: 'https://www.truecaller.com',
    packageName: 'com.truecaller',
  },
  {
    id: 'google',
    name: 'Google',
    category: 'Productivity',
    icon: '🔎',
    description: 'Open phone Google App',
    status: 'idle',
    url: 'https://www.google.com',
    packageName: 'com.google.android.googlequicksearchbox,com.android.chrome',
  },
  {
    id: 'freefire',
    name: 'Free Fire',
    category: 'Media',
    icon: '🔥',
    description: 'Open phone Free Fire Game',
    status: 'idle',
    url: 'https://play.google.com/store/apps/details?id=com.dts.freefireth',
    packageName: 'com.dts.freefireth,com.dts.freefiremax',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    category: 'Communication',
    icon: '✈️',
    description: 'Open phone Telegram App',
    status: 'idle',
    url: 'https://web.telegram.org',
    packageName: 'org.telegram.messenger',
  },
  {
    id: 'maps',
    name: 'Google Maps',
    category: 'Productivity',
    icon: '🗺️',
    description: 'Navigation & Maps',
    status: 'idle',
    url: 'https://maps.google.com',
    packageName: 'com.google.android.apps.maps',
  },
  {
    id: 'browser',
    name: 'Chrome Browser',
    category: 'Productivity',
    icon: '🌐',
    description: 'Web navigation & search',
    status: 'running',
    url: 'https://www.google.com',
    packageName: 'com.android.chrome',
  },
  {
    id: 'terminal',
    name: 'Bash Terminal',
    category: 'System',
    icon: '⚡',
    description: 'System command console',
    status: 'running',
  },
  {
    id: 'vscode',
    name: 'VS Code',
    category: 'Development',
    icon: '💻',
    description: 'Code editor & AI workspace',
    status: 'idle',
    url: 'https://vscode.dev',
  },
  {
    id: 'camera',
    name: 'Arc Camera',
    category: 'System',
    icon: '📷',
    description: 'Visual HUD Feed & Face Recognition',
    status: 'idle',
  },
  {
    id: 'calculator',
    name: 'Sci-Calculator',
    category: 'Productivity',
    icon: '🧮',
    description: 'Quantum Math Engine',
    status: 'idle',
  },
  {
    id: 'settings',
    name: 'System Config',
    category: 'System',
    icon: '⚙️',
    description: 'Hardware preferences',
    status: 'idle',
  },
];

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  wakeWord: 'Jarvis',
  continuousListening: true,
  autoSpeakHindi: true,
  speechRate: 0.95,
  speechPitch: 0.98,
  soundEffects: true,
  autoOpenWhatsApp: true,
  backgroundMode: true,
  alwaysOnWakeWord: true,
  personalityMode: 'balanced',
  language: 'English',
  languageCode: 'en-US',
};

export default function App() {
  // Voice Settings & State (persisted in localStorage, always-on standby enabled)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('jarvis_voice_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_VOICE_SETTINGS,
          ...parsed,
          continuousListening: true,
          alwaysOnWakeWord: true,
          language: parsed.language || 'English',
          languageCode: parsed.languageCode || 'en-US',
        };
      }
    } catch {}
    return DEFAULT_VOICE_SETTINGS;
  });

  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [wakeWordDetected, setWakeWordDetected] = useState<boolean>(false);
  const [hudStatus, setHudStatus] = useState<string>('Standby // Say "Hey Jarvis" to activate');
  const [latestHindiVoice, setLatestHindiVoice] = useState<string>(
    'Hello sir, I am JARVIS. All systems are online and ready for your commands.'
  );
  const [latestEnglishAction, setLatestEnglishAction] = useState<string>(
    'Jarvis Core 4.3.0 initialized. Default language: English.'
  );

  // System Hardware State
  const [systemState, setSystemState] = useState<SystemState>({
    volume: 75,
    isMuted: false,
    brightness: 85,
    cpuUsage: 24,
    memoryUsage: 38,
    networkPing: 18,
    batteryLevel: 94,
    isCharging: true,
    isPowerSavingMode: false,
    activeAppId: 'whatsapp',
    theme: 'hologram-cyan',
    isScreenLocked: false,
    ringerMode: 'normal',
    wifiEnabled: true,
    networkType: 'wifi',
  });

  // Low Battery Warning dismissal state
  const [isLowBatteryDismissed, setIsLowBatteryDismissed] = useState<boolean>(false);
  const prevBatteryRef = useRef<number>(94);

  // Data Collections (persisted + device contacts sync on Android)
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis_contacts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_CONTACTS;
  });
  const [apps, setApps] = useState<PCApp[]>(INITIAL_APPS);
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([
    {
      id: 'cmd-init',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      userQuery: 'Jarvis system boot sequence',
      intent: 'SYSTEM_DIAGNOSTIC',
      englishActionSummary: 'All PC hardware subsystems nominal. WhatsApp automation channel active.',
      hindiVoiceReply: 'All systems online, sir. Standing by for your instructions.',
      wakeWordDetected: true,
      status: 'completed',
      quickFollowUps: ['Open Spotify', 'Open YouTube', 'Turn to Hindi'],
    },
  ]);

  const [terminalLogs, setTerminalLogs] = useState<TerminalEntry[]>([
    {
      id: 't-1',
      timestamp: new Date().toLocaleTimeString(),
      command: 'jarvis --init-core',
      output:
        '[CORE] Stark MK-85 Neural Engine Online.\n[VOICE] Wake-word detector armed ("Jarvis").\n[SPEECH] Active Language: English (Say "Turn to Hindi" anytime to switch).',
      status: 'success',
    },
    {
      id: 't-2',
      timestamp: new Date().toLocaleTimeString(),
      command: 'whatsapp-gateway --status',
      output: '[WHATSAPP] Gateway hook: READY. Primary contacts: Mother, Father, Boss, Priya.',
      status: 'info',
    },
  ]);

  // Active Modals & Tabs
  const [activeTab, setActiveTab] = useState<'hud' | 'whatsapp' | 'pc' | 'terminal'>('hud');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBridgeOpen, setIsBridgeOpen] = useState<boolean>(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState<boolean>(false);
  const [whatsAppDraft, setWhatsAppDraft] = useState<{
    recipientName: string;
    recipientPhone: string;
    message: string;
  } | null>(null);

  // Mini App Modals (Camera, Calculator)
  const [activeOverlayApp, setActiveOverlayApp] = useState<'camera' | 'calculator' | null>(null);
  const [calcInput, setCalcInput] = useState<string>('0');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Typing prompt input
  const [typedCommand, setTypedCommand] = useState<string>('');

  // Audio effects enabled sync
  useEffect(() => {
    jarvisAudio.enabled = voiceSettings.soundEffects;
  }, [voiceSettings.soundEffects]);

  // Speak aloud in active language (English by default, or switched language)
  const lastWakeAckAtRef = useRef<number>(0);

  const speakHindiVoice = useCallback(
    (spokenText: string, overrideLangCode?: string, overrideRate?: number) => {
      if (!voiceSettings.autoSpeakHindi || !spokenText) return;

      setIsSpeaking(true);
      jarvisSpeech.speakText(spokenText, {
        langCode: overrideLangCode || voiceSettings.languageCode || 'en-US',
        rate: overrideRate ?? voiceSettings.speechRate,
        pitch: voiceSettings.speechPitch,
        preferredVoiceName: voiceSettings.preferredHindiVoiceName,
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
      });
    },
    [voiceSettings]
  );

  // Sync Android phonebook contacts & all installed launcher apps on startup and permission updates
  useEffect(() => {
    const syncNativeDirectory = () => {
      const deviceContacts = loadDevicePhoneContacts();
      if (deviceContacts.length > 0) {
        setContacts((prev) => {
          const customSaved = prev.filter(
            (c) => !String(c.id || '').startsWith('c-') && !String(c.id || '').startsWith('phone-')
          );
          const merged = [...customSaved];
          const seenPhones = new Set(
            merged.map((c) => c.phone.replace(/\D/g, '').slice(-10)).filter(Boolean)
          );
          for (const dc of deviceContacts) {
            const key = dc.phone.replace(/\D/g, '').slice(-10);
            if (!key || !seenPhones.has(key)) {
              if (key) seenPhones.add(key);
              merged.push(dc);
            }
          }
          return merged;
        });
      }

      const installedPhoneApps = loadInstalledPhoneApps();
      if (installedPhoneApps.length > 0) {
        setApps((prev) => {
          const existingPkgs = new Set(
            prev.flatMap((a) =>
              String(a.packageName || '')
                .split(',')
                .map((p) => p.trim().toLowerCase())
                .filter(Boolean)
            )
          );
          const existingNames = new Set(
            prev.map((a) => a.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
          );

          const discovered: PCApp[] = [];
          for (const item of installedPhoneApps) {
            const pkgLower = item.packageName.toLowerCase();
            const normName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (existingPkgs.has(pkgLower) || existingNames.has(normName)) continue;
            existingPkgs.add(pkgLower);
            existingNames.add(normName);
            discovered.push({
              id: `phone-${item.packageName}`,
              name: item.name,
              category: 'System',
              icon: '📱',
              description: `Installed Android app (${item.packageName})`,
              status: 'idle',
              packageName: item.packageName,
            });
          }
          return discovered.length > 0 ? [...prev, ...discovered] : prev;
        });
      }
    };

    syncNativeDirectory();

    const applyDeviceTelemetry = async () => {
      await refreshWebBatteryTelemetry();
      const telemetry = getLiveDeviceContext();
      setSystemState((s) => ({
        ...s,
        batteryLevel:
          typeof telemetry.batteryLevel === 'number' ? telemetry.batteryLevel : s.batteryLevel,
        isCharging:
          typeof telemetry.isCharging === 'boolean' ? telemetry.isCharging : s.isCharging,
        memoryUsage:
          typeof telemetry.memoryUsagePercent === 'number'
            ? telemetry.memoryUsagePercent
            : s.memoryUsage,
        ringerMode: telemetry.ringerMode || s.ringerMode,
        wifiEnabled:
          typeof telemetry.wifiEnabled === 'boolean' ? telemetry.wifiEnabled : s.wifiEnabled,
        networkType: telemetry.networkType || s.networkType,
        volume:
          typeof telemetry.volumePercent === 'number' ? telemetry.volumePercent : s.volume,
      }));
    };

    applyDeviceTelemetry();

    const warmNeuralLink = () => {
      const urls = getJarvisApiBaseUrls();
      for (const base of urls) {
        fetch(`${base}/api/health`).catch(() => {});
      }
    };
    warmNeuralLink();
    const keepAliveTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        warmNeuralLink();
        applyDeviceTelemetry();
      }
    }, 30000);
    const handleFocusRefresh = () => {
      if (document.visibilityState === 'visible') {
        syncNativeDirectory();
        applyDeviceTelemetry();
      }
    };
    window.addEventListener('online', warmNeuralLink);
    window.addEventListener('focus', handleFocusRefresh);
    window.addEventListener('jarvis-permissions-updated', syncNativeDirectory);
    document.addEventListener('visibilitychange', handleFocusRefresh);

    return () => {
      window.clearInterval(keepAliveTimer);
      window.removeEventListener('online', warmNeuralLink);
      window.removeEventListener('focus', handleFocusRefresh);
      window.removeEventListener('jarvis-permissions-updated', syncNativeDirectory);
      document.removeEventListener('visibilitychange', handleFocusRefresh);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('jarvis_voice_settings', JSON.stringify(voiceSettings));
    } catch {}
  }, [voiceSettings]);

  useEffect(() => {
    const bgEnabled = Boolean(voiceSettings.backgroundMode ?? true);
    const alwaysOnEnabled = Boolean(voiceSettings.alwaysOnWakeWord ?? true);
    toggleBackgroundKeepAlive(bgEnabled);
    syncAssistantNativeConfig(
      voiceSettings.wakeWord,
      voiceSettings.languageCode || 'en-US',
      bgEnabled,
      alwaysOnEnabled
    );
    jarvisSpeech.setRecognitionLanguage(voiceSettings.languageCode || 'en-US');

    const stripIncomingWake = (raw: string): string => {
      const trimmed = raw.trim();
      if (/^(?:hey|hay|he|ey|a|ok|hi|हे|ऐ|ओ)[,\s]+(?:youtube|yt|यूट्यूब|google|गूगल|spotify|स्पॉटिफाई)\b/i.test(trimmed)) {
        return trimmed.replace(/^(?:hey|hay|he|ey|a|ok|hi|हे|ऐ|ओ)[,\s]+/i, '').trim();
      }
      const normalizedWake = (voiceSettings.wakeWord || 'Jarvis')
        .replace(/^(hey|hay|he|ey|ok|okay|hi|hello|yo)[,\s]+/i, '')
        .trim() || 'Jarvis';
      const escapedWake = normalizedWake.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wakePattern = new RegExp(
        `^(?:hey|hay|he|ey|a|ok|okay|hi|hello|yo|हे|ऐ|अरे|ओ|सुनो)?[,\\s:-]*(?:${escapedWake}|jarvis|jarvish|jarvas|jarvice|jarves|jarviz|javis|jervis|charvis|jarwis|जार्विस|जर्विस|जरविस|जार्विश)[,\\s:-]*`,
        'i'
      );
      let out = trimmed;
      for (let i = 0; i < 4; i++) {
        const next = out.replace(wakePattern, '').trim();
        if (next === out) break;
        out = next;
      }
      return out;
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (bgEnabled) {
          toggleBackgroundKeepAlive(true);
        }
        const pendingCmd = consumeNativePendingWakeCommand();
        if (pendingCmd) {
          const cleanPending = stripIncomingWake(pendingCmd);
          if (cleanPending) {
            processJarvisCommandRef.current(cleanPending, true);
          } else {
            const now = Date.now();
            if (now - lastWakeAckAtRef.current < 1200) return;
            lastWakeAckAtRef.current = now;
            const isHindi = (voiceSettings.language || 'English') === 'Hindi';
            const ackSpeech = isHindi ? 'जी सर!' : 'Yes sir!';
            jarvisSpeech.openCommandWindow(15000);
            setWakeWordDetected(true);
            jarvisAudio.playWakeWordDetected();
            setHudStatus(`${ackSpeech} (Listening for fast command...)`);
            setLatestHindiVoice(ackSpeech);
            speakHindiVoiceRef.current(ackSpeech, undefined, Math.max(voiceSettings.speechRate || 1, 1.24));
          }
        }
      }
    };

    // Also check once on mount in case Android woke JARVIS from cold start
    const initialPending = consumeNativePendingWakeCommand();
    if (initialPending) {
      setTimeout(() => {
        const cleanInitial = stripIncomingWake(initialPending);
        if (cleanInitial) {
          processJarvisCommandRef.current(cleanInitial, true);
        }
      }, 450);
    }

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    voiceSettings.backgroundMode,
    voiceSettings.alwaysOnWakeWord,
    voiceSettings.wakeWord,
    voiceSettings.languageCode,
    voiceSettings.language,
  ]);

  // Safe external link opener (Android Intent or Browser new tab)
  const openExternalLink = useCallback((url: string) => {
    openExternalWebOrApp(url);
  }, []);

  // Send WhatsApp message directly in phone WhatsApp / WhatsApp Web
  const handleDispatchWhatsApp = useCallback(
    (phone: string, text: string, contactName: string): string => {
      const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
      let dispatchResult = 'queued';

      if (voiceSettings.autoOpenWhatsApp) {
        dispatchResult = dispatchNativeWhatsApp(phone, text, contactName);
      }

      setTerminalLogs((prev) => [
        {
          id: `t-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          command: `whatsapp --send-direct "${contactName}" "${text}"`,
          output: `[WHATSAPP DISPATCH] Recipient: ${contactName} (${cleanPhone || 'lookup'})\nMessage: "${text}"\nStatus: ${
            dispatchResult === 'sent_auto'
              ? 'Auto-send armed and dispatched directly in WhatsApp.'
              : dispatchResult === 'opened_needs_accessibility'
              ? 'Opened WhatsApp chat. Enable JARVIS Direct Auto-Send in Accessibility Settings for zero-tap sending.'
              : `Launched in WhatsApp (${dispatchResult}).`
          }`,
          status: dispatchResult === 'sent_auto' ? 'success' : 'info',
        },
        ...prev,
      ]);
      return dispatchResult;
    },
    [voiceSettings.autoOpenWhatsApp]
  );

  // Place real direct phone call via Android ACTION_CALL Intent or tel: URI
  const handleMakePhoneCall = useCallback((phone: string, contactName: string): string => {
    jarvisAudio.playTaskSuccess();
    const callRes = makeNativePhoneCall(phone, contactName);

    setTerminalLogs((prev) => [
      {
        id: `t-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        command: `phone --call-direct "${contactName}" (${phone || 'contacts-lookup'})`,
        output: `[PHONE DIRECT CALL] Placing direct call to ${contactName} (${callRes})...`,
        status: callRes.startsWith('error') || callRes === 'no_number' ? 'warn' : 'success',
      },
      ...prev,
    ]);
    return callRes;
  }, []);

  // Camera preview handling
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
    }
  }, []);

  // Launch ANY Phone or Desktop App (supports Insta, Calendar, Dialer, Truecaller, Google, Free Fire, and every installed Android app)
  const handleLaunchApp = useCallback(
    (appIdOrName: string, targetLabel?: string) => {
      jarvisAudio.playTerminalTick();
      const rawKey = String(appIdOrName || '').trim();
      const normKey = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      const app = apps.find(
        (a) =>
          a.id.toLowerCase() === rawKey.toLowerCase() ||
          a.name.toLowerCase() === rawKey.toLowerCase() ||
          a.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normKey ||
          (normKey.length >= 3 && a.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normKey))
      );

      const resolvedId = app?.id || rawKey.toLowerCase();
      setSystemState((s) => ({ ...s, activeAppId: resolvedId }));

      if (resolvedId === 'terminal') {
        setActiveTab('terminal');
      } else if (resolvedId === 'camera') {
        setActiveOverlayApp('camera');
        startCamera();
      } else if (resolvedId === 'calculator') {
        setActiveOverlayApp('calculator');
      } else if (resolvedId === 'settings') {
        openAnyPhoneApp(targetLabel || app?.name || 'Settings', app?.packageName);
      } else {
        openAnyPhoneApp(targetLabel || app?.name || rawKey, app?.packageName, app?.url);
      }

      const displayLabel = targetLabel || app?.name || rawKey.toUpperCase();
      setTerminalLogs((prev) => [
        {
          id: `t-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          command: `launch --app ${displayLabel}`,
          output: `[OS APP LAUNCHER] Launched "${displayLabel}" on device.`,
          status: 'info',
        },
        ...prev,
      ]);
    },
    [apps, startCamera]
  );

  const handleSetRingerMode = useCallback(
    (mode: 'normal' | 'vibrate' | 'silent', announce: boolean = true): string => {
      const res = setPhoneRingerMode(mode);
      if (res === 'needs_dnd_permission') {
        const isHindi = (voiceSettings.language || 'English') === 'Hindi';
        const promptText = isHindi
          ? 'सर, साइलेंट या वाइब्रेशन मोड बदलने के लिए कृपया खुलने वाली सेटिंग्स स्क्रीन पर JARVIS को Do Not Disturb अनुमति दें।'
          : 'Sir, please allow Do Not Disturb access for JARVIS on the screen that just opened so I can switch silent and vibration modes.';
        if (announce) {
          setHudStatus('Do Not Disturb Permission Required');
          setLatestEnglishAction('Opened Android Do Not Disturb access settings for JARVIS.');
          setLatestHindiVoice(promptText);
          speakHindiVoice(promptText);
        }
        setTerminalLogs((prev) => [
          {
            id: `t-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            command: `phone --ringer ${mode}`,
            output: `[RINGER CONTROL] Do Not Disturb policy permission required. Opened Android DND access settings.`,
            status: 'warn',
          },
          ...prev,
        ]);
        return res;
      }

      jarvisAudio.playHardwareTick();
      setSystemState((s) => ({ ...s, ringerMode: mode }));
      const label = mode === 'vibrate' ? 'Vibration Mode' : mode === 'silent' ? 'Silent Mode' : 'Normal Mode';
      if (announce) {
        const isHindi = (voiceSettings.language || 'English') === 'Hindi';
        const spoken = isHindi
          ? `जी सर, फोन को ${label} में बदल दिया गया है।`
          : `Yes sir, phone switched to ${label}.`;
        setHudStatus(`Sound Profile: ${label}`);
        setLatestEnglishAction(`Phone sound profile switched to ${label} (${res}).`);
        setLatestHindiVoice(spoken);
        speakHindiVoice(spoken);
      }
      setTerminalLogs((prev) => [
        {
          id: `t-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          command: `phone --ringer ${mode}`,
          output: `[RINGER CONTROL] Phone sound profile set to ${label} (status: ${res}).`,
          status: 'success',
        },
        ...prev,
      ]);
      return res;
    },
    [speakHindiVoice, voiceSettings.language]
  );

  const handleControlDeviceSetting = useCallback(
    (
      settingType: string,
      action: 'on' | 'off' | 'toggle' | 'open' = 'open',
      label?: string,
      announce: boolean = true
    ): string => {
      jarvisAudio.playHardwareTick();
      const res = controlPhoneSetting(settingType, action);
      const displayLabel = label || settingType.replace(/_/g, ' ').toUpperCase();

      if (announce) {
        const isHindi = (voiceSettings.language || 'English') === 'Hindi';
        const spoken = isHindi
          ? `जी सर, ${displayLabel} कंट्रोल खोल दिया गया है।`
          : `Yes sir, ${displayLabel} control opened.`;
        setHudStatus(`Setting: ${displayLabel}`);
        setLatestEnglishAction(`Executed ${displayLabel} (${action}) -> ${res}.`);
        setLatestHindiVoice(spoken);
        speakHindiVoice(spoken);
      }

      setTerminalLogs((prev) => [
        {
          id: `t-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          command: `settings --${settingType} ${action}`,
          output: `[DEVICE SETTINGS] ${displayLabel} (${action}) -> ${res}`,
          status: res.startsWith('error') ? 'warn' : 'info',
        },
        ...prev,
      ]);

      window.setTimeout(() => {
        const telemetry = getLiveDeviceContext();
        setSystemState((s) => ({
          ...s,
          batteryLevel:
            typeof telemetry.batteryLevel === 'number' ? telemetry.batteryLevel : s.batteryLevel,
          isCharging:
            typeof telemetry.isCharging === 'boolean' ? telemetry.isCharging : s.isCharging,
          ringerMode: telemetry.ringerMode || s.ringerMode,
          wifiEnabled:
            typeof telemetry.wifiEnabled === 'boolean' ? telemetry.wifiEnabled : s.wifiEnabled,
          networkType: telemetry.networkType || s.networkType,
        }));
      }, 800);

      return res;
    },
    [speakHindiVoice, voiceSettings.language]
  );

  const isProcessingRef = useRef<boolean>(false);
  const commandLogsRef = useRef<CommandLog[]>(commandLogs);
  commandLogsRef.current = commandLogs;

  // Process command through Gemini API endpoint (or offline fallback)
  const processJarvisCommand = useCallback(
    async (commandText: string, wakeTriggered: boolean = false) => {
      const clean = commandText.trim();
      if (!clean || isProcessingRef.current) return;

      isProcessingRef.current = true;
      setIsProcessing(true);
      setHudStatus(`Executing: "${clean}"`);
      jarvisAudio.playTerminalTick();

      try {
        const recentHistory = commandLogsRef.current
          .slice(0, 5)
          .reverse()
          .map((l) => ({
            user: l.userQuery,
            assistantEnglish: l.englishActionSummary,
            assistantHindi: l.hindiVoiceReply,
          }));

        const activeLang = voiceSettings.language || 'English';
        const activeLangCode = voiceSettings.languageCode || 'en-US';
        const liveDeviceContext = getLiveDeviceContext();

        const localCandidate = parseCommandLocallyClient(
          commandText,
          voiceSettings.wakeWord,
          contacts,
          voiceSettings.personalityMode || 'balanced',
          activeLang,
          activeLangCode,
          liveDeviceContext
        );

        let data: any = null;
        if (isHighConfidenceFastAction(commandText, localCandidate)) {
          // Execute clear phone/device/clock/language actions instantaneously (0ms network wait)
          data = localCandidate;
        } else {
          // Route general questions, reasoning, and chat through the live AI backend
          const candidateBases = getJarvisApiBaseUrls();
          for (const apiBase of candidateBases) {
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 7500);
            try {
              const res = await fetch(`${apiBase}/api/jarvis/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                  command: commandText,
                  contacts,
                  currentSystemState: {
                    ...systemState,
                    batteryLevel: liveDeviceContext.batteryLevel ?? systemState.batteryLevel,
                    isCharging: liveDeviceContext.isCharging ?? systemState.isCharging,
                    memoryUsage: liveDeviceContext.memoryUsagePercent ?? systemState.memoryUsage,
                  },
                  deviceContext: liveDeviceContext,
                  customWakeWord: voiceSettings.wakeWord,
                  personalityMode: voiceSettings.personalityMode || 'balanced',
                  activeLanguage: activeLang,
                  activeLanguageCode: activeLangCode,
                  conversationHistory: recentHistory,
                }),
              });
              window.clearTimeout(timeoutId);
              if (res.ok) {
                data = await res.json();
                break;
              }
            } catch {
              window.clearTimeout(timeoutId);
            }
          }
        }

        if (!data) {
          data = localCandidate;
        }

        const {
          intent = 'GENERAL_CONVERSATION',
          actionPayload = {},
          quickFollowUps = [],
        } = data;

        let finalEnglishSummary =
          data.englishActionSummary || `Processed command: "${clean}"`;
        let finalVoiceReply =
          data.hindiVoiceReply ||
          (activeLang === 'Hindi'
            ? 'जी सर, आपका आदेश पूरा किया गया है।'
            : 'Yes sir, your command has been processed.');

        let targetLangCodeForSpeech: string | undefined;
        if (intent === 'SET_LANGUAGE' && actionPayload?.targetLanguage) {
          const nextLang = String(actionPayload.targetLanguage);
          const nextCode = String(actionPayload.targetLanguageCode || 'en-US');
          targetLangCodeForSpeech = nextCode;
          setVoiceSettings((prev) => ({
            ...prev,
            language: nextLang,
            languageCode: nextCode,
          }));
        }

        // Execute DEVICE_SETTING synchronously before speaking so permission prompts replace normal reply cleanly
        if (intent === 'DEVICE_SETTING') {
          const sType = String(actionPayload.settingType || '').toLowerCase();
          let sActRaw = String(actionPayload.settingAction || 'open').toLowerCase();
          if (sActRaw === 'open' || !sActRaw) {
            const lowerCmd = commandText.toLowerCase();
            if (/\b(off|disable|band|close|stop)\b/.test(lowerCmd)) sActRaw = 'off';
            else if (/\b(on|enable|chalu|start)\b/.test(lowerCmd)) sActRaw = 'on';
          }
          if (sType === 'ringer' || actionPayload.ringerMode) {
            const targetHint = `${sActRaw} ${String(actionPayload.target || '').toLowerCase()}`;
            const targetMode: 'normal' | 'vibrate' | 'silent' =
              actionPayload.ringerMode ||
              (/vibrat/.test(targetHint)
                ? 'vibrate'
                : /silent|mute|dnd/.test(targetHint)
                ? 'silent'
                : 'normal');
            const ringerRes = handleSetRingerMode(targetMode, false);
            if (ringerRes === 'needs_dnd_permission') {
              finalEnglishSummary =
                'Do Not Disturb access is required on Android to switch Silent/Vibration modes. Opened permission screen.';
              finalVoiceReply =
                activeLang === 'Hindi'
                  ? 'सर, साइलेंट या वाइब्रेशन मोड बदलने के लिए कृपया खुलने वाली स्क्रीन पर JARVIS को Do Not Disturb अनुमति दें।'
                  : 'Sir, please grant Do Not Disturb access to JARVIS on the screen that just opened so I can change silent and vibration modes.';
            }
          } else if (sType) {
            const settingAction: 'on' | 'off' | 'toggle' | 'open' =
              sActRaw === 'on' || sActRaw === 'off' || sActRaw === 'toggle' || sActRaw === 'open'
                ? sActRaw
                : 'open';
            const settingRes = handleControlDeviceSetting(
              sType,
              settingAction,
              actionPayload.target,
              false
            );
            if (sType === 'wifi') {
              if (settingRes === 'ok:wifi_on' || settingRes === 'ok:wifi_off') {
                const stateWord = settingRes === 'ok:wifi_on' ? 'on' : 'off';
                finalEnglishSummary = `Yes sir, Wi-Fi has been turned ${stateWord}.`;
                finalVoiceReply =
                  activeLang === 'Hindi'
                    ? `जी सर, वाई-फाई ${stateWord === 'on' ? 'चालू' : 'बंद'} कर दिया गया है।`
                    : finalEnglishSummary;
              } else if (settingRes.startsWith('panel:')) {
                finalEnglishSummary =
                  'Opened Android Wi-Fi toggle panel. Tap the Wi-Fi switch to apply (Android 10+ blocks silent Wi-Fi toggling).';
                finalVoiceReply =
                  activeLang === 'Hindi'
                    ? 'सर, मैंने एंड्रॉयड का वाई-फाई पैनल खोल दिया है—कृपया स्विच पर टैप करें।'
                    : 'Sir, I opened the Android Wi-Fi quick panel for you—tap the switch to apply.';
              } else if (settingRes === 'web_simulated') {
                finalEnglishSummary =
                  'Wi-Fi toggle detected. Install/open the JARVIS Android APK on your phone to control device Wi-Fi.';
                finalVoiceReply =
                  activeLang === 'Hindi'
                    ? 'वाई-फाई बदलने के लिए कृपया अपने फोन में JARVIS एंड्रॉयड ऐप का उपयोग करें।'
                    : 'Please run JARVIS on the Android APK on your phone to control Wi-Fi settings.';
              }
            }
          }
        }

        setLatestEnglishAction(finalEnglishSummary);
        setLatestHindiVoice(finalVoiceReply);
        setHudStatus('Task Executed Successfully');

        jarvisAudio.playTaskSuccess();
        speakHindiVoice(finalVoiceReply, targetLangCodeForSpeech);

        const newLog: CommandLog = {
          id: `cmd-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          userQuery: commandText,
          intent: intent || 'GENERAL_CONVERSATION',
          englishActionSummary: finalEnglishSummary,
          hindiVoiceReply: finalVoiceReply,
          wakeWordDetected: wakeTriggered,
          actionPayload,
          quickFollowUps,
          status: 'completed',
        };
        setCommandLogs((prev) => [newLog, ...prev]);

        // Resolve matching contact helper (prefers real device contacts)
        const resolveContact = (targetStr: string) => {
          const t = String(targetStr || '').toLowerCase().trim();
          const isMom = /\b(mom|mommy|mummy|maa|mother|mata|mataji|amma)\b|मॉम|मम्मी|माँ|मां/.test(t);
          const isDad = /\b(dad|daddy|papa|father|pita|pitaji)\b|पापा|डैड|पिता/.test(t);
          const ordered = [
            ...contacts.filter((c) => !String(c.id || '').startsWith('c-')),
            ...contacts.filter((c) => String(c.id || '').startsWith('c-')),
          ];
          return (
            ordered.find((c) => {
              const rel = c.relation.toLowerCase();
              const name = c.name.toLowerCase();
              return (
                rel === t ||
                name === t ||
                (t.length >= 2 && (name.includes(t) || rel.includes(t))) ||
                (isMom && (rel === 'mother' || /\b(mom|mommy|mummy|maa|mother)\b|मॉम|मम्मी|माँ/.test(name) || /\b(mom|mummy|maa|mother)\b/.test(rel))) ||
                (isDad && (rel === 'father' || /\b(dad|daddy|papa|father)\b|पापा|डैड/.test(name) || /\b(dad|papa|father)\b/.test(rel)))
              );
            }) || null
          );
        };

        if (intent === 'CALL_CONTACT') {
          const target = actionPayload.target || 'Mom';
          const matchedContact = resolveContact(target);
          const isPlaceholderContact = matchedContact && String(matchedContact.id || '').startsWith('c-');
          const phoneToCall =
            actionPayload.recipientPhone || (!isPlaceholderContact ? matchedContact?.phone : '') || '';
          const displayName = matchedContact?.name || matchedContact?.relation || target;
          const callRes = handleMakePhoneCall(phoneToCall, displayName);
          if (callRes === 'no_number') {
            const msgNoNum =
              activeLang === 'Hindi'
                ? `सर, ${displayName} का नंबर आपके फोन कॉन्टैक्ट्स में नहीं मिला—कृपया कॉन्टैक्ट्स अनुमति दें या नाम जांचें।`
                : `Sir, I could not find a phone number for ${displayName} in your contacts.`;
            setLatestEnglishAction(`No phone number found in contacts for ${displayName}.`);
            setLatestHindiVoice(msgNoNum);
            speakHindiVoice(msgNoNum);
          }
        } else if (intent === 'WHATSAPP_SEND') {
          const target = actionPayload.target || 'Mom';
          const matchedContact = resolveContact(target);
          const isPlaceholderContact = matchedContact && String(matchedContact.id || '').startsWith('c-');
          const phoneToMsg =
            actionPayload.recipientPhone || (!isPlaceholderContact ? matchedContact?.phone : '') || '';
          const displayName = matchedContact?.name || matchedContact?.relation || target;
          const messageBody = actionPayload.message || 'Hello!';

          setWhatsAppDraft({
            recipientName: displayName,
            recipientPhone: phoneToMsg,
            message: messageBody,
          });

          if (voiceSettings.autoOpenWhatsApp) {
            const waRes = handleDispatchWhatsApp(phoneToMsg, messageBody, displayName);
            if (waRes === 'opened_needs_accessibility') {
              setHudStatus('WhatsApp Opened // Enable Auto-Send in Settings');
            } else if (waRes === 'sent_auto') {
              setHudStatus(`WhatsApp Auto-Sent to ${displayName}`);
            }
          } else {
            setActiveTab('whatsapp');
          }
        } else if (intent === 'SEARCH_WEB') {
          const searchAppId = String(actionPayload.appId || 'youtube').toLowerCase();
          const searchQuery = String(actionPayload.searchQuery || clean).trim();
          searchInsidePhoneApp(searchAppId, searchQuery);
          setTerminalLogs((prev) => [
            {
              id: `t-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              command: `search --app ${searchAppId} "${searchQuery}"`,
              output: `[IN-APP SEARCH] Searching "${searchQuery}" inside ${actionPayload.target || searchAppId}.`,
              status: 'info',
            },
            ...prev,
          ]);
        } else if (intent === 'SYSTEM_VOLUME') {
          if (typeof actionPayload.volumeLevel === 'number') {
            const vol = Math.max(0, Math.min(100, actionPayload.volumeLevel));
            setDeviceHardwareVolume(vol);
            setSystemState((s) => ({ ...s, volume: vol, isMuted: vol === 0 }));
          } else if (commandText.toLowerCase().includes('mute')) {
            setDeviceHardwareVolume(0);
            setSystemState((s) => ({ ...s, isMuted: true }));
          } else if (commandText.toLowerCase().includes('unmute')) {
            setDeviceHardwareVolume(systemState.volume || 75);
            setSystemState((s) => ({ ...s, isMuted: false }));
          }
        } else if (intent === 'SYSTEM_BRIGHTNESS') {
          if (typeof actionPayload.brightnessLevel === 'number') {
            const br = Math.max(10, Math.min(100, actionPayload.brightnessLevel));
            setDeviceHardwareBrightness(br);
            setSystemState((s) => ({ ...s, brightness: br }));
          }
        } else if (intent === 'LAUNCH_APP') {
          const appIdHint = String(actionPayload.appId || '').trim();
          const appTarget = String(actionPayload.target || '').trim();
          const query = appIdHint || appTarget;
          const normHint = query.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchApp = apps.find(
            (a) =>
              a.id.toLowerCase() === query.toLowerCase() ||
              a.name.toLowerCase() === appTarget.toLowerCase() ||
              a.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normHint ||
              (normHint.length >= 3 && a.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normHint))
          );
          handleLaunchApp(matchApp ? matchApp.id : query, appTarget || matchApp?.name || query);
        } else if (intent === 'SYSTEM_TERMINAL') {
          setActiveTab('terminal');
          setTerminalLogs((prev) => [
            {
              id: `t-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              command: actionPayload.terminalCommand || commandText,
              output: `[AUTOMATED BASH] Process PID #${Math.floor(Math.random() * 8000 + 1000)} executed.\nStatus: 0 (OK)\nTelemetry: ${finalEnglishSummary}`,
              status: 'success',
            },
            ...prev,
          ]);
        }
      } catch (err) {
        console.error('Command processing error:', err);
        const isHindi = (voiceSettings.language || 'English') === 'Hindi';
        const errSpeech = isHindi
          ? 'क्षमा करें सर, कमांड को प्रोसेस करने में कुछ समस्या आई है।'
          : 'Sorry sir, there was an issue processing that command.';
        setHudStatus('Neural Link Error');
        setLatestEnglishAction('Command execution could not be routed to AI backend.');
        setLatestHindiVoice(errSpeech);
        speakHindiVoice(errSpeech);
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [
      contacts,
      systemState,
      voiceSettings,
      apps,
      speakHindiVoice,
      handleDispatchWhatsApp,
      handleMakePhoneCall,
      handleLaunchApp,
      handleSetRingerMode,
      handleControlDeviceSetting,
    ]
  );

  // Stable references for continuous speech callbacks to prevent auto on/off toggling
  const processJarvisCommandRef = useRef(processJarvisCommand);
  processJarvisCommandRef.current = processJarvisCommand;

  const speakHindiVoiceRef = useRef(speakHindiVoice);
  speakHindiVoiceRef.current = speakHindiVoice;

  // Setup Always-On Mic Standby + Fast Wake-Word Reaction
  useEffect(() => {
    jarvisSpeech.setWakeWord(voiceSettings.wakeWord);
    const normalizedWakeLabel =
      (voiceSettings.wakeWord || 'Jarvis').replace(/^(hey|hay|ok|hi|hello)[,\s]+/i, '').trim() || 'Jarvis';

    jarvisSpeech.setCallbacks({
      onWakeWordTriggered: () => {
        setWakeWordDetected(true);
        jarvisAudio.playWakeWordDetected();
        setHudStatus('Active // Listening now...');
      },
      onCommandHeard: (command: string, wakeMatched: boolean) => {
        let cleanCommand = command.trim();

        const isDirectAppWake =
          /^(?:hey|hay|he|ey|a|ok|hi|हे|ऐ|ओ)[,\s]+(?:youtube|yt|यूट्यूब|google|गूगल|spotify|स्पॉटिफाई)\b/i.test(
            cleanCommand
          );
        if (isDirectAppWake) {
          cleanCommand = cleanCommand.replace(/^(?:hey|hay|he|ey|a|ok|hi|हे|ऐ|ओ)[,\s]+/i, '').trim();
        } else {
          const escapedWake = normalizedWakeLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const wakePattern = new RegExp(
            `^(?:hey|hay|he|ey|a|ok|okay|hi|hello|yo|हे|ऐ|अरे|ओ|सुनो)?[,\\s:-]*(?:${escapedWake}|jarvis|jarvish|jarvas|jarvice|jarves|jarviz|javis|jervis|charvis|jarwis|जार्विस|जर्विस|जरविस|जार्विश)[,\\s:-]*`,
            'i'
          );
          for (let i = 0; i < 4; i++) {
            const next = cleanCommand.replace(wakePattern, '').trim();
            if (next === cleanCommand) break;
            cleanCommand = next;
          }
        }

        // If the user ONLY said "Hey Jarvis" / "Jarvis" without a task: instant "Yes sir!" + 15s fast-command window
        if (!cleanCommand) {
          const now = Date.now();
          if (now - lastWakeAckAtRef.current < 1200) return;
          lastWakeAckAtRef.current = now;
          const isHindi = (voiceSettings.language || 'English') === 'Hindi';
          const ackSpeech = isHindi ? 'जी सर!' : 'Yes sir!';
          setWakeWordDetected(true);
          jarvisAudio.playWakeWordDetected();
          setHudStatus(`${ackSpeech} (Listening for fast command...)`);
          setLatestHindiVoice(ackSpeech);
          setLatestEnglishAction(`Jarvis active: "${ackSpeech}". Speak your command...`);

          speakHindiVoiceRef.current(ackSpeech, undefined, Math.max(voiceSettings.speechRate || 1, 1.24));
          return;
        }

        // User spoke their question or command!
        processJarvisCommandRef.current(cleanCommand, wakeMatched);
      },
      onCommandWindowClosed: () => {
        setWakeWordDetected(false);
        // Never turn off standby mic — stay permanently ready for "Hey Jarvis"
        setHudStatus(`Always-On Standby // Say "Hey ${normalizedWakeLabel}"`);
        jarvisSpeech.ensureStandbyActive();
      },
      onListeningStateChanged: (listening: boolean) => {
        setIsListening(listening);
      },
    });

    jarvisSpeech.startListening(true);
    setHudStatus(`Always-On Standby // Say "Hey ${normalizedWakeLabel}"`);

    const kickMicOnGesture = () => {
      jarvisSpeech.ensureStandbyActive();
    };
    window.addEventListener('pointerdown', kickMicOnGesture, { passive: true });
    window.addEventListener('keydown', kickMicOnGesture, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', kickMicOnGesture);
      window.removeEventListener('keydown', kickMicOnGesture);
      jarvisSpeech.stopListening();
    };
  }, [voiceSettings.wakeWord, voiceSettings.language]);

  // Toggle Active Command Window (Standby mic always remains ON)
  const toggleListening = () => {
    const normalizedWakeLabel =
      (voiceSettings.wakeWord || 'Jarvis').replace(/^(hey|hay|ok|hi|hello)[,\s]+/i, '').trim() || 'Jarvis';

    if (wakeWordDetected) {
      jarvisSpeech.closeCommandWindow();
      setWakeWordDetected(false);
      setHudStatus(`Always-On Standby // Say "Hey ${normalizedWakeLabel}"`);
    } else if (!isListening) {
      const ok = jarvisSpeech.startListening(true);
      setIsListening(true);
      jarvisSpeech.openCommandWindow(12000);
      setWakeWordDetected(true);
      jarvisAudio.playWakeWordDetected();
      setHudStatus(ok ? 'Active // Listening now...' : 'Standby // Tap to enable microphone permission');
    } else {
      jarvisSpeech.openCommandWindow(12000);
      setWakeWordDetected(true);
      jarvisAudio.playWakeWordDetected();
      setHudStatus('Active // Listening now...');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setActiveOverlayApp(null);
  };

  // Lock Screen Handling
  const handleLockScreen = () => {
    setSystemState((s) => ({ ...s, isScreenLocked: true }));
    jarvisAudio.playHardwareTick();
  };

  const handleUnlockScreen = () => {
    const isHindi = (voiceSettings.language || 'English') === 'Hindi';
    setSystemState((s) => ({ ...s, isScreenLocked: false }));
    jarvisAudio.playTaskSuccess();
    speakHindiVoice(isHindi ? 'सिस्टम अनलॉक कर दिया गया है सर। आपका स्वागत है।' : 'System unlocked, sir. Welcome back.');
  };

  // Memory Boost
  const handleBoostMemory = () => {
    const isHindi = (voiceSettings.language || 'English') === 'Hindi';
    setSystemState((s) => ({
      ...s,
      memoryUsage: 22,
      cpuUsage: 16,
    }));
    jarvisAudio.playTaskSuccess();
    setTerminalLogs((prev) => [
      {
        id: `t-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        command: 'systemctl purge-ram-cache',
        output: '[PURGE] 2.4 GB unreferenced buffers flushed.\nCPU cycle utilization normalized to 16%.',
        status: 'success',
      },
      ...prev,
    ]);
    speakHindiVoice(
      isHindi
        ? 'रैम कैशे साफ़ कर दिया गया है सर। सिस्टम परफॉर्मेंस ऑप्टिमाइज़ हो चुकी है।'
        : 'RAM cache cleared, sir. System performance is now optimized.'
    );
  };

  // Power-Saving Mode Activation
  const handleActivatePowerSaving = useCallback(() => {
    const isHindi = (voiceSettings.language || 'English') === 'Hindi';
    const voiceLine = isHindi
      ? 'जी सर, पावर-सेविंग मोड सक्रिय कर दिया गया है। ऊर्जा खपत अब न्यूनतम स्तर पर है।'
      : 'Yes sir, power-saving mode is now active. Energy usage is minimized.';
    setSystemState((s) => ({
      ...s,
      isPowerSavingMode: true,
      brightness: 20,
      cpuUsage: 12,
    }));
    setIsLowBatteryDismissed(true);
    jarvisAudio.playTaskSuccess();
    setHudStatus('Power-Saving Mode Engaged');
    setLatestEnglishAction('Power-saving mode active: Luminance throttled to 20%, background CPU load capped.');
    setLatestHindiVoice(voiceLine);
    speakHindiVoice(voiceLine);
    setTerminalLogs((prev) => [
      {
        id: `t-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        command: 'powercfg /set-eco-mode',
        output: '[POWER SAVE] Stark Eco-Power Protocol engaged.\nDisplay luminance throttled to 20%.\nBackground telemetry cycles restricted to save energy.',
        status: 'warn',
      },
      ...prev,
    ]);
  }, [speakHindiVoice, voiceSettings.language]);

  // Toggle Power-Saving Mode
  const handleTogglePowerSaving = useCallback(() => {
    const isHindi = (voiceSettings.language || 'English') === 'Hindi';
    if (systemState.isPowerSavingMode) {
      const voiceLine = isHindi
        ? 'पावर-सेविंग मोड बंद कर दिया गया है सर, सामान्य ऊर्जा स्तर बहाल है।'
        : 'Power-saving mode disabled, sir. Normal power profile restored.';
      setSystemState((s) => ({
        ...s,
        isPowerSavingMode: false,
        brightness: 85,
        cpuUsage: 24,
      }));
      jarvisAudio.playHardwareTick();
      setHudStatus('Standard Power Profile Restored');
      setLatestEnglishAction('Standard power profile restored. Luminance set to 85%.');
      setLatestHindiVoice(voiceLine);
      speakHindiVoice(voiceLine);
    } else {
      handleActivatePowerSaving();
    }
  }, [systemState.isPowerSavingMode, handleActivatePowerSaving, speakHindiVoice, voiceSettings.language]);

  // Simulate Battery Recharge
  const handleSimulateRecharge = useCallback(() => {
    const isHindi = (voiceSettings.language || 'English') === 'Hindi';
    const voiceLine = isHindi
      ? 'आर्क रिएक्टर पुनः चार्ज हो चुका है सर, बैटरी स्तर 95% है।'
      : 'Arc reactor recharged, sir. Battery level is at 95%.';
    setSystemState((s) => ({
      ...s,
      batteryLevel: 95,
      isCharging: true,
      isPowerSavingMode: false,
      brightness: 85,
    }));
    setIsLowBatteryDismissed(false);
    jarvisAudio.playTaskSuccess();
    setHudStatus('Arc Reactor Recharged');
    setLatestEnglishAction('Power core recharged to 95%. Normal operations resumed.');
    setLatestHindiVoice(voiceLine);
    speakHindiVoice(voiceLine);
    setTerminalLogs((prev) => [
      {
        id: `t-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        command: 'powercfg /connect-ac-charger',
        output: '[ARC RECHARGE] Voltage normalized. Core capacitor restored to 95%.',
        status: 'success',
      },
      ...prev,
    ]);
  }, [speakHindiVoice, voiceSettings.language]);

  // Battery Level Setter (e.g. for testing low battery)
  const handleSetBatteryLevel = useCallback(
    (lvl: number) => {
      const isHindi = (voiceSettings.language || 'English') === 'Hindi';
      setSystemState((s) => ({ ...s, batteryLevel: lvl }));
      if (lvl < 15) {
        setIsLowBatteryDismissed(false);
        jarvisAudio.playEmergencyWarning();
        speakHindiVoice(
          isHindi
            ? 'चेतावनी सर: सिस्टम बैटरी 15% से कम हो चुकी है। क्या मैं पावर-सेविंग मोड सक्रिय कर दूँ?'
            : 'Warning sir: system battery is below 15%. Shall I activate power-saving mode?'
        );
        setHudStatus(`CRITICAL POWER WARNING: ${lvl}%`);
      }
    },
    [speakHindiVoice, voiceSettings.language]
  );

  // Monitor battery drops below 15% to trigger alert overlay
  useEffect(() => {
    const isHindi = (voiceSettings.language || 'English') === 'Hindi';
    if (systemState.batteryLevel < 15) {
      if (prevBatteryRef.current >= 15) {
        setIsLowBatteryDismissed(false);
        jarvisAudio.playEmergencyWarning();
        speakHindiVoice(
          isHindi
            ? 'चेतावनी सर: सिस्टम बैटरी 15% से कम हो चुकी है। क्या मैं पावर-सेविंग मोड सक्रिय कर दूँ?'
            : 'Warning sir: system battery is below 15%. Shall I activate power-saving mode?'
        );
        setHudStatus(`CRITICAL POWER WARNING: ${systemState.batteryLevel}%`);
      }
    } else {
      setIsLowBatteryDismissed(false);
    }
    prevBatteryRef.current = systemState.batteryLevel;
  }, [systemState.batteryLevel, speakHindiVoice, voiceSettings.language]);

  return (
    <div
      className="min-h-screen bg-[#030712] text-slate-100 bg-hud-grid relative flex flex-col transition-all duration-300"
      style={{
        filter: `brightness(${systemState.brightness}%)`,
      }}
    >
      {/* Sci-Fi Top Navigation Bar */}
      <header className="border-b border-cyan-900/60 bg-black/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        {/* Left: Branding & Core status */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-cyan-800 to-black p-0.5 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <div className="w-full h-full bg-[#030712] rounded-[10px] flex items-center justify-center">
                <span className="font-orbitron font-extrabold text-cyan-400 text-sm tracking-tighter">
                  J
                </span>
              </div>
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-orbitron font-extrabold text-base tracking-wider text-white">
                J.A.R.V.I.S.
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold">
                SYSTEM OS 4.2
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <span>WAKE:</span>
              <strong className="text-cyan-400 font-bold uppercase">"{voiceSettings.wakeWord}"</strong>
              <span>|</span>
              <span className="text-emerald-400">VOICE: {(voiceSettings.language || 'English').toUpperCase()}</span>
              <span>|</span>
              <span className="text-slate-300">LOGS: ENGLISH</span>
            </p>
          </div>
        </div>

        {/* Center: Interactive Tabs */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-cyan-900/60 text-xs font-mono">
          {[
            { id: 'hud', label: 'ARC REACTOR HUD', icon: Zap },
            { id: 'whatsapp', label: 'WHATSAPP GATEWAY', icon: MessageSquare },
            { id: 'pc', label: 'PC CONTROLS', icon: Laptop },
            { id: 'terminal', label: 'TERMINAL BASH', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  jarvisAudio.playTerminalTick();
                  setActiveTab(tab.id as typeof activeTab);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                  isSel
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions, Native Bridge & Settings */}
        <div className="flex items-center gap-2">
          {/* Low Battery Status Badge & Re-trigger */}
          {systemState.batteryLevel < 15 && (
            <button
              onClick={() => {
                jarvisAudio.playEmergencyWarning();
                setIsLowBatteryDismissed(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500 bg-red-950/80 text-red-300 text-xs font-mono font-bold animate-pulse hover:bg-red-900 transition-colors cursor-pointer"
              title="Critical Battery Depletion (< 15%) - Click to review Power-Saving suggestions"
            >
              <Battery className="w-3.5 h-3.5 text-red-400" />
              <span>{systemState.batteryLevel}% LOW</span>
            </button>
          )}

          {/* Power Saving Active Badge */}
          {systemState.isPowerSavingMode && (
            <button
              onClick={handleTogglePowerSaving}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[11px] font-mono font-bold hover:bg-amber-900/60 transition-colors"
              title="Power-Saving Mode is active (Luminance 20%, CPU throttled). Click to disable."
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>ECO POWER (20%)</span>
            </button>
          )}

          {/* Always-On Background Assistant Setup / Quick Status */}
          <button
            onClick={() => {
              jarvisAudio.playTerminalTick();
              setIsSettingsOpen(true);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer ${
              voiceSettings.backgroundMode && (voiceSettings.alwaysOnWakeWord ?? true)
                ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/50'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title="Configure Always-On Background Wake-Up (like Google Assistant) & Default Assistant permissions"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">
              {voiceSettings.backgroundMode && (voiceSettings.alwaysOnWakeWord ?? true)
                ? 'ALWAYS-ON BG'
                : voiceSettings.backgroundMode
                ? 'BG ACTIVE'
                : 'BG OFF'}
            </span>
          </button>

          {/* Hands-Free Mic Quick Toggle */}
          <button
            onClick={toggleListening}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
              isListening
                ? 'border-cyan-400 bg-cyan-950/80 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)] animate-pulse'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title="Toggle Hands-Free Speech Recognition"
          >
            {isListening ? <Mic className="w-4 h-4 text-cyan-400" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{isListening ? 'LISTENING' : 'MIC MUTED'}</span>
          </button>

          {/* PC Companion Bridge Launcher */}
          <button
            onClick={() => {
              jarvisAudio.playTerminalTick();
              setIsBridgeOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-xs font-mono hover:bg-emerald-900/60 transition-colors"
            title="Native PC Desktop Automation Bridge (Python & PowerShell)"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">PC BRIDGE</span>
          </button>

          {/* In-App PWA Installer (Android WebAPK / Desktop / iOS) */}
          <PWAInstallButton />

          {/* Download App / Access Links Button */}
          <button
            onClick={() => {
              jarvisAudio.playTerminalTick();
              setIsDownloadOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-orbitron font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer"
            title="Download Jarvis Files & Access Links"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span className="hidden sm:inline">DOWNLOAD</span>
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => {
              jarvisAudio.playTerminalTick();
              setIsSettingsOpen(true);
            }}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:border-cyan-500 text-slate-300 hover:text-cyan-300 transition-colors"
            title="Voice & Wake-Word Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden flex items-center justify-around border-b border-cyan-950 bg-slate-950 p-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('hud')}
          className={`px-2.5 py-1 rounded ${activeTab === 'hud' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}
        >
          HUD
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-2.5 py-1 rounded ${activeTab === 'whatsapp' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}
        >
          WhatsApp
        </button>
        <button
          onClick={() => setActiveTab('pc')}
          className={`px-2.5 py-1 rounded ${activeTab === 'pc' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}
        >
          PC Controls
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-2.5 py-1 rounded ${activeTab === 'terminal' ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400'}`}
        >
          Terminal
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Quick Voice Command Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono scrollbar-thin">
          <span className="text-cyan-400 font-bold shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            TRY SAYING:
          </span>
          {[
            'Hey Jarvis call Mom',
            'Hey YouTube search Hyderabad Diaries on YouTube',
            'Hey Jarvis WhatsApp Mom: Coming home soon',
            'Hey Jarvis turn on wifi',
            'Hey Jarvis turn in vibration mode',
            'Hey Jarvis switch in silent mode',
            'Hey Jarvis open Instagram',
            'Hey Jarvis turn to Hindi',
          ].map((promptText, i) => (
            <button
              key={i}
              onClick={() => processJarvisCommand(promptText, true)}
              className="px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-900/60 hover:border-cyan-400 whitespace-nowrap shrink-0 transition-all cursor-pointer"
            >
              "{promptText}"
            </button>
          ))}
        </div>

        {/* Tab 1: HUD & Command Central */}
        {activeTab === 'hud' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Arc Reactor Visualizer & HUD */}
            <div className="lg:col-span-7 space-y-6">
              <ArcReactorHUD
                isListening={isListening}
                isSpeaking={isSpeaking}
                isProcessing={isProcessing}
                wakeWord={voiceSettings.wakeWord}
                wakeWordDetected={wakeWordDetected}
                onToggleMic={toggleListening}
                statusText={hudStatus}
                hindiSpeechText={latestHindiVoice}
                englishActionText={latestEnglishAction}
                activeLanguage={voiceSettings.language || 'English'}
              />

              {/* Hardware Quick Ticker */}
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-500 block text-[10px]">VOLUME</span>
                    <span className="text-cyan-300 font-bold">
                      {systemState.isMuted ? 'MUTED' : `${systemState.volume}%`}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-cyan-900/50" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">BRIGHTNESS</span>
                    <span className="text-amber-300 font-bold">{systemState.brightness}%</span>
                  </div>
                  <div className="h-6 w-px bg-cyan-900/50" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">CPU</span>
                    <span className="text-white font-bold">{systemState.cpuUsage}%</span>
                  </div>
                  <div className="h-6 w-px bg-cyan-900/50" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">MEMORY</span>
                    <span className="text-sky-300 font-bold">{systemState.memoryUsage}%</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('pc')}
                  className="text-cyan-400 hover:text-cyan-200 flex items-center gap-1 text-[11px]"
                >
                  <span>ALL CONTROLS</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Right 5 Columns: Command Logs & Quick Input */}
            <div className="lg:col-span-5 space-y-4">
              <CommandFeed
                logs={commandLogs}
                onPlayHindiSpeech={speakHindiVoice}
                onSelectQuickAction={(cmd) => processJarvisCommand(cmd, false)}
                onClearLogs={() => setCommandLogs([])}
                activeLanguage={voiceSettings.language || 'English'}
              />
            </div>
          </div>
        )}

        {/* Tab 2: WhatsApp & Calling Gateway */}
        {activeTab === 'whatsapp' && (
          <WhatsAppAutomationModal
            contacts={contacts}
            onAddContact={(newC) =>
              setContacts((prev) => {
                const updated = [newC, ...prev];
                try {
                  localStorage.setItem('jarvis_contacts', JSON.stringify(updated));
                } catch {}
                return updated;
              })
            }
            activeDraft={whatsAppDraft}
            onClearDraft={() => setWhatsAppDraft(null)}
            onDispatchMessage={handleDispatchWhatsApp}
            onCallContact={handleMakePhoneCall}
          />
        )}

        {/* Tab 3: PC Operating System Controls & App Launcher */}
        {activeTab === 'pc' && (
          <PCControlsPanel
            systemState={systemState}
            apps={apps}
            onUpdateVolume={(vol, isMuted) => {
              setDeviceHardwareVolume(isMuted ? 0 : vol);
              setSystemState((s) => ({ ...s, volume: vol, isMuted: Boolean(isMuted) }));
            }}
            onUpdateBrightness={(br) => {
              setDeviceHardwareBrightness(br);
              setSystemState((s) => ({ ...s, brightness: br }));
            }}
            onLaunchApp={handleLaunchApp}
            onLockScreen={handleLockScreen}
            onBoostMemory={handleBoostMemory}
            onSetBatteryLevel={handleSetBatteryLevel}
            onTogglePowerSaving={handleTogglePowerSaving}
            onSetRingerMode={(mode) => handleSetRingerMode(mode, true)}
            onControlDeviceSetting={(settingType, action, label) =>
              handleControlDeviceSetting(settingType, action, label, true)
            }
          />
        )}

        {/* Tab 4: Interactive Terminal Console */}
        {activeTab === 'terminal' && (
          <TerminalConsole
            logs={terminalLogs}
            onExecuteCommand={(cmd) => {
              const lower = cmd.toLowerCase();
              let output = '';
              let status: 'success' | 'warn' | 'error' | 'info' = 'info';

              if (lower === 'help') {
                output =
                  'Available Commands:\n- status : Hardware and subsystem diagnostics\n- ping : Check network latency\n- volume <0-100> : Adjust master volume\n- mute / unmute : Toggle master sound\n- bright <10-100> : Adjust screen luminance\n- whatsapp <name> <msg> : Direct message dispatch\n- clear : Clear terminal logs';
              } else if (lower.startsWith('volume')) {
                const num = parseInt(lower.replace('volume', '').trim(), 10) || 50;
                setSystemState((s) => ({ ...s, volume: num, isMuted: false }));
                output = `Master audio set to ${num}%.`;
                status = 'success';
              } else if (lower === 'mute') {
                setSystemState((s) => ({ ...s, isMuted: true }));
                output = 'Master audio muted.';
                status = 'warn';
              } else if (lower === 'unmute') {
                setSystemState((s) => ({ ...s, isMuted: false }));
                output = 'Master audio unmuted.';
                status = 'success';
              } else if (lower === 'status' || lower === 'diagnostics') {
                output = `SYSTEM DIAGNOSTICS:\n- CPU: ${systemState.cpuUsage}% across 8 logical cores\n- RAM: ${systemState.memoryUsage}% (11.4 GB alloc)\n- Latency: ${systemState.networkPing} ms to Stark Relays\n- Battery: ${systemState.batteryLevel}% (Arc Powered)\n- Active Wake Word: "${voiceSettings.wakeWord}"`;
                status = 'success';
              } else if (lower === 'ping') {
                output = 'PONG: Stark Relay Asian Pacific Node - 18ms latency.';
                status = 'success';
              } else if (lower === 'clear') {
                setTerminalLogs([]);
                return;
              } else {
                // Route to AI command processor
                processJarvisCommand(cmd, false);
                output = `Dispatched to Jarvis Neural Engine: "${cmd}"`;
              }

              setTerminalLogs((prev) => [
                {
                  id: `t-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  command: cmd,
                  output,
                  status,
                },
                ...prev,
              ]);
            }}
            onClearLogs={() => setTerminalLogs([])}
          />
        )}
      </main>

      {/* Floating Bottom Command Bar (Type or Voice) */}
      <footer className="sticky bottom-0 z-30 border-t border-cyan-900/60 bg-black/90 backdrop-blur-md p-3 px-4 sm:px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!typedCommand.trim()) return;
            processJarvisCommand(typedCommand.trim(), false);
            setTypedCommand('');
          }}
          className="max-w-4xl mx-auto flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={typedCommand}
              onChange={(e) => setTypedCommand(e.target.value)}
              placeholder={`Command Jarvis (e.g. "Send message to my mother: I'll be home in 10 mins" or "Set volume 80%")...`}
              className="w-full bg-slate-950/80 border border-cyan-900/80 rounded-xl pl-4 pr-10 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-sans shadow-inner"
            />
            <button
              type="submit"
              disabled={!typedCommand.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-black transition-colors"
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Voice Trigger Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-xl border font-bold flex items-center justify-center transition-all ${
              wakeWordDetected
                ? 'border-amber-400 bg-amber-950/70 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.45)] animate-pulse'
                : isListening
                ? 'border-cyan-800 bg-slate-900 text-cyan-400 hover:border-cyan-500'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title={
              wakeWordDetected
                ? 'Active listening (tap to close)'
                : isListening
                ? 'Standby for "Hey Jarvis" (tap to ask directly)'
                : 'Microphone paused (tap to start)'
            }
          >
            {isListening ? (
              <Mic className={`w-5 h-5 ${wakeWordDetected ? 'text-amber-400' : 'text-cyan-400'}`} />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>
        </form>
      </footer>

      {/* Camera Live HUD Overlay Modal */}
      {activeOverlayApp === 'camera' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)]">
            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CameraIcon className="w-5 h-5 text-cyan-400" />
                <span className="font-orbitron font-bold text-sm text-white">ARC HUD OPTICAL SENSOR</span>
              </div>
              <button onClick={stopCamera} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden border border-cyan-900 bg-black aspect-video flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {!isCameraActive && (
                <div className="text-xs font-mono text-slate-500 text-center p-4">
                  Camera initializing or permission requested in browser...
                </div>
              )}
              {/* HUD Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-32 h-32 border-2 border-dashed border-cyan-400/40 rounded-full animate-spin-slow" />
                <div className="w-4 h-4 border border-cyan-400 rounded-full absolute" />
                <div className="absolute bottom-4 left-4 text-[10px] font-mono text-cyan-400 bg-black/70 px-2 py-1 rounded border border-cyan-500/30">
                  OPTICAL RECOGNITION // PILOT IDENTIFIED
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sci-Calculator Overlay Modal */}
      {activeOverlayApp === 'calculator' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)] space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3">
              <div className="flex items-center gap-2">
                <CalcIcon className="w-4 h-4 text-cyan-400" />
                <span className="font-orbitron font-bold text-xs text-white">QUANTUM MATH ENGINE</span>
              </div>
              <button
                onClick={() => setActiveOverlayApp(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 rounded-lg bg-black/80 border border-cyan-900 font-mono text-right text-xl text-cyan-300 overflow-x-auto">
              {calcInput}
            </div>
            <div className="grid grid-cols-4 gap-2 font-mono text-sm">
              {['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '%', '='].map((btn) => (
                <button
                  key={btn}
                  onClick={() => {
                    jarvisAudio.playTerminalTick();
                    if (btn === 'C') {
                      setCalcInput('0');
                    } else if (btn === '=') {
                      try {
                        const res = evaluateMathExpression(calcInput);
                        setCalcInput(String(res));
                      } catch {
                        setCalcInput('Error');
                      }
                    } else {
                      setCalcInput((prev) => (prev === '0' || prev === 'Error' ? btn : prev + btn));
                    }
                  }}
                  className={`p-2.5 rounded-lg border text-center transition-colors ${
                    btn === '='
                      ? 'col-span-1 bg-cyan-500 text-black font-bold border-cyan-400'
                      : btn === 'C'
                      ? 'bg-red-950/60 border-red-500/40 text-red-400'
                      : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-cyan-500'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Screen Lock Security Simulation */}
      {systemState.isScreenLocked && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
          <div className="max-w-md w-full p-8 rounded-2xl border border-cyan-500/40 bg-slate-950/90 text-center space-y-6 shadow-[0_0_80px_rgba(0,240,255,0.3)]">
            <div className="w-16 h-16 mx-auto rounded-full bg-cyan-950 border border-cyan-400 flex items-center justify-center animate-pulse">
              <Lock className="w-8 h-8 text-cyan-400" />
            </div>

            <div>
              <h2 className="font-orbitron font-extrabold text-xl text-white">JARVIS SYSTEM LOCKED</h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Security protocol active. Speak or click to authorize unlock.
              </p>
            </div>

            <button
              onClick={handleUnlockScreen}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 font-orbitron font-bold text-sm text-black transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)]"
            >
              <Unlock className="w-4 h-4" />
              <span>AUTHORIZE & UNLOCK</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice & Wake Word Settings Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={voiceSettings}
        onSaveSettings={(newS) => {
          setVoiceSettings(newS);
          jarvisSpeech.setWakeWord(newS.wakeWord);
        }}
        onTestVoice={(sample) => speakHindiVoice(sample)}
      />

      {/* Native PC Automation Companion Bridge Modal */}
      <CompanionBridgeModal isOpen={isBridgeOpen} onClose={() => setIsBridgeOpen(false)} />

      {/* Download & Access Links Modal */}
      <DownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
        sharedUrl={
          typeof window !== 'undefined' && window.location.origin.includes('run.app')
            ? window.location.origin
            : 'https://ais-pre-p4jos3plr3cl67xao2hvll-109399473900.asia-northeast1.run.app'
        }
      />

      {/* Visual Low-Battery Warning Overlay (triggers when batteryLevel < 15%) */}
      {systemState.batteryLevel < 15 && !isLowBatteryDismissed && (
        <LowBatteryWarningOverlay
          batteryLevel={systemState.batteryLevel}
          isCharging={systemState.isCharging}
          isPowerSavingMode={systemState.isPowerSavingMode}
          onActivatePowerSaving={handleActivatePowerSaving}
          onSimulateRecharge={handleSimulateRecharge}
          onDismiss={() => {
            setIsLowBatteryDismissed(true);
            jarvisAudio.playTerminalTick();
          }}
        />
      )}
      {/* Offline Indicator Banner */}
      <OfflineIndicator />
    </div>
  );
}
