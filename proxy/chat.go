package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

// ChatMessage represents a single message in a chat history
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatPayload represents the request payload from the client
type ChatPayload struct {
	Messages []ChatMessage `json:"messages"`
	Context  string        `json:"context"`
	Model    string        `json:"model"`
}

// handleChat processes follow-up conversation history and streams the response back using SSE.
func handleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload ChatPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, "Failed to parse JSON body: "+err.Error(), http.StatusBadRequest)
		return
	}

	if len(payload.Messages) == 0 || payload.Context == "" {
		http.Error(w, "Missing required fields: 'messages' and 'context'", http.StatusBadRequest)
		return
	}

	// Validate last message is from user
	lastMsg := payload.Messages[len(payload.Messages)-1]
	if lastMsg.Role != "user" {
		http.Error(w, "The last message in history must be from the user", http.StatusBadRequest)
		return
	}

	apiKey := getGeminiAPIKey()
	if apiKey == "" {
		http.Error(w, "GEMINI_API_KEY environment variable is not set", http.StatusInternalServerError)
		return
	}

	modelType := payload.Model
	if modelType == "" {
		modelType = "flash"
	}
	modelName := resolveModel(modelType)
	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?key=%s&alt=sse", modelName, apiKey)

	systemInstruction := fmt.Sprintf(`You are a friendly Filipino plant care chatbot. The user previously scanned a plant and received a diagnosis.
The user may ask follow-up questions about treatment steps, disease prevention, watering schedules, or general care for this crop.

Use ONLY the following verified crop database as your reference:
%s

Rules:
- Stay within the scope of the 59 crops in the database.
- If the user asks about a crop or topic not in the database, politely say you can only help with the supported Philippine crops.
- Respond ONLY in clear, friendly, and helpful English. Do not use Tagalog or Taglish.
- Provide actionable, practical advice suitable for backyard farming.
- Highlight key terms (such as severity level, crop names, or specific organic treatments) by enclosing them in double asterisks, e.g., **High** or **Neem Oil**, so the application can style them in green and bold.
- Use circular bullet points (•) instead of asterisks (*) or dashes (-) when presenting lists.`, payload.Context)

	// Map to Gemini contents
	contents := make([]GeminiRequestContent, len(payload.Messages))
	for i, msg := range payload.Messages {
		role := "model"
		if msg.Role == "user" {
			role = "user"
		}
		contents[i] = GeminiRequestContent{
			Role: role,
			Parts: []GeminiRequestPart{
				{Text: msg.Content},
			},
		}
	}

	genConfig := &GenerationConfig{
		Temperature: 0.5,
	}
	// Gemma 4-31B-IT is a hybrid-thinking model; enable deep thinking and stream thought blocks to client.
	if modelType == "deep" {
		genConfig.ThinkingConfig = &ThinkingConfig{
			ThinkingLevel:   "HIGH",
			IncludeThoughts: true,
		}
	}

	geminiReq := GeminiGenerateRequest{
		Contents: contents,
		SystemInstruction: &SystemInstruction{
			Parts: []GeminiRequestPart{
				{Text: systemInstruction},
			},
		},
		GenerationConfig: genConfig,
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

	err = streamGeminiSSE(w, resp, false) // filterThoughts = false (stream thoughts as separate fields)
	if err != nil {
		log.Printf("[Chat] Error streaming Gemini response: %v\n", err)
	}
}
