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

// Ensure MainActivity supports lock-screen wake-up & singleTask launch
if (!manifest.includes('android:showWhenLocked="true"')) {
  manifest = manifest.replace(
    /(<activity[^>]*android:name="[^"]*MainActivity"[^>]*)(>)/,
    '$1\n            android:launchMode="singleTask"\n            android:showWhenLocked="true"\n            android:turnScreenOn="true"$2'
  );
}

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

// Replace or add <queries> block so Android 11+ can resolve WhatsApp, YouTube, Spotify, Dialer, Chrome, etc.
const queriesBlock = [
  '    <queries>',
  '        <package android:name="com.whatsapp" />',
  '        <package android:name="com.whatsapp.w4b" />',
  '        <package android:name="com.google.android.youtube" />',
  '        <package android:name="com.spotify.music" />',
  '        <package android:name="com.instagram.android" />',
  '        <package android:name="org.telegram.messenger" />',
  '        <package android:name="com.google.android.apps.maps" />',
  '        <package android:name="com.android.chrome" />',
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
    }

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
        } else if (ACTION_TTS_STATE.equals(action) && intent != null) {
            boolean speaking = intent.getBooleanExtra("speaking", false);
            isTtsSpeaking = speaking;
            if (!speaking && shouldListenNow()) {
                scheduleRecognizerRestart(350);
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
        recognizerIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);

        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                recognizerActive = true;
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
                recognizerActive = false;
                if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                    listeningDesired = false;
                    broadcastState(false);
                    return;
                }
                if (shouldListenNow()) {
                    long delay = (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY || error == SpeechRecognizer.ERROR_AUDIO) ? 900L : 350L;
                    if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) {
                        resetRecognizerInstance();
                    }
                    scheduleRecognizerRestart(delay);
                } else {
                    broadcastState(false);
                }
            }

            @Override
            public void onResults(Bundle results) {
                recognizerActive = false;
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty() && !isTtsSpeaking) {
                    String text = matches.get(0);
                    handleRecognizedPhrase(text, true);
                }
                if (shouldListenNow()) {
                    scheduleRecognizerRestart(250);
                }
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty() && !isTtsSpeaking) {
                    String text = matches.get(0);
                    handleRecognizedPhrase(text, false);
                }
            }

            @Override
            public void onEvent(int eventType, Bundle params) {}
        });
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

        // App is in background: check for wake word to pop JARVIS open automatically like Google Assistant!
        if (alwaysOnWakeWord && isFinal && containsWakeWord(text)) {
            long now = System.currentTimeMillis();
            if (now - lastWakeLaunchMs > 2000L) {
                lastWakeLaunchMs = now;
                wakeMainActivityFromBackground(text);
            }
        }
    }

    private boolean containsWakeWord(String transcript) {
        String lower = transcript.toLowerCase(Locale.ROOT);
        if (lower.contains(wakeWord)) return true;
        if (lower.contains("jarvis") || lower.contains("hey jarvis")) return true;
        return false;
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
        if (!shouldListenNow() || recognizerActive) return;
        try {
            ensureSpeechRecognizer();
            if (speechRecognizer != null && recognizerIntent != null) {
                recognizerIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, recognitionLang != null ? recognitionLang : "en-US");
                speechRecognizer.startListening(recognizerIntent);
            }
        } catch (Exception ignored) {
            scheduleRecognizerRestart(800);
        }
    }

    private void stopRecognizerInternal() {
        mainHandler.removeCallbacksAndMessages(null);
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
            if (shouldListenNow() && !recognizerActive) {
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

// 5. Generate MainActivity.java with native bridge, Assist intent handling, Overlay/Battery/Assistant settings, and Service sync
const mainActivityPath = path.join(javaDir, 'MainActivity.java');
const mainActivityCode = `package com.jarvis.assistant;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.ContactsContract;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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
                        dispatchJsEvent("jarvis-native-tts", "{\\"state\\":\\"start\\"}");
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        JarvisBackgroundService.isTtsSpeaking = false;
                        dispatchJsEvent("jarvis-native-tts", "{\\"state\\":\\"end\\"}");
                    }

                    @Override
                    public void onError(String utteranceId) {
                        JarvisBackgroundService.isTtsSpeaking = false;
                        dispatchJsEvent("jarvis-native-tts", "{\\"state\\":\\"end\\"}");
                    }
                });
                ttsReady = true;
            }
        });
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
        @JavascriptInterface
        public boolean openApp(String packageName, String fallbackUrl) {
            try {
                PackageManager pm = getPackageManager();
                if (packageName != null && !packageName.isEmpty()) {
                    Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(launchIntent);
                        return true;
                    }
                }
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
        public boolean makePhoneCall(String phoneNumber) {
            try {
                String clean = phoneNumber == null ? "" : phoneNumber.replaceAll("[^\\\\d+]", "");
                if (clean.isEmpty()) return false;
                Uri uri = Uri.parse("tel:" + clean);
                boolean canDirectCall = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
                Intent intent = new Intent(canDirectCall ? Intent.ACTION_CALL : Intent.ACTION_DIAL, uri);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean sendWhatsApp(String phoneNumber, String message) {
            try {
                String clean = phoneNumber == null ? "" : phoneNumber.replaceAll("[^0-9]", "");
                String url = "https://wa.me/" + clean + "?text=" + Uri.encode(message == null ? "" : message);
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return true;
            } catch (Exception ignored) {
                return false;
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
                obj.put("canDrawOverlays", canOverlay);
                obj.put("ignoringBatteryOptimizations", ignoringBattery);
                obj.put("hasMicPermission", hasMic);
                obj.put("alwaysOnServiceRunning", JarvisBackgroundService.isServiceRunning);
            } catch (Exception ignored) {
            }
            return obj.toString();
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
                requestJarvisPermissions();
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
