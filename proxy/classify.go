package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// ClassifyResponse is the structure returned to the client
type ClassifyResponse struct {
	Crop    string `json:"crop"`
	Matched bool   `json:"matched"`
}

// handleClassify parses the crop image and lists, calls Gemini API to identify the crop, and returns it.
func handleClassify(w http.ResponseWriter, r *http.Request) {
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
	if cropsList == "" {
		http.Error(w, "Missing required text field: 'crops'", http.StatusBadRequest)
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

	// For classification endpoint, gemini-3.1-flash-lite is hardcoded as requested
	modelName := "gemini-3.1-flash-lite"
	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelName, apiKey)

	prompt := fmt.Sprintf(`You are a high-speed agricultural routing classifier. The user has uploaded an image of a crop leaf.
Identify which crop is in the image. You must choose ONLY from the following list of supported crops:
[%s]

Respond with ONLY the exact name of the crop from the list. Do not add any punctuation, explanation, introduction, or extra text.`, cropsList)

	geminiReq := GeminiGenerateRequest{
		Contents: []GeminiRequestContent{
			{
				Parts: []GeminiRequestPart{
					{Text: prompt},
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

	var geminiResp GeminiResponse
	err = json.NewDecoder(resp.Body).Decode(&geminiResp)
	if err != nil {
		http.Error(w, "Failed to decode Gemini response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	cleanedCrop := ""
	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		cleanedCrop = strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)
		cleanedCrop = strings.ReplaceAll(cleanedCrop, "\"", "")
		cleanedCrop = strings.ReplaceAll(cleanedCrop, "'", "")
	}

	// Fuzzy matching
	crops := strings.Split(cropsList, ",")
	for i := range crops {
		crops[i] = strings.TrimSpace(crops[i])
	}

	matchedCrop := ""
	matched := false

	// 1. Exact case-insensitive match
	for _, c := range crops {
		if strings.EqualFold(c, cleanedCrop) {
			matchedCrop = c
			matched = true
			break
		}
	}

	// 2. Substring match
	if !matched {
		for _, c := range crops {
			if strings.Contains(strings.ToLower(cleanedCrop), strings.ToLower(c)) {
				matchedCrop = c
				matched = true
				break
			}
		}
	}

	// 3. Fallback
	if !matched {
		matchedCrop = cleanedCrop
	}

	res := ClassifyResponse{
		Crop:    matchedCrop,
		Matched: matched,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}
