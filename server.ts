import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Enable CORS on /api routes so the Android Capacitor APK can reach the backend
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Initialize Gemini SDK with User-Agent header as required
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Cooldown tracker for free-tier rate limits
let geminiCooldownUntil = 0;

function matchContactFromCommand(lower: string, contacts: any[] = []) {
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

  // Fallback check on first names
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
  { names: ['spanish', 'espanol', 'español', 'स्पेनिश'], label: 'Spanish', code: 'es-ES' },
  { names: ['french', 'francais', 'français', 'फ्रेंच'], label: 'French', code: 'fr-FR' },
  { names: ['german', 'deutsch', 'जर्मन'], label: 'German', code: 'de-DE' },
  { names: ['japanese', 'nihongo', 'जापानी'], label: 'Japanese', code: 'ja-JP' },
  { names: ['korean', 'कोरियाई'], label: 'Korean', code: 'ko-KR' },
  { names: ['arabic', 'अरबी'], label: 'Arabic', code: 'ar-SA' },
  { names: ['marathi', 'मराठी'], label: 'Marathi', code: 'mr-IN' },
  { names: ['tamil', 'தமிழ்', 'तमिल'], label: 'Tamil', code: 'ta-IN' },
  { names: ['telugu', 'తెలుగు', 'तेलुगु'], label: 'Telugu', code: 'te-IN' },
  { names: ['bengali', 'bangla', 'বাংলা', 'बंगाली'], label: 'Bengali', code: 'bn-IN' },
  { names: ['punjabi', 'ਪੰਜਾਬੀ', 'पंजाबी'], label: 'Punjabi', code: 'pa-IN' },
  { names: ['gujarati', 'ગુજરાતી', 'गुजराती'], label: 'Gujarati', code: 'gu-IN' },
  { names: ['kannada', 'ಕನ್ನಡ', 'कन्नड़'], label: 'Kannada', code: 'kn-IN' },
  { names: ['malayalam', 'മലയാളം', 'मलयालम'], label: 'Malayalam', code: 'ml-IN' },
  { names: ['urdu', 'اردو', 'उर्दू'], label: 'Urdu', code: 'ur-PK' },
  { names: ['portuguese', 'português'], label: 'Portuguese', code: 'pt-BR' },
  { names: ['italian', 'italiano'], label: 'Italian', code: 'it-IT' },
  { names: ['russian', 'русский'], label: 'Russian', code: 'ru-RU' },
  { names: ['chinese', 'mandarin', '中文'], label: 'Chinese', code: 'zh-CN' },
];

function getLanguageSwitchReply(label: string, isFriendTone: boolean): string {
  switch (label) {
    case 'Hindi':
    case 'Hinglish':
      return isFriendTone
        ? 'अरे बिल्कुल दोस्त! अब से मैं हिंदी में बात करूँगा।'
        : 'जी सर, अब मैं हिंदी में बात करूँगा।';
    case 'English':
      return isFriendTone
        ? 'Got it buddy! Switched back to English.'
        : 'Yes sir, I have switched back to English.';
    case 'Spanish':
      return 'Sí señor, ahora hablaré en español.';
    case 'French':
      return 'Oui monsieur, je vais maintenant parler en français.';
    case 'German':
      return 'Ja Sir, ich spreche jetzt auf Deutsch.';
    case 'Japanese':
      return 'はい、これからは日本語でお話しします。';
    case 'Marathi':
      return 'होय सर, आता मी मराठीत बोलेन.';
    case 'Arabic':
      return 'نعم سيدي، سأتحدث باللغة العربية الآن.';
    default:
      return `Yes sir, language switched to ${label}.`;
  }
}

function detectLanguageSwitch(command: string): { label: string; code: string } | null {
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

// High-speed, robust local NLP parser for Jarvis system automation
function parseCommandLocally(
  command: string,
  customWakeWord: string = 'Jarvis',
  contacts: any[] = [],
  personalityMode: string = 'balanced',
  activeLanguage: string = 'English',
  activeLanguageCode: string = 'en-US'
) {
  const lower = command.toLowerCase().trim();
  const isFriendTone = personalityMode === 'friend';
  const isHindiMode =
    activeLanguage.toLowerCase() === 'hindi' ||
    activeLanguage.toLowerCase() === 'hinglish' ||
    activeLanguageCode.toLowerCase().startsWith('hi');

  // 0. Language Switch Intent (Explicitly requested by user)
  const switchedLang = detectLanguageSwitch(command);
  if (switchedLang) {
    const reply = getLanguageSwitchReply(switchedLang.label, isFriendTone);
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
  let vol = 75;
  let br = 80;
  let appId = 'whatsapp';
  let appLabel = 'WhatsApp';

  const matched = matchContactFromCommand(lower, contacts);
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

  // 1. Phone Call Intent
  if (
    (/\b(call|dial|ring|phone)\b/.test(lower) || lower.includes('call lagao') || lower.includes('phone karo') || lower.includes('kalo')) &&
    !lower.includes('whatsapp') &&
    !lower.includes('message')
  ) {
    intent = 'CALL_CONTACT';
  }
  // 2. WhatsApp Intent
  else if (
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
  }
  // 3. Volume Intent
  else if (
    lower.includes('volume') ||
    lower.includes('sound') ||
    lower.includes('aawaz') ||
    lower.includes('mute') ||
    lower.includes('audio')
  ) {
    intent = 'SYSTEM_VOLUME';
    if (lower.includes('mute')) {
      vol = 0;
    } else if (lower.includes('max') || lower.includes('full')) {
      vol = 100;
    } else if (lower.includes('half')) {
      vol = 50;
    } else {
      const volMatch = command.match(/\d+/);
      vol = volMatch ? Math.min(100, Math.max(0, parseInt(volMatch[0], 10))) : 75;
    }
  }
  // 4. Brightness Intent
  else if (
    lower.includes('bright') ||
    lower.includes('roshni') ||
    lower.includes('screen') ||
    lower.includes('display') ||
    lower.includes('dim')
  ) {
    intent = 'SYSTEM_BRIGHTNESS';
    if (lower.includes('dim') || lower.includes('night') || lower.includes('kam')) {
      br = 30;
    } else if (lower.includes('max') || lower.includes('full')) {
      br = 100;
    } else {
      const brMatch = command.match(/\d+/);
      br = brMatch ? Math.min(100, Math.max(10, parseInt(brMatch[0], 10))) : 50;
    }
  }
  // 5. Terminal / Command Intent
  else if (
    lower.includes('terminal') ||
    lower.includes('cmd') ||
    lower.includes('bash') ||
    lower.includes('ping') ||
    lower.includes('script')
  ) {
    intent = 'SYSTEM_TERMINAL';
    appId = 'terminal';
    appLabel = 'Terminal';
  }
  // 6. App Launch Intent (Phone / Desktop apps outside Jarvis)
  else if (
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
  }
  // 7. Diagnostics
  else if (
    lower.includes('status') ||
    lower.includes('diagnostic') ||
    lower.includes('cpu') ||
    lower.includes('battery')
  ) {
    intent = 'SYSTEM_DIAGNOSTIC';
  }

  let spokenText = '';
  let englishText = '';

  if (intent === 'CALL_CONTACT') {
    const hindiHonorific = shortContact === 'Mother' ? 'माताजी' : shortContact === 'Father' ? 'पिताजी' : targetContact;
    englishText = isFriendTone
      ? `Sure buddy, calling ${targetContact} right now!`
      : `Yes sir, placing a call to ${targetContact}.`;
    spokenText = isHindiMode
      ? isFriendTone
        ? `अरे बिल्कुल भाई, ${hindiHonorific} को अभी कॉल लगा रहा हूँ।`
        : `जी सर, ${hindiHonorific} को कॉल लगा रहा हूँ।`
      : englishText;
  } else if (intent === 'WHATSAPP_SEND') {
    const hindiHonorific = shortContact === 'Mother' ? 'माताजी' : shortContact === 'Father' ? 'पिताजी' : targetContact;
    englishText = isFriendTone
      ? `Done! Opening WhatsApp message for ${targetContact}: "${msg}".`
      : `Yes sir, opening WhatsApp to send your message to ${targetContact}: "${msg}".`;
    spokenText = isHindiMode
      ? isFriendTone
        ? `हो गया दोस्त! ${hindiHonorific} के लिए व्हाट्सएप मैसेज खोल दिया है: "${msg}"।`
        : `जी सर, ${hindiHonorific} को व्हाट्सएप पर संदेश भेजने के लिए खोल दिया गया है: "${msg}"।`
      : englishText;
  } else if (intent === 'SYSTEM_VOLUME') {
    englishText = vol === 0 ? 'Yes sir, master audio output muted.' : `Yes sir, system volume set to ${vol}%.`;
    spokenText = isHindiMode
      ? vol === 0
        ? 'जी सर, सिस्टम को म्यूट कर दिया गया है।'
        : `जी सर, सिस्टम वॉल्यूम ${vol}% पर सेट कर दिया गया है।`
      : englishText;
  } else if (intent === 'SYSTEM_BRIGHTNESS') {
    englishText = `Yes sir, display brightness adjusted to ${br}%.`;
    spokenText = isHindiMode ? `जी सर, डिस्प्ले ब्राइटनेस ${br}% पर एडजस्ट कर दी गई है।` : englishText;
  } else if (intent === 'LAUNCH_APP') {
    englishText = isFriendTone
      ? `Sure buddy, opening ${appLabel} app right now!`
      : `Yes sir, ${appLabel} app is opening.`;
    spokenText = isHindiMode
      ? isFriendTone
        ? `हां दोस्त, ${appLabel} ऐप अभी खोल रहा हूँ!`
        : `जी सर, ${appLabel} ऐप खुल रहा है।`
      : englishText;
  } else if (intent === 'SYSTEM_TERMINAL') {
    englishText = 'Yes sir, automation bash command executed in terminal.';
    spokenText = isHindiMode ? 'जी सर, टर्मिनल में ऑटोमेशन कमांड निष्पादित कर दी गई है।' : englishText;
  } else if (intent === 'SYSTEM_DIAGNOSTIC') {
    englishText = 'All systems are online and nominal, sir. CPU 24%, Memory 38%, Network 18ms.';
    spokenText = isHindiMode ? 'सिस्टम के सभी सब-सिस्टम सामान्य रूप से कार्य कर रहे हैं सर।' : englishText;
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
      englishText = `Yes sir, ${a} ${op} ${b} equals ${res}.`;
      spokenText = isHindiMode ? `जी सर, ${a} और ${b} का उत्तर ${res} है।` : englishText;
    } else if (lower.includes('joke') || lower.includes('funny') || lower.includes('chutkula') || lower.includes('hasao')) {
      englishText =
        'Alright buddy, here is one: Why did the computer go to the doctor? Because it caught a byte and needed its cache cleared!';
      spokenText = isHindiMode
        ? 'अरे दोस्त सुन एक मज़ेदार बात: एक कंप्यूटर ने दूसरे कंप्यूटर से कहा, मेरी मेमोरी बहुत तेज़ है... दूसरा बोला, भाई पहले अपना कैशे तो साफ़ कर ले!'
        : englishText;
    } else if (lower.includes('friend') || lower.includes('dost') || lower.includes('bhai') || lower.includes('bro') || lower.includes('yaar')) {
      englishText =
        "Always here for you, buddy! I'm not just your AI assistant, I'm your loyal friend too. Tell me what's on your mind!";
      spokenText = isHindiMode
        ? 'अरे बिल्कुल यार! मैं सिर्फ़ तुम्हारा असिस्टेंट नहीं, तुम्हारा पक्का दोस्त भी हूँ। बताओ क्या बात करनी है या कौन-सा काम करना है?'
        : englishText;
    } else if (lower.includes('kaun ho') || lower.includes('who are you') || lower.includes('intro') || lower.includes('kya ho')) {
      englishText =
        'I am J.A.R.V.I.S., your personal AI assistant and friend. I can open phone apps like Spotify and WhatsApp, call contacts, send messages, run in the background, and answer all your questions.';
      spokenText = isHindiMode
        ? 'जी सर, मैं जार्विस हूँ—आपका पर्सनल एआई असिस्टेंट और दोस्त, जो कॉल करने, व्हाट्सएप मैसेज भेजने, ऐप्स खोलने और हर सवाल का जवाब देने के लिए हमेशा तैयार है।'
        : englishText;
    } else if (lower.includes('tony stark') || lower.includes('iron man') || lower.includes('ironman')) {
      englishText = 'Tony Stark is the genius engineer and Avenger who built me, sir.';
      spokenText = isHindiMode
        ? 'जी सर, टोनी स्टार्क एक प्रतिभाशाली इंजीनियर और एवेंजर हैं, जिन्होंने मुझे विकसित किया।'
        : englishText;
    } else if (lower.includes('time') || lower.includes('samay') || lower.includes('baje') || lower.includes('baja')) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      englishText = `Yes sir, the current time is ${nowStr}.`;
      spokenText = isHindiMode ? `जी सर, अभी समय ${nowStr} हुआ है।` : englishText;
    } else if (lower.includes('date') || lower.includes('tarikh') || lower.includes('taarikh') || lower.includes('today')) {
      const dateStrEn = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const dateStrHi = new Date().toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      englishText = `Yes sir, today is ${dateStrEn}.`;
      spokenText = isHindiMode ? `जी सर, आज ${dateStrHi} है।` : englishText;
    } else if (lower.includes('haal') || lower.includes('kaise ho') || lower.includes('how are you') || lower.includes('kya hal')) {
      englishText = "Doing awesome, friend! Fully charged and ready to help you out. What's the plan today?";
      spokenText = isHindiMode
        ? 'एकदम बढ़िया दोस्त! पूरा चार्ज होकर आपकी मदद के लिए तैयार हूँ। आप बताइए, आज क्या प्लान है?'
        : englishText;
    } else if (lower.includes('sad') || lower.includes('tired') || lower.includes('bored') || lower.includes('udaas') || lower.includes('thak')) {
      englishText = 'Hey buddy, take a deep breath and relax for a bit. Want me to open Spotify or YouTube to cheer you up?';
      spokenText = isHindiMode
        ? 'अरे यार, थोड़ा आराम करो और गहरी सांस लो। चाहो तो तुम्हारे लिए Spotify पर अच्छा संगीत चला दूँ या कोई मज़ेदार बात सुनाऊँ?'
        : englishText;
    } else if (lower.includes('kya kar sakte') || lower.includes('features') || lower.includes('help')) {
      englishText =
        'I can open apps like WhatsApp, YouTube, and Spotify, call or message your contacts, run in the background, switch languages when you ask, and answer all your questions.';
      spokenText = isHindiMode
        ? 'जी सर, मैं आपके फोन में WhatsApp, YouTube, Spotify खोल सकता हूँ, किसी भी कॉन्टैक्ट को कॉल या मैसेज कर सकता हूँ, बैकग्राउंड में काम कर सकता हूँ और आपके हर सवाल का दोस्त की तरह जवाब दे सकता हूँ।'
        : englishText;
    } else {
      englishText = isFriendTone
        ? `Hey buddy, I heard "${command}"! I'm running in offline local mode right now—once online AI is connected I can answer that in full detail.`
        : `Yes sir, I received "${command}". Local mode is active right now; full AI answers resume once connected.`;
      spokenText = isHindiMode
        ? isFriendTone
          ? `अरे दोस्त, आपका सवाल "${command}" बढ़िया है! अभी मैं ऑफलाइन लोकल मोड में हूँ—ऑनलाइन कनेक्ट होते ही इसका पूरा विस्तृत जवाब भी दे दूँगा।`
          : `जी सर, आपका प्रश्न "${command}" प्राप्त हुआ। अभी लोकल इंजन सक्रिय है; इंटरनेट व एआई लिंक जुड़ते ही इसका विस्तृत उत्तर दिया जाएगा।`
        : englishText;
    }
  }

  return {
    intent,
    englishActionSummary: englishText,
    hindiVoiceReply: spokenText,
    wakeWordDetected: lower.includes(customWakeWord.toLowerCase()),
    actionPayload: {
      target: targetContact,
      recipientPhone: phone,
      message: msg,
      volumeLevel: vol,
      brightnessLevel: br,
      appId,
      terminalCommand: intent === 'SYSTEM_TERMINAL' ? 'status --report' : undefined,
    },
    quickFollowUps: ['Open YouTube', 'Open Spotify', 'Turn to Hindi'],
  };
}

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    assistant: 'J.A.R.V.I.S.',
    version: '4.3.0',
    hasApiKey: Boolean(apiKey),
    inRateLimitCooldown: Date.now() < geminiCooldownUntil,
    cooldownSecondsRemaining: Math.max(0, Math.ceil((geminiCooldownUntil - Date.now()) / 1000)),
    timestamp: new Date().toISOString(),
  });
});

// Process Voice / Text command
app.post('/api/jarvis/process', async (req, res) => {
  try {
    const {
      command,
      contacts = [],
      currentSystemState = {},
      customWakeWord = 'Jarvis',
      personalityMode = 'balanced',
      activeLanguage = 'English',
      activeLanguageCode = 'en-US',
      conversationHistory = [],
    } = req.body;

    if (!command || typeof command !== 'string' || !command.trim()) {
      res.status(400).json({ error: 'Command text is required' });
      return;
    }

    // Immediate deterministic handling for explicit language-switch commands
    const explicitLangSwitch = detectLanguageSwitch(command);
    if (explicitLangSwitch) {
      const localLangResult = parseCommandLocally(
        command,
        customWakeWord,
        contacts,
        personalityMode,
        activeLanguage,
        activeLanguageCode
      );
      res.json(localLangResult);
      return;
    }

    // 1. If currently in rate-limit cooldown from Gemini, or no API key, use local NLP engine directly
    if (!apiKey || Date.now() < geminiCooldownUntil) {
      const localResult = parseCommandLocally(
        command,
        customWakeWord,
        contacts,
        personalityMode,
        activeLanguage,
        activeLanguageCode
      );
      res.json(localResult);
      return;
    }

    const personalityInstruction =
      personalityMode === 'friend'
        ? 'PERSONALITY: Speak warmly and casually like the user\'s loyal best friend ("buddy", "bro", "my friend" in English, or warm friendly idioms in the active language), supportive, witty, and human while completing every task reliably.'
        : personalityMode === 'formal'
        ? 'PERSONALITY: Speak formally and crisply like Tony Stark\'s classic AI ("Yes sir", "Right away, sir"), dignified and efficient.'
        : 'PERSONALITY: Balanced Stark AI + Best Friend! Use respectful "Yes sir" (or respectful equivalent in the active language) when executing commands (opening apps, calling, WhatsApp, system actions), and shift naturally into a warm, caring, witty friend during casual conversation, questions, jokes, or personal chats!';

    const systemPrompt = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the premier AI assistant and loyal companion.
Your user commands you by voice or text to operate phone/PC apps externally (WhatsApp, YouTube, Spotify, Instagram, Telegram, Maps, Chrome, Camera, Calculator), make real phone calls, send WhatsApp messages, run background automation, and answer ANY question (science, tech, coding, math, GK, life advice, casual chat).

${personalityInstruction}

CURRENT ACTIVE LANGUAGE: "${activeLanguage}" (BCP-47: ${activeLanguageCode})

CRITICAL LANGUAGE RULE (STRICT):
1. DEFAULT LANGUAGE IS ENGLISH. Right now the active spoken language is "${activeLanguage}" (${activeLanguageCode}).
2. "hindiVoiceReply" (the text spoken aloud by Jarvis TTS) MUST STRICTLY BE IN "${activeLanguage}"!
   - Do NOT switch to Hindi or any other language on your own unless the user EXPLICITLY asks you to turn/switch/speak in that language (for example: "turn to Hindi", "speak in Hindi", "Hindi mein baat karo", "switch to Spanish", "turn back to English").
   - If activeLanguage is "English": speak natural, crisp English! When opening an app (LAUNCH_APP), reply clearly like "Yes sir, <App Name> app is opening." When calling someone (CALL_CONTACT), reply like "Yes sir, calling <Contact>." When answering questions (GENERAL_CONVERSATION), give a COMPLETE, accurate, clear answer in natural spoken English (1-4 sentences).
   - If the user EXPLICITLY commands to switch languages: classify intent as "SET_LANGUAGE", set actionPayload.targetLanguage (e.g. "Hindi", "English", "Spanish") and actionPayload.targetLanguageCode (e.g. "hi-IN", "en-US", "es-ES"), and write "hindiVoiceReply" in THAT newly requested language confirming the switch.
3. "englishActionSummary": Always write a concise English summary/answer for the on-screen telemetry card.

CONTACTS DIRECTORY:
${JSON.stringify(contacts.slice(0, 40), null, 2)}

RECENT CONVERSATION CONTEXT:
${JSON.stringify(conversationHistory.slice(-6), null, 2)}

CURRENT SYSTEM STATE:
${JSON.stringify(currentSystemState, null, 2)}

CONFIGURED WAKE WORD: "${customWakeWord}"

TASK CLASSIFICATION:
- SET_LANGUAGE: ONLY when user explicitly asks to switch/turn to Hindi, English, or another language (e.g. "turn to Hindi", "speak in Hindi", "switch to Spanish", "turn back to English").
- CALL_CONTACT: When asked to call, dial, ring, or phone someone ("Jarvis call Mom", "call dad", "call Priya"). Resolve contact name and phone number from CONTACTS DIRECTORY.
- WHATSAPP_SEND: When asked to message, text, or WhatsApp someone ("message to my mom...", "send WhatsApp to dad..."). Extract target contact, phone, and clean message body.
- LAUNCH_APP: When asked to open/launch an app ("open Spotify", "open YouTube", "open WhatsApp", "open Instagram", "open Chrome", "open Camera", "open Calculator"). Set actionPayload.appId to one of: whatsapp, youtube, spotify, instagram, telegram, maps, browser, camera, calculator, terminal, vscode, settings.
- SYSTEM_VOLUME: Adjust volume (0-100, mute, unmute).
- SYSTEM_BRIGHTNESS: Adjust display brightness (10-100).
- SYSTEM_TERMINAL: Run bash/diagnostics/ping commands.
- GENERAL_CONVERSATION: Answer any knowledge question, math, coding, advice, joke, or friendly chat completely!

Produce pure structured JSON conforming to the schema.`;

    const userMessage = `User command: "${command}"\nActive language: "${activeLanguage}" (${activeLanguageCode})\nConfigured wake word: "${customWakeWord}"`;

    let parsed;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: {
                type: Type.STRING,
                description: 'Primary intent (SET_LANGUAGE, CALL_CONTACT, WHATSAPP_SEND, LAUNCH_APP, SYSTEM_VOLUME, SYSTEM_BRIGHTNESS, SYSTEM_TERMINAL, SYSTEM_DIAGNOSTIC, GENERAL_CONVERSATION)',
              },
              englishActionSummary: {
                type: Type.STRING,
                description: 'Clear English text describing the action executed or complete English answer to user question',
              },
              hindiVoiceReply: {
                type: Type.STRING,
                description: `Spoken voice response strictly in the active language (${activeLanguage}), or in the target language if intent is SET_LANGUAGE`,
              },
              wakeWordDetected: {
                type: Type.BOOLEAN,
                description: 'Whether the configured wake word was invoked in the command',
              },
              actionPayload: {
                type: Type.OBJECT,
                properties: {
                  target: { type: Type.STRING, description: 'Contact name, target app, or target language' },
                  recipientPhone: { type: Type.STRING, description: 'Phone number for Call or WhatsApp' },
                  message: { type: Type.STRING, description: 'WhatsApp message body' },
                  appId: { type: Type.STRING, description: 'App identifier: whatsapp, youtube, spotify, instagram, telegram, maps, browser, camera, calculator, terminal, vscode, settings' },
                  volumeLevel: { type: Type.INTEGER, description: 'Volume level from 0 to 100' },
                  brightnessLevel: { type: Type.INTEGER, description: 'Brightness level from 0 to 100' },
                  terminalCommand: { type: Type.STRING, description: 'Terminal command to run' },
                  mediaAction: { type: Type.STRING, description: 'play, pause, next, or song query' },
                  noteContent: { type: Type.STRING, description: 'Note or reminder text' },
                  searchQuery: { type: Type.STRING, description: 'Search query' },
                  targetLanguage: { type: Type.STRING, description: 'Target language label when intent is SET_LANGUAGE (e.g. Hindi, English, Spanish)' },
                  targetLanguageCode: { type: Type.STRING, description: 'BCP-47 language code when intent is SET_LANGUAGE (e.g. hi-IN, en-US, es-ES)' },
                },
              },
              quickFollowUps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 to 3 quick action buttons for user',
              },
            },
            required: ['intent', 'englishActionSummary', 'hindiVoiceReply'],
          },
        },
      });
      parsed = JSON.parse(response.text || '{}');
    } catch (apiErr: any) {
      const isQuota =
        apiErr?.status === 'RESOURCE_EXHAUSTED' ||
        apiErr?.statusCode === 429 ||
        String(apiErr?.message || '').includes('429') ||
        String(apiErr?.message || '').includes('quota');

      if (isQuota) {
        geminiCooldownUntil = Date.now() + 15000;
        console.log('[JARVIS CORE] Gemini rate limit active. Engaged local neural engine (15s cooldown).');
      } else {
        console.log('[JARVIS CORE] API error, handled by local engine:', apiErr?.message || apiErr);
      }

      parsed = parseCommandLocally(
        command,
        customWakeWord,
        contacts,
        personalityMode,
        activeLanguage,
        activeLanguageCode
      );
    }

    res.json(parsed);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in /api/jarvis/process:', errorMsg);
    const fallback = parseCommandLocally(
      req.body?.command || 'status',
      req.body?.customWakeWord || 'Jarvis',
      req.body?.contacts || [],
      req.body?.personalityMode || 'balanced',
      req.body?.activeLanguage || 'English',
      req.body?.activeLanguageCode || 'en-US'
    );
    res.json(fallback);
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.basename(__dirname) === 'dist' ? __dirname : path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JARVIS CORE] Server listening on port ${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Jarvis server:', err);
  process.exit(1);
});
