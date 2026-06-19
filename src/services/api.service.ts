/**
 * Bugsok AI — API Service (Phase 3 Placeholder)
 *
 * This service will handle all communication with the Go Proxy backend
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

/** Base URL for the Go Proxy backend on Hugging Face Spaces. */
const PROXY_BASE_URL = process.env.EXPO_PUBLIC_PROXY_URL || '';

/**
 * Step 1 — Classify the crop from a leaf image.
 * Sends the image to the /classify endpoint and returns the identified crop name.
 *
 * @param imageUri - Local URI of the captured/selected image.
 * @param crops - Comma-separated list of supported crop names.
 * @returns The classified crop name.
 *
 * TODO: Implement in Phase 3
 */
export const classifyCrop = async (
  _imageUri: string,
  _crops: string
): Promise<ClassifyResponse> => {
  // Placeholder — will be implemented in Phase 3
  throw new Error('classifyCrop is not yet implemented. Coming in Phase 3.');
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
 *
 * TODO: Implement in Phase 3
 */
export const diagnoseCrop = async (
  _imageUri: string,
  _crop: string,
  _context: string,
  _model: 'flash' | 'deep',
  _onChunk: (chunk: StreamChunk) => void,
  _onDone: () => void,
  _onError: (error: string) => void
): Promise<void> => {
  // Placeholder — will be implemented in Phase 3
  throw new Error('diagnoseCrop is not yet implemented. Coming in Phase 3.');
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
 *
 * TODO: Implement in Phase 3
 */
export const chatWithAI = async (
  _messages: ChatMessage[],
  _context: string,
  _model: 'flash' | 'deep',
  _onChunk: (chunk: StreamChunk) => void,
  _onDone: () => void,
  _onError: (error: string) => void
): Promise<void> => {
  // Placeholder — will be implemented in Phase 3
  throw new Error('chatWithAI is not yet implemented. Coming in Phase 3.');
};
