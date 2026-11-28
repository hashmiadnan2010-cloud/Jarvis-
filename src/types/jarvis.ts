export type IntentType =
  | 'WHATSAPP_SEND'
  | 'CALL_CONTACT'
  | 'SET_LANGUAGE'
  | 'DEVICE_SETTING'
  | 'SYSTEM_VOLUME'
  | 'SYSTEM_BRIGHTNESS'
  | 'LAUNCH_APP'
  | 'SYSTEM_TERMINAL'
  | 'MEDIA_CONTROL'
  | 'CREATE_NOTE'
  | 'CREATE_REMINDER'
  | 'SYSTEM_DIAGNOSTIC'
  | 'SEARCH_WEB'
  | 'GENERAL_CONVERSATION';

export interface Contact {
  id: string;
  name: string;
  relation: string; // e.g. "Mother", "Father", "Boss", "Friend"
  phone: string;
  avatar: string;
  lastMessage?: string;
  status: 'online' | 'away' | 'offline';
}

export interface PCApp {
  id: string;
  name: string;
  category: 'Communication' | 'Productivity' | 'Development' | 'Media' | 'System';
  icon: string;
  description: string;
  status: 'running' | 'idle' | 'background';
  url?: string;
  deepLink?: string;
  packageName?: string;
  defaultAction?: string;
}

export interface SystemState {
  volume: number; // 0 - 100
  isMuted: boolean;
  brightness: number; // 0 - 100
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  networkPing: number; // ms
  batteryLevel: number; // percentage
  isCharging: boolean;
  isPowerSavingMode: boolean;
  activeAppId: string;
  theme: 'hologram-cyan' | 'stark-gold' | 'neon-red';
  isScreenLocked: boolean;
  ringerMode?: 'normal' | 'vibrate' | 'silent';
  wifiEnabled?: boolean;
  networkType?: string;
}

export type PersonalityMode = 'balanced' | 'friend' | 'formal';

export interface VoiceSettings {
  wakeWord: string;
  continuousListening: boolean;
  autoSpeakHindi: boolean;
  speechRate: number; // 0.8 - 1.2
  speechPitch: number; // 0.8 - 1.2
  soundEffects: boolean;
  preferredHindiVoiceName?: string;
  autoOpenWhatsApp: boolean;
  backgroundMode?: boolean;
  alwaysOnWakeWord?: boolean;
  personalityMode?: PersonalityMode;
  language?: string;
  languageCode?: string;
}

export interface CommandLog {
  id: string;
  timestamp: string;
  userQuery: string;
  intent: IntentType;
  englishActionSummary: string;
  hindiVoiceReply: string;
  wakeWordDetected: boolean;
  status: 'executing' | 'completed' | 'failed';
  actionPayload?: {
    target?: string;
    recipientPhone?: string;
    message?: string;
    appId?: string;
    volumeLevel?: number;
    brightnessLevel?: number;
    terminalCommand?: string;
    mediaAction?: string;
    searchQuery?: string;
    noteContent?: string;
    targetLanguage?: string;
    targetLanguageCode?: string;
    settingType?: string;
    settingAction?: string;
    ringerMode?: 'normal' | 'vibrate' | 'silent';
  };
  quickFollowUps?: string[];
}

export interface TerminalEntry {
  id: string;
  timestamp: string;
  command: string;
  output: string;
  status: 'success' | 'warn' | 'error' | 'info';
}
