import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Shield, Activity, Radio } from 'lucide-react';
import { jarvisAudio } from '../utils/audioFx';

interface ArcReactorHUDProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  wakeWord: string;
  wakeWordDetected: boolean;
  onToggleMic: () => void;
  statusText: string;
  hindiSpeechText?: string;
  englishActionText?: string;
}

export const ArcReactorHUD: React.FC<ArcReactorHUDProps> = ({
  isListening,
  isSpeaking,
  isProcessing,
  wakeWord,
  wakeWordDetected,
  onToggleMic,
  statusText,
  hindiSpeechText,
  englishActionText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio wave visualization on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Draw horizontal baseline
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      const bars = 48;
      const barWidth = width / bars;

      for (let i = 0; i < bars; i++) {
        const x = i * barWidth;
        const normalizedX = (i - bars / 2) / (bars / 2);
        const bellCurve = Math.exp(-Math.pow(normalizedX * 1.8, 2));

        let amplitude = 4;
        if (isSpeaking) {
          amplitude = (Math.sin(phase * 4 + i * 0.4) * 0.5 + 0.5) * 45 * bellCurve + 8;
        } else if (isListening) {
          amplitude = (Math.sin(phase * 2 + i * 0.3) * 0.5 + 0.5) * 26 * bellCurve + 6;
        } else if (isProcessing) {
          amplitude = (Math.sin(phase * 6 + i * 0.6) * 0.5 + 0.5) * 35 * bellCurve + 8;
        }

        const barHeight = Math.max(3, amplitude);

        // Color gradient based on state
        const grad = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
        if (wakeWordDetected || isProcessing) {
          grad.addColorStop(0, '#f59e0b');
          grad.addColorStop(0.5, '#fbbf24');
          grad.addColorStop(1, '#f59e0b');
        } else if (isSpeaking) {
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(0.5, '#00f0ff');
          grad.addColorStop(1, '#0284c7');
        } else {
          grad.addColorStop(0, '#0284c7');
          grad.addColorStop(0.5, '#00f0ff');
          grad.addColorStop(1, 'rgba(0, 240, 255, 0.2)');
        }

        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, centerY - barHeight / 2, barWidth - 4, barHeight);
      }

      phase += 0.04;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isListening, isSpeaking, isProcessing, wakeWordDetected]);

  return (
    <div className="relative flex flex-col items-center justify-center p-6 border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 via-black/60 to-black/90 rounded-2xl backdrop-blur-md shadow-[0_0_50px_rgba(0,240,255,0.08)] overflow-hidden">
      {/* Corner Sci-Fi Tech Accents */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

      {/* Top telemetry ticker */}
      <div className="w-full flex items-center justify-between text-[11px] font-mono text-cyan-400/70 border-b border-cyan-900/40 pb-2 mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>CORE // MK-85 ARC REACTOR</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Radio className={`w-3.5 h-3.5 ${isListening ? 'text-emerald-400 animate-ping' : 'text-slate-500'}`} />
            <span>WAKE WORD: <strong className="text-cyan-300 font-bold uppercase tracking-wider">"{wakeWord}"</strong></span>
          </span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-400">OUTPUT: HINDI VOICE / ENGLISH LOGS</span>
        </div>
      </div>

      {/* Central Interactive Arc Reactor */}
      <div className="relative my-2 flex items-center justify-center">
        {/* Outer Rotating Calibration Ring */}
        <div
          className={`w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-dashed border-cyan-500/40 absolute flex items-center justify-center transition-all duration-700 ${
            isSpeaking ? 'animate-spin-reverse-slow border-cyan-400' : 'animate-spin-slow'
          } ${wakeWordDetected ? 'border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)]' : ''}`}
        >
          {/* Segment marks */}
          <div className="absolute top-0 w-2 h-2 bg-cyan-400 -translate-y-1 shadow-[0_0_8px_#00f0ff]" />
          <div className="absolute bottom-0 w-2 h-2 bg-cyan-400 translate-y-1 shadow-[0_0_8px_#00f0ff]" />
          <div className="absolute left-0 w-2 h-2 bg-cyan-400 -translate-x-1 shadow-[0_0_8px_#00f0ff]" />
          <div className="absolute right-0 w-2 h-2 bg-cyan-400 translate-x-1 shadow-[0_0_8px_#00f0ff]" />
        </div>

        {/* Secondary Inner Ring with Triangular Segments */}
        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-cyan-500/30 absolute flex items-center justify-center animate-spin-reverse-slow">
          <div className="w-full h-full rounded-full border-t-2 border-b-2 border-cyan-400/60" />
        </div>

        {/* Pulsating Arc Reactor Core */}
        <button
          onClick={() => {
            jarvisAudio.playWakeWordDetected();
            onToggleMic();
          }}
          title={isListening ? 'Click to pause voice recognition' : 'Click to activate voice listening'}
          className={`group relative w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-500 z-10 ${
            wakeWordDetected
              ? 'bg-gradient-to-tr from-amber-600/40 via-amber-400/20 to-black shadow-[0_0_50px_rgba(245,158,11,0.7)] border-2 border-amber-400'
              : isSpeaking
              ? 'bg-gradient-to-tr from-cyan-600/40 via-sky-400/20 to-black shadow-[0_0_50px_rgba(0,240,255,0.7)] border-2 border-cyan-300'
              : isListening
              ? 'bg-gradient-to-tr from-cyan-950 via-cyan-900/40 to-black shadow-[0_0_35px_rgba(0,240,255,0.4)] border border-cyan-400/80 animate-pulse-glow'
              : 'bg-black/80 border border-slate-700 hover:border-cyan-500/60'
          }`}
        >
          {/* Inner Core Glow */}
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              wakeWordDetected
                ? 'bg-amber-400/30'
                : isSpeaking
                ? 'bg-cyan-400/30'
                : isListening
                ? 'bg-cyan-500/20'
                : 'bg-slate-800/40'
            }`}
          >
            {isSpeaking ? (
              <Volume2 className="w-8 h-8 text-cyan-300 animate-bounce" />
            ) : isListening ? (
              <Mic className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
            ) : (
              <MicOff className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            )}
          </div>

          <span className="text-[10px] font-orbitron font-bold tracking-widest mt-1 uppercase text-cyan-300/90">
            {wakeWordDetected ? 'ACTIVE' : isSpeaking ? 'VOICE OUT' : isListening ? 'LISTENING' : 'OFFLINE'}
          </span>
        </button>
      </div>

      {/* Real-time Audio Frequency Spectrum Visualizer */}
      <div className="w-full max-w-lg mt-6 px-4">
        <canvas
          ref={canvasRef}
          width={400}
          height={40}
          className="w-full h-10 rounded border border-cyan-900/40 bg-black/50"
        />
      </div>

      {/* Voice Status & Subtitle Cards */}
      <div className="w-full max-w-xl mt-4 flex flex-col items-center text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>STATUS: {statusText.toUpperCase()}</span>
        </div>

        {/* Hindi Speech Voice Bubble */}
        {hindiSpeechText && (
          <div className="w-full p-3 rounded-lg bg-cyan-900/20 border border-cyan-500/40 text-cyan-200 text-sm font-medium shadow-[0_0_20px_rgba(0,240,255,0.1)] flex items-start gap-2 text-left">
            <Volume2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0 animate-pulse" />
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/70 mb-0.5">
                JARVIS VOICE RESPONSE (HINDI):
              </div>
              <div className="text-base text-cyan-100 font-sans leading-relaxed">
                "{hindiSpeechText}"
              </div>
            </div>
          </div>
        )}

        {/* English Execution Telemetry */}
        {englishActionText && (
          <div className="w-full p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/60 text-slate-300 text-xs font-mono flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>EXECUTION: <strong className="text-slate-100">{englishActionText}</strong></span>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              CONFIRMED
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
