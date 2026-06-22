package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

// corsMiddleware wraps endpoints to handle CORS and OPTIONS preflight requests
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type, accept")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

// handleHealth returns a simple JSON health status check
func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "healthy",
		"time":   time.Now().Format(time.RFC3339),
	})
}

func main() {
	// Check API key configuration
	apiKey := getGeminiAPIKey()
	if apiKey == "" {
		log.Println("[Warning] GEMINI_API_KEY environment variable is not set. API calls will fail.")
	}

	mux := http.NewServeMux()

	// Endpoints setup matching previous proxy structure
	mux.HandleFunc("/", corsMiddleware(handleHealth))
	mux.HandleFunc("/health", corsMiddleware(handleHealth))
	mux.HandleFunc("/classify", corsMiddleware(handleClassify))
	mux.HandleFunc("/diagnose", corsMiddleware(handleDiagnose))
	mux.HandleFunc("/scan", corsMiddleware(handleScan))
	mux.HandleFunc("/chat", corsMiddleware(handleChat))

	port := os.Getenv("PORT")
	if port == "" {
		port = "7860" // Standard Hugging Face Space listening port
	}

	log.Printf("Bugsok AI Go Proxy listening on port %s...\n", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
