import React, { useState, useEffect } from 'react';
import { Settings, Volume2, Mic, Sparkles, Check, X, Play, Radio, ShieldCheck, Smartphone, BatteryCharging, Layers } from 'lucide-react';
import { PersonalityMode, VoiceSettings } from '../types/jarvis';
import { JarvisSpeechEngine, VoiceOption } from '../utils/speech';
import { jarvisAudio } from '../utils/audioFx';
import {
  AndroidBackgroundStatus,
  getAndroidBackgroundStatus,
  openAndroidDefaultAssistantSettings,
  requestOverlayDisplayPermission,
  requestUnrestrictedBatteryPermission,
} from '../utils/androidBridge';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onSaveSettings: (settings: VoiceSettings) => void;
  onTestVoice: (text: string) => void;
}

const LANGUAGE_OPTIONS = [
  { label: 'English', code: 'en-US', display: 'English (Default)' },
  { label: 'Hindi', code: 'hi-IN', display: 'Hindi (हिंदी)' },
  { label: 'Spanish', code: 'es-ES', display: 'Spanish (Español)' },
  { label: 'French', code: 'fr-FR', display: 'French (Français)' },
  { label: 'German', code: 'de-DE', display: 'German (Deutsch)' },
  { label: 'Marathi', code: 'mr-IN', display: 'Marathi (मराठी)' },
  { label: 'Tamil', code: 'ta-IN', display: 'Tamil (தமிழ்)' },
  { label: 'Telugu', code: 'te-IN', display: 'Telugu (తెలుగు)' },
  { label: 'Bengali', code: 'bn-IN', display: 'Bengali (বাংলা)' },
  { label: 'Punjabi', code: 'pa-IN', display: 'Punjabi (ਪੰਜਾਬੀ)' },
  { label: 'Japanese', code: 'ja-JP', display: 'Japanese (日本語)' },
  { label: 'Arabic', code: 'ar-SA', display: 'Arabic (العربية)' },
];

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onTestVoice,
}) => {
  const [wakeWord, setWakeWord] = useState(settings.wakeWord);
  const [speechRate, setSpeechRate] = useState(settings.speechRate);
  const [speechPitch, setSpeechPitch] = useState(settings.speechPitch);
  const [autoSpeakHindi, setAutoSpeakHindi] = useState(settings.autoSpeakHindi);
  const [autoOpenWhatsApp, setAutoOpenWhatsApp] = useState(settings.autoOpenWhatsApp);
  const [soundEffects, setSoundEffects] = useState(settings.soundEffects);
  const [backgroundMode, setBackgroundMode] = useState(settings.backgroundMode ?? true);
  const [alwaysOnWakeWord, setAlwaysOnWakeWord] = useState(settings.alwaysOnWakeWord ?? true);
  const [personalityMode, setPersonalityMode] = useState<PersonalityMode>(settings.personalityMode || 'balanced');
  const [language, setLanguage] = useState<string>(settings.language || 'English');
  const [languageCode, setLanguageCode] = useState<string>(settings.languageCode || 'en-US');
  const [selectedVoiceName, setSelectedVoiceName] = useState(settings.preferredHindiVoiceName || '');
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [bgStatus, setBgStatus] = useState<AndroidBackgroundStatus>(() => getAndroidBackgroundStatus());

  useEffect(() => {
    if (isOpen) {
      setWakeWord(settings.wakeWord);
      setSpeechRate(settings.speechRate);
      setSpeechPitch(settings.speechPitch);
      setAutoSpeakHindi(settings.autoSpeakHindi);
      setAutoOpenWhatsApp(settings.autoOpenWhatsApp);
      setSoundEffects(settings.soundEffects);
      setBackgroundMode(settings.backgroundMode ?? true);
      setAlwaysOnWakeWord(settings.alwaysOnWakeWord ?? true);
      setPersonalityMode(settings.personalityMode || 'balanced');
      setLanguage(settings.language || 'English');
      setLanguageCode(settings.languageCode || 'en-US');
      setSelectedVoiceName(settings.preferredHindiVoiceName || '');
      setBgStatus(getAndroidBackgroundStatus());
    }
  }, [isOpen, settings]);

  useEffect(() => {
    if (!isOpen) return;
    const refreshStatus = () => setBgStatus(getAndroidBackgroundStatus());
    window.addEventListener('focus', refreshStatus);
    document.addEventListener('visibilitychange', refreshStatus);
    return () => {
      window.removeEventListener('focus', refreshStatus);
      document.removeEventListener('visibilitychange', refreshStatus);
    };
  }, [isOpen]);

  useEffect(() => {
    JarvisSpeechEngine.getAvailableVoices().then((voices) => {
      setAvailableVoices(voices);
    });
  }, []);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      wakeWord: wakeWord.trim() || 'Jarvis',
      speechRate,
      speechPitch,
      autoSpeakHindi,
      autoOpenWhatsApp,
      soundEffects,
      backgroundMode,
      alwaysOnWakeWord,
      personalityMode,
      language,
      languageCode,
      preferredHindiVoiceName: selectedVoiceName,
      continuousListening: settings.continuousListening,
    });
    jarvisAudio.playTaskSuccess();
    onClose();
  };

  const testVoiceSpeech = () => {
    jarvisAudio.playWakeWordDetected();
    if (language === 'Hindi') {
      onTestVoice(
        personalityMode === 'friend'
          ? 'अरे दोस्त! मैं जार्विस हूँ, बताओ आज क्या प्लान है?'
          : 'नमस्ते सर, मैं जार्विस हूँ। आपकी क्या सेवा करूँ?'
      );
    } else {
      onTestVoice(
        personalityMode === 'friend'
          ? "Hey buddy! I'm JARVIS, ready to help you out. What's the plan today?"
          : 'Hello sir, I am JARVIS. All systems are online and at your service.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-[0_0_60px_rgba(0,240,255,0.2)] max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center">
              <Settings className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-base text-white">
                JARVIS VOICE & AUTOMATION SETTINGS
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Default language is English — say "Turn to Hindi" anytime to switch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Custom Wake Word Setting */}
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-black/60 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-orbitron font-bold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-cyan-400" />
              CUSTOM WAKE-WORD (HANDS-FREE ACTIVATION)
            </label>
            <span className="text-[10px] font-mono text-cyan-400">VOICE TRIGGER</span>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Say this word aloud to wake Jarvis hands-free without clicking any button.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={wakeWord}
              onChange={(e) => setWakeWord(e.target.value)}
              placeholder="e.g. Jarvis, Friday, Edith, Computer"
              className="flex-1 bg-slate-900 border border-cyan-900 text-sm text-cyan-200 px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-cyan-400 uppercase tracking-wider"
            />
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 pt-1 text-xs font-mono">
            {['Jarvis', 'Hey Jarvis', 'Friday', 'Edith', 'Computer'].map((preset) => (
              <button
                key={preset}
                onClick={() => setWakeWord(preset)}
                className={`px-2.5 py-1 rounded border transition-colors ${
                  wakeWord.toLowerCase() === preset.toLowerCase()
                    ? 'border-cyan-400 bg-cyan-950 text-cyan-300 font-bold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Speech Engine, Language & Voice Selector */}
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-black/60 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-orbitron font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              VOICE SYNTHESIS & LANGUAGE (TTS)
            </label>
            <button
              onClick={testVoiceSpeech}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-300 text-xs font-mono hover:bg-cyan-900 transition-colors"
            >
              <Play className="w-3 h-3" />
              <span>TEST ({language.toUpperCase()})</span>
            </button>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">
              SPOKEN RESPONSE LANGUAGE (DEFAULT: ENGLISH):
            </label>
            <select
              value={language}
              onChange={(e) => {
                const chosen = LANGUAGE_OPTIONS.find((opt) => opt.label === e.target.value);
                if (chosen) {
                  setLanguage(chosen.label);
                  setLanguageCode(chosen.code);
                }
              }}
              className="w-full bg-slate-900 border border-cyan-900 text-xs text-cyan-200 px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-cyan-400"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code + opt.label} value={opt.label}>
                  {opt.display}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              Tip: Just say "Jarvis turn to Hindi" or "Jarvis turn back to English" anytime by voice.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">
              SELECT INSTALLED VOICE ENGINE:
            </label>
            <select
              value={selectedVoiceName}
              onChange={(e) => setSelectedVoiceName(e.target.value)}
              className="w-full bg-slate-900 border border-cyan-900 text-xs text-slate-200 px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="">Auto Match Active Language ({language})</option>
              {availableVoices.map((v, idx) => (
                <option key={`${v.name}-${v.lang}-${idx}`} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Voice rate & pitch */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>SPEECH SPEED</span>
                <span className="text-cyan-400">{speechRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.3"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>VOICE PITCH</span>
                <span className="text-cyan-400">{speechPitch.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Assistant Personality Mode */}
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-black/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-orbitron font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              AI PERSONALITY &amp; CONVERSATION TONE
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            {[
              { id: 'balanced', label: 'Sir + Friend', desc: 'Respectful on tasks, friendly in chat' },
              { id: 'friend', label: 'Best Friend', desc: 'Warm, casual & witty buddy tone' },
              { id: 'formal', label: 'Formal Sir', desc: 'Classic Stark AI protocol' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setPersonalityMode(mode.id as PersonalityMode)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  personalityMode === mode.id
                    ? 'border-cyan-400 bg-cyan-950/70 text-cyan-200'
                    : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-[11px]">{mode.label}</div>
                <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Behavior Toggles */}
        <div className="space-y-2.5">
          {/* Always-On Google Assistant Style Background Wake-Up */}
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/15 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-orbitron font-bold text-emerald-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  ALWAYS-ON BACKGROUND WAKE-UP (LIKE GOOGLE ASSISTANT)
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Say "Hey {wakeWord || 'Jarvis'}" from your Home screen or inside any app to automatically pop open JARVIS without opening the app first.
                </p>
              </div>
              <input
                type="checkbox"
                checked={alwaysOnWakeWord}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAlwaysOnWakeWord(checked);
                  if (checked) setBackgroundMode(true);
                }}
                className="w-4 h-4 accent-emerald-400 shrink-0 ml-3 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  jarvisAudio.playTerminalTick();
                  requestOverlayDisplayPermission();
                }}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  bgStatus.canDrawOverlays
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200'
                    : 'border-amber-500/40 bg-slate-900/80 text-amber-200 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold font-mono">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    Pop-Up Over Apps
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/50">
                    {bgStatus.isNativeAndroid ? (bgStatus.canDrawOverlays ? 'GRANTED' : 'ALLOW') : 'APK'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                  Lets "Hey {wakeWord || 'Jarvis'}" launch JARVIS over other apps
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  jarvisAudio.playTerminalTick();
                  requestUnrestrictedBatteryPermission();
                }}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  bgStatus.ignoringBatteryOptimizations
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200'
                    : 'border-amber-500/40 bg-slate-900/80 text-amber-200 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold font-mono">
                  <span className="flex items-center gap-1">
                    <BatteryCharging className="w-3.5 h-3.5" />
                    Unrestricted BG
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/50">
                    {bgStatus.isNativeAndroid ? (bgStatus.ignoringBatteryOptimizations ? 'ACTIVE' : 'ALLOW') : 'APK'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                  Prevents Android from sleeping background voice listener
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  jarvisAudio.playTerminalTick();
                  openAndroidDefaultAssistantSettings();
                }}
                className="p-2.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-200 hover:border-cyan-400 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-[11px] font-bold font-mono">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Default Assistant
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/50">OPEN</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                  Set JARVIS as default Digital Assistant in Android Settings
                </div>
              </button>
            </div>
          </div>

          {/* Background Active Mode */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-black/40 cursor-pointer hover:border-slate-700">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Run JARVIS Foreground Service in Background
              </div>
              <div className="text-[11px] text-slate-400">
                Keep Android Foreground Service &amp; voice standby active while using WhatsApp, YouTube, or Spotify
              </div>
            </div>
            <input
              type="checkbox"
              checked={backgroundMode}
              onChange={(e) => setBackgroundMode(e.target.checked)}
              className="w-4 h-4 accent-emerald-400"
            />
          </label>

          {/* Spoken Voice Reply */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-black/40 cursor-pointer hover:border-slate-700">
            <div>
              <div className="text-xs font-bold text-white">Speak Voice Replies Aloud</div>
              <div className="text-[11px] text-slate-400">
                Jarvis speaks replies in English by default, or in Hindi/other language when switched
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoSpeakHindi}
              onChange={(e) => setAutoSpeakHindi(e.target.checked)}
              className="w-4 h-4 accent-cyan-400"
            />
          </label>

          {/* Auto Open WhatsApp */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-black/40 cursor-pointer hover:border-slate-700">
            <div>
              <div className="text-xs font-bold text-white">Direct Phone App / WhatsApp Launch</div>
              <div className="text-[11px] text-slate-400">
                Open WhatsApp, YouTube, Spotify &amp; Dialer directly on your device
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoOpenWhatsApp}
              onChange={(e) => setAutoOpenWhatsApp(e.target.checked)}
              className="w-4 h-4 accent-emerald-400"
            />
          </label>

          {/* Sound Effects */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-black/40 cursor-pointer hover:border-slate-700">
            <div>
              <div className="text-xs font-bold text-white">Synthesized Sci-Fi Sound FX</div>
              <div className="text-[11px] text-slate-400">
                Arc reactor chimes, wake-word alerts, and dispatch sounds
              </div>
            </div>
            <input
              type="checkbox"
              checked={soundEffects}
              onChange={(e) => setSoundEffects(e.target.checked)}
              className="w-4 h-4 accent-cyan-400"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-orbitron font-bold text-black transition-colors shadow-[0_0_20px_rgba(0,240,255,0.4)]"
          >
            <Check className="w-4 h-4" />
            <span>SAVE PREFERENCES</span>
          </button>
        </div>
      </div>
    </div>
  );
};
