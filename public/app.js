/**
 * AmorBridge - Real-Time Bilingual Video Calling & Subtitle Translation
 * Built with WebRTC, Socket.io, and Speech-to-Text Translation
 */

// ==========================================
// DOM Elements
// ==========================================
const lobbyScreen = document.getElementById('lobbyScreen');
const callScreen = document.getElementById('callScreen');

// Lobby Elements
const lobbyPreview = document.getElementById('lobbyPreview');
const toggleLobbyCamBtn = document.getElementById('toggleLobbyCam');
const toggleLobbyMicBtn = document.getElementById('toggleLobbyMic');
const userNameInput = document.getElementById('userName');
const roomInput = document.getElementById('roomInput');
const btnGenRoom = document.getElementById('btnGenRoom');
const mySpokenLangSelect = document.getElementById('mySpokenLang');
const partnerTranslateLangSelect = document.getElementById('partnerTranslateLang');
const btnJoinRoom = document.getElementById('btnJoinRoom');

// Call Elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const remotePlaceholder = document.getElementById('remotePlaceholder');
const remoteStatusTitle = document.getElementById('remoteStatusTitle');
const remotePeerLabel = document.getElementById('remotePeerLabel');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const connectionStatus = document.getElementById('connectionStatus');
const btnCopyInvite = document.getElementById('btnCopyInvite');
const btnCopyInviteHero = document.getElementById('btnCopyInviteHero');

// Call Controls
const btnToggleMic = document.getElementById('btnToggleMic');
const btnToggleCam = document.getElementById('btnToggleCam');
const btnSwitchCamera = document.getElementById('btnSwitchCamera');
const btnToggleCaptions = document.getElementById('btnToggleCaptions');
const btnEndCall = document.getElementById('btnEndCall');
const btnToggleSettings = document.getElementById('btnToggleSettings');
const btnFlipPip = document.getElementById('btnFlipPip');
const localMicIndicator = document.getElementById('localMicIndicator');

// Subtitles Elements
const subtitlesOverlay = document.getElementById('subtitlesOverlay');
const remoteCaptionBox = document.getElementById('remoteCaptionBox');
const remoteCaptionSpeaker = document.getElementById('remoteCaptionSpeaker');
const remoteFlag = document.getElementById('remoteFlag');
const remoteTranslatedText = document.getElementById('remoteTranslatedText');
const remoteOriginalText = document.getElementById('remoteOriginalText');

const localCaptionBox = document.getElementById('localCaptionBox');
const localFlag = document.getElementById('localFlag');
const localOriginalText = document.getElementById('localOriginalText');
const localTranslatedText = document.getElementById('localTranslatedText');

// Settings Modal Elements
const settingsModal = document.getElementById('settingsModal');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const settingMyLang = document.getElementById('settingMyLang');
const settingTargetLang = document.getElementById('settingTargetLang');
const settingSubtitleMode = document.getElementById('settingSubtitleMode');
const settingSubtitleSize = document.getElementById('settingSubtitleSize');
const settingTTS = document.getElementById('settingTTS');

// Audio visualizer bars
const audioMeterBars = document.querySelectorAll('#lobbyAudioMeter .bar');

// ==========================================
// Application State
// ==========================================
let socket = null;
let localStream = null;
let peerConnection = null;
let dataChannel = null;
let audioContext = null;
let analyserNode = null;
let audioVisualizerInterval = null;

let isMicEnabled = true;
let isCamEnabled = true;
let isCaptionsVisible = true;
let currentFacingMode = 'user'; // 'user' or 'environment'
let currentRoomId = '';
let myUserName = 'You';
let mySpokenLanguage = 'en';
let myTargetLanguage = 'es';
let activePartnerId = null;

// Speech Recognition & Auto-translate state
let speechRecognition = null;
let isSpeechActive = false;
let interimDebounceTimer = null;
let lastSpokenText = '';
let remoteCaptionFadeTimer = null;
let localCaptionFadeTimer = null;

// Language code to flag & speech mapping
const LANG_METADATA = {
  en: { flag: '🇺🇸', name: 'English', speechCode: 'en-US' },
  es: { flag: '🇲🇽', name: 'Español (LatAm)', speechCode: 'es-US' },
  'es-ES': { flag: '🇪🇸', name: 'Español (ES)', speechCode: 'es-ES' },
  pt: { flag: '🇧🇷', name: 'Português', speechCode: 'pt-BR' },
  fr: { flag: '🇫🇷', name: 'Français', speechCode: 'fr-FR' },
  it: { flag: '🇮🇹', name: 'Italiano', speechCode: 'it-IT' }
};

// WebRTC Configuration
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
  ]
};

// ==========================================
// Initialization
// ==========================================
window.addEventListener('DOMContentLoaded', async () => {
  // Check URL parameters for direct room link (e.g. ?room=xyz)
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    roomInput.value = roomParam;
    showToast(`Joining room: ${roomParam}`);
  } else {
    roomInput.value = generateRoomCode();
  }

  // Initialize socket
  initSocket();

  // Initialize local preview
  await startLobbyPreview();

  // Attach Event Listeners
  setupEventListeners();
});

// Generate random friendly room code
function generateRoomCode() {
  const words = ['amor', 'corazon', 'sol', 'luz', 'vibe', 'vida', 'cielo', 'estrella'];
  const pick = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${pick}-${num}`;
}

// ==========================================
// Socket.io Setup
// ==========================================
function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('[Socket] Connected to server, ID:', socket.id);
  });

  socket.on('room-peers', async ({ peers, isInitiator }) => {
    console.log('[Socket] Room peers:', peers, 'isInitiator:', isInitiator);
    if (peers.length > 0) {
      activePartnerId = peers[0];
      setConnectionStatus('Partner Found', 'connecting');
      createPeerConnection(activePartnerId);

      if (isInitiator) {
        console.log('[WebRTC] Creating offer for peer:', activePartnerId);
        createOffer(activePartnerId);
      }
    } else {
      setConnectionStatus('Waiting for partner', 'connecting');
    }
  });

  socket.on('user-joined', async ({ peerId, userName, spokenLanguage, targetLanguage }) => {
    console.log(`[Socket] User ${userName} (${peerId}) joined`);
    activePartnerId = peerId;
    remotePeerLabel.textContent = userName || 'Partner';
    showToast(`${userName || 'Partner'} connected!`);
    setConnectionStatus('Connecting...', 'connecting');

    createPeerConnection(peerId);
    createOffer(peerId);
  });

  socket.on('signal', async ({ from, signalData }) => {
    if (!peerConnection) {
      createPeerConnection(from);
    }

    try {
      if (signalData.type === 'offer') {
        console.log('[WebRTC] Received offer');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { to: from, signalData: answer });
      } else if (signalData.type === 'answer') {
        console.log('[WebRTC] Received answer');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
      } else if (signalData.candidate) {
        console.log('[WebRTC] Received ICE candidate');
        await peerConnection.addIceCandidate(new RTCIceCandidate(signalData.candidate));
      }
    } catch (err) {
      console.error('[WebRTC] Error handling signal:', err);
    }
  });

  // Real-time Subtitle Broadcast received from server
  socket.on('receive-caption', (captionData) => {
    displayCaption(captionData);
  });

  socket.on('user-left', ({ userName }) => {
    showToast(`${userName || 'Partner'} left the call`);
    handlePartnerDisconnected();
  });
}

// ==========================================
// WebRTC Connection Logic
// ==========================================
function createPeerConnection(peerId) {
  if (peerConnection) {
    peerConnection.close();
  }

  peerConnection = new RTCPeerConnection(RTC_CONFIG);

  // Add local tracks to peer connection
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  }

  // Handle remote video stream
  peerConnection.ontrack = (event) => {
    console.log('[WebRTC] Received remote stream track');
    if (event.streams && event.streams[0]) {
      remoteVideo.srcObject = event.streams[0];
      remotePlaceholder.classList.add('hidden');
      setConnectionStatus('Connected & Encrypted', 'connected');
    }
  };

  // ICE Candidate exchange
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', {
        to: peerId,
        signalData: { candidate: event.candidate }
      });
    }
  };

  peerConnection.onconnectionstatechange = () => {
    console.log('[WebRTC] Connection state:', peerConnection.connectionState);
    if (peerConnection.connectionState === 'connected') {
      setConnectionStatus('Live & Connected', 'connected');
      remotePlaceholder.classList.add('hidden');
    } else if (
      peerConnection.connectionState === 'disconnected' ||
      peerConnection.connectionState === 'failed'
    ) {
      handlePartnerDisconnected();
    }
  };

  // Setup DataChannel for peer-to-peer subtitle exchange
  try {
    dataChannel = peerConnection.createDataChannel('live-captions');
    setupDataChannel(dataChannel);
  } catch (err) {
    console.warn('[WebRTC] Could not create DataChannel:', err);
  }

  peerConnection.ondatachannel = (event) => {
    setupDataChannel(event.channel);
  };
}

function setupDataChannel(channel) {
  channel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'caption') {
        displayCaption(data.payload);
      }
    } catch (err) {
      console.error('[DataChannel] Error parsing message:', err);
    }
  };
}

async function createOffer(peerId) {
  try {
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await peerConnection.setLocalDescription(offer);
    socket.emit('signal', { to: peerId, signalData: offer });
  } catch (err) {
    console.error('[WebRTC] Failed to create offer:', err);
  }
}

function handlePartnerDisconnected() {
  setConnectionStatus('Partner Disconnected', 'connecting');
  remotePlaceholder.classList.remove('hidden');
  remoteStatusTitle.textContent = 'Partner Disconnected';
  remoteCaptionBox.classList.add('hidden');
}

// ==========================================
// Media & Camera Controls
// ==========================================
async function startLobbyPreview() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: currentFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: true
    });

    lobbyPreview.srcObject = localStream;
    initAudioVisualizer(localStream);
  } catch (err) {
    console.error('[Media] Error accessing camera/microphone:', err);
    showToast('Camera/Mic permission needed');
  }
}

function initAudioVisualizer(stream) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 32;
    source.connect(analyserNode);

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    clearInterval(audioVisualizerInterval);
    audioVisualizerInterval = setInterval(() => {
      analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;

      // Update lobby audio bars
      audioMeterBars.forEach((bar, idx) => {
        const height = Math.min(18, Math.max(3, (avg / 255) * 20 * (idx + 1) * 0.4));
        bar.style.height = `${height}px`;
      });

      // Update in-call PIP pulsing mic dot
      if (localMicIndicator) {
        if (avg > 15) {
          localMicIndicator.style.transform = `scale(${1 + (avg / 255) * 1.5})`;
          localMicIndicator.style.boxShadow = `0 0 10px rgba(16, 185, 129, 0.9)`;
        } else {
          localMicIndicator.style.transform = 'scale(1)';
          localMicIndicator.style.boxShadow = 'none';
        }
      }
    }, 100);
  } catch (err) {
    console.warn('[Audio] Could not start visualizer:', err);
  }
}

async function switchCamera() {
  if (!localStream) return;
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

  try {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.stop();
    }

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode },
      audio: false
    });

    const newVideoTrack = newStream.getVideoTracks()[0];
    localStream.removeTrack(videoTrack);
    localStream.addTrack(newVideoTrack);

    localVideo.srcObject = localStream;
    lobbyPreview.srcObject = localStream;

    // Replace track in active WebRTC peer connection
    if (peerConnection) {
      const sender = peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(newVideoTrack);
      }
    }

    showToast(`Flipped to ${currentFacingMode === 'user' ? 'Front' : 'Back'} Camera`);
  } catch (err) {
    console.error('[Media] Error switching camera:', err);
    showToast('Camera switch failed on this device');
  }
}

// ==========================================
// Speech Recognition & Live Translation Subtitles
// ==========================================
function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('[Speech] Web Speech API not supported in this browser.');
    showToast('Speech-to-Text requires Chrome or Edge');
    return;
  }

  if (speechRecognition) {
    try {
      speechRecognition.stop();
    } catch (e) {}
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;

  // Set language based on user's spoken language setting
  const langMeta = LANG_METADATA[mySpokenLanguage] || LANG_METADATA.en;
  speechRecognition.lang = langMeta.speechCode;

  speechRecognition.onstart = () => {
    isSpeechActive = true;
    console.log(`[Speech] Recognition active in ${speechRecognition.lang}`);
  };

  speechRecognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    const activeText = finalTranscript || interimTranscript;
    if (!activeText.trim()) return;

    // Show immediate local caption feedback
    showLocalCaptionPreview(activeText, Boolean(finalTranscript));

    // Send translation caption to server
    if (finalTranscript) {
      sendCaptionToServer(finalTranscript.trim(), true);
    } else {
      // Throttle interim predictions
      clearTimeout(interimDebounceTimer);
      interimDebounceTimer = setTimeout(() => {
        sendCaptionToServer(interimTranscript.trim(), false);
      }, 350);
    }
  };

  speechRecognition.onerror = (event) => {
    console.warn('[Speech] Recognition error:', event.error);
    if (event.error === 'not-allowed') {
      showToast('Microphone permission blocked for speech');
    }
  };

  speechRecognition.onend = () => {
    // Automatically restart during active call so subtitles stay continuously on
    if (isSpeechActive && !callScreen.classList.contains('hidden') && isMicEnabled) {
      try {
        speechRecognition.start();
      } catch (err) {}
    }
  };

  try {
    speechRecognition.start();
  } catch (err) {
    console.error('[Speech] Could not start speech recognition:', err);
  }
}

function stopSpeechRecognition() {
  isSpeechActive = false;
  if (speechRecognition) {
    try {
      speechRecognition.stop();
    } catch (e) {}
  }
}

// Send caption via Socket.io and DataChannel
function sendCaptionToServer(text, isFinal) {
  if (!text || text === lastSpokenText) return;
  if (isFinal) lastSpokenText = text;

  const payload = {
    roomId: currentRoomId,
    originalText: text,
    isFinal,
    sourceLang: mySpokenLanguage,
    targetLang: myTargetLanguage
  };

  socket.emit('send-caption', payload);
}

// Display received caption (from partner or self)
function displayCaption(captionData) {
  if (!isCaptionsVisible) return;

  const isMe = captionData.senderId === socket.id;

  if (isMe) {
    // What you spoke
    localCaptionBox.classList.remove('hidden');
    localOriginalText.textContent = `"${captionData.originalText}"`;
    localTranslatedText.textContent = `→ Translated: "${captionData.translatedText}"`;
    localFlag.textContent = LANG_METADATA[captionData.sourceLang]?.flag || '🇺🇸';

    clearTimeout(localCaptionFadeTimer);
    if (captionData.isFinal) {
      localCaptionFadeTimer = setTimeout(() => {
        localCaptionBox.classList.add('hidden');
      }, 5000);
    }
  } else {
    // What your partner spoke (Crucial for user!)
    remoteCaptionBox.classList.remove('hidden');
    remoteCaptionSpeaker.textContent = captionData.senderName || 'Partner';
    remoteFlag.textContent = LANG_METADATA[captionData.sourceLang]?.flag || '🇲🇽';

    const mode = settingSubtitleMode.value;
    if (mode === 'translated-only') {
      remoteTranslatedText.textContent = captionData.translatedText;
      remoteOriginalText.classList.add('hidden');
    } else if (mode === 'original-only') {
      remoteTranslatedText.textContent = captionData.originalText;
      remoteOriginalText.classList.add('hidden');
    } else {
      // Both (Dual Mode - Default)
      remoteTranslatedText.textContent = captionData.translatedText;
      remoteOriginalText.textContent = `Original: "${captionData.originalText}"`;
      remoteOriginalText.classList.remove('hidden');
    }

    // Optional: Text-to-Speech read-aloud in target language
    if (settingTTS.checked && captionData.isFinal) {
      speakAloud(captionData.translatedText, captionData.targetLang);
    }

    clearTimeout(remoteCaptionFadeTimer);
    if (captionData.isFinal) {
      remoteCaptionFadeTimer = setTimeout(() => {
        remoteCaptionBox.classList.add('hidden');
      }, 6500);
    }
  }
}

function showLocalCaptionPreview(text, isFinal) {
  localCaptionBox.classList.remove('hidden');
  localOriginalText.textContent = `"${text}"`;
  localTranslatedText.textContent = 'Translating...';
}

function speakAloud(text, lang) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_METADATA[lang]?.speechCode || 'en-US';
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}

// ==========================================
// UI Helpers & Navigation
// ==========================================
function setConnectionStatus(text, statusClass) {
  connectionStatus.textContent = text;
  connectionStatus.className = `status-chip ${statusClass}`;
}

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3200);
}

function copyInviteLink() {
  const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(
    currentRoomId
  )}`;
  navigator.clipboard
    .writeText(url)
    .then(() => {
      showToast('Invite link copied! Send to your partner.');
    })
    .catch(() => {
      showToast(`Room: ${currentRoomId}`);
    });
}

// ==========================================
// Event Listeners
// ==========================================
function setupEventListeners() {
  // Generate Room Code
  btnGenRoom.addEventListener('click', () => {
    roomInput.value = generateRoomCode();
  });

  // Toggle Cam/Mic in Lobby
  toggleLobbyCamBtn.addEventListener('click', () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        document.getElementById('previewCamStatus').textContent = track.enabled
          ? 'Camera On'
          : 'Camera Off';
      }
    }
  });

  toggleLobbyMicBtn.addEventListener('click', () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        document.getElementById('previewMicStatus').textContent = track.enabled
          ? 'Mic Ready'
          : 'Mic Muted';
      }
    }
  });

  // Join Room Button
  btnJoinRoom.addEventListener('click', () => {
    const roomId = roomInput.value.trim() || 'default-room';
    myUserName = userNameInput.value.trim() || 'You';
    mySpokenLanguage = mySpokenLangSelect.value;
    myTargetLanguage = partnerTranslateLangSelect.value;
    currentRoomId = roomId;

    // Transition Screens
    lobbyScreen.classList.add('hidden');
    callScreen.classList.remove('hidden');

    // Attach local video to in-call PIP
    localVideo.srcObject = localStream;
    roomCodeDisplay.textContent = `Room: ${roomId}`;

    // Join room on Socket.io
    socket.emit('join-room', {
      roomId,
      userName: myUserName,
      spokenLanguage: mySpokenLanguage,
      targetLanguage: myTargetLanguage
    });

    // Start Live Speech Recognition
    startSpeechRecognition();
  });

  // Copy Invite Links
  btnCopyInvite.addEventListener('click', copyInviteLink);
  btnCopyInviteHero.addEventListener('click', copyInviteLink);

  // In-Call Mic Toggle
  btnToggleMic.addEventListener('click', () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        isMicEnabled = !isMicEnabled;
        audioTrack.enabled = isMicEnabled;

        btnToggleMic.querySelector('.icon-on').classList.toggle('hidden', !isMicEnabled);
        btnToggleMic.querySelector('.icon-off').classList.toggle('hidden', isMicEnabled);
        btnToggleMic.classList.toggle('muted', !isMicEnabled);

        if (isMicEnabled) {
          startSpeechRecognition();
          showToast('Microphone unmuted');
        } else {
          stopSpeechRecognition();
          showToast('Microphone muted');
        }
      }
    }
  });

  // In-Call Cam Toggle
  btnToggleCam.addEventListener('click', () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        isCamEnabled = !isCamEnabled;
        videoTrack.enabled = isCamEnabled;

        btnToggleCam.querySelector('.icon-on').classList.toggle('hidden', !isCamEnabled);
        btnToggleCam.querySelector('.icon-off').classList.toggle('hidden', isCamEnabled);
        btnToggleCam.classList.toggle('off', !isCamEnabled);
      }
    }
  });

  // Flip Camera
  btnSwitchCamera.addEventListener('click', switchCamera);

  // Toggle Subtitles On/Off
  btnToggleCaptions.addEventListener('click', () => {
    isCaptionsVisible = !isCaptionsVisible;
    btnToggleCaptions.classList.toggle('active-state', isCaptionsVisible);
    subtitlesOverlay.classList.toggle('hidden', !isCaptionsVisible);
    showToast(isCaptionsVisible ? 'Subtitles On' : 'Subtitles Hidden');
  });

  // Flip PIP view
  btnFlipPip.addEventListener('click', () => {
    localVideo.style.transform =
      localVideo.style.transform === 'scaleX(1)' ? 'scaleX(-1)' : 'scaleX(1)';
  });

  // End Call
  btnEndCall.addEventListener('click', () => {
    stopSpeechRecognition();
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    callScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    window.location.reload();
  });

  // Settings Modal Controls
  btnToggleSettings.addEventListener('click', () => {
    settingMyLang.value = mySpokenLanguage;
    settingTargetLang.value = myTargetLanguage;
    settingsModal.classList.remove('hidden');
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  btnSaveSettings.addEventListener('click', () => {
    mySpokenLanguage = settingMyLang.value;
    myTargetLanguage = settingTargetLang.value;

    // Apply subtitle size
    subtitlesOverlay.className = `subtitles-overlay ${settingSubtitleSize.value}`;

    // Restart speech recognition in new language
    startSpeechRecognition();

    settingsModal.classList.add('hidden');
    showToast('Settings saved');
  });
}
