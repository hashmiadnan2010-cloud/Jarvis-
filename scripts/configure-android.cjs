const fs = require('fs');
const path = require('path');

// 1. Update AndroidManifest.xml with Mic, Call, Contacts, Camera, Overlay, Battery Exemption, Boot, Assist & Foreground Service
const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');

const permissions = [
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
  '<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />',
  '<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />',
  '<uses-permission android:name="android.permission.ACCESS_NOTIFICATION_POLICY" />',
  '<uses-permission android:name="android.permission.WRITE_SETTINGS" />',
  '<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />',
  '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
  '<uses-permission android:name="android.permission.CALL_PHONE" />',
  '<uses-permission android:name="android.permission.READ_CONTACTS" />',
  '<uses-permission android:name="android.permission.WAKE_LOCK" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />',
  '<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />',
  '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
];

for (const perm of permissions) {
  if (!manifest.includes(perm)) {
    manifest = manifest.replace('<application', `${perm}\n    <application`);
  }
}

// Ensure MainActivity supports lock-screen wake-up & singleTask launch without duplicating existing attributes
manifest = manifest.replace(
  /(<activity[^>]*android:name="[^"]*MainActivity"[^>]*)(>)/,
  (match, openTag, closeBracket) => {
    let additions = '';
    if (!/android:launchMode=/.test(openTag)) {
      additions += '\n            android:launchMode="singleTask"';
    }
    if (!/android:showWhenLocked=/.test(openTag)) {
      additions += '\n            android:showWhenLocked="true"';
    }
    if (!/android:turnScreenOn=/.test(openTag)) {
      additions += '\n            android:turnScreenOn="true"';
    }
    return `${openTag}${additions}${closeBracket}`;
  }
);

// Register MainActivity as a selectable Android Digital Assistant App (ACTION_ASSIST & VOICE_COMMAND)
if (!manifest.includes('android.intent.action.ASSIST')) {
  const assistFilter = [
    '            <intent-filter>',
    '                <action android:name="android.intent.action.ASSIST" />',
    '                <category android:name="android.intent.category.DEFAULT" />',
    '            </intent-filter>',
    '            <intent-filter>',
    '                <action android:name="android.intent.action.VOICE_COMMAND" />',
    '                <category android:name="android.intent.category.DEFAULT" />',
    '                <category android:name="android.intent.category.VOICE" />',
    '            </intent-filter>',
  ].join('\n');

  manifest = manifest.replace(
    /(<activity[^>]*android:name="[^"]*MainActivity"[\s\S]*?)(<\/activity>)/,
    `$1${assistFilter}\n        $2`
  );
}

if (!manifest.includes('JarvisBackgroundService')) {
  const serviceDecl = [
    '        <service',
    '            android:name=".JarvisBackgroundService"',
    '            android:enabled="true"',
    '            android:exported="false"',
    '            android:foregroundServiceType="microphone" />',
    '',
  ].join('\n');
  manifest = manifest.replace('</application>', `${serviceDecl}    </application>`);
}

if (!manifest.includes('JarvisBootReceiver')) {
  const receiverDecl = [
    '        <receiver',
    '            android:name=".JarvisBootReceiver"',
    '            android:enabled="true"',
    '            android:exported="true">',
    '            <intent-filter>',
    '                <action android:name="android.intent.action.BOOT_COMPLETED" />',
    '                <action android:name="android.intent.action.QUICKBOOT_POWERON" />',
    '            </intent-filter>',
    '        </receiver>',
    '',
  ].join('\n');
  manifest = manifest.replace('</application>', `${receiverDecl}    </application>`);
}

if (!manifest.includes('JarvisAccessibilityService')) {
  const a11yDecl = [
    '        <service',
    '            android:name=".JarvisAccessibilityService"',
    '            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"',
    '            android:label="JARVIS Direct Auto-Send"',
    '            android:exported="true">',
    '            <intent-filter>',
    '                <action android:name="android.accessibilityservice.AccessibilityService" />',
    '            </intent-filter>',
    '            <meta-data',
    '                android:name="android.accessibilityservice"',
    '                android:resource="@xml/jarvis_accessibility_config" />',
    '        </service>',
    '',
  ].join('\n');
  manifest = manifest.replace('</application>', `${a11yDecl}    </application>`);
}

// Replace or add <queries> block so Android 11+ can resolve ALL installed launcher apps (Insta, Calendar, Dialer, Truecaller, Google, Free Fire, etc.)
const queriesBlock = [
  '    <queries>',
  '        <intent>',
  '            <action android:name="android.intent.action.MAIN" />',
  '            <category android:name="android.intent.category.LAUNCHER" />',
  '        </intent>',
  '        <package android:name="com.whatsapp" />',
  '        <package android:name="com.whatsapp.w4b" />',
  '        <package android:name="com.google.android.youtube" />',
  '        <package android:name="com.google.android.apps.youtube.music" />',
  '        <package android:name="com.spotify.music" />',
  '        <package android:name="com.instagram.android" />',
  '        <package android:name="org.telegram.messenger" />',
  '        <package android:name="com.google.android.apps.maps" />',
  '        <package android:name="com.android.chrome" />',
  '        <package android:name="com.truecaller" />',
  '        <package android:name="com.dts.freefireth" />',
  '        <package android:name="com.dts.freefiremax" />',
  '        <package android:name="com.google.android.calendar" />',
  '        <package android:name="com.android.calendar" />',
  '        <package android:name="com.samsung.android.calendar" />',
  '        <package android:name="com.google.android.dialer" />',
  '        <package android:name="com.android.dialer" />',
  '        <package android:name="com.google.android.googlequicksearchbox" />',
  '        <package android:name="com.google.android.gm" />',
  '        <package android:name="com.android.vending" />',
  '        <package android:name="com.snapchat.android" />',
  '        <package android:name="com.facebook.katana" />',
  '        <package android:name="com.phonepe.app" />',
  '        <package android:name="net.one97.paytm" />',
  '        <package android:name="com.google.android.apps.nbu.paisa.user" />',
  '        <package android:name="com.pubg.imobile" />',
  '        <package android:name="com.netflix.mediaclient" />',
  '        <package android:name="in.startv.hotstar" />',
  '        <package android:name="com.amazon.mShop.android.shopping" />',
  '        <package android:name="com.flipkart.android" />',
  '        <package android:name="com.google.android.apps.photos" />',
  '        <package android:name="com.android.settings" />',
  '        <intent>',
  '            <action android:name="android.intent.action.VIEW" />',
  '            <data android:scheme="https" />',
  '        </intent>',
  '        <intent>',
  '            <action android:name="android.intent.action.DIAL" />',
  '            <data android:scheme="tel" />',
  '        </intent>',
  '        <intent>',
  '            <action android:name="android.intent.action.CALL" />',
  '            <data android:scheme="tel" />',
  '        </intent>',
  '        <intent>',
  '            <action android:name="android.intent.action.SEARCH" />',
  '        </intent>',
  '        <intent>',
  '            <action android:name="android.intent.action.WEB_SEARCH" />',
  '        </intent>',
  '        <intent>',
  '            <action android:name="android.media.action.MEDIA_PLAY_FROM_SEARCH" />',
  '        </intent>',
  '        <intent>',
  '            <action android:name="android.intent.action.SEND" />',
  '            <data android:mimeType="text/plain" />',
  '        </intent>',
  '        <intent>',
  '            <action android:name="android.speech.RecognitionService" />',
  '        </intent>',
  '    </queries>',
  '',
].join('\n');

if (manifest.includes('<queries>')) {
  manifest = manifest.replace(/<queries>[\s\S]*?<\/queries>\s*/m, queriesBlock);
} else {
  manifest = manifest.replace('</manifest>', `${queriesBlock}</manifest>`);
}

fs.writeFileSync(manifestPath, manifest);

// 1b. Write Accessibility Service XML config & description string for zero-tap WhatsApp auto-send
const xmlDir = path.join('android', 'app', 'src', 'main', 'res', 'xml');
fs.mkdirSync(xmlDir, { recursive: true });
const a11yXmlPath = path.join(xmlDir, 'jarvis_accessibility_config.xml');
const a11yXml = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"',
  '    android:accessibilityEventTypes="typeWindowStateChanged|typeWindowContentChanged"',
  '    android:accessibilityFeedbackType="feedbackGeneric"',
  '    android:accessibilityFlags="flagDefault|flagRetrieveInteractiveWindows|flagReportViewIds"',
  '    android:canRetrieveWindowContent="true"',
  '    android:canPerformGestures="true"',
  '    android:description="@string/jarvis_accessibility_desc"',
  '    android:notificationTimeout="100"',
  '    android:packageNames="com.whatsapp,com.whatsapp.w4b,com.instagram.android,com.spotify.music,com.android.systemui" />',
  '',
].join('\n');
fs.writeFileSync(a11yXmlPath, a11yXml);

const valuesDir = path.join('android', 'app', 'src', 'main', 'res', 'values');
fs.mkdirSync(valuesDir, { recursive: true });
const stringsXmlPath = path.join(valuesDir, 'strings.xml');
const a11yDesc = 'Allows JARVIS to press the WhatsApp Send button automatically only when you explicitly command JARVIS to send a WhatsApp message.';
if (fs.existsSync(stringsXmlPath)) {
  let stringsXml = fs.readFileSync(stringsXmlPath, 'utf8');
  if (!stringsXml.includes('jarvis_accessibility_desc')) {
    stringsXml = stringsXml.replace(
      '</resources>',
      `    <string name="jarvis_accessibility_desc">${a11yDesc}</string>\n</resources>`
    );
    fs.writeFileSync(stringsXmlPath, stringsXml);
  }
} else {
  const defaultStringsXml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<resources>',
    `    <string name="jarvis_accessibility_desc">${a11yDesc}</string>`,
    '</resources>',
    '',
  ].join('\n');
  fs.writeFileSync(stringsXmlPath, defaultStringsXml);
}

// 2. Copy Arc Reactor PNG icon into Android mipmap launcher folders
const iconSrc = path.join('public', 'pwa-512x512.png');
if (fs.existsSync(iconSrc)) {
  const resDir = path.join('android', 'app', 'src', 'main', 'res');
  for (const folder of fs.readdirSync(resDir)) {
    if (folder.startsWith('mipmap-')) {
      const targetDir = path.join(resDir, folder);
      for (const targetName of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
        const dest = path.join(targetDir, targetName);
        if (fs.existsSync(dest)) {
          fs.copyFileSync(iconSrc, dest);
        }
      }
    }
  }
}

const javaDir = path.join('android', 'app', 'src', 'main', 'java', 'com', 'jarvis', 'assistant');
fs.mkdirSync(javaDir, { recursive: true });

// 3. Generate JarvisBootReceiver.java so Always-On JARVIS resumes after phone reboot
const bootReceiverPath = path.join(javaDir, 'JarvisBootReceiver.java');
const bootReceiverCode = `package com.jarvis.assistant;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;

public class JarvisBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !"android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            return;
        }
        SharedPreferences prefs = context.getSharedPreferences("jarvis_prefs", Context.MODE_PRIVATE);
        boolean bgEnabled = prefs.getBoolean("backgroundMode", true);
        boolean alwaysOn = prefs.getBoolean("alwaysOnWakeWord", true);
        boolean hasMic = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;

        if (bgEnabled && alwaysOn && hasMic) {
            Intent serviceIntent = new Intent(context, JarvisBackgroundService.class);
            serviceIntent.setAction(JarvisBackgroundService.ACTION_START_LISTENING);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            } catch (Exception ignored) {
            }
        }
    }
}
`;
fs.writeFileSync(bootReceiverPath, bootReceiverCode);

// 3b. Generate JarvisKnowledgeEngine.java for direct APK-side general knowledge (curated + Wikipedia/DuckDuckGo)
const knowledgeEnginePath = path.join(javaDir, 'JarvisKnowledgeEngine.java');
const knowledgeEngineCode = `package com.jarvis.assistant;

import android.net.Uri;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

public class JarvisKnowledgeEngine {
    public static String answerQuestion(String question, String langCode) {
        if (question == null || question.trim().isEmpty()) return "";
        String cleanQ = cleanQuestion(question);
        boolean isHindi = (langCode != null && langCode.toLowerCase(Locale.ROOT).startsWith("hi"))
            || cleanQ.matches(".*[\\\\u0900-\\\\u097F].*");

        String curated = tryCuratedAnswer(cleanQ, isHindi);
        if (!curated.isEmpty()) return curated;

        try {
            String ddg = queryDuckDuckGo(cleanQ);
            if (!ddg.isEmpty()) {
                return trimToTwoSentences(ddg);
            }
        } catch (Exception ignored) {
        }

        try {
            String wiki = queryWikipedia(cleanQ, isHindi ? "hi" : "en");
            if (wiki.isEmpty() && isHindi) {
                wiki = queryWikipedia(cleanQ, "en");
            }
            if (!wiki.isEmpty()) {
                return wiki;
            }
        } catch (Exception ignored) {
        }

        return "";
    }

    private static String cleanQuestion(String q) {
        String s = q.trim()
            .replaceFirst("^(?i)(?:hey|ok|okay|hi)[,\\\\s]+jarvis[,\\\\s:-]*", "")
            .replaceFirst("^(?i)(?:tell me|can you tell me|please tell me|do you know|search|google|find out|batao|bataiye)\\\\s+", "")
            .trim();
        return s.isEmpty() ? q.trim() : s;
    }

    private static String tryCuratedAnswer(String q, boolean isHindi) {
        String lower = q.toLowerCase(Locale.ROOT);
        if ((lower.contains("prime minister") || lower.matches(".*\\\\bpm\\\\b.*") || q.contains("प्रधानमंत्री"))
            && (lower.contains("india") || lower.contains("bharat") || q.contains("भारत"))) {
            return isHindi
                ? "भारत के वर्तमान प्रधानमंत्री नरेंद्र मोदी हैं।"
                : "The current Prime Minister of India is Narendra Modi.";
        }
        if ((lower.contains("president") || q.contains("राष्ट्रपति"))
            && (lower.contains("india") || lower.contains("bharat") || q.contains("भारत"))) {
            return isHindi
                ? "भारत की वर्तमान राष्ट्रपति द्रौपदी मुर्मू हैं।"
                : "The current President of India is Droupadi Murmu.";
        }
        if ((lower.contains("capital") || q.contains("राजधानी"))
            && (lower.contains("india") || lower.contains("bharat") || q.contains("भारत"))) {
            return isHindi
                ? "भारत की राजधानी नई दिल्ली है।"
                : "The capital of India is New Delhi.";
        }
        if ((lower.contains("president") || q.contains("राष्ट्रपति"))
            && (lower.contains("usa") || lower.contains("united states") || lower.contains("america") || q.contains("अमेरिका"))) {
            return isHindi
                ? "संयुक्त राज्य अमेरिका के राष्ट्रपति डोनाल्ड ट्रंप हैं।"
                : "The President of the United States is Donald Trump.";
        }
        if (lower.contains("ceo") && lower.contains("google")) {
            return "The CEO of Google is Sundar Pichai.";
        }
        if (lower.contains("ceo") && (lower.contains("microsoft"))) {
            return "The CEO of Microsoft is Satya Nadella.";
        }
        if (lower.contains("ceo") && lower.contains("apple")) {
            return "The CEO of Apple is Tim Cook.";
        }
        if (lower.contains("ceo") && (lower.contains("tesla") || lower.contains("spacex"))) {
            return "The CEO of Tesla and SpaceX is Elon Musk.";
        }
        return "";
    }

    private static String httpGet(String urlStr) throws Exception {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(3500);
            conn.setReadTimeout(4000);
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("User-Agent", "JarvisAssistant/1.0 (Android)");
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) return "";
            InputStream is = conn.getInputStream();
            BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line).append('\\n');
            }
            br.close();
            return sb.toString();
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String queryDuckDuckGo(String q) throws Exception {
        String url = "https://api.duckduckgo.com/?q=" + Uri.encode(q) + "&format=json&no_html=1&skip_disambig=1";
        String raw = httpGet(url);
        if (raw.isEmpty()) return "";
        JSONObject obj = new JSONObject(raw);
        String ans = obj.optString("Answer", "").trim();
        if (!ans.isEmpty()) return ans;
        String abs = obj.optString("AbstractText", "").trim();
        if (!abs.isEmpty()) return abs;
        return "";
    }

    private static String queryWikipedia(String q, String lang) throws Exception {
        String searchQuery = q
            .replaceFirst("(?i)^(?:who is|what is|where is|when was|tell me about|explain|define)\\\\s+(?:the\\\\s+)?", "")
            .replaceAll("[?।]+$", "")
            .trim();
        if (searchQuery.isEmpty()) searchQuery = q;

        String searchUrl = "https://" + lang + ".wikipedia.org/w/api.php?action=query&list=search&srsearch="
            + Uri.encode(searchQuery) + "&format=json&utf8=1&srlimit=1";
        String searchRaw = httpGet(searchUrl);
        if (searchRaw.isEmpty()) return "";
        JSONObject searchJson = new JSONObject(searchRaw);
        JSONObject queryObj = searchJson.optJSONObject("query");
        if (queryObj == null) return "";
        JSONArray results = queryObj.optJSONArray("search");
        if (results == null || results.length() == 0) return "";
        String title = results.getJSONObject(0).optString("title", "").trim();
        if (title.isEmpty()) return "";

        String lower = q.toLowerCase(Locale.ROOT);
        boolean isOfficeQuery = lower.matches(".*\\\\b(who|pm|prime minister|president|ceo|chief minister|cm|governor|king|queen|founder)\\\\b.*")
            || q.contains("कौन") || q.contains("प्रधानमंत्री") || q.contains("राष्ट्रपति");

        String incumbent = "";
        if (isOfficeQuery && "en".equals(lang)) {
            incumbent = extractInfoboxIncumbent(title);
        }

        String summaryUrl = "https://" + lang + ".wikipedia.org/api/rest_v1/page/summary/" + Uri.encode(title.replace(" ", "_"));
        String summaryRaw = httpGet(summaryUrl);
        String summaryExtract = "";
        if (!summaryRaw.isEmpty()) {
            JSONObject sumObj = new JSONObject(summaryRaw);
            summaryExtract = trimToTwoSentences(sumObj.optString("extract", "").trim());
        }

        if (!incumbent.isEmpty()) {
            if (!summaryExtract.isEmpty() && !summaryExtract.toLowerCase(Locale.ROOT).contains(incumbent.toLowerCase(Locale.ROOT))) {
                return "The current " + title + " is " + incumbent + ". " + summaryExtract;
            }
            return "The current " + title + " is " + incumbent + ".";
        }
        return summaryExtract;
    }

    private static String extractInfoboxIncumbent(String title) {
        try {
            String revUrl = "https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvsection=0&titles="
                + Uri.encode(title.replace(" ", "_")) + "&format=json";
            String raw = httpGet(revUrl);
            if (raw.isEmpty()) return "";
            JSONObject root = new JSONObject(raw);
            JSONObject pages = root.optJSONObject("query") != null ? root.optJSONObject("query").optJSONObject("pages") : null;
            if (pages == null || pages.length() == 0) return "";
            String firstKey = pages.keys().next();
            JSONObject page = pages.optJSONObject(firstKey);
            if (page == null) return "";
            JSONArray revs = page.optJSONArray("revisions");
            if (revs == null || revs.length() == 0) return "";
            String wikitext = revs.getJSONObject(0).optString("*", "");
            if (wikitext.isEmpty()) return "";

            Pattern p = Pattern.compile(
                "(?im)^\\\\s*\\\\|\\\\s*(?:incumbent|officeholder|ceo|chief_executive|leader_name1?|president|prime_minister)\\\\s*=\\\\s*(.+)$"
            );
            Matcher m = p.matcher(wikitext);
            if (m.find()) {
                String val = m.group(1);
                if (val != null) {
                    val = val.replaceAll("<ref[^>]*>[\\\\s\\\\S]*?</ref>", "")
                        .replaceAll("<ref[^/>]*/>", "")
                        .replaceAll("<[^>]+>", " ")
                        .replaceAll("\\\\{\\\\{[^{}]*\\\\}\\\\}", "")
                        .replaceAll("\\\\[\\\\[[^|\\\\]]+\\\\|([^\\\\]]+)\\\\]\\\\]", "$1")
                        .replaceAll("\\\\[\\\\[([^\\\\]]+)\\\\]\\\\]", "$1")
                        .replaceAll("'+", "")
                        .replaceAll("\\\\s+", " ")
                        .trim();
                    if (!val.isEmpty() && val.length() < 80) {
                        return val;
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    private static String trimToTwoSentences(String text) {
        if (text == null) return "";
        String cleaned = text.replaceAll("\\\\s+", " ").trim();
        if (cleaned.isEmpty()) return "";
        String[] parts = cleaned.split("(?<=[.!?।])\\\\s+");
        if (parts.length <= 2) {
            return cleaned.length() > 300 ? cleaned.substring(0, 297) + "..." : cleaned;
        }
        String joined = parts[0] + " " + parts[1];
        return joined.length() > 300 ? joined.substring(0, 297) + "..." : joined;
    }
}
`;
fs.writeFileSync(knowledgeEnginePath, knowledgeEngineCode);

// 3c. Generate JarvisCommandHelper.java for shared native actions (Background Service + MainActivity Bridge)
const commandHelperPath = path.join(javaDir, 'JarvisCommandHelper.java');
const commandHelperCode = `package com.jarvis.assistant;

import android.Manifest;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.app.SearchManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.ContactsContract;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.KeyEvent;
import androidx.core.content.ContextCompat;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class JarvisCommandHelper {
    public static boolean launchIntentSafely(Context ctx, Intent intent) {
        if (ctx == null || intent == null) return false;
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (JarvisAccessibilityService.launchActivityFromService(intent)) {
            return true;
        }
        try {
            ctx.startActivity(intent);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    public static void wakeScreenBriefly(Context ctx, long ms) {
        try {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isInteractive()) {
                @SuppressWarnings("deprecation")
                PowerManager.WakeLock wl = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "Jarvis::WakeScreenLock"
                );
                wl.setReferenceCounted(false);
                wl.acquire(Math.max(1500L, Math.min(8000L, ms)));
            }
        } catch (Exception ignored) {
        }
    }

    public static boolean saveDeviceLockPin(Context ctx, String pin) {
        if (ctx == null || pin == null) return false;
        String digits = pin.replaceAll("[^0-9]", "");
        if (digits.length() < 4 || digits.length() > 12) return false;
        ctx.getSharedPreferences("jarvis_prefs", Context.MODE_PRIVATE)
            .edit()
            .putString("deviceLockPin", digits)
            .apply();
        return true;
    }

    public static String getDeviceLockPin(Context ctx) {
        if (ctx == null) return "";
        return ctx.getSharedPreferences("jarvis_prefs", Context.MODE_PRIVATE).getString("deviceLockPin", "");
    }

    public static boolean hasDeviceLockPin(Context ctx) {
        String p = getDeviceLockPin(ctx);
        return p != null && p.length() >= 4;
    }

    public static String unlockPhoneScreen(Context ctx) {
        String pin = getDeviceLockPin(ctx);
        if (pin == null || pin.length() < 4) {
            return "no_pin_set";
        }
        wakeScreenBriefly(ctx, 5000L);
        KeyguardManager km = (KeyguardManager) ctx.getSystemService(Context.KEYGUARD_SERVICE);
        if (km != null && !km.isKeyguardLocked()) {
            return "already_unlocked";
        }
        if (!JarvisAccessibilityService.isEnabled(ctx)) {
            return "needs_accessibility";
        }
        JarvisAccessibilityService.armPhoneUnlock(pin);
        JarvisAccessibilityService.triggerImmediateUnlock();
        return "ok:unlocking";
    }
    public static int getBatteryPercent(Context ctx) {
        try {
            Intent batteryStatus = ctx.registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                if (level >= 0 && scale > 0) {
                    return Math.round((level * 100f) / scale);
                }
            }
        } catch (Exception ignored) {
        }
        return -1;
    }

    public static String setRingerMode(Context ctx, String mode) {
        try {
            AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return "error:no_audio_manager";
            String m = mode == null ? "normal" : mode.trim().toLowerCase(Locale.US);
            int targetMode = AudioManager.RINGER_MODE_NORMAL;
            if ("vibrate".equals(m) || "vibration".equals(m)) {
                targetMode = AudioManager.RINGER_MODE_VIBRATE;
            } else if ("silent".equals(m) || "mute".equals(m) || "dnd".equals(m)) {
                targetMode = AudioManager.RINGER_MODE_SILENT;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
                boolean dndGranted = nm != null && nm.isNotificationPolicyAccessGranted();
                if (!dndGranted) {
                    try {
                        am.setRingerMode(targetMode);
                        if (am.getRingerMode() == targetMode) {
                            return "ok:" + m;
                        }
                    } catch (SecurityException se) {
                        Intent dndIntent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                        dndIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        ctx.startActivity(dndIntent);
                        return "needs_dnd_permission";
                    }
                }
            }
            am.setRingerMode(targetMode);
            return "ok:" + m;
        } catch (SecurityException se) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    Intent dndIntent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                    dndIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(dndIntent);
                } catch (Exception ignored) {
                }
            }
            return "needs_dnd_permission";
        } catch (Exception e) {
            return "error:" + e.getMessage();
        }
    }

    private static void launchSettingsIntentSafe(Context ctx, Intent primary, Intent fallback1, Intent fallback2) {
        new Handler(Looper.getMainLooper()).post(() -> {
            PackageManager pm = ctx.getPackageManager();
            Intent[] candidates = new Intent[]{ primary, fallback1, fallback2, new Intent(Settings.ACTION_SETTINGS) };
            for (Intent candidate : candidates) {
                if (candidate == null) continue;
                try {
                    if (candidate.resolveActivity(pm) != null) {
                        if (launchIntentSafely(ctx, candidate)) {
                            return;
                        }
                    }
                } catch (Exception ignored) {
                }
            }
        });
    }

    public static String controlDeviceSetting(Context ctx, String settingType, String action) {
        try {
            String type = settingType == null ? "settings" : settingType.trim().toLowerCase(Locale.US);
            String act = action == null ? "open" : action.trim().toLowerCase(Locale.US);

            if ("flashlight".equals(type) || "torch".equals(type)) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    CameraManager camMgr = (CameraManager) ctx.getSystemService(Context.CAMERA_SERVICE);
                    if (camMgr != null) {
                        String[] ids = camMgr.getCameraIdList();
                        if (ids.length > 0) {
                            boolean enable = !"off".equals(act);
                            camMgr.setTorchMode(ids[0], enable);
                            return "ok:flashlight_" + (enable ? "on" : "off");
                        }
                    }
                }
                return "error:no_flashlight";
            }

            if ("wifi".equals(type)) {
                WifiManager wm = (WifiManager) ctx.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wm != null && ("on".equals(act) || "off".equals(act) || "toggle".equals(act))) {
                    try {
                        boolean enable = "toggle".equals(act) ? !wm.isWifiEnabled() : "on".equals(act);
                        boolean switched = wm.setWifiEnabled(enable);
                        if (switched) {
                            return "ok:wifi_" + (enable ? "on" : "off");
                        }
                    } catch (Exception ignored) {
                    }
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    launchSettingsIntentSafe(
                        ctx,
                        new Intent(Settings.Panel.ACTION_WIFI),
                        new Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY),
                        new Intent(Settings.ACTION_WIFI_SETTINGS)
                    );
                    return "panel:wifi";
                }
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_WIFI_SETTINGS), null, null);
                return "panel:wifi";
            }

            if ("network".equals(type) || "mobile_data".equals(type) || "data".equals(type) || "internet".equals(type)) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    launchSettingsIntentSafe(
                        ctx,
                        new Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY),
                        new Intent(Settings.ACTION_WIRELESS_SETTINGS),
                        new Intent(Settings.ACTION_DATA_ROAMING_SETTINGS)
                    );
                    return "panel:network";
                }
                launchSettingsIntentSafe(
                    ctx,
                    new Intent(Settings.ACTION_WIRELESS_SETTINGS),
                    new Intent(Settings.ACTION_DATA_ROAMING_SETTINGS),
                    null
                );
                return "panel:network";
            }

            if ("bluetooth".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_BLUETOOTH_SETTINGS), null, null);
                return "panel:bluetooth";
            }

            if ("airplane".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_AIRPLANE_MODE_SETTINGS), null, null);
                return "panel:airplane";
            }

            if ("location".equals(type) || "gps".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS), null, null);
                return "panel:location";
            }

            if ("battery".equals(type) || "battery_saver".equals(type) || "power_saving".equals(type)) {
                Intent batIntent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1
                    ? new Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS)
                    : new Intent(Intent.ACTION_POWER_USAGE_SUMMARY);
                launchSettingsIntentSafe(ctx, batIntent, new Intent(Intent.ACTION_POWER_USAGE_SUMMARY), null);
                return "panel:battery";
            }

            if ("hotspot".equals(type)) {
                Intent tether = new Intent();
                tether.setClassName("com.android.settings", "com.android.settings.TetherSettings");
                launchSettingsIntentSafe(ctx, tether, new Intent(Settings.ACTION_WIRELESS_SETTINGS), null);
                return "panel:hotspot";
            }

            if ("auto_rotate".equals(type) || "rotation".equals(type) || "rotate".equals(type)) {
                boolean canWrite = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.System.canWrite(ctx);
                if (canWrite && ("on".equals(act) || "off".equals(act) || "toggle".equals(act))) {
                    int current = Settings.System.getInt(ctx.getContentResolver(), Settings.System.ACCELEROMETER_ROTATION, 0);
                    int next = "toggle".equals(act) ? (current == 1 ? 0 : 1) : ("on".equals(act) ? 1 : 0);
                    Settings.System.putInt(ctx.getContentResolver(), Settings.System.ACCELEROMETER_ROTATION, next);
                    return "ok:auto_rotate_" + (next == 1 ? "on" : "off");
                }
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_DISPLAY_SETTINGS), null, null);
                return "panel:auto_rotate";
            }

            if ("dnd".equals(type)) {
                Intent dndIntent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    ? new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                    : new Intent(Settings.ACTION_SOUND_SETTINGS);
                launchSettingsIntentSafe(ctx, dndIntent, new Intent(Settings.ACTION_SOUND_SETTINGS), null);
                return "panel:dnd";
            }

            if ("sound".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_SOUND_SETTINGS), null, null);
                return "panel:sound";
            }

            if ("display".equals(type) || "brightness".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_DISPLAY_SETTINGS), null, null);
                return "panel:display";
            }

            if ("storage".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_INTERNAL_STORAGE_SETTINGS), new Intent(Settings.ACTION_MEMORY_CARD_SETTINGS), null);
                return "panel:storage";
            }

            if ("apps_settings".equals(type) || "apps".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_APPLICATION_SETTINGS), null, null);
                return "panel:apps_settings";
            }

            if ("security".equals(type) || "privacy".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_SECURITY_SETTINGS), new Intent(Settings.ACTION_PRIVACY_SETTINGS), null);
                return "panel:security";
            }

            if ("date_time".equals(type) || "date".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_DATE_SETTINGS), null, null);
                return "panel:date_time";
            }

            if ("accessibility".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS), null, null);
                return "panel:accessibility";
            }

            if ("vpn".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_VPN_SETTINGS), new Intent(Settings.ACTION_WIRELESS_SETTINGS), null);
                return "panel:vpn";
            }

            if ("nfc".equals(type)) {
                launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_NFC_SETTINGS), new Intent(Settings.ACTION_WIRELESS_SETTINGS), null);
                return "panel:nfc";
            }

            launchSettingsIntentSafe(ctx, new Intent(Settings.ACTION_SETTINGS), null, null);
            return "panel:settings";
        } catch (Exception e) {
            return "error:" + e.getMessage();
        }
    }

    public static String stripContactHonorifics(String name) {
        if (name == null) return "";
        return name.replaceAll("(?i)\\\\b(bhai|bhaiya|bhaiyya|bhaijaan|bro|ji|sir|madam|didi|yaar)\\\\b", " ")
            .replaceAll("(भाई|भैया|जी|सर|मैडम|दीदी)", " ")
            .replaceAll("\\\\s+", " ")
            .trim();
    }

    public static String lookupRealContactPhone(Context ctx, String contactQuery) {
        if (contactQuery == null || contactQuery.trim().isEmpty()) return "";
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            return "";
        }
        String qRaw = contactQuery.trim().toLowerCase(Locale.ROOT);
        String qStripped = stripContactHonorifics(contactQuery).toLowerCase(Locale.ROOT);
        String q = qStripped.isEmpty() ? qRaw : qStripped;
        String qCompact = q.replaceAll("[^a-z0-9\\\\u0900-\\\\u097F]", "");
        String[] qTokens = q.split("\\\\s+");
        boolean wantsMom = qRaw.matches(".*\\\\b(mom|mommy|mama|mummy|mata|mataji|mother|maa|amma|ammi)\\\\b.*")
            || qRaw.contains("मॉम") || qRaw.contains("मम्मी") || qRaw.contains("माँ") || qRaw.contains("मां");
        boolean wantsDad = qRaw.matches(".*\\\\b(dad|daddy|papa|pita|pitaji|father|pa|abba)\\\\b.*")
            || qRaw.contains("पापा") || qRaw.contains("डैड") || qRaw.contains("पिता");

        Cursor cursor = null;
        String bestPhone = "";
        int bestScore = 0;
        try {
            cursor = ctx.getContentResolver().query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                new String[]{
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                },
                null,
                null,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
            );
            if (cursor != null) {
                int nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                int numIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                while (cursor.moveToNext()) {
                    String name = nameIdx >= 0 ? cursor.getString(nameIdx) : "";
                    String num = numIdx >= 0 ? cursor.getString(numIdx) : "";
                    if (name == null || num == null || name.trim().isEmpty() || num.trim().isEmpty()) continue;
                    String nameLower = name.trim().toLowerCase(Locale.ROOT);
                    String nameStripped = stripContactHonorifics(name).toLowerCase(Locale.ROOT);
                    String nameCompact = nameLower.replaceAll("[^a-z0-9\\\\u0900-\\\\u097F]", "");
                    int score = 0;
                    if (nameLower.equals(qRaw) || nameLower.equals(q) || (!nameStripped.isEmpty() && nameStripped.equals(q))
                        || (!qCompact.isEmpty() && nameCompact.equals(qCompact))) {
                        score = 100;
                    } else if (nameLower.startsWith(q) || (!qCompact.isEmpty() && nameCompact.startsWith(qCompact))) {
                        score = 88;
                    } else if (nameLower.contains(q) || (!qCompact.isEmpty() && nameCompact.contains(qCompact))) {
                        score = 80;
                    } else if (wantsMom && (nameLower.matches(".*\\\\b(mom|mommy|mama|mummy|mata|mataji|mother|maa|amma|ammi)\\\\b.*")
                        || name.contains("मॉम") || name.contains("मम्मी") || name.contains("माँ"))) {
                        score = 92;
                    } else if (wantsDad && (nameLower.matches(".*\\\\b(dad|daddy|papa|pita|pitaji|father|abba)\\\\b.*")
                        || name.contains("पापा") || name.contains("डैड"))) {
                        score = 92;
                    } else {
                        for (String tok : qTokens) {
                            if (tok.length() >= 3 && (nameLower.startsWith(tok) || nameLower.contains(" " + tok) || nameLower.contains(tok))) {
                                score = Math.max(score, nameLower.startsWith(tok) ? 84 : 74);
                            }
                        }
                        if (score == 0 && qCompact.length() >= 3 && nameCompact.length() >= 3) {
                            int shared = 0;
                            int total = Math.max(1, qCompact.length() - 1);
                            for (int i = 0; i < qCompact.length() - 1; i++) {
                                String bi = qCompact.substring(i, i + 2);
                                if (nameCompact.contains(bi)) shared++;
                            }
                            if ((shared * 100) / total >= 70) {
                                score = 72;
                            }
                        }
                    }

                    if (score > bestScore) {
                        bestScore = score;
                        bestPhone = num.replaceAll("[^\\\\d+]", "");
                        if (bestScore >= 100) break;
                    }
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) cursor.close();
        }
        return bestPhone;
    }

    public static String makeDirectCall(Context ctx, String phoneNumber, String contactName) {
        try {
            String clean = phoneNumber == null ? "" : phoneNumber.replaceAll("[^\\\\d+]", "");
            if (clean.isEmpty() && contactName != null && !contactName.trim().isEmpty()) {
                clean = lookupRealContactPhone(ctx, contactName);
            }
            if (clean.isEmpty()) return "no_number";
            wakeScreenBriefly(ctx, 3000L);
            Uri uri = Uri.parse("tel:" + clean);
            boolean canDirectCall = ContextCompat.checkSelfPermission(ctx, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
            Intent intent = new Intent(canDirectCall ? Intent.ACTION_CALL : Intent.ACTION_DIAL, uri);
            launchIntentSafely(ctx, intent);
            return canDirectCall ? "ok:direct_call" : "needs_call_permission";
        } catch (Exception e) {
            return "error:" + e.getMessage();
        }
    }

    public static boolean isPackageInstalled(Context ctx, String pkgName) {
        try {
            ctx.getPackageManager().getPackageInfo(pkgName, 0);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    public static String sendWhatsAppDirect(Context ctx, String phoneNumber, String message, String contactName) {
        try {
            wakeScreenBriefly(ctx, 4000L);
            String clean = phoneNumber == null ? "" : phoneNumber.replaceAll("[^0-9]", "");
            if (clean.isEmpty() && contactName != null && !contactName.trim().isEmpty()) {
                String resolved = lookupRealContactPhone(ctx, contactName);
                clean = resolved.replaceAll("[^0-9]", "");
            }
            if (clean.length() == 10) {
                clean = "91" + clean;
            } else if (clean.length() == 11 && clean.startsWith("0")) {
                clean = "91" + clean.substring(1);
            }

            String safeMsg = (message == null || message.trim().isEmpty()) ? "Hello!" : message.trim();
            boolean a11yReady = JarvisAccessibilityService.isEnabled(ctx);
            String waPkg = isPackageInstalled(ctx, "com.whatsapp")
                ? "com.whatsapp"
                : isPackageInstalled(ctx, "com.whatsapp.w4b") ? "com.whatsapp.w4b" : null;

            if (a11yReady) {
                JarvisAccessibilityService.armWhatsAppAutoSend(safeMsg, contactName != null ? contactName : "");
            }

            if (!clean.isEmpty()) {
                String url = "https://wa.me/" + clean + "?text=" + Uri.encode(safeMsg);
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                if (waPkg != null) {
                    intent.setPackage(waPkg);
                }
                launchIntentSafely(ctx, intent);
            } else if (waPkg != null) {
                // Contact phone not resolved locally: open WhatsApp Share picker with prefilled text so Accessibility picks the contact & clicks Send
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("text/plain");
                shareIntent.putExtra(Intent.EXTRA_TEXT, safeMsg);
                shareIntent.setPackage(waPkg);
                if (!launchIntentSafely(ctx, shareIntent)) {
                    Intent launchWa = ctx.getPackageManager().getLaunchIntentForPackage(waPkg);
                    launchIntentSafely(ctx, launchWa);
                }
            } else {
                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/?text=" + Uri.encode(safeMsg)));
                launchIntentSafely(ctx, webIntent);
            }
            return a11yReady ? "sent_auto" : "opened_needs_accessibility";
        } catch (Exception e) {
            return "error:" + e.getMessage();
        }
    }

    public static String sendInstagramDirect(Context ctx, String recipientName, String message) {
        try {
            wakeScreenBriefly(ctx, 4000L);
            String cleanRecipient = recipientName == null ? "" : recipientName.trim();
            String safeMsg = message == null ? "" : message.trim();
            boolean a11yReady = JarvisAccessibilityService.isEnabled(ctx);
            if (a11yReady && !cleanRecipient.isEmpty()) {
                JarvisAccessibilityService.armInstagramAutoSend(cleanRecipient, safeMsg);
            }
            PackageManager pm = ctx.getPackageManager();
            Intent launch = pm.getLaunchIntentForPackage("com.instagram.android");
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                launchIntentSafely(ctx, launch);
                return a11yReady ? "armed_auto" : "opened_needs_accessibility";
            }
            Intent web = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.instagram.com/direct/inbox/"));
            launchIntentSafely(ctx, web);
            return "opened_web";
        } catch (Exception e) {
            return "error:" + e.getMessage();
        }
    }

    private static void sendMediaKey(AudioManager am, int keyCode) {
        try {
            am.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, keyCode));
            am.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, keyCode));
        } catch (Exception ignored) {
        }
    }

    public static boolean playMusicOrMedia(Context ctx, String action, String songQuery) {
        try {
            String act = action == null ? "play" : action.trim().toLowerCase(Locale.US);
            String q = songQuery == null ? "" : songQuery.trim();
            AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);

            if ("pause".equals(act) || "stop".equals(act)) {
                if (am != null) sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_PAUSE);
                return true;
            }
            if ("next".equals(act) || "skip".equals(act)) {
                if (am != null) sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_NEXT);
                return true;
            }
            if ("previous".equals(act)) {
                if (am != null) sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_PREVIOUS);
                return true;
            }

            wakeScreenBriefly(ctx, 4000L);
            boolean hasSpotify = isPackageInstalled(ctx, "com.spotify.music");

            if (!q.isEmpty()) {
                if (hasSpotify) {
                    JarvisAccessibilityService.armSpotifyAutoPlay(q);
                    try {
                        Intent playIntent = new Intent(MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH);
                        playIntent.setPackage("com.spotify.music");
                        playIntent.putExtra(SearchManager.QUERY, q);
                        playIntent.putExtra("android.intent.extra.user_query", q);
                        playIntent.putExtra(MediaStore.EXTRA_MEDIA_FOCUS, "vnd.android.cursor.item/*");
                        if (launchIntentSafely(ctx, playIntent)) {
                            return true;
                        }
                    } catch (Exception ignored) {
                    }
                    try {
                        Intent spSearch = new Intent(Intent.ACTION_VIEW, Uri.parse("spotify:search:" + Uri.encode(q)));
                        spSearch.setPackage("com.spotify.music");
                        if (launchIntentSafely(ctx, spSearch)) {
                            return true;
                        }
                    } catch (Exception ignored) {
                    }
                }
                String[] fallbackPkgs = new String[]{
                    "com.google.android.apps.youtube.music",
                    "com.google.android.youtube"
                };
                for (String pkg : fallbackPkgs) {
                    if (isPackageInstalled(ctx, pkg)) {
                        try {
                            Intent playIntent = new Intent(MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH);
                            playIntent.setPackage(pkg);
                            playIntent.putExtra(SearchManager.QUERY, q);
                            playIntent.putExtra(MediaStore.EXTRA_MEDIA_FOCUS, "vnd.android.cursor.item/*");
                            if (launchIntentSafely(ctx, playIntent)) {
                                return true;
                            }
                        } catch (Exception ignored) {
                        }
                    }
                }
                return searchInApp(ctx, "youtube", q + " song", "https://www.youtube.com/results?search_query=" + Uri.encode(q));
            }

            // Generic "play song" / "connect spotify and play song" (even on lock screen)
            if (hasSpotify) {
                JarvisAccessibilityService.armSpotifyAutoPlay("");
                if (am != null) {
                    sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_PLAY);
                }
                PackageManager pm = ctx.getPackageManager();
                Intent spotifyLaunch = pm.getLaunchIntentForPackage("com.spotify.music");
                if (spotifyLaunch != null) {
                    launchIntentSafely(ctx, spotifyLaunch);
                    if (am != null) {
                        new Handler(Looper.getMainLooper()).postDelayed(() -> sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_PLAY), 850L);
                    }
                    return true;
                }
            }

            if (am != null) {
                sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_PLAY);
                if (am.isMusicActive()) return true;
            }

            PackageManager pm = ctx.getPackageManager();
            String[] players = new String[]{
                "com.spotify.music",
                "com.google.android.apps.youtube.music",
                "com.apple.android.music",
                "com.jio.media.jiobeats",
                "com.gaana",
                "com.bsbportal.music"
            };
            for (String pkg : players) {
                Intent launch = pm.getLaunchIntentForPackage(pkg);
                if (launch != null) {
                    launchIntentSafely(ctx, launch);
                    if (am != null) {
                        new Handler(Looper.getMainLooper()).postDelayed(() -> sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_PLAY), 900L);
                    }
                    return true;
                }
            }
            Intent musicApp = Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_MUSIC);
            launchIntentSafely(ctx, musicApp);
            if (am != null) {
                new Handler(Looper.getMainLooper()).postDelayed(() -> sendMediaKey(am, KeyEvent.KEYCODE_MEDIA_PLAY), 900L);
            }
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    public static boolean searchInApp(Context ctx, String appId, String query, String fallbackUrl) {
        try {
            String cleanApp = appId == null ? "youtube" : appId.trim().toLowerCase(Locale.US);
            String cleanQuery = query == null ? "" : query.trim();
            if (cleanQuery.isEmpty()) return false;

            if ("youtube".equals(cleanApp) || "yt".equals(cleanApp)) {
                try {
                    Intent ytSearch = new Intent(Intent.ACTION_SEARCH);
                    ytSearch.setPackage("com.google.android.youtube");
                    ytSearch.putExtra(SearchManager.QUERY, cleanQuery);
                    ytSearch.putExtra("query", cleanQuery);
                    if (launchIntentSafely(ctx, ytSearch)) return true;
                } catch (Exception ignored) {
                }
                try {
                    Intent ytUrl = new Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(cleanQuery))
                    );
                    ytUrl.setPackage("com.google.android.youtube");
                    if (launchIntentSafely(ctx, ytUrl)) return true;
                } catch (Exception ignored) {
                }
            } else if ("spotify".equals(cleanApp)) {
                JarvisAccessibilityService.armSpotifyAutoPlay(cleanQuery);
                try {
                    Intent spSearch = new Intent(MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH);
                    spSearch.setPackage("com.spotify.music");
                    spSearch.putExtra(SearchManager.QUERY, cleanQuery);
                    if (launchIntentSafely(ctx, spSearch)) return true;
                } catch (Exception ignored) {
                }
            } else if ("maps".equals(cleanApp) || "googlemaps".equals(cleanApp)) {
                try {
                    Intent mapIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=" + Uri.encode(cleanQuery)));
                    mapIntent.setPackage("com.google.android.apps.maps");
                    if (launchIntentSafely(ctx, mapIntent)) return true;
                } catch (Exception ignored) {
                }
            } else if ("google".equals(cleanApp)) {
                try {
                    Intent gSearch = new Intent(Intent.ACTION_WEB_SEARCH);
                    gSearch.putExtra(SearchManager.QUERY, cleanQuery);
                    if (launchIntentSafely(ctx, gSearch)) return true;
                } catch (Exception ignored) {
                }
            }

            if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl));
                launchIntentSafely(ctx, webIntent);
                return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    public static boolean openAppByName(Context ctx, String appQuery, String packageHintsCsv, String fallbackUrl) {
        try {
            PackageManager pm = ctx.getPackageManager();
            if (packageHintsCsv != null && !packageHintsCsv.trim().isEmpty()) {
                for (String c : packageHintsCsv.split(",")) {
                    String pkg = c != null ? c.trim() : "";
                    if (!pkg.isEmpty()) {
                        Intent li = pm.getLaunchIntentForPackage(pkg);
                        if (li != null && launchIntentSafely(ctx, li)) {
                            return true;
                        }
                    }
                }
            }
            String rawQuery = appQuery == null ? "" : appQuery.trim().toLowerCase(Locale.US);
            String normQuery = rawQuery.replaceAll("[^a-z0-9]", "");
            if ("insta".equals(normQuery) || "ig".equals(normQuery)) normQuery = "instagram";
            else if ("yt".equals(normQuery)) normQuery = "youtube";
            else if ("wa".equals(normQuery)) normQuery = "whatsapp";
            else if ("freefire".equals(normQuery) || "ff".equals(normQuery)) normQuery = "freefire";

            if (!normQuery.isEmpty()) {
                Intent mainIntent = new Intent(Intent.ACTION_MAIN);
                mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> resolved = pm.queryIntentActivities(mainIntent, 0);
                if (resolved != null) {
                    int bestScore = 0;
                    String bestPkg = null;
                    String selfPkg = ctx.getPackageName();
                    for (ResolveInfo info : resolved) {
                        if (info.activityInfo == null) continue;
                        String pkg = info.activityInfo.packageName;
                        if (pkg == null || pkg.isEmpty() || pkg.equals(selfPkg)) continue;
                        CharSequence ls = info.loadLabel(pm);
                        String normLabel = (ls != null ? ls.toString() : "").toLowerCase(Locale.US).replaceAll("[^a-z0-9]", "");
                        int score = 0;
                        if (normLabel.equals(normQuery)) score = 100;
                        else if (normLabel.startsWith(normQuery)) score = 88;
                        else if (normLabel.contains(normQuery)) score = 78;
                        else if (pkg.toLowerCase(Locale.US).contains(normQuery)) score = 62;
                        if (score > bestScore) {
                            bestScore = score;
                            bestPkg = pkg;
                        }
                    }
                    if (bestScore >= 60 && bestPkg != null) {
                        Intent li = pm.getLaunchIntentForPackage(bestPkg);
                        if (li != null && launchIntentSafely(ctx, li)) {
                            return true;
                        }
                    }
                }
            }
            if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                Intent bi = new Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl));
                launchIntentSafely(ctx, bi);
                return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    public static String[] parseInstagramDmCommand(String cmd) {
        String recipient = "";
        String body = "";
        Matcher m1 = Pattern.compile(
            "(?i)(?:to|ko|को)\\\\s+([A-Za-z\\\\u0900-\\\\u097F][A-Za-z0-9_\\\\u0900-\\\\u097F. ]{0,35}?)\\\\s+(?:that|saying|ki|की)\\\\s+(.+)$"
        ).matcher(cmd);
        if (m1.find()) {
            recipient = m1.group(1) != null ? m1.group(1).trim() : "";
            body = m1.group(2) != null ? m1.group(2).trim() : "";
        } else {
            Matcher mHindi = Pattern.compile(
                "(?i)^([A-Za-z\\\\u0900-\\\\u097F][A-Za-z0-9_\\\\u0900-\\\\u097F. ]{0,30}?)\\\\s+(?:ko|को)\\\\s+(?:instagram|insta|इंस्टाग्राम|इंस्टा)(?:\\\\s+(?:pe|par|per|me|mein|on|पर|में))?\\\\s+(?:message|msg|dm|मैसेज)\\\\s+(?:bhej(?:o)?|send|karo|भेजो|करो)(?:\\\\s+(?:ki|that|saying|की))?\\\\s+(.+)$"
            ).matcher(cmd);
            if (mHindi.find()) {
                recipient = mHindi.group(1) != null ? mHindi.group(1).trim() : "";
                body = mHindi.group(2) != null ? mHindi.group(2).trim() : "";
            } else {
                Matcher m2 = Pattern.compile(
                    "(?i)(?:to|ko|को)\\\\s+([A-Za-z\\\\u0900-\\\\u097F][A-Za-z0-9_\\\\u0900-\\\\u097F.]{0,28})\\\\s*(.*)$"
                ).matcher(cmd);
                if (m2.find()) {
                    recipient = m2.group(1) != null ? m2.group(1).trim() : "";
                    body = m2.group(2) != null ? m2.group(2).replaceFirst("^(?i)(?:that|saying|ki|की|on\\\\s+instagram)\\\\s+", "").trim() : "";
                }
            }
        }
        recipient = recipient.replaceAll("(?i)\\\\b(on|via|in|pe|par)\\\\s+(?:instagram|insta).*$", "").trim();
        return new String[]{ recipient, body };
    }

    public static String extractSongQuery(String cmd) {
        String s = cmd.replaceAll("(?i)\\\\b(play|resume|pause|stop|next|skip|previous|connect|spotify|on|in|pe|par|se|karke|and|to|with|a|the|some|any|song|songs|music|track|gaana|gana|chalao|bajao|karo|please)\\\\b", " ")
            .replaceAll("(प्ले\\\\s*सॉन्ग|गाना|चलाओ|बजाओ|सॉन्ग|स्पॉटिफाई|से|कनेक्ट|करके)", " ")
            .replaceAll("\\\\s+", " ")
            .trim();
        return s;
    }

    public static String extractPersonName(String cmd) {
        String withoutBody = cmd.replaceAll("(?i)(?:\\\\b(?:that|saying|ki)\\\\b|कि|:).*$", "").trim();
        Matcher mHindi = Pattern.compile(
            "(?i)^([A-Za-z\\\\u0900-\\\\u097F][A-Za-z0-9_\\\\u0900-\\\\u097F ]{0,30}?)\\\\s+(?:ko|को)\\\\b"
        ).matcher(withoutBody);
        if (mHindi.find() && mHindi.group(1) != null) {
            return mHindi.group(1).replaceAll("(?i)\\\\b(please|pls|now|abhi)\\\\b", "").trim();
        }
        Matcher m = Pattern.compile(
            "(?i)(?:call|dial|ring|whatsapp|send\\\\s+(?:a\\\\s+)?(?:whatsapp\\\\s+)?message\\\\s+to|message\\\\s+to|msg\\\\s+to|text\\\\s+to|कॉल\\\\s*करो|फोन\\\\s*करो|मैसेज\\\\s*भेजो)\\\\s+(?:to\\\\s+)?([A-Za-z\\\\u0900-\\\\u097F][A-Za-z0-9_\\\\u0900-\\\\u097F ]{0,30}?)(?:\\\\s+(?:that|saying|ki|on|via|ko|को|directly)|$)"
        ).matcher(withoutBody);
        if (m.find() && m.group(1) != null) {
            return m.group(1).replaceAll("(?i)\\\\b(ko|please|pls|now|abhi|directly)\\\\b", "").trim();
        }
        Matcher mTo = Pattern.compile("(?i)\\\\bto\\\\s+([A-Za-z\\\\u0900-\\\\u097F][A-Za-z0-9_\\\\u0900-\\\\u097F ]{0,30})$").matcher(withoutBody);
        if (mTo.find() && mTo.group(1) != null) {
            return mTo.group(1).trim();
        }
        return "";
    }

    public static String extractMessageBody(String cmd, String person) {
        Matcher m = Pattern.compile("(?i)(?:that|saying|ki|की)\\\\s+(.+)$").matcher(cmd);
        if (m.find() && m.group(1) != null) {
            return m.group(1).trim();
        }
        Matcher mBhejo = Pattern.compile("(?i)(?:bhejo|send|likho|भेजो)\\\\s+(.+)$").matcher(cmd);
        if (mBhejo.find() && mBhejo.group(1) != null) {
            String candidate = mBhejo.group(1).trim();
            if (!candidate.equalsIgnoreCase(person)) {
                return candidate;
            }
        }
        return "";
    }

    public static String extractSearchQuery(String cmd) {
        String s = cmd.replaceAll("(?i)\\\\b(search|find|watch|open|on|in|for|youtube|yt|spotify|google|please)\\\\b", "")
            .replaceAll("(यूट्यूब|सर्च|खोजो|चलाओ|पर|में)", "")
            .replaceAll("\\\\s+", " ")
            .trim();
        return s;
    }
}
`;
fs.writeFileSync(commandHelperPath, commandHelperCode);

// 4. Generate JarvisBackgroundService.java: Always-On Background Foreground Service + Wake-Word SpeechRecognizer
const servicePath = path.join(javaDir, 'JarvisBackgroundService.java');
const serviceCode = `package com.jarvis.assistant;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class JarvisBackgroundService extends Service {
    public static final String CHANNEL_ID = "jarvis_bg_channel";
    public static final int NOTIFICATION_ID = 4201;
    public static final String ACTION_START_LISTENING = "com.jarvis.assistant.ACTION_START_LISTENING";
    public static final String ACTION_STOP_LISTENING = "com.jarvis.assistant.ACTION_STOP_LISTENING";
    public static final String ACTION_RELOAD_CONFIG = "com.jarvis.assistant.ACTION_RELOAD_CONFIG";
    public static final String ACTION_TTS_STATE = "com.jarvis.assistant.ACTION_TTS_STATE";
    public static final String BROADCAST_SPEECH_EVENT = "com.jarvis.assistant.SPEECH_EVENT";
    public static final String EXTRA_WAKE_COMMAND = "jarvis_wake_command";

    public static volatile boolean isActivityVisible = false;
    public static volatile boolean isTtsSpeaking = false;
    public static volatile boolean isServiceRunning = false;

    private PowerManager.WakeLock wakeLock;
    private Handler mainHandler;
    private ExecutorService bgExecutor;
    private SpeechRecognizer speechRecognizer;
    private Intent recognizerIntent;
    private TextToSpeech bgTts;
    private boolean bgTtsReady = false;
    private boolean recognizerActive = false;
    private boolean recognizerStarting = false;
    private long lastStartAttemptMs = 0L;
    private String lastPartialTranscript = "";
    private boolean listeningDesired = true;
    private boolean alwaysOnWakeWord = true;
    private String wakeWord = "jarvis";
    private String recognitionLang = "en-US";
    private long lastWakeLaunchMs = 0L;
    private long bgCommandWindowUntil = 0L;
    private String lastBgTranscript = "";
    private long lastBgTranscriptMs = 0L;
    private int consecutiveErrors = 0;
    private boolean lastBroadcastListening = false;

    @Override
    public void onCreate() {
        super.onCreate();
        isServiceRunning = true;
        mainHandler = new Handler(Looper.getMainLooper());
        bgExecutor = Executors.newSingleThreadExecutor();
        createNotificationChannel();
        initBackgroundTts();
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Jarvis::CoolStandbyLock");
            wakeLock.setReferenceCounted(false);
        }
        loadPrefs();
        mainHandler.postDelayed(watchdogRunnable, 1200L);
    }

    private void acquireTempWakeLock(long durationMs) {
        if (wakeLock == null) return;
        try {
            wakeLock.acquire(Math.max(2000L, Math.min(18000L, durationMs)));
        } catch (Exception ignored) {
        }
    }

    private void releaseTempWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {
            }
        }
    }

    private void initBackgroundTts() {
        try {
            bgTts = new TextToSpeech(this, status -> {
                if (status == TextToSpeech.SUCCESS) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        bgTts.setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ASSISTANT)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build());
                    }
                    int res = bgTts.setLanguage(Locale.forLanguageTag(recognitionLang != null ? recognitionLang : "en-US"));
                    if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                        bgTts.setLanguage(Locale.US);
                    }
                    bgTts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override
                        public void onStart(String utteranceId) {
                            isTtsSpeaking = true;
                            mainHandler.post(() -> pauseRecognizerForTts());
                        }

                        @Override
                        public void onDone(String utteranceId) {
                            isTtsSpeaking = false;
                            releaseTempWakeLock();
                            if (bgCommandWindowUntil > 0) {
                                bgCommandWindowUntil = System.currentTimeMillis() + 15000L;
                            }
                            if (shouldListenNow()) {
                                scheduleRecognizerRestart(50);
                            }
                        }

                        @Override
                        public void onError(String utteranceId) {
                            isTtsSpeaking = false;
                            releaseTempWakeLock();
                            if (shouldListenNow()) {
                                scheduleRecognizerRestart(60);
                            }
                        }
                    });
                    bgTtsReady = true;
                }
            });
        } catch (Exception ignored) {
        }
    }

    private void speakInBackground(String text, float rate) {
        if (text == null || text.trim().isEmpty()) return;
        final String cleanText = text.trim();
        updateNotificationText(cleanText);
        if (!bgTtsReady || bgTts == null) return;
        acquireTempWakeLock(18000L);
        mainHandler.post(() -> {
            try {
                boolean isHindiText = cleanText.matches(".*[\\\\u0900-\\\\u097F].*")
                    || (recognitionLang != null && recognitionLang.toLowerCase(Locale.ROOT).startsWith("hi"));
                Locale targetLoc = isHindiText ? Locale.forLanguageTag("hi-IN") : Locale.US;
                int res = bgTts.setLanguage(targetLoc);
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    bgTts.setLanguage(Locale.US);
                }
                bgTts.setSpeechRate(Math.max(0.75f, Math.min(1.5f, rate)));
                isTtsSpeaking = true;
                pauseRecognizerForTts();
                Bundle params = new Bundle();
                bgTts.speak(cleanText, TextToSpeech.QUEUE_FLUSH, params, "jarvis-bg-" + System.currentTimeMillis());
                // Safety fallback scaled to speech length so short acks resume mic immediately without stalling
                long safetyMs = Math.max(850L, Math.min(32000L, cleanText.length() * 115L));
                mainHandler.postDelayed(() -> {
                    if (isTtsSpeaking) {
                        isTtsSpeaking = false;
                        releaseTempWakeLock();
                        if (shouldListenNow()) {
                            scheduleRecognizerRestart(50);
                        }
                    }
                }, safetyMs);
            } catch (Exception ignored) {
                isTtsSpeaking = false;
                releaseTempWakeLock();
            }
        });
    }

    private void updateNotificationText(String statusLine) {
        try {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm == null) return;
            Intent launchIntent = new Intent(this, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                : PendingIntent.FLAG_UPDATE_CURRENT;
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, pendingFlags);
            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("J.A.R.V.I.S. AI Standby")
                .setContentText(statusLine)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
            nm.notify(NOTIFICATION_ID, notification);
        } catch (Exception ignored) {
        }
    }

    private final Runnable watchdogRunnable = new Runnable() {
        @Override
        public void run() {
            if (isServiceRunning) {
                long now = System.currentTimeMillis();
                if (recognizerStarting && !recognizerActive && (now - lastStartAttemptMs > 4500L)) {
                    resetRecognizerInstance();
                }
                boolean canListen = shouldListenNow();
                if (canListen && !recognizerActive && !recognizerStarting) {
                    startRecognizerIfNeeded();
                } else if (!canListen && (recognizerActive || recognizerStarting)) {
                    pauseRecognizerForTts();
                }
                if (isActivityVisible && canListen != lastBroadcastListening) {
                    broadcastState(canListen);
                }
                long nextTickMs = isActivityVisible ? 1500L : 2000L;
                mainHandler.postDelayed(this, nextTickMs);
            }
        }
    };

    private void loadPrefs() {
        SharedPreferences prefs = getSharedPreferences("jarvis_prefs", MODE_PRIVATE);
        wakeWord = prefs.getString("wakeWord", "Jarvis").trim().toLowerCase(Locale.ROOT);
        if (wakeWord.isEmpty()) wakeWord = "jarvis";
        recognitionLang = prefs.getString("langCode", "en-US");
        alwaysOnWakeWord = prefs.getBoolean("alwaysOnWakeWord", true);
        listeningDesired = prefs.getBoolean("listeningDesired", true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        loadPrefs();
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP_LISTENING.equals(action)) {
            listeningDesired = false;
            getSharedPreferences("jarvis_prefs", MODE_PRIVATE).edit().putBoolean("listeningDesired", false).apply();
            mainHandler.post(this::stopRecognizerInternal);
        } else if (ACTION_START_LISTENING.equals(action)) {
            listeningDesired = true;
            consecutiveErrors = 0;
            getSharedPreferences("jarvis_prefs", MODE_PRIVATE).edit().putBoolean("listeningDesired", true).apply();
            mainHandler.removeCallbacks(watchdogRunnable);
            mainHandler.postDelayed(watchdogRunnable, 1200L);
        } else if (ACTION_TTS_STATE.equals(action) && intent != null) {
            boolean speaking = intent.getBooleanExtra("speaking", false);
            isTtsSpeaking = speaking;
            if (speaking) {
                mainHandler.post(this::pauseRecognizerForTts);
            } else if (shouldListenNow()) {
                scheduleRecognizerRestart(120);
            }
        } else if (ACTION_RELOAD_CONFIG.equals(action)) {
            if (recognizerIntent != null) {
                recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, recognitionLang);
            }
        }

        promoteForegroundNotification();

        if (shouldListenNow()) {
            mainHandler.post(this::startRecognizerIfNeeded);
        } else if (!listeningDesired) {
            mainHandler.post(this::stopRecognizerInternal);
        }

        return START_STICKY;
    }

    private boolean isSafeToPollMicInBackground() {
        if (isActivityVisible) return true;
        try {
            AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (am != null) {
                int mode = am.getMode();
                if (mode == AudioManager.MODE_IN_CALL
                        || mode == AudioManager.MODE_IN_COMMUNICATION
                        || mode == AudioManager.MODE_RINGTONE) {
                    return false;
                }
            }
        } catch (Exception ignored) {
        }
        return true;
    }

    private boolean shouldListenNow() {
        boolean hasMic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        if (!hasMic || !listeningDesired || isTtsSpeaking) return false;
        if (!isActivityVisible && !alwaysOnWakeWord) return false;
        return isSafeToPollMicInBackground();
    }

    private void promoteForegroundNotification() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            : PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, pendingFlags);

        Intent wakeTapIntent = new Intent(this, MainActivity.class);
        wakeTapIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        wakeTapIntent.putExtra(EXTRA_WAKE_COMMAND, "");
        PendingIntent wakePendingIntent = PendingIntent.getActivity(this, 1, wakeTapIntent, pendingFlags);

        String statusLine = alwaysOnWakeWord
            ? "Always-On: Say \\"Hey " + capitalize(wakeWord) + "\\" anywhere"
            : "Running in background & ready for commands";

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("J.A.R.V.I.S. AI Active")
            .setContentText(statusLine)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_btn_speak_now, "Wake JARVIS", wakePendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();

        try {
            boolean hasMic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && hasMic) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            try {
                startForeground(NOTIFICATION_ID, notification);
            } catch (Exception ignored) {
            }
        }
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return "Jarvis";
        return s.substring(0, 1).toUpperCase(Locale.ROOT) + s.substring(1);
    }

    private void ensureSpeechRecognizer() {
        if (speechRecognizer != null) return;
        if (!SpeechRecognizer.isRecognitionAvailable(this)) return;

        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        recognizerIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, recognitionLang != null ? recognitionLang : "en-US");
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 380L);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 280L);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 300L);

        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                recognizerStarting = false;
                recognizerActive = true;
                consecutiveErrors = 0;
                lastPartialTranscript = "";
                broadcastState(true);
            }

            @Override
            public void onBeginningOfSpeech() {}

            @Override
            public void onRmsChanged(float rmsdB) {}

            @Override
            public void onBufferReceived(byte[] buffer) {}

            @Override
            public void onEndOfSpeech() {
                recognizerActive = false;
            }

            @Override
            public void onError(int error) {
                recognizerStarting = false;
                recognizerActive = false;
                if ((error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT)
                        && !lastPartialTranscript.isEmpty() && !isTtsSpeaking) {
                    String rescued = lastPartialTranscript;
                    lastPartialTranscript = "";
                    handleRecognizedPhrase(rescued, true);
                } else {
                    lastPartialTranscript = "";
                }

                if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                    broadcastState(false);
                    return;
                }
                if (shouldListenNow()) {
                    boolean isTimeoutOrNoMatch =
                        error == SpeechRecognizer.ERROR_NO_MATCH ||
                        error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT;
                    boolean needsReset =
                        error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ||
                        error == SpeechRecognizer.ERROR_CLIENT ||
                        error == SpeechRecognizer.ERROR_AUDIO;
                    if (needsReset) {
                        resetRecognizerInstance();
                    }
                    long now = System.currentTimeMillis();
                    boolean inActiveWindow = isActivityVisible || (bgCommandWindowUntil > now);
                    long delay;
                    if (isTimeoutOrNoMatch) {
                        consecutiveErrors = 0;
                        delay = inActiveWindow ? 80L : 260L;
                    } else {
                        consecutiveErrors = Math.min(consecutiveErrors + 1, 5);
                        delay = Math.min(5000L, 1800L + (consecutiveErrors * 900L));
                    }
                    scheduleRecognizerRestart(delay);
                } else {
                    broadcastState(false);
                }
            }

            @Override
            public void onResults(Bundle results) {
                recognizerStarting = false;
                recognizerActive = false;
                consecutiveErrors = 0;
                ArrayList<String> matches = results != null
                    ? results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    : null;
                String text = pickBestWakeMatch(matches);
                if (text.isEmpty()) text = lastPartialTranscript;
                lastPartialTranscript = "";
                if (text != null && !text.trim().isEmpty() && !isTtsSpeaking) {
                    handleRecognizedPhrase(text, true);
                }
                if (shouldListenNow()) {
                    long now = System.currentTimeMillis();
                    long delay = (isActivityVisible || bgCommandWindowUntil > now) ? 80L : 240L;
                    scheduleRecognizerRestart(delay);
                }
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                ArrayList<String> matches = partialResults != null
                    ? partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    : null;
                String text = pickBestWakeMatch(matches);
                if (text != null && !text.trim().isEmpty() && !isTtsSpeaking) {
                    lastPartialTranscript = text;
                    handleRecognizedPhrase(text, false);
                }
            }

            @Override
            public void onEvent(int eventType, Bundle params) {}
        });
    }

    private String pickBestWakeMatch(ArrayList<String> matches) {
        if (matches == null || matches.isEmpty()) return "";
        for (String m : matches) {
            if (m != null && !m.trim().isEmpty() && containsWakeWord(m)) {
                return m.trim();
            }
        }
        String first = matches.get(0);
        return first != null ? first.trim() : "";
    }

    private void handleRecognizedPhrase(String text, boolean isFinal) {
        if (text == null || text.trim().isEmpty()) return;

        if (isActivityVisible) {
            Intent b = new Intent(BROADCAST_SPEECH_EVENT);
            b.setPackage(getPackageName());
            b.putExtra("type", "result");
            b.putExtra("isFinal", isFinal);
            b.putExtra("transcript", text);
            sendBroadcast(b);
            return;
        }

        // App is in cool background standby: stay quiet until wake word or active 15s command window!
        long now = System.currentTimeMillis();
        boolean windowOpen = bgCommandWindowUntil > 0 && now < bgCommandWindowUntil;
        boolean hasWake = containsWakeWord(text);

        if (!alwaysOnWakeWord) return;
        if (!hasWake && !windowOpen) return;

        String cleanCmd = stripWakeWordsLoop(text);

        // If user ONLY said "Hey Jarvis" / "Jarvis": immediately speak "Yes sir!" in background & keep 15s window open!
        if (cleanCmd.isEmpty() && hasWake) {
            if (now - lastWakeLaunchMs > 900L) {
                lastWakeLaunchMs = now;
                bgCommandWindowUntil = now + 15000L;
                acquireTempWakeLock(8000L);
                JarvisCommandHelper.wakeScreenBriefly(this, 2500L);
                boolean isHindiPref = recognitionLang != null && recognitionLang.toLowerCase(Locale.ROOT).startsWith("hi");
                speakInBackground(isHindiPref ? "जी सर!" : "Yes sir!", 1.32f);
            }
            return;
        }

        // Wait for final transcript for full spoken questions/commands so we don't cut off mid-sentence
        if (!isFinal) {
            return;
        }

        String norm = cleanCmd.toLowerCase(Locale.ROOT).replaceAll("\\\\s+", " ");
        if (norm.equals(lastBgTranscript) && (now - lastBgTranscriptMs) < 1800L) {
            return;
        }
        lastBgTranscript = norm;
        lastBgTranscriptMs = now;
        bgCommandWindowUntil = now + 15000L;
        acquireTempWakeLock(14000L);

        processBackgroundCommandAutonomously(cleanCmd);
    }

    private String stripWakeWordsLoop(String text) {
        String out = text == null ? "" : text.trim();
        if (out.isEmpty()) return "";
        String lower = out.toLowerCase(Locale.ROOT);
        if (lower.matches("^(?:hey|hay|he|ey|a|ok|hi)[,\\\\s]+(?:youtube|yt|google|spotify)\\\\b.*")
            || out.matches("^(?:हे|ऐ|ओ)[\\\\s,]+(?:youtube|यूट्यूब|google|गूगल|spotify|स्पॉटिफाई).*")) {
            return out.replaceFirst("^(?:hey|hay|he|ey|a|ok|hi|हे|ऐ|ओ)[,\\\\s]+", "").trim();
        }
        String normalizedWake = wakeWord.replaceFirst("^(hey|hay|he|ey|ok|okay|hi|hello|yo)[,\\\\s]+", "").trim();
        if (normalizedWake.isEmpty()) normalizedWake = "jarvis";
        Pattern wakeRe = Pattern.compile(
            "^(?:hey|hay|he|ey|a|ok|okay|hi|hello|yo|हे|ऐ|अरे|ओ|सुनो)?[,\\\\s:-]*(?:"
            + Pattern.quote(normalizedWake)
            + "|jarvis|jarvish|jarvas|jarvice|jarves|jarviz|javis|jervis|charvis|jarwis|जार्विस|जर्विस|जरविस|जार्विश)[,\\\\s:-]*",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
        );
        for (int i = 0; i < 4; i++) {
            String next = wakeRe.matcher(out).replaceFirst("").trim();
            if (next.equals(out)) break;
            out = next;
        }
        return out;
    }

    private void processBackgroundCommandAutonomously(String cmd) {
        String lower = cmd.toLowerCase(Locale.ROOT).trim();
        boolean isHindi = (recognitionLang != null && recognitionLang.toLowerCase(Locale.ROOT).startsWith("hi"))
            || cmd.matches(".*[\\\\u0900-\\\\u097F].*");

        // 0. Save Device Lock PIN or Unlock Phone by Voice
        Matcher pinSetMatcher = Pattern.compile("(?:lock\\\\s*(?:code|pin)|phone\\\\s*(?:ka\\\\s+)?lock|mera\\\\s*lock).*?\\\\b(\\\\d{4,12})\\\\b|\\\\b(\\\\d{4,12})\\\\b.*?(?:lock\\\\s*(?:hai|rakh|set|save)|mera\\\\s*lock)").matcher(lower);
        if (pinSetMatcher.find()) {
            String pin = pinSetMatcher.group(1) != null ? pinSetMatcher.group(1) : pinSetMatcher.group(2);
            if (pin != null && pin.length() >= 4) {
                JarvisCommandHelper.saveDeviceLockPin(this, pin);
                speakInBackground(isHindi ? "जी सर, मैंने आपका फोन लॉक पिन सुरक्षित सेव कर लिया है।" : "Yes sir, I have saved your phone lock PIN on this device for voice unlock.", 1.12f);
                return;
            }
        }
        if (lower.matches(".*\\\\b(?:unlock\\\\s+(?:the\\\\s+)?(?:phone|screen|device|mobile)|open\\\\s+(?:the\\\\s+)?(?:phone\\\\s+)?lock|lock\\\\s+khol(?:o|do|\\\\s+do)?)\\\\b.*")
            || cmd.contains("लॉक खोल")) {
            String unlockRes = JarvisCommandHelper.unlockPhoneScreen(this);
            if ("no_pin_set".equals(unlockRes)) {
                speakInBackground(isHindi ? "सर, कृपया पहले वॉइस सेटिंग्स में अपना लॉक पिन सेव करें।" : "Sir, please save your lock PIN in Voice Settings first.", 1.12f);
            } else if ("needs_accessibility".equals(unlockRes)) {
                speakInBackground(isHindi ? "सर, फोन अनलॉक करने के लिए जार्विस एक्सेसिबिलिटी सर्विस चालू करें।" : "Sir, please enable Jarvis Accessibility Service to unlock the screen automatically.", 1.12f);
            } else {
                speakInBackground(isHindi ? "जी सर, फोन अनलॉक कर रहा हूँ।" : "Yes sir, unlocking your phone.", 1.20f);
            }
            return;
        }

        // 1. User explicitly asked for standby / background mode OR to open JARVIS UI
        if (lower.contains("standby") || lower.contains("stand by") || lower.contains("background mein") || lower.contains("go to background") || cmd.contains("स्टैंडबाय")) {
            speakInBackground(isHindi ? "जी सर, मैं कूल स्टैंडबाय मोड में बैकग्राउंड में तैयार हूँ।" : "Yes sir, staying on cool standby in the background.", 1.05f);
            return;
        }
        if (lower.matches("^(?:open|launch|show|start)\\\\s+(?:the\\\\s+)?jarvis(?:\\\\s+app)?$")
            || cmd.contains("जार्विस खोलो")) {
            speakInBackground(isHindi ? "जी सर, जार्विस खोल रहा हूँ।" : "Yes sir, opening Jarvis.", 1.05f);
            wakeMainActivityFromBackground("");
            return;
        }

        // 2. Real-time Clock, Date & Day directly in background
        if (lower.matches(".*\\\\b(time|clock|date|day|today)\\\\b.*")
            || lower.contains("samay") || lower.contains("baje") || lower.contains("tarikh") || lower.contains("din")
            || cmd.contains("समय") || cmd.contains("बजे") || cmd.contains("तारीख") || cmd.contains("दिन")) {
            if (!lower.matches(".*\\\\b(who|pm|prime minister|president|capital|movie|anime|date\\\\s*(?:&|and)?\\\\s*time\\\\s*setting)\\\\b.*")) {
                Date now = new Date();
                String timeStr = new SimpleDateFormat("hh:mm a", Locale.US).format(now);
                String dateStr = new SimpleDateFormat("EEEE, MMMM d, yyyy", Locale.US).format(now);
                boolean asksTime = lower.contains("time") || lower.contains("clock") || lower.contains("samay") || lower.contains("baje") || cmd.contains("समय") || cmd.contains("बजे");
                boolean asksDate = lower.contains("date") || lower.contains("day") || lower.contains("today") || lower.contains("tarikh") || lower.contains("din") || cmd.contains("तारीख") || cmd.contains("दिन");
                String reply;
                if (asksTime && asksDate) {
                    reply = isHindi ? "जी सर, आज " + dateStr + " है और अभी समय " + timeStr + " हुआ है।" : "Yes sir, today is " + dateStr + ", and the current time is " + timeStr + ".";
                } else if (asksTime) {
                    reply = isHindi ? "जी सर, अभी समय " + timeStr + " हुआ है।" : "Yes sir, the current time is " + timeStr + ".";
                } else {
                    reply = isHindi ? "जी सर, आज " + dateStr + " है।" : "Yes sir, today is " + dateStr + ".";
                }
                speakInBackground(reply, 1.05f);
                return;
            }
        }

        // 3. Battery Status or Battery Saver Setting directly in background
        if ((lower.contains("battery") || lower.contains("charging") || cmd.contains("बैटरी"))
            && !lower.contains("saver") && !lower.contains("power saving") && !lower.contains("setting")) {
            int pct = JarvisCommandHelper.getBatteryPercent(this);
            String reply = pct >= 0
                ? (isHindi ? "जी सर, आपके फोन की बैटरी अभी " + pct + "% है।" : "Yes sir, your phone battery is at " + pct + "%.")
                : "Yes sir, battery systems are nominal.";
            speakInBackground(reply, 1.05f);
            return;
        }

        // 4. Ringer & All Android Device Settings
        if (lower.contains("vibrat") || cmd.contains("वाइब्रेशन") || cmd.contains("वाइब्रेट")) {
            String res = JarvisCommandHelper.setRingerMode(this, "vibrate");
            speakInBackground("needs_dnd_permission".equals(res) ? "Sir, please grant Do Not Disturb permission for Jarvis." : "Yes sir, phone switched to Vibration mode.", 1.05f);
            return;
        }
        if (lower.contains("silent mode") || lower.equals("silent") || lower.contains("mute mode") || cmd.contains("साइलेंट")) {
            String res = JarvisCommandHelper.setRingerMode(this, "silent");
            speakInBackground("needs_dnd_permission".equals(res) ? "Sir, please grant Do Not Disturb permission for Jarvis." : "Yes sir, phone switched to Silent mode.", 1.05f);
            return;
        }
        if (lower.contains("normal mode") || lower.contains("ring mode") || cmd.contains("नॉर्मल मोड")) {
            JarvisCommandHelper.setRingerMode(this, "normal");
            speakInBackground("Yes sir, phone switched to Normal mode.", 1.05f);
            return;
        }
        if (lower.contains("wifi") || lower.contains("wi-fi") || cmd.contains("वाईफाई") || cmd.contains("वाई-फाई")) {
            String act = (lower.contains("off") || lower.contains("band") || cmd.contains("बंद")) ? "off" : "on";
            String res = JarvisCommandHelper.controlDeviceSetting(this, "wifi", act);
            speakInBackground(res.startsWith("ok:") ? "Yes sir, Wi-Fi turned " + act + "." : "Yes sir, opened Wi-Fi controls.", 1.05f);
            return;
        }
        if (lower.contains("flashlight") || lower.contains("torch") || cmd.contains("टॉर्च")) {
            String act = (lower.contains("off") || lower.contains("band") || cmd.contains("बंद")) ? "off" : "on";
            JarvisCommandHelper.controlDeviceSetting(this, "flashlight", act);
            speakInBackground("Yes sir, flashlight turned " + act + ".", 1.05f);
            return;
        }
        if (lower.contains("auto rotate") || lower.contains("auto-rotate") || lower.contains("rotation") || cmd.contains("रोटेशन")) {
            String act = (lower.contains("off") || lower.contains("band") || cmd.contains("बंद")) ? "off" : (lower.contains("on") || lower.contains("chalu")) ? "on" : "toggle";
            String res = JarvisCommandHelper.controlDeviceSetting(this, "auto_rotate", act);
            speakInBackground(res.startsWith("ok:") ? "Yes sir, auto rotate updated." : "Yes sir, opened display rotation settings.", 1.05f);
            return;
        }
        if (lower.contains("bluetooth") || cmd.contains("ब्लूटूथ")) {
            JarvisCommandHelper.controlDeviceSetting(this, "bluetooth", "open");
            speakInBackground("Yes sir, opened Bluetooth settings.", 1.05f);
            return;
        }
        if (lower.contains("mobile data") || lower.contains("network") || lower.contains("internet setting") || lower.contains("data off") || lower.contains("data on") || cmd.contains("नेटवर्क") || cmd.contains("मोबाइल डेटा")) {
            JarvisCommandHelper.controlDeviceSetting(this, "network", "open");
            speakInBackground("Yes sir, opened network and mobile data controls.", 1.05f);
            return;
        }
        if (lower.contains("hotspot") || cmd.contains("हॉटस्पॉट")) {
            JarvisCommandHelper.controlDeviceSetting(this, "hotspot", "open");
            speakInBackground("Yes sir, opened hotspot settings.", 1.05f);
            return;
        }
        if (lower.contains("airplane") || lower.contains("flight mode")) {
            JarvisCommandHelper.controlDeviceSetting(this, "airplane", "open");
            speakInBackground("Yes sir, opened airplane mode settings.", 1.05f);
            return;
        }
        if (lower.contains("location") || lower.contains("gps") || cmd.contains("लोकेशन")) {
            JarvisCommandHelper.controlDeviceSetting(this, "location", "open");
            speakInBackground("Yes sir, opened location settings.", 1.05f);
            return;
        }
        if (lower.contains("battery saver") || lower.contains("power saving")) {
            JarvisCommandHelper.controlDeviceSetting(this, "battery_saver", "open");
            speakInBackground("Yes sir, opened battery saver settings.", 1.05f);
            return;
        }
        if (lower.contains("do not disturb") || lower.contains("dnd")) {
            JarvisCommandHelper.controlDeviceSetting(this, "dnd", "open");
            speakInBackground("Yes sir, opened Do Not Disturb settings.", 1.05f);
            return;
        }
        if (lower.contains("display setting") || lower.contains("brightness setting") || lower.contains("screen setting")) {
            JarvisCommandHelper.controlDeviceSetting(this, "display", "open");
            speakInBackground("Yes sir, opened display settings.", 1.05f);
            return;
        }
        if (lower.contains("sound setting") || lower.contains("volume setting")) {
            JarvisCommandHelper.controlDeviceSetting(this, "sound", "open");
            speakInBackground("Yes sir, opened sound settings.", 1.05f);
            return;
        }
        if (lower.contains("storage") || cmd.contains("स्टोरेज")) {
            JarvisCommandHelper.controlDeviceSetting(this, "storage", "open");
            speakInBackground("Yes sir, opened storage settings.", 1.05f);
            return;
        }
        if (lower.contains("apps setting") || lower.contains("app setting")) {
            JarvisCommandHelper.controlDeviceSetting(this, "apps_settings", "open");
            speakInBackground("Yes sir, opened app settings.", 1.05f);
            return;
        }
        if (lower.contains("security setting") || lower.contains("privacy setting")) {
            JarvisCommandHelper.controlDeviceSetting(this, "security", "open");
            speakInBackground("Yes sir, opened security settings.", 1.05f);
            return;
        }
        if (lower.contains("date and time") || lower.contains("date time setting")) {
            JarvisCommandHelper.controlDeviceSetting(this, "date_time", "open");
            speakInBackground("Yes sir, opened date and time settings.", 1.05f);
            return;
        }
        if (lower.contains("accessibility")) {
            JarvisCommandHelper.controlDeviceSetting(this, "accessibility", "open");
            speakInBackground("Yes sir, opened accessibility settings.", 1.05f);
            return;
        }
        if (lower.contains("vpn setting") || lower.equals("vpn")) {
            JarvisCommandHelper.controlDeviceSetting(this, "vpn", "open");
            speakInBackground("Yes sir, opened VPN settings.", 1.05f);
            return;
        }
        if (lower.contains("nfc")) {
            JarvisCommandHelper.controlDeviceSetting(this, "nfc", "open");
            speakInBackground("Yes sir, opened NFC settings.", 1.05f);
            return;
        }
        if (lower.matches(".*\\\\b(?:open|show)\\\\s+(?:phone\\\\s+)?settings\\\\b.*") || cmd.contains("सेटिंग्स खोलो") || cmd.contains("सेटिंग खोलो")) {
            JarvisCommandHelper.controlDeviceSetting(this, "settings", "open");
            speakInBackground("Yes sir, opened phone settings.", 1.05f);
            return;
        }

        // 5. Instagram Direct Message ("open Instagram and send a message to Sumer that the app is fine")
        boolean hasInsta = lower.contains("instagram") || lower.contains("insta") || cmd.contains("इंस्टाग्राम") || cmd.contains("इंस्टा");
        boolean hasMsgVerb = lower.contains("message") || lower.contains("send") || lower.contains("dm") || lower.contains("reply") || lower.contains("bhej") || cmd.contains("मैसेज") || cmd.contains("भेजो");
        if (hasInsta && hasMsgVerb) {
            String[] parsedIg = JarvisCommandHelper.parseInstagramDmCommand(cmd);
            String igTarget = parsedIg[0].isEmpty() ? "Instagram" : parsedIg[0];
            speakInBackground("Yes sir, opening Instagram and messaging " + igTarget + ".", 1.08f);
            JarvisCommandHelper.sendInstagramDirect(this, parsedIg[0], parsedIg[1]);
            return;
        }

        // 6. Play Song / Spotify Direct Auto-Play / Music Control (works over lock screen)
        boolean explicitSpotifyPlay = (lower.contains("spotify") || cmd.contains("स्पॉटिफाई"))
            && (lower.contains("play") || lower.contains("connect") || lower.contains("song") || lower.contains("music") || lower.contains("gaana") || lower.contains("chalao") || lower.contains("bajao"))
            && !lower.contains("search") && !lower.contains("find");
        if (explicitSpotifyPlay
            || lower.matches(".*\\\\b(?:play|resume|pause|stop|next|skip|previous)\\\\s+(?:[\\\\w'&-]+\\\\s+){0,5}?(?:song|songs|music|track|gaana|gana)\\\\b.*")
            || lower.matches(".*\\\\bplay\\\\s+[\\\\w'&-]+\\\\s+(?:on|in)\\\\s+spotify\\\\b.*")
            || lower.matches(".*\\\\b(?:song|music|gaana)\\\\s+(?:play|chalao|bajao)\\\\b.*")
            || cmd.matches(".*(?:प्ले\\\\s*सॉन्ग|गाना\\\\s*चलाओ|गाना\\\\s*बजाओ).*")) {
            String action = (lower.contains("pause") || lower.contains("stop")) ? "pause"
                : (lower.contains("next") || lower.contains("skip")) ? "next"
                : lower.contains("previous") ? "previous" : "play";
            String songQuery = JarvisCommandHelper.extractSongQuery(cmd);
            speakInBackground("play".equals(action) ? (songQuery.isEmpty() ? "Yes sir, connecting to Spotify and playing music." : "Yes sir, playing " + songQuery + " on Spotify.") : "Yes sir.", 1.15f);
            JarvisCommandHelper.playMusicOrMedia(this, action, songQuery);
            return;
        }

        // 7. Direct Phone Call
        if ((lower.matches(".*\\\\b(call|dial|ring)\\\\b.*") || cmd.matches(".*(कॉल|फोन\\\\s*करो|फोन\\\\s*लगा).*"))
            && !lower.contains("whatsapp") && !lower.contains("message") && !lower.contains("app")) {
            String person = JarvisCommandHelper.extractPersonName(cmd);
            if (!person.isEmpty()) {
                speakInBackground("Yes sir, calling " + person + " directly.", 1.08f);
                String callRes = JarvisCommandHelper.makeDirectCall(this, "", person);
                if ("no_number".equals(callRes)) {
                    speakInBackground("Sir, I could not find " + person + " in your contacts.", 1.05f);
                }
                return;
            }
        }

        // 8. Direct WhatsApp Message
        if (lower.contains("whatsapp") || lower.contains("message") || lower.contains("bhej") || cmd.contains("व्हाट्सएप") || cmd.contains("मैसेज") || cmd.contains("भेजो")) {
            String person = JarvisCommandHelper.extractPersonName(cmd);
            String body = JarvisCommandHelper.extractMessageBody(cmd, person);
            speakInBackground("Yes sir, sending WhatsApp message to " + (person.isEmpty() ? "contact" : person) + ".", 1.08f);
            JarvisCommandHelper.sendWhatsAppDirect(this, "", body, person);
            return;
        }

        // 9. Search YouTube / Spotify / Google
        if ((lower.contains("youtube") || cmd.contains("यूट्यूब") || lower.contains("spotify") || lower.contains("google"))
            && (lower.contains("search") || lower.contains("find") || lower.contains("watch") || cmd.contains("सर्च") || cmd.contains("चलाओ"))) {
            String appTarget = (lower.contains("spotify")) ? "spotify" : (lower.contains("google")) ? "google" : "youtube";
            String query = JarvisCommandHelper.extractSearchQuery(cmd);
            if (!query.isEmpty()) {
                speakInBackground("Yes sir, searching " + query + " on " + appTarget + ".", 1.08f);
                JarvisCommandHelper.searchInApp(this, appTarget, query, "https://www.youtube.com/results?search_query=" + Uri.encode(query));
                return;
            }
        }

        // 10. Open Any Phone App
        if (lower.matches("^(?:open|launch|start|kholo)\\\\b.*") || cmd.contains("खोलो") || lower.endsWith(" kholo")) {
            String appQuery = cmd
                .replaceFirst("^(?i)(?:open|launch|start|kholo|खोलो)\\\\s+", "")
                .replaceFirst("(?i)\\\\s+(?:kholo|खोलो|open)$", "")
                .trim();
            if (!appQuery.isEmpty()) {
                speakInBackground("Yes sir, opening " + appQuery + ".", 1.08f);
                JarvisCommandHelper.openAppByName(this, appQuery, "", "");
                return;
            }
        }

        // 11. General Knowledge / Reasoning Question directly in Background (e.g. "Who is Prime Minister of India?")
        bgExecutor.execute(() -> {
            String answer = JarvisKnowledgeEngine.answerQuestion(cmd, recognitionLang);
            if (answer == null || answer.trim().isEmpty()) {
                answer = isHindi
                    ? "क्षमा करें सर, अभी इंटरनेट या नॉलेज सर्वर से उत्तर नहीं मिल पाया।"
                    : "Sorry sir, I could not reach live knowledge right now. Please check your internet connection.";
            }
            speakInBackground(answer, 1.02f);
        });
    }

    private boolean containsWakeWord(String transcript) {
        String lower = transcript.toLowerCase(Locale.ROOT).trim();
        String normalizedWake = wakeWord.replaceFirst("^(hey|hay|he|ey|ok|okay|hi|hello|yo)[,\\\\s]+", "").trim();
        if (normalizedWake.isEmpty()) normalizedWake = "jarvis";
        boolean standardWake = lower.matches(".*\\\\b(?:(?:hey|hay|he|ey|a|ok|okay|hi|hello|yo)[,\\\\s]+)?" + java.util.regex.Pattern.quote(normalizedWake) + "\\\\b.*")
            || lower.matches(".*\\\\b(?:(?:hey|hay|he|ey|a|ok|okay|hi|hello|yo)[,\\\\s]+)?(?:jarvis|jarvish|jarvas|jarvice|jarves|jarviz|javis|jervis|charvis|jarwis)\\\\b.*")
            || transcript.matches(".*(?:हे|ऐ|अरे|ओ|सुनो)?[\\\\s,]*(?:जार्विस|जर्विस|जरविस|जार्विश).*");
        if (standardWake) return true;

        boolean directAppWake = lower.matches(".*\\\\b(?:hey|hay|he|ey|a|ok|hi)[,\\\\s]+(?:youtube|yt|google|spotify)\\\\b.*")
            || transcript.matches(".*(?:हे|ऐ|ओ)[\\\\s,]+(?:youtube|यूट्यूब|google|गूगल|spotify|स्पॉटिफाई).*");
        boolean hasCommandVerb = lower.matches(".*\\\\b(?:search|find|watch|play|open|show|karo|chalao|kholo|dikhao)\\\\b.*")
            || transcript.matches(".*(?:सर्च|खोजो|ढूंढो|चलाओ|दिखाओ|खोलो).*");
        return directAppWake && hasCommandVerb;
    }

    private void wakeMainActivityFromBackground(String fullCommand) {
        try {
            Intent launch = new Intent(this, MainActivity.class);
            launch.setAction("com.jarvis.assistant.WAKE_FROM_BACKGROUND");
            launch.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT |
                Intent.FLAG_ACTIVITY_CLEAR_TOP
            );
            launch.putExtra(EXTRA_WAKE_COMMAND, fullCommand);
            JarvisCommandHelper.launchIntentSafely(this, launch);
        } catch (Exception ignored) {
        }
    }

    private void startRecognizerIfNeeded() {
        if (!shouldListenNow() || recognizerActive || recognizerStarting) return;
        try {
            ensureSpeechRecognizer();
            if (speechRecognizer != null && recognizerIntent != null) {
                recognizerStarting = true;
                lastStartAttemptMs = System.currentTimeMillis();
                recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, recognitionLang != null ? recognitionLang : "en-US");
                speechRecognizer.startListening(recognizerIntent);
            }
        } catch (Exception ignored) {
            recognizerStarting = false;
            resetRecognizerInstance();
            scheduleRecognizerRestart(350);
        }
    }

    private void pauseRecognizerForTts() {
        recognizerStarting = false;
        if (speechRecognizer != null) {
            try {
                speechRecognizer.cancel();
            } catch (Exception ignored) {
            }
        }
        recognizerActive = false;
    }

    private void stopRecognizerInternal() {
        mainHandler.removeCallbacksAndMessages(null);
        recognizerStarting = false;
        if (speechRecognizer != null) {
            try {
                speechRecognizer.stopListening();
            } catch (Exception ignored) {
            }
        }
        recognizerActive = false;
        broadcastState(false);
    }

    private void resetRecognizerInstance() {
        recognizerStarting = false;
        if (speechRecognizer != null) {
            try {
                speechRecognizer.destroy();
            } catch (Exception ignored) {
            }
            speechRecognizer = null;
        }
        recognizerActive = false;
    }

    private void scheduleRecognizerRestart(long delayMs) {
        mainHandler.postDelayed(() -> {
            if (shouldListenNow() && !recognizerActive && !recognizerStarting) {
                startRecognizerIfNeeded();
            }
        }, delayMs);
    }

    private void broadcastState(boolean listening) {
        lastBroadcastListening = listening;
        Intent b = new Intent(BROADCAST_SPEECH_EVENT);
        b.setPackage(getPackageName());
        b.putExtra("type", "state");
        b.putExtra("listening", listening);
        sendBroadcast(b);
    }

    @Override
    public void onDestroy() {
        isServiceRunning = false;
        stopRecognizerInternal();
        resetRecognizerInstance();
        if (bgTts != null) {
            try {
                bgTts.stop();
                bgTts.shutdown();
            } catch (Exception ignored) {
            }
        }
        if (bgExecutor != null) {
            try {
                bgExecutor.shutdownNow();
            } catch (Exception ignored) {
            }
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {
            }
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "JARVIS Background Assistant",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps JARVIS AI active in the background for hands-free wake-word detection");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
`;
fs.writeFileSync(servicePath, serviceCode);

// 4b. Generate JarvisAccessibilityService.java for zero-tap WhatsApp & Instagram direct auto-send
const accessibilityPath = path.join(javaDir, 'JarvisAccessibilityService.java');
const accessibilityCode = `package com.jarvis.assistant;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Path;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;
import java.util.Locale;

public class JarvisAccessibilityService extends AccessibilityService {
    public static volatile boolean isServiceConnected = false;
    public static volatile JarvisAccessibilityService instance = null;

    private static volatile boolean pendingWhatsAppSend = false;
    private static volatile long pendingDeadlineMs = 0L;
    private static volatile String pendingMessageText = "";
    private static volatile String pendingContactName = "";
    private static volatile long lastClickMs = 0L;

    private static volatile boolean pendingInstagramSend = false;
    private static volatile String pendingIgRecipient = "";
    private static volatile String pendingIgMessage = "";
    private static volatile long pendingIgDeadlineMs = 0L;
    private static volatile int igStage = 0;
    private static volatile long lastIgActionMs = 0L;

    private static volatile boolean pendingSpotifyAutoPlay = false;
    private static volatile String pendingSpotifyQuery = "";
    private static volatile long pendingSpotifyDeadlineMs = 0L;
    private static volatile long lastSpotifyActionMs = 0L;

    private static volatile boolean pendingPhoneUnlock = false;
    private static volatile String pendingUnlockPin = "";
    private static volatile long pendingUnlockDeadlineMs = 0L;
    private static volatile long lastUnlockActionMs = 0L;
    private static volatile boolean unlockDigitsTyped = false;

    private final Handler handler = new Handler(Looper.getMainLooper());

    public static boolean launchActivityFromService(Intent intent) {
        JarvisAccessibilityService svc = instance;
        if (svc == null || intent == null) return false;
        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            svc.startActivity(intent);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    public static void armWhatsAppAutoSend(String message) {
        armWhatsAppAutoSend(message, "");
    }

    public static void armWhatsAppAutoSend(String message, String contactName) {
        pendingMessageText = message != null ? message.trim() : "";
        pendingContactName = contactName != null ? contactName.trim() : "";
        pendingDeadlineMs = System.currentTimeMillis() + 25000L;
        pendingWhatsAppSend = true;
    }

    public static void armInstagramAutoSend(String recipient, String message) {
        pendingIgRecipient = recipient != null ? recipient.trim() : "";
        pendingIgMessage = message != null ? message.trim() : "";
        pendingIgDeadlineMs = System.currentTimeMillis() + 30000L;
        igStage = 0;
        pendingInstagramSend = !pendingIgRecipient.isEmpty();
    }

    public static void armSpotifyAutoPlay(String query) {
        pendingSpotifyQuery = query != null ? query.trim() : "";
        pendingSpotifyDeadlineMs = System.currentTimeMillis() + 14000L;
        pendingSpotifyAutoPlay = true;
    }

    public static void armPhoneUnlock(String pin) {
        if (pin == null || pin.trim().isEmpty()) return;
        pendingUnlockPin = pin.trim();
        pendingUnlockDeadlineMs = System.currentTimeMillis() + 18000L;
        unlockDigitsTyped = false;
        lastUnlockActionMs = 0L;
        pendingPhoneUnlock = true;
        JarvisAccessibilityService svc = instance;
        if (svc != null) {
            svc.handler.postDelayed(svc::tryUnlockKeyguard, 320L);
        }
    }

    public static boolean isEnabled(Context ctx) {
        if (isServiceConnected) return true;
        try {
            String enabledServices = Settings.Secure.getString(
                ctx.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            );
            return enabledServices != null && enabledServices.contains(ctx.getPackageName() + "/");
        } catch (Exception ignored) {
            return false;
        }
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        isServiceConnected = true;
        instance = this;
    }

    @Override
    public void onInterrupt() {}

    @Override
    public void onDestroy() {
        isServiceConnected = false;
        instance = null;
        super.onDestroy();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;
        String pkg = event.getPackageName().toString();
        long now = System.currentTimeMillis();

        if (pendingPhoneUnlock && (pkg.contains("systemui") || pkg.contains("keyguard") || pkg.contains("lockscreen"))) {
            if (now > pendingUnlockDeadlineMs) {
                pendingPhoneUnlock = false;
                pendingUnlockPin = "";
                return;
            }
            tryUnlockKeyguard();
            return;
        }

        if (pendingSpotifyAutoPlay && "com.spotify.music".equals(pkg)) {
            if (now > pendingSpotifyDeadlineMs) {
                pendingSpotifyAutoPlay = false;
                return;
            }
            tryAutoPlaySpotify();
            handler.postDelayed(() -> {
                if (pendingSpotifyAutoPlay && System.currentTimeMillis() <= pendingSpotifyDeadlineMs) {
                    tryAutoPlaySpotify();
                }
            }, 700L);
            return;
        }

        if (pendingWhatsAppSend && ("com.whatsapp".equals(pkg) || "com.whatsapp.w4b".equals(pkg))) {
            if (now > pendingDeadlineMs) {
                pendingWhatsAppSend = false;
                return;
            }
            tryClickWhatsAppSend(pkg);
            handler.postDelayed(() -> {
                if (pendingWhatsAppSend && System.currentTimeMillis() <= pendingDeadlineMs) {
                    tryClickWhatsAppSend(pkg);
                }
            }, 350L);
            return;
        }

        if (pendingInstagramSend && "com.instagram.android".equals(pkg)) {
            if (now > pendingIgDeadlineMs) {
                pendingInstagramSend = false;
                return;
            }
            tryAutomateInstagramDm();
            handler.postDelayed(() -> {
                if (pendingInstagramSend && System.currentTimeMillis() <= pendingIgDeadlineMs) {
                    tryAutomateInstagramDm();
                }
            }, 650L);
        }
    }

    private void tryAutomateInstagramDm() {
        if (!pendingInstagramSend) return;
        long now = System.currentTimeMillis();
        if (now - lastIgActionMs < 650L) return;

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        try {
            // Step A: Inside DM chat thread -> fill composer EditText and click Send
            AccessibilityNodeInfo composer = findInstagramComposer(root);
            if (composer != null && (igStage >= 1 || screenContainsText(root, pendingIgRecipient))) {
                String currentText = composer.getText() != null ? composer.getText().toString().trim() : "";
                if (pendingIgMessage.isEmpty()) {
                    pendingInstagramSend = false;
                    return;
                }
                if (currentText.isEmpty() || !currentText.equals(pendingIgMessage)) {
                    Bundle args = new Bundle();
                    args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, pendingIgMessage);
                    composer.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
                    composer.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
                    lastIgActionMs = now;
                    return;
                }
                AccessibilityNodeInfo sendBtn = findClickableById(root, "com.instagram.android:id/row_thread_composer_button_send");
                if (sendBtn == null) sendBtn = findClickableByTextOrDesc(root, "send", "भेजें");
                if (sendBtn != null) {
                    lastIgActionMs = now;
                    pendingInstagramSend = false;
                    sendBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                }
                return;
            }

            // Step B: On DM inbox search -> type recipient name and tap matching user row
            AccessibilityNodeInfo searchField = findInstagramSearchBox(root);
            if (searchField != null) {
                String currentQuery = searchField.getText() != null ? searchField.getText().toString().trim() : "";
                if (!currentQuery.toLowerCase(Locale.ROOT).contains(pendingIgRecipient.toLowerCase(Locale.ROOT))) {
                    Bundle args = new Bundle();
                    args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, pendingIgRecipient);
                    searchField.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    searchField.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
                    searchField.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
                    igStage = 1;
                    lastIgActionMs = now;
                    return;
                }
                AccessibilityNodeInfo matchRow = findMatchingRecipientRow(root, pendingIgRecipient);
                if (matchRow != null) {
                    lastIgActionMs = now;
                    igStage = 2;
                    matchRow.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                }
                return;
            }

            // Step B2: Tap non-editable DM Search pill/bar if visible on DM inbox
            AccessibilityNodeInfo searchBarTrigger = findClickableByTextOrDescContains(root, "search");
            if (searchBarTrigger != null) {
                lastIgActionMs = now;
                searchBarTrigger.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                return;
            }

            // Step C: On Instagram Home feed -> tap Direct / Messages inbox icon
            AccessibilityNodeInfo inboxBtn = findClickableById(root, "com.instagram.android:id/action_bar_inbox_button");
            if (inboxBtn == null) inboxBtn = findInstagramInboxButton(root);
            if (inboxBtn != null) {
                lastIgActionMs = now;
                inboxBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
        } catch (Exception ignored) {
        }
    }

    private AccessibilityNodeInfo findClickableByTextOrDescContains(AccessibilityNodeInfo node, String keyword) {
        if (node == null) return null;
        if (node.isVisibleToUser() && node.isEnabled() && node.isClickable() && !node.isEditable()) {
            String d = node.getContentDescription() != null ? node.getContentDescription().toString().toLowerCase(Locale.ROOT) : "";
            String t = node.getText() != null ? node.getText().toString().toLowerCase(Locale.ROOT) : "";
            if (d.contains(keyword) || t.contains(keyword)) {
                return node;
            }
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo hit = findClickableByTextOrDescContains(node.getChild(i), keyword);
            if (hit != null) return hit;
        }
        return null;
    }

    private AccessibilityNodeInfo findInstagramComposer(AccessibilityNodeInfo root) {
        AccessibilityNodeInfo byId = findEditableById(root, "com.instagram.android:id/row_thread_composer_edittext");
        if (byId != null) return byId;
        return findEditableByHint(root, "message");
    }

    private AccessibilityNodeInfo findInstagramSearchBox(AccessibilityNodeInfo root) {
        AccessibilityNodeInfo byId = findEditableById(root, "com.instagram.android:id/search_edit_text");
        if (byId == null) byId = findEditableById(root, "com.instagram.android:id/action_bar_search_edit_text");
        if (byId != null) return byId;
        return findEditableByHint(root, "search");
    }

    private AccessibilityNodeInfo findEditableById(AccessibilityNodeInfo root, String viewId) {
        List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId(viewId);
        if (nodes == null) return null;
        for (AccessibilityNodeInfo n : nodes) {
            if (n != null && n.isVisibleToUser() && n.isEditable()) return n;
        }
        return null;
    }

    private AccessibilityNodeInfo findEditableByHint(AccessibilityNodeInfo node, String keyword) {
        if (node == null) return null;
        if (node.isVisibleToUser() && node.isEditable()) {
            CharSequence hint = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? node.getHintText() : null;
            CharSequence desc = node.getContentDescription();
            CharSequence text = node.getText();
            String combined = ((hint != null ? hint : "") + " " + (desc != null ? desc : "") + " " + (text != null ? text : "")).toLowerCase(Locale.ROOT);
            if (combined.contains(keyword)) return node;
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo hit = findEditableByHint(node.getChild(i), keyword);
            if (hit != null) return hit;
        }
        return null;
    }

    private boolean screenContainsText(AccessibilityNodeInfo node, String query) {
        if (node == null || query.isEmpty()) return false;
        CharSequence t = node.getText();
        if (t != null && t.toString().toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT))) {
            return true;
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            if (screenContainsText(node.getChild(i), query)) return true;
        }
        return false;
    }

    private AccessibilityNodeInfo findMatchingRecipientRow(AccessibilityNodeInfo node, String recipient) {
        if (node == null || recipient.isEmpty()) return null;
        String target = recipient.toLowerCase(Locale.ROOT);
        if (!node.isEditable() && node.isVisibleToUser() && node.getText() != null) {
            String txt = node.getText().toString().toLowerCase(Locale.ROOT).trim();
            if (!txt.isEmpty() && txt.contains(target)) {
                AccessibilityNodeInfo cur = node;
                while (cur != null) {
                    if (cur.isClickable() && cur.isEnabled()) return cur;
                    cur = cur.getParent();
                }
            }
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo hit = findMatchingRecipientRow(node.getChild(i), recipient);
            if (hit != null) return hit;
        }
        return null;
    }

    private AccessibilityNodeInfo findInstagramInboxButton(AccessibilityNodeInfo node) {
        if (node == null) return null;
        if (node.isVisibleToUser() && node.isEnabled() && node.isClickable() && node.getContentDescription() != null) {
            String d = node.getContentDescription().toString().toLowerCase(Locale.ROOT);
            if (d.contains("unread message") || d.contains("messaging") || d.contains("direct") || d.equals("messages")) {
                return node;
            }
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo hit = findInstagramInboxButton(node.getChild(i));
            if (hit != null) return hit;
        }
        return null;
    }

    private AccessibilityNodeInfo findClickableByTextOrDesc(AccessibilityNodeInfo node, String kw1, String kw2) {
        if (node == null) return null;
        if (node.isVisibleToUser() && node.isEnabled() && node.isClickable()) {
            String d = node.getContentDescription() != null ? node.getContentDescription().toString().trim().toLowerCase(Locale.ROOT) : "";
            String t = node.getText() != null ? node.getText().toString().trim().toLowerCase(Locale.ROOT) : "";
            if (kw1.equals(d) || kw1.equals(t) || kw2.equals(d) || kw2.equals(t)) {
                return node;
            }
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo hit = findClickableByTextOrDesc(node.getChild(i), kw1, kw2);
            if (hit != null) return hit;
        }
        return null;
    }

    private void tryAutoPlaySpotify() {
        if (!pendingSpotifyAutoPlay) return;
        long now = System.currentTimeMillis();
        if (now - lastSpotifyActionMs < 850L) return;

        try {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am != null && am.isMusicActive()) {
                pendingSpotifyAutoPlay = false;
                return;
            }
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root == null) return;

            AccessibilityNodeInfo playBtn = findClickableByTextOrDescContains(root, "play");
            if (playBtn != null) {
                lastSpotifyActionMs = now;
                pendingSpotifyAutoPlay = false;
                playBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                return;
            }
            if (!pendingSpotifyQuery.isEmpty()) {
                AccessibilityNodeInfo row = findMatchingRecipientRow(root, pendingSpotifyQuery);
                if (row != null) {
                    lastSpotifyActionMs = now;
                    pendingSpotifyAutoPlay = false;
                    row.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void tryUnlockKeyguard() {
        if (!pendingPhoneUnlock || pendingUnlockPin.isEmpty()) return;
        long now = System.currentTimeMillis();
        if (now > pendingUnlockDeadlineMs) {
            pendingPhoneUnlock = false;
            pendingUnlockPin = "";
            return;
        }
        try {
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null && !km.isKeyguardLocked()) {
                pendingPhoneUnlock = false;
                pendingUnlockPin = "";
                return;
            }
            if (now - lastUnlockActionMs < 650L) return;

            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root != null) {
                AccessibilityNodeInfo firstKey = findPinDigitNode(root, String.valueOf(pendingUnlockPin.charAt(0)));
                if (firstKey != null) {
                    if (unlockDigitsTyped) return;
                    unlockDigitsTyped = true;
                    lastUnlockActionMs = now;
                    final String pinCopy = pendingUnlockPin;
                    for (int i = 0; i < pinCopy.length(); i++) {
                        final String digit = String.valueOf(pinCopy.charAt(i));
                        handler.postDelayed(() -> {
                            AccessibilityNodeInfo r = getRootInActiveWindow();
                            if (r == null) return;
                            AccessibilityNodeInfo keyNode = findPinDigitNode(r, digit);
                            if (keyNode != null) {
                                keyNode.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            }
                        }, i * 110L);
                    }
                    handler.postDelayed(() -> {
                        AccessibilityNodeInfo r = getRootInActiveWindow();
                        if (r != null) {
                            AccessibilityNodeInfo enterBtn = findPinEnterNode(r);
                            if (enterBtn != null) {
                                enterBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            }
                        }
                    }, pinCopy.length() * 110L + 160L);
                    handler.postDelayed(() -> {
                        KeyguardManager kmCheck = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
                        if (kmCheck == null || !kmCheck.isKeyguardLocked()) {
                            pendingPhoneUnlock = false;
                            pendingUnlockPin = "";
                        } else {
                            unlockDigitsTyped = false;
                        }
                    }, pinCopy.length() * 110L + 950L);
                    return;
                }
            }

            // Swipe up on lock screen cover to reveal keypad
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                lastUnlockActionMs = now;
                DisplayMetrics dm = getResources().getDisplayMetrics();
                float cx = dm.widthPixels * 0.5f;
                float startY = dm.heightPixels * 0.82f;
                float endY = dm.heightPixels * 0.22f;
                Path swipePath = new Path();
                swipePath.moveTo(cx, startY);
                swipePath.lineTo(cx, endY);
                GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(swipePath, 0L, 260L);
                dispatchGesture(new GestureDescription.Builder().addStroke(stroke).build(), null, null);
                handler.postDelayed(this::tryUnlockKeyguard, 550L);
            }
        } catch (Exception ignored) {
        }
    }

    private AccessibilityNodeInfo findPinDigitNode(AccessibilityNodeInfo root, String digit) {
        if (root == null || digit == null) return null;
        AccessibilityNodeInfo byId = findClickableById(root, "com.android.systemui:id/key" + digit);
        if (byId != null) return byId;
        return findDigitButtonRecursive(root, digit);
    }

    private AccessibilityNodeInfo findDigitButtonRecursive(AccessibilityNodeInfo node, String digit) {
        if (node == null) return null;
        if (node.isVisibleToUser() && node.isEnabled()) {
            String t = node.getText() != null ? node.getText().toString().trim() : "";
            String d = node.getContentDescription() != null ? node.getContentDescription().toString().trim() : "";
            boolean matchText = t.equals(digit) || t.startsWith(digit + "\\n") || t.startsWith(digit + " ");
            boolean matchDesc = d.equals(digit) || d.equalsIgnoreCase("key " + digit);
            if (matchText || matchDesc) {
                AccessibilityNodeInfo cur = node;
                while (cur != null) {
                    if (cur.isClickable() && cur.isEnabled()) return cur;
                    cur = cur.getParent();
                }
            }
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo hit = findDigitButtonRecursive(node.getChild(i), digit);
            if (hit != null) return hit;
        }
        return null;
    }

    private AccessibilityNodeInfo findPinEnterNode(AccessibilityNodeInfo root) {
        AccessibilityNodeInfo byId = findClickableById(root, "com.android.systemui:id/key_enter");
        if (byId != null) return byId;
        AccessibilityNodeInfo ok = findClickableByTextOrDesc(root, "ok", "enter");
        if (ok != null) return ok;
        return findClickableByTextOrDescContains(root, "done");
    }

    private void tryClickWhatsAppSend(String pkg) {
        if (!pendingWhatsAppSend) return;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        try {
            AccessibilityNodeInfo entry = findEditableById(root, pkg + ":id/entry");
            if (entry == null) entry = findEditableById(root, "com.whatsapp:id/entry");
            if (entry == null) entry = findEditableById(root, "com.whatsapp.w4b:id/entry");

            if (entry != null) {
                String currentText = entry.getText() != null ? entry.getText().toString().trim() : "";
                if (!pendingMessageText.isEmpty() && (currentText.isEmpty() || !currentText.contains(pendingMessageText))) {
                    long now = System.currentTimeMillis();
                    if (now - lastClickMs < 450L) return;
                    lastClickMs = now;
                    Bundle args = new Bundle();
                    args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, pendingMessageText);
                    entry.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
                    entry.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
                    return;
                }

                AccessibilityNodeInfo sendBtn = findClickableById(root, pkg + ":id/send");
                if (sendBtn == null) sendBtn = findClickableById(root, "com.whatsapp:id/send");
                if (sendBtn == null) sendBtn = findClickableById(root, "com.whatsapp.w4b:id/send");
                if (sendBtn == null) sendBtn = findClickableByContentDesc(root);

                if (sendBtn != null && !currentText.isEmpty()) {
                    long now = System.currentTimeMillis();
                    if (now - lastClickMs < 1100L) return;
                    lastClickMs = now;
                    pendingWhatsAppSend = false;
                    pendingContactName = "";
                    sendBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                }
                return;
            }

            // Contact Picker or Chats list: find contact row, or search by stripped name!
            if (!pendingContactName.isEmpty()) {
                long now = System.currentTimeMillis();
                if (now - lastClickMs < 650L) return;
                String strippedName = JarvisCommandHelper.stripContactHonorifics(pendingContactName);
                AccessibilityNodeInfo pickerRow = findMatchingRecipientRow(root, pendingContactName);
                if (pickerRow == null && !strippedName.isEmpty() && !strippedName.equalsIgnoreCase(pendingContactName)) {
                    pickerRow = findMatchingRecipientRow(root, strippedName);
                }
                if (pickerRow != null) {
                    lastClickMs = now;
                    pendingContactName = "";
                    pickerRow.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    return;
                }

                String searchTarget = !strippedName.isEmpty() ? strippedName : pendingContactName;
                AccessibilityNodeInfo searchBox = findEditableById(root, pkg + ":id/search_src_text");
                if (searchBox == null) searchBox = findEditableById(root, "com.whatsapp:id/search_src_text");
                if (searchBox == null) searchBox = findEditableById(root, "com.whatsapp.w4b:id/search_src_text");
                if (searchBox == null) searchBox = findEditableByHint(root, "search");
                if (searchBox != null) {
                    String q = searchBox.getText() != null ? searchBox.getText().toString().trim() : "";
                    if (!q.toLowerCase(Locale.ROOT).contains(searchTarget.toLowerCase(Locale.ROOT))) {
                        lastClickMs = now;
                        Bundle args = new Bundle();
                        args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, searchTarget);
                        searchBox.performAction(AccessibilityNodeInfo.ACTION_FOCUS);
                        searchBox.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
                    }
                    return;
                }

                AccessibilityNodeInfo searchIcon = findClickableById(root, pkg + ":id/menuitem_search");
                if (searchIcon == null) searchIcon = findClickableById(root, "com.whatsapp:id/menuitem_search");
                if (searchIcon == null) searchIcon = findClickableById(root, "com.whatsapp.w4b:id/menuitem_search");
                if (searchIcon == null) searchIcon = findClickableByTextOrDescContains(root, "search");
                if (searchIcon != null) {
                    lastClickMs = now;
                    searchIcon.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                }
            }
        } catch (Exception ignored) {
        }
    }

    private AccessibilityNodeInfo findClickableById(AccessibilityNodeInfo root, String viewId) {
        List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId(viewId);
        if (nodes == null) return null;
        for (AccessibilityNodeInfo node : nodes) {
            if (node != null && node.isVisibleToUser() && node.isEnabled()) {
                if (node.isClickable()) return node;
                AccessibilityNodeInfo parent = node.getParent();
                if (parent != null && parent.isClickable()) return parent;
            }
        }
        return null;
    }

    private AccessibilityNodeInfo findClickableByContentDesc(AccessibilityNodeInfo node) {
        if (node == null) return null;
        CharSequence desc = node.getContentDescription();
        if (desc != null && node.isVisibleToUser() && node.isEnabled() && node.isClickable()) {
            String d = desc.toString().trim().toLowerCase();
            if ("send".equals(d) || "भेजें".equals(d)) {
                return node;
            }
        }
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo hit = findClickableByContentDesc(node.getChild(i));
            if (hit != null) return hit;
        }
        return null;
    }
}
`;
fs.writeFileSync(accessibilityPath, accessibilityCode);

// 5. Generate MainActivity.java with native bridge, Assist intent handling, Overlay/Battery/Accessibility/Assistant settings, and Service sync
const mainActivityPath = path.join(javaDir, 'MainActivity.java');
const mainActivityCode = `package com.jarvis.assistant;

import android.Manifest;
import android.app.ActivityManager;
import android.app.NotificationManager;
import android.app.SearchManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.ContactsContract;
import android.provider.MediaStore;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private boolean backgroundModeEnabled = true;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private String pendingWakeCommand = "";
    private BroadcastReceiver speechBroadcastReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        enableLockScreenWakeFlags();
        requestJarvisPermissions();
        initNativeTextToSpeech();
        registerSpeechReceiver();

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.addJavascriptInterface(new JarvisNativeBridge(), "JarvisAndroid");
        }

        handleWakeIntent(getIntent());
        ensureBackgroundServiceIfAllowed();
    }

    private void enableLockScreenWakeFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWakeIntent(intent);
    }

    private void handleWakeIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        boolean isAssistIntent =
            Intent.ACTION_ASSIST.equals(action) ||
            Intent.ACTION_VOICE_COMMAND.equals(action) ||
            "com.jarvis.assistant.WAKE_FROM_BACKGROUND".equals(action);

        if (intent.hasExtra(JarvisBackgroundService.EXTRA_WAKE_COMMAND)) {
            String cmd = intent.getStringExtra(JarvisBackgroundService.EXTRA_WAKE_COMMAND);
            pendingWakeCommand = cmd != null ? cmd : "";
            dispatchJsEvent("jarvis-wake-command", "{\\"command\\":" + JSONObject.quote(pendingWakeCommand) + "}");
        } else if (isAssistIntent) {
            pendingWakeCommand = "__WAKE__";
            dispatchJsEvent("jarvis-wake-command", "{\\"command\\":\\"\\"}");
        }
    }

    private void registerSpeechReceiver() {
        speechBroadcastReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null) return;
                String type = intent.getStringExtra("type");
                if ("state".equals(type)) {
                    boolean listening = intent.getBooleanExtra("listening", false);
                    dispatchJsEvent("jarvis-native-speech", "{\\"type\\":\\"state\\",\\"listening\\":" + listening + "}");
                } else if ("result".equals(type)) {
                    boolean isFinal = intent.getBooleanExtra("isFinal", false);
                    String transcript = intent.getStringExtra("transcript");
                    if (transcript != null) {
                        dispatchJsEvent(
                            "jarvis-native-speech",
                            "{\\"type\\":\\"result\\",\\"isFinal\\":" + isFinal + ",\\"transcript\\":" + JSONObject.quote(transcript) + "}"
                        );
                    }
                }
            }
        };
        IntentFilter filter = new IntentFilter(JarvisBackgroundService.BROADCAST_SPEECH_EVENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(speechBroadcastReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(speechBroadcastReceiver, filter);
        }
    }

    private void ensureBackgroundServiceIfAllowed() {
        SharedPreferences prefs = getSharedPreferences("jarvis_prefs", MODE_PRIVATE);
        backgroundModeEnabled = prefs.getBoolean("backgroundMode", true);
        boolean hasMic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        if (backgroundModeEnabled && hasMic) {
            Intent serviceIntent = new Intent(this, JarvisBackgroundService.class);
            serviceIntent.setAction(JarvisBackgroundService.ACTION_START_LISTENING);
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            ensureBackgroundServiceIfAllowed();
            dispatchJsEvent("jarvis-permissions-updated", "{}");
        }
    }

    private void requestJarvisPermissions() {
        List<String> needed = new ArrayList<>();
        String[] perms = new String[]{
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA,
            Manifest.permission.CALL_PHONE,
            Manifest.permission.READ_CONTACTS
        };
        for (String p : perms) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                needed.add(p);
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    private void initNativeTextToSpeech() {
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int res = tts.setLanguage(Locale.US);
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(new Locale("en", "IN"));
                }
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {
                        JarvisBackgroundService.isTtsSpeaking = true;
                        notifyServiceTtsState(true);
                        dispatchJsEvent("jarvis-native-tts", "{\\"state\\":\\"start\\"}");
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        JarvisBackgroundService.isTtsSpeaking = false;
                        notifyServiceTtsState(false);
                        dispatchJsEvent("jarvis-native-tts", "{\\"state\\":\\"end\\"}");
                    }

                    @Override
                    public void onError(String utteranceId) {
                        JarvisBackgroundService.isTtsSpeaking = false;
                        notifyServiceTtsState(false);
                        dispatchJsEvent("jarvis-native-tts", "{\\"state\\":\\"end\\"}");
                    }
                });
                ttsReady = true;
            }
        });
    }

    private void notifyServiceTtsState(boolean speaking) {
        try {
            Intent serviceIntent = new Intent(MainActivity.this, JarvisBackgroundService.class);
            serviceIntent.setAction(JarvisBackgroundService.ACTION_TTS_STATE);
            serviceIntent.putExtra("speaking", speaking);
            startService(serviceIntent);
        } catch (Exception ignored) {
        }
    }

    private void dispatchJsEvent(String eventName, String detailJson) {
        runOnUiThread(() -> {
            if (bridge != null && bridge.getWebView() != null) {
                String js = "window.dispatchEvent(new CustomEvent('" + eventName + "', { detail: " + detailJson + " }));";
                bridge.getWebView().evaluateJavascript(js, null);
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        JarvisBackgroundService.isActivityVisible = true;
        ensureBackgroundServiceIfAllowed();
    }

    @Override
    public void onPause() {
        super.onPause();
        JarvisBackgroundService.isActivityVisible = false;
        if (backgroundModeEnabled && bridge != null && bridge.getWebView() != null) {
            try {
                bridge.getWebView().resumeTimers();
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    public void onDestroy() {
        JarvisBackgroundService.isActivityVisible = false;
        if (speechBroadcastReceiver != null) {
            try {
                unregisterReceiver(speechBroadcastReceiver);
            } catch (Exception ignored) {
            }
        }
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {
            }
        }
        super.onDestroy();
    }

    public class JarvisNativeBridge {
        private String normalizeAppToken(String value) {
            if (value == null) return "";
            return value.toLowerCase(Locale.US).replaceAll("[^a-z0-9]", "");
        }

        private String expandAppAlias(String norm) {
            if ("insta".equals(norm) || "ig".equals(norm)) return "instagram";
            if ("yt".equals(norm)) return "youtube";
            if ("wa".equals(norm)) return "whatsapp";
            if ("freefire".equals(norm) || "freefire".equals(norm) || "freefiremax".equals(norm) || "ff".equals(norm)) return "freefire";
            if ("freef".equals(norm) || "freefiree".equals(norm) || "freefiregame".equals(norm)) return "freefire";
            if ("call".equals(norm) || "dialer".equals(norm) || "phonedialer".equals(norm) || "phoneapp".equals(norm)) return "phone";
            if ("calender".equals(norm)) return "calendar";
            if ("gpay".equals(norm) || "googlepay".equals(norm)) return "gpay";
            if ("playstore".equals(norm)) return "playstore";
            if ("browser".equals(norm)) return "chrome";
            return norm;
        }

        private boolean launchPackageOrActivity(PackageManager pm, String packageName, String activityName) {
            try {
                if (packageName != null && !packageName.isEmpty()) {
                    Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(launchIntent);
                        return true;
                    }
                    if (activityName != null && !activityName.isEmpty()) {
                        Intent explicit = new Intent(Intent.ACTION_MAIN);
                        explicit.addCategory(Intent.CATEGORY_LAUNCHER);
                        explicit.setClassName(packageName, activityName);
                        explicit.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(explicit);
                        return true;
                    }
                }
            } catch (Exception ignored) {
            }
            return false;
        }

        private int scoreAppMatch(String rawQuery, String normQuery, String expandedQuery, String rawLabel, String normLabel, String pkgLower) {
            if (normLabel.isEmpty() && pkgLower.isEmpty()) return 0;
            if (normLabel.equals(normQuery) || (!expandedQuery.isEmpty() && normLabel.equals(expandedQuery))) return 100;
            if (rawLabel.equals(rawQuery)) return 95;
            if (!normQuery.isEmpty() && normLabel.startsWith(normQuery)) return 88;
            if (!expandedQuery.isEmpty() && normLabel.startsWith(expandedQuery)) return 86;
            if (!normQuery.isEmpty() && normLabel.contains(normQuery)) return 78;
            if (!expandedQuery.isEmpty() && normLabel.contains(expandedQuery)) return 76;
            if (!normQuery.isEmpty() && normQuery.length() >= 3 && normQuery.contains(normLabel) && normLabel.length() >= 3) return 70;
            if (!expandedQuery.isEmpty() && expandedQuery.length() >= 3 && expandedQuery.contains(normLabel) && normLabel.length() >= 3) return 68;
            if (!normQuery.isEmpty() && normQuery.length() >= 3 && pkgLower.contains(normQuery)) return 62;
            if (!expandedQuery.isEmpty() && expandedQuery.length() >= 3 && pkgLower.contains(expandedQuery)) return 60;

            String probe = expandedQuery.isEmpty() ? normQuery : expandedQuery;
            if (probe.length() >= 4 && normLabel.length() >= 4) {
                int prefixMatch = 0;
                int maxPrefix = Math.min(probe.length(), normLabel.length());
                while (prefixMatch < maxPrefix && probe.charAt(prefixMatch) == normLabel.charAt(prefixMatch)) {
                    prefixMatch++;
                }
                if (prefixMatch >= Math.max(4, Math.min(probe.length(), normLabel.length()) - 1)) {
                    return 56;
                }
                int sharedBigrams = 0;
                int totalBigrams = Math.max(1, probe.length() - 1);
                for (int i = 0; i < probe.length() - 1; i++) {
                    String bi = probe.substring(i, i + 2);
                    if (normLabel.contains(bi)) {
                        sharedBigrams++;
                    }
                }
                if ((sharedBigrams * 100) / totalBigrams >= 70) {
                    return 52;
                }
            }
            return 0;
        }

        @JavascriptInterface
        public String getInstalledApps() {
            JSONArray array = new JSONArray();
            try {
                PackageManager pm = getPackageManager();
                Intent mainIntent = new Intent(Intent.ACTION_MAIN);
                mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                List<ResolveInfo> resolved = pm.queryIntentActivities(mainIntent, 0);
                if (resolved == null) return "[]";

                Set<String> seenPackages = new HashSet<>();
                String selfPkg = getPackageName();
                List<String[]> items = new ArrayList<>();

                for (ResolveInfo info : resolved) {
                    if (info.activityInfo == null) continue;
                    String pkg = info.activityInfo.packageName;
                    if (pkg == null || pkg.isEmpty() || pkg.equals(selfPkg) || seenPackages.contains(pkg)) continue;
                    seenPackages.add(pkg);
                    CharSequence labelSeq = info.loadLabel(pm);
                    String label = labelSeq != null ? labelSeq.toString().trim() : pkg;
                    if (label.isEmpty()) label = pkg;
                    items.add(new String[]{ label, pkg });
                }

                Collections.sort(items, (a, b) -> a[0].compareToIgnoreCase(b[0]));

                for (String[] item : items) {
                    JSONObject obj = new JSONObject();
                    obj.put("name", item[0]);
                    obj.put("packageName", item[1]);
                    array.put(obj);
                }
            } catch (Exception ignored) {
            }
            return array.toString();
        }

        @JavascriptInterface
        public boolean openApp(String packageName, String fallbackUrl) {
            return openAppByName("", packageName, fallbackUrl);
        }

        @JavascriptInterface
        public boolean openAppByName(String appQuery, String packageHintsCsv, String fallbackUrl) {
            try {
                PackageManager pm = getPackageManager();

                // 1. Try explicit package hints first (supports comma-separated candidate packages)
                if (packageHintsCsv != null && !packageHintsCsv.trim().isEmpty()) {
                    String[] candidates = packageHintsCsv.split(",");
                    for (String candidate : candidates) {
                        String pkg = candidate != null ? candidate.trim() : "";
                        if (!pkg.isEmpty() && launchPackageOrActivity(pm, pkg, null)) {
                            return true;
                        }
                    }
                }

                String rawQuery = appQuery == null ? "" : appQuery.trim().toLowerCase(Locale.US);
                String normQuery = normalizeAppToken(rawQuery);
                String expandedQuery = expandAppAlias(normQuery);

                // 2. Scan ALL installed launcher apps on device and launch best fuzzy match
                if (!normQuery.isEmpty() || !expandedQuery.isEmpty()) {
                    Intent mainIntent = new Intent(Intent.ACTION_MAIN);
                    mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
                    List<ResolveInfo> resolved = pm.queryIntentActivities(mainIntent, 0);
                    if (resolved != null) {
                        int bestScore = 0;
                        String bestPkg = null;
                        String bestActivity = null;
                        String selfPkg = getPackageName();

                        for (ResolveInfo info : resolved) {
                            if (info.activityInfo == null) continue;
                            String pkg = info.activityInfo.packageName;
                            if (pkg == null || pkg.isEmpty() || pkg.equals(selfPkg)) continue;

                            CharSequence labelSeq = info.loadLabel(pm);
                            String rawLabel = labelSeq != null ? labelSeq.toString().trim().toLowerCase(Locale.US) : "";
                            String normLabel = normalizeAppToken(rawLabel);
                            String pkgLower = pkg.toLowerCase(Locale.US);

                            int score = scoreAppMatch(rawQuery, normQuery, expandedQuery, rawLabel, normLabel, pkgLower);
                            if (score > bestScore) {
                                bestScore = score;
                                bestPkg = pkg;
                                bestActivity = info.activityInfo.name;
                            }
                        }

                        if (bestScore >= 52 && launchPackageOrActivity(pm, bestPkg, bestActivity)) {
                            return true;
                        }
                    }
                }

                // 3. Android system app intent fallbacks (Dialer/Call, Calendar, Camera, Settings, Google, Truecaller, Free Fire)
                String effective = expandedQuery.isEmpty() ? normQuery : expandedQuery;
                if ("phone".equals(effective) || "dialer".equals(effective) || "call".equals(effective) || "contacts".equals(effective)) {
                    String[] dialers = new String[]{
                        "com.google.android.dialer",
                        "com.android.dialer",
                        "com.samsung.android.dialer",
                        "com.android.contacts"
                    };
                    for (String pkg : dialers) {
                        if (launchPackageOrActivity(pm, pkg, null)) return true;
                    }
                    Intent dialIntent = new Intent(Intent.ACTION_DIAL);
                    dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(dialIntent);
                    return true;
                }

                if ("calendar".equals(effective)) {
                    String[] calendars = new String[]{
                        "com.google.android.calendar",
                        "com.android.calendar",
                        "com.samsung.android.calendar"
                    };
                    for (String pkg : calendars) {
                        if (launchPackageOrActivity(pm, pkg, null)) return true;
                    }
                    try {
                        Intent calSelector = Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_CALENDAR);
                        calSelector.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(calSelector);
                        return true;
                    } catch (Exception ignored) {
                    }
                    try {
                        Intent calView = new Intent(Intent.ACTION_VIEW, Uri.parse("content://com.android.calendar/time/"));
                        calView.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(calView);
                        return true;
                    } catch (Exception ignored) {
                    }
                }

                if ("settings".equals(effective)) {
                    Intent settingsIntent = new Intent(Settings.ACTION_SETTINGS);
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(settingsIntent);
                    return true;
                }

                if ("google".equals(effective)) {
                    String[] googlePkgs = new String[]{
                        "com.google.android.googlequicksearchbox",
                        "com.android.chrome"
                    };
                    for (String pkg : googlePkgs) {
                        if (launchPackageOrActivity(pm, pkg, null)) return true;
                    }
                }

                if ("truecaller".equals(effective)) {
                    if (launchPackageOrActivity(pm, "com.truecaller", null)) return true;
                }

                if ("freefire".equals(effective)) {
                    if (launchPackageOrActivity(pm, "com.dts.freefireth", null)) return true;
                    if (launchPackageOrActivity(pm, "com.dts.freefiremax", null)) return true;
                }

                // 4. Web fallback if no native package exists
                if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl));
                    browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(browserIntent);
                    return true;
                }
            } catch (Exception ignored) {
            }
            return false;
        }

        @JavascriptInterface
        public boolean openExternalUrl(String url) {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean searchInApp(String appId, String query, String fallbackUrl) {
            try {
                String cleanApp = appId == null ? "youtube" : appId.trim().toLowerCase(Locale.US);
                String cleanQuery = query == null ? "" : query.trim();
                if (cleanQuery.isEmpty()) return false;

                if ("youtube".equals(cleanApp) || "yt".equals(cleanApp)) {
                    try {
                        Intent ytSearch = new Intent(Intent.ACTION_SEARCH);
                        ytSearch.setPackage("com.google.android.youtube");
                        ytSearch.putExtra(SearchManager.QUERY, cleanQuery);
                        ytSearch.putExtra("query", cleanQuery);
                        ytSearch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(ytSearch);
                        return true;
                    } catch (Exception ignored) {
                    }
                    try {
                        Intent ytUrl = new Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(cleanQuery))
                        );
                        ytUrl.setPackage("com.google.android.youtube");
                        ytUrl.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(ytUrl);
                        return true;
                    } catch (Exception ignored) {
                    }
                } else if ("spotify".equals(cleanApp)) {
                    try {
                        Intent spSearch = new Intent(MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH);
                        spSearch.setPackage("com.spotify.music");
                        spSearch.putExtra(SearchManager.QUERY, cleanQuery);
                        spSearch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(spSearch);
                        return true;
                    } catch (Exception ignored) {
                    }
                    try {
                        Intent spUri = new Intent(Intent.ACTION_VIEW, Uri.parse("spotify:search:" + Uri.encode(cleanQuery)));
                        spUri.setPackage("com.spotify.music");
                        spUri.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(spUri);
                        return true;
                    } catch (Exception ignored) {
                    }
                } else if ("maps".equals(cleanApp) || "googlemaps".equals(cleanApp)) {
                    try {
                        Intent mapIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=" + Uri.encode(cleanQuery)));
                        mapIntent.setPackage("com.google.android.apps.maps");
                        mapIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(mapIntent);
                        return true;
                    } catch (Exception ignored) {
                    }
                } else if ("playstore".equals(cleanApp)) {
                    try {
                        Intent marketIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://search?q=" + Uri.encode(cleanQuery)));
                        marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(marketIntent);
                        return true;
                    } catch (Exception ignored) {
                    }
                } else if ("google".equals(cleanApp)) {
                    try {
                        Intent gSearch = new Intent(Intent.ACTION_WEB_SEARCH);
                        gSearch.putExtra(SearchManager.QUERY, cleanQuery);
                        gSearch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(gSearch);
                        return true;
                    } catch (Exception ignored) {
                    }
                }

                if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                    Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(fallbackUrl));
                    webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(webIntent);
                    return true;
                }
            } catch (Exception ignored) {
            }
            return false;
        }

        private String lookupRealContactPhone(String contactQuery) {
            return JarvisCommandHelper.lookupRealContactPhone(MainActivity.this, contactQuery);
        }

        @JavascriptInterface
        public boolean makePhoneCall(String phoneNumber) {
            String res = makeDirectCall(phoneNumber, "");
            return res.startsWith("ok");
        }

        @JavascriptInterface
        public String makeDirectCall(String phoneNumber, String contactName) {
            String res = JarvisCommandHelper.makeDirectCall(MainActivity.this, phoneNumber, contactName);
            if ("needs_call_permission".equals(res)) {
                runOnUiThread(() -> ActivityCompat.requestPermissions(
                    MainActivity.this,
                    new String[]{Manifest.permission.CALL_PHONE, Manifest.permission.READ_CONTACTS},
                    PERMISSION_REQUEST_CODE
                ));
            }
            return res;
        }

        @JavascriptInterface
        public boolean sendWhatsApp(String phoneNumber, String message) {
            String res = sendWhatsAppDirect(phoneNumber, message, "");
            return !res.startsWith("error");
        }

        @JavascriptInterface
        public String sendWhatsAppDirect(String phoneNumber, String message, String contactName) {
            return JarvisCommandHelper.sendWhatsAppDirect(MainActivity.this, phoneNumber, message, contactName);
        }

        @JavascriptInterface
        public String sendInstagramDirect(String recipientName, String message) {
            return JarvisCommandHelper.sendInstagramDirect(MainActivity.this, recipientName, message);
        }

        @JavascriptInterface
        public boolean playMusicOrMedia(String action, String songQuery) {
            return JarvisCommandHelper.playMusicOrMedia(MainActivity.this, action, songQuery);
        }

        @JavascriptInterface
        public String askKnowledge(String question, String langCode) {
            return JarvisKnowledgeEngine.answerQuestion(question, langCode);
        }

        @JavascriptInterface
        public String getDeviceTelemetry() {
            JSONObject obj = new JSONObject();
            try {
                Date now = new Date();
                SimpleDateFormat dateFmt = new SimpleDateFormat("EEEE, MMMM d, yyyy", Locale.US);
                SimpleDateFormat dayFmt = new SimpleDateFormat("EEEE", Locale.US);
                SimpleDateFormat timeFmt = new SimpleDateFormat("hh:mm a", Locale.US);
                obj.put("localDate", dateFmt.format(now));
                obj.put("localDay", dayFmt.format(now));
                obj.put("localTime", timeFmt.format(now));
                obj.put("timezone", TimeZone.getDefault().getID());
                obj.put("deviceModel", Build.MANUFACTURER + " " + Build.MODEL);
                obj.put("androidVersion", Build.VERSION.RELEASE);

                Intent batteryStatus = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
                if (batteryStatus != null) {
                    int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                    int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                    int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                    boolean isCharging =
                        status == BatteryManager.BATTERY_STATUS_CHARGING ||
                        status == BatteryManager.BATTERY_STATUS_FULL;
                    if (level >= 0 && scale > 0) {
                        obj.put("batteryLevel", Math.round((level * 100f) / scale));
                    }
                    obj.put("isCharging", isCharging);
                }

                ActivityManager am = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
                if (am != null) {
                    ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
                    am.getMemoryInfo(mi);
                    long totalMb = mi.totalMem / (1024L * 1024L);
                    long availMb = mi.availMem / (1024L * 1024L);
                    obj.put("totalMemoryMb", totalMb);
                    obj.put("availableMemoryMb", availMb);
                    if (totalMb > 0) {
                        obj.put("memoryUsagePercent", Math.round(((totalMb - availMb) * 100f) / totalMb));
                    }
                }

                AudioManager amAudio = (AudioManager) getSystemService(AUDIO_SERVICE);
                if (amAudio != null) {
                    int rm = amAudio.getRingerMode();
                    String ringerStr = rm == AudioManager.RINGER_MODE_SILENT
                        ? "silent"
                        : rm == AudioManager.RINGER_MODE_VIBRATE
                        ? "vibrate"
                        : "normal";
                    obj.put("ringerMode", ringerStr);
                    int maxVol = amAudio.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                    int curVol = amAudio.getStreamVolume(AudioManager.STREAM_MUSIC);
                    if (maxVol > 0) {
                        obj.put("volumePercent", Math.round((curVol * 100f) / maxVol));
                    }
                }

                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
                if (wm != null) {
                    obj.put("wifiEnabled", wm.isWifiEnabled());
                }

                ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
                if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Network activeNet = cm.getActiveNetwork();
                    NetworkCapabilities caps = activeNet != null ? cm.getNetworkCapabilities(activeNet) : null;
                    boolean connected = caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
                    String netType = "none";
                    if (caps != null) {
                        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) netType = "wifi";
                        else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) netType = "cellular";
                        else if (connected) netType = "other";
                    }
                    obj.put("networkConnected", connected);
                    obj.put("networkType", netType);
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                    obj.put("hasDndAccess", nm != null && nm.isNotificationPolicyAccessGranted());
                    obj.put("canWriteSettings", Settings.System.canWrite(MainActivity.this));
                }
            } catch (Exception ignored) {
            }
            return obj.toString();
        }

        @JavascriptInterface
        public String setRingerMode(String mode) {
            return JarvisCommandHelper.setRingerMode(MainActivity.this, mode);
        }

        @JavascriptInterface
        public boolean setPhoneVolume(int percent) {
            try {
                AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
                if (am == null) return false;
                int clamped = Math.max(0, Math.min(100, percent));
                int maxMusic = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                int targetVol = Math.round((clamped * maxMusic) / 100f);
                am.setStreamVolume(AudioManager.STREAM_MUSIC, targetVol, AudioManager.FLAG_SHOW_UI);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public String setPhoneBrightness(int percent) {
            final int clamped = Math.max(5, Math.min(100, percent));
            runOnUiThread(() -> {
                try {
                    WindowManager.LayoutParams lp = getWindow().getAttributes();
                    lp.screenBrightness = clamped / 100f;
                    getWindow().setAttributes(lp);
                } catch (Exception ignored) {
                }
            });
            try {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.System.canWrite(MainActivity.this)) {
                    int value255 = Math.max(10, Math.min(255, Math.round((clamped * 255f) / 100f)));
                    Settings.System.putInt(getContentResolver(), Settings.System.SCREEN_BRIGHTNESS_MODE, Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL);
                    Settings.System.putInt(getContentResolver(), Settings.System.SCREEN_BRIGHTNESS, value255);
                    return "ok";
                }
            } catch (Exception ignored) {
            }
            return "window_only";
        }

        @JavascriptInterface
        public String controlDeviceSetting(String settingType, String action) {
            return JarvisCommandHelper.controlDeviceSetting(MainActivity.this, settingType, action);
        }

        @JavascriptInterface
        public String getDeviceContacts() {
            JSONArray array = new JSONArray();
            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
                return "[]";
            }
            Cursor cursor = null;
            try {
                cursor = getContentResolver().query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    new String[]{
                        ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                        ContactsContract.CommonDataKinds.Phone.NUMBER
                    },
                    null,
                    null,
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
                );
                if (cursor != null) {
                    int nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                    int numIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                    int count = 0;
                    while (cursor.moveToNext() && count < 200) {
                        String name = nameIdx >= 0 ? cursor.getString(nameIdx) : "";
                        String phone = numIdx >= 0 ? cursor.getString(numIdx) : "";
                        if (name != null && phone != null && !name.trim().isEmpty() && !phone.trim().isEmpty()) {
                            JSONObject obj = new JSONObject();
                            obj.put("name", name.trim());
                            obj.put("phone", phone.trim());
                            array.put(obj);
                            count++;
                        }
                    }
                }
            } catch (Exception ignored) {
            } finally {
                if (cursor != null) {
                    cursor.close();
                }
            }
            return array.toString();
        }

        @JavascriptInterface
        public boolean setBackgroundMode(boolean enabled) {
            backgroundModeEnabled = enabled;
            getSharedPreferences("jarvis_prefs", MODE_PRIVATE).edit().putBoolean("backgroundMode", enabled).apply();
            try {
                Intent serviceIntent = new Intent(MainActivity.this, JarvisBackgroundService.class);
                if (enabled) {
                    serviceIntent.setAction(JarvisBackgroundService.ACTION_RELOAD_CONFIG);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent);
                    } else {
                        startService(serviceIntent);
                    }
                } else {
                    stopService(serviceIntent);
                }
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean configureAssistant(String wakeWord, String langCode, boolean backgroundEnabled, boolean alwaysOnWakeWord) {
            backgroundModeEnabled = backgroundEnabled;
            getSharedPreferences("jarvis_prefs", MODE_PRIVATE)
                .edit()
                .putString("wakeWord", wakeWord != null && !wakeWord.trim().isEmpty() ? wakeWord.trim() : "Jarvis")
                .putString("langCode", langCode != null && !langCode.trim().isEmpty() ? langCode.trim() : "en-US")
                .putBoolean("backgroundMode", backgroundEnabled)
                .putBoolean("alwaysOnWakeWord", alwaysOnWakeWord)
                .apply();
            try {
                Intent serviceIntent = new Intent(MainActivity.this, JarvisBackgroundService.class);
                if (backgroundEnabled || alwaysOnWakeWord) {
                    serviceIntent.setAction(JarvisBackgroundService.ACTION_RELOAD_CONFIG);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent);
                    } else {
                        startService(serviceIntent);
                    }
                } else {
                    stopService(serviceIntent);
                }
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public String getBackgroundStatus() {
            JSONObject obj = new JSONObject();
            try {
                boolean canOverlay = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(MainActivity.this);
                boolean ignoringBattery = true;
                boolean hasDndAccess = true;
                boolean canWriteSettings = true;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                    ignoringBattery = pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
                    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                    hasDndAccess = nm != null && nm.isNotificationPolicyAccessGranted();
                    canWriteSettings = Settings.System.canWrite(MainActivity.this);
                }
                boolean hasMic = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
                boolean hasCall = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
                boolean hasContacts = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED;
                boolean a11yEnabled = JarvisAccessibilityService.isEnabled(MainActivity.this);
                obj.put("canDrawOverlays", canOverlay);
                obj.put("ignoringBatteryOptimizations", ignoringBattery);
                obj.put("hasMicPermission", hasMic);
                obj.put("hasCallPermission", hasCall);
                obj.put("hasContactsPermission", hasContacts);
                obj.put("hasDndAccess", hasDndAccess);
                obj.put("canWriteSettings", canWriteSettings);
                obj.put("accessibilityEnabled", a11yEnabled);
                obj.put("hasDeviceLockPin", JarvisCommandHelper.hasDeviceLockPin(MainActivity.this));
                obj.put("alwaysOnServiceRunning", JarvisBackgroundService.isServiceRunning);
            } catch (Exception ignored) {
            }
            return obj.toString();
        }

        @JavascriptInterface
        public boolean requestAccessibilityPermission() {
            try {
                Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return true;
            } catch (Exception ignored) {
            }
            return false;
        }

        @JavascriptInterface
        public boolean requestDndPermission() {
            try {
                Intent intent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    ? new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                    : new Intent(Settings.ACTION_SOUND_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return true;
            } catch (Exception ignored) {
            }
            return false;
        }

        @JavascriptInterface
        public boolean requestWriteSettingsPermission() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent intent = new Intent(
                        Settings.ACTION_MANAGE_WRITE_SETTINGS,
                        Uri.parse("package:" + getPackageName())
                    );
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    return true;
                }
            } catch (Exception ignored) {
            }
            return false;
        }

        @JavascriptInterface
        public boolean requestCorePermissions() {
            try {
                runOnUiThread(MainActivity.this::requestJarvisPermissions);
                return true;
            } catch (Exception ignored) {
            }
            return false;
        }

        @JavascriptInterface
        public boolean moveToBackgroundStandby() {
            try {
                ensureBackgroundServiceIfAllowed();
                runOnUiThread(() -> moveTaskToBack(true));
                return true;
            } catch (Exception ignored) {
            }
            return false;
        }

        @JavascriptInterface
        public boolean requestOverlayPermission() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent intent = new Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName())
                    );
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    return true;
                }
            } catch (Exception ignored) {
            }
            return false;
        }

        @JavascriptInterface
        public boolean requestBatteryOptimization() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent intent = new Intent(
                        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:" + getPackageName())
                    );
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    return true;
                }
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(fallback);
                    return true;
                } catch (Exception ignored) {
                }
            }
            return false;
        }

        @JavascriptInterface
        public boolean openDefaultAssistantSettings() {
            try {
                Intent intent = new Intent(Settings.ACTION_VOICE_INPUT_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return true;
            } catch (Exception e) {
                try {
                    Intent fallback = new Intent(
                        Build.VERSION.SDK_INT >= Build.VERSION_CODES.N
                            ? Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS
                            : Settings.ACTION_SETTINGS
                    );
                    fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(fallback);
                    return true;
                } catch (Exception ignored) {
                }
            }
            return false;
        }

        @JavascriptInterface
        public void setTtsSpeakingState(boolean speaking) {
            JarvisBackgroundService.isTtsSpeaking = speaking;
            try {
                Intent serviceIntent = new Intent(MainActivity.this, JarvisBackgroundService.class);
                serviceIntent.setAction(JarvisBackgroundService.ACTION_TTS_STATE);
                serviceIntent.putExtra("speaking", speaking);
                startService(serviceIntent);
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public String consumePendingWakeCommand() {
            String cmd = pendingWakeCommand;
            pendingWakeCommand = "";
            if ("__WAKE__".equals(cmd)) {
                return "";
            }
            return cmd != null ? cmd : "";
        }

        @JavascriptInterface
        public boolean startNativeListening() {
            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread(MainActivity.this::requestJarvisPermissions);
                return false;
            }
            try {
                Intent serviceIntent = new Intent(MainActivity.this, JarvisBackgroundService.class);
                serviceIntent.setAction(JarvisBackgroundService.ACTION_START_LISTENING);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(serviceIntent);
                } else {
                    startService(serviceIntent);
                }
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean stopNativeListening() {
            try {
                Intent serviceIntent = new Intent(MainActivity.this, JarvisBackgroundService.class);
                serviceIntent.setAction(JarvisBackgroundService.ACTION_STOP_LISTENING);
                startService(serviceIntent);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean speakNativeText(String text, String langCode, float rate, float pitch) {
            if (!ttsReady || tts == null || text == null || text.trim().isEmpty()) {
                return false;
            }
            try {
                if (langCode != null && !langCode.trim().isEmpty()) {
                    Locale targetLocale = Locale.forLanguageTag(langCode.trim());
                    int res = tts.setLanguage(targetLocale);
                    if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                        tts.setLanguage(Locale.US);
                    }
                }
                tts.setSpeechRate(Math.max(0.5f, Math.min(2.0f, rate)));
                tts.setPitch(Math.max(0.5f, Math.min(2.0f, pitch)));
                Bundle params = new Bundle();
                JarvisBackgroundService.isTtsSpeaking = true;
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, "jarvis-utterance-" + System.currentTimeMillis());
                return true;
            } catch (Exception ignored) {
                JarvisBackgroundService.isTtsSpeaking = false;
                return false;
            }
        }

        @JavascriptInterface
        public boolean speakNativeHindi(String text, float rate, float pitch) {
            return speakNativeText(text, "hi-IN", rate, pitch);
        }

        @JavascriptInterface
        public boolean stopNativeSpeaking() {
            JarvisBackgroundService.isTtsSpeaking = false;
            if (tts != null) {
                try {
                    tts.stop();
                    dispatchJsEvent("jarvis-native-tts", "{\\"state\\":\\"end\\"}");
                    return true;
                } catch (Exception ignored) {
                }
            }
            return false;
        }

        @JavascriptInterface
        public boolean saveDeviceLockPin(String pin) {
            return JarvisCommandHelper.saveDeviceLockPin(MainActivity.this, pin);
        }

        @JavascriptInterface
        public boolean hasDeviceLockPin() {
            return JarvisCommandHelper.hasDeviceLockPin(MainActivity.this);
        }

        @JavascriptInterface
        public String unlockPhoneScreen() {
            return JarvisCommandHelper.unlockPhoneScreen(MainActivity.this);
        }
    }
}
`;
fs.writeFileSync(mainActivityPath, mainActivityCode);
console.log('Configured AndroidManifest.xml, JarvisBootReceiver.java, JarvisBackgroundService.java, icons, and MainActivity.java successfully.');
