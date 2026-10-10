package com.amorbridge.app.speech

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import kotlinx.coroutines.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.Locale

class SpeechTranslator(
    private val context: Context,
    private val serverBaseUrl: String, // e.g. "http://10.0.2.2:3000" or your public tunnel
    private val onCaptionUpdate: (original: String, translated: String, isFinal: Boolean) -> Unit
) {
    private val tag = "SpeechTranslator"
    private var speechRecognizer: SpeechRecognizer? = null
    private val client = OkHttpClient()
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    var myLanguage: String = "en-US"
    var targetLanguage: String = "es"
    private var isListening = false

    fun startListening() {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            Log.e(tag, "Speech recognition is not available on this device")
            return
        }

        CoroutineScope(Dispatchers.Main).launch {
            stopListening()

            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {
                        Log.d(tag, "SpeechRecognizer ready for speech")
                    }

                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {}

                    override fun onError(error: Int) {
                        Log.w(tag, "Speech error code: $error")
                        // Automatically restart if active
                        if (isListening) {
                            startListening()
                        }
                    }

                    override fun onResults(results: Bundle?) {
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        val text = matches?.firstOrNull() ?: ""
                        if (text.isNotBlank()) {
                            translateAndEmit(text, isFinal = true)
                        }
                        if (isListening) {
                            startListening()
                        }
                    }

                    override fun onPartialResults(partialResults: Bundle?) {
                        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        val partialText = matches?.firstOrNull() ?: ""
                        if (partialText.isNotBlank()) {
                            translateAndEmit(partialText, isFinal = false)
                        }
                    }

                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, myLanguage)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            }

            isListening = true
            speechRecognizer?.startListening(intent)
        }
    }

    fun stopListening() {
        isListening = false
        speechRecognizer?.destroy()
        speechRecognizer = null
    }

    private fun translateAndEmit(text: String, isFinal: Boolean) {
        scope.launch {
            try {
                val json = JSONObject().apply {
                    put("text", text)
                    put("sourceLang", myLanguage.substring(0, 2))
                    put("targetLang", targetLanguage)
                }

                val requestBody = json.toString().toRequestBody("application/json".toMediaType())
                val request = Request.Builder()
                    .url("$serverBaseUrl/api/translate")
                    .post(requestBody)
                    .build()

                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    val respJson = JSONObject(response.body?.string() ?: "{}")
                    val translated = respJson.optString("translated", text)
                    withContext(Dispatchers.Main) {
                        onCaptionUpdate(text, translated, isFinal)
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        onCaptionUpdate(text, text, isFinal)
                    }
                }
            } catch (e: Exception) {
                Log.e(tag, "Translation network error: ${e.message}")
                withContext(Dispatchers.Main) {
                    onCaptionUpdate(text, text, isFinal)
                }
            }
        }
    }
}
