/**
 * Claude API wrapper for PitchPilot Generator.
 * Uses direct fetch to Anthropic API with user-provided key.
 */

import { getApiKey } from "./store";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 16000;

/**
 * Send a message to Claude and get a response.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {object} options - { onChunk, signal, maxTokens }
 * @returns {Promise<string>} Response text
 */
export async function callClaude(systemPrompt, userMessage, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Kein API-Key gesetzt. Bitte unter Einstellungen hinterlegen.");

  const { signal, maxTokens = MAX_TOKENS, timeout = 60000 } = options;

  // Timeout wrapper — abort after timeout ms if no external signal
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  if (signal) signal.addEventListener("abort", () => controller.abort());

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Ungültiger API-Key. Bitte prüfen.");
    if (response.status === 429) throw new Error("Rate-Limit erreicht. Bitte kurz warten.");
    throw new Error(err.error?.message || `API-Fehler: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

/**
 * Stream a response from Claude with live text updates.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {function} onChunk - Called with each text delta
 * @param {object} options - { signal, maxTokens }
 * @returns {Promise<string>} Full response text
 */
export async function streamClaude(systemPrompt, userMessage, onChunk, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Kein API-Key gesetzt. Bitte unter Einstellungen hinterlegen.");

  const { signal, maxTokens = MAX_TOKENS, timeout = 120000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  if (signal) signal.addEventListener("abort", () => controller.abort());

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Ungültiger API-Key.");
    if (response.status === 429) throw new Error("Rate-Limit erreicht.");
    throw new Error(err.error?.message || `API-Fehler: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;

      try {
        const evt = JSON.parse(payload);
        if (evt.type === "content_block_delta" && evt.delta?.text) {
          fullText += evt.delta.text;
          onChunk(evt.delta.text);
        }
      } catch {
        /* skip non-JSON lines */
      }
    }
  }

  // Process any remaining buffer after stream ends
  if (buffer.trim().startsWith("data: ")) {
    const payload = buffer.trim().slice(6).trim();
    if (payload !== "[DONE]") {
      try {
        const evt = JSON.parse(payload);
        if (evt.type === "content_block_delta" && evt.delta?.text) {
          fullText += evt.delta.text;
          onChunk(evt.delta.text);
        }
      } catch { /* skip */ }
    }
  }

  return fullText;
}

/** Check if API key is configured */
export function hasApiKey() {
  return !!getApiKey();
}
