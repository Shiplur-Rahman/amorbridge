# 🌉 AmorBridge — Live Bilingual Video Call & Real-Time Translated Subtitles

> Real-time peer-to-peer WebRTC video calling with live translated captions and subtitles (English ↔ Spanish, Portuguese, etc.) designed for couples and cross-language communication.

---

## ✨ Features

- 📹 **Ultra-Fast WebRTC Video Calling**: Full-screen partner camera stream with floating Picture-in-Picture (PiP) self-view.
- 🗣️ **Real-Time Speech-to-Text**: Listens as you speak using continuous voice recognition with zero latency.
- 🌐 **Instant Subtitle Translation**:
  - Automatically translates your words to your partner's language (e.g. English ➔ Spanish) and renders them as live subtitles on her screen.
  - Automatically translates her words to your language (e.g. Spanish ➔ English) and renders them as live subtitles on your screen.
  - **Dual Subtitle Mode**: Shows both the translated text and the original spoken sentence for maximum clarity.
- 🔊 **Voice Read-Aloud (TTS)**: Optional Text-to-Speech mode that softly reads translated sentences aloud in real time.
- 📱 **Mobile-First & Glassmorphic UI**: Beautiful dark mode with frosted glass panels, touch-friendly buttons, front/rear camera flipping, and audio level meters.
- 🔗 **1-Click Room Sharing**: Generate a room link and share it directly (e.g., `?room=amor-123`).

---

## 🚀 Quick Start

### 1. Start the Server
The server is already running on port **3000**! If you ever need to start or restart it manually:
```bash
npm start
```
Server runs at:
- Local: `http://localhost:3000`
- Network: `http://<YOUR_LOCAL_IP>:3000`

### 2. How to Test on One Computer
1. Open [http://localhost:3000](http://localhost:3000) in Chrome.
2. Enter your name (e.g. "Daniel") and select **I Speak: English 🇺🇸** ➔ **Translate To: Spanish 🇲🇽**.
3. Click **Start / Join Call**.
4. Open an **Incognito Window** or a second tab to [http://localhost:3000](http://localhost:3000).
5. Enter the **same Room Name**, enter her name (e.g. "Maria"), and select **I Speak: Spanish 🇲🇽** ➔ **Translate To: English 🇺🇸**.
6. Click **Start / Join Call** — both sides will connect with live video and subtitles!

---

## 📱 How to Call From Phone to Phone (or PC to Phone)

Mobile browsers (Chrome / Safari) require an **HTTPS** connection or localhost to allow camera and microphone access. To connect over the internet:

### Option A: Free HTTPS Tunnel (Instant 1-Click)
Run the built-in tunnel command in your terminal:
```bash
npm run tunnel
```
This gives you a public secure URL (e.g., `https://funny-cats-sing.loca.lt`) that you and your girlfriend can both open directly from anywhere in the world!

### Option B: Cloudflare Tunnel (Free & Fast)
```bash
npx cloudflared tunnel --url http://localhost:3000
```

---

## 🔑 Google Cloud Translation API (Optional)

AmorBridge **works out-of-the-box with zero configuration** using resilient built-in translation endpoints.

If you have a Google Cloud Translation API key or Gemini API key and want to use official Google Cloud quota:
1. Open the file `.env` in the project root:
   ```env
   PORT=3000
   GOOGLE_TRANSLATE_API_KEY=your_google_cloud_api_key_here
   ```
2. Restart the server (`npm start`).

---

## 🛠️ Project Structure
```text
g:/vdo_app/
├── package.json          # Dependencies (Express, Socket.io, CORS, dotenv)
├── server.js             # WebRTC signaling server & Google translation API backend
├── .env.example          # API key configuration example
├── README.md             # Guide & documentation
└── public/
    ├── index.html        # Video stage, floating PiP, subtitle overlay & lobby UI
    ├── style.css         # Modern glassmorphism dark mode & mobile animations
    └── app.js            # WebRTC peer connection, speech recognition & translation logic
```
