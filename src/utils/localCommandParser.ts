import { Contact, PersonalityMode } from '../types/jarvis';

export function getJarvisApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  const isCapacitorNative =
    protocol === 'capacitor:' ||
    (hostname === 'localhost' && port !== '3000');

  if (isCapacitorNative) {
    return 'https://ais-pre-p4jos3plr3cl67xao2hvll-109399473900.asia-northeast1.run.app';
  }
  return '';
}

function matchContactClient(lower: string, contacts: Contact[] = []) {
  const isMotherAlias = /\b(mom|mama|mummy|mata|mataji|mother|maa)\b|माँ|मम्मी|माता/.test(lower);
  const isFatherAlias = /\b(dad|daddy|papa|pita|pitaji|father|pa)\b|पापा|पिता/.test(lower);

  for (const c of contacts) {
    const rel = String(c.relation || '').toLowerCase();
    const name = String(c.name || '').toLowerCase();
    if (
      (rel && lower.includes(rel)) ||
      (name && lower.includes(name)) ||
      (isMotherAlias && rel === 'mother') ||
      (isFatherAlias && rel === 'father')
    ) {
      return {
        targetContact: c.relation && c.relation !== c.name ? `${c.relation} (${c.name})` : c.name || c.relation,
        shortName: c.relation || c.name,
        phone: String(c.phone || '+919876543210'),
      };
    }
  }

  for (const c of contacts) {
    const firstName = String(c.name || '').toLowerCase().split(/\s+/)[0];
    if (firstName && firstName.length >= 3 && lower.includes(firstName)) {
      return {
        targetContact: c.name,
        shortName: c.name,
        phone: String(c.phone || '+919876543210'),
      };
    }
  }

  if (isMotherAlias) return { targetContact: 'Mother', shortName: 'Mother', phone: '+919876543210' };
  if (isFatherAlias) return { targetContact: 'Father', shortName: 'Father', phone: '+919811122233' };
  if (lower.includes('boss')) return { targetContact: 'Boss', shortName: 'Boss', phone: '+14155550199' };
  if (lower.includes('priya')) return { targetContact: 'Priya Sharma', shortName: 'Priya', phone: '+919822233445' };

  return null;
}

const LANGUAGE_MAP: Array<{ names: string[]; label: string; code: string }> = [
  { names: ['english', 'inglish', 'angrezi', 'अंग्रेजी', 'अंग्रेज़ी'], label: 'English', code: 'en-US' },
  { names: ['hindi', 'हिंदी', 'हिन्दी'], label: 'Hindi', code: 'hi-IN' },
  { names: ['hinglish'], label: 'Hinglish', code: 'hi-IN' },
  { names: ['spanish', 'espanol', 'español'], label: 'Spanish', code: 'es-ES' },
  { names: ['french', 'francais', 'français'], label: 'French', code: 'fr-FR' },
  { names: ['german', 'deutsch'], label: 'German', code: 'de-DE' },
  { names: ['japanese', 'nihongo'], label: 'Japanese', code: 'ja-JP' },
  { names: ['korean'], label: 'Korean', code: 'ko-KR' },
  { names: ['arabic'], label: 'Arabic', code: 'ar-SA' },
  { names: ['marathi', 'मराठी'], label: 'Marathi', code: 'mr-IN' },
  { names: ['tamil', 'தமிழ்'], label: 'Tamil', code: 'ta-IN' },
  { names: ['telugu', 'తెలుగు'], label: 'Telugu', code: 'te-IN' },
  { names: ['bengali', 'bangla', 'বাংলা'], label: 'Bengali', code: 'bn-IN' },
  { names: ['punjabi', 'ਪੰਜਾਬੀ'], label: 'Punjabi', code: 'pa-IN' },
  { names: ['gujarati', 'ગુજરાતી'], label: 'Gujarati', code: 'gu-IN' },
  { names: ['kannada', 'ಕನ್ನಡ'], label: 'Kannada', code: 'kn-IN' },
  { names: ['malayalam', 'മലയാളം'], label: 'Malayalam', code: 'ml-IN' },
  { names: ['urdu', 'اردو'], label: 'Urdu', code: 'ur-PK' },
  { names: ['portuguese', 'português'], label: 'Portuguese', code: 'pt-BR' },
  { names: ['italian', 'italiano'], label: 'Italian', code: 'it-IT' },
  { names: ['russian', 'русский'], label: 'Russian', code: 'ru-RU' },
  { names: ['chinese', 'mandarin', '中文'], label: 'Chinese', code: 'zh-CN' },
];

function detectLanguageSwitchClient(command: string): { label: string; code: string } | null {
  const lower = command.toLowerCase().trim();
  const hasSwitchCue =
    /\b(turn|switch|change|convert|speak|talk|reply|respond|use|back|translate)\b/.test(lower) ||
    /(mein baat|me baat|mein bolo|me bolo|bhasha|language|mein jawab|me jawab|बोलो|बात करो|भाषा)/.test(lower);

  if (!hasSwitchCue) return null;

  for (const entry of LANGUAGE_MAP) {
    for (const name of entry.names) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(^|\\s|\\b)${escaped}($|\\s|\\b)`, 'i').test(lower) || lower.includes(name)) {
        return { label: entry.label, code: entry.code };
      }
    }
  }
  return null;
}

export function parseCommandLocallyClient(
  command: string,
  customWakeWord: string = 'Jarvis',
  contacts: Contact[] = [],
  personalityMode: PersonalityMode = 'balanced',
  activeLanguage: string = 'English',
  activeLanguageCode: string = 'en-US'
) {
  const lower = command.toLowerCase().trim();
  const isFriendTone = personalityMode === 'friend';
  const isHindiMode =
    activeLanguage.toLowerCase() === 'hindi' ||
    activeLanguage.toLowerCase() === 'hinglish' ||
    activeLanguageCode.toLowerCase().startsWith('hi');

  const switchedLang = detectLanguageSwitchClient(command);
  if (switchedLang) {
    let reply = `Yes sir, language switched to ${switchedLang.label}.`;
    if (switchedLang.label === 'Hindi' || switchedLang.label === 'Hinglish') {
      reply = isFriendTone ? 'अरे बिल्कुल दोस्त! अब से मैं हिंदी में बात करूँगा।' : 'जी सर, अब मैं हिंदी में बात करूँगा।';
    } else if (switchedLang.label === 'English') {
      reply = isFriendTone ? 'Got it buddy! Switched back to English.' : 'Yes sir, I have switched back to English.';
    }
    return {
      intent: 'SET_LANGUAGE',
      englishActionSummary: `Language switched to ${switchedLang.label} (${switchedLang.code}).`,
      hindiVoiceReply: reply,
      wakeWordDetected: lower.includes(customWakeWord.toLowerCase()),
      actionPayload: {
        target: switchedLang.label,
        targetLanguage: switchedLang.label,
        targetLanguageCode: switchedLang.code,
      },
      quickFollowUps:
        switchedLang.label === 'English'
          ? ['Open Spotify', 'Turn to Hindi', 'Call Mother']
          : ['Open Spotify', 'Turn back to English', 'Call Mother'],
    };
  }

  let intent = 'GENERAL_CONVERSATION';
  let targetContact = 'Mother';
  let shortContact = 'Mother';
  let phone = '+919876543210';
  let msg = command
    .replace(/^.*?(send message to|message to|text to|whatsapp to|whatsapp|message|text)\s+(my\s+)?([a-zA-Z]+)?\s*[:,-]?\s*(that|saying|ki)?\s*/i, '')
    .trim();

  if (msg.includes(':')) {
    const afterColon = msg.split(/:\s*/).slice(1).join(': ').trim();
    if (afterColon) msg = afterColon;
  } else if (msg.toLowerCase().startsWith('to ')) {
    msg = msg.replace(/^to\s+(my\s+)?[a-zA-Z\s]+[:,-]?\s*/i, '').trim();
  }

  const matched = matchContactClient(lower, contacts);
  if (matched) {
    targetContact = matched.targetContact;
    shortContact = matched.shortName;
    phone = matched.phone;
  } else {
    const digitsMatch = command.match(/(\+?\d[\d\s-]{6,14}\d)/);
    if (digitsMatch) {
      phone = digitsMatch[1].replace(/[^\d+]/g, '');
      targetContact = phone;
      shortContact = phone;
    }
  }

  let vol = 75;
  let br = 80;
  let appId = 'whatsapp';
  let appLabel = 'WhatsApp';

  if (
    (/\b(call|dial|ring|phone)\b/.test(lower) || lower.includes('call lagao') || lower.includes('phone karo')) &&
    !lower.includes('whatsapp') &&
    !lower.includes('message')
  ) {
    intent = 'CALL_CONTACT';
  } else if (
    (lower.includes('whatsapp') && (lower.includes('message') || lower.includes('send') || lower.includes('text') || lower.includes('bhej') || matched)) ||
    lower.includes('message') ||
    lower.includes('text') ||
    lower.includes('bhej') ||
    lower.includes('sandesh')
  ) {
    intent = 'WHATSAPP_SEND';
    if (!msg || msg === command || msg.length < 2) {
      msg = 'Hello, this is a message sent via Jarvis.';
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
    appLabel = 'Terminal';
  } else if (
    lower.includes('open') ||
    lower.includes('launch') ||
    lower.includes('kholo') ||
    lower.includes('start') ||
    lower.includes('chalu')
  ) {
    intent = 'LAUNCH_APP';
    if (lower.includes('youtube') || lower.includes('yt')) {
      appId = 'youtube';
      appLabel = 'YouTube';
    } else if (lower.includes('spotify') || lower.includes('music') || lower.includes('gana')) {
      appId = 'spotify';
      appLabel = 'Spotify';
    } else if (lower.includes('whatsapp')) {
      appId = 'whatsapp';
      appLabel = 'WhatsApp';
    } else if (lower.includes('instagram') || lower.includes('insta')) {
      appId = 'instagram';
      appLabel = 'Instagram';
    } else if (lower.includes('telegram')) {
      appId = 'telegram';
      appLabel = 'Telegram';
    } else if (lower.includes('map')) {
      appId = 'maps';
      appLabel = 'Google Maps';
    } else if (lower.includes('terminal')) {
      appId = 'terminal';
      appLabel = 'Terminal';
    } else if (lower.includes('camera')) {
      appId = 'camera';
      appLabel = 'Camera';
    } else if (lower.includes('calc')) {
      appId = 'calculator';
      appLabel = 'Calculator';
    } else if (lower.includes('code') || lower.includes('vs')) {
      appId = 'vscode';
      appLabel = 'VS Code';
    } else if (lower.includes('setting')) {
      appId = 'settings';
      appLabel = 'Settings';
    } else if (lower.includes('browser') || lower.includes('chrome') || lower.includes('google')) {
      appId = 'browser';
      appLabel = 'Chrome';
    } else {
      appId = 'whatsapp';
      appLabel = 'WhatsApp';
    }
  } else if (
    lower.includes('status') ||
    lower.includes('diagnostic') ||
    lower.includes('battery')
  ) {
    intent = 'SYSTEM_DIAGNOSTIC';
  }

  let hindiVoiceReply = '';
  let englishActionSummary = '';

  if (intent === 'CALL_CONTACT') {
    const hindiHonorific = shortContact === 'Mother' ? 'माताजी' : shortContact === 'Father' ? 'पिताजी' : targetContact;
    englishActionSummary = isFriendTone
      ? `Sure buddy, calling ${targetContact} right now!`
      : `Yes sir, placing a call to ${targetContact}.`;
    hindiVoiceReply = isHindiMode
      ? isFriendTone
        ? `अरे बिल्कुल भाई, ${hindiHonorific} को अभी कॉल लगा रहा हूँ।`
        : `जी सर, ${hindiHonorific} को कॉल लगा रहा हूँ।`
      : englishActionSummary;
  } else if (intent === 'WHATSAPP_SEND') {
    const hindiHonorific = shortContact === 'Mother' ? 'माताजी' : shortContact === 'Father' ? 'पिताजी' : targetContact;
    englishActionSummary = isFriendTone
      ? `Done! Opening WhatsApp message for ${targetContact}: "${msg}".`
      : `Yes sir, opening WhatsApp to send your message to ${targetContact}: "${msg}".`;
    hindiVoiceReply = isHindiMode
      ? isFriendTone
        ? `हो गया दोस्त! ${hindiHonorific} के लिए व्हाट्सएप मैसेज खोल दिया है: "${msg}"।`
        : `जी सर, ${hindiHonorific} को व्हाट्सएप संदेश भेजने के लिए खोल दिया गया है: "${msg}"।`
      : englishActionSummary;
  } else if (intent === 'SYSTEM_VOLUME') {
    englishActionSummary = vol === 0 ? 'Yes sir, master audio muted.' : `Yes sir, master audio volume set to ${vol}%.`;
    hindiVoiceReply = isHindiMode
      ? vol === 0
        ? 'जी सर, सिस्टम को म्यूट कर दिया गया है।'
        : `जी सर, सिस्टम वॉल्यूम ${vol}% पर सेट कर दिया गया है।`
      : englishActionSummary;
  } else if (intent === 'SYSTEM_BRIGHTNESS') {
    englishActionSummary = `Yes sir, display brightness adjusted to ${br}%.`;
    hindiVoiceReply = isHindiMode ? `जी सर, डिस्प्ले ब्राइटनेस ${br}% पर एडजस्ट कर दी गई है।` : englishActionSummary;
  } else if (intent === 'LAUNCH_APP') {
    englishActionSummary = isFriendTone
      ? `Sure buddy, opening ${appLabel} app right now!`
      : `Yes sir, ${appLabel} app is opening.`;
    hindiVoiceReply = isHindiMode
      ? isFriendTone
        ? `हां दोस्त, ${appLabel} ऐप अभी खोल रहा हूँ!`
        : `जी सर, ${appLabel} ऐप खुल रहा है।`
      : englishActionSummary;
  } else if (intent === 'SYSTEM_DIAGNOSTIC') {
    englishActionSummary = 'All systems are online and nominal, sir.';
    hindiVoiceReply = isHindiMode ? 'सिस्टम के सभी सब-सिस्टम सामान्य रूप से कार्य कर रहे हैं सर।' : englishActionSummary;
  } else {
    const mathMatch = lower.match(/(\d+(?:\.\d+)?)\s*([+\-*/x×÷])\s*(\d+(?:\.\d+)?)/);
    if (mathMatch) {
      const a = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const b = parseFloat(mathMatch[3]);
      let res = 0;
      if (op === '+') res = a + b;
      else if (op === '-') res = a - b;
      else if (op === '*' || op === 'x' || op === '×') res = a * b;
      else if ((op === '/' || op === '÷') && b !== 0) res = Number((a / b).toFixed(4));
      englishActionSummary = `Yes sir, ${a} ${op} ${b} equals ${res}.`;
      hindiVoiceReply = isHindiMode ? `जी सर, ${a} और ${b} का उत्तर ${res} है।` : englishActionSummary;
    } else if (lower.includes('joke') || lower.includes('funny')) {
      englishActionSummary =
        'Alright buddy, here is one: Why did the computer go to the doctor? Because it caught a byte and needed its cache cleared!';
      hindiVoiceReply = isHindiMode
        ? 'अरे दोस्त सुन एक मज़ेदार बात: एक कंप्यूटर ने दूसरे कंप्यूटर से कहा, मेरी मेमोरी बहुत तेज़ है... दूसरा बोला, भाई पहले अपना कैशे तो साफ़ कर ले!'
        : englishActionSummary;
    } else if (lower.includes('friend') || lower.includes('dost') || lower.includes('bhai') || lower.includes('yaar')) {
      englishActionSummary = "Always here for you, buddy! I'm both your AI assistant and your loyal friend.";
      hindiVoiceReply = isHindiMode
        ? 'अरे बिल्कुल यार! मैं सिर्फ़ तुम्हारा असिस्टेंट नहीं, तुम्हारा पक्का दोस्त भी हूँ। बताओ क्या मदद करूँ?'
        : englishActionSummary;
    } else if (lower.includes('haal') || lower.includes('kaise ho') || lower.includes('how are you')) {
      englishActionSummary = "Doing great, friend! Systems charged and ready. What's the plan today?";
      hindiVoiceReply = isHindiMode
        ? 'एकदम बढ़िया दोस्त! आपकी सेवा के लिए तैयार हूँ। आप बताइए, आज क्या प्लान है?'
        : englishActionSummary;
    } else {
      englishActionSummary = isFriendTone
        ? `Hey buddy, I heard "${command}"! Offline local mode is active right now—full answers resume when online.`
        : `Yes sir, I processed "${command}".`;
      hindiVoiceReply = isHindiMode
        ? isFriendTone
          ? `अरे दोस्त, आपका सवाल "${command}" बढ़िया है! अभी ऑफलाइन लोकल मोड चालू है—इंटरनेट जुड़ते ही पूरा जवाब मिल जाएगा।`
          : `जी सर, मैंने आपका निर्देश "${command}" प्रोसेस कर लिया है।`
        : englishActionSummary;
    }
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
    quickFollowUps: ['Open YouTube', 'Open Spotify', 'Turn to Hindi'],
  };
}
