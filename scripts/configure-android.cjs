const fs = require('fs');
const path = require('path');

// 1. Update AndroidManifest.xml with Mic, Camera, Audio, Internet, and WhatsApp queries
const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');

const permissions = [
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
];

for (const perm of permissions) {
  if (!manifest.includes(perm)) {
    manifest = manifest.replace('<application', `${perm}\n    <application`);
  }
}

if (!manifest.includes('<queries>')) {
  const queriesBlock = [
    '    <queries>',
    '        <package android:name="com.whatsapp" />',
    '        <intent>',
    '            <action android:name="android.intent.action.VIEW" />',
    '            <data android:scheme="https" />',
    '        </intent>',
    '    </queries>',
    '',
  ].join('\n');
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

// 3. Configure MainActivity.java to request runtime RECORD_AUDIO & CAMERA permissions
const mainActivityDir = path.join('android', 'app', 'src', 'main', 'java', 'com', 'jarvis', 'assistant');
fs.mkdirSync(mainActivityDir, { recursive: true });
const mainActivityPath = path.join(mainActivityDir, 'MainActivity.java');

const mainActivityCode = [
  'package com.jarvis.assistant;',
  '',
  'import android.Manifest;',
  'import android.content.pm.PackageManager;',
  'import android.os.Bundle;',
  'import androidx.core.app.ActivityCompat;',
  'import androidx.core.content.ContextCompat;',
  'import com.getcapacitor.BridgeActivity;',
  '',
  'public class MainActivity extends BridgeActivity {',
  '    private static final int PERMISSION_REQUEST_CODE = 1001;',
  '',
  '    @Override',
  '    protected void onCreate(Bundle savedInstanceState) {',
  '        super.onCreate(savedInstanceState);',
  '',
  '        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED',
  '            || ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {',
  '            ActivityCompat.requestPermissions(',
  '                this,',
  '                new String[]{Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA},',
  '                PERMISSION_REQUEST_CODE',
  '            );',
  '        }',
  '    }',
  '}',
  '',
].join('\n');

fs.writeFileSync(mainActivityPath, mainActivityCode);
console.log('Configured AndroidManifest.xml, launcher icons, and MainActivity.java successfully.');
