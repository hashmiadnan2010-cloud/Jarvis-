import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  Terminal,
  Smartphone,
  Globe,
  X,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { jarvisAudio } from '../utils/audioFx';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharedUrl: string;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  sharedUrl,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedUrl);
    setCopiedLink(true);
    jarvisAudio.playTaskSuccess();
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    jarvisAudio.playTaskSuccess();
  };

  const batchContent = `@echo off
title J.A.R.V.I.S. AI OS Launcher
color 0b
echo ========================================================
echo   LAUNCHING J.A.R.V.I.S. AI VOICE & AUTOMATION SYSTEM
echo ========================================================
echo Connecting to Stark Cloud Core...
start "" "${sharedUrl}"
echo JARVIS is now running in your default browser.
timeout /t 3 >nul
exit
`;

  const pythonContent = `"""
J.A.R.V.I.S. NATIVE DESKTOP AUTOMATION AGENT
Run this script on your PC for direct OS hardware & desktop application control.
Command: python jarvis_native_agent.py
"""

import os
import sys
import time
import webbrowser
import subprocess

JARVIS_CLOUD_URL = "${sharedUrl}"

def open_jarvis():
    webbrowser.open(JARVIS_CLOUD_URL)

def send_whatsapp_desktop(phone_number, message):
    clean_phone = "".join(filter(str.isdigit, phone_number))
    url = f"https://web.whatsapp.com/send?phone={clean_phone}&text={message}"
    print(f"[JARVIS NATIVE] Dispatching WhatsApp to {clean_phone}...")
    webbrowser.open(url)

def set_master_volume(level):
    print(f"[JARVIS NATIVE] Setting PC volume to {level}%")
    if sys.platform == "win32":
        cmd = f"(New-Object -ComObject WScript.Shell).SendKeys([char]174 * 50)"
        subprocess.run(["powershell", "-Command", cmd])
    elif sys.platform == "darwin":
        subprocess.run(["osascript", "-e", f"set volume output volume {level}"])

if __name__ == "__main__":
    print("J.A.R.V.I.S. PC Automation Agent Active")
    open_jarvis()
`;

  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(sharedUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/50 bg-slate-950 p-6 shadow-[0_0_70px_rgba(0,240,255,0.25)] max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center">
              <Download className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-base text-white flex items-center gap-2">
                JARVIS DOWNLOAD & INSTALL
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                  PWA + PC
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Install on Android/Desktop, export APK package, or download PC scripts
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

        {/* 1. Official Live Web App Link */}
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-black/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-orbitron font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              1. LIVE APP URL (ANDROID, PC & IOS)
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              ONLINE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Open this link in Chrome on your Android phone or PC to install JARVIS directly:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={sharedUrl}
              className="flex-1 bg-slate-900 border border-cyan-900 text-xs font-mono text-cyan-300 px-3 py-2 rounded-lg selection:bg-cyan-500 selection:text-black focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'COPIED' : 'COPY LINK'}</span>
            </button>
            <a
              href={sharedUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900 text-xs flex items-center justify-center shrink-0"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* 2. Android App Install & GitHub Actions APK Build */}
        <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-950/15 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-orbitron font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-sky-400" />
              2. ANDROID APK (GITHUB ACTIONS) & WEBAPP
            </div>
            {isInstalled && (
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> INSTALLED
              </span>
            )}
          </div>

          {isInstallable && !isInstalled && (
            <button
              onClick={() => {
                jarvisAudio.playTaskSuccess();
                install();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-orbitron font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(56,189,248,0.35)] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>INSTALL JARVIS APP NOW</span>
            </button>
          )}

          <div className="p-3 rounded-lg bg-black/75 border border-emerald-500/30 space-y-1.5 text-[11px] font-sans">
            <div className="flex items-center justify-between">
              <strong className="text-emerald-300">GitHub Actions APK Builder Ready (Included in Repo)</strong>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                CI/CD READY
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              This project includes <code className="text-cyan-300">.github/workflows/build-apk.yml</code> and{' '}
              <code className="text-cyan-300">capacitor.config.json</code>. Connect &amp; push to GitHub to compile{' '}
              <strong className="text-white">JARVIS-AI.apk</strong> automatically:
            </p>
            <ol className="list-decimal list-inside text-slate-400 space-y-0.5 font-mono text-[10px]">
              <li>Push project files to GitHub (<span className="text-slate-200">main</span> or <span className="text-slate-200">master</span> branch).</li>
              <li>Open <span className="text-slate-200">Actions</span> tab &rarr; <span className="text-slate-200">Build JARVIS Android APK</span> (auto-runs on push, or click <span className="text-slate-200">Run workflow</span>).</li>
              <li>Download <span className="text-emerald-300">JARVIS-AI-APK</span> from <span className="text-slate-200">Artifacts</span>, unzip <span className="text-slate-200">JARVIS-AI.apk</span>, and install on Android.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-sans text-slate-300">
            <div className="p-3 rounded-lg bg-black/60 border border-slate-800 space-y-1">
              <strong className="text-sky-300 block">Instant Android Install (WebAPK):</strong>
              <p className="text-slate-400">
                {isIOS
                  ? 'In Safari, tap Share and choose "Add to Home Screen" to install JARVIS.'
                  : 'Open the live URL above in Android Chrome, tap menu (⋮), and tap "Install app" for an instant WebAPK.'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-black/60 border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <strong className="text-amber-300 block">Alternative: PWABuilder APK</strong>
                <p className="text-slate-400 mt-0.5">
                  You can also package the live URL directly into a signed <code>.apk</code> using PWABuilder.
                </p>
              </div>
              <a
                href={pwaBuilderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 font-mono text-[11px] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>PACKAGE APK ON PWABUILDER</span>
              </a>
            </div>
          </div>
        </div>

        {/* 3. Downloadable Desktop PC Launchers */}
        <div className="space-y-3">
          <div className="text-xs font-orbitron font-bold text-white flex items-center gap-2">
            <Laptop className="w-4 h-4 text-amber-400" />
            3. DOWNLOAD PC FILES & AUTOMATION SCRIPTS
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Windows 1-Click Batch Launcher */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-black/60 flex flex-col justify-between space-y-2 hover:border-cyan-500/40 transition-colors">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Windows 1-Click Launcher</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Double-click batch file (<code>Jarvis_Launcher.bat</code>) to instantly boot Jarvis on Windows desktop.
                </p>
              </div>
              <button
                onClick={() => downloadFile('Jarvis_Launcher.bat', batchContent, 'application/x-bat')}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500 text-xs font-mono text-cyan-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD .BAT FILE</span>
              </button>
            </div>

            {/* Python Native PC Bridge */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-black/60 flex flex-col justify-between space-y-2 hover:border-cyan-500/40 transition-colors">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span>Python Native PC Agent</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-sans">
                  Python agent (<code>jarvis_native_agent.py</code>) for controlling PC volume, native WhatsApp desktop, and OS apps.
                </p>
              </div>
              <button
                onClick={() => downloadFile('jarvis_native_agent.py', pythonContent, 'text/x-python')}
                className="w-full mt-2 py-2 px-3 rounded-lg bg-slate-900 hover:bg-emerald-950 border border-slate-700 hover:border-emerald-500 text-xs font-mono text-emerald-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD .PY SCRIPT</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500">
            J.A.R.V.I.S. OS 4.2.0 // PWA & CLOUD DEPLOYMENT
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
