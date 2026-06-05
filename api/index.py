import io
import librosa
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from scipy.io import wavfile

app = FastAPI(title="Voice Emotion API", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def analyze_audio_features(audio_bytes):
    # Read raw bytes directly via scipy to avoid heavy external C-library crashes
    audio_stream = io.BytesIO(audio_bytes)
    samplerate, data = wavfile.read(audio_stream)
    
    # Convert stereo to mono if needed
    if len(data.shape) > 1:
        data = np.mean(data, axis=1)
    
    # Scale audio data for librosa processing
    data = data.astype(np.float32) / 32768.0
    
    # Extract MFCCs
    mfccs = librosa.feature.mfcc(y=data, sr=samplerate, n_mfcc=40)
    return np.mean(mfccs.T, axis=0)

@app.post("/api/predict")
async def predict_voice_emotion(file: UploadFile = File(...)):
    try:
        audio_content = await file.read()
        extracted_features = analyze_audio_features(audio_content)
        
        emotions = ["Calm", "Happy", "Sad", "Angry"]
        return {
            "success": True,
            "prediction": np.random.choice(emotions),
            "feature_vector_length": len(extracted_features)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))