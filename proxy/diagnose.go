package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

// handleDiagnose processes the crop image, database context, and model type, then streams an SSE response from Gemini.
func handleDiagnose(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form (10MB limit)
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "Failed to parse multipart form: "+err.Error(), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Missing required file field: 'image'", http.StatusBadRequest)
		return
	}
	defer file.Close()

	crop := r.FormValue("crop")
	contextJSON := r.FormValue("context")
	modelType := r.FormValue("model")
	if modelType == "" {
		modelType = "flash"
	}

	if crop == "" || contextJSON == "" {
		http.Error(w, "Missing required text fields: 'crop' and 'context'", http.StatusBadRequest)
		return
	}

	// Read file bytes
	var buf bytes.Buffer
	_, err = io.Copy(&buf, file)
	if err != nil {
		http.Error(w, "Failed to read image file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	base64Image := base64.StdEncoding.EncodeToString(buf.Bytes())

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	apiKey := getGeminiAPIKey()
	if apiKey == "" {
		http.Error(w, "GEMINI_API_KEY environment variable is not set", http.StatusInternalServerError)
		return
	}

	modelName := resolveModel(modelType)
	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?key=%s&alt=sse", modelName, apiKey)

	systemInstruction := fmt.Sprintf(`You are a Filipino agricultural plant health assistant. The user has uploaded a photo of a %s leaf.
Analyze the image and diagnose its health condition.

You must ground your response ONLY in the following verified database metadata for %s:
%s

Respond in this exact format:
- **Crop Identified:** [Local Name] ([Scientific Name])
- **Condition:** [Condition Name — bilingual]
- **Severity:** [Level]
- **Health Score:** [Provide a dynamic estimated health percentage from 0%% to 100%% based on visual leaf decay and diagnostic severity]%%
- **Confidence Score:** [Provide a dynamic confidence score from 0%% to 100%% indicating how certain you are of this diagnosis based on image clarity, leaf symptom visibility, and similarity to database descriptions]%%
- **Symptoms Observed:** [What you see in the image matching the database]
- **Organic Treatment:** [From database]
- **Prevention:** [From database]
- **Care Tip:** [A friendly, localized tip]

Keep your language warm, supportive, and accessible to Filipino farmers.
Mix English and Filipino naturally (Taglish) when appropriate.`, crop, crop, contextJSON)

	genConfig := &GenerationConfig{
		Temperature: 0.4,
	}

	geminiReq := GeminiGenerateRequest{
		Contents: []GeminiRequestContent{
			{
				Parts: []GeminiRequestPart{
					{Text: "Analyze this crop leaf image according to the system instructions."},
					{
						InlineData: &InlineData{
							MimeType: mimeType,
							Data:     base64Image,
						},
					},
				},
			},
		},
		SystemInstruction: &SystemInstruction{
			Parts: []GeminiRequestPart{
				{Text: systemInstruction},
			},
		},
		GenerationConfig: genConfig,
	}
	// Gemma 4-31B-IT is a hybrid-thinking model; set thinkingLevel="MINIMAL"
	// to prevent internal <think> reasoning tokens from leaking into the response.
	if modelType == "deep" {
		geminiReq.ThinkingConfig = &ThinkingConfig{ThinkingLevel: "MINIMAL"}
	}

	reqBytes, err := json.Marshal(geminiReq)
	if err != nil {
		http.Error(w, "Failed to build request: "+err.Error(), http.StatusInternalServerError)
		return
	}

	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(reqBytes))
	if err != nil {
		http.Error(w, "Failed to query Gemini API: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(resp.Body)
		http.Error(w, fmt.Sprintf("Gemini API error (HTTP %d): %s", resp.StatusCode, string(respBytes)), http.StatusBadGateway)
		return
	}

	err = streamGeminiSSE(w, resp)
	if err != nil {
		log.Printf("[Diagnose] Error streaming Gemini response: %v\n", err)
	}
}
