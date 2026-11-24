import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Send, Trash2, Copy, Check, Play, ShieldAlert } from 'lucide-react';
import { TerminalEntry } from '../types/jarvis';
import { jarvisAudio } from '../utils/audioFx';

interface TerminalConsoleProps {
  logs: TerminalEntry[];
  onExecuteCommand: (cmd: string) => void;
  onClearLogs: () => void;
}

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({
  logs,
  onExecuteCommand,
  onClearLogs,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    jarvisAudio.playTerminalTick();
    onExecuteCommand(inputVal.trim());
    setInputVal('');
  };

  const copyAllLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] $ ${l.command}\n${l.output}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-cyan-500/30 bg-black/90 font-mono text-xs overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.1)]">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-cyan-900/60">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white tracking-wider">JARVIS OS TERMINAL // BASH AUTOMATION</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyAllLogs}
            className="p-1 rounded text-slate-400 hover:text-cyan-300 transition-colors"
            title="Copy logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClearLogs}
            className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors"
            title="Clear terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[240px] max-h-[360px] text-slate-300 selection:bg-cyan-500 selection:text-black">
        <div className="text-cyan-500/70 border-b border-cyan-900/30 pb-2 mb-2">
          STARK INDUSTRIES PROTOCOL 4.2.0 [ONLINE]
          <br />
          TYPE 'help', 'status', 'ping', 'whatsapp &lt;contact&gt;', OR 'volume &lt;0-100&gt;'
        </div>

        {logs.map((log) => (
          <div key={log.id} className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="text-slate-500">[{log.timestamp}]</span>
              <span className="text-emerald-400 font-bold">$</span>
              <span className="text-white">{log.command}</span>
            </div>
            <pre
              className={`pl-5 text-[11px] whitespace-pre-wrap ${
                log.status === 'error'
                  ? 'text-red-400'
                  : log.status === 'warn'
                  ? 'text-amber-400'
                  : log.status === 'info'
                  ? 'text-cyan-300'
                  : 'text-slate-300'
              }`}
            >
              {log.output}
            </pre>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Command Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center px-3 py-2 bg-slate-950 border-t border-cyan-900/60">
        <span className="text-emerald-400 font-bold mr-2">$</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Execute system script or command (e.g. status, whatsapp send, volume 80)..."
          className="flex-1 bg-transparent text-slate-100 focus:outline-none placeholder:text-slate-600 font-mono text-xs"
        />
        <button
          type="submit"
          disabled={!inputVal.trim()}
          className="ml-2 px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-black font-bold text-xs font-mono transition-colors cursor-pointer"
        >
          RUN
        </button>
      </form>
    </div>
  );
};
