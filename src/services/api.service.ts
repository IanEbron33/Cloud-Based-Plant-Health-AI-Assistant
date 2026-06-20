/**
 * Bugsok AI — API Service
 *
 * This service handles all communication with the Go Proxy backend
 * hosted on Hugging Face Spaces for AI classification, diagnosis, and chat.
 *
 * Endpoints:
 *   POST /classify  — Identify crop type from a leaf image
 *   POST /diagnose  — Get full AI diagnosis with SSE streaming
 *   POST /chat      — Follow-up chat conversation with SSE streaming
 *
 * @see backend/main.go for the server-side implementation.
 */

import type { ChatMessage, ClassifyResponse, StreamChunk } from '../types';
import vegetablesDb from '../../assets/data/vegetables_db.json';

// Types for the vegetables database JSON import structure
interface DatabaseCrop {
  local_name: string;
  scientific_name: string;
  category: string;
  ecological_status: string;
  watering_needs: {
    frequency: string;
    description: string;
  };
  description: string;
  habitat_ecology: string;
  uses: string;
  health_statuses: {
    [key: string]: {
      condition_name: string;
      symptoms: string;
      severity: string;
      organic_treatment: string;
      preventive_measures: string;
    };
  };
}

const db = vegetablesDb as Record<string, DatabaseCrop>;

/** Base URL for the Go Proxy backend on Hugging Face Spaces. */
const PROXY_BASE_URL = process.env.EXPO_PUBLIC_PROXY_URL || '';

/** Flag to enable offline simulation in development if proxy URL is missing. */
const USE_MOCK = __DEV__ && !PROXY_BASE_URL;

/**
 * Step 1 — Classify the crop from a leaf image.
 * Sends the image to the /classify endpoint and returns the identified crop name.
 *
 * @param imageUri - Local URI of the captured/selected image.
 * @param crops - Comma-separated list of supported crop names.
 * @returns The classified crop name.
 */
export const classifyCrop = async (
  imageUri: string,
  crops: string,
  model: 'flash' | 'deep'
): Promise<ClassifyResponse> => {
  if (USE_MOCK) {
    console.log('[API Service] Mocking classifyCrop response with model:', model);
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network latency
    // Mock return of "Talong" or whichever crop key is matched first
    const list = crops.split(',');
    const match = list.find((c) => c.trim() === 'Talong') || list[0] || 'Talong';
    const matched = !imageUri.includes('unrecognized');
    return {
      crop: matched ? match.trim() : 'Unknown Crop',
      matched,
    };
  }

  const formData = new FormData();
  // In React Native, FormData file attachment requires this specific URI object
  formData.append('image', {
    uri: imageUri,
    name: 'image.jpg',
    type: 'image/jpeg',
  } as any);
  formData.append('crops', crops);
  formData.append('model', model);

  const response = await fetch(`${PROXY_BASE_URL}/classify`, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`AI classification failed: Server responded with status ${response.status}`);
  }

  const data = await response.json();
  return data;
};

/**
 * Step 2 — Diagnose the crop health via SSE streaming.
 * Sends the image + crop context to /diagnose and streams the response.
 *
 * @param imageUri - Local URI of the captured/selected image.
 * @param crop - The identified crop name (from classifyCrop).
 * @param context - JSON string of the crop's database metadata.
 * @param model - AI model preference: "flash" or "deep".
 * @param onChunk - Callback fired for each received text chunk.
 * @param onDone - Callback fired when the stream completes.
 * @param onError - Callback fired if an error occurs.
 * @param abortSignal - Optional signal to abort the stream.
 */
export const diagnoseCrop = async (
  imageUri: string,
  crop: string,
  context: string,
  model: 'flash' | 'deep',
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void,
  onError: (error: string) => void,
  abortSignal?: AbortSignal
): Promise<void> => {
  if (USE_MOCK) {
    console.log('[API Service] Mocking diagnoseCrop SSE stream...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (abortSignal?.aborted) return;

    const cropDb = db[crop] || db['Talong'];
    const statusKeys = Object.keys(cropDb.health_statuses);
    // Find a diseased status to show Bento Grid visual states, default to first status
    const selectedStatusKey =
      statusKeys.find((k) => !k.endsWith('___Healthy')) || statusKeys[0];
    const status = cropDb.health_statuses[selectedStatusKey];

    const healthPercentage =
      status.severity === 'None'
        ? 98
        : status.severity === 'Low'
        ? 75
        : status.severity === 'Moderate'
        ? 45
        : 15;

    const responseText = `- **Crop Identified:** ${cropDb.local_name} (${
      cropDb.scientific_name
    })
- **Condition:** ${status.condition_name}
- **Severity:** ${status.severity}
- **Health Score:** ${healthPercentage}%
- **Confidence Score:** 92%
- **Symptoms Observed:**
  - ${status.symptoms.split('. ').join('\n  - ')}
- **Organic Treatment:**
  - ${status.organic_treatment.split('. ').join('\n  - ')}
- **Prevention:**
  - ${status.preventive_measures.split('. ').join('\n  - ')}
- **Care Tip:** Make sure to inspect leaves weekly and always sterilize pruning tools after handling diseased crops.`;

    const words = responseText.split(' ');
    let wordIndex = 0;

    const interval = setInterval(() => {
      if (abortSignal?.aborted) {
        clearInterval(interval);
        console.log('[API Service] Mock diagnose stream aborted.');
        return;
      }

      if (wordIndex >= words.length) {
        clearInterval(interval);
        onDone();
        return;
      }

      // Stream 2-3 words at a time
      const nextWords = words.slice(wordIndex, wordIndex + 3).join(' ') + ' ';
      onChunk({ text: nextWords });
      wordIndex += 3;
    }, 120);

    abortSignal?.addEventListener('abort', () => {
      clearInterval(interval);
    });

    return;
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${PROXY_BASE_URL}/diagnose`);

    // Setup abort signal listener
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        xhr.abort();
        resolve();
      });
    }

    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: 'image.jpg',
      type: 'image/jpeg',
    } as any);
    formData.append('crop', crop);
    formData.append('context', context);
    formData.append('model', model);

    let lastProcessedIndex = 0;

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        // Read the full accumulated response text
        const text = xhr.responseText;
        const newText = text.substring(lastProcessedIndex);

        // Split by double newlines to process SSE events
        const lines = newText.split('\n');
        // If state is 3 (interactive), the last line might be incomplete, so slice it off
        const linesToProcess = xhr.readyState === 4 ? lines : lines.slice(0, -1);

        if (xhr.readyState !== 4) {
          const processedLength = linesToProcess.join('\n').length;
          if (processedLength > 0) {
            lastProcessedIndex += processedLength + 1; // +1 to skip the sliced newline
          }
        }

        for (const line of linesToProcess) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') {
              onDone();
              resolve();
              return;
            }

            try {
              const chunk: StreamChunk = JSON.parse(dataStr);
              if (chunk.error) {
                onError(chunk.error);
                resolve();
                return;
              }
              if (chunk.text) {
                onChunk({ text: chunk.text });
              }
            } catch (err) {
              // Ignore partial JSON parse failures in stream events
            }
          }
        }
      }

      if (xhr.readyState === 4) {
        if (xhr.status < 200 || xhr.status >= 300) {
          onError(`Server responded with HTTP status code ${xhr.status}`);
        }
        resolve();
      }
    };

    xhr.onerror = () => {
      onError('Network request failed');
      resolve();
    };

    xhr.send(formData);
  });
};

/**
 * Step 3 — Send a follow-up chat message via SSE streaming.
 * Posts the conversation history to /chat and streams the AI response.
 *
 * @param messages - The full conversation history.
 * @param context - JSON string of the crop's database metadata.
 * @param model - AI model preference: "flash" or "deep".
 * @param onChunk - Callback fired for each received text chunk.
 * @param onDone - Callback fired when the stream completes.
 * @param onError - Callback fired if an error occurs.
 * @param abortSignal - Optional signal to abort the stream.
 */
export const chatWithAI = async (
  messages: ChatMessage[],
  context: string,
  model: 'flash' | 'deep',
  onChunk: (chunk: StreamChunk) => void,
  onDone: () => void,
  onError: (error: string) => void,
  abortSignal?: AbortSignal
): Promise<void> => {
  if (USE_MOCK) {
    console.log('[API Service] Mocking chatWithAI SSE stream...');
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (abortSignal?.aborted) return;

    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const responseText = `Here is some information regarding your question about "${lastUserMsg}". Under organic management guidelines, it's highly recommended to apply neem oil or visual sticky traps for insects. Always remember to prune infected leaves early in the morning and maintain a regular watering cycle to help the crop recover successfully. Let me know if you need specific steps!`;

    const words = responseText.split(' ');
    let wordIndex = 0;

    const interval = setInterval(() => {
      if (abortSignal?.aborted) {
        clearInterval(interval);
        console.log('[API Service] Mock chat stream aborted.');
        return;
      }

      if (wordIndex >= words.length) {
        clearInterval(interval);
        onDone();
        return;
      }

      const nextWords = words.slice(wordIndex, wordIndex + 3).join(' ') + ' ';
      onChunk({ text: nextWords });
      wordIndex += 3;
    }, 100);

    abortSignal?.addEventListener('abort', () => {
      clearInterval(interval);
    });

    return;
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${PROXY_BASE_URL}/chat`);
    xhr.setRequestHeader('Content-Type', 'application/json');

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        xhr.abort();
        resolve();
      });
    }

    let lastProcessedIndex = 0;

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        const text = xhr.responseText;
        const newText = text.substring(lastProcessedIndex);

        const lines = newText.split('\n');
        const linesToProcess = xhr.readyState === 4 ? lines : lines.slice(0, -1);

        if (xhr.readyState !== 4) {
          const processedLength = linesToProcess.join('\n').length;
          if (processedLength > 0) {
            lastProcessedIndex += processedLength + 1;
          }
        }

        for (const line of linesToProcess) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') {
              onDone();
              resolve();
              return;
            }

            try {
              const chunk: StreamChunk = JSON.parse(dataStr);
              if (chunk.error) {
                onError(chunk.error);
                resolve();
                return;
              }
              if (chunk.text) {
                onChunk({ text: chunk.text });
              }
            } catch (err) {
              // Ignore partial JSON parse failures in stream events
            }
          }
        }
      }

      if (xhr.readyState === 4) {
        if (xhr.status < 200 || xhr.status >= 300) {
          onError(`Server responded with HTTP status code ${xhr.status}`);
        }
        resolve();
      }
    };

    xhr.onerror = () => {
      onError('Network request failed');
      resolve();
    };

    const payload = JSON.stringify({
      messages,
      context,
      model,
    });

    xhr.send(payload);
  });
};
