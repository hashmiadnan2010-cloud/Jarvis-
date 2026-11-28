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

export function getJarvisApiBaseUrls(): string[] {
  if (typeof window === 'undefined') return [''];
  const { protocol, hostname, port } = window.location;
  const isCapacitorNative =
    protocol === 'capacitor:' ||
    (hostname === 'localhost' && port !== '3000');

  if (isCapacitorNative) {
    return [
      'https://ais-pre-p4jos3plr3cl67xao2hvll-109399473900.asia-northeast1.run.app',
      'https://ais-dev-p4jos3plr3cl67xao2hvll-109399473900.asia-northeast1.run.app',
    ];
  }
  return [''];
}

export function isDirectClockQuery(command: string): boolean {
  const lower = command.toLowerCase().trim();
  const hasTopicSuffix = /\b(to\s+visit|in\s+history|of\s+the\s+year|for\s+|movie|anime|game|release|born)\b/.test(lower);
  if (hasTopicSuffix) return false;
  return (
    /\b(what(?:'s| is)\s+(?:the\s+)?(?:current\s+)?(?:time|date|day)|tell\s+me\s+(?:the\s+)?(?:date|day|time)|date\s+(?:and|&)\s+day|day\s+(?:and|&)\s+date|today(?:'s)?\s+(?:date|day)|current\s+time)\b/.test(lower) ||
    /^(?:date|day|time|today|aaj\s+(?:kya\s+)?(?:tarikh|taarikh|din)|abhi\s+(?:kya\s+)?(?:time|samay)|kitne\s+baje)/.test(lower) ||
    /(?:tarikh|taarikh|kaun\s+sa\s+din|kya\s+din|samay\s+kya|baje\s+hai)/.test(lower)
  );
}

export function isHighConfidenceFastAction(command: string, parsedLocal: { intent?: string; actionPayload?: { searchQuery?: string } }): boolean {
  const lower = command.toLowerCase().trim();
  const intent = parsedLocal?.intent || 'GENERAL_CONVERSATION';
  if (intent === 'SET_LANGUAGE' || intent === 'DEVICE_SETTING') return true;
  if (intent === 'LAUNCH_APP') {
    return /\b(open|launch|start|kholo|chalu|play)\b|खोलो|चलाओ|चालू/i.test(lower);
  }
  if (intent === 'SEARCH_WEB') {
    return Boolean(parsedLocal?.actionPayload?.searchQuery);
  }
  if (intent === 'CALL_CONTACT') {
    return !/\b(what|why|how|who|when|which|explain)\b|क्या|क्यों|कैसे/.test(lower);
  }
  if (intent === 'WHATSAPP_SEND') {
    return (
      (/\b(whatsapp|whatsap|send|message|text|bhej|bhejo|sandesh)\b/.test(lower) ||
        /व्हाट्सएप|वॉट्सएप|वाट्सएप|मैसेज|संदेश|भेजो|भेज/.test(command)) &&
      !/\b(what\s+is|why|how\s+does|explain)\b/.test(lower)
    );
  }
  if (intent === 'SYSTEM_VOLUME' || intent === 'SYSTEM_BRIGHTNESS' || intent === 'SYSTEM_TERMINAL' || intent === 'SYSTEM_DIAGNOSTIC') {
    return !/\b(why|explain|how\s+does|definition|meaning)\b/.test(lower);
  }
  if (intent === 'GENERAL_CONVERSATION') {
    return isDirectClockQuery(command);
  }
  return false;
}

function resolveDeviceSettingClient(lower: string): {
  settingType: string;
  settingAction: 'on' | 'off' | 'toggle' | 'open' | 'vibrate' | 'silent' | 'normal';
  ringerMode?: 'normal' | 'vibrate' | 'silent';
  label: string;
} | null {
  const wantsOff = /\b(off|disable|band|close|stop)\b/.test(lower);
  const wantsOn = /\b(on|enable|chalu|start)\b/.test(lower);
  const hasActionVerb = wantsOn || wantsOff || /\b(switch|turn|toggle|connect|open|kholo|karo|settings?)\b/.test(lower);
  const onOff: 'on' | 'off' | 'open' = wantsOff ? 'off' : wantsOn ? 'on' : 'open';

  if (/\b(vibrat(?:e|ion)|vibration\s*mode|vibrate\s*mode)\b/.test(lower)) {
    return { settingType: 'ringer', settingAction: 'vibrate', ringerMode: 'vibrate', label: 'Vibration Mode' };
  }
  if (/\b(silent\s*mode|silent|do\s*not\s*disturb|dnd)\b/.test(lower) && !/\bopen\s+settings\b/.test(lower)) {
    return { settingType: 'ringer', settingAction: 'silent', ringerMode: 'silent', label: 'Silent Mode' };
  }
  if (/\b(normal\s*mode|ring\s*mode|ringer\s*mode|sound\s*mode|general\s*mode|unmute\s*phone)\b/.test(lower)) {
    return { settingType: 'ringer', settingAction: 'normal', ringerMode: 'normal', label: 'Normal Mode' };
  }
  if ((/\b(wi[\s-]?fi|wifi|waifai|vifi|yfi)\b/.test(lower) || /वाई[\s-]?फाई|वाईफाई/.test(lower)) && hasActionVerb) {
    return { settingType: 'wifi', settingAction: onOff, label: 'Wi-Fi' };
  }
  if (/\b(mobile\s*data|cellular\s*data|internet|network|net)\b/.test(lower) && hasActionVerb) {
    return { settingType: 'network', settingAction: onOff, label: 'Mobile Network' };
  }
  if (/\b(bluetooth)\b/.test(lower) && hasActionVerb) {
    return { settingType: 'bluetooth', settingAction: onOff, label: 'Bluetooth' };
  }
  if (/\b(flashlight|torch|flash)\b/.test(lower) && hasActionVerb) {
    return { settingType: 'flashlight', settingAction: wantsOff ? 'off' : 'on', label: 'Flashlight' };
  }
  if (/\b(airplane\s*mode|flight\s*mode)\b/.test(lower)) {
    return { settingType: 'airplane', settingAction: onOff, label: 'Airplane Mode' };
  }
  if (/\b(hotspot)\b/.test(lower) && hasActionVerb) {
    return { settingType: 'hotspot', settingAction: onOff, label: 'Hotspot' };
  }
  if (/\b(location|gps)\b/.test(lower) && hasActionVerb) {
    return { settingType: 'location', settingAction: onOff, label: 'Location' };
  }
  if (/\b(battery\s*saver|power\s*sav(?:ing|er))\b/.test(lower)) {
    return { settingType: 'battery_saver', settingAction: onOff, label: 'Battery Saver' };
  }
  return null;
}

const MOTHER_ALIAS_RE =
  /\b(mom|mommy|mama|mummy|mata|mataji|mother|maa|amma|ammi)\b|मॉम|मॉम्मी|मम्मी|माँ|मां|माता|अम्मा|अम्मी/;
const FATHER_ALIAS_RE =
  /\b(dad|daddy|papa|pita|pitaji|father|pa|abba)\b|पापा|डैड|डैडी|पिता|अब्बा/;

function matchContactClient(lower: string, contacts: Contact[] = [], rawCommand: string = '') {
  const probe = `${lower} ${rawCommand}`.trim();
  const isMotherAlias = MOTHER_ALIAS_RE.test(probe);
  const isFatherAlias = FATHER_ALIAS_RE.test(probe);

  // 1. Prefer real synced phonebook contacts (non-placeholder) matching exact name, relation, or family alias
  const orderedContacts = [
    ...contacts.filter((c) => !String(c.id || '').startsWith('c-')),
    ...contacts.filter((c) => String(c.id || '').startsWith('c-')),
  ];

  for (const c of orderedContacts) {
    const rel = String(c.relation || '').toLowerCase().trim();
    const name = String(c.name || '').toLowerCase().trim();
    const entryIsMom =
      rel === 'mother' ||
      MOTHER_ALIAS_RE.test(rel) ||
      MOTHER_ALIAS_RE.test(name);
    const entryIsDad =
      rel === 'father' ||
      FATHER_ALIAS_RE.test(rel) ||
      FATHER_ALIAS_RE.test(name);

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

function extractSpokenPersonNameClient(command: string): string {
  const cleaned = command
    .replace(/^(?:hey|hay|he|ok|hi|hello|हे)[,\s]+(?:jarvis|जार्विस|जर्विस)[,\s:-]*/i, '')
    .replace(
      /\b(?:please|kindly|direct|directly|abhi|turant|jaldi|karo|kar\s*do|lagao|laga\s*do|call|dial|ring|phone|whatsapp|whatsap|send|message|text|bhejo|bhej\s*do|to|my|ko|pe|par)\b/gi,
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

function extractAppSearchClient(command: string): { appId: string; appLabel: string; searchQuery: string } | null {
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

function extractWhatsAppMessageClient(command: string, contactNameHint: string): string {
  let msg = command.trim();
  const colonIdx = msg.indexOf(':');
  if (colonIdx > 0 && colonIdx < msg.length - 1) {
    const afterColon = msg.slice(colonIdx + 1).trim();
    if (afterColon.length >= 1) return afterColon;
  }

  // Hindi/Hinglish pattern: "... ki <message>" or "... कि <message>"
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

  msg = msg.replace(/^[,.\s:-]+|[,.\s:-]+$/g, '').replace(/\s+/g, ' ').trim();
  return msg;
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

function resolveRequestedAppClient(command: string): { appId: string; appLabel: string } {
  const lower = command.toLowerCase();
  for (const rule of APP_ALIAS_RULES) {
    if (rule.patterns.some((re) => re.test(lower))) {
      return { appId: rule.appId, appLabel: rule.appLabel };
    }
  }

  let extracted = command
    .replace(/^(?:hey|hi|ok|please|kindly|jarvis)[,\s]+/gi, '')
    .replace(/^.*?\b(?:open|launch|start|run|play|kholo|chalu\s*karo|chalu)\b\s*/i, '')
    .replace(/\b(?:on\s+my\s+phone|in\s+my\s+phone|on\s+phone|my\s+phone|the\s+app|application|app|please|jarvis|kholo|karo|kar\s*do)\b/gi, '')
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (extracted && extracted.length >= 2) {
    const label = extracted
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return {
      appId: extracted.toLowerCase(),
      appLabel: label,
    };
  }

  return { appId: 'google', appLabel: 'Google' };
}

export function parseCommandLocallyClient(
  command: string,
  customWakeWord: string = 'Jarvis',
  contacts: Contact[] = [],
  personalityMode: PersonalityMode = 'balanced',
  activeLanguage: string = 'English',
  activeLanguageCode: string = 'en-US',
  deviceContext?: {
    localDate?: string;
    localTime?: string;
    batteryLevel?: number;
    isCharging?: boolean;
    ringerMode?: 'normal' | 'vibrate' | 'silent';
    wifiEnabled?: boolean;
    networkConnected?: boolean;
    networkType?: string;
  }
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
  let targetContact = 'Mom';
  let shortContact = 'Mom';
  let phone = '';
  let searchQuery = '';

  const matched = matchContactClient(lower, contacts, command);
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
      const spokenName = extractSpokenPersonNameClient(command);
      if (spokenName) {
        targetContact = spokenName;
        shortContact = spokenName;
      }
    }
  }

  let msg = extractWhatsAppMessageClient(command, targetContact);

  let vol = 75;
  let br = 80;
  let appId = 'whatsapp';
  let appLabel = 'WhatsApp';
  let settingType = '';
  let settingAction = '';
  let settingLabel = '';
  let ringerMode: 'normal' | 'vibrate' | 'silent' | undefined;

  const isAppLaunchCommand =
    /\b(open|launch|kholo|start|chalu)\b|खोलो|चलाओ|चालू/i.test(lower) ||
    /\bplay\s+(free\s*f\s*ire|freefire|bgmi|pubg)\b/i.test(lower);
  const hasPhoneNumber = /\d{4,}/.test(lower);
  const matchedSetting = resolveDeviceSettingClient(lower);
  const appSearch = extractAppSearchClient(command);
  const isBatteryOrDiagnostic =
    /\b(battery|charging|diagnostic|diagnostics)\b/.test(lower) ||
    (/\bstatus\b/.test(lower) && !lower.includes('whatsapp'));

  const isCallCue =
    /\b(call|dial|ring)\b/.test(lower) ||
    /(call\s*karo|call\s*lagao|phone\s*karo|phone\s*lagao)/.test(lower) ||
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

  if (matchedSetting) {
    intent = 'DEVICE_SETTING';
    settingType = matchedSetting.settingType;
    settingAction = matchedSetting.settingAction;
    settingLabel = matchedSetting.label;
    ringerMode = matchedSetting.ringerMode;
  } else if (isBatteryOrDiagnostic) {
    intent = 'SYSTEM_DIAGNOSTIC';
  } else if (appSearch) {
    intent = 'SEARCH_WEB';
    appId = appSearch.appId;
    appLabel = appSearch.appLabel;
    searchQuery = appSearch.searchQuery;
  } else if (
    isCallCue &&
    (!isAppLaunchCommand || Boolean(matched) || hasPhoneNumber) &&
    !lower.includes('app') &&
    !lower.includes('whatsapp') &&
    !/व्हाट्सएप|वॉट्सएप/.test(command) &&
    !lower.includes('message') &&
    !/मैसेज|संदेश/.test(command)
  ) {
    intent = 'CALL_CONTACT';
  } else if (isWhatsAppCue) {
    intent = 'WHATSAPP_SEND';
    if (!msg || msg.length < 2) {
      msg = 'Hello!';
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
  } else if (isAppLaunchCommand) {
    intent = 'LAUNCH_APP';
    const resolvedApp = resolveRequestedAppClient(command);
    appId = resolvedApp.appId;
    appLabel = resolvedApp.appLabel;
  }

  let hindiVoiceReply = '';
  let englishActionSummary = '';

  if (intent === 'CALL_CONTACT') {
    const hindiHonorific = shortContact === 'Mother' || shortContact === 'Mom' ? 'मॉम' : shortContact === 'Father' || shortContact === 'Dad' ? 'पापा' : targetContact;
    englishActionSummary = isFriendTone
      ? `Calling ${targetContact} directly right now!`
      : `Yes sir, placing a direct call to ${targetContact}.`;
    hindiVoiceReply = isHindiMode
      ? isFriendTone
        ? `अरे बिल्कुल भाई, ${hindiHonorific} को अभी डायरेक्ट कॉल लगा रहा हूँ।`
        : `जी सर, ${hindiHonorific} को डायरेक्ट कॉल लगा रहा हूँ।`
      : englishActionSummary;
  } else if (intent === 'WHATSAPP_SEND') {
    const hindiHonorific = shortContact === 'Mother' || shortContact === 'Mom' ? 'मॉम' : shortContact === 'Father' || shortContact === 'Dad' ? 'पापा' : targetContact;
    englishActionSummary = isFriendTone
      ? `Sending WhatsApp message directly to ${targetContact}: "${msg}".`
      : `Yes sir, sending WhatsApp message directly to ${targetContact}: "${msg}".`;
    hindiVoiceReply = isHindiMode
      ? isFriendTone
        ? `हो गया दोस्त! ${hindiHonorific} को व्हाट्सएप मैसेज डायरेक्ट भेज रहा हूँ: "${msg}"।`
        : `जी सर, ${hindiHonorific} को व्हाट्सएप मैसेज डायरेक्ट भेज रहा हूँ: "${msg}"।`
      : englishActionSummary;
  } else if (intent === 'SEARCH_WEB') {
    englishActionSummary = isFriendTone
      ? `Searching "${searchQuery}" on ${appLabel} right now!`
      : `Yes sir, searching "${searchQuery}" inside ${appLabel}.`;
    hindiVoiceReply = isHindiMode
      ? isFriendTone
        ? `अभी लो भाई, ${appLabel} पर "${searchQuery}" सर्च कर रहा हूँ!`
        : `जी सर, ${appLabel} में "${searchQuery}" सर्च कर रहा हूँ।`
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
  } else if (intent === 'DEVICE_SETTING') {
    if (settingType === 'ringer') {
      englishActionSummary = isFriendTone
        ? `Done buddy! Switched phone to ${settingLabel}.`
        : `Yes sir, switching phone to ${settingLabel}.`;
      hindiVoiceReply = isHindiMode
        ? `जी सर, फोन को ${settingLabel} में बदल दिया गया है।`
        : englishActionSummary;
    } else if (settingType === 'flashlight') {
      englishActionSummary = `Yes sir, flashlight turned ${settingAction}.`;
      hindiVoiceReply = isHindiMode
        ? `जी सर, टॉर्च ${settingAction === 'on' ? 'चालू' : 'बंद'} कर दी गई है।`
        : englishActionSummary;
    } else {
      const actionVerb = settingAction === 'on' ? 'to turn on' : settingAction === 'off' ? 'to turn off' : '';
      englishActionSummary = actionVerb
        ? `Yes sir, opening ${settingLabel} control ${actionVerb} ${settingLabel}.`
        : `Yes sir, opening ${settingLabel} settings.`;
      hindiVoiceReply = isHindiMode
        ? `जी सर, ${settingLabel} सेटिंग पैनल खोल रहा हूँ।`
        : englishActionSummary;
    }
  } else if (intent === 'SYSTEM_DIAGNOSTIC') {
    const bat = deviceContext?.batteryLevel;
    const chg = deviceContext?.isCharging;
    const batStr =
      typeof bat === 'number'
        ? `${bat}%${chg ? ' and charging' : ''}`
        : 'currently unavailable in browser telemetry';
    const netStr =
      deviceContext?.networkConnected === false
        ? 'Offline'
        : deviceContext?.networkType
        ? deviceContext.networkType.toUpperCase()
        : 'Online';
    const ringerStr = deviceContext?.ringerMode ? `, Sound: ${deviceContext.ringerMode}` : '';

    if (lower.includes('battery') || lower.includes('charging')) {
      englishActionSummary =
        typeof bat === 'number'
          ? `Yes sir, your phone battery is at ${batStr}.`
          : 'Your browser does not expose battery telemetry here, sir—on the Android APK I can read your exact phone battery percentage.';
      hindiVoiceReply = isHindiMode
        ? typeof bat === 'number'
          ? `जी सर, आपके फोन की बैटरी अभी ${bat}% है${chg ? ' और चार्ज हो रही है' : ''}।`
          : 'सर, ब्राउज़र बैटरी जानकारी नहीं दे रहा है—एंड्रॉयड ऐप में मैं आपकी सही बैटरी प्रतिशत बता सकता हूँ।'
        : englishActionSummary;
    } else {
      englishActionSummary = `All systems nominal, sir. Battery: ${batStr}, Network: ${netStr}${ringerStr}.`;
      hindiVoiceReply = isHindiMode
        ? `सिस्टम सामान्य है सर। बैटरी ${typeof bat === 'number' ? `${bat}%` : 'ऑनलाइन'}, नेटवर्क ${netStr}।`
        : englishActionSummary;
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
      englishActionSummary = `Yes sir, ${a} ${op} ${b} equals ${res}.`;
      hindiVoiceReply = isHindiMode ? `जी सर, ${a} और ${b} का उत्तर ${res} है।` : englishActionSummary;
    } else if (isDirectClockQuery(command)) {
      const now = new Date();
      const dateStrEn =
        deviceContext?.localDate ||
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      const dateStrHi = now.toLocaleDateString('hi-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeStr =
        deviceContext?.localTime ||
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      const asksTime = /\b(time|clock)\b/.test(lower) || lower.includes('samay') || lower.includes('baje');
      const asksDateOrDay =
        /\b(date|day|today)\b/.test(lower) ||
        lower.includes('tarikh') ||
        lower.includes('taarikh') ||
        lower.includes('din') ||
        lower.includes('aaj');

      if (asksTime && asksDateOrDay) {
        englishActionSummary = `Yes sir, today is ${dateStrEn}, and the current time is ${timeStr}.`;
        hindiVoiceReply = isHindiMode ? `जी सर, आज ${dateStrHi} है और अभी समय ${timeStr} हुआ है।` : englishActionSummary;
      } else if (asksTime) {
        englishActionSummary = `Yes sir, the current time is ${timeStr}.`;
        hindiVoiceReply = isHindiMode ? `जी सर, अभी समय ${timeStr} हुआ है।` : englishActionSummary;
      } else {
        englishActionSummary = `Yes sir, today is ${dateStrEn}.`;
        hindiVoiceReply = isHindiMode ? `जी सर, आज ${dateStrHi} है।` : englishActionSummary;
      }
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
    } else if (lower.includes('anime') || lower.includes('isekai') || lower.includes('ishika')) {
      englishActionSummary =
        lower.includes('isekai') || lower.includes('ishika')
          ? 'Top Isekai Anime recommendations: That Time I Got Reincarnated as a Slime, Mushoku Tensei, Re:Zero, Overlord, Konosuba, No Game No Life, Eminence in Shadow, The Rising of the Shield Hero, Sword Art Online, and Solo Leveling.'
          : 'Top Anime recommendations: Attack on Titan, Death Note, Fullmetal Alchemist: Brotherhood, Demon Slayer, Jujutsu Kaisen, Solo Leveling, One Piece, Naruto Shippuden, Vinland Saga, and Steins;Gate.';
      hindiVoiceReply = isHindiMode
        ? lower.includes('isekai') || lower.includes('ishika')
          ? 'शीर्ष इसेकाई एनीमे नाम: टेंसूरा (स्लाइम), मुशोकु तेंसेई, री:ज़ीरो, ओवरलॉर्ड, कोनोसुबा, नो गेम नो लाइफ, एमिनेंस इन शैडो, शील्ड हीरो, स्वॉर्ड आर्ट ऑनलाइन और सोलो लेवलिंग।'
          : 'शीर्ष एनीमे नाम: अटैक ऑन टाइटन, डेथ नोट, फुलमेटल अल्केमिस्ट, डीमन स्लेयर, जुजुत्सु काइसेन, सोलो लेवलिंग, वन पीस, नारुतो शिपूडेन, विनलैंड सागा और स्टाइन्स गेट।'
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
      target:
        intent === 'LAUNCH_APP' || intent === 'SEARCH_WEB'
          ? appLabel
          : intent === 'DEVICE_SETTING'
          ? settingLabel
          : targetContact,
      recipientPhone: phone,
      message: msg,
      searchQuery: searchQuery || undefined,
      volumeLevel: vol,
      brightnessLevel: br,
      appId,
      settingType: settingType || undefined,
      settingAction: settingAction || undefined,
      ringerMode,
    },
    quickFollowUps: ['Call Mom', 'Search on YouTube', 'Turn on Wi-Fi'],
  };
}
