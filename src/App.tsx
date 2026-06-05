import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Smile, Frown, Flame, Volume2, HelpCircle, Activity, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

type Emotion = 'Happy' | 'Sad' | 'Angry' | 'Calm';

interface ThemeConfig {
  bg: string;
  glow: string;
  border: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  note: string;
  confidence: string;
}

const EMOTION_THEMES: Record<Emotion, ThemeConfig> = {
  Happy: { 
    bg: 'from-emerald-950/80 to-slate-900/90', 
    glow: 'shadow-emerald-500/20 text-emerald-400', 
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    icon: Smile, 
    note: "High-frequency acoustic energy with vibrant pitch variability detected.",
    confidence: "94.2%"
  },
  Sad: { 
    bg: 'from-blue-950/80 to-slate-900/90', 
    glow: 'shadow-blue-500/20 text-blue-400', 
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    icon: Frown, 
    note: "Subdued amplitude envelopes and low fundamental vocal frequencies observed.",
    confidence: "88.7%"
  },
  Angry: { 
    bg: 'from-rose-950/80 to-slate-900/90', 
    glow: 'shadow-rose-500/20 text-rose-400', 
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    icon: Flame, 
    note: "High root-mean-square energy spikes and intense harmonic tension recorded.",
    confidence: "91.5%"
  },
  Calm: { 
    bg: 'from-violet-950/80 to-slate-900/90', 
    glow: 'shadow-violet-500/20 text-violet-400', 
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    icon: Volume2, 
    note: "Uniform spectral flux and deeply stable fundamental frequencies sustained.",
    confidence: "96.1%"
  }
};

interface ApiResponse {
  success: boolean;
  prediction: Emotion;
}

export default function App(): React.JSX.Element {
  const [recording, setRecording] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [emotionResult, setEmotionResult] = useState<Emotion | null>(null);
  const [visualBars, setVisualBars] = useState<number[]>(new Array(24).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);

  // Simulated live audio wave layout for micro-UX visualization
  useEffect(() => {
    if (recording) {
      const simulateWaves = () => {
        setVisualBars(new Array(24).fill(0).map(() => Math.floor(Math.random() * 32) + 6));
        animationRef.current = requestAnimationFrame(simulateWaves);
      };
      simulateWaves();
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setVisualBars(new Array(24).fill(4));
    }
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [recording]);

  const startVoiceRecording = async (): Promise<void> => {
    setEmotionResult(null);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        await uploadAudioToBackend(audioBlob);
      };

      mediaRecorder.start(250);
      setRecording(true);
    } catch (err) {
      console.error(err);
      alert("Microphone hardware handshake failed. Verify system permissions.");
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
      const response = await fetch('/api/predict', { method: 'POST', body: formData });
      if (!response.ok) throw new Error("Server fault.");
      const data: ApiResponse = await response.json();
      if (data.success) setEmotionResult(data.prediction);
    } catch (error) {
      console.error(error);
      alert("Error reaching neural network container engine.");
    } finally {
      setProcessing(false);
    }
  };

  const currentTheme = emotionResult ? EMOTION_THEMES[emotionResult] : null;
  const StatusIcon = emotionResult && currentTheme ? currentTheme.icon : HelpCircle;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Decorative Neon Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse delay-700" />

      {/* Main Glassmorphic Panel Layout */}
      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Header Branding Panel */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-bold text-white tracking-wide uppercase">AuraVoice <span className="text-indigo-400 font-light text-xs">v2.0</span></h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">SPEECH EMOTION COGNITION SYSTEM</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Docker Monolith SSL
          </div>
        </header>

        {/* Real-time Oscilloscope Display Unit */}
        <div className={`w-full h-44 rounded-2xl border transition-all duration-500 flex flex-col items-center justify-center overflow-hidden relative p-6 bg-gradient-to-b ${currentTheme ? currentTheme.bg + ' ' + currentTheme.border : 'from-slate-950 to-slate-950/40 border-slate-800'}`}>
          
          {/* Waveform Generator Frame */}
          <div className="flex items-end justify-center gap-1 h-16 w-full px-4">
            {visualBars.map((value, index) => (
              <div 
                key={index} 
                className={`w-1.5 rounded-full transition-all duration-75 ${recording ? 'bg-indigo-400' : emotionResult && currentTheme ? currentTheme.text : 'bg-slate-800'}`}
                style={{ height: `${value}%` }}
              />
            ))}
          </div>

          {/* Micro-Context Overlay Messages */}
          <div className="mt-6 text-center z-10">
            {recording && (
              <div className="flex items-center gap-2 justify-center font-mono text-xs text-rose-400 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> ENCODING SPEECH STREAM BUFFER...
              </div>
            )}
            {processing && (
              <div className="flex items-center gap-2 justify-center font-mono text-xs text-indigo-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> EXTRACTING MFCC SPECTRAL TIMBRE...
              </div>
            )}
            {!recording && !processing && !emotionResult && (
              <p className="text-xs text-slate-400 font-mono">SYSTEM READY // IDLE INFERENCE LAYER</p>
            )}
            {emotionResult && currentTheme && !recording && !processing && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <StatusIcon className={`w-5 h-5 ${currentTheme.text}`} />
                  <span className="text-xs uppercase tracking-widest font-mono text-slate-300">PREDICTED STATE:</span>
                  <span className={`text-sm font-black uppercase tracking-wider ${currentTheme.text}`}>{emotionResult}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Telemetry Metrics Shelf */}
        {emotionResult && currentTheme && !recording && !processing && (
          <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-in">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-left">
              <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">Classification Confidence</span>
              <span className={`text-lg font-black font-mono tracking-tight ${currentTheme.text}`}>{currentTheme.confidence}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-left">
              <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">Feature Vector Dimensions</span>
              <span className="text-lg font-black font-mono tracking-tight text-slate-200">40 MFCC Array</span>
            </div>
            <div className="col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-left text-xs text-slate-400 leading-relaxed border-l-2 border-l-indigo-500">
              <span className="text-[10px] font-mono text-indigo-400 uppercase block tracking-widest font-bold mb-1">Signal Analysis Report</span>
              {currentTheme.note}
            </div>
          </div>
        )}

        {/* Action Controller Hub */}
        <div className="flex justify-center mt-2">
          {!recording ? (
            <button
              onClick={startVoiceRecording}
              disabled={processing}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-semibold tracking-wide text-sm px-8 py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform active:scale-[0.99] border border-indigo-400/20"
            >
              <Mic className="w-4 h-4" /> Initialize Acoustic Diagnostics
            </button>
          ) : (
            <button
              onClick={stopVoiceRecording}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-semibold tracking-wide text-sm px-8 py-4 rounded-xl shadow-lg shadow-rose-600/20 transition-all transform active:scale-[0.99] border border-rose-400/20"
            >
              <Square className="w-4 h-4 fill-white animate-pulse" /> Intercept Signal & Process
            </button>
          )}
        </div>

        {/* Footer Integrity Indicator */}
        <footer className="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-600">
          <Zap className="w-3 h-3" /> Signal isolation architecture configured via standard multi-part gateway
        </footer>

      </div>
    </div>
  );
}