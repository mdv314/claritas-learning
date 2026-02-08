"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceChatProps {
    courseId: string;
    unitNumber: number;
    questionIndex: number;
    questionType: "mcq" | "frq";
}

export default function VoiceChat({ courseId, unitNumber, questionIndex, questionType }: VoiceChatProps) {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
    const [transcript, setTranscript] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const playbackQueueRef = useRef<ArrayBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    const playNextChunk = useCallback(() => {
        if (playbackQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setStatus(prev => prev === 'speaking' ? 'listening' : prev);
            return;
        }

        isPlayingRef.current = true;
        setStatus('speaking');
        const chunk = playbackQueueRef.current.shift()!;
        const ctx = audioContextRef.current;
        if (!ctx) return;

        // Decode PCM Int16 at 24kHz (Gemini Live API output format)
        const int16Array = new Int16Array(chunk);
        const floatArray = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            floatArray[i] = int16Array[i] / 32768.0;
        }

        const audioBuffer = ctx.createBuffer(1, floatArray.length, 24000);
        audioBuffer.copyToChannel(floatArray, 0);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => playNextChunk();
        sourceNodeRef.current = source;
        source.start();
    }, []);

    const startSession = useCallback(async () => {
        setError(null);
        setStatus('connecting');
        setTranscript([]);

        try {
            // Get microphone
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true }
            });
            streamRef.current = stream;

            // Create AudioContext for both capture and playback
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioCtx;

            // Load AudioWorklet for PCM conversion
            await audioCtx.audioWorklet.addModule('/audio-processor.js');

            // Connect to WebSocket
            const ws = new WebSocket('ws://127.0.0.1:5000/ws/quiz_help/voice');
            wsRef.current = ws;

            ws.onopen = () => {
                // Send init message
                ws.send(JSON.stringify({
                    courseId,
                    unitNumber,
                    questionIndex,
                    questionType
                }));
            };

            ws.onmessage = (event) => {
                if (event.data instanceof Blob) {
                    // Audio data from Gemini
                    event.data.arrayBuffer().then(buffer => {
                        playbackQueueRef.current.push(buffer);
                        if (!isPlayingRef.current) {
                            playNextChunk();
                        }
                    });
                } else {
                    // JSON message
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === 'transcript') {
                            setTranscript(prev => [...prev, msg.text]);
                        } else if (msg.status === 'ready') {
                            // Start sending audio
                            setStatus('listening');
                            const source = audioCtx.createMediaStreamSource(stream);
                            const workletNode = new AudioWorkletNode(audioCtx, 'audio-processor');
                            workletNodeRef.current = workletNode;

                            workletNode.port.onmessage = (e) => {
                                if (ws.readyState === WebSocket.OPEN) {
                                    ws.send(e.data);
                                }
                            };

                            source.connect(workletNode);
                            workletNode.connect(audioCtx.destination);
                        } else if (msg.error) {
                            setError(msg.error);
                            stopSession();
                        }
                    } catch {
                        // ignore parse errors
                    }
                }
            };

            ws.onerror = () => {
                setError('Connection error. Please try again.');
                stopSession();
            };

            ws.onclose = () => {
                if (status !== 'idle') {
                    setStatus('idle');
                }
            };

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start voice chat');
            setStatus('idle');
        }
    }, [courseId, unitNumber, questionIndex, questionType, playNextChunk, status]);

    const stopSession = useCallback(() => {
        // Stop audio worklet
        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }

        // Stop media stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Stop playback
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); } catch { /* already stopped */ }
            sourceNodeRef.current = null;
        }
        playbackQueueRef.current = [];
        isPlayingRef.current = false;

        // Close AudioContext
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Close WebSocket
        if (wsRef.current) {
            try {
                wsRef.current.send(JSON.stringify({ type: 'stop' }));
            } catch { /* ws may already be closed */ }
            wsRef.current.close();
            wsRef.current = null;
        }

        setStatus('idle');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);

    const toggleSession = () => {
        if (status === 'idle') {
            startSession();
        } else {
            stopSession();
        }
    };

    return (
        <div className="flex flex-col h-full items-center justify-between py-6 px-4">
            {/* Transcript area */}
            <div className="flex-1 w-full overflow-y-auto mb-6">
                {transcript.length === 0 && status === 'idle' && (
                    <div className="text-center text-gray-400 mt-8">
                        <p className="text-sm">Press the microphone to start a voice conversation.</p>
                        <p className="text-xs mt-1">I&apos;ll help guide your thinking without giving away the answer.</p>
                    </div>
                )}
                {transcript.length > 0 && (
                    <div className="space-y-3">
                        {transcript.map((text, i) => (
                            <div key={i} className="bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800">
                                {text}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Status indicator */}
            <div className="text-sm text-gray-500 mb-4 h-5">
                {status === 'connecting' && 'Connecting...'}
                {status === 'listening' && 'Listening...'}
                {status === 'speaking' && 'AI is speaking...'}
            </div>

            {/* Microphone button */}
            <button
                onClick={toggleSession}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                    status === 'idle'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                        : status === 'listening'
                        ? 'bg-red-500 text-white shadow-lg animate-pulse'
                        : status === 'speaking'
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-gray-400 text-white'
                }`}
            >
                {status === 'idle' ? (
                    // Mic icon
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                ) : status === 'connecting' ? (
                    // Spinner
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    // Stop icon
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                )}
            </button>

            {error && (
                <p className="text-red-500 text-sm mt-4 text-center">{error}</p>
            )}
        </div>
    );
}
