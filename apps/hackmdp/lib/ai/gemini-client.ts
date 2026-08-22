/**
 * Google Gemini API Client
 * Handles communication with Google's Gemini API
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// API endpoint for Gemini
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  systemInstruction?: {
    parts: { text: string }[];
  };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
    index: number;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Convert our standard chat messages to Gemini format
 */
function convertToGeminiFormat(messages: ChatMessage[]): {
  contents: GeminiMessage[];
  systemInstruction?: { parts: { text: string }[] };
} {
  let systemInstruction: { parts: { text: string }[] } | undefined;
  const contents: GeminiMessage[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      // Gemini uses systemInstruction for system messages
      systemInstruction = {
        parts: [{ text: msg.content }],
      };
    } else {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }
  }

  return { contents, systemInstruction };
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chat with Gemini API (with automatic retry on rate limit errors)
 */
export async function chat(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<ChatMessage> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no está configurada');
  }

  const { contents, systemInstruction } = convertToGeminiFormat(messages);

  const requestBody: GeminiRequest = {
    contents,
    generationConfig: {
      temperature: options?.temperature ?? 0.1,
      maxOutputTokens: options?.maxTokens ?? 2048,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = systemInstruction;
  }

  const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Retry configuration
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Check if it's a rate limit error (429) or server error (5xx)
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`Gemini API error: ${response.status}`);
          // Exponential backoff: 2s, 4s, 8s
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Gemini rate limit/error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }

        // For other errors, throw immediately
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data: GeminiResponse = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Gemini no devolvió ninguna respuesta');
      }

      const assistantContent = data.candidates[0].content.parts
        .map(p => p.text)
        .join('');

      return {
        role: 'assistant',
        content: assistantContent,
      };
    } catch (error: any) {
      // Network errors - retry
      if (error.message?.includes('fetch failed') || error.message?.includes('ECONNRESET')) {
        lastError = error;
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Gemini network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      // Other errors - throw immediately
      throw error;
    }
  }

  // All retries exhausted
  throw lastError || new Error('Gemini API error after retries');
}

/**
 * Check if Gemini API is configured and working
 */
export async function checkGeminiStatus(): Promise<{
  available: boolean;
  model: string;
  error?: string;
}> {
  if (!GEMINI_API_KEY) {
    return {
      available: false,
      model: GEMINI_MODEL,
      error: 'GEMINI_API_KEY no está configurada',
    };
  }

  try {
    // Test with a simple request
    const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'test' }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        available: false,
        model: GEMINI_MODEL,
        error: `API error: ${response.status}`,
      };
    }

    return {
      available: true,
      model: GEMINI_MODEL,
    };
  } catch (error: any) {
    return {
      available: false,
      model: GEMINI_MODEL,
      error: error.message || 'Error desconocido',
    };
  }
}

/**
 * Get configured Gemini settings
 */
export function getGeminiConfig() {
  return {
    model: GEMINI_MODEL,
    hasApiKey: !!GEMINI_API_KEY,
  };
}
