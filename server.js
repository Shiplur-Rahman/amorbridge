import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Translation helper: tries Google API if key provided, else fallback translation
async function translateText(text, sourceLang, targetLang) {
  if (!text || text.trim() === '') return '';

  // 1. Google Cloud Translation API (if API Key provided)
  const googleApiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY;
  if (googleApiKey) {
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: sourceLang,
            target: targetLang,
            format: 'text'
          })
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.data.translations[0].translatedText;
      } else {
        const errText = await response.text();
        console.warn('Google Cloud Translation API returned error:', errText);
      }
    } catch (err) {
      console.warn('Google Cloud Translation API fetch failed:', err.message);
    }
  }

  // 2. Fallback via Google Translate Public Web RPC
  try {
    const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
    const tl = targetLang;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
      sl
    )}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        return data[0].map((item) => item[0]).join('');
      }
    }
  } catch (err) {
    console.warn('Public translation fallback 1 failed:', err.message);
  }

  // 3. Fallback via MyMemory Translation API
  try {
    const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${sourceLang}|${targetLang}`;
    const mmRes = await fetch(mmUrl);
    if (mmRes.ok) {
      const mmData = await mmRes.json();
      if (mmData.responseData && mmData.responseData.translatedText) {
        return mmData.responseData.translatedText;
      }
    }
  } catch (err) {
    console.warn('MyMemory translation fallback failed:', err.message);
  }

  return text; // Return original if all fail
}

// Translation REST API Endpoint
app.post('/api/translate', async (req, res) => {
  const { text, sourceLang = 'en', targetLang = 'es' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const translatedText = await translateText(text, sourceLang, targetLang);
    res.json({
      original: text,
      translated: translatedText,
      sourceLang,
      targetLang
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed', details: error.message });
  }
});

// App configuration endpoint (informs client if Google Key is configured)
app.get('/api/config', (req, res) => {
  const hasGoogleKey = Boolean(process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY);
  res.json({
    hasGoogleKey,
    supportedLanguages: [
      { code: 'en', name: 'English (US)', flag: '🇺🇸', speechCode: 'en-US' },
      { code: 'es', name: 'Español (Latinoamérica)', flag: '🇲🇽', speechCode: 'es-US' },
      { code: 'es-ES', name: 'Español (España)', flag: '🇪🇸', speechCode: 'es-ES' },
      { code: 'pt', name: 'Português', flag: '🇧🇷', speechCode: 'pt-BR' },
      { code: 'fr', name: 'Français', flag: '🇫🇷', speechCode: 'fr-FR' },
      { code: 'it', name: 'Italiano', flag: '🇮🇹', speechCode: 'it-IT' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪', speechCode: 'de-DE' }
    ]
  });
});

// Rooms state in memory
const rooms = new Map();

// WebRTC Signaling & Real-Time Events
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // User joins room
  socket.on('join-room', ({ roomId, userName, spokenLanguage, targetLanguage }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName || 'Guest';
    socket.spokenLanguage = spokenLanguage || 'en';
    socket.targetLanguage = targetLanguage || 'es';

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    const roomUsers = rooms.get(roomId);
    roomUsers.add(socket.id);

    console.log(`[Room ${roomId}] User ${socket.id} (${socket.userName}) joined. Total users: ${roomUsers.size}`);

    // Notify other peers in room that a new user joined
    socket.to(roomId).emit('user-joined', {
      peerId: socket.id,
      userName: socket.userName,
      spokenLanguage: socket.spokenLanguage,
      targetLanguage: socket.targetLanguage
    });

    // Send existing peers list to the newly joined user
    const existingPeers = Array.from(roomUsers).filter((id) => id !== socket.id);
    socket.emit('room-peers', {
      peers: existingPeers,
      isInitiator: existingPeers.length > 0
    });
  });

  // WebRTC Signaling: Offer, Answer, ICE Candidate
  socket.on('signal', ({ to, signalData }) => {
    io.to(to).emit('signal', {
      from: socket.id,
      signalData
    });
  });

  // Real-time Subtitle / Caption Broadcast
  // Triggered when client transcribes speech, translates it, or asks server to translate
  socket.on('send-caption', async ({ roomId, originalText, isFinal, sourceLang, targetLang }) => {
    if (!originalText || !originalText.trim()) return;

    try {
      // Perform server-side translation to guarantee both sides get accurate text
      const translated = await translateText(
        originalText,
        sourceLang || socket.spokenLanguage || 'en',
        targetLang || socket.targetLanguage || 'es'
      );

      const captionPayload = {
        senderId: socket.id,
        senderName: socket.userName,
        originalText,
        translatedText: translated,
        sourceLang: sourceLang || socket.spokenLanguage,
        targetLang: targetLang || socket.targetLanguage,
        isFinal,
        timestamp: Date.now()
      };

      // Broadcast to everyone in the room (including sender for local subtitle display)
      io.in(roomId).emit('receive-caption', captionPayload);
    } catch (err) {
      console.error('Caption broadcast error:', err);
    }
  });

  // Handle participant mute/cam toggles so other side knows
  socket.on('peer-status', ({ roomId, audioEnabled, videoEnabled }) => {
    socket.to(roomId).emit('peer-status', {
      peerId: socket.id,
      audioEnabled,
      videoEnabled
    });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    if (socket.roomId && rooms.has(socket.roomId)) {
      const roomUsers = rooms.get(socket.roomId);
      roomUsers.delete(socket.id);
      if (roomUsers.size === 0) {
        rooms.delete(socket.roomId);
      } else {
        socket.to(socket.roomId).emit('user-left', {
          peerId: socket.id,
          userName: socket.userName
        });
      }
    }
  });
});

// Wildcard route to serve app index for any room link
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Live Video Translation Server running on:`);
  console.log(`   - Local:    http://localhost:${PORT}`);
  console.log(`   - Network:  http://0.0.0.0:${PORT}`);
  console.log(`====================================================`);
});
