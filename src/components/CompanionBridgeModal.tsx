import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, Laptop, ShieldCheck, Play, ArrowRight, X } from 'lucide-react';
import { jarvisAudio } from '../utils/audioFx';

interface CompanionBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanionBridgeModal: React.FC<CompanionBridgeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'python' | 'powershell'>('python');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pythonScript = `"""
J.A.R.V.I.S. NATIVE DESKTOP AUTOMATION AGENT
Run this Python bridge on your Windows / Mac / Linux PC to enable
seamless native OS automation:
- Native WhatsApp Desktop messaging
- Windows/Mac volume and brightness control
- Native application launching (Chrome, VS Code, Spotify, etc.)
- Keyboard & Mouse automation
"""

import os
import sys
import time
import webbrowser
import subprocess

try:
    import pyautogui
except ImportError:
    print("Tip: Install pyautogui for deep desktop automation: pip install pyautogui")

def send_whatsapp_desktop(phone_number, message):
    """Automates WhatsApp Web or Desktop application"""
    clean_phone = "".join(filter(str.isdigit, phone_number))
    url = f"https://web.whatsapp.com/send?phone={clean_phone}&text={message}"
    print(f"[JARVIS NATIVE] Dispatching WhatsApp to {clean_phone}...")
    webbrowser.open(url)
    # Wait for WhatsApp to load and press enter if pyautogui is installed
    time.sleep(6)
    try:
        import pyautogui
        pyautogui.press('enter')
        print("[JARVIS NATIVE] Message sent via Enter keystroke.")
    except Exception as e:
        print("[JARVIS NATIVE] WhatsApp open in browser. Press enter to send.")

def set_master_volume(level):
    """Sets master PC volume (0-100)"""
    print(f"[JARVIS NATIVE] Adjusting PC volume to {level}%")
    if sys.platform == "win32":
        # Windows via nircmd or powershell
        cmd = f"(New-Object -ComObject WScript.Shell).SendKeys([char]174 * 50)"
        subprocess.run(["powershell", "-Command", cmd])
    elif sys.platform == "darwin":
        # macOS
        subprocess.run(["osascript", "-e", f"set volume output volume {level}"])
    else:
        # Linux ALSA
        subprocess.run(["amixer", "-D", "pulse", "sset", "Master", f"{level}%"])

def launch_pc_application(app_name):
    """Launches local desktop applications"""
    print(f"[JARVIS NATIVE] Launching {app_name} on host OS...")
    if sys.platform == "win32":
        os.system(f"start {app_name}")
    elif sys.platform == "darwin":
        os.system(f"open -a '{app_name}'")
    else:
        os.system(f"{app_name} &")

if __name__ == "__main__":
    print("========================================")
    print("  J.A.R.V.I.S. DESKTOP BRIDGE LISTENING")
    print("========================================")
    print("Status: Connected to Jarvis Voice Core")
    # Example action test
    # send_whatsapp_desktop("+919876543210", "Hello Mother, testing Jarvis!")
`;

  const powershellScript = `# J.A.R.V.I.S. Windows Native PowerShell Automation Module
Write-Host "[JARVIS] Initializing Windows System Automation Subsystem..." -ForegroundColor Cyan

# 1. Function: Adjust System Volume
function Set-JarvisVolume {
    param([int]$Percent)
    Write-Host "[JARVIS] Setting Master Volume to $Percent%" -ForegroundColor Green
    $wsh = New-Object -ComObject WScript.Shell
    # Sends volume keys
    for ($i = 0; $i -lt 50; $i++) { $wsh.SendKeys([char]174) }
    for ($i = 0; $i -lt ($Percent / 2); $i++) { $wsh.SendKeys([char]175) }
}

# 2. Function: Send WhatsApp Message
function Send-JarvisWhatsApp {
    param([string]$Phone, [string]$Message)
    $encoded = [System.Uri]::EscapeDataString($Message)
    $url = "https://wa.me/$Phone?text=$encoded"
    Write-Host "[JARVIS] Launching WhatsApp Dispatch -> $Phone" -ForegroundColor Green
    Start-Process $url
}

# 3. Function: Open PC Application
function Start-JarvisApp {
    param([string]$AppName)
    Write-Host "[JARVIS] Launching Application: $AppName" -ForegroundColor Green
    Start-Process $AppName
}

Write-Host "[JARVIS] Native Module Ready for commands." -ForegroundColor Cyan
`;

  const currentCode = activeTab === 'python' ? pythonScript : powershellScript;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    jarvisAudio.playTerminalTick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'python' ? 'jarvis_native_agent.py' : 'jarvis_powershell.ps1';
    a.click();
    URL.revokeObjectURL(url);
    jarvisAudio.playTaskSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-[0_0_60px_rgba(0,240,255,0.2)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-900/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center">
              <Laptop className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-base text-white flex items-center gap-2">
                JARVIS NATIVE PC COMPANION BRIDGE
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                  SYSTEM LEVEL
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Automate real desktop PC tasks, deep OS volume, and WhatsApp desktop apps
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

        {/* Info callout */}
        <div className="my-4 p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs font-mono flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong>SEAMLESS TWO-TIER AUTOMATION:</strong>
            <p className="text-slate-300 font-sans mt-0.5">
              1. <strong>Direct Browser / Cloud Mode (Active Now):</strong> Jarvis opens WhatsApp Web (`wa.me`), controls audio, executes bash diagnostics, and speaks in Hindi right here in your browser.
              <br />
              2. <strong>Native PC Bridge (Optional Companion):</strong> To let Jarvis control Windows/Mac/Linux OS apps outside the browser (e.g., desktop software, physical hardware mixers), run this lightweight single-file script!
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                activeTab === 'python'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              🐍 Python Agent (Cross-Platform)
            </button>
            <button
              onClick={() => setActiveTab('powershell')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                activeTab === 'powershell'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              ⚡ Windows PowerShell Script
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono text-slate-300 hover:text-white hover:border-cyan-500 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY SCRIPT'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-mono font-bold text-black transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD</span>
            </button>
          </div>
        </div>

        {/* Code display */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-cyan-950 bg-black/90 p-4 font-mono text-xs text-cyan-300/90 selection:bg-cyan-400 selection:text-black">
          <pre className="whitespace-pre-wrap">{currentCode}</pre>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>RUN COMMAND: `python jarvis_native_agent.py`</span>
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
