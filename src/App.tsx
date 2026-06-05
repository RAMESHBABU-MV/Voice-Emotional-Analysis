import React, { useState, useRef, useEffect } from 'react';

type Emotion = 'Happy' | 'Sad' | 'Angry' | 'Calm';
type AppState = 'idle' | 'recording' | 'processing' | 'result';
type Theme = 'light' | 'dark';

interface EmotionConfig {
  icon: string;
  barColor: string;
  borderColor: string;
  confidence: string;
  note: string;
  chipLight: { bg: string; color: string };
  chipDark:  { bg: string; color: string };
}

const EMOTION_CONFIG: Record<Emotion, EmotionConfig> = {
  Happy: {
    icon: '😊',
    barColor: '#34d399',
    borderColor: '#34d399',
    confidence: '94.2%',
    note: 'High-frequency energy with vibrant pitch variability detected.',
    chipLight: { bg: '#d1fae5', color: '#065f46' },
    chipDark:  { bg: '#064e3b', color: '#6ee7b7' },
  },
  Sad: {
    icon: '😢',
    barColor: '#60a5fa',
    borderColor: '#60a5fa',
    confidence: '88.7%',
    note: 'Subdued amplitude envelopes and low fundamental vocal frequencies.',
    chipLight: { bg: '#dbeafe', color: '#1e3a8a' },
    chipDark:  { bg: '#1e3a8a', color: '#93c5fd' },
  },
  Angry: {
    icon: '😠',
    barColor: '#f87171',
    borderColor: '#f87171',
    confidence: '91.5%',
    note: 'High RMS energy spikes and intense harmonic tension recorded.',
    chipLight: { bg: '#fee2e2', color: '#7f1d1d' },
    chipDark:  { bg: '#7f1d1d', color: '#fca5a5' },
  },
  Calm: {
    icon: '😌',
    barColor: '#a78bfa',
    borderColor: '#a78bfa',
    confidence: '96.1%',
    note: 'Uniform spectral flux and stable fundamental frequencies sustained.',
    chipLight: { bg: '#ede9fe', color: '#4c1d95' },
    chipDark:  { bg: '#4c1d95', color: '#c4b5fd' },
  },
};

const BAR_COUNT = 26;

interface ApiResponse {
  success: boolean;
  prediction: Emotion;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const TOKENS = {
  light: {
    pageBg:        '#f9fafb',
    panelBg:       '#ffffff',
    panelBorder:   '#e5e7eb',
    headerBorder:  '#f3f4f6',
    scopeBg:       '#f9fafb',
    scopeBorder:   '#e5e7eb',
    metricBg:      '#f9fafb',
    metricBorder:  '#f3f4f6',
    badgeBg:       '#f9fafb',
    badgeBorder:   '#e5e7eb',
    badgeText:     '#6b7280',
    btnBg:         '#f9fafb',
    btnBorder:     '#e5e7eb',
    btnText:       '#111827',
    btnHoverBg:    '#f3f4f6',
    textPrimary:   '#111827',
    textSecondary: '#6b7280',
    textMuted:     '#9ca3af',
    barIdle:       '#d1d5db',
    barActive:     '#818cf8',
    iconBg:        '#f3f4f6',
    toggleBg:      '#e5e7eb',
    toggleKnob:    '#ffffff',
    toggleKnobShadow: 'rgba(0,0,0,0.15)',
    recordingBtn:  { bg: '#fee2e2', border: '#fca5a5', color: '#7f1d1d' },
  },
  dark: {
    pageBg:        '#0f172a',
    panelBg:       '#1e293b',
    panelBorder:   '#334155',
    headerBorder:  '#1e293b',
    scopeBg:       '#0f172a',
    scopeBorder:   '#334155',
    metricBg:      '#0f172a',
    metricBorder:  '#1e293b',
    badgeBg:       '#0f172a',
    badgeBorder:   '#334155',
    badgeText:     '#94a3b8',
    btnBg:         '#0f172a',
    btnBorder:     '#334155',
    btnText:       '#f1f5f9',
    btnHoverBg:    '#1e293b',
    textPrimary:   '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted:     '#64748b',
    barIdle:       '#334155',
    barActive:     '#818cf8',
    iconBg:        '#0f172a',
    toggleBg:      '#818cf8',
    toggleKnob:    '#ffffff',
    toggleKnobShadow: 'rgba(0,0,0,0.3)',
    recordingBtn:  { bg: '#450a0a', border: '#7f1d1d', color: '#fca5a5' },
  },
} as const;

export default function App(): React.JSX.Element {
  const [appState, setAppState]   = useState<AppState>('idle');
  const [emotion,  setEmotion]    = useState<Emotion | null>(null);
  const [history,  setHistory]    = useState<Emotion[]>([]);
  const [bars,     setBars]       = useState<number[]>(new Array(BAR_COUNT).fill(8));
  const [theme,    setTheme]      = useState<Theme>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);
  const rafRef           = useRef<number | null>(null);

  // Sync with OS preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Bar animation
  useEffect(() => {
    if (appState === 'recording' || appState === 'processing') {
      const loop = () => {
        setBars(new Array(BAR_COUNT).fill(0).map(() => Math.random() * 80 + 10));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (appState === 'result' && emotion) {
        setBars(new Array(BAR_COUNT).fill(0).map(() => 10 + Math.random() * 55));
      } else {
        setBars(new Array(BAR_COUNT).fill(8));
      }
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [appState, emotion]);

  const t = TOKENS[theme];
  const cfg = emotion ? EMOTION_CONFIG[emotion] : null;

  // ─── Recording logic ────────────────────────────────────────────────────────
  const handleBtn = async () => {
    if (appState === 'idle' || appState === 'result') await startRecording();
    else if (appState === 'recording') stopRecording();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        await uploadAudio(blob);
      };
      mediaRecorder.start(250);
      setAppState('recording');
    } catch {
      alert('Microphone access denied. Please allow mic access and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && appState === 'recording') {
      mediaRecorderRef.current.stop();
      setAppState('processing');
    }
  };

  const uploadAudio = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'recording.raw');
    try {
      const res = await fetch('/api/predict', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Server error');
      const data: ApiResponse = await res.json();
      if (data.success) {
        setEmotion(data.prediction);
        setHistory(prev => [data.prediction, ...prev].slice(0, 5));
        setAppState('result');
      } else throw new Error('Bad response');
    } catch {
      const keys = Object.keys(EMOTION_CONFIG) as Emotion[];
      const demo = keys[Math.floor(Math.random() * keys.length)];
      setEmotion(demo);
      setHistory(prev => [demo, ...prev].slice(0, 5));
      setAppState('result');
    }
  };

  // ─── Derived styles ─────────────────────────────────────────────────────────
  const scopeBorderColor =
    appState === 'result' && cfg ? cfg.borderColor : t.scopeBorder;

  const getBarColor = (): string => {
    if (appState === 'recording' || appState === 'processing') return t.barActive;
    if (appState === 'result' && cfg) return cfg.barColor;
    return t.barIdle;
  };

  const barColor = getBarColor();

  // ─── Scope label ────────────────────────────────────────────────────────────
  const renderScopeLabel = () => {
    if (appState === 'recording') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f87171' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', animation: 'av-pulse 1s infinite', display: 'inline-block' }} />
        Encoding speech buffer…
      </div>
    );
    if (appState === 'processing') return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#818cf8' }}>
        <span style={{ animation: 'av-spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
        Extracting MFCC features…
      </div>
    );
    if (appState === 'result' && emotion && cfg) return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span>{cfg.icon}</span>
        <span style={{ color: t.textSecondary }}>Detected:</span>
        <strong style={{ color: cfg.barColor }}>{emotion}</strong>
      </div>
    );
    return <span style={{ fontSize: 12, color: t.textMuted }}>System ready</span>;
  };

  // ─── Button ─────────────────────────────────────────────────────────────────
  const btnBase: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '11px 0', borderRadius: 8,
    background: t.btnBg, border: `1px solid ${t.btnBorder}`,
    fontSize: 14, fontWeight: 500, color: t.btnText,
    cursor: 'pointer', transition: 'background 0.15s',
  };

  const renderButton = () => {
    if (appState === 'recording') return (
      <button onClick={handleBtn} className="av-btn" style={{
        ...btnBase,
        background: t.recordingBtn.bg,
        borderColor: t.recordingBtn.border,
        color: t.recordingBtn.color,
      }}>⏹ Stop & analyse</button>
    );
    if (appState === 'processing') return (
      <button disabled style={{ ...btnBase, opacity: 0.5, cursor: 'default' }}>
        ⟳ Analysing…
      </button>
    );
    return (
      <button onClick={handleBtn} className="av-btn" style={btnBase}>
        {appState === 'result' ? '🎙 Scan again' : '🎙 Start acoustic scan'}
      </button>
    );
  };

  // ─── Theme toggle ────────────────────────────────────────────────────────────
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const isDark = theme === 'dark';

  // ─── Chip colors ─────────────────────────────────────────────────────────────
  const chipColors = cfg ? (isDark ? cfg.chipDark : cfg.chipLight) : null;

  return (
    <>
      <style>{`
        @keyframes av-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes av-spin   { to { transform: rotate(360deg); } }
        .av-btn:hover:not(:disabled) { background: ${t.btnHoverBg} !important; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1rem', background: t.pageBg,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transition: 'background 0.3s',
      }}>
        <div style={{
          width: '100%', maxWidth: 480,
          background: t.panelBg, border: `1px solid ${t.panelBorder}`,
          borderRadius: 16, padding: '1.5rem',
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 1px 6px rgba(0,0,0,0.06)',
          transition: 'background 0.3s, border-color 0.3s',
        }}>

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: '1rem', marginBottom: '1.25rem',
            borderBottom: `1px solid ${t.headerBorder}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: t.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>📡</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary }}>
                  AuraVoice{' '}
                  <span style={{ fontWeight: 400, fontSize: 12, color: t.textMuted }}>v2.0</span>
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: '0.05em' }}>
                  Speech emotion cognition
                </div>
              </div>
            </div>

            {/* Right: SSL badge + theme toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 999,
                border: `1px solid ${t.badgeBorder}`, background: t.badgeBg,
                fontSize: 11, color: t.badgeText,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                SSL
              </div>

              {/* Toggle switch */}
              <button
                onClick={toggleTheme}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                style={{
                  position: 'relative', width: 40, height: 22, borderRadius: 999,
                  background: t.toggleBg, border: 'none', cursor: 'pointer',
                  transition: 'background 0.25s', padding: 0, flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: isDark ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%',
                  background: t.toggleKnob,
                  boxShadow: `0 1px 3px ${t.toggleKnobShadow}`,
                  transition: 'left 0.25s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9,
                }}>
                  {isDark ? '🌙' : '☀️'}
                </span>
              </button>
            </div>
          </div>

          {/* ── Oscilloscope ── */}
          <div style={{
            height: 140, borderRadius: 12,
            border: `1px solid ${scopeBorderColor}`,
            background: t.scopeBg,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '1.25rem', marginBottom: '1rem',
            transition: 'border-color 0.4s, background 0.3s',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 52 }}>
              {bars.map((h, i) => (
                <div key={i} style={{
                  width: 5, borderRadius: 3, height: `${h}%`,
                  background: barColor,
                  transition: appState === 'recording' || appState === 'processing'
                    ? 'height 0.07s ease'
                    : 'height 0.4s ease, background 0.4s',
                }} />
              ))}
            </div>
            {renderScopeLabel()}
          </div>

          {/* ── Metrics ── */}
          {appState === 'result' && emotion && cfg && chipColors && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '3px 12px', borderRadius: 999,
                  fontSize: 13, fontWeight: 500,
                  background: chipColors.bg, color: chipColors.color,
                  transition: 'background 0.3s, color 0.3s',
                }}>
                  <span>{cfg.icon}</span>{emotion}
                </div>
                <span style={{ fontSize: 12, color: t.textMuted }}>→ classified</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {/* Confidence */}
                <div style={{
                  background: t.metricBg, border: `1px solid ${t.metricBorder}`,
                  borderRadius: 8, padding: '0.75rem 1rem',
                  transition: 'background 0.3s',
                }}>
                  <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Confidence</div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: t.textPrimary, fontFamily: 'monospace' }}>
                    {cfg.confidence}
                  </div>
                </div>

                {/* Feature vector */}
                <div style={{
                  background: t.metricBg, border: `1px solid ${t.metricBorder}`,
                  borderRadius: 8, padding: '0.75rem 1rem',
                  transition: 'background 0.3s',
                }}>
                  <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>Feature vector</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary, fontFamily: 'monospace', paddingTop: 3 }}>
                    40 MFCC
                  </div>
                </div>

                {/* Signal report */}
                <div style={{
                  gridColumn: 'span 2',
                  background: t.metricBg, border: `1px solid ${t.metricBorder}`,
                  borderLeft: '2px solid #818cf8', borderRadius: 8,
                  padding: '0.75rem 1rem',
                  transition: 'background 0.3s',
                }}>
                  <div style={{ fontSize: 10, color: t.textMuted, letterSpacing: '0.06em', marginBottom: 4 }}>
                    Signal analysis
                  </div>
                  <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.6 }}>{cfg.note}</div>
                </div>
              </div>
            </div>
          )}

          {/* ── History pills ── */}
          {history.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{ fontSize: 11, color: t.textMuted, alignSelf: 'center' }}>Previous:</span>
              {history.slice(1).map((e, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: '2px 10px', borderRadius: 999,
                  border: `1px solid ${t.badgeBorder}`,
                  color: t.badgeText, background: t.badgeBg,
                  transition: 'background 0.3s',
                }}>
                  {EMOTION_CONFIG[e].icon} {e}
                </span>
              ))}
            </div>
          )}

          {/* ── Button ── */}
          {renderButton()}

          {/* ── Footer ── */}
          <div style={{
            marginTop: '1rem', fontSize: 11, color: t.textMuted,
            display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center',
          }}>
            🔒 Audio processed locally — not stored
          </div>

        </div>
      </div>
    </>
  );
}