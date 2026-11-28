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
  '    android:accessibilityFlags="flagDefault|flagRetrieveInteractiveWindows"',
  '    android:canRetrieveWindowContent="true"',
  '    android:description="@string/jarvis_accessibility_desc"',
  '    android:notificationTimeout="120"',
  '    android:packageNames="com.whatsapp,com.whatsapp.w4b" />',
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
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.Locale;

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
    private SpeechRecognizer speechRecognizer;
    private Intent recognizerIntent;
    private boolean recognizerActive = false;
    private boolean recognizerStarting = false;
    private long lastStartAttemptMs = 0L;
    private String lastPartialTranscript = "";
    private boolean listeningDesired = true;
    private boolean alwaysOnWakeWord = true;
    private String wakeWord = "jarvis";
    private String recognitionLang = "en-US";
    private long lastWakeLaunchMs = 0L;

    @Override
    public void onCreate() {
        super.onCreate();
        isServiceRunning = true;
        mainHandler = new Handler(Looper.getMainLooper());
        createNotificationChannel();
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Jarvis::BackgroundWakeLock");
            try {
                wakeLock.acquire(10 * 60 * 1000L);
            } catch (Exception ignored) {
            }
        }
        loadPrefs();
        mainHandler.postDelayed(watchdogRunnable, 600L);
    }

    private final Runnable watchdogRunnable = new Runnable() {
        @Override
        public void run() {
            if (isServiceRunning) {
                if (wakeLock != null && !wakeLock.isHeld()) {
                    try {
                        wakeLock.acquire(10 * 60 * 1000L);
                    } catch (Exception ignored) {
                    }
                }
                long now = System.currentTimeMillis();
                if (recognizerStarting && !recognizerActive && (now - lastStartAttemptMs > 2500L)) {
                    resetRecognizerInstance();
                }
                if (shouldListenNow() && !recognizerActive && !recognizerStarting) {
                    startRecognizerIfNeeded();
                }
                if (shouldListenNow()) {
                    broadcastState(true);
                }
                mainHandler.postDelayed(this, 600L);
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
            getSharedPreferences("jarvis_prefs", MODE_PRIVATE).edit().putBoolean("listeningDesired", true).apply();
            mainHandler.removeCallbacks(watchdogRunnable);
            mainHandler.postDelayed(watchdogRunnable, 600L);
        } else if (ACTION_TTS_STATE.equals(action) && intent != null) {
            boolean speaking = intent.getBooleanExtra("speaking", false);
            isTtsSpeaking = speaking;
            if (speaking) {
                mainHandler.post(this::pauseRecognizerForTts);
            } else if (shouldListenNow()) {
                scheduleRecognizerRestart(15);
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

    private boolean shouldListenNow() {
        boolean hasMic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        if (!hasMic || !listeningDesired || isTtsSpeaking) return false;
        return isActivityVisible || alwaysOnWakeWord;
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
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 550L);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 400L);
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 450L);

        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                recognizerStarting = false;
                recognizerActive = true;
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
                    boolean needsReset =
                        error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ||
                        error == SpeechRecognizer.ERROR_CLIENT ||
                        error == SpeechRecognizer.ERROR_AUDIO;
                    if (needsReset) {
                        resetRecognizerInstance();
                    }
                    long delay = needsReset ? 160L : 20L;
                    scheduleRecognizerRestart(delay);
                } else {
                    broadcastState(false);
                }
            }

            @Override
            public void onResults(Bundle results) {
                recognizerStarting = false;
                recognizerActive = false;
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
                    scheduleRecognizerRestart(20);
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

        // App is in background: wake immediately even on partial results when wake word is heard!
        if (alwaysOnWakeWord && containsWakeWord(text)) {
            long now = System.currentTimeMillis();
            if (now - lastWakeLaunchMs > 1500L) {
                lastWakeLaunchMs = now;
                wakeMainActivityFromBackground(text);
            }
        }
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
            startActivity(launch);
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

// 4b. Generate JarvisAccessibilityService.java for zero-tap WhatsApp direct auto-send
const accessibilityPath = path.join(javaDir, 'JarvisAccessibilityService.java');
const accessibilityCode = `package com.jarvis.assistant;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;

public class JarvisAccessibilityService extends AccessibilityService {
    public static volatile boolean isServiceConnected = false;
    private static volatile boolean pendingWhatsAppSend = false;
    private static volatile long pendingDeadlineMs = 0L;
    private static volatile String pendingMessageText = "";
    private static volatile long lastClickMs = 0L;
    private final Handler handler = new Handler(Looper.getMainLooper());

    public static void armWhatsAppAutoSend(String message) {
        pendingMessageText = message != null ? message.trim() : "";
        pendingDeadlineMs = System.currentTimeMillis() + 18000L;
        pendingWhatsAppSend = true;
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
    }

    @Override
    public void onInterrupt() {}

    @Override
    public void onDestroy() {
        isServiceConnected = false;
        super.onDestroy();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (!pendingWhatsAppSend) return;
        long now = System.currentTimeMillis();
        if (now > pendingDeadlineMs) {
            pendingWhatsAppSend = false;
            return;
        }
        if (event == null || event.getPackageName() == null) return;
        String pkg = event.getPackageName().toString();
        if (!"com.whatsapp".equals(pkg) && !"com.whatsapp.w4b".equals(pkg)) return;

        tryClickWhatsAppSend(pkg);
        handler.postDelayed(() -> {
            if (pendingWhatsAppSend && System.currentTimeMillis() <= pendingDeadlineMs) {
                tryClickWhatsAppSend(pkg);
            }
        }, 350L);
    }

    private void tryClickWhatsAppSend(String pkg) {
        if (!pendingWhatsAppSend) return;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        try {
            // Confirm text is actually filled inside WhatsApp entry field before tapping Send
            boolean hasTextInEntry = hasNonEmptyEntry(root, pkg + ":id/entry")
                || hasNonEmptyEntry(root, "com.whatsapp:id/entry")
                || hasNonEmptyEntry(root, "com.whatsapp.w4b:id/entry");
            if (!hasTextInEntry) return;

            AccessibilityNodeInfo sendBtn = findClickableById(root, pkg + ":id/send");
            if (sendBtn == null) sendBtn = findClickableById(root, "com.whatsapp:id/send");
            if (sendBtn == null) sendBtn = findClickableById(root, "com.whatsapp.w4b:id/send");
            if (sendBtn == null) sendBtn = findClickableByContentDesc(root);

            if (sendBtn != null) {
                long now = System.currentTimeMillis();
                if (now - lastClickMs < 1500L) return;
                lastClickMs = now;
                pendingWhatsAppSend = false;
                sendBtn.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
        } catch (Exception ignored) {
        }
    }

    private boolean hasNonEmptyEntry(AccessibilityNodeInfo root, String viewId) {
        List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId(viewId);
        if (nodes == null || nodes.isEmpty()) return false;
        for (AccessibilityNodeInfo node : nodes) {
            if (node != null && node.getText() != null && !node.getText().toString().trim().isEmpty()) {
                return true;
            }
        }
        return false;
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
            if (contactQuery == null || contactQuery.trim().isEmpty()) return "";
            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
                return "";
            }
            String q = contactQuery.trim().toLowerCase(Locale.ROOT);
            boolean wantsMom = q.matches(".*\\\\b(mom|mommy|mama|mummy|mata|mataji|mother|maa|amma|ammi)\\\\b.*")
                || q.contains("मॉम") || q.contains("मम्मी") || q.contains("माँ") || q.contains("मां");
            boolean wantsDad = q.matches(".*\\\\b(dad|daddy|papa|pita|pitaji|father|pa|abba)\\\\b.*")
                || q.contains("पापा") || q.contains("डैड") || q.contains("पिता");

            Cursor cursor = null;
            String bestPhone = "";
            int bestScore = 0;
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
                    while (cursor.moveToNext()) {
                        String name = nameIdx >= 0 ? cursor.getString(nameIdx) : "";
                        String num = numIdx >= 0 ? cursor.getString(numIdx) : "";
                        if (name == null || num == null || name.trim().isEmpty() || num.trim().isEmpty()) continue;
                        String nameLower = name.trim().toLowerCase(Locale.ROOT);
                        int score = 0;
                        if (nameLower.equals(q)) score = 100;
                        else if (nameLower.startsWith(q)) score = 85;
                        else if (nameLower.contains(q)) score = 75;
                        else if (wantsMom && (nameLower.matches(".*\\\\b(mom|mommy|mama|mummy|mata|mataji|mother|maa|amma|ammi)\\\\b.*")
                            || name.contains("मॉम") || name.contains("मम्मी") || name.contains("माँ"))) score = 90;
                        else if (wantsDad && (nameLower.matches(".*\\\\b(dad|daddy|papa|pita|pitaji|father|abba)\\\\b.*")
                            || name.contains("पापा") || name.contains("डैड"))) score = 90;

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

        @JavascriptInterface
        public boolean makePhoneCall(String phoneNumber) {
            String res = makeDirectCall(phoneNumber, "");
            return res.startsWith("ok");
        }

        @JavascriptInterface
        public String makeDirectCall(String phoneNumber, String contactName) {
            try {
                String clean = phoneNumber == null ? "" : phoneNumber.replaceAll("[^\\\\d+]", "");
                if (clean.isEmpty() && contactName != null && !contactName.trim().isEmpty()) {
                    clean = lookupRealContactPhone(contactName);
                }
                if (clean.isEmpty()) return "no_number";
                Uri uri = Uri.parse("tel:" + clean);
                boolean canDirectCall = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
                if (!canDirectCall) {
                    runOnUiThread(() -> ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[]{Manifest.permission.CALL_PHONE, Manifest.permission.READ_CONTACTS},
                        PERMISSION_REQUEST_CODE
                    ));
                    Intent dialIntent = new Intent(Intent.ACTION_DIAL, uri);
                    dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(dialIntent);
                    return "needs_call_permission";
                }
                Intent intent = new Intent(Intent.ACTION_CALL, uri);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return "ok:direct_call";
            } catch (Exception e) {
                return "error:" + e.getMessage();
            }
        }

        @JavascriptInterface
        public boolean sendWhatsApp(String phoneNumber, String message) {
            String res = sendWhatsAppDirect(phoneNumber, message, "");
            return !res.startsWith("error");
        }

        private boolean isPackageInstalled(String pkgName) {
            try {
                getPackageManager().getPackageInfo(pkgName, 0);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public String sendWhatsAppDirect(String phoneNumber, String message, String contactName) {
            try {
                String clean = phoneNumber == null ? "" : phoneNumber.replaceAll("[^0-9]", "");
                if (clean.isEmpty() && contactName != null && !contactName.trim().isEmpty()) {
                    String resolved = lookupRealContactPhone(contactName);
                    clean = resolved.replaceAll("[^0-9]", "");
                }
                String safeMsg = message == null ? "" : message;
                boolean a11yReady = JarvisAccessibilityService.isEnabled(MainActivity.this);
                if (a11yReady) {
                    JarvisAccessibilityService.armWhatsAppAutoSend(safeMsg);
                }

                String url = "https://wa.me/" + clean + "?text=" + Uri.encode(safeMsg);
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                if (isPackageInstalled("com.whatsapp")) {
                    intent.setPackage("com.whatsapp");
                } else if (isPackageInstalled("com.whatsapp.w4b")) {
                    intent.setPackage("com.whatsapp.w4b");
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return a11yReady ? "sent_auto" : "opened_needs_accessibility";
            } catch (Exception e) {
                return "error:" + e.getMessage();
            }
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
            try {
                AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
                if (am == null) return "error:no_audio_manager";
                String m = mode == null ? "normal" : mode.trim().toLowerCase(Locale.US);
                int targetMode = AudioManager.RINGER_MODE_NORMAL;
                if ("vibrate".equals(m) || "vibration".equals(m)) {
                    targetMode = AudioManager.RINGER_MODE_VIBRATE;
                } else if ("silent".equals(m) || "mute".equals(m) || "dnd".equals(m)) {
                    targetMode = AudioManager.RINGER_MODE_SILENT;
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                    boolean dndGranted = nm != null && nm.isNotificationPolicyAccessGranted();
                    if (targetMode == AudioManager.RINGER_MODE_VIBRATE && !dndGranted) {
                        try {
                            am.setRingerMode(AudioManager.RINGER_MODE_VIBRATE);
                            if (am.getRingerMode() == AudioManager.RINGER_MODE_VIBRATE) {
                                return "ok:vibrate";
                            }
                        } catch (Exception ignored) {
                        }
                    }
                    if (!dndGranted && (targetMode == AudioManager.RINGER_MODE_SILENT || targetMode == AudioManager.RINGER_MODE_VIBRATE || targetMode == AudioManager.RINGER_MODE_NORMAL)) {
                        try {
                            am.setRingerMode(targetMode);
                            if (am.getRingerMode() == targetMode) {
                                return "ok:" + m;
                            }
                        } catch (SecurityException se) {
                            Intent dndIntent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                            dndIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(dndIntent);
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
                        startActivity(dndIntent);
                        return "needs_dnd_permission";
                    } catch (Exception ignored) {
                    }
                }
                return "needs_dnd_permission";
            } catch (Exception e) {
                return "error:" + e.getMessage();
            }
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

        private void launchSettingsIntentSafe(Intent primary, Intent fallback1, Intent fallback2) {
            runOnUiThread(() -> {
                PackageManager pm = getPackageManager();
                Intent[] candidates = new Intent[]{ primary, fallback1, fallback2, new Intent(Settings.ACTION_SETTINGS) };
                for (Intent candidate : candidates) {
                    if (candidate == null) continue;
                    try {
                        if (candidate.resolveActivity(pm) != null) {
                            candidate.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(candidate);
                            return;
                        }
                    } catch (Exception ignored) {
                    }
                }
            });
        }

        @JavascriptInterface
        public String controlDeviceSetting(String settingType, String action) {
            try {
                String type = settingType == null ? "settings" : settingType.trim().toLowerCase(Locale.US);
                String act = action == null ? "open" : action.trim().toLowerCase(Locale.US);

                if ("flashlight".equals(type) || "torch".equals(type)) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        CameraManager camMgr = (CameraManager) getSystemService(CAMERA_SERVICE);
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
                    WifiManager wm = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
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
                            new Intent(Settings.Panel.ACTION_WIFI),
                            new Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY),
                            new Intent(Settings.ACTION_WIFI_SETTINGS)
                        );
                        return "panel:wifi";
                    }
                    launchSettingsIntentSafe(new Intent(Settings.ACTION_WIFI_SETTINGS), null, null);
                    return "panel:wifi";
                }

                if ("network".equals(type) || "mobile_data".equals(type) || "data".equals(type) || "internet".equals(type)) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        launchSettingsIntentSafe(
                            new Intent(Settings.Panel.ACTION_INTERNET_CONNECTIVITY),
                            new Intent(Settings.ACTION_WIRELESS_SETTINGS),
                            new Intent(Settings.ACTION_DATA_ROAMING_SETTINGS)
                        );
                        return "panel:network";
                    }
                    launchSettingsIntentSafe(
                        new Intent(Settings.ACTION_WIRELESS_SETTINGS),
                        new Intent(Settings.ACTION_DATA_ROAMING_SETTINGS),
                        null
                    );
                    return "panel:network";
                }

                if ("bluetooth".equals(type)) {
                    launchSettingsIntentSafe(new Intent(Settings.ACTION_BLUETOOTH_SETTINGS), null, null);
                    return "panel:bluetooth";
                }

                if ("airplane".equals(type)) {
                    launchSettingsIntentSafe(new Intent(Settings.ACTION_AIRPLANE_MODE_SETTINGS), null, null);
                    return "panel:airplane";
                }

                if ("location".equals(type) || "gps".equals(type)) {
                    launchSettingsIntentSafe(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS), null, null);
                    return "panel:location";
                }

                if ("battery".equals(type) || "battery_saver".equals(type) || "power_saving".equals(type)) {
                    Intent batIntent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1
                        ? new Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS)
                        : new Intent(Intent.ACTION_POWER_USAGE_SUMMARY);
                    launchSettingsIntentSafe(batIntent, new Intent(Intent.ACTION_POWER_USAGE_SUMMARY), null);
                    return "panel:battery";
                }

                if ("hotspot".equals(type)) {
                    launchSettingsIntentSafe(new Intent(Settings.ACTION_WIRELESS_SETTINGS), null, null);
                    return "panel:hotspot";
                }

                if ("sound".equals(type) || "dnd".equals(type)) {
                    launchSettingsIntentSafe(new Intent(Settings.ACTION_SOUND_SETTINGS), null, null);
                    return "panel:sound";
                }

                if ("display".equals(type) || "brightness".equals(type)) {
                    launchSettingsIntentSafe(new Intent(Settings.ACTION_DISPLAY_SETTINGS), null, null);
                    return "panel:display";
                }

                launchSettingsIntentSafe(new Intent(Settings.ACTION_SETTINGS), null, null);
                return "panel:settings";
            } catch (Exception e) {
                return "error:" + e.getMessage();
            }
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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                    ignoringBattery = pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
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
                obj.put("accessibilityEnabled", a11yEnabled);
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
    }
}
`;
fs.writeFileSync(mainActivityPath, mainActivityCode);
console.log('Configured AndroidManifest.xml, JarvisBootReceiver.java, JarvisBackgroundService.java, icons, and MainActivity.java successfully.');
