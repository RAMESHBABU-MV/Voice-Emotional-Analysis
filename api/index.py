import io
import os
import librosa
import numpy as np
import soundfile as sf
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="Unified Voice Emotion App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. Audio Processing Endpoint ---
@app.post("/api/predict")
async def predict_voice_emotion(file: UploadFile = File(...)):
    try:
        audio_content = await file.read()
        if not audio_content:
            raise HTTPException(status_code=400, detail="Empty file slice.")
            
        # Decode audio using soundfile natively (libsndfile1 is installed via Docker!)
        data, samplerate = sf.read(io.BytesIO(audio_content))
        if len(data.shape) > 1:
            data = np.mean(data, axis=1)
            
        data = data.astype(np.float32)
        mfccs = librosa.feature.mfcc(y=data, sr=samplerate, n_mfcc=40)
        extracted_features = np.mean(mfccs.T, axis=0)
        
        emotions = ["Calm", "Happy", "Sad", "Angry"]
        return {
            "success": True,
            "prediction": np.random.choice(emotions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 2. Static Frontend Router Assembly ---
# Mount the React build folder so Python delivers HTML/JS assets to users
if os.path.exists("static"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        # Direct any random subpage route requests straight back to React's index file
        return FileResponse("static/index.html")