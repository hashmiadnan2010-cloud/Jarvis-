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
  private onListeningStateChanged?: (listening: boolean) => void;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private autoRestart: boolean = true;
  private isSpeaking: boolean = false;
  private wakeWordActiveUntil: number = 0;
  private lastProcessedTranscript: string = '';
  private lastProcessedTime: number = 0;
  private restartTimer: any = null;
  private speechFallbackTimer: any = null;
  private activeTtsCallbacks: { onEnd?: () => void } = {};

  constructor() {
    this.initRecognition();
    this.initNativeAndroidListeners();
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
        this.wakeWordActiveUntil = now + 12000;
        this.onWakeWordTriggered?.();
        this.onCommandHeard?.(command, true);
      } else {
        this.wakeWordActiveUntil = Date.now() + 12000;
        this.onWakeWordTriggered?.();
        this.onCommandHeard?.(this.wakeWord, true);
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
        window.JarvisAndroid?.setTtsSpeakingState?.(false);
        this.onSpeechEnd?.();
        this.activeTtsCallbacks.onEnd?.();
        this.activeTtsCallbacks = {};
        if (this.isListeningDesired && this.useNativeAndroidSpeech && !this.isEngineRunning) {
          window.JarvisAndroid?.startNativeListening?.();
        }
      }
    });
  }

  private processRecognizedText(finalTranscript: string, interimTranscript: string) {
    const candidate = (finalTranscript || interimTranscript).trim();
    if (!candidate || candidate.length < 2) return;

    const lowerCandidate = candidate.toLowerCase();
    const wake = this.wakeWord.toLowerCase();

    const hasWakeWord =
      lowerCandidate.includes(wake) ||
      lowerCandidate.includes('hey jarvis') ||
      lowerCandidate.includes('jarvis');

    if (hasWakeWord) {
      this.wakeWordActiveUntil = Date.now() + 12000;
      this.onWakeWordTriggered?.();

      if (finalTranscript) {
        const now = Date.now();
        const text = finalTranscript.trim();
        if (text !== this.lastProcessedTranscript || now - this.lastProcessedTime > 2000) {
          this.lastProcessedTranscript = text;
          this.lastProcessedTime = now;
          this.onCommandHeard?.(text, true);
        }
      }
    } else if (finalTranscript && Date.now() < this.wakeWordActiveUntil) {
      const now = Date.now();
      const text = finalTranscript.trim();
      if (text !== this.lastProcessedTranscript || now - this.lastProcessedTime > 2000) {
        this.lastProcessedTranscript = text;
        this.lastProcessedTime = now;
        this.wakeWordActiveUntil = 0;
        this.onCommandHeard?.(text, false);
      }
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
      this.recognition.lang = 'en-IN';

      this.recognition.onstart = () => {
        this.isEngineRunning = true;
        this.onListeningStateChanged?.(true);
      };

      this.recognition.onend = () => {
        this.isEngineRunning = false;

        if (this.isListeningDesired && this.autoRestart && !this.isSpeaking) {
          clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => {
            if (this.isListeningDesired && !this.isEngineRunning && !this.isSpeaking) {
              try {
                this.recognition?.start();
              } catch {
                // Ignore already started errors
              }
            }
          }, 150);
        } else if (!this.isListeningDesired) {
          this.onListeningStateChanged?.(false);
        }
      };

      this.recognition.onerror = (event: any) => {
        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          event.error === 'audio-capture'
        ) {
          this.autoRestart = false;
          this.isListeningDesired = false;
          this.isEngineRunning = false;
          clearTimeout(this.restartTimer);
          this.onListeningStateChanged?.(false);
          return;
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
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
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
    onListeningStateChanged,
    onSpeechStart,
    onSpeechEnd,
  }: {
    onWakeWordTriggered?: () => void;
    onCommandHeard?: (command: string, wakeWordMatched: boolean) => void;
    onListeningStateChanged?: (listening: boolean) => void;
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
  }) {
    this.onWakeWordTriggered = onWakeWordTriggered;
    this.onCommandHeard = onCommandHeard;
    this.onListeningStateChanged = onListeningStateChanged;
    this.onSpeechStart = onSpeechStart;
    this.onSpeechEnd = onSpeechEnd;
  }

  public setWakeWord(word: string) {
    this.wakeWord = word.trim() || 'jarvis';
  }

  public setRecognitionLanguage(langCode: string) {
    if (this.recognition && langCode) {
      try {
        this.recognition.lang = langCode;
      } catch {}
    }
  }

  public startListening(continuous: boolean = true) {
    this.autoRestart = continuous;
    this.isListeningDesired = true;

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
      try {
        this.recognition.start();
        this.isEngineRunning = true;
      } catch {
        // Ignore already started
      }
    }
    return true;
  }

  public stopListening() {
    this.autoRestart = false;
    this.isListeningDesired = false;
    clearTimeout(this.restartTimer);

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
              window.JarvisAndroid?.setTtsSpeakingState?.(false);
              this.onSpeechEnd?.();
              this.activeTtsCallbacks.onEnd?.();
              this.activeTtsCallbacks = {};
            }
          }, Math.max(5000, text.length * 140));
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
      this.onSpeechEnd?.();
      options.onEnd?.();

      if (this.isListeningDesired && !this.isEngineRunning && !this.useNativeAndroidSpeech) {
        setTimeout(() => {
          if (this.isListeningDesired && !this.isEngineRunning && !this.isSpeaking) {
            try {
              this.recognition?.start();
              this.isEngineRunning = true;
            } catch {}
          }
        }, 300);
      }
    };

    utterance.onend = finishSpeaking;
    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      finishSpeaking();
    };

    this.speechFallbackTimer = setTimeout(finishSpeaking, Math.max(5000, text.length * 140));
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
