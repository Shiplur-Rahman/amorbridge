# 📱 AmorBridge Android App

> Native Android Application for **Real-Time Bilingual Video Calling** with **VoIP Incoming Call Ringing** (Instagram / WhatsApp style) and **Live Translated Subtitles**.

---

## 🌟 Key Architecture & Features

### 1. WhatsApp / Instagram Style Incoming Call Ringing
- **Full-Screen Calling Intent**: When an incoming call arrives, Android wakes up the screen and displays the full-screen ringing UI (`IncomingCallActivity`) even if the phone is locked or asleep.
- **Android `CallStyle` Notification**: Uses `NotificationCompat.CallStyle` with a high-priority foreground service (`CallService`) featuring custom ringtone, caller name, and one-tap **"Accept"** (green) / **"Decline"** (red) actions.

### 2. Zero-Lag Real-Time Voice Recognition & Translation
- **On-Device Android Speech Engine**: Uses `android.speech.SpeechRecognizer` directly interfacing with Google Speech Services for instantaneous voice capture with partial results (`EXTRA_PARTIAL_RESULTS = true`).
- **Live Translation Sync**: As speech is captured, interim and final text is streamed through the translation engine and rendered as subtitles over the video call in real time.

### 3. WebRTC Video Calling
- Native WebRTC peer-to-peer audio/video connection.
- Fullscreen partner camera view with floating self-view (PiP).
- Subtitle overlay bar rendered with cinema-grade frosted glass styling in **Jetpack Compose**.

---

## 📂 Project Directory Structure

```text
g:/vdo_app/android_app/
├── app/
│   ├── build.gradle.kts       # Dependencies: Compose, WebRTC, OkHttp, Socket.io
│   └── src/main/
│       ├── AndroidManifest.xml # VoIP, camera, mic, full-screen intent permissions
│       └── java/com/amorbridge/app/
│           ├── AmorBridgeApplication.kt   # High-priority call notification channel
│           ├── MainActivity.kt            # Lobby & Incoming call test trigger
│           ├── service/
│           │   ├── CallService.kt         # Android CallStyle VoIP notification service
│           │   └── IncomingCallActivity.kt # Full-screen lock-screen ringing UI
│           ├── speech/
│           │   └── SpeechTranslator.kt    # Continuous SpeechRecognizer + Translation
│           └── ui/
│               └── CallActivity.kt        # Jetpack Compose video call & subtitle UI
├── gradle/
│   └── libs.versions.toml     # Version catalog
├── build.gradle.kts           # Root gradle build script
└── settings.gradle.kts        # Root gradle settings
```

---

## 🛠️ How to Open & Run in Android Studio

1. Open **Android Studio** (installed at `C:\Program Files\Android\Android Studio`).
2. Click **Open** and select the folder:
   ```
   g:\vdo_app\android_app
   ```
3. Android Studio will automatically sync Gradle and download dependencies.
4. Plug in your Android phone with **USB Debugging** enabled (or start an Android Emulator).
5. Click the green **Run (▶)** button to install and launch the APK directly onto your device!

---

## 🧪 Testing the Incoming Call Notification
Inside the app on your phone:
- Tap **"Test Incoming Call Screen (VoIP)"**
- Lock your phone screen immediately.
- The phone will ring and present the full-screen incoming video call screen just like an incoming call from WhatsApp or Messenger!
