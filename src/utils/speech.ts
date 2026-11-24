// Speech Recognition & Speech Synthesis Utility for Jarvis

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
  // User's intended state: true when hands-free listening is enabled
  private isListeningDesired: boolean = false;
  // Internal browser engine state
  private isEngineRunning: boolean = false;
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

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const win = window as IWindow;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      // 'en-IN' works best for Hindi + English bilingual voice commands
      this.recognition.lang = 'en-IN';

      this.recognition.onstart = () => {
        this.isEngineRunning = true;
        // Notify listener that mic is actively running
        this.onListeningStateChanged?.(true);
      };

      this.recognition.onend = () => {
        this.isEngineRunning = false;

        // CRITICAL FIX: Do NOT flip UI to "OFF/MUTED" during natural silence re-cycles!
        // Only restart if the user still desires continuous listening and Jarvis isn't speaking
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
          // Explicitly stopped by user
          this.onListeningStateChanged?.(false);
        }
      };

      this.recognition.onerror = (event: any) => {
        // Stop auto-restarting if permission was denied or microphone is unavailable
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
        // While Jarvis is speaking aloud through speakers, ignore incoming audio to prevent self-loop
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

        const candidate = (finalTranscript || interimTranscript).trim();
        if (!candidate || candidate.length < 2) return;

        const lowerCandidate = candidate.toLowerCase();
        const wake = this.wakeWord.toLowerCase();
        
        // Match both custom wake word and standard "hey jarvis" / "jarvis"
        const hasWakeWord =
          lowerCandidate.includes(wake) ||
          lowerCandidate.includes('hey jarvis') ||
          lowerCandidate.includes('jarvis');

        if (hasWakeWord) {
          // Activate a 12-second window for the follow-up question
          this.wakeWordActiveUntil = Date.now() + 12000;
          this.onWakeWordTriggered?.();

          // If this was a final transcript or contains a complete command
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
          // User already said "Hey Jarvis" and is now delivering their question!
          const now = Date.now();
          const text = finalTranscript.trim();
          if (text !== this.lastProcessedTranscript || now - this.lastProcessedTime > 2000) {
            this.lastProcessedTranscript = text;
            this.lastProcessedTime = now;
            this.wakeWordActiveUntil = 0; // Question consumed
            this.onCommandHeard?.(text, false);
          }
        }
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

  public startListening(continuous: boolean = true) {
    this.autoRestart = continuous;
    this.isListeningDesired = true;

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

  // Get list of voices installed in browser
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

  // Speak aloud in Hindi with robotic/refined tone
  public speakHindi(
    hindiText: string,
    options: {
      rate?: number;
      pitch?: number;
      preferredVoiceName?: string;
      onStart?: () => void;
      onEnd?: () => void;
    } = {}
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Cancel current speaking
    window.speechSynthesis.cancel();

    if (!hindiText || !hindiText.trim()) return;

    this.isSpeaking = true;
    this.onSpeechStart?.();
    options.onStart?.();

    const utterance = new SpeechSynthesisUtterance(hindiText);
    utterance.rate = options.rate || 0.95;
    utterance.pitch = options.pitch || 0.98;

    // Locate best Hindi or Indian voice
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find((v) => options.preferredVoiceName && v.name === options.preferredVoiceName);

    if (!selectedVoice) {
      // Prioritize authentic Hindi (hi-IN)
      selectedVoice = voices.find((v) => v.lang.toLowerCase() === 'hi-in' || v.lang.toLowerCase().startsWith('hi'));
    }
    if (!selectedVoice) {
      // Fallback to Indian English (en-IN) which pronounces Hindi smoothly
      selectedVoice = voices.find((v) => v.lang.toLowerCase() === 'en-in');
    }
    if (!selectedVoice) {
      selectedVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David'))
      );
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    const finishSpeaking = () => {
      this.isSpeaking = false;
      this.onSpeechEnd?.();
      options.onEnd?.();

      // Once speech finishes, resume recognition if user desires continuous listening
      if (this.isListeningDesired && !this.isEngineRunning) {
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

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.onSpeechEnd?.();
    }
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const jarvisSpeech = new JarvisSpeechEngine();
