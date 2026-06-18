# Bugsok AI — Go Proxy Backend

This is the lightweight Go-based proxy server for **Bugsok AI — Plant Health Tracker**. It acts as a secure intermediary between the mobile client and the Google Gemini APIs, securing sensitive API keys and managing Server-Sent Events (SSE) streaming responses.

---

## 🛠️ Architecture & Features

1. **API Key Security**: The React Native application communicates only with this proxy. The Gemini API keys are injected via secure environment variables in Google Cloud Run.
2. **High-Speed Classifier Route (`/classify`)**: Automatically classifies the crop leaf using `gemini-3.1-flash-lite` (or custom classifier) based on a fuzzy-matching, dynamic crop routing.
3. **Chunk-by-Chunk SSE Stream (`/diagnose` & `/chat`)**: Streams response tokens in real-time. Since it's deployed to Cloud Run, connections remain open without serverless timeout limitations.
4. **CORS Configured**: Pre-configured CORS headers allow direct client requests from mobile simulators, web previews, and production releases.

---

## ⚙️ Environment Variables

The server relies on the following environment variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | **Yes** | — | Your Google AI Studio API Key. |
| `PORT` | No | `7860` | Port that the HTTP server will bind to. |
| `CLASSIFIER_MODEL`| No | `gemini-3.1-flash-lite` | Gemini model ID used for Step 1 crop classification. |
| `FLASH_MODEL` | No | `gemini-3.1-flash-lite` | Gemini model ID used for ⚡ Flash mode diagnosis. |
| `DEEP_MODEL` | No | `gemma-4-31b` | Model ID used for 🧠 Deep Thinking mode diagnosis. |

---

## 🚀 Running Locally

If Go is installed on your local development system, run:

```bash
# 1. Set environment variables
$env:GEMINI_API_KEY="your-api-key-here"

# 2. Run the application
go run main.go
```

If you have Docker installed:

```bash
# 1. Build the docker container
docker build -t bugsok-proxy .

# 2. Run the container
docker run -p 7860:7860 -e GEMINI_API_KEY="your-api-key-here" bugsok-proxy
```

---

## ☁️ Google Cloud Run Deployment

Google Cloud Run allows deploying the container from source code directly. This uses Google Cloud Build to compile the Docker container in the cloud:

```bash
# Deploy directly from source
gcloud run deploy bugsok-proxy \
  --source . \
  --region asia-east1 \
  --set-env-vars="GEMINI_API_KEY=your_gemini_api_key_here" \
  --allow-unauthenticated
```

---

## 📡 API Endpoints

### 1. `GET /health`
A simple check to verify server status.
* **Response:**
  ```json
  {
    "status": "healthy",
    "time": "2026-06-18T22:28:00+08:00"
  }
  ```

### 2. `POST /classify`
Identifies the crop from a leaf photo using a fuzzy-matcher on the provided crop list.
* **Headers**: `Content-Type: multipart/form-data`
* **Body Form Parameters**:
  * `image`: Binary image file (JPEG, PNG).
  * `crops`: Comma-separated crop names (e.g., `Talong,Kamatis,Sili`).
* **Response:**
  ```json
  {
    "crop": "Talong"
  }
  ```

### 3. `POST /diagnose`
Diagnoses the crop condition using the selected model and streams the Markdown text response using Server-Sent Events (SSE).
* **Headers**: `Content-Type: multipart/form-data`
* **Body Form Parameters**:
  * `image`: Binary image file.
  * `crop`: Crop name (e.g., `Talong`).
  * `context`: Grounded JSON context string from `vegetables_db.json`.
  * `model`: Model type (`flash` or `deep`).
* **Response (Event Stream)**:
  * Emits chunks of JSON data: `data: {"text": "chunk text"}\n\n`
  * Emits `data: [DONE]\n\n` when completed.

### 4. `POST /chat`
Follow-up conversational chat helper with the diagnostic assistant. Maintains conversation history and streams the response.
* **Headers**: `Content-Type: application/json`
* **Request JSON Body**:
  ```json
  {
    "messages": [
      { "role": "user", "content": "Paano maiwasan ang Bacterial Wilt sa talong?" },
      { "role": "model", "content": "Para maiwasan ito..." },
      { "role": "user", "content": "Mabisa ba ang crop rotation?" }
    ],
    "context": "{...grounded metadata for Talong...}",
    "model": "flash"
  }
  ```
* **Response (Event Stream)**:
  * Emits chunks of JSON data: `data: {"text": "chunk text"}\n\n`
  * Emits `data: [DONE]\n\n` when completed.
