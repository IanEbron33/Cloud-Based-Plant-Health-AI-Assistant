---
title: Bugsok AI
emoji: 🌿
colorFrom: green
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Bugsok AI — Go Proxy Backend


This directory contains the Go implementation of the proxy server, designed to run on Hugging Face Spaces using the Docker SDK.

## Environment Variables
- **`GEMINI_API_KEY`**: Required. Your Gemini developer API key.
- **`FLASH_MODEL`**: Optional. Defaults to `gemini-3.1-flash-lite`.
- **`DEEP_MODEL`**: Optional. Defaults to `gemma-4-31b-it`.
- **`PORT`**: Optional. Defaults to `7860` (Hugging Face default).

## Local Development
To run the server locally:
1. Navigate to this directory in your terminal.
2. Set your environment variables:
   - **Windows PowerShell**:
     ```powershell
     $env:GEMINI_API_KEY="your-api-key"
     $env:PORT="7860"
     ```
   - **Linux/macOS**:
     ```bash
     export GEMINI_API_KEY="your-api-key"
     export PORT=7860
     ```
3. Run the Go server:
   ```bash
   go run .
   ```

## Deploying to Hugging Face Spaces
1. Create a new Space on Hugging Face.
2. Select **Docker** as the SDK (with the **Blank** template).
3. Go to the Space **Settings** page and add a Secret named `GEMINI_API_KEY` with your API key.
4. Clone your Space repo, copy all files in this `proxy/` directory to it, commit, and push.
5. Hugging Face will build the image from the `Dockerfile` and start the server on port `7860`.
