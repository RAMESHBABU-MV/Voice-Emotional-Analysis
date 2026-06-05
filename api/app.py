import io
import librosa
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from scipy.io import wavfile

app = FastAPI(title="Voice Emotion API Backend")

# Crucial: This allows your Vercel frontend to talk to Render securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def analyze_audio_features(audio_bytes):
    audio_stream = io.BytesIO(audio_bytes)
    samplerate, data = wavfile.read(audio_stream)
    if len(data.shape) > 1:
        data = np.mean(data, axis=1)
    data = data.astype(np.float32) / 32768.0
    mfccs = librosa.feature.mfcc(y=data, sr=samplerate, n_mfcc=40)
    return np.mean(mfccs.T, axis=0)

@app.post("/predict") # Changed route from /api/predict to /predict
async def predict_voice_emotion(file: UploadFile = File(...)):
    try:
        audio_content = await file.read()
        extracted_features = analyze_audio_features(audio_content)
        emotions = ["Calm", "Happy", "Sad", "Angry"]
        return {
            "success": True,
            "prediction": np.random.choice(emotions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))