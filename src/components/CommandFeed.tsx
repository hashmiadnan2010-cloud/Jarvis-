import React from 'react';
import { Volume2, CheckCircle2, Clock, MessageSquare, Laptop, Terminal, Sparkles, AlertTriangle } from 'lucide-react';
import { CommandLog } from '../types/jarvis';
import { jarvisAudio } from '../utils/audioFx';

interface CommandFeedProps {
  logs: CommandLog[];
  onPlayHindiSpeech: (speechText: string) => void;
  onSelectQuickAction?: (actionText: string) => void;
  onClearLogs?: () => void;
}

export const CommandFeed: React.FC<CommandFeedProps> = ({
  logs,
  onPlayHindiSpeech,
  onSelectQuickAction,
  onClearLogs,
}) => {
  if (logs.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-cyan-900/30 bg-black/40 flex flex-col items-center justify-center space-y-3">
        <Sparkles className="w-8 h-8 text-cyan-500/40 animate-pulse" />
        <div className="text-sm font-orbitron font-bold text-slate-300">
          AWAITING VOICE OR TERMINAL COMMAND
        </div>
        <p className="text-xs text-slate-500 font-mono max-w-sm">
          Say <strong className="text-cyan-400">"Jarvis send message to my mother"</strong> or{' '}
          <strong className="text-cyan-400">"Jarvis set volume to 80%"</strong> to activate automation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-cyan-950 pb-2">
        <span className="flex items-center gap-1.5 text-cyan-300">
          <Clock className="w-3.5 h-3.5" /> COMMAND EXECUTION LOG ({logs.length})
        </span>
        {onClearLogs && (
          <button
            onClick={onClearLogs}
            className="text-[11px] text-slate-500 hover:text-red-400 transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {logs.map((log) => {
          const isWhatsApp = log.intent === 'WHATSAPP_SEND';
          const isSystem = log.intent.startsWith('SYSTEM_');

          return (
            <div
              key={log.id}
              className="p-3.5 rounded-xl border border-cyan-900/40 bg-gradient-to-b from-slate-950 via-black/80 to-black/90 space-y-2.5 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            >
              {/* Top row: user query and timestamp */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300 uppercase">
                    {log.intent.replace('_', ' ')}
                  </span>
                  {log.wakeWordDetected && (
                    <span className="text-[10px] bg-amber-950/60 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                      WAKE-WORD
                    </span>
                  )}
                  <span className="text-slate-200 font-medium truncate max-w-xs sm:max-w-md">
                    "{log.userQuery}"
                  </span>
                </div>
                <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
              </div>

              {/* English Execution Summary */}
              <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                      ENGLISH TELEMETRY & ACTION:
                    </div>
                    <div className="text-slate-100 font-mono mt-0.5 leading-relaxed">
                      {log.englishActionSummary}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hindi Voice Speech Box */}
              {log.hindiVoiceReply && (
                <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => {
                        jarvisAudio.playTerminalTick();
                        onPlayHindiSpeech(log.hindiVoiceReply);
                      }}
                      className="p-1 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-300 transition-colors shrink-0 mt-0.5"
                      title="Listen to Hindi Voice reply"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <div className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-wider">
                        JARVIS VOICE REPLY (HINDI):
                      </div>
                      <div className="text-cyan-100 font-sans text-sm font-medium mt-0.5">
                        "{log.hindiVoiceReply}"
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      jarvisAudio.playTerminalTick();
                      onPlayHindiSpeech(log.hindiVoiceReply);
                    }}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 underline shrink-0 hidden sm:inline"
                  >
                    Replay
                  </button>
                </div>
              )}

              {/* Quick follow up buttons */}
              {log.quickFollowUps && log.quickFollowUps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {log.quickFollowUps.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectQuickAction?.(action)}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 transition-colors"
                    >
                      ⚡ {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
