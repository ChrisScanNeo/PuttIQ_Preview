package com.puttiq.audio

import android.media.*
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.*

class PuttIQAudioModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    private var audioTrack: AudioTrack? = null
    private var audioRecord: AudioRecord? = null
    private var isPlaying = false
    private var isListening = false
    private var bpm = 80.0
    private var beatCount = 0
    private var startTime = 0L
    private var threshold = -25f // dB
    private var lastHitTime = 0L
    private val handler = Handler(Looper.getMainLooper())
    private var beatRunnable: Runnable? = null
    private var recordingThread: Thread? = null
    
    // Audio parameters
    private val sampleRate = 44100
    private val channelConfig = AudioFormat.CHANNEL_OUT_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    
    override fun getName(): String = "PuttIQAudio"

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            // Initialize AudioTrack for metronome playback
            val minBufferSize = AudioTrack.getMinBufferSize(
                sampleRate, channelConfig, audioFormat
            )
            
            audioTrack = AudioTrack(
                AudioManager.STREAM_MUSIC,  // Always plays through speaker
                sampleRate,
                channelConfig,
                audioFormat,
                minBufferSize * 2,
                AudioTrack.MODE_STREAM
            )
            
            // Initialize AudioRecord for hit detection
            val recordBufferSize = AudioRecord.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                audioFormat
            )
            
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.UNPROCESSED, // Raw mic input
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                audioFormat,
                recordBufferSize * 2
            )
            
            promise.resolve(
                WritableNativeMap().apply {
                    putBoolean("success", true)
                    putString("message", "Audio engine initialized")
                }
            )
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", "Failed to initialize audio", e)
        }
    }

    @ReactMethod
    fun startMetronome(bpmValue: Double, promise: Promise) {
        if (isPlaying) {
            promise.resolve(
                WritableNativeMap().apply {
                    putBoolean("success", false)
                    putString("message", "Already playing")
                }
            )
            return
        }
        
        bpm = bpmValue
        isPlaying = true
        startTime = System.currentTimeMillis()
        beatCount = 0
        
        audioTrack?.play()
        scheduleNextBeat()
        
        promise.resolve(
            WritableNativeMap().apply {
                putBoolean("success", true)
                putDouble("startTime", startTime.toDouble())
                putDouble("bpm", bpm)
            }
        )
    }

    private fun scheduleNextBeat() {
        if (!isPlaying) return
        
        val beatInterval = (60000.0 / bpm).toLong()
        val now = System.currentTimeMillis()
        val nextBeatTime = startTime + ((beatCount + 1) * beatInterval)
        val delay = nextBeatTime - now
        
        beatRunnable = Runnable {
            if (isPlaying) {
                playBeat()
            }
        }
        
        if (delay <= 0) {
            handler.post(beatRunnable!!)
        } else {
            handler.postDelayed(beatRunnable!!, delay)
        }
    }

    private fun playBeat() {
        if (!isPlaying) return
        
        // Generate and play click sound
        val clickDuration = 0.05 // 50ms click
        val clickSamples = (sampleRate * clickDuration).toInt()
        val audioData = ShortArray(clickSamples)
        
        // Generate 1kHz click with envelope
        for (i in audioData.indices) {
            val envelope = (clickSamples - i).toFloat() / clickSamples
            val sample = (sin(2.0 * PI * 1000.0 * i / sampleRate) * 
                         envelope * Short.MAX_VALUE * 0.5).toInt().toShort()
            audioData[i] = sample
        }
        
        audioTrack?.write(audioData, 0, audioData.size)
        
        beatCount++
        
        // Send beat event
        sendEvent("onBeat", WritableNativeMap().apply {
            putInt("beatCount", beatCount)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
            putDouble("bpm", bpm)
        })
        
        scheduleNextBeat()
    }

    @ReactMethod
    fun stopMetronome(promise: Promise) {
        isPlaying = false
        beatRunnable?.let { handler.removeCallbacks(it) }
        audioTrack?.stop()
        
        promise.resolve(
            WritableNativeMap().apply {
                putBoolean("success", true)
            }
        )
    }

    @ReactMethod
    fun startListening(promise: Promise) {
        if (isListening) {
            promise.resolve(
                WritableNativeMap().apply {
                    putBoolean("success", false)
                    putString("message", "Already listening")
                }
            )
            return
        }
        
        isListening = true
        audioRecord?.startRecording()
        
        // Start recording thread
        recordingThread = Thread {
            val bufferSize = 1024
            val buffer = ShortArray(bufferSize)
            
            while (isListening) {
                val read = audioRecord?.read(buffer, 0, bufferSize) ?: 0
                if (read > 0) {
                    analyzeAudioBuffer(buffer, read)
                }
            }
        }
        recordingThread?.start()
        
        promise.resolve(
            WritableNativeMap().apply {
                putBoolean("success", true)
            }
        )
    }

    private fun analyzeAudioBuffer(buffer: ShortArray, length: Int) {
        var maxAmplitude = 0f
        
        for (i in 0 until length) {
            val amplitude = abs(buffer[i].toFloat() / Short.MAX_VALUE)
            if (amplitude > maxAmplitude) {
                maxAmplitude = amplitude
            }
        }
        
        // Convert to dB
        val db = 20 * log10(maxAmplitude + 0.00001f)
        
        // Check for hit
        val now = System.currentTimeMillis()
        if (db > threshold && (now - lastHitTime) > 500) { // 500ms debounce
            lastHitTime = now
            
            // Calculate timing accuracy
            val beatInterval = 60000.0 / bpm
            val timeSinceStart = (now - startTime).toDouble()
            val expectedBeatTime = round(timeSinceStart / beatInterval) * beatInterval
            val offset = timeSinceStart - expectedBeatTime
            val accuracy = max(0.0, 100 - (abs(offset) / beatInterval * 200))
            
            val timing = when {
                offset < -50 -> "early"
                offset > 50 -> "late"
                else -> "perfect"
            }
            
            // Send hit event
            handler.post {
                sendEvent("onHitDetected", WritableNativeMap().apply {
                    putDouble("timestamp", now.toDouble())
                    putDouble("volume", db.toDouble())
                    putDouble("accuracy", accuracy)
                    putString("timing", timing)
                    putDouble("offset", offset)
                })
            }
        }
        
        // Send volume update
        handler.post {
            sendEvent("onVolumeUpdate", WritableNativeMap().apply {
                putDouble("volume", db.toDouble())
            })
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        isListening = false
        audioRecord?.stop()
        recordingThread?.join(1000)
        
        promise.resolve(
            WritableNativeMap().apply {
                putBoolean("success", true)
            }
        )
    }

    @ReactMethod
    fun setBPM(bpmValue: Double, promise: Promise) {
        bpm = bpmValue
        promise.resolve(
            WritableNativeMap().apply {
                putBoolean("success", true)
                putDouble("bpm", bpm)
            }
        )
    }

    @ReactMethod
    fun setThreshold(thresholdValue: Double, promise: Promise) {
        threshold = thresholdValue.toFloat()
        promise.resolve(
            WritableNativeMap().apply {
                putBoolean("success", true)
                putDouble("threshold", threshold.toDouble())
            }
        )
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}