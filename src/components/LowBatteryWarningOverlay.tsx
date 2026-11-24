import React from 'react';
import {
  BatteryWarning,
  Zap,
  ShieldAlert,
  Power,
  RotateCcw,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { jarvisAudio } from '../utils/audioFx';

interface LowBatteryWarningOverlayProps {
  batteryLevel: number;
  isCharging: boolean;
  isPowerSavingMode: boolean;
  onActivatePowerSaving: () => void;
  onSimulateRecharge: () => void;
  onDismiss: () => void;
}

export const LowBatteryWarningOverlay: React.FC<LowBatteryWarningOverlayProps> = ({
  batteryLevel,
  isCharging,
  isPowerSavingMode,
  onActivatePowerSaving,
  onSimulateRecharge,
  onDismiss,
}) => {
  // Estimated minutes remaining: ~1.2 mins per percent
  const minutesRemaining = Math.max(3, Math.round(batteryLevel * 1.2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      {/* Red/Amber Flashing Emergency Backdrop Aura */}
      <div className="absolute inset-0 bg-gradient-to-t from-red-950/40 via-transparent to-amber-950/30 pointer-events-none" />

      {/* Warning Card Container */}
      <div className="relative w-full max-w-lg rounded-2xl border-2 border-red-500/80 bg-slate-950/95 p-6 shadow-[0_0_80px_rgba(239,68,68,0.4)] space-y-5 overflow-hidden">
        {/* Animated Hazard Caution Stripe Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />

        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-950/80 border-2 border-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-bounce">
              <BatteryWarning className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 border border-red-500/60 text-red-400 font-bold uppercase tracking-wider">
                  EMERGENCY PROTOCOL 07
                </span>
                <span className="text-[10px] font-mono text-slate-400">ARC POWER CORE</span>
              </div>
              <h2 className="font-orbitron font-extrabold text-lg text-white tracking-wide mt-0.5">
                CRITICAL BATTERY DEPLETION
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              jarvisAudio.playTerminalTick();
              onDismiss();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Dismiss warning"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Battery Telemetry Gauge Card */}
        <div className="p-4 rounded-xl border border-red-900/60 bg-black/80 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              CURRENT POWER RESERVE:
            </span>
            <span className="text-2xl font-orbitron font-extrabold text-red-400 flex items-center gap-1">
              {batteryLevel}%
              <span className="text-[11px] font-mono text-red-500/80 font-normal">CRITICAL</span>
            </span>
          </div>

          {/* Depletion Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-900 border border-red-900 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-500 relative"
              style={{ width: `${Math.max(5, batteryLevel)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-amber-400">
              <Clock className="w-3.5 h-3.5" /> EST. RUNTIME: ~{minutesRemaining} MINS
            </span>
            <span className="text-red-400">THRESHOLD: &lt; 15%</span>
          </div>
        </div>

        {/* Recommended Action Notice */}
        <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/20 text-xs font-mono space-y-1.5">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>JARVIS RECOMMENDATION: ACTIVATE POWER-SAVING MODE</span>
          </div>
          <p className="text-slate-300 font-sans text-xs leading-relaxed">
            Power-saving mode will automatically lower display luminance to <strong>20%</strong>, throttle background CPU cycles, and preserve critical voice automation until power is restored.
          </p>
        </div>

        {/* Primary & Secondary Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* Main Power Saving Mode Button */}
          <button
            onClick={() => {
              jarvisAudio.playTaskSuccess();
              onActivatePowerSaving();
            }}
            disabled={isPowerSavingMode}
            className={`w-full py-3 px-4 rounded-xl font-orbitron font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] cursor-pointer ${
              isPowerSavingMode
                ? 'bg-emerald-600/60 border border-emerald-400 text-emerald-100 cursor-default'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black'
            }`}
          >
            <Zap className="w-4 h-4 text-black" />
            <span>
              {isPowerSavingMode ? 'POWER-SAVING MODE ACTIVE' : '⚡ ACTIVATE POWER-SAVING MODE'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            {/* Simulate Charger Connection */}
            <button
              onClick={() => {
                jarvisAudio.playTaskSuccess();
                onSimulateRecharge();
              }}
              className="py-2.5 px-3 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RECHARGE (95%)</span>
            </button>

            {/* Pilot Override / Dismiss */}
            <button
              onClick={() => {
                jarvisAudio.playTerminalTick();
                onDismiss();
              }}
              className="py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>DISMISS ALERT</span>
            </button>
          </div>
        </div>

        {/* Footer telemetry */}
        <div className="text-[10px] font-mono text-slate-500 text-center flex items-center justify-center gap-2 border-t border-slate-900 pt-3">
          <span>VOICE OVERRIDE: SAY "JARVIS POWER SAVE" OR "JARVIS CANCEL"</span>
        </div>
      </div>
    </div>
  );
};
