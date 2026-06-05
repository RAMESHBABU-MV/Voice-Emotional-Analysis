import io
import librosa
import numpy as np
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Voice Emotion API", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def analyze_audio_features(audio_bytes):
    # Decode audio bytes regardless of browser container format (.webm, .wav, .ogg)
    data, samplerate = sf.read(io.BytesIO(audio_bytes))
    
    # Convert stereo to mono if needed
    if len(data.shape) > 1:
        data = np.mean(data, axis=1)
        
    data = data.astype(np.float32)
    
    # Extract MFCCs
    mfccs = librosa.feature.mfcc(y=data, sr=samplerate, n_mfcc=40)
    
    # Compress time frames into a 1D vector (40 elements)
    mean_mfccs = np.mean(mfccs.T, axis=0)
    return mean_mfccs

@app.post("/api/predict")
async def predict_voice_emotion(file: UploadFile = File(...)):
    try:
        audio_content = await file.read()
        if not audio_content:
            raise HTTPException(status_code=400, detail="Audio file empty.")
            
        extracted_features = analyze_audio_features(audio_content)
        
        # Simulated ML Inference gateway mapping
        emotions = ["Calm", "Happy", "Sad", "Angry"]
        simulated_prediction = np.random.choice(emotions)
        
        return {
            "success": True,
            "prediction": simulated_prediction,
            "feature_vector_length": len(extracted_features)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Acoustic analysis failed: {str(e)}")