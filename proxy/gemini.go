package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// resolveModel returns the correct Gemini model identifier based on model type ("flash" or "deep").
func resolveModel(modelType string) string {
	if modelType == "deep" {
		if envDeep := os.Getenv("DEEP_MODEL"); envDeep != "" {
			return envDeep
		}
		return "gemma-4-31b-it"
	}
	if envFlash := os.Getenv("FLASH_MODEL"); envFlash != "" {
		return envFlash
	}
	return "gemini-3.1-flash-lite"
}

// getGeminiAPIKey returns the configured Gemini API key.
func getGeminiAPIKey() string {
	return os.Getenv("GEMINI_API_KEY")
}

type GeminiPart struct {
	Text    string `json:"text"`
	Thought bool   `json:"thought,omitempty"`
}

// Gemini candidate structures for JSON parsing
type GeminiCandidate struct {
	Content struct {
		Parts []GeminiPart `json:"parts"`
	} `json:"content"`
}

type GeminiResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
}

// ClientStreamChunk matches the structure the client's api.service.ts parses
type ClientStreamChunk struct {
	Text    string `json:"text,omitempty"`
	Thought string `json:"thought,omitempty"`
	Error   string `json:"error,omitempty"`
	Crop    string `json:"crop,omitempty"`
}

// streamGeminiSSE reads SSE chunks from Gemini and writes them in the client-expected format
func streamGeminiSSE(w http.ResponseWriter, resp *http.Response, filterThoughts bool) error {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		return fmt.Errorf("streaming is not supported by the client connection")
	}

	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			return err
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
				// Ignore json unmarshal error for potential incomplete chunks
				continue
			}

			if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
				part := geminiResp.Candidates[0].Content.Parts[0]
				if part.Thought && filterThoughts {
					continue
				}

				var chunk ClientStreamChunk
				if part.Thought {
					chunk = ClientStreamChunk{Thought: part.Text}
				} else {
					if part.Text == "" {
						continue
					}
					chunk = ClientStreamChunk{Text: part.Text}
				}

				chunkBytes, err := json.Marshal(chunk)
				if err == nil {
					fmt.Fprintf(w, "data: %s\n\n", string(chunkBytes))
					flusher.Flush()
				}
			}
		}
	}

	// Final stream completion indicator
	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()
	return nil
}
type GeminiRequestPart struct {
	Text       string      `json:"text,omitempty"`
	InlineData *InlineData `json:"inlineData,omitempty"`
}

type InlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"` // Base64
}

type GeminiRequestContent struct {
	Role  string              `json:"role,omitempty"`
	Parts []GeminiRequestPart `json:"parts"`
}

type GeminiGenerateRequest struct {
	Contents          []GeminiRequestContent `json:"contents"`
	SystemInstruction *SystemInstruction     `json:"systemInstruction,omitempty"`
	GenerationConfig  *GenerationConfig      `json:"generationConfig,omitempty"`
}

type SystemInstruction struct {
	Parts []GeminiRequestPart `json:"parts"`
}

// ThinkingConfig controls the internal reasoning budget for hybrid-thinking models (e.g. Gemma 4-31B-IT).
// Setting ThinkingLevel to "MINIMAL" suppresses all thought tokens.
type ThinkingConfig struct {
	ThinkingLevel   string `json:"thinkingLevel,omitempty"`
	ThinkingBudget  int    `json:"thinkingBudget,omitempty"`
	IncludeThoughts bool   `json:"includeThoughts,omitempty"`
}

type GenerationConfig struct {
	Temperature     float64         `json:"temperature"`
	MaxOutputTokens int             `json:"maxOutputTokens,omitempty"`
	ThinkingConfig  *ThinkingConfig `json:"thinkingConfig,omitempty"`
}
