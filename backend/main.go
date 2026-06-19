package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

var (
	genaiClient *genai.Client
	apiKey      string
)

type StreamChunk struct {
	Text  string `json:"text,omitempty"`
	Error string `json:"error,omitempty"`
}

type ChatMessage struct {
	Role    string `json:"role"` // "user" or "model"/"assistant"/"ai"
	Content string `json:"content"`
}

type ChatRequest struct {
	Messages []ChatMessage `json:"messages"`
	Context  string        `json:"context"`
	Model    string        `json:"model"` // "flash" or "deep"
}

func main() {
	log.Println("Starting Bugsok AI Go Proxy Server...")

	apiKey = os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("GEMINI_API_KEY environment variable is required")
	}

	ctx := context.Background()
	var err error
	genaiClient, err = genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		log.Fatalf("Failed to initialize Google GenAI client: %v", err)
	}
	defer genaiClient.Close()

	// Register Routes with CORS
	http.HandleFunc("/health", enableCORS(handleHealth))
	http.HandleFunc("/classify", enableCORS(handleClassify))
	http.HandleFunc("/diagnose", enableCORS(handleDiagnose))
	http.HandleFunc("/chat", enableCORS(handleChat))

	// Get port from environment or default to 7860 (Hugging Face default)
	port := os.Getenv("PORT")
	if port == "" {
		port = "7860"
	}

	addr := ":" + port
	log.Printf("Server is running and listening on %s", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("HTTP server failed to start: %v", err)
	}
}

// Middleware to enable Cross-Origin Resource Sharing (CORS)
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")

		// Handle CORS preflight options request
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

// /health endpoint for server monitoring
func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"time":   time.Now().Format(time.RFC3339),
	})
}

// /classify endpoint (Step 1 Classifier router)
func handleClassify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Max 10MB memory for image processing
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse multipart form: %v", err), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Image file is required in 'image' field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	imgBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read image file", http.StatusInternalServerError)
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	cropsList := r.FormValue("crops")
	if cropsList == "" {
		http.Error(w, "List of crops is required in 'crops' field", http.StatusBadRequest)
		return
	}

	modelName := os.Getenv("CLASSIFIER_MODEL")
	if modelName == "" {
		modelName = "gemini-3.1-flash-lite"
	}

	model := genaiClient.GenerativeModel(modelName)
	model.SetTemperature(0.1) // Low temperature for consistent classification

	prompt := fmt.Sprintf(`You are a high-speed agricultural routing classifier. The user has uploaded an image of a crop leaf.
Identify which crop is in the image. You must choose ONLY from the following list of supported crops:
[%s]

Respond with ONLY the exact name of the crop from the list. Do not add any punctuation, explanation, introduction, or extra text.`, cropsList)

	imgBlob := genai.Blob{
		MIMEType: mimeType,
		Data:     imgBytes,
	}

	ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
	defer cancel()

	resp, err := model.GenerateContent(ctx, imgBlob, genai.Text(prompt))
	if err != nil {
		log.Printf("GenAI classification API call error: %v", err)
		http.Error(w, fmt.Sprintf("AI classification failed: %v", err), http.StatusInternalServerError)
		return
	}

	var cropResponse string
	if len(resp.Candidates) > 0 && resp.Candidates[0].Content != nil {
		for _, part := range resp.Candidates[0].Content.Parts {
			if textPart, ok := part.(genai.Text); ok {
				cropResponse += string(textPart)
			}
		}
	}

	cleanedCrop := strings.TrimSpace(cropResponse)
	cleanedCrop = strings.Trim(cleanedCrop, `"'`)

	// Perform a fuzzy/resilient match check against the crop list
	crops := strings.Split(cropsList, ",")
	matchedCrop := ""
	for _, c := range crops {
		trimmedC := strings.TrimSpace(c)
		if strings.EqualFold(trimmedC, cleanedCrop) {
			matchedCrop = trimmedC
			break
		}
	}

	// Try substring match if no exact match
	if matchedCrop == "" {
		for _, c := range crops {
			trimmedC := strings.TrimSpace(c)
			if strings.Contains(strings.ToLower(cleanedCrop), strings.ToLower(trimmedC)) {
				matchedCrop = trimmedC
				break
			}
		}
	}

	// Fallback to the model's raw string if match failed
	if matchedCrop == "" {
		matchedCrop = cleanedCrop
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"crop": matchedCrop,
	})
}

// /diagnose endpoint (Step 3 Diagnosis model)
func handleDiagnose(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Max 20MB memory
	err := r.ParseMultipartForm(20 << 20)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse multipart form: %v", err), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Image file is required in 'image' field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	imgBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read image file", http.StatusInternalServerError)
		return
	}

	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	crop := r.FormValue("crop")
	contextJSON := r.FormValue("context")
	modelType := r.FormValue("model") // "flash" or "deep"

	if crop == "" || contextJSON == "" {
		http.Error(w, "'crop' and 'context' fields are required", http.StatusBadRequest)
		return
	}

	var modelName string
	if modelType == "deep" {
		modelName = os.Getenv("DEEP_MODEL")
		if modelName == "" {
			modelName = "gemma-4-31b-it"
		}
	} else {
		modelName = os.Getenv("FLASH_MODEL")
		if modelName == "" {
			modelName = "gemini-3.1-flash-lite"
		}
	}

	model := genaiClient.GenerativeModel(modelName)
	model.SetTemperature(0.4)

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

	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(systemInstruction)},
	}

	imgBlob := genai.Blob{
		MIMEType: mimeType,
		Data:     imgBytes,
	}

	// Set up SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Transfer-Encoding", "chunked")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	ctx := r.Context()
	iter := model.GenerateContentStream(ctx, imgBlob, genai.Text("Analyze this crop leaf image according to the system instructions."))
	for {
		resp, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Printf("Streaming error during diagnosis: %v", err)
			sendSSEError(w, flusher, fmt.Sprintf("Streaming error: %v", err))
			return
		}

		if len(resp.Candidates) > 0 && resp.Candidates[0].Content != nil {
			var chunkText string
			for _, part := range resp.Candidates[0].Content.Parts {
				if textPart, ok := part.(genai.Text); ok {
					chunkText += string(textPart)
				}
			}

			if chunkText != "" {
				sendSSEText(w, flusher, chunkText)
			}
		}
	}

	// Terminating delimiter
	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()
}

// /chat endpoint (Follow-up conversation stream)
func handleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ChatRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid JSON payload: %v", err), http.StatusBadRequest)
		return
	}

	if len(req.Messages) == 0 {
		http.Error(w, "Messages list cannot be empty", http.StatusBadRequest)
		return
	}

	lastMsg := req.Messages[len(req.Messages)-1]
	if lastMsg.Role != "user" {
		http.Error(w, "The last message in history must be from the user", http.StatusBadRequest)
		return
	}

	var modelName string
	if req.Model == "deep" {
		modelName = os.Getenv("DEEP_MODEL")
		if modelName == "" {
			modelName = "gemma-4-31b-it"
		}
	} else {
		modelName = os.Getenv("FLASH_MODEL")
		if modelName == "" {
			modelName = "gemini-3.1-flash-lite"
		}
	}

	model := genaiClient.GenerativeModel(modelName)
	model.SetTemperature(0.5)

	systemInstruction := fmt.Sprintf(`You are a friendly Filipino plant care chatbot. The user previously scanned a plant and received a diagnosis.
The user may ask follow-up questions about treatment steps, disease prevention, watering schedules, or general care for this crop.

Use ONLY the following verified crop database as your reference:
%s

Rules:
- Stay within the scope of the 59 crops in the database.
- If the user asks about a crop or topic not in the database, politely say you can only help with the supported Philippine crops.
- Use warm, encouraging Taglish when appropriate.
- Provide actionable, practical advice suitable for backyard farming.`, req.Context)

	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(systemInstruction)},
	}

	cs := model.StartChat()

	// Map conversation history
	history := make([]*genai.Content, 0, len(req.Messages)-1)
	for i := 0; i < len(req.Messages)-1; i++ {
		msg := req.Messages[i]
		role := "user"
		if msg.Role == "model" || msg.Role == "assistant" || msg.Role == "ai" {
			role = "model"
		}
		history = append(history, &genai.Content{
			Role:  role,
			Parts: []genai.Part{genai.Text(msg.Content)},
		})
	}
	cs.History = history

	// Set up SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Transfer-Encoding", "chunked")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	ctx := r.Context()
	iter := cs.SendMessageStream(ctx, genai.Text(lastMsg.Content))
	for {
		resp, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Printf("Streaming error during chat stream: %v", err)
			sendSSEError(w, flusher, fmt.Sprintf("Streaming error: %v", err))
			return
		}

		if len(resp.Candidates) > 0 && resp.Candidates[0].Content != nil {
			var chunkText string
			for _, part := range resp.Candidates[0].Content.Parts {
				if textPart, ok := part.(genai.Text); ok {
					chunkText += string(textPart)
				}
			}

			if chunkText != "" {
				sendSSEText(w, flusher, chunkText)
			}
		}
	}

	// Terminating delimiter
	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()
}

// Helpers to format and send JSON-wrapped Server-Sent Events (SSE) data
func sendSSEText(w http.ResponseWriter, flusher http.Flusher, text string) {
	chunk := StreamChunk{Text: text}
	jsonBytes, err := json.Marshal(chunk)
	if err != nil {
		log.Printf("Failed to marshal stream chunk: %v", err)
		return
	}
	fmt.Fprintf(w, "data: %s\n\n", jsonBytes)
	flusher.Flush()
}

func sendSSEError(w http.ResponseWriter, flusher http.Flusher, errMsg string) {
	chunk := StreamChunk{Error: errMsg}
	jsonBytes, err := json.Marshal(chunk)
	if err != nil {
		log.Printf("Failed to marshal error chunk: %v", err)
		return
	}
	fmt.Fprintf(w, "data: %s\n\n", jsonBytes)
	flusher.Flush()
}
