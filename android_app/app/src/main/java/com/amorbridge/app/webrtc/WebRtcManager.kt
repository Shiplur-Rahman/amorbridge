package com.amorbridge.app.webrtc

import android.content.Context
import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import org.webrtc.*

class WebRtcManager(
    private val context: Context,
    private val serverUrl: String, // e.g. "http://10.0.2.2:3000" or public tunnel URL
    private val onRemoteStreamAdded: (MediaStream) -> Unit,
    private val onCaptionReceived: (senderName: String, original: String, translated: String) -> Unit
) {
    private val tag = "WebRtcManager"
    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var socket: Socket? = null
    private var localVideoTrack: VideoTrack? = null
    private var localAudioTrack: AudioTrack? = null
    private var videoCapturer: VideoCapturer? = null

    private val iceServers = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun2.l.google.com:19302").createIceServer()
    )

    fun initWebRtc(localSurfaceView: SurfaceViewRenderer, remoteSurfaceView: SurfaceViewRenderer) {
        val rootEglBase = EglBase.create()
        localSurfaceView.init(rootEglBase.eglBaseContext, null)
        remoteSurfaceView.init(rootEglBase.eglBaseContext, null)

        val options = PeerConnectionFactory.InitializationOptions.builder(context)
            .setEnableInternalTracer(true)
            .createInitializationOptions()
        PeerConnectionFactory.initialize(options)

        val encoderFactory = DefaultVideoEncoderFactory(rootEglBase.eglBaseContext, true, true)
        val decoderFactory = DefaultVideoDecoderFactory(rootEglBase.eglBaseContext)

        peerConnectionFactory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .createPeerConnectionFactory()

        createLocalTracks(rootEglBase, localSurfaceView)
        connectSocket()
    }

    private fun createLocalTracks(eglBase: EglBase, localSurfaceView: SurfaceViewRenderer) {
        val factory = peerConnectionFactory ?: return

        // Audio Track
        val audioSource = factory.createAudioSource(MediaConstraints())
        localAudioTrack = factory.createAudioTrack("ARDAMSa0", audioSource)

        // Camera Video Track
        videoCapturer = createCameraCapturer()
        if (videoCapturer != null) {
            val surfaceTextureHelper = SurfaceTextureHelper.create("CaptureThread", eglBase.eglBaseContext)
            val videoSource = factory.createVideoSource(videoCapturer!!.isScreencast)
            videoCapturer!!.initialize(surfaceTextureHelper, context, videoSource.capturerObserver)
            videoCapturer!!.startCapture(1280, 720, 30)

            localVideoTrack = factory.createVideoTrack("ARDAMSv0", videoSource)
            localVideoTrack?.addSink(localSurfaceView)
        }
    }

    private fun createCameraCapturer(): VideoCapturer? {
        val enumerator = Camera2Enumerator(context)
        val deviceNames = enumerator.deviceNames

        // Try front facing camera first
        for (deviceName in deviceNames) {
            if (enumerator.isFrontFacing(deviceName)) {
                return enumerator.createCapturer(deviceName, null)
            }
        }
        // Fallback to back facing
        for (deviceName in deviceNames) {
            if (enumerator.isBackFacing(deviceName)) {
                return enumerator.createCapturer(deviceName, null)
            }
        }
        return null
    }

    private fun connectSocket() {
        try {
            socket = IO.socket(serverUrl)
            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(tag, "Connected to WebRTC signaling server")
            }
            socket?.on("receive-caption") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val senderName = data.optString("senderName", "Partner")
                    val orig = data.optString("originalText", "")
                    val trans = data.optString("translatedText", "")
                    onCaptionReceived(senderName, orig, trans)
                }
            }
            socket?.connect()
        } catch (e: Exception) {
            Log.e(tag, "Socket connection error: ${e.message}")
        }
    }

    fun joinRoom(roomId: String, userName: String, myLang: String, targetLang: String) {
        val json = JSONObject().apply {
            put("roomId", roomId)
            put("userName", userName)
            put("spokenLanguage", myLang)
            put("targetLanguage", targetLang)
        }
        socket?.emit("join-room", json)
    }

    fun sendCaption(roomId: String, originalText: String, isFinal: Boolean, myLang: String, targetLang: String) {
        val json = JSONObject().apply {
            put("roomId", roomId)
            put("originalText", originalText)
            put("isFinal", isFinal)
            put("sourceLang", myLang)
            put("targetLang", targetLang)
        }
        socket?.emit("send-caption", json)
    }

    fun toggleMic(enable: Boolean) {
        localAudioTrack?.setEnabled(enable)
    }

    fun toggleCamera(enable: Boolean) {
        localVideoTrack?.setEnabled(enable)
    }

    fun close() {
        try {
            videoCapturer?.stopCapture()
            videoCapturer?.dispose()
            peerConnection?.close()
            socket?.disconnect()
            peerConnectionFactory?.dispose()
        } catch (e: Exception) {
            Log.e(tag, "Error closing WebRTC: ${e.message}")
        }
    }
}
