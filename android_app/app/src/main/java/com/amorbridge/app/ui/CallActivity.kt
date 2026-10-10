package com.amorbridge.app.ui

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.amorbridge.app.speech.SpeechTranslator

class CallActivity : ComponentActivity() {

    companion object {
        const val EXTRA_ROOM_ID = "extra_room_id"
        const val EXTRA_PARTNER_NAME = "extra_partner_name"
    }

    private var speechTranslator: SpeechTranslator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val roomId = intent.getStringExtra(EXTRA_ROOM_ID) ?: "default-room"
        val partnerName = intent.getStringExtra(EXTRA_PARTNER_NAME) ?: "Partner"

        setContent {
            CallScreen(
                roomId = roomId,
                partnerName = partnerName,
                onEndCall = { finish() },
                onInitSpeech = { onCaption ->
                    // Initializing speech recognizer
                    speechTranslator = SpeechTranslator(
                        context = this,
                        serverBaseUrl = "http://10.0.2.2:3000",
                        onCaptionUpdate = onCaption
                    ).apply {
                        startListening()
                    }
                }
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        speechTranslator?.stopListening()
    }
}

@Composable
fun CallScreen(
    roomId: String,
    partnerName: String,
    onEndCall: () -> Unit,
    onInitSpeech: ((original: String, translated: String, isFinal: Boolean) -> Unit) -> Unit
) {
    var isMicMuted by remember { mutableStateOf(false) }
    var isCamOff by remember { mutableStateOf(false) }
    var showCaptions by remember { mutableStateOf(true) }

    var currentOriginalText by remember { mutableStateOf("Listening to your voice...") }
    var currentTranslatedText by remember { mutableStateOf("Live subtitles will show here ✨") }
    var hasActiveCaption by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        onInitSpeech { original, translated, isFinal ->
            currentOriginalText = original
            currentTranslatedText = translated
            hasActiveCaption = true
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF090D16))
    ) {
        // Main Remote Video Background (Simulated Partner Video Stage)
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .background(Color(0xFF1E293B), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                        tint = Color(0xFFA5B4FC),
                        modifier = Modifier.size(60.dp)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = partnerName,
                    color = Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Connected in Room: $roomId",
                    color = Color(0xFF94A3B8),
                    fontSize = 14.sp
                )
            }
        }

        // Top Status Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 48.dp, start = 16.dp, end = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = Color(0xFF1E293B).copy(alpha = 0.8f),
                shape = RoundedCornerShape(20.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(Color(0xFF10B981), CircleShape)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(text = "Encrypted WebRTC", color = Color.White, fontSize = 12.sp)
                }
            }

            // Local PiP (Floating Preview Box)
            Box(
                modifier = Modifier
                    .size(width = 100.dp, height = 140.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF0F172A))
                    .border(1.5.dp, Color(0xFF6366F1), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (isCamOff) {
                    Icon(
                        imageVector = Icons.Default.VideocamOff,
                        contentDescription = "Cam Off",
                        tint = Color(0xFF64748B)
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Face,
                        contentDescription = "Self Camera",
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier.size(36.dp)
                    )
                }
                Text(
                    text = "You",
                    color = Color.White,
                    fontSize = 11.sp,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(6.dp)
                )
            }
        }

        // LIVE SUBTITLE OVERLAY (Cinema-Grade Frosted Glass Pill)
        AnimatedVisibility(
            visible = showCaptions && hasActiveCaption,
            enter = fadeIn() + slideInVertically { it / 2 },
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 120.dp, start = 16.dp, end = 16.dp)
        ) {
            Surface(
                color = Color(0xFF0B101D).copy(alpha = 0.9f),
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8).copy(alpha = 0.4f)),
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "🇲🇽 $partnerName (Live Translation)",
                            color = Color(0xFF38BDF8),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Surface(
                            color = Color(0xFFF43F5E).copy(alpha = 0.2f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "LIVE",
                                color = Color(0xFFF43F5E),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Prominent Translated Text
                    Text(
                        text = currentTranslatedText,
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 24.sp
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    // Original Spoken Text (Sub-caption)
                    Text(
                        text = "Original: \"$currentOriginalText\"",
                        color = Color(0xFF94A3B8),
                        fontSize = 13.sp
                    )
                }
            }
        }

        // Bottom Call Action Controls Bar
        Surface(
            color = Color(0xFF0F172A).copy(alpha = 0.85f),
            shape = RoundedCornerShape(32.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334155)),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 28.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Mic Button
                IconButton(
                    onClick = { isMicMuted = !isMicMuted },
                    modifier = Modifier
                        .size(52.dp)
                        .background(
                            if (isMicMuted) Color(0xFFEF4444).copy(alpha = 0.2f) else Color(0xFF1E293B),
                            CircleShape
                        )
                ) {
                    Icon(
                        imageVector = if (isMicMuted) Icons.Default.MicOff else Icons.Default.Mic,
                        contentDescription = "Mic",
                        tint = if (isMicMuted) Color(0xFFEF4444) else Color.White
                    )
                }

                // Camera Toggle
                IconButton(
                    onClick = { isCamOff = !isCamOff },
                    modifier = Modifier
                        .size(52.dp)
                        .background(
                            if (isCamOff) Color(0xFFEF4444).copy(alpha = 0.2f) else Color(0xFF1E293B),
                            CircleShape
                        )
                ) {
                    Icon(
                        imageVector = if (isCamOff) Icons.Default.VideocamOff else Icons.Default.Videocam,
                        contentDescription = "Camera",
                        tint = if (isCamOff) Color(0xFFEF4444) else Color.White
                    )
                }

                // Captions Toggle (CC)
                IconButton(
                    onClick = { showCaptions = !showCaptions },
                    modifier = Modifier
                        .size(52.dp)
                        .background(
                            if (showCaptions) Color(0xFF6366F1).copy(alpha = 0.3f) else Color(0xFF1E293B),
                            CircleShape
                        )
                ) {
                    Icon(
                        imageVector = Icons.Default.ClosedCaption,
                        contentDescription = "Subtitles",
                        tint = if (showCaptions) Color(0xFFA5B4FC) else Color(0xFF64748B)
                    )
                }

                // End Call Button (Red Pill)
                IconButton(
                    onClick = onEndCall,
                    modifier = Modifier
                        .size(52.dp)
                        .background(Color(0xFFF43F5E), CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.CallEnd,
                        contentDescription = "End Call",
                        tint = Color.White
                    )
                }
            }
        }
    }
}
