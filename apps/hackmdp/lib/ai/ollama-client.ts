/**
 * Ollama HTTP Client
 * Handles communication with local Ollama instance
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e2b';

export interface OllamaGenerateRequest {
  model?: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model?: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Generate a completion using Ollama's generate endpoint
 */
export async function generateCompletion(
  prompt: string,
  system?: string,
  options?: OllamaGenerateRequest['options']
): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      system,
      stream: false,
      think: false,
      options: {
        temperature: 0.1,
        ...options,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error: ${response.status} - ${error}`);
  }

  const data: OllamaGenerateResponse = await response.json();
  return data.response;
}

/**
 * Chat with Ollama using the chat endpoint (maintains conversation context)
 */
export async function chat(
  messages: OllamaChatMessage[],
  options?: OllamaChatRequest['options']
): Promise<OllamaChatMessage> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      think: false,
      options: {
        temperature: 0.1,
        ...options,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error: ${response.status} - ${error}`);
  }

  const data: OllamaChatResponse = await response.json();
  return data.message;
}

/**
 * Check if Ollama is running and the model is available
 */
export async function checkOllamaStatus(): Promise<{
  running: boolean;
  modelAvailable: boolean;
  models: string[];
  error?: string;
}> {
  try {
    // Check if Ollama is running
    const tagsResponse = await fetch(`${OLLAMA_URL}/api/tags`, {
      method: 'GET',
    });

    if (!tagsResponse.ok) {
      return {
        running: false,
        modelAvailable: false,
        models: [],
        error: 'Ollama no está corriendo',
      };
    }

    const tagsData = await tagsResponse.json();
    const models = tagsData.models?.map((m: { name: string }) => m.name) || [];
    const modelAvailable = models.some((m: string) =>
      m.startsWith(OLLAMA_MODEL) || m === OLLAMA_MODEL
    );

    return {
      running: true,
      modelAvailable,
      models,
      error: modelAvailable ? undefined : `Modelo ${OLLAMA_MODEL} no encontrado. Modelos disponibles: ${models.join(', ')}`,
    };
  } catch (error) {
    return {
      running: false,
      modelAvailable: false,
      models: [],
      error: `No se puede conectar a Ollama en ${OLLAMA_URL}. Asegúrate de que Ollama esté corriendo.`,
    };
  }
}

/**
 * Get configured Ollama settings
 */
export function getOllamaConfig() {
  return {
    url: OLLAMA_URL,
    model: OLLAMA_MODEL,
  };
}
