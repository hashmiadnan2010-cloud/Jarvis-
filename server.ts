import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

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

// Cooldown tracker per model for free-tier rate limits and diagnostics
const MODEL_CANDIDATES = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
const modelCooldownUntil: Record<string, number> = {};
let lastGeminiError = '';

function extractJsonObject(rawText: string): any {
  const cleaned = String(rawText || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  if (!cleaned) {
    throw new Error('Empty response text from Gemini');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error(`Invalid JSON from Gemini: ${cleaned.slice(0, 120)}`);
  }
}

const MOTHER_ALIAS_RE =
  /\b(mom|mommy|mama|mummy|mata|mataji|mother|maa|amma|ammi)\b|मॉम|मॉम्मी|मम्मी|माँ|मां|माता|अम्मा|अम्मी/;
const FATHER_ALIAS_RE =
  /\b(dad|daddy|papa|pita|pitaji|father|pa|abba)\b|पापा|डैड|डैडी|पिता|अब्बा/;

function matchContactFromCommand(lower: string, contacts: any[] = [], rawCommand: string = '') {
  const probe = `${lower} ${rawCommand}`.trim();
  const isMotherAlias = MOTHER_ALIAS_RE.test(probe);
  const isFatherAlias = FATHER_ALIAS_RE.test(probe);

  const orderedContacts = [
    ...contacts.filter((c) => !String(c.id || '').startsWith('c-')),
    ...contacts.filter((c) => String(c.id || '').startsWith('c-')),
  ];

  for (const c of orderedContacts) {
    const rel = String(c.relation || '').toLowerCase().trim();
    const name = String(c.name || '').toLowerCase().trim();
    const entryIsMom = rel === 'mother' || MOTHER_ALIAS_RE.test(rel) || MOTHER_ALIAS_RE.test(name);
    const entryIsDad = rel === 'father' || FATHER_ALIAS_RE.test(rel) || FATHER_ALIAS_RE.test(name);

    if (
      (rel && rel.length >= 2 && lower.includes(rel)) ||
      (name && name.length >= 2 && lower.includes(name)) ||
      (isMotherAlias && entryIsMom) ||
      (isFatherAlias && entryIsDad)
    ) {
      const hasDistinctRel = c.relation && c.relation.toLowerCase() !== c.name.toLowerCase();
      return {
        targetContact: hasDistinctRel ? `${c.relation} (${c.name})` : c.name || c.relation,
        shortName: isMotherAlias ? 'Mom' : isFatherAlias ? 'Dad' : c.relation || c.name,
        phone: String(c.phone || ''),
      };
    }
  }

  for (const c of orderedContacts) {
    const firstName = String(c.name || '').toLowerCase().split(/\s+/)[0];
    if (firstName && firstName.length >= 3 && lower.includes(firstName)) {
      return {
        targetContact: c.name,
        shortName: c.name,
        phone: String(c.phone || ''),
      };
    }
  }

  if (isMotherAlias) return { targetContact: 'Mom', shortName: 'Mom', phone: '' };
  if (isFatherAlias) return { targetContact: 'Dad', shortName: 'Dad', phone: '' };
  if (lower.includes('boss') || probe.includes('बॉस')) return { targetContact: 'Boss', shortName: 'Boss', phone: '+14155550199' };
  if (lower.includes('priya') || probe.includes('प्रिया')) return { targetContact: 'Priya Sharma', shortName: 'Priya', phone: '+919822233445' };

  return null;
}

function extractSpokenPersonNameServer(command: string): string {
  const withoutBody = command
    .replace(/^(?:hey|hay|he|ok|hi|hello|हे)[,\s]+(?:jarvis|जार्विस|जर्विस)[,\s:-]*/i, '')
    .replace(/(?:\b(?:that|saying|ki)\b|कि|:).*$/i, '')
    .trim();

  const koMatch = withoutBody.match(/^([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F0-9._-]*(?:\s+[a-zA-Z\u0900-\u097F0-9._-]+)?)\s+(?:ko|को)\b/i);
  if (koMatch && koMatch[1]) {
    return koMatch[1].trim();
  }

  const toMatch = withoutBody.match(/\bto\s+([a-zA-Z\u0900-\u097F][a-zA-Z\u0900-\u097F0-9._-]*(?:\s+[a-zA-Z\u0900-\u097F0-9._-]+)?)(?=\s+(?:on|via|that|saying|ki|message|whatsapp|please|directly)|$)/i);
  if (toMatch && toMatch[1]) {
    return toMatch[1].trim();
  }

  const cleaned = withoutBody
    .replace(
      /\b(?:please|kindly|direct|directly|abhi|turant|jaldi|karo|kar\s*do|lagao|laga\s*do|call|dial|ring|phone|whatsapp|whatsap|send|message|msg|text|bhejo|bhej\s*do|to|my|ko|pe|par)\b/gi,
      ' '
    )
    .replace(/कॉल|डायल|फोन|व्हाट्सएप|वॉट्सएप|मैसेज|संदेश|भेजो|भेज\s*दो|करो|कर\s*दो|लगाओ|लगा\s*दो|को|मेरे|मेरी|डायरेक्ट|अभी|कि|:|,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter((w) => w.length >= 2);
  if (words.length >= 1 && words.length <= 3) {
    return words.join(' ');
  }
  return '';
}

function extractAppSearchServer(command: string): { appId: string; appLabel: string; searchQuery: string } | null {
  const trimmed = command.trim();
  const lower = trimmed.toLowerCase();

  const hasYouTube = /\b(youtube|yt)\b/i.test(lower) || /यूट्यूब/.test(trimmed);
  const hasSpotify = /\b(spotify)\b/i.test(lower) || /स्पॉटिफाई/.test(trimmed);
  const hasGoogle = /\b(google)\b/i.test(lower) || /गूगल/.test(trimmed);
  const hasMaps = /\b(google\s*maps?|maps?)\b/i.test(lower) || /मैप्स/.test(trimmed);
  const hasPlayStore = /\b(play\s*store)\b/i.test(lower) || /प्ले\s*स्टोर/.test(trimmed);

  const hasSearchOrPlayCue =
    /\b(search|find|look\s*up|watch|play|sarch)\b/i.test(lower) ||
    /सर्च|खोजो|ढूंढो|चलाओ|दिखाओ|बजाओ/.test(trimmed);

  if (!hasSearchOrPlayCue && !(hasYouTube && /\b(video|song|channel|shorts|vlog)\b/i.test(lower))) {
    return null;
  }

  let appId = 'google';
  let appLabel = 'Google';
  if (hasYouTube) {
    appId = 'youtube';
    appLabel = 'YouTube';
  } else if (hasSpotify) {
    appId = 'spotify';
    appLabel = 'Spotify';
  } else if (hasMaps) {
    appId = 'maps';
    appLabel = 'Google Maps';
  } else if (hasPlayStore) {
    appId = 'playstore';
    appLabel = 'Play Store';
  } else if (hasGoogle) {
    appId = 'google';
    appLabel = 'Google';
  } else {
    return null;
  }

  let query = trimmed
    .replace(/^(?:hey|hay|he|ok|hi|hello|हे)[,\s]+(?:jarvis|जार्विस|जर्विस|youtube|yt|यूट्यूब|google|गूगल|spotify|स्पॉटिफाई)[,\s:-]*/i, '')
    .replace(/^(?:on|in|pe|par|mein|me|पर|में|पे|ऑन)?\s*(?:youtube|yt|यूट्यूब|google|गूगल|spotify|स्पॉटिफाई|google\s*maps?|maps?|play\s*store)[,\s:-]*/i, '')
    .replace(/\s+(?:on|in|pe|par|mein|me|पर|में|पे|ऑन)\s*(?:youtube|yt|यूट्यूब|google|गूगल|spotify|स्पॉटिफाई|google\s*maps?|maps?|play\s*store)\b.*$/i, '')
    .replace(/\b(?:youtube|yt|google|spotify|google\s*maps?|play\s*store)\b/gi, ' ')
    .replace(/यूट्यूब|गूगल|स्पॉटिफाई|मैप्स|प्ले\s*स्टोर/g, ' ')
    .replace(/^(?:please|kindly|search|find|watch|play|open|show|karo|sarch)\b[\s,:-]*/i, '')
    .replace(/^(?:सर्च\s*करो|सर्च\s*कर\s*दो|सर्च|खोजो|ढूंढो|चलाओ|दिखाओ|खोलो|करो)(?=\s|$|[,.:-])[\s,:-]*/g, '')
    .replace(/\b(?:search|karo|kar\s*do|chalao|dikhao|please|for\s+me)\b[\s.!?,]*$/i, '')
    .replace(/(?:सर्च\s*करो|सर्च\s*कर\s*दो|सर्च|खोजो|ढूंढो|चलाओ|दिखाओ|करो|कर\s*दो)[\s।.!?,]*$/g, '')
    .replace(/^(?:for|about|video|song|on|in)\s+/i, '')
    .replace(/^(?:ऑन|पर|में|पे)\s+/g, '')
    .replace(/^[,.\s:-]+|[,.\s:-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!query || query.length < 2) return null;
  return { appId, appLabel, searchQuery: query };
}

function extractWhatsAppMessageServer(command: string, contactNameHint: string): string {
  let msg = command.trim();
  const colonIdx = msg.indexOf(':');
  if (colonIdx > 0 && colonIdx < msg.length - 1) {
    const afterColon = msg.slice(colonIdx + 1).trim();
    if (afterColon.length >= 1) return afterColon;
  }

  const kiMatch = msg.match(/(?:\bki\b|कि)\s+(.+)$/i);
  if (kiMatch && kiMatch[1] && kiMatch[1].trim().length >= 2) {
    return kiMatch[1].trim();
  }

  const sayingMatch = msg.match(/\b(?:saying|that)\s+(.+)$/i);
  if (sayingMatch && sayingMatch[1] && sayingMatch[1].trim().length >= 2) {
    return sayingMatch[1].trim();
  }

  msg = msg
    .replace(/^(?:hey|hay|he|ok|hi|hello|हे)[,\s]+(?:jarvis|जार्विस|जर्विस)[,\s:-]*/i, '')
    .replace(
      /\b(?:please|direct|directly|whatsapp|whatsap|whats\s*app|send|message|msg|text|bhejo|bhej\s*do|bhej|sandesh|karo|kar\s*do|to|my|ko|pe|par|on)\b/gi,
      ' '
    )
    .replace(/व्हाट्सएप|वॉट्सएप|वाट्सएप|मैसेज|संदेश|भेजो|भेज\s*दो|भेज|करो|कर\s*दो|को|पे|पर|डायरेक्ट|कि/g, ' ')
    .replace(MOTHER_ALIAS_RE, ' ')
    .replace(FATHER_ALIAS_RE, ' ');

  if (contactNameHint) {
    for (const part of contactNameHint.split(/[\s()]+/)) {
      if (part.length >= 2) {
        const esc = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        msg = msg.replace(new RegExp(`\\b${esc}\\b`, 'gi'), ' ');
      }
    }
  }

  return msg.replace(/^[,.\s:-]+|[,.\s:-]+$/g, '').replace(/\s+/g, ' ').trim();
}

function extractInstagramMessageCommandServer(command: string): { recipient: string; message: string } | null {
  const hasInsta = /\b(instagram|insta|ig)\b|इंस्टाग्राम|इंस्टा/i.test(command);
  const hasMsgCue = /\b(send|message|msg|dm|text|reply|bhejo|bhej\s*do)\b|मैसेज|संदेश|भेजो|रिप्लाई/i.test(command);
  if (!hasInsta || !hasMsgCue) return null;

  let recipient = '';
  const toMatch =
    command.match(/\bto\s+([a-zA-Z\u0900-\u097F0-9._-]+(?:\s+[a-zA-Z\u0900-\u097F0-9._-]+)?)\s+(?:that|saying|ki|message|कि|:)/i) ||
    command.match(/([a-zA-Z\u0900-\u097F0-9._-]+(?:\s+[a-zA-Z\u0900-\u097F0-9._-]+)?)\s+(?:ko|को)\s+(?:instagram|insta|इंस्टाग्राम|इंस्टा)?\s*(?:par|pe|on|पर)?\s*(?:message|मैसेज|dm|रिप्लाई)/i) ||
    command.match(/\bto\s+([a-zA-Z\u0900-\u097F0-9._-]+)/i);
  if (toMatch && toMatch[1]) {
    recipient = toMatch[1].replace(/^(?:hey|jarvis|open|and)\s+/i, '').trim();
  }

  let message = '';
  const bodyMatch =
    command.match(/\b(?:that|saying|ki)\s+(.+)$/i) ||
    command.match(/कि\s+(.+)$/) ||
    command.match(/:\s*(.+)$/);
  if (bodyMatch && bodyMatch[1]) {
    message = bodyMatch[1].trim();
  }

  if (!recipient) {
    recipient =
      extractSpokenPersonNameServer(
        command.replace(/\b(instagram|insta|ig|open|and)\b|इंस्टाग्राम|इंस्टा|खोलो|और/gi, ' ')
      ) || 'Friend';
  }
  if (!message) {
    message = 'Hello!';
  }
  return { recipient, message };
}

function extractMusicCommandServer(command: string): { mediaAction: 'play' | 'pause' | 'next' | 'previous'; songQuery: string } | null {
  const lower = command.toLowerCase().trim();
  if (/\b(free\s*f\s*ire|freefire|bgmi|pubg|youtube|instagram|whatsapp)\b/.test(lower)) {
    return null;
  }
  if (/\b(pause|stop)\s+(?:the\s+)?(?:song|songs|music|audio|track|gaana|gana)\b|गाना\s*(?:रोको|बंद)/i.test(command)) {
    return { mediaAction: 'pause', songQuery: '' };
  }
  if (/\b(next|skip)\s+(?:the\s+)?(?:song|music|track|gaana|gana)\b|अगला\s*गाना/i.test(command)) {
    return { mediaAction: 'next', songQuery: '' };
  }
  if (/\b(previous|prev|last)\s+(?:the\s+)?(?:song|music|track|gaana|gana)\b|पिछला\s*गाना/i.test(command)) {
    return { mediaAction: 'previous', songQuery: '' };
  }
  const hasPlaySong =
    /\b(play|resume|start|bajao|chalao)\s+(?:(?:a|the|some|this|my)\s+)?(?:[\w\u0900-\u097F'&-]+\s+){0,5}?(?:song|songs|music|track|gaana|gana)\b/i.test(lower) ||
    /\b(?:song|music|gaana|gana)\s+(?:play|chalao|bajao)\b/i.test(lower) ||
    /(?:प्ले\s*सॉन्ग|सॉन्ग\s*प्ले|गाना\s*चलाओ|गाना\s*बजाओ|म्यूजिक\s*चलाओ|सॉन्ग\s*बजाओ)/.test(command);

  if (!hasPlaySong) return null;

  const songQuery = command
    .replace(/^(?:hey|hay|hi|ok|please|हे)[,\s]+(?:jarvis|जार्विस)[,\s:-]*/i, '')
    .replace(/\b(?:play|resume|start|a|the|some|song|songs|music|track|gaana|gana|bajao|chalao|karo|please)\b/gi, ' ')
    .replace(/प्ले|सॉन्ग|गाना|म्यूजिक|चलाओ|बजाओ|करो/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { mediaAction: 'play', songQuery };
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
  activeLanguageCode: string = 'en-US',
  deviceContext: any = {}
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
  let targetContact = 'Mom';
  let shortContact = 'Mom';
  let phone = '';
  let searchQuery = '';
  let vol = 75;
  let br = 80;
  let appId = 'whatsapp';
  let appLabel = 'WhatsApp';

  const matched = matchContactFromCommand(lower, contacts, command);
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
    } else {
      const spokenName = extractSpokenPersonNameServer(command);
      if (spokenName) {
        targetContact = spokenName;
        shortContact = spokenName;
      }
    }
  }
  let msg = extractWhatsAppMessageServer(command, targetContact);

  const APP_ALIAS_RULES: Array<{ patterns: RegExp[]; appId: string; appLabel: string }> = [
    { patterns: [/\b(instagram|insta|ig)\b/i], appId: 'instagram', appLabel: 'Instagram' },
    { patterns: [/\b(calendar|calender)\b/i], appId: 'calendar', appLabel: 'Calendar' },
    { patterns: [/\btrue\s*caller\b/i], appId: 'truecaller', appLabel: 'Truecaller' },
    { patterns: [/\bfree\s*f\s*ire(?:\s*max)?\b/i, /\bfreefire(?:\s*max)?\b/i], appId: 'freefire', appLabel: 'Free Fire' },
    { patterns: [/\b(whatsapp|whatsap|whats\s*app)\b/i], appId: 'whatsapp', appLabel: 'WhatsApp' },
    { patterns: [/\b(youtube|yt)\b/i], appId: 'youtube', appLabel: 'YouTube' },
    { patterns: [/\b(spotify|music|gana)\b/i], appId: 'spotify', appLabel: 'Spotify' },
    { patterns: [/\b(telegram)\b/i], appId: 'telegram', appLabel: 'Telegram' },
    { patterns: [/\b(google\s*maps?|maps?)\b/i], appId: 'maps', appLabel: 'Google Maps' },
    { patterns: [/\b(chrome|browser)\b/i], appId: 'browser', appLabel: 'Chrome' },
    { patterns: [/\b(google\s*pay|gpay|g\s*pay)\b/i], appId: 'gpay', appLabel: 'Google Pay' },
    { patterns: [/\b(google)\b/i], appId: 'google', appLabel: 'Google' },
    { patterns: [/\b(dialer|phone\s*app|call\s*app|phone|call)\b/i], appId: 'dialer', appLabel: 'Phone Dialer' },
    { patterns: [/\b(gmail|mail|email)\b/i], appId: 'gmail', appLabel: 'Gmail' },
    { patterns: [/\b(snapchat|snap)\b/i], appId: 'snapchat', appLabel: 'Snapchat' },
    { patterns: [/\b(facebook|fb)\b/i], appId: 'facebook', appLabel: 'Facebook' },
    { patterns: [/\b(phone\s*pe)\b/i], appId: 'phonepe', appLabel: 'PhonePe' },
    { patterns: [/\b(paytm)\b/i], appId: 'paytm', appLabel: 'Paytm' },
    { patterns: [/\b(play\s*store)\b/i], appId: 'playstore', appLabel: 'Play Store' },
    { patterns: [/\b(photos?|gallery)\b/i], appId: 'photos', appLabel: 'Photos' },
    { patterns: [/\b(bgmi|pubg)\b/i], appId: 'bgmi', appLabel: 'BGMI' },
    { patterns: [/\b(netflix)\b/i], appId: 'netflix', appLabel: 'Netflix' },
    { patterns: [/\b(amazon)\b/i], appId: 'amazon', appLabel: 'Amazon' },
    { patterns: [/\b(flipkart)\b/i], appId: 'flipkart', appLabel: 'Flipkart' },
    { patterns: [/\b(terminal)\b/i], appId: 'terminal', appLabel: 'Terminal' },
    { patterns: [/\b(camera)\b/i], appId: 'camera', appLabel: 'Camera' },
    { patterns: [/\b(calc|calculator)\b/i], appId: 'calculator', appLabel: 'Calculator' },
    { patterns: [/\b(vs\s*code|vscode)\b/i], appId: 'vscode', appLabel: 'VS Code' },
    { patterns: [/\b(settings?)\b/i], appId: 'settings', appLabel: 'Settings' },
  ];

  let settingType = '';
  let settingAction = '';
  let settingLabel = '';
  let ringerMode: 'normal' | 'vibrate' | 'silent' | undefined;

  const wantsOff = /\b(off|disable|band|close|stop)\b/.test(lower) || /बंद/.test(command);
  const wantsOn = /\b(on|enable|chalu|start)\b/.test(lower) || /चालू|ऑन/.test(command);
  const hasActionVerb =
    wantsOn ||
    wantsOff ||
    /\b(switch|turn|toggle|connect|open|kholo|karo|settings?)\b/.test(lower) ||
    /खोलो|करो|बदलो|सेटिंग/.test(command);
  const onOff: 'on' | 'off' | 'open' = wantsOff ? 'off' : wantsOn ? 'on' : 'open';

  let matchedSetting: { settingType: string; settingAction: string; ringerMode?: 'normal' | 'vibrate' | 'silent'; label: string } | null = null;
  if (/\b(vibrat(?:e|ion)|vibration\s*mode|vibrate\s*mode)\b/.test(lower) || /वाइब्रेशन|वाइब्रेट/.test(command)) {
    matchedSetting = { settingType: 'ringer', settingAction: 'vibrate', ringerMode: 'vibrate', label: 'Vibration Mode' };
  } else if ((/\b(silent\s*mode|silent|do\s*not\s*disturb|dnd)\b/.test(lower) || /साइलेंट/.test(command)) && !/\bsettings\b/.test(lower)) {
    matchedSetting = { settingType: 'ringer', settingAction: 'silent', ringerMode: 'silent', label: 'Silent Mode' };
  } else if (/\b(normal\s*mode|ring\s*mode|ringer\s*mode|sound\s*mode|general\s*mode|unmute\s*phone)\b/.test(lower) || /नॉर्मल\s*मोड|रिंग\s*मोड/.test(command)) {
    matchedSetting = { settingType: 'ringer', settingAction: 'normal', ringerMode: 'normal', label: 'Normal Mode' };
  } else if ((/\b(wi[\s-]?fi|wifi|waifai|vifi|yfi)\b/.test(lower) || /वाई[\s-]?फाई|वाईफाई/.test(command)) && hasActionVerb) {
    matchedSetting = { settingType: 'wifi', settingAction: onOff, label: 'Wi-Fi' };
  } else if ((/\b(mobile\s*data|cellular\s*data|internet|network|net)\b/.test(lower) || /नेटवर्क|मोबाइल\s*डेटा|इंटरनेट/.test(command)) && hasActionVerb) {
    matchedSetting = { settingType: 'network', settingAction: onOff, label: 'Mobile Network' };
  } else if ((/\b(bluetooth)\b/.test(lower) || /ब्लूटूथ/.test(command)) && hasActionVerb) {
    matchedSetting = { settingType: 'bluetooth', settingAction: onOff, label: 'Bluetooth' };
  } else if ((/\b(flashlight|torch|flash)\b/.test(lower) || /टॉर्च|फ्लैशलाइट/.test(command)) && hasActionVerb) {
    matchedSetting = { settingType: 'flashlight', settingAction: wantsOff ? 'off' : 'on', label: 'Flashlight' };
  } else if (/\b(airplane\s*mode|flight\s*mode)\b/.test(lower) || /एयरप्लेन|फ्लाइट\s*मोड/.test(command)) {
    matchedSetting = { settingType: 'airplane', settingAction: onOff, label: 'Airplane Mode' };
  } else if ((/\b(hotspot)\b/.test(lower) || /हॉटस्पॉट/.test(command)) && hasActionVerb) {
    matchedSetting = { settingType: 'hotspot', settingAction: onOff, label: 'Hotspot' };
  } else if ((/\b(location|gps)\b/.test(lower) || /लोकेशन|जीपीएस/.test(command)) && hasActionVerb) {
    matchedSetting = { settingType: 'location', settingAction: onOff, label: 'Location' };
  } else if (/\b(battery\s*saver|power\s*sav(?:ing|er))\b/.test(lower) || /बैटरी\s*सेवर/.test(command)) {
    matchedSetting = { settingType: 'battery_saver', settingAction: onOff, label: 'Battery Saver' };
  } else if (/\b(auto[\s-]?rotat(?:e|ion)|screen\s*rotat(?:e|ion))\b/.test(lower) || /रोटेशन|ऑटो\s*रोटेट/.test(command)) {
    matchedSetting = { settingType: 'auto_rotate', settingAction: onOff, label: 'Auto-Rotate' };
  } else if (/\b(display\s*settings?|dark\s*mode|screen\s*timeout)\b/.test(lower) || /डिस्प्ले\s*सेटिंग|डार्क\s*मोड/.test(command)) {
    matchedSetting = { settingType: 'display', settingAction: 'open', label: 'Display Settings' };
  } else if (/\b(sound\s*settings?|ringtone\s*settings?|dnd\s*settings?)\b/.test(lower) || /साउंड\s*सेटिंग/.test(command)) {
    matchedSetting = { settingType: 'sound', settingAction: 'open', label: 'Sound Settings' };
  } else if (/\b(storage\s*settings?|phone\s*storage)\b/.test(lower) || /स्टोरेज\s*सेटिंग/.test(command)) {
    matchedSetting = { settingType: 'storage', settingAction: 'open', label: 'Storage Settings' };
  } else if (/\b(app\s*settings?|manage\s*apps|application\s*settings?)\b/.test(lower)) {
    matchedSetting = { settingType: 'apps_settings', settingAction: 'open', label: 'App Settings' };
  } else if (/\b(security\s*settings?|fingerprint\s*settings?|privacy\s*settings?|lock\s*settings?)\b/.test(lower)) {
    matchedSetting = { settingType: 'security', settingAction: 'open', label: 'Security Settings' };
  } else if (/\b(date\s*(?:and|&)?\s*time\s*settings?)\b/.test(lower)) {
    matchedSetting = { settingType: 'date_time', settingAction: 'open', label: 'Date & Time Settings' };
  } else if (/\b(accessibility\s*settings?)\b/.test(lower)) {
    matchedSetting = { settingType: 'accessibility', settingAction: 'open', label: 'Accessibility Settings' };
  } else if (/\b(vpn\s*settings?|nfc\s*settings?)\b/.test(lower)) {
    matchedSetting = { settingType: lower.includes('nfc') ? 'nfc' : 'vpn', settingAction: 'open', label: lower.includes('nfc') ? 'NFC Settings' : 'VPN Settings' };
  } else if (/\b(?:open|show|connect)\s+(?:all\s+|phone\s+|device\s+)?settings?\b/.test(lower) || /फोन\s*सेटिंग्स?\s*खोलो|पूरे\s*सेटिंग/.test(command)) {
    matchedSetting = { settingType: 'settings', settingAction: 'open', label: 'Phone Settings' };
  }

  const isStandbyRequest =
    /\b(standby|stand\s*by|go\s+to\s+background|background\s+mode|background\s+mein|minimize\s+(?:jarvis|app))\b/i.test(lower) ||
    /(स्टैंडबाय|बैकग्राउंड\s*में\s*(?:जाओ|रखो|करो))/.test(command);

  const isAppLaunchCommand =
    /\b(open|launch|kholo|start|chalu)\b|खोलो|चलाओ|चालू/i.test(lower) ||
    /\bplay\s+(free\s*f\s*ire|freefire|bgmi|pubg)\b/i.test(lower);
  const hasPhoneNumber = /\d{4,}/.test(lower);
  const instaCmd = extractInstagramMessageCommandServer(command);
  const musicCmd = extractMusicCommandServer(command);
  const appSearch = extractAppSearchServer(command);
  const isBatteryOrDiagnostic =
    /\b(battery|charging|diagnostic|diagnostics|cpu)\b/.test(lower) ||
    (/\bstatus\b/.test(lower) && !lower.includes('whatsapp'));

  const isCallCue =
    /\b(call|dial|ring)\b/.test(lower) ||
    /(call\s*karo|call\s*lagao|phone\s*karo|phone\s*lagao|kalo)/.test(lower) ||
    /(कॉल\s*करो|कॉल\s*लगाओ|फोन\s*करो|फोन\s*लगाओ|डायल\s*करो|रिंग\s*करो|कॉल|फोन\s*लगा)/.test(command) ||
    (/\bphone\b/.test(lower) && Boolean(matched));

  const isWhatsAppCue =
    lower.includes('whatsapp') ||
    lower.includes('whatsap') ||
    /व्हाट्सएप|वॉट्सएप|वाट्सएप/.test(command) ||
    lower.includes('message') ||
    lower.includes('text') ||
    lower.includes('bhej') ||
    lower.includes('sandesh') ||
    /मैसेज|संदेश|भेजो|भेज\s*दो/.test(command);

  let mediaAction: 'play' | 'pause' | 'next' | 'previous' | undefined;

  // 0. Standby or Device Settings / Hardware Controls
  if (isStandbyRequest) {
    intent = 'STANDBY_BACKGROUND';
  } else if (matchedSetting) {
    intent = 'DEVICE_SETTING';
    settingType = matchedSetting.settingType;
    settingAction = matchedSetting.settingAction;
    settingLabel = matchedSetting.label;
    ringerMode = matchedSetting.ringerMode;
  } else if (isBatteryOrDiagnostic) {
    intent = 'SYSTEM_DIAGNOSTIC';
  } else if (instaCmd) {
    intent = 'INSTAGRAM_SEND';
    appId = 'instagram';
    appLabel = 'Instagram';
    targetContact = instaCmd.recipient;
    shortContact = instaCmd.recipient;
    msg = instaCmd.message;
  } else if (musicCmd) {
    intent = 'PLAY_MUSIC';
    mediaAction = musicCmd.mediaAction;
    searchQuery = musicCmd.songQuery;
    appId = 'spotify';
    appLabel = musicCmd.songQuery || 'Music Player';
  } else if (appSearch) {
    intent = 'SEARCH_WEB';
    appId = appSearch.appId;
    appLabel = appSearch.appLabel;
    searchQuery = appSearch.searchQuery;
  }
  // 1. Phone Call Intent
  else if (
    isCallCue &&
    (!isAppLaunchCommand || Boolean(matched) || hasPhoneNumber) &&
    !lower.includes('app') &&
    !lower.includes('whatsapp') &&
    !/व्हाट्सएप|वॉट्सएप/.test(command) &&
    !lower.includes('message') &&
    !/मैसेज|संदेश/.test(command)
  ) {
    intent = 'CALL_CONTACT';
  }
  // 2. WhatsApp Intent
  else if (isWhatsAppCue) {
    intent = 'WHATSAPP_SEND';
    if (!msg || msg.length < 2) {
      msg = 'Hello!';
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
  // 6. App Launch Intent (ALL Phone / Desktop apps outside Jarvis)
  else if (isAppLaunchCommand) {
    intent = 'LAUNCH_APP';
    let matchedRule: { appId: string; appLabel: string } | null = null;
    for (const rule of APP_ALIAS_RULES) {
      if (rule.patterns.some((re) => re.test(lower))) {
        matchedRule = { appId: rule.appId, appLabel: rule.appLabel };
        break;
      }
    }
    if (matchedRule) {
      appId = matchedRule.appId;
      appLabel = matchedRule.appLabel;
    } else {
      const extracted = command
        .replace(/^(?:hey|hi|ok|please|kindly|jarvis)[,\s]+/gi, '')
        .replace(/^.*?\b(?:open|launch|start|run|play|kholo|chalu\s*karo|chalu)\b\s*/i, '')
        .replace(/\b(?:on\s+my\s+phone|in\s+my\s+phone|on\s+phone|my\s+phone|the\s+app|application|app|please|jarvis|kholo|karo|kar\s*do)\b/gi, '')
        .replace(/[^\w\s.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (extracted && extracted.length >= 2) {
        appId = extracted.toLowerCase();
        appLabel = extracted
          .split(' ')
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      } else {
        appId = 'google';
        appLabel = 'Google';
      }
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

  if (intent === 'STANDBY_BACKGROUND') {
    englishText = 'Yes sir, moving to cool background standby. Say "Hey Jarvis" whenever you need me.';
    spokenText = isHindiMode
      ? 'जी सर, मैं बैकग्राउंड स्टैंडबाय मोड में जा रहा हूँ। जब भी ज़रूरत हो, "हे जार्विस" बोलें।'
      : englishText;
  } else if (intent === 'CALL_CONTACT') {
    const hindiHonorific = shortContact === 'Mother' || shortContact === 'Mom' ? 'मॉम' : shortContact === 'Father' || shortContact === 'Dad' ? 'पापा' : targetContact;
    englishText = isFriendTone
      ? `Calling ${targetContact} directly right now!`
      : `Yes sir, placing a direct call to ${targetContact}.`;
    spokenText = isHindiMode
      ? isFriendTone
        ? `अरे बिल्कुल भाई, ${hindiHonorific} को अभी डायरेक्ट कॉल लगा रहा हूँ।`
        : `जी सर, ${hindiHonorific} को डायरेक्ट कॉल लगा रहा हूँ।`
      : englishText;
  } else if (intent === 'INSTAGRAM_SEND') {
    englishText = `Yes sir, opening Instagram and sending message to ${targetContact}: "${msg}".`;
    spokenText = isHindiMode
      ? `जी सर, इंस्टाग्राम खोलकर ${targetContact} को मैसेज भेज रहा हूँ: "${msg}"।`
      : englishText;
  } else if (intent === 'PLAY_MUSIC') {
    if (mediaAction === 'pause') {
      englishText = 'Yes sir, pausing music playback.';
      spokenText = isHindiMode ? 'जी सर, गाना रोक दिया गया है।' : englishText;
    } else if (mediaAction === 'next') {
      englishText = 'Yes sir, skipping to the next song.';
      spokenText = isHindiMode ? 'जी सर, अगला गाना चला रहा हूँ।' : englishText;
    } else if (mediaAction === 'previous') {
      englishText = 'Yes sir, playing the previous song.';
      spokenText = isHindiMode ? 'जी सर, पिछला गाना चला रहा हूँ।' : englishText;
    } else {
      englishText = searchQuery ? `Yes sir, playing "${searchQuery}" now.` : 'Yes sir, playing music on your phone now.';
      spokenText = isHindiMode
        ? searchQuery
          ? `जी सर, "${searchQuery}" गाना चला रहा हूँ।`
          : 'जी सर, गाना प्ले कर रहा हूँ।'
        : englishText;
    }
  } else if (intent === 'WHATSAPP_SEND') {
    const hindiHonorific = shortContact === 'Mother' || shortContact === 'Mom' ? 'मॉम' : shortContact === 'Father' || shortContact === 'Dad' ? 'पापा' : targetContact;
    englishText = isFriendTone
      ? `Sending WhatsApp message directly to ${targetContact}: "${msg}".`
      : `Yes sir, sending WhatsApp message directly to ${targetContact}: "${msg}".`;
    spokenText = isHindiMode
      ? isFriendTone
        ? `हो गया दोस्त! ${hindiHonorific} को व्हाट्सएप मैसेज डायरेक्ट भेज रहा हूँ: "${msg}"।`
        : `जी सर, ${hindiHonorific} को व्हाट्सएप मैसेज डायरेक्ट भेज रहा हूँ: "${msg}"।`
      : englishText;
  } else if (intent === 'SEARCH_WEB') {
    englishText = isFriendTone
      ? `Searching "${searchQuery}" on ${appLabel} right now!`
      : `Yes sir, searching "${searchQuery}" inside ${appLabel}.`;
    spokenText = isHindiMode
      ? isFriendTone
        ? `अभी लो भाई, ${appLabel} पर "${searchQuery}" सर्च कर रहा हूँ!`
        : `जी सर, ${appLabel} में "${searchQuery}" सर्च कर रहा हूँ।`
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
  } else if (intent === 'DEVICE_SETTING') {
    if (settingType === 'ringer') {
      englishText = isFriendTone
        ? `Done buddy! Switched phone to ${settingLabel}.`
        : `Yes sir, switching phone to ${settingLabel}.`;
      spokenText = isHindiMode
        ? `जी सर, फोन को ${settingLabel} में बदल दिया गया है।`
        : englishText;
    } else if (settingType === 'flashlight') {
      englishText = `Yes sir, flashlight turned ${settingAction}.`;
      spokenText = isHindiMode
        ? `जी सर, टॉर्च ${settingAction === 'on' ? 'चालू' : 'बंद'} कर दी गई है।`
        : englishText;
    } else {
      const actionVerb = settingAction === 'on' ? 'to turn on' : settingAction === 'off' ? 'to turn off' : '';
      englishText = actionVerb
        ? `Yes sir, opening ${settingLabel} control ${actionVerb} ${settingLabel}.`
        : `Yes sir, opening ${settingLabel} settings.`;
      spokenText = isHindiMode
        ? `जी सर, ${settingLabel} सेटिंग पैनल खोल रहा हूँ।`
        : englishText;
    }
  } else if (intent === 'SYSTEM_DIAGNOSTIC') {
    const bat = deviceContext?.batteryLevel;
    const chg = deviceContext?.isCharging;
    const batStr = typeof bat === 'number' ? `${bat}%${chg ? ' and charging' : ''}` : 'nominal';
    if (lower.includes('battery') || lower.includes('charging')) {
      englishText =
        typeof bat === 'number'
          ? `Yes sir, your phone battery is at ${batStr}.`
          : 'Your browser does not expose battery telemetry here, sir—on the Android APK I can read your exact battery percentage.';
      spokenText = isHindiMode
        ? typeof bat === 'number'
          ? `जी सर, आपके फोन की बैटरी अभी ${bat}% है।`
          : englishText
        : englishText;
    } else {
      englishText = `All systems are online and nominal, sir. Battery: ${batStr}.`;
      spokenText = isHindiMode ? 'सिस्टम के सभी सब-सिस्टम सामान्य रूप से कार्य कर रहे हैं सर।' : englishText;
    }
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
    } else if (
      /\b(date|day|today|time|clock)\b/.test(lower) ||
      lower.includes('samay') ||
      lower.includes('baje') ||
      lower.includes('baja') ||
      lower.includes('tarikh') ||
      lower.includes('taarikh') ||
      lower.includes('din') ||
      lower.includes('aaj')
    ) {
      const now = new Date();
      const dateStrEn =
        deviceContext?.localDate ||
        now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const dateStrHi = now.toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr =
        deviceContext?.localTime ||
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const asksTime = /\b(time|clock)\b/.test(lower) || lower.includes('samay') || lower.includes('baje') || lower.includes('baja');
      const asksDateOrDay =
        /\b(date|day|today)\b/.test(lower) ||
        lower.includes('tarikh') ||
        lower.includes('taarikh') ||
        lower.includes('din') ||
        lower.includes('aaj');

      if (asksTime && asksDateOrDay) {
        englishText = `Yes sir, today is ${dateStrEn}, and the current time is ${timeStr}.`;
        spokenText = isHindiMode ? `जी सर, आज ${dateStrHi} है और अभी समय ${timeStr} हुआ है।` : englishText;
      } else if (asksTime) {
        englishText = `Yes sir, the current time is ${timeStr}.`;
        spokenText = isHindiMode ? `जी सर, अभी समय ${timeStr} हुआ है।` : englishText;
      } else {
        englishText = `Yes sir, today is ${dateStrEn}.`;
        spokenText = isHindiMode ? `जी सर, आज ${dateStrHi} है।` : englishText;
      }
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
    } else if (lower.includes('anime') || lower.includes('isekai') || lower.includes('ishika')) {
      const topList =
        lower.includes('isekai') || lower.includes('ishika')
          ? 'Top Isekai Anime recommendations: That Time I Got Reincarnated as a Slime, Mushoku Tensei, Re:Zero, Overlord, Solo Leveling (dungeon fantasy), Konosuba, No Game No Life, Eminence in Shadow, The Rising of the Shield Hero, and Sword Art Online.'
          : 'Top Anime recommendations: Attack on Titan, Death Note, Fullmetal Alchemist: Brotherhood, Demon Slayer, Jujutsu Kaisen, Solo Leveling, One Piece, Naruto Shippuden, Vinland Saga, and Steins;Gate.';
      englishText = topList;
      spokenText = isHindiMode
        ? lower.includes('isekai') || lower.includes('ishika')
          ? 'शीर्ष इसेकाई एनीमे नाम: टेंसूरा (स्लाइम), मुशोकु तेंसेई, री:ज़ीरो, ओवरलॉर्ड, कोनोसुबा, नो गेम नो लाइफ, एमिनेंस इन शैडो, शील्ड हीरो, स्वॉर्ड आर्ट ऑनलाइन और सोलो लेवलिंग।'
          : 'शीर्ष एनीमे नाम: अटैक ऑन टाइटन, डेथ नोट, फुलमेटल अल्केमिस्ट, डीमन स्लेयर, जुजुत्सु काइसेन, सोलो लेवलिंग, वन पीस, नारुतो शिपूडेन, विनलैंड सागा और स्टाइन्स गेट।'
        : englishText;
    } else {
      const hasQuotaHit = Object.values(modelCooldownUntil).some((until) => Date.now() < until);
      englishText = hasQuotaHit
        ? `Yes sir, I heard "${command}", but today's free Gemini AI quota limit is currently reached. You can check Settings > Secrets to attach a billing-enabled API key, or try again later.`
        : isFriendTone
        ? `Hey buddy, I heard "${command}"! Offline local mode is active right now—full AI answers resume when connected.`
        : `Yes sir, I received "${command}". Local mode is active right now; full AI answers resume once connected.`;
      spokenText = isHindiMode
        ? hasQuotaHit
          ? `जी सर, मैंने "${command}" सुना, लेकिन आज का फ्री एआई कोटा अभी पूरा हो गया है। कृपया Settings > Secrets में API key जांचें या थोड़ी देर बाद प्रयास करें।`
          : isFriendTone
          ? `अरे दोस्त, आपका सवाल "${command}" बढ़िया है! अभी मैं ऑफलाइन लोकल मोड में हूँ—ऑनलाइन कनेक्ट होते ही पूरा जवाब दूँगा।`
          : `जी सर, आपका प्रश्न "${command}" प्राप्त हुआ। अभी लोकल इंजन सक्रिय है; इंटरनेट व एआई लिंक जुड़ते ही उत्तर दिया जाएगा।`
        : englishText;
    }
  }

  return {
    intent,
    englishActionSummary: englishText,
    hindiVoiceReply: spokenText,
    wakeWordDetected: lower.includes(customWakeWord.toLowerCase()),
    actionPayload: {
      target:
        intent === 'LAUNCH_APP' || intent === 'SEARCH_WEB'
          ? appLabel
          : intent === 'DEVICE_SETTING'
          ? settingLabel
          : targetContact,
      recipientPhone: phone,
      message: msg,
      searchQuery: searchQuery || undefined,
      mediaAction,
      volumeLevel: vol,
      brightnessLevel: br,
      appId,
      settingType: settingType || undefined,
      settingAction: settingAction || undefined,
      ringerMode,
      terminalCommand: intent === 'SYSTEM_TERMINAL' ? 'status --report' : undefined,
    },
    quickFollowUps: ['Call Mom', 'Search on YouTube', 'Turn on Wi-Fi'],
  };
}

// API health endpoint
app.get('/api/health', (req, res) => {
  const nowMs = Date.now();
  const activeCooldowns = Object.entries(modelCooldownUntil)
    .filter(([, until]) => until > nowMs)
    .map(([model, until]) => ({ model, secondsRemaining: Math.ceil((until - nowMs) / 1000) }));
  res.json({
    status: 'online',
    assistant: 'J.A.R.V.I.S.',
    version: '4.3.0',
    hasApiKey: Boolean(apiKey),
    inRateLimitCooldown: activeCooldowns.length === MODEL_CANDIDATES.length,
    modelCooldowns: activeCooldowns,
    timestamp: new Date().toISOString(),
    lastGeminiError: lastGeminiError || null,
  });
});

// Process Voice / Text command
app.post('/api/jarvis/process', async (req, res) => {
  try {
    const {
      command,
      contacts = [],
      currentSystemState = {},
      deviceContext = {},
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

    const now = new Date();
    const resolvedDeviceContext = {
      localDate:
        deviceContext?.localDate ||
        now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      localDay: deviceContext?.localDay || now.toLocaleDateString('en-US', { weekday: 'long' }),
      localTime:
        deviceContext?.localTime ||
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      timezone: deviceContext?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local',
      isoTimestamp: deviceContext?.isoTimestamp || now.toISOString(),
      batteryLevel: deviceContext?.batteryLevel ?? currentSystemState?.batteryLevel,
      isCharging: deviceContext?.isCharging ?? currentSystemState?.isCharging,
      deviceModel: deviceContext?.deviceModel || 'Android / Web Client',
      androidVersion: deviceContext?.androidVersion,
      memoryUsagePercent: deviceContext?.memoryUsagePercent ?? currentSystemState?.memoryUsage,
    };

    // Immediate deterministic handling for explicit language-switch commands
    const explicitLangSwitch = detectLanguageSwitch(command);
    if (explicitLangSwitch) {
      const localLangResult = parseCommandLocally(
        command,
        customWakeWord,
        contacts,
        personalityMode,
        activeLanguage,
        activeLanguageCode,
        resolvedDeviceContext
      );
      res.json(localLangResult);
      return;
    }

    const availableModels = MODEL_CANDIDATES.filter((m) => Date.now() >= (modelCooldownUntil[m] || 0));

    // 1. If no API key or all models are currently in quota cooldown, use local NLP engine
    if (!apiKey || availableModels.length === 0) {
      const localResult = parseCommandLocally(
        command,
        customWakeWord,
        contacts,
        personalityMode,
        activeLanguage,
        activeLanguageCode,
        resolvedDeviceContext
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

LIVE DEVICE CLOCK & TELEMETRY (REAL-TIME FROM USER'S PHONE):
${JSON.stringify(resolvedDeviceContext, null, 2)}

CLOCK, DATE, DAY & TELEMETRY ACCESS (CRITICAL):
- You HAVE FULL, REAL-TIME ACCESS to the user's current date (${resolvedDeviceContext.localDate}), day of the week (${resolvedDeviceContext.localDay}), local time (${resolvedDeviceContext.localTime}), timezone (${resolvedDeviceContext.timezone}), battery (${resolvedDeviceContext.batteryLevel ?? 'unknown'}%), and all device telemetry above.
- NEVER say "I don't have access to the real-time clock or date" or offer to open Calendar when the user asks for today's date, day, or time! Answer directly and accurately using LIVE DEVICE CLOCK & TELEMETRY.

CONFIGURED WAKE WORD: "${customWakeWord}"

TASK CLASSIFICATION:
- SET_LANGUAGE: ONLY when user explicitly asks to switch/turn to Hindi, English, or another language (e.g. "turn to Hindi", "speak in Hindi", "switch to Spanish", "turn back to English").
- DEVICE_SETTING: When asked to control phone hardware/settings or sound profile:
  * Ringer/sound modes ("vibration mode", "vibrate mode", "silent mode", "normal mode", "ring mode") -> settingType: "ringer", settingAction: "vibrate"|"silent"|"normal", ringerMode: "vibrate"|"silent"|"normal".
  * Connectivity & hardware ("turn on wifi", "turn off wifi", "turn off network", "turn on mobile data", "turn on bluetooth", "turn on flashlight", "turn off torch", "airplane mode", "location", "battery saver") -> settingType: "wifi"|"network"|"bluetooth"|"flashlight"|"airplane"|"location"|"battery_saver", settingAction: "on"|"off"|"toggle"|"open".
- CALL_CONTACT: When asked to call, dial, ring, or phone a person or number ("Jarvis call Mom", "कॉल करो मॉम को", "call dad", "call Priya"). Executes a direct call immediately without asking confirmation. Do NOT use CALL_CONTACT when the user asks to "open call", "open dialer", or "battery in phone".
- INSTAGRAM_SEND: When asked to open Instagram and send a DM/message to someone ("open Instagram and send a message to Sumer that the app is fine"). Set actionPayload.target (recipient name), actionPayload.message (message text), actionPayload.appId ("instagram").
- PLAY_MUSIC: When asked to play/pause/skip a song or music ("play song", "play Kesariya song", "pause music", "next song", "गाना चलाओ"). Set actionPayload.mediaAction ("play"|"pause"|"next"|"previous") and actionPayload.searchQuery (song name or empty).
- WHATSAPP_SEND: When asked to message, text, or WhatsApp someone ("message to my mom...", "मॉम को व्हाट्सएप पे मैसेज भेजो...", "send WhatsApp to dad..."). Extract target contact, phone, and clean message body for direct auto-sending without user confirmation.
- SEARCH_WEB: When asked to search, find, watch, or play a query inside YouTube, Spotify, Google, Maps, or Play Store ("YouTube search Hyderabad Diaries", "सर्च हैदराबाद डायरीज ऑन YouTube", "play Kesariya on Spotify", "search weather on Google"). Set actionPayload.appId ("youtube"|"spotify"|"google"|"maps"|"playstore"), actionPayload.target (clean app label), and actionPayload.searchQuery (clean search keywords).
- LAUNCH_APP: When asked to open/launch/play ANY app installed on the user's phone ("open Instagram", "open Insta", "open Calendar", "open Call", "open Phone", "open Truecaller", "open Google", "open Free Fire", "open Spotify", "open YouTube", "open WhatsApp", "open Paytm", "open Snapchat", etc.) without a specific search query. Set actionPayload.target to the clean human-readable app name and actionPayload.appId to a canonical id or lowercase name.
- SYSTEM_VOLUME: Adjust volume (0-100, mute, unmute).
- SYSTEM_BRIGHTNESS: Adjust display brightness (10-100).
- SYSTEM_DIAGNOSTIC: Check phone battery level, charging state, network status, or system diagnostics using LIVE DEVICE CLOCK & TELEMETRY.
- SYSTEM_TERMINAL: Run bash/diagnostics/ping commands.
- GENERAL_CONVERSATION: Answer any knowledge question, today's date/day/time, math, coding, advice, joke, or friendly chat completely!

Produce pure structured JSON conforming to the schema.`;

    const userMessage = `User command: "${command}"\nActive language: "${activeLanguage}" (${activeLanguageCode})\nConfigured wake word: "${customWakeWord}"\nCurrent user local date/day/time: ${resolvedDeviceContext.localDate}, ${resolvedDeviceContext.localTime} (${resolvedDeviceContext.timezone})`;

    let parsed: any;
    const jsonSchemaConfig = {
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: {
            type: Type.STRING,
            description: 'Primary intent (SET_LANGUAGE, DEVICE_SETTING, CALL_CONTACT, INSTAGRAM_SEND, PLAY_MUSIC, WHATSAPP_SEND, SEARCH_WEB, LAUNCH_APP, SYSTEM_VOLUME, SYSTEM_BRIGHTNESS, SYSTEM_TERMINAL, SYSTEM_DIAGNOSTIC, GENERAL_CONVERSATION)',
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
              target: { type: Type.STRING, description: 'Contact name, target app, device setting label, or target language' },
              recipientPhone: { type: Type.STRING, description: 'Phone number for Call or WhatsApp' },
              message: { type: Type.STRING, description: 'WhatsApp message body' },
              appId: { type: Type.STRING, description: 'Canonical app identifier or lowercase app name' },
              settingType: { type: Type.STRING, description: 'ringer, wifi, network, bluetooth, flashlight, airplane, hotspot, location, battery_saver' },
              settingAction: { type: Type.STRING, description: 'on, off, toggle, open, vibrate, silent, normal' },
              ringerMode: { type: Type.STRING, description: 'vibrate, silent, or normal when settingType is ringer' },
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
    };

    for (const modelName of availableModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userMessage,
          config: jsonSchemaConfig,
        });
        parsed = extractJsonObject(response.text || '');
        lastGeminiError = '';
        break;
      } catch (apiErr: any) {
        const errMsg = String(apiErr?.message || apiErr || '');
        lastGeminiError = `[${modelName}] ${errMsg}`;
        const isQuota =
          apiErr?.status === 'RESOURCE_EXHAUSTED' ||
          apiErr?.statusCode === 429 ||
          errMsg.includes('429') ||
          errMsg.toLowerCase().includes('quota');

        if (isQuota) {
          const isDailyCap = errMsg.includes('GenerateRequestsPerDay') || errMsg.toLowerCase().includes('per day');
          modelCooldownUntil[modelName] = Date.now() + (isDailyCap ? 10 * 60 * 1000 : 60 * 1000);
          console.log(`[JARVIS CORE] ${modelName} quota/rate-limit hit; failing over immediately.`);
          continue;
        }

        // Retry once on the same model with plain text (in case responseSchema/JSON formatting threw)
        try {
          const retryResp = await ai.models.generateContent({
            model: modelName,
            contents: `Answer the user clearly and directly in ${activeLanguage} (1-5 sentences, plain spoken text, no markdown bullets).\n${userMessage}`,
            config: {
              systemInstruction: `You are J.A.R.V.I.S., a helpful AI assistant. ${personalityInstruction} Current date/time: ${resolvedDeviceContext.localDate}, ${resolvedDeviceContext.localTime} (${resolvedDeviceContext.timezone}). Speak strictly in ${activeLanguage}.`,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          const plainAnswer = String(retryResp.text || '').trim();
          if (plainAnswer) {
            lastGeminiError = '';
            parsed = {
              intent: 'GENERAL_CONVERSATION',
              englishActionSummary: plainAnswer,
              hindiVoiceReply: plainAnswer,
              wakeWordDetected: command.toLowerCase().includes(customWakeWord.toLowerCase()),
              actionPayload: {},
              quickFollowUps: ['Open YouTube', 'Open Google', 'What time is it?'],
            };
            break;
          }
        } catch (retryErr: any) {
          lastGeminiError = `[${modelName}] ${errMsg} | Retry: ${String(retryErr?.message || retryErr)}`;
        }
      }
    }

    const localCandidate = parseCommandLocally(
      command,
      customWakeWord,
      contacts,
      personalityMode,
      activeLanguage,
      activeLanguageCode,
      resolvedDeviceContext
    );

    if (!parsed) {
      console.log('[JARVIS CORE] All Gemini models unavailable, handled by local engine:', lastGeminiError);
      parsed = localCandidate;
    } else {
      // Guardrail: never let a plain-text fallback or missed Hindi phrasing downgrade an actionable phone command
      const actionableIntents = new Set([
        'STANDBY_BACKGROUND',
        'CALL_CONTACT',
        'INSTAGRAM_SEND',
        'PLAY_MUSIC',
        'WHATSAPP_SEND',
        'SEARCH_WEB',
        'DEVICE_SETTING',
        'LAUNCH_APP',
        'SYSTEM_VOLUME',
        'SYSTEM_BRIGHTNESS',
      ]);
      if (parsed.intent === 'GENERAL_CONVERSATION' && actionableIntents.has(localCandidate.intent)) {
        parsed.intent = localCandidate.intent;
        parsed.actionPayload = {
          ...(localCandidate.actionPayload || {}),
          ...(parsed.actionPayload || {}),
        };
      }
      parsed.actionPayload = parsed.actionPayload || {};
      if (parsed.intent === 'SEARCH_WEB' || parsed.intent === 'PLAY_MUSIC') {
        if (!parsed.actionPayload.searchQuery && localCandidate.actionPayload?.searchQuery) {
          parsed.actionPayload.searchQuery = localCandidate.actionPayload.searchQuery;
        }
        if (!parsed.actionPayload.mediaAction && localCandidate.actionPayload?.mediaAction) {
          parsed.actionPayload.mediaAction = localCandidate.actionPayload.mediaAction;
        }
        if (!parsed.actionPayload.appId && localCandidate.actionPayload?.appId) {
          parsed.actionPayload.appId = localCandidate.actionPayload.appId;
        }
        if (!parsed.actionPayload.target && localCandidate.actionPayload?.target) {
          parsed.actionPayload.target = localCandidate.actionPayload.target;
        }
      } else if (parsed.intent === 'CALL_CONTACT') {
        if (!parsed.actionPayload.target && localCandidate.actionPayload?.target) {
          parsed.actionPayload.target = localCandidate.actionPayload.target;
        }
        if (!parsed.actionPayload.recipientPhone && localCandidate.actionPayload?.recipientPhone) {
          parsed.actionPayload.recipientPhone = localCandidate.actionPayload.recipientPhone;
        }
      } else if (parsed.intent === 'WHATSAPP_SEND' || parsed.intent === 'INSTAGRAM_SEND') {
        if (!parsed.actionPayload.target && localCandidate.actionPayload?.target) {
          parsed.actionPayload.target = localCandidate.actionPayload.target;
        }
        if (!parsed.actionPayload.recipientPhone && localCandidate.actionPayload?.recipientPhone) {
          parsed.actionPayload.recipientPhone = localCandidate.actionPayload.recipientPhone;
        }
        if ((!parsed.actionPayload.message || parsed.actionPayload.message === 'Hello!') && localCandidate.actionPayload?.message) {
          parsed.actionPayload.message = localCandidate.actionPayload.message;
        }
      }
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
      req.body?.activeLanguageCode || 'en-US',
      req.body?.deviceContext || {}
    );
    res.json(fallback);
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    process.env.DISABLE_HMR = 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
    });
    // HMR is intentionally disabled in preview; provide a compatible Vite client without WebSocket connections
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (!url || (url[0] !== '.' && url[0] !== '/')) return url;
  const pathname = url.replace(/[?#].*$/, '');
  const parsed = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (parsed.search ? '&' + parsed.search.slice(1) : '') + (parsed.hash || '');
}
export class ErrorOverlay extends HTMLElement {}
`);
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
