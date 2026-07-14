package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
)

//go:embed vegetables_db.json
var vegetablesDBBytes []byte

var (
	dbMap  map[string]interface{}
	dbOnce sync.Once
	dbErr  error
)

// initDB parses the embedded JSON file once.
func initDB() error {
	dbOnce.Do(func() {
		dbMap = make(map[string]interface{})
		dbErr = json.Unmarshal(vegetablesDBBytes, &dbMap)
	})
	return dbErr
}

// getCropContext looks up the crop metadata from the embedded database.
func getCropContext(cropName string) (string, error) {
	if err := initDB(); err != nil {
		return "", fmt.Errorf("failed to initialize embedded database: %w", err)
	}

	// Try direct lookup
	cropData, exists := dbMap[cropName]
	if !exists {
		// Try case-insensitive lookup
		for k, v := range dbMap {
			if strings.EqualFold(k, cropName) {
				cropData = v
				exists = true
				break
			}
		}
	}

	if !exists {
		return "", fmt.Errorf("crop '%s' not found in database", cropName)
	}

	// Marshal the single crop's data back to JSON string
	contextBytes, err := json.Marshal(cropData)
	if err != nil {
		return "", fmt.Errorf("failed to marshal crop context: %w", err)
	}

	return string(contextBytes), nil
}

// getSupportedCrops returns all crop keys as a comma-separated string
func getSupportedCrops() string {
	if err := initDB(); err != nil {
		return ""
	}
	keys := make([]string, 0, len(dbMap))
	for k := range dbMap {
		keys = append(keys, k)
	}
	return strings.Join(keys, ",")
}
