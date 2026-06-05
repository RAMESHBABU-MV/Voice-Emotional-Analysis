import React, { useState, useRef } from 'react';
import { Mic, Square, Smile, Frown, Flame, Volume2, HelpCircle } from 'lucide-react';

// Explicitly define our supported emotion keys
type Emotion = 'Happy' | 'Sad' | 'Angry' | 'Calm';

interface ThemeConfig {
  bg: string;
  icon: React.ComponentType<{ className?: string }>;
  note: string;
}

const EMOTION_THEMES: Record<Emotion, ThemeConfig> = {
  Happy: { bg: 'bg-emerald-500 text-emerald-950', icon: Smile, note: "High energy / bright tone detected." },
  Sad: { bg: 'bg-blue-600 text-blue-50', icon: Frown, note: "Low energy / subdued acoustic profile." },
  Angry: { bg: 'bg-rose-600 text-rose-50', icon: Flame, note: "High voice amplitude & pitch variability." },
  Calm: { bg: 'bg-violet-600 text-violet-50', icon: Volume2, note: "Stable, balanced pitch frequencies." }
};

interface ApiResponse {
  success: boolean;
  prediction: Emotion;
  feature_vector_length: number;
}

export default function App(): React.JSX.Element {
  const [recording, setRecording] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [emotionResult, setEmotionResult] = useState<Emotion | null>(null);

  // Strongly type our browser recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startVoiceRecording = async (): Promise<void> => {
    setEmotionResult(null);
    audioChunksRef.current = [];
    
    try {
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all hardware tracks to turn off the user's mic light
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        await uploadAudioToBackend(audioBlob);
      };

      mediaRecorder.start(250);
      setRecording(true);
    } catch (err) {
      console.error("Microphone access failed:", err);
      alert("Could not access microphone. Please verify permissions.");
    }
  };

  const stopVoiceRecording = (): void => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadAudioToBackend = async (blob: Blob): Promise<void> => {
    setProcessing(true);
    const formData = new FormData();
    formData.append('file', blob, 'recording.raw');

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Server communication fault.");

      const data: ApiResponse = await response.json();
      if (data.success) {
        setEmotionResult(data.prediction);
      }
    } catch (error) {
      console.error("Transmission failed:", error);
      alert("Error reaching Python Serverless instance.");
    } finally {
      setProcessing(false);
    }
  };

  // Resolve the visual component icon type dynamically
  const ResultIcon = emotionResult ? EMOTION_THEMES[emotionResult].icon : HelpCircle;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center">
        
        <header className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-white">Voice Emotion Core</h1>
          <p className="text-xs text-slate-400 mt-1">Vercel Serverless Architecture (TSX)</p>
        </header>

        <div className="w-full h-40 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center mb-6 overflow-hidden relative">
          {recording && (
            <div className="flex flex-col items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <p className="text-xs font-semibold text-rose-400 animate-pulse tracking-wider">STREAMING LIVE AUDIO...</p>
            </div>
          )}

          {processing && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-indigo-400 font-medium">PYTHON: EXTRACTING MFCC VECTORS...</p>
            </div>
          )}

          {!recording && !processing && !emotionResult && (
            <p className="text-xs text-slate-500 px-4">Press the button and speak to analyze tone.</p>
          )}

          {emotionResult && !recording && !processing && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 ${EMOTION_THEMES[emotionResult].bg}`}>
              <ResultIcon className="w-10 h-10 mb-1" />
              <h2 className="text-2xl font-black uppercase tracking-wide">{emotionResult}</h2>
              <p className="text-[10px] opacity-80 mt-1 max-w-[80%] font-medium">{EMOTION_THEMES[emotionResult].note}</p>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          {!recording ? (
            <button
              onClick={startVoiceRecording}
              disabled={processing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-sm px-6 py-3 rounded-full shadow-md transition-all active:scale-95"
            >
              <Mic className="w-4 h-4" /> Start Capturing Voice
            </button>
          ) : (
            <button
              onClick={stopVoiceRecording}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm px-6 py-3 rounded-full shadow-md transition-all active:scale-95"
            >
              <Square className="w-4 h-4 fill-white" /> Stop & Process Audio
            </button>
          )}
        </div>

      </div>
    </div>
  );
}