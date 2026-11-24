import React, { useState, useEffect } from 'react';
import { Settings, Volume2, Mic, Sparkles, Check, X, Play } from 'lucide-react';
import { VoiceSettings } from '../types/jarvis';
import { JarvisSpeechEngine, VoiceOption } from '../utils/speech';
import { jarvisAudio } from '../utils/audioFx';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onSaveSettings: (settings: VoiceSettings) => void;
  onTestVoice: (text: string) => void;
}

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
  const [selectedVoiceName, setSelectedVoiceName] = useState(settings.preferredHindiVoiceName || '');
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);

  useEffect(() => {
    JarvisSpeechEngine.getAvailableVoices().then((voices) => {
      setAvailableVoices(voices);
      if (!selectedVoiceName && voices.length > 0) {
        const hindiVoice = voices.find((v) => v.isHindi);
        if (hindiVoice) {
          setSelectedVoiceName(hindiVoice.name);
        }
      }
    });
  }, [selectedVoiceName]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      wakeWord: wakeWord.trim() || 'Jarvis',
      speechRate,
      speechPitch,
      autoSpeakHindi,
      autoOpenWhatsApp,
      soundEffects,
      preferredHindiVoiceName: selectedVoiceName,
      continuousListening: settings.continuousListening,
    });
    jarvisAudio.playTaskSuccess();
    onClose();
  };

  const testHindiSpeech = () => {
    jarvisAudio.playWakeWordDetected();
    onTestVoice('नमस्ते सर, मैं जार्विस हूँ। आपकी क्या सेवा करूँ?');
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
                Configure custom wake-word, Hindi voice modulation, and automation behaviors
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

        {/* Hindi Speech Engine & Voice Selector */}
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-black/60 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-orbitron font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              HINDI VOICE SYNTHESIS (TTS)
            </label>
            <button
              onClick={testHindiSpeech}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/50 text-cyan-300 text-xs font-mono hover:bg-cyan-900 transition-colors"
            >
              <Play className="w-3 h-3" />
              <span>TEST VOICE (HINDI)</span>
            </button>
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
              <option value="">Default Recommended (Auto Hindi/Indian English)</option>
              {availableVoices.map((v, idx) => (
                <option key={`${v.name}-${v.lang}-${idx}`} value={v.name}>
                  {v.name} ({v.lang}) {v.isHindi ? '★ HINDI/INDIAN' : ''}
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

        {/* Behavior Toggles */}
        <div className="space-y-2.5">
          {/* Hindi Voice Reply */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-black/40 cursor-pointer hover:border-slate-700">
            <div>
              <div className="text-xs font-bold text-white">Speak Hindi Voice Aloud</div>
              <div className="text-[11px] text-slate-400">
                Jarvis verbally replies in Hindi while displaying English logs
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
              <div className="text-xs font-bold text-white">Direct WhatsApp Launch</div>
              <div className="text-[11px] text-slate-400">
                Immediately launch WhatsApp Web upon voice command completion
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
