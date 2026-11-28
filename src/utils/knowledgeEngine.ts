// Live Client-Side & Standalone APK Knowledge Engine
// Answers General Knowledge questions directly via Wikipedia, Infobox Incumbent extraction, DuckDuckGo & Instant Facts
// Works inside downloaded Android APKs without relying on AI Studio's cookie-gated dev preview URL.

export interface KnowledgeAnswer {
  answer: string;
  source: 'curated' | 'wikipedia' | 'duckduckgo' | 'native';
}

const INSTANT_FACTS: Array<{ patterns: RegExp[]; en: string; hi: string }> = [
  {
    patterns: [/\b(prime\s*minister|pm)\s+(?:of\s+)?india\b/i, /भारत\s*के?\s*प्रधानमंत्री/],
    en: 'The current Prime Minister of India is Narendra Modi (serving since May 2014).',
    hi: 'भारत के वर्तमान प्रधानमंत्री नरेंद्र मोदी हैं (मई 2014 से)।',
  },
  {
    patterns: [/\bpresident\s+(?:of\s+)?india\b/i, /भारत\s*के?\s*राष्ट्रपति/],
    en: 'The current President of India is Droupadi Murmu (serving since July 2022).',
    hi: 'भारत की वर्तमान राष्ट्रपति द्रौपदी मुर्मू हैं।',
  },
  {
    patterns: [/\bcapital\s+(?:of\s+)?india\b/i, /भारत\s*की\s*राजधानी/],
    en: 'The capital of India is New Delhi.',
    hi: 'भारत की राजधानी नई दिल्ली है।',
  },
  {
    patterns: [/\bpresident\s+(?:of\s+)?(?:the\s+)?(?:us|usa|united\s*states|america)\b/i, /अमेरिका\s*के?\s*राष्ट्रपति/],
    en: 'The President of the United States is Donald Trump (inaugurated in January 2025).',
    hi: 'संयुक्त राज्य अमेरिका के राष्ट्रपति डोनाल्ड ट्रंप हैं।',
  },
  {
    patterns: [/\bceo\s+(?:of\s+)?google\b/i, /गूगल\s*के?\s*सीईओ/],
    en: 'The CEO of Google and Alphabet is Sundar Pichai.',
    hi: 'गूगल और अल्फाबेट के सीईओ सुंदर पिचाई हैं।',
  },
  {
    patterns: [/\bwho\s+(?:created|built|made|invented)\s+(?:jarvis|you)\b/i],
    en: 'In Marvel lore Tony Stark built J.A.R.V.I.S., and I am customized here as your personal AI assistant.',
    hi: 'मार्वल में टोनी स्टार्क ने जार्विस को बनाया था, और यहाँ मैं आपका पर्सनल AI असिस्टेंट हूँ।',
  },
];

function stripQuestionFiller(raw: string): string {
  return raw
    .replace(/^(?:hey|hi|ok|please|tell\s+me|can\s+you\s+tell\s+me|do\s+you\s+know)\s+/i, '')
    .replace(/^(?:who\s+is|who\s+was|who\s+are|what\s+is|what\s+are|what\s+was|where\s+is|when\s+was|how\s+does|how\s+to|define|explain|about)\s+(?:the\s+|a\s+|an\s+)?/i, '')
    .replace(/^(?:current|present|new)\s+/i, '')
    .replace(/\b(?:right\s+now|currently|today|at\s+present|please|in\s+short)\b/gi, '')
    .replace(/(?:कौन\s*हैं?|क्या\s*है|कहाँ\s*है|कब\s*हुआ|के\s*बारे\s*में\s*बताओ|बताओ|बताइए)/g, ' ')
    .replace(/[?!।.,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanWikiWikitextValue(raw: string): string {
  return raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^/]*\/>/gi, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/['"`]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimToTwoSentences(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentences = clean.match(/[^.!?।]+[.!?।]+/g);
  if (sentences && sentences.length > 0) {
    return sentences.slice(0, 2).join(' ').trim();
  }
  return clean.slice(0, 260).trim();
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number = 2800): Promise<any | null> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    globalThis.clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    globalThis.clearTimeout(timer);
    return null;
  }
}

export async function resolveLiveKnowledgeAnswer(
  question: string,
  langCode: string = 'en-US'
): Promise<KnowledgeAnswer | null> {
  const cleanQ = question.trim();
  if (!cleanQ || cleanQ.length < 3) return null;
  const isHindi = langCode.toLowerCase().startsWith('hi') || /[\u0900-\u097F]/.test(cleanQ);

  // 1. Instant deterministic factual answers (0ms, works even offline)
  for (const item of INSTANT_FACTS) {
    if (item.patterns.some((re) => re.test(cleanQ))) {
      return {
        answer: isHindi ? item.hi : item.en,
        source: 'curated',
      };
    }
  }

  // 2. Live Wikipedia + Infobox Incumbent + DuckDuckGo Instant Answer (when internet is active)
  const subject = stripQuestionFiller(cleanQ) || cleanQ;
  const wikiHost = isHindi ? 'hi.wikipedia.org' : 'en.wikipedia.org';
  const encodedSubj = encodeURIComponent(subject);
  const encodedFull = encodeURIComponent(cleanQ);

  const isWhoIsOffice =
    /\b(who\s+is|current|incumbent)\b/i.test(cleanQ) ||
    /कौन\s*हैं?|वर्तमान/.test(cleanQ);

  try {
    const [ddgData, wikiSearchData] = await Promise.all([
      fetchJsonWithTimeout(
        `https://api.duckduckgo.com/?q=${encodedFull}&format=json&no_html=1&skip_disambig=1`,
        2400
      ),
      fetchJsonWithTimeout(
        `https://${wikiHost}/w/api.php?action=query&list=search&srsearch=${encodedSubj}&utf8=&format=json&origin=*&srlimit=2`,
        2600
      ),
    ]);

    const ddgAnswer = String(ddgData?.Answer || '').trim();
    if (ddgAnswer && ddgAnswer.length > 3 && !ddgAnswer.startsWith('<')) {
      return { answer: trimToTwoSentences(ddgAnswer), source: 'duckduckgo' };
    }

    const ddgAbstract = String(ddgData?.AbstractText || '').trim();

    const firstTitle: string | undefined = wikiSearchData?.query?.search?.[0]?.title;
    const altTitle: string | undefined = wikiSearchData?.query?.search?.[1]?.title;
    const targetTitle = firstTitle || subject;

    if (targetTitle) {
      const encodedTitle = encodeURIComponent(targetTitle.replace(/\s+/g, '_'));
      const [summaryData, revData] = await Promise.all([
        fetchJsonWithTimeout(
          `https://${wikiHost}/api/rest_v1/page/summary/${encodedTitle}`,
          2400
        ),
        isWhoIsOffice
          ? fetchJsonWithTimeout(
              `https://${wikiHost}/w/api.php?action=query&prop=revisions&rvprop=content&rvsection=0&titles=${encodeURIComponent(
                targetTitle
              )}&format=json&origin=*&rvslots=main`,
              2400
            )
          : Promise.resolve(null),
      ]);

      // Extract Wikipedia infobox incumbent / officeholder if this is an office/role page
      if (revData?.query?.pages) {
        const pageObj = Object.values(revData.query.pages)[0] as any;
        const wikitext: string =
          pageObj?.revisions?.[0]?.slots?.main?.['*'] ||
          pageObj?.revisions?.[0]?.['*'] ||
          '';
        const incMatch = wikitext.match(/\|\s*(?:incumbent|officeholder|leader_name1|ceo)\s*=\s*([^\n]+)/i);
        if (incMatch && incMatch[1]) {
          const person = cleanWikiWikitextValue(incMatch[1]);
          if (person && person.length >= 3 && person.length <= 60) {
            return {
              answer: isHindi
                ? `${subject}: ${person}।`
                : `The ${subject.replace(/^(?:the\s+)/i, '')} is ${person}.`,
              source: 'wikipedia',
            };
          }
        }
      }

      const wikiExtract = String(summaryData?.extract || '').trim();
      if (wikiExtract && summaryData?.type !== 'disambiguation') {
        return {
          answer: trimToTwoSentences(wikiExtract),
          source: 'wikipedia',
        };
      }

      if (altTitle) {
        const altSummary = await fetchJsonWithTimeout(
          `https://${wikiHost}/api/rest_v1/page/summary/${encodeURIComponent(altTitle.replace(/\s+/g, '_'))}`,
          2000
        );
        const altExtract = String(altSummary?.extract || '').trim();
        if (altExtract && altSummary?.type !== 'disambiguation') {
          return {
            answer: trimToTwoSentences(altExtract),
            source: 'wikipedia',
          };
        }
      }
    }

    if (ddgAbstract) {
      return {
        answer: trimToTwoSentences(ddgAbstract),
        source: 'duckduckgo',
      };
    }

    // Fallback: English Wikipedia even if Hindi Wikipedia didn't have an entry
    if (isHindi) {
      const enSearch = await fetchJsonWithTimeout(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodedSubj}&utf8=&format=json&origin=*&srlimit=1`,
        2200
      );
      const enTitle = enSearch?.query?.search?.[0]?.title;
      if (enTitle) {
        const enSummary = await fetchJsonWithTimeout(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(enTitle.replace(/\s+/g, '_'))}`,
          2200
        );
        const enExtract = String(enSummary?.extract || '').trim();
        if (enExtract) {
          return { answer: trimToTwoSentences(enExtract), source: 'wikipedia' };
        }
      }
    }
  } catch {
    // Ignore transient network errors
  }

  // 3. Last resort on Android APK: try native Java knowledge bridge (non-CORS)
  if (typeof window !== 'undefined' && (window.JarvisAndroid as any)?.askKnowledge) {
    try {
      const nativeAns = String((window.JarvisAndroid as any).askKnowledge(cleanQ, langCode) || '').trim();
      if (nativeAns) {
        return { answer: nativeAns, source: 'native' };
      }
    } catch {
      // ignore
    }
  }

  return null;
}
