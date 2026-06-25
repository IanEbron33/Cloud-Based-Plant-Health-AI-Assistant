package main

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

// handleScan processes the image, crops list, and database context,
// performs sequential classification and diagnosis, and streams the result.
func handleScan(w http.ResponseWriter, r *http.Request) {
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

	cropsList := r.FormValue("crops")
	contextJSON := r.FormValue("context")
	modelType := r.FormValue("model")
	if modelType == "" {
		modelType = "flash"
	}

	if cropsList == "" || contextJSON == "" {
		http.Error(w, "Missing required text fields: 'crops' and 'context'", http.StatusBadRequest)
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

	// Set headers for Event-Stream
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming is not supported by the client connection", http.StatusInternalServerError)
		return
	}

	// ==========================================
	// STEP 1: Strict Classification Call (Non-Streaming)
	// ==========================================
	classifyPrompt := fmt.Sprintf(`You are a high-speed agricultural routing classifier. The user has uploaded an image of a crop leaf.
Identify which crop is in the image. You must choose ONLY from the following list of supported crops:
[%s]

If the image does not contain a plant or crop leaf, or if the crop is not in the list of supported crops, you must respond with exactly "NOT_A_PLANT".

Respond with ONLY the exact name of the crop from the list, or "NOT_A_PLANT". Do not add any punctuation, explanation, introduction, or extra text.`, cropsList)

	classifyReq := GeminiGenerateRequest{
		Contents: []GeminiRequestContent{
			{
				Parts: []GeminiRequestPart{
					{Text: classifyPrompt},
					{
						InlineData: &InlineData{
							MimeType: mimeType,
							Data:     base64Image,
						},
					},
				},
			},
		},
		GenerationConfig: &GenerationConfig{
			Temperature: 0.1,
		},
	}

	classifyBytes, err := json.Marshal(classifyReq)
	if err != nil {
		sendSSEError(w, flusher, "Failed to marshal classification request: "+err.Error())
		return
	}

	classifyURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=%s", apiKey)
	classifyResp, err := http.Post(classifyURL, "application/json", bytes.NewBuffer(classifyBytes))
	if err != nil {
		sendSSEError(w, flusher, "Failed to query classification API: "+err.Error())
		return
	}
	defer classifyResp.Body.Close()

	if classifyResp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(classifyResp.Body)
		sendSSEError(w, flusher, fmt.Sprintf("Classification API error (HTTP %d): %s", classifyResp.StatusCode, string(respBytes)))
		return
	}

	var geminiClassifyResp GeminiResponse
	if err := json.NewDecoder(classifyResp.Body).Decode(&geminiClassifyResp); err != nil {
		sendSSEError(w, flusher, "Failed to decode classification response: "+err.Error())
		return
	}

	cleanedCrop := ""
	if len(geminiClassifyResp.Candidates) > 0 && len(geminiClassifyResp.Candidates[0].Content.Parts) > 0 {
		cleanedCrop = strings.TrimSpace(geminiClassifyResp.Candidates[0].Content.Parts[0].Text)
		cleanedCrop = strings.ReplaceAll(cleanedCrop, "\"", "")
		cleanedCrop = strings.ReplaceAll(cleanedCrop, "'", "")
	}
	cleanedCrop = strings.TrimSpace(cleanedCrop)

	// Check if NOT_A_PLANT early
	if strings.EqualFold(cleanedCrop, "NOT_A_PLANT") || strings.Contains(strings.ToLower(cleanedCrop), "not_a_plant") || cleanedCrop == "" {
		sendSSERejection(w, flusher)
		return
	}

	// Fuzzy match against supported crops
	crops := strings.Split(cropsList, ",")
	for i := range crops {
		crops[i] = strings.TrimSpace(crops[i])
	}

	matchedCrop := ""
	matched := false

	// Exact case-insensitive match
	for _, c := range crops {
		if strings.EqualFold(c, cleanedCrop) {
			matchedCrop = c
			matched = true
			break
		}
	}

	// Substring match
	if !matched {
		for _, c := range crops {
			if strings.Contains(strings.ToLower(cleanedCrop), strings.ToLower(c)) {
				matchedCrop = c
				matched = true
				break
			}
		}
	}

	// If unmatched, reject early
	if !matched {
		sendSSERejection(w, flusher)
		return
	}

	// ==========================================
	// STEP 2: Stream Crop Identification to Client
	// ==========================================
	cropChunk := ClientStreamChunk{Crop: matchedCrop}
	cropChunkBytes, _ := json.Marshal(cropChunk)
	fmt.Fprintf(w, "data: %s\n\n", string(cropChunkBytes))
	flusher.Flush()

	// ==========================================
	// STEP 3: Streaming Diagnosis Call
	// ==========================================
	systemInstruction := fmt.Sprintf(`You are a Filipino agricultural plant health assistant. The user has uploaded a photo of a %s leaf.

You must analyze the image and diagnose its health condition, grounding your response ONLY in the following verified database metadata for the identified crop:
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
Mix English and Filipino naturally (Taglish) when appropriate.`, matchedCrop, contextJSON)

	modelName := resolveModel(modelType)
	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?key=%s&alt=sse", modelName, apiKey)

	genConfig := &GenerationConfig{
		Temperature:     0.4,
		MaxOutputTokens: 1024,
	}
	// Gemma 4-31B-IT is a hybrid-thinking model; set thinkingLevel="MINIMAL"
	// to prevent internal <think> reasoning tokens from leaking into the response.
	if modelType == "deep" {
		genConfig.ThinkingConfig = &ThinkingConfig{ThinkingLevel: "MINIMAL"}
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

	reqBytes, err := json.Marshal(geminiReq)
	if err != nil {
		sendSSEError(w, flusher, "Failed to build diagnosis request: "+err.Error())
		return
	}

	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(reqBytes))
	if err != nil {
		sendSSEError(w, flusher, "Failed to query Gemini API: "+err.Error())
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(resp.Body)
		sendSSEError(w, flusher, fmt.Sprintf("Gemini API error (HTTP %d): %s", resp.StatusCode, string(respBytes)))
		return
	}

	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			log.Printf("[Scan] Error reading from Gemini stream: %v\n", err)
			break
		}

		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		if strings.HasPrefix(trimmed, "data: ") {
			dataStr := strings.TrimPrefix(trimmed, "data: ")
			dataStr = strings.TrimSpace(dataStr)

			if dataStr == "[DONE]" {
				continue
			}

			var geminiResp GeminiResponse
			if err := json.Unmarshal([]byte(dataStr), &geminiResp); err != nil {
				continue
			}

			if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
				text := geminiResp.Candidates[0].Content.Parts[0].Text
				if text == "" {
					continue
				}

				chunk := ClientStreamChunk{Text: text}
				chunkBytes, _ := json.Marshal(chunk)
				fmt.Fprintf(w, "data: %s\n\n", string(chunkBytes))
				flusher.Flush()
			}
		}
	}

	// Final stream completion indicator
	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()
}

func sendSSEError(w http.ResponseWriter, flusher http.Flusher, msg string) {
	chunk := ClientStreamChunk{Error: msg}
	chunkBytes, _ := json.Marshal(chunk)
	fmt.Fprintf(w, "data: %s\n\n", string(chunkBytes))
	flusher.Flush()
}

func sendSSERejection(w http.ResponseWriter, flusher http.Flusher) {
	chunk := ClientStreamChunk{Error: "Unrecognized image. Please scan a supported crop leaf."}
	chunkBytes, _ := json.Marshal(chunk)
	fmt.Fprintf(w, "data: %s\n\n", string(chunkBytes))
	flusher.Flush()
}
