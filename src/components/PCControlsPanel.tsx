import React from 'react';
import {
  Volume2,
  VolumeX,
  Sun,
  Cpu,
  HardDrive,
  Wifi,
  Battery,
  Lock,
  Camera,
  Layers,
  ExternalLink,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { SystemState, PCApp } from '../types/jarvis';
import { jarvisAudio } from '../utils/audioFx';

interface PCControlsPanelProps {
  systemState: SystemState;
  apps: PCApp[];
  onUpdateVolume: (volume: number, isMuted?: boolean) => void;
  onUpdateBrightness: (brightness: number) => void;
  onLaunchApp: (appId: string) => void;
  onLockScreen: () => void;
  onBoostMemory: () => void;
  onSetBatteryLevel?: (level: number) => void;
  onTogglePowerSaving?: () => void;
}

export const PCControlsPanel: React.FC<PCControlsPanelProps> = ({
  systemState,
  apps,
  onUpdateVolume,
  onUpdateBrightness,
  onLaunchApp,
  onLockScreen,
  onBoostMemory,
  onSetBatteryLevel,
  onTogglePowerSaving,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Hardware Telemetry Strips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* CPU */}
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-black/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Cpu className="w-3.5 h-3.5" /> CPU LOAD
            </span>
            <span className="font-bold text-white">{systemState.cpuUsage}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${systemState.cpuUsage}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">8 CORES // 4.8 GHz</span>
        </div>

        {/* RAM */}
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-black/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-sky-400">
              <HardDrive className="w-3.5 h-3.5" /> MEMORY
            </span>
            <span className="font-bold text-white">{systemState.memoryUsage}%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 transition-all duration-500"
              style={{ width: `${systemState.memoryUsage}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">11.4 GB / 32 GB ALLOC</span>
        </div>

        {/* Battery */}
        <div
          className={`p-3 rounded-xl border relative overflow-hidden transition-colors ${
            systemState.batteryLevel < 15
              ? 'border-red-500 bg-red-950/40 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse'
              : 'border-cyan-500/20 bg-black/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span
              className={`flex items-center gap-1.5 ${
                systemState.batteryLevel < 15 ? 'text-red-400 font-bold' : 'text-emerald-400'
              }`}
            >
              <Battery className="w-3.5 h-3.5" /> POWER
            </span>
            <span
              className={`font-bold ${
                systemState.batteryLevel < 15 ? 'text-red-400' : 'text-emerald-300'
              }`}
            >
              {systemState.batteryLevel}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                systemState.batteryLevel < 15 ? 'bg-red-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${systemState.batteryLevel}%` }}
            />
          </div>
          <span
            className={`text-[10px] font-mono mt-1 flex items-center gap-1 ${
              systemState.batteryLevel < 15 ? 'text-red-400 font-bold' : 'text-emerald-500'
            }`}
          >
            {systemState.batteryLevel < 15 ? (
              'CRITICAL < 15%'
            ) : systemState.isPowerSavingMode ? (
              '⚡ POWER-SAVING'
            ) : (
              <>
                <Zap className="w-2.5 h-2.5" /> ARC PLUGGED IN
              </>
            )}
          </span>
        </div>

        {/* Network */}
        <div className="p-3 rounded-xl border border-cyan-500/20 bg-black/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <Wifi className="w-3.5 h-3.5" /> LATENCY
            </span>
            <span className="font-bold text-white">{systemState.networkPing} ms</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-400 transition-all duration-500"
              style={{ width: `${Math.min(100, systemState.networkPing * 2)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">STARLINK SECURE PROTOCOL</span>
        </div>
      </div>

      {/* Hardware Sliders: Master Volume & Display Brightness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Volume Control Card */}
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-black/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  jarvisAudio.playHardwareTick();
                  onUpdateVolume(systemState.volume, !systemState.isMuted);
                }}
                className={`p-2 rounded-lg border transition-colors ${
                  systemState.isMuted
                    ? 'border-red-500/50 bg-red-950/40 text-red-400'
                    : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-400'
                }`}
                title={systemState.isMuted ? 'Unmute' : 'Mute'}
              >
                {systemState.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div>
                <div className="text-xs font-orbitron font-bold text-white">MASTER AUDIO GAIN</div>
                <div className="text-[10px] font-mono text-slate-400">
                  {systemState.isMuted ? 'STATUS: MUTED' : `LEVEL: ${systemState.volume}%`}
                </div>
              </div>
            </div>
            <span className="text-lg font-orbitron font-bold text-cyan-400">
              {systemState.isMuted ? '0%' : `${systemState.volume}%`}
            </span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min="0"
            max="100"
            value={systemState.isMuted ? 0 : systemState.volume}
            onChange={(e) => {
              jarvisAudio.playHardwareTick();
              onUpdateVolume(parseInt(e.target.value, 10), false);
            }}
            className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />

          {/* Presets */}
          <div className="flex items-center justify-between text-[11px] font-mono">
            {[0, 25, 50, 75, 100].map((val) => (
              <button
                key={val}
                onClick={() => {
                  jarvisAudio.playHardwareTick();
                  onUpdateVolume(val, val === 0);
                }}
                className={`px-2 py-0.5 rounded border ${
                  systemState.volume === val && !systemState.isMuted
                    ? 'border-cyan-400 bg-cyan-950 text-cyan-300'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>

        {/* Brightness Control Card */}
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-black/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg border border-amber-500/40 bg-amber-950/40 text-amber-400">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-orbitron font-bold text-white">DISPLAY LUMINANCE</div>
                <div className="text-[10px] font-mono text-slate-400">GAMMA SHIELD ACTIVE</div>
              </div>
            </div>
            <span className="text-lg font-orbitron font-bold text-amber-400">{systemState.brightness}%</span>
          </div>

          {/* Slider */}
          <input
            type="range"
            min="10"
            max="100"
            value={systemState.brightness}
            onChange={(e) => {
              jarvisAudio.playHardwareTick();
              onUpdateBrightness(parseInt(e.target.value, 10));
            }}
            className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />

          {/* Presets */}
          <div className="flex items-center justify-between text-[11px] font-mono">
            {[
              { label: 'Night (20%)', val: 20 },
              { label: 'Eco (50%)', val: 50 },
              { label: 'Vivid (80%)', val: 80 },
              { label: 'Max (100%)', val: 100 },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => {
                  jarvisAudio.playHardwareTick();
                  onUpdateBrightness(p.val);
                }}
                className={`px-2 py-0.5 rounded border ${
                  systemState.brightness === p.val
                    ? 'border-amber-400 bg-amber-950 text-amber-300'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Application Grid Launcher */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-orbitron font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            OPERATE PC APPLICATIONS
          </div>
          <div className="text-[10px] font-mono text-cyan-400">
            VOICE TRIGGER: "JARVIS OPEN [APP]"
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {apps.map((app) => {
            const isActive = systemState.activeAppId === app.id;
            return (
              <button
                key={app.id}
                onClick={() => onLaunchApp(app.id)}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                    : 'border-slate-800 bg-black/50 hover:border-cyan-500/50 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{app.icon}</span>
                  {app.url && (
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  )}
                </div>

                <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                  {app.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                  {app.category}
                </div>

                {/* Status indicator */}
                <div className="mt-2 flex items-center gap-1.5 text-[9px] font-mono">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive
                        ? 'bg-cyan-400 animate-ping'
                        : app.status === 'running'
                        ? 'bg-emerald-400'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span className={isActive ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                    {isActive ? 'IN FOREGROUND' : app.status.toUpperCase()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Automation Bar */}
      <div className="p-3.5 rounded-xl border border-slate-800 bg-black/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>QUICK AUTOMATION ROUTINES:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onTogglePowerSaving && (
            <button
              onClick={() => {
                jarvisAudio.playHardwareTick();
                onTogglePowerSaving();
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
                systemState.isPowerSavingMode
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-bold'
                  : 'border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{systemState.isPowerSavingMode ? 'POWER-SAVING: ON' : 'POWER-SAVING: OFF'}</span>
            </button>
          )}

          {onSetBatteryLevel && (
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 px-1">BATTERY TEST:</span>
              <button
                onClick={() => onSetBatteryLevel(12)}
                className="px-2 py-0.5 rounded bg-red-950 border border-red-500/60 text-red-400 hover:bg-red-900 text-[10px] font-bold"
                title="Trigger Low Battery Warning (< 15%)"
              >
                12% LOW
              </button>
              <button
                onClick={() => onSetBatteryLevel(95)}
                className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-400 hover:bg-emerald-900 text-[10px] font-bold"
                title="Restore Normal Battery"
              >
                95% FULL
              </button>
            </div>
          )}

          <button
            onClick={() => {
              jarvisAudio.playTerminalTick();
              onBoostMemory();
            }}
            className="px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>FLUSH RAM CACHE</span>
          </button>

          <button
            onClick={() => {
              jarvisAudio.playTerminalTick();
              onLockScreen();
            }}
            className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 flex items-center gap-1.5 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>SECURE PC LOCK</span>
          </button>
        </div>
      </div>
    </div>
  );
};
