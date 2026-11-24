import { Contact } from '../types/jarvis';

export function getJarvisApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  // When packaged inside Capacitor Android APK (https://localhost or capacitor://localhost without dev port 3000)
  const isCapacitorNative =
    protocol === 'capacitor:' ||
    (hostname === 'localhost' && port !== '3000');

  if (isCapacitorNative) {
    return 'https://ais-pre-p4jos3plr3cl67xao2hvll-109399473900.asia-northeast1.run.app';
  }
  return '';
}

export function parseCommandLocallyClient(
  command: string,
  customWakeWord: string = 'Jarvis',
  contacts: Contact[] = []
) {
  const lower = command.toLowerCase().trim();
  let intent = 'GENERAL_CONVERSATION';
  let targetContact = 'Mother';
  let phone = '+919876543210';
  let msg = command
    .replace(/^.*?(send message to|message to|text to|whatsapp to|whatsapp|message|text)\s+([a-zA-Z]+)?\s*[:,-]?\s*(that|saying)?\s*/i, '')
    .trim();

  if (msg.includes(':')) {
    const afterColon = msg.split(/:\s*/).slice(1).join(': ').trim();
    if (afterColon) msg = afterColon;
  } else if (msg.toLowerCase().startsWith('to ')) {
    msg = msg.replace(/^to\s+[a-zA-Z\s]+[:,-]?\s*/i, '').trim();
  }

  let vol = 75;
  let br = 80;
  let appId = 'whatsapp';

  if (
    lower.includes('whatsapp') ||
    lower.includes('message') ||
    lower.includes('text') ||
    lower.includes('bhej') ||
    lower.includes('sandesh')
  ) {
    intent = 'WHATSAPP_SEND';
    for (const c of contacts) {
      if (
        (c.relation && lower.includes(c.relation.toLowerCase())) ||
        (c.name && lower.includes(c.name.toLowerCase()))
      ) {
        targetContact = c.relation || c.name;
        phone = c.phone;
        break;
      }
    }
    if (!msg || msg === command || msg.length < 2) {
      msg = 'Hello, this is an automated message sent via Jarvis.';
    }
  } else if (
    lower.includes('volume') ||
    lower.includes('sound') ||
    lower.includes('aawaz') ||
    lower.includes('mute') ||
    lower.includes('audio')
  ) {
    intent = 'SYSTEM_VOLUME';
    if (lower.includes('mute')) vol = 0;
    else if (lower.includes('max') || lower.includes('full')) vol = 100;
    else if (lower.includes('half')) vol = 50;
    else {
      const m = command.match(/\d+/);
      vol = m ? Math.min(100, Math.max(0, parseInt(m[0], 10))) : 75;
    }
  } else if (
    lower.includes('bright') ||
    lower.includes('roshni') ||
    lower.includes('screen') ||
    lower.includes('display') ||
    lower.includes('dim')
  ) {
    intent = 'SYSTEM_BRIGHTNESS';
    if (lower.includes('dim') || lower.includes('night')) br = 30;
    else if (lower.includes('max') || lower.includes('full')) br = 100;
    else {
      const m = command.match(/\d+/);
      br = m ? Math.min(100, Math.max(10, parseInt(m[0], 10))) : 50;
    }
  } else if (
    lower.includes('terminal') ||
    lower.includes('cmd') ||
    lower.includes('bash') ||
    lower.includes('ping')
  ) {
    intent = 'SYSTEM_TERMINAL';
    appId = 'terminal';
  } else if (
    lower.includes('open') ||
    lower.includes('launch') ||
    lower.includes('kholo') ||
    lower.includes('start')
  ) {
    intent = 'LAUNCH_APP';
    if (lower.includes('spotify') || lower.includes('music')) appId = 'spotify';
    else if (lower.includes('terminal')) appId = 'terminal';
    else if (lower.includes('camera')) appId = 'camera';
    else if (lower.includes('calc')) appId = 'calculator';
    else if (lower.includes('code') || lower.includes('vs')) appId = 'vscode';
    else if (lower.includes('browser') || lower.includes('chrome')) appId = 'browser';
    else appId = 'whatsapp';
  } else if (
    lower.includes('status') ||
    lower.includes('diagnostic') ||
    lower.includes('battery')
  ) {
    intent = 'SYSTEM_DIAGNOSTIC';
  }

  let hindiVoiceReply = `जी सर, मैंने आपका निर्देश "${command}" पूरा कर दिया है।`;
  let englishActionSummary = `Offline/Local execution completed: "${command}"`;

  if (intent === 'WHATSAPP_SEND') {
    const honorific = targetContact === 'Mother' ? 'माताजी' : targetContact === 'Father' ? 'पिताजी' : targetContact;
    hindiVoiceReply = `जी सर, आपकी ${honorific} को व्हाट्सएप संदेश तैयार कर दिया गया है: "${msg}"।`;
    englishActionSummary = `WhatsApp message drafted and dispatched to ${targetContact} (${phone}): "${msg}"`;
  } else if (intent === 'SYSTEM_VOLUME') {
    hindiVoiceReply = vol === 0 ? 'जी सर, सिस्टम को म्यूट कर दिया गया है।' : `जी सर, सिस्टम वॉल्यूम ${vol}% पर सेट कर दिया गया है।`;
    englishActionSummary = vol === 0 ? 'Master audio muted.' : `Master audio volume set to ${vol}%.`;
  } else if (intent === 'SYSTEM_BRIGHTNESS') {
    hindiVoiceReply = `जी सर, डिस्प्ले ब्राइटनेस ${br}% पर एडजस्ट कर दी गई है।`;
    englishActionSummary = `Display luminance adjusted to ${br}%.`;
  } else if (intent === 'LAUNCH_APP') {
    hindiVoiceReply = `जी सर, ${appId.toUpperCase()} एप्लीकेशन खोला जा रहा है।`;
    englishActionSummary = `Target application (${appId.toUpperCase()}) launched.`;
  } else if (intent === 'SYSTEM_DIAGNOSTIC') {
    hindiVoiceReply = 'सिस्टम के सभी सब-सिस्टम सामान्य रूप से कार्य कर रहे हैं सर।';
    englishActionSummary = 'System telemetry nominal.';
  }

  return {
    intent,
    englishActionSummary,
    hindiVoiceReply,
    wakeWordDetected: lower.includes(customWakeWord.toLowerCase()),
    actionPayload: {
      target: targetContact,
      recipientPhone: phone,
      message: msg,
      volumeLevel: vol,
      brightnessLevel: br,
      appId,
    },
    quickFollowUps: ['Open WhatsApp Web', 'Run Diagnostics', 'Adjust Volume'],
  };
}
