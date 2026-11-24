import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { jarvisAudio } from '../utils/audioFx';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={() => {
          jarvisAudio.playTaskSuccess();
          install();
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-400/70 bg-sky-950/70 hover:bg-sky-900/80 text-sky-200 text-xs font-orbitron font-bold transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] cursor-pointer"
        title="Install JARVIS as an App on Android / Desktop"
      >
        <Download className="w-3.5 h-3.5 text-sky-300" />
        <span className="hidden sm:inline">INSTALL APP</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => {
            jarvisAudio.playTerminalTick();
            setShowIOSGuide(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-400/50 bg-sky-950/50 text-sky-200 text-xs font-mono hover:bg-sky-900/70 transition-colors cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>INSTALL iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-sm rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)] space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3">
                <h3 className="font-orbitron font-bold text-sm text-white">INSTALL ON iPHONE / iPAD</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                1. Tap the <strong>Share</strong> button in your Safari toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.<br />
                3. Tap <strong>Add</strong> to launch JARVIS as a standalone app.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-cyan-500 hover:bg-cyan-400 py-2 text-xs font-orbitron font-bold text-black transition-colors"
              >
                GOT IT
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
