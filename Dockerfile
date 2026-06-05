# --- Step 1: Build the React Frontend ---
FROM node:18-alpine AS frontend-builder
WORKDIR /
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Step 2: Build the Python Backend & Combine ---
FROM python:3.11-slim
WORKDIR /app

# Install system audio utilities required by librosa and soundfile natively
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Python API code
COPY api/ ./api/

# Copy the compiled React frontend static assets from Step 1 into a backend directory
COPY --from=frontend-builder /app/frontend/dist ./static

# Run the backend server on the port assigned dynamically by the host platform
CMD ["sh", "-c", "uvicorn api.index:app --host 0.0.0.0 --port ${PORT:-8000}"]