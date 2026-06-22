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
// performs classification and diagnosis in a single Gemini call, and streams the result.
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

	modelName := resolveModel(modelType)
	apiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:streamGenerateContent?key=%s&alt=sse", modelName, apiKey)

	systemInstruction := fmt.Sprintf(`You are a Filipino agricultural plant health assistant. The user has uploaded a photo of a crop leaf.

First, identify which crop is in the image. You must choose ONLY from the following list of supported crops:
[%s]

If the image does not contain a plant or crop leaf, or if the crop is not in the list of supported crops, you must respond on the first line with exactly:
CLASSIFY: NOT_A_PLANT
Do not output anything else.

If it is a supported crop, you must output on the first line:
CLASSIFY: [CropName]
(replacing [CropName] with the exact name of the crop from the list, e.g., CLASSIFY: Talong)

Starting from the second line, you must analyze the image and diagnose its health condition, grounding your response ONLY in the following verified database metadata for the identified crop:
%s

Respond in this exact format starting from the second line:
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
Mix English and Filipino naturally (Taglish) when appropriate.`, cropsList, contextJSON)

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
		GenerationConfig: &GenerationConfig{
			Temperature:     0.4,
			MaxOutputTokens: 1024,
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

	// Stream the response back, buffering the first line to parse the classification
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming is not supported by the client connection", http.StatusInternalServerError)
		return
	}

	reader := bufio.NewReader(resp.Body)
	var firstLineBuffer bytes.Buffer
	firstLineProcessed := false

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

				if !firstLineProcessed {
					firstLineBuffer.WriteString(text)
					bufStr := firstLineBuffer.String()

					// Check if we have received a full line
					if strings.Contains(bufStr, "\n") {
						parts := strings.SplitN(bufStr, "\n", 2)
						classificationHeader := strings.TrimSpace(parts[0])
						remainingText := ""
						if len(parts) > 1 {
							remainingText = parts[1]
						}

						// Parse classification header (e.g. "CLASSIFY: Talong")
						cleanedHeader := strings.TrimPrefix(classificationHeader, "CLASSIFY:")
						cleanedHeader = strings.TrimSpace(cleanedHeader)
						cleanedHeader = strings.ReplaceAll(cleanedHeader, "\"", "")
						cleanedHeader = strings.ReplaceAll(cleanedHeader, "'", "")

						// Handle non-plant rejection
						if strings.EqualFold(cleanedHeader, "NOT_A_PLANT") || strings.Contains(strings.ToLower(cleanedHeader), "not_a_plant") || cleanedHeader == "" {
							chunk := ClientStreamChunk{Error: "Unrecognized image. Please scan a supported crop leaf."}
							chunkBytes, _ := json.Marshal(chunk)
							fmt.Fprintf(w, "data: %s\n\n", string(chunkBytes))
							flusher.Flush()
							return
						}

						// Fuzzy match
						crops := strings.Split(cropsList, ",")
						for i := range crops {
							crops[i] = strings.TrimSpace(crops[i])
						}

						matchedCrop := ""
						matched := false

						// 1. Exact case-insensitive match
						for _, c := range crops {
							if strings.EqualFold(c, cleanedHeader) {
								matchedCrop = c
								matched = true
								break
							}
						}

						// 2. Substring match
						if !matched {
							for _, c := range crops {
								if strings.Contains(strings.ToLower(cleanedHeader), strings.ToLower(c)) {
									matchedCrop = c
									matched = true
									break
								}
							}
						}

						// If unmatched, reject early
						if !matched {
							chunk := ClientStreamChunk{Error: "Unrecognized image. Please scan a supported crop leaf."}
							chunkBytes, _ := json.Marshal(chunk)
							fmt.Fprintf(w, "data: %s\n\n", string(chunkBytes))
							flusher.Flush()
							return
						}

						// Send crop identified event
						chunk := ClientStreamChunk{Crop: matchedCrop}
						chunkBytes, _ := json.Marshal(chunk)
						fmt.Fprintf(w, "data: %s\n\n", string(chunkBytes))
						flusher.Flush()

						// Stream the remaining text from the buffer
						if remainingText != "" {
							textChunk := ClientStreamChunk{Text: remainingText}
							textChunkBytes, _ := json.Marshal(textChunk)
							fmt.Fprintf(w, "data: %s\n\n", string(textChunkBytes))
							flusher.Flush()
						}

						firstLineProcessed = true
					}
				} else {
					// Stream subsequent chunks directly
					chunk := ClientStreamChunk{Text: text}
					chunkBytes, _ := json.Marshal(chunk)
					fmt.Fprintf(w, "data: %s\n\n", string(chunkBytes))
					flusher.Flush()
				}
			}
		}
	}

	// Final stream completion indicator
	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()
}
