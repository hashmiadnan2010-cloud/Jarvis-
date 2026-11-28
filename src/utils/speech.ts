// Speech Recognition & Speech Synthesis Utility for Jarvis (Web + Android Native Bridge)

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface VoiceOption {
  name: string;
  lang: string;
  isHindi: boolean;
  voice: SpeechSynthesisVoice;
}

export class JarvisSpeechEngine {
  private recognition: any = null;
  private isListeningDesired: boolean = false;
  private isEngineRunning: boolean = false;
  private useNativeAndroidSpeech: boolean = false;
  private wakeWord: string = 'jarvis';
  private onWakeWordTriggered?: () => void;
  private onCommandHeard?: (command: string, wakeWordMatched: boolean) => void;
  private onCommandWindowClosed?: () => void;
  private onListeningStateChanged?: (listening: boolean) => void;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private autoRestart: boolean = true;
  private isSpeaking: boolean = false;
  private wakeWordActiveUntil: number = 0;
  private silenceTimer: any = null;
  private lastProcessedTranscript: string = '';
  private lastProcessedTime: number = 0;
  private restartTimer: any = null;
  private watchdogTimer: any = null;
  private speechFallbackTimer: any = null;
  private interimCommitTimer: any = null;
  private wakeAckTimer: any = null;
  private lastWakeGlowTime: number = 0;
  private recognitionLang: string = 'en-IN';
  private activeTtsCallbacks: { onEnd?: () => void } = {};

  constructor() {
    this.initRecognition();
    this.initNativeAndroidListeners();
  }

  private scheduleSilenceClose(durationMs: number = 12000) {
    clearTimeout(this.silenceTimer);
    this.wakeWordActiveUntil = Date.now() + durationMs;
    this.silenceTimer = setTimeout(() => {
      if (this.isSpeaking) {
        this.scheduleSilenceClose(5000);
        return;
      }
      if (this.wakeWordActiveUntil > 0 && Date.now() >= this.wakeWordActiveUntil) {
        this.wakeWordActiveUntil = 0;
        this.lastProcessedTranscript = '';
        this.onCommandWindowClosed?.();
      }
    }, durationMs + 50);
  }

  public openCommandWindow(durationMs: number = 12000) {
    this.lastProcessedTranscript = '';
    this.scheduleSilenceClose(durationMs);
    this.onWakeWordTriggered?.();
  }

  public closeCommandWindow() {
    clearTimeout(this.silenceTimer);
    clearTimeout(this.interimCommitTimer);
    clearTimeout(this.wakeAckTimer);
    this.wakeWordActiveUntil = 0;
    this.lastProcessedTranscript = '';
    this.onCommandWindowClosed?.();
  }

  public isCommandWindowOpen(): boolean {
    return this.wakeWordActiveUntil > 0 && Date.now() < this.wakeWordActiveUntil;
  }

  private matchesDirectAppCommandWake(text: string): boolean {
    const lower = text.toLowerCase().trim();
    const hasAppWake =
      /\b(?:hey|hay|he|ey|a|ok|hi)[,\s]+(?:youtube|yt|google|spotify)\b/i.test(lower) ||
      /(?:हे|ऐ|ओ)[,\s]+(?:youtube|यूट्यूब|google|गूगल|spotify|स्पॉटिफाई)/i.test(text);
    if (!hasAppWake) return false;
    return /\b(?:search|find|watch|play|open|show|karo|chalao|kholo|dikhao|dhundo|khojo)\b|सर्च|खोजो|ढूंढो|चलाओ|दिखाओ|खोलो|करो/i.test(
      text
    );
  }

  private getNormalizedWakeBase(): string {
    const rawWake = (this.wakeWord || 'jarvis').trim().toLowerCase();
    return rawWake.replace(/^(hey|hay|he|ey|ok|okay|hi|hello|yo)[,\s]+/i, '').trim() || 'jarvis';
  }

  private pickBestTranscriptFromAlternatives(alternatives: string[]): string {
    const cleaned = alternatives.map((a) => String(a || '').trim()).filter(Boolean);
    if (cleaned.length === 0) return '';
    // Prefer any speech recognizer hypothesis that contains the wake word (fixes "service"/"chavis" first-choice errors)
    for (const alt of cleaned) {
      if (this.matchesStrictWakePhrase(alt)) {
        return alt;
      }
    }
    return cleaned[0];
  }

  private matchesStrictWakePhrase(text: string): boolean {
    const lower = text.toLowerCase().trim();
    const normalizedWake = this.getNormalizedWakeBase();
    const escapedWake = normalizedWake.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const customPattern = new RegExp(`\\b(?:(?:hey|hay|he|ey|a|ok|okay|hi|hello|yo)[,\\s]+)?${escapedWake}\\b`, 'i');
    const jarvisAnyPattern =
      /\b(?:(?:hey|hay|he|ey|a|ok|okay|hi|hello|yo)[,\s]+)?(?:jarvis|jarvish|jarvas|jarvice|jarves|jarviz|jarvis+|javis|jervis|charvis|jarwis|jarvisss|जार्विस|जर्विस|जरविस|जार्विश)\b/i;
    const hindiWakePattern = /(?:हे|ऐ|अरे|ओ|सुनो)?[\s,]*(?:जार्विस|जर्विस|जरविस|जार्विश|जारविस)/i;
    return (
      customPattern.test(lower) ||
      jarvisAnyPattern.test(lower) ||
      hindiWakePattern.test(text) ||
      this.matchesDirectAppCommandWake(text)
    );
  }

  private stripWakePrefix(text: string): string {
    if (this.matchesDirectAppCommandWake(text)) {
      return text.replace(/^(?:hey|hay|he|ey|a|ok|hi|हे|ऐ|ओ)[,\s]+/i, '').trim();
    }
    const normalizedWake = this.getNormalizedWakeBase();
    const escapedWake = normalizedWake.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const singleWakeRe = new RegExp(
      `^(?:hey|hay|he|ey|a|ok|okay|hi|hello|yo|हे|ऐ|अरे|ओ|सुनो)?[,\\s:-]*(?:${escapedWake}|jarvis|jarvish|jarvas|jarvice|jarves|jarviz|javis|jervis|charvis|jarwis|जार्विस|जर्विस|जरविस|जार्विश)[,\\s:-]*`,
      'i'
    );
    // Strip repeated wake words (e.g. "Jarvis, Jarvis, Jarvis call mom" -> "call mom")
    let out = text.trim();
    for (let i = 0; i < 4; i++) {
      const next = out.replace(singleWakeRe, '').trim();
      if (next === out) break;
      out = next;
    }
    return out;
  }

  private initNativeAndroidListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('jarvis-native-speech', (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (!detail) return;

      if (detail.type === 'state') {
        this.isEngineRunning = Boolean(detail.listening);
        if (this.isListeningDesired) {
          this.onListeningStateChanged?.(true);
        } else {
          this.onListeningStateChanged?.(Boolean(detail.listening));
        }
      } else if (detail.type === 'result') {
        if (this.isSpeaking) return;
        const transcript = String(detail.transcript || '').trim();
        const isFinal = Boolean(detail.isFinal);
        this.processRecognizedText(isFinal ? transcript : '', isFinal ? '' : transcript);
      }
    });

    window.addEventListener('jarvis-wake-command', (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (!detail) return;
      const command = String(detail.command || '').trim();
      if (command) {
        const now = Date.now();
        this.lastProcessedTranscript = command;
        this.lastProcessedTime = now;
        this.scheduleSilenceClose(10000);
        this.onWakeWordTriggered?.();
        this.onCommandHeard?.(command, true);
      } else {
        this.scheduleSilenceClose(10000);
        this.onWakeWordTriggered?.();
        this.onCommandHeard?.(`hey ${this.wakeWord}`, true);
      }
    });

    window.addEventListener('jarvis-native-tts', (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (!detail) return;
      if (detail.state === 'start') {
        this.isSpeaking = true;
        window.JarvisAndroid?.setTtsSpeakingState?.(true);
        this.onSpeechStart?.();
      } else if (detail.state === 'end') {
        clearTimeout(this.speechFallbackTimer);
        this.isSpeaking = false;
        this.lastProcessedTranscript = '';
        this.lastProcessedTime = 0;
        window.JarvisAndroid?.setTtsSpeakingState?.(false);
        this.onSpeechEnd?.();
        this.activeTtsCallbacks.onEnd?.();
        this.activeTtsCallbacks = {};
        if (this.wakeWordActiveUntil > 0) {
          this.scheduleSilenceClose(15000);
        }
        if (this.isListeningDesired && this.useNativeAndroidSpeech && !this.isEngineRunning) {
          window.JarvisAndroid?.startNativeListening?.();
        }
      }
    });
  }

  private emitCommandDeduped(rawText: string, wakeMatched: boolean) {
    const text = rawText.trim();
    if (!text) return;
    const now = Date.now();
    const norm = text.toLowerCase().replace(/\s+/g, ' ');
    const prevNorm = this.lastProcessedTranscript.toLowerCase().replace(/\s+/g, ' ');
    if (norm === prevNorm && now - this.lastProcessedTime < 1200) {
      return;
    }
    this.lastProcessedTranscript = text;
    this.lastProcessedTime = now;
    clearTimeout(this.interimCommitTimer);
    clearTimeout(this.wakeAckTimer);
    this.onCommandHeard?.(text, wakeMatched);
  }

  private processRecognizedText(finalTranscript: string, interimTranscript: string) {
    const candidate = (finalTranscript || interimTranscript).trim();
    if (!candidate || candidate.length < 2) return;

    const hasStrictWakeWord = this.matchesStrictWakePhrase(candidate);

    if (hasStrictWakeWord) {
      this.scheduleSilenceClose(15000);
      const now = Date.now();
      if (now - this.lastWakeGlowTime > 800) {
        this.lastWakeGlowTime = now;
        this.onWakeWordTriggered?.();
      }

      if (finalTranscript) {
        this.emitCommandDeduped(finalTranscript, true);
        return;
      }

      // Ultra-fast interim wake reaction: ack "Yes sir!" in 140ms if standalone wake, or 360ms for inline command
      const stripped = this.stripWakePrefix(interimTranscript);
      clearTimeout(this.interimCommitTimer);
      clearTimeout(this.wakeAckTimer);
      if (!stripped) {
        this.wakeAckTimer = setTimeout(() => {
          if (!this.isSpeaking) {
            this.emitCommandDeduped(interimTranscript, true);
          }
        }, 140);
      } else {
        this.interimCommitTimer = setTimeout(() => {
          if (!this.isSpeaking) {
            this.emitCommandDeduped(interimTranscript, true);
          }
        }, 360);
      }
    } else if (this.isCommandWindowOpen()) {
      if (interimTranscript && !finalTranscript) {
        this.scheduleSilenceClose(15000);
        clearTimeout(this.interimCommitTimer);
        if (interimTranscript.trim().length >= 3) {
          this.interimCommitTimer = setTimeout(() => {
            if (!this.isSpeaking && this.isCommandWindowOpen()) {
              this.emitCommandDeduped(interimTranscript, false);
            }
          }, 420);
        }
        return;
      }

      if (finalTranscript) {
        this.scheduleSilenceClose(15000);
        this.emitCommandDeduped(finalTranscript, false);
      }
    }
  }

  private ensureRecognitionRestart(delayMs: number = 30, attempt: number = 0) {
    clearTimeout(this.restartTimer);
    if (!this.isListeningDesired || !this.autoRestart || this.isSpeaking || this.useNativeAndroidSpeech) {
      return;
    }

    this.restartTimer = setTimeout(() => {
      if (!this.isListeningDesired || this.isEngineRunning || this.isSpeaking || this.useNativeAndroidSpeech) {
        return;
      }

      if (attempt >= 3 || !this.recognition) {
        try {
          this.recognition?.abort?.();
        } catch {}
        this.recognition = null;
        this.initRecognition();
      }

      if (!this.recognition) return;

      try {
        this.recognition.lang = this.recognitionLang || 'en-IN';
        this.recognition.start();
        this.isEngineRunning = true;
      } catch {
        this.isEngineRunning = false;
        if (attempt < 6) {
          this.ensureRecognitionRestart(Math.min(800, 120 * (attempt + 1)), attempt + 1);
        }
      }
    }, delayMs);
  }

  private startWatchdog() {
    clearInterval(this.watchdogTimer);
    const intervalMs = this.useNativeAndroidSpeech ? 2200 : 900;
    this.watchdogTimer = setInterval(() => {
      if (!this.isListeningDesired || !this.autoRestart || this.isSpeaking) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        // When app is backgrounded, JarvisBackgroundService manages cool standby independently
        return;
      }
      if (this.useNativeAndroidSpeech) {
        if (!this.isEngineRunning) {
          window.JarvisAndroid?.startNativeListening?.();
        }
      } else if (!this.isEngineRunning) {
        this.ensureRecognitionRestart(60, 0);
      }
    }, intervalMs);
  }

  public ensureStandbyActive() {
    if (!this.isListeningDesired) {
      this.startListening(true);
      return;
    }
    if (this.isSpeaking) return;
    if (this.useNativeAndroidSpeech) {
      if (!this.isEngineRunning) {
        window.JarvisAndroid?.startNativeListening?.();
      }
    } else if (!this.isEngineRunning) {
      this.ensureRecognitionRestart(25, 0);
    }
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const win = window as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    // Prefer native Android SpeechRecognizer when running inside Capacitor APK or if Web Speech API is absent
    if (win && (window as any).JarvisAndroid && (!SpeechRec || /Android/i.test(navigator.userAgent))) {
      this.useNativeAndroidSpeech = true;
      return;
    }

    if (!SpeechRec) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 5;
      this.recognition.lang = this.recognitionLang || 'en-IN';

      this.recognition.onstart = () => {
        this.isEngineRunning = true;
        this.onListeningStateChanged?.(true);
      };

      this.recognition.onend = () => {
        this.isEngineRunning = false;

        if (this.isListeningDesired && this.autoRestart && !this.isSpeaking) {
          this.ensureRecognitionRestart(25, 0);
        } else if (!this.isListeningDesired) {
          this.onListeningStateChanged?.(false);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isEngineRunning = false;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.autoRestart = false;
          this.isListeningDesired = false;
          clearTimeout(this.restartTimer);
          this.onListeningStateChanged?.(false);
          return;
        }
        if (this.isListeningDesired && this.autoRestart && !this.isSpeaking) {
          this.ensureRecognitionRestart(60, 0);
        }
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition notice:', event.error);
        }
      };

      this.recognition.onresult = (event: any) => {
        if (this.isSpeaking) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const alts: string[] = [];
          for (let a = 0; a < item.length; a++) {
            if (item[a]?.transcript) alts.push(item[a].transcript);
          }
          const best = this.pickBestTranscriptFromAlternatives(alts);
          if (item.isFinal) {
            finalTranscript += best;
          } else {
            interimTranscript += best;
          }
        }

        this.processRecognizedText(finalTranscript, interimTranscript);
      };
    } catch (e) {
      console.error('Error creating SpeechRecognition instance:', e);
    }
  }

  public setCallbacks({
    onWakeWordTriggered,
    onCommandHeard,
    onCommandWindowClosed,
    onListeningStateChanged,
    onSpeechStart,
    onSpeechEnd,
  }: {
    onWakeWordTriggered?: () => void;
    onCommandHeard?: (command: string, wakeWordMatched: boolean) => void;
    onCommandWindowClosed?: () => void;
    onListeningStateChanged?: (listening: boolean) => void;
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
  }) {
    this.onWakeWordTriggered = onWakeWordTriggered;
    this.onCommandHeard = onCommandHeard;
    this.onCommandWindowClosed = onCommandWindowClosed;
    this.onListeningStateChanged = onListeningStateChanged;
    this.onSpeechStart = onSpeechStart;
    this.onSpeechEnd = onSpeechEnd;
  }

  public setWakeWord(word: string) {
    this.wakeWord = word.trim() || 'jarvis';
  }

  public setRecognitionLanguage(langCode: string) {
    if (langCode) {
      this.recognitionLang = langCode;
    }
    if (this.recognition && langCode) {
      try {
        this.recognition.lang = langCode;
      } catch {}
    }
  }

  public startListening(continuous: boolean = true) {
    this.autoRestart = continuous;
    this.isListeningDesired = true;
    this.startWatchdog();

    if (typeof window !== 'undefined' && window.JarvisAndroid?.startNativeListening && this.useNativeAndroidSpeech) {
      const started = window.JarvisAndroid.startNativeListening();
      if (started) {
        this.onListeningStateChanged?.(true);
        return true;
      }
    }

    if (!this.recognition) {
      this.initRecognition();
    }
    if (!this.recognition) return false;

    this.onListeningStateChanged?.(true);

    if (!this.isEngineRunning && !this.isSpeaking) {
      this.ensureRecognitionRestart(50, 0);
    }
    return true;
  }

  public stopListening() {
    this.autoRestart = false;
    this.isListeningDesired = false;
    clearTimeout(this.restartTimer);
    clearInterval(this.watchdogTimer);
    clearTimeout(this.silenceTimer);
    this.wakeWordActiveUntil = 0;
    this.lastProcessedTranscript = '';

    if (typeof window !== 'undefined' && window.JarvisAndroid?.stopNativeListening && this.useNativeAndroidSpeech) {
      window.JarvisAndroid.stopNativeListening();
    }

    if (this.recognition && this.isEngineRunning) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.isEngineRunning = false;
    this.onListeningStateChanged?.(false);
  }

  public getIsListening(): boolean {
    return this.isListeningDesired;
  }

  public static getAvailableVoices(): Promise<VoiceOption[]> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve([]);
        return;
      }

      const fetchVoices = () => {
        const rawVoices = window.speechSynthesis.getVoices();
        const formatted: VoiceOption[] = rawVoices.map((v) => ({
          name: v.name,
          lang: v.lang,
          isHindi: v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().includes('in'),
          voice: v,
        }));
        resolve(formatted);
      };

      const initial = window.speechSynthesis.getVoices();
      if (initial.length > 0) {
        fetchVoices();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          fetchVoices();
        };
      }
    });
  }

  public speakText(
    text: string,
    options: {
      langCode?: string;
      rate?: number;
      pitch?: number;
      preferredVoiceName?: string;
      onStart?: () => void;
      onEnd?: () => void;
    } = {}
  ): void {
    if (typeof window === 'undefined') return;
    if (!text || !text.trim()) return;

    const langCode = options.langCode || 'en-US';
    const langPrefix = langCode.split('-')[0].toLowerCase();
    const rate = options.rate || 0.95;
    const pitch = options.pitch || 0.98;

    // Use native Android TTS when running inside APK
    if (window.JarvisAndroid?.speakNativeText || window.JarvisAndroid?.speakNativeHindi) {
      try {
        this.isSpeaking = true;
        window.JarvisAndroid?.setTtsSpeakingState?.(true);
        this.onSpeechStart?.();
        options.onStart?.();
        this.activeTtsCallbacks = { onEnd: options.onEnd };

        const spoken = window.JarvisAndroid.speakNativeText
          ? window.JarvisAndroid.speakNativeText(text, langCode, rate, pitch)
          : window.JarvisAndroid.speakNativeHindi(text, rate, pitch);
        if (spoken) {
          clearTimeout(this.speechFallbackTimer);
          this.speechFallbackTimer = setTimeout(() => {
            if (this.isSpeaking) {
              this.isSpeaking = false;
              this.lastProcessedTranscript = '';
              this.lastProcessedTime = 0;
              window.JarvisAndroid?.setTtsSpeakingState?.(false);
              this.onSpeechEnd?.();
              this.activeTtsCallbacks.onEnd?.();
              this.activeTtsCallbacks = {};
              if (this.isListeningDesired && this.useNativeAndroidSpeech && !this.isEngineRunning) {
                window.JarvisAndroid?.startNativeListening?.();
              }
            }
          }, Math.max(2000, Math.min(35000, text.length * 135)));
          return;
        }
      } catch {
        window.JarvisAndroid?.setTtsSpeakingState?.(false);
        // Fallback to Web speechSynthesis below
      }
    }

    if (!('speechSynthesis' in window)) {
      options.onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    clearTimeout(this.speechFallbackTimer);

    this.isSpeaking = true;
    // Pause browser SpeechRecognition cleanly while TTS speaks so Android/Chrome releases mic focus cleanly
    if (!this.useNativeAndroidSpeech && this.recognition && this.isEngineRunning) {
      try {
        this.recognition.abort();
      } catch {}
      this.isEngineRunning = false;
    }

    this.onSpeechStart?.();
    options.onStart?.();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = rate;
    utterance.pitch = pitch;

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (options.preferredVoiceName) {
      const pref = voices.find((v) => v.name === options.preferredVoiceName);
      if (pref && pref.lang.toLowerCase().startsWith(langPrefix)) {
        selectedVoice = pref;
      }
    }

    if (!selectedVoice) {
      selectedVoice =
        voices.find(
          (v) =>
            v.lang.toLowerCase() === langCode.toLowerCase() &&
            (v.name.includes('Natural') || v.name.includes('Google'))
        ) ||
        voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase()) ||
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(langPrefix) &&
            (v.name.includes('Natural') || v.name.includes('Google'))
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    }

    if (!selectedVoice && langPrefix === 'hi') {
      selectedVoice = voices.find((v) => v.lang.toLowerCase() === 'en-in');
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    let finished = false;
    const finishSpeaking = () => {
      if (finished) return;
      finished = true;
      clearTimeout(this.speechFallbackTimer);
      this.isSpeaking = false;
      this.lastProcessedTranscript = '';
      this.lastProcessedTime = 0;
      this.onSpeechEnd?.();
      options.onEnd?.();

      if (this.wakeWordActiveUntil > 0) {
        this.scheduleSilenceClose(15000);
      }

      if (this.isListeningDesired && !this.useNativeAndroidSpeech) {
        this.ensureRecognitionRestart(25, 0);
      }
    };

    utterance.onend = finishSpeaking;
    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      finishSpeaking();
    };

    this.speechFallbackTimer = setTimeout(finishSpeaking, Math.max(2000, Math.min(35000, text.length * 135)));
    window.speechSynthesis.speak(utterance);
  }

  public speakHindi(
    text: string,
    options: {
      langCode?: string;
      rate?: number;
      pitch?: number;
      preferredVoiceName?: string;
      onStart?: () => void;
      onEnd?: () => void;
    } = {}
  ): void {
    this.speakText(text, options);
  }

  public stopSpeaking() {
    clearTimeout(this.speechFallbackTimer);
    if (typeof window !== 'undefined' && window.JarvisAndroid?.stopNativeSpeaking) {
      window.JarvisAndroid.stopNativeSpeaking();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.onSpeechEnd?.();
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const jarvisSpeech = new JarvisSpeechEngine();
