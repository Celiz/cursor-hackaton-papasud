/**
 * Groq API Client
 * Uses OpenAI-compatible API for fast inference with Llama models
 * Supports tool_calls for agentic workflows
 */

// Cliente OpenAI-compatible: apunta a Groq por defecto, o a OpenRouter si solo hay clave de OpenRouter.
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
const GROQ_MODEL =
  process.env.GROQ_MODEL ||
  (process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : process.env.CHAT_MODEL || 'google/gemini-2.5-flash');

const GROQ_API_URL = process.env.GROQ_API_KEY
  ? 'https://api.groq.com/openai/v1/chat/completions'
  : 'https://openrouter.ai/api/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
      }>;
      required: string[];
    };
  };
}

interface GroqRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

/**
 * Chat with Groq API
 * Supports tool_calls for agentic workflows
 */
export async function chat(
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<ChatMessage> {
  if (!GROQ_API_KEY) {
    throw new Error('No hay clave de IA configurada (GROQ_API_KEY u OPENROUTER_API_KEY)');
  }

  const requestBody: GroqRequest = {
    model: GROQ_MODEL,
    messages,
    temperature: options?.temperature ?? 0.1,
    max_tokens: options?.maxTokens ?? 2048,
    stream: false,
  };

  // Add tools if provided
  if (options?.tools && options.tools.length > 0) {
    requestBody.tools = options.tools;
    requestBody.tool_choice = options.tool_choice ?? 'auto';
  }

  // Retry configuration
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second (Groq is fast, shorter delays)

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Check if it's a rate limit error (429) or server error (5xx)
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`Groq API error: ${response.status}`);
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Groq rate limit/error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await sleep(delay);
          continue;
        }

        // For other errors, throw immediately
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const data: GroqResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('Groq no devolvió ninguna respuesta');
      }

      const message = data.choices[0].message;

      // Return message with tool_calls if present
      return {
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls,
      };
    } catch (error: any) {
      // Network errors - retry
      if (error.message?.includes('fetch failed') || error.message?.includes('ECONNRESET')) {
        lastError = error;
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Groq network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      // Other errors - throw immediately
      throw error;
    }
  }

  // All retries exhausted
  throw lastError || new Error('Groq API error after retries');
}

/**
 * Check if Groq API is configured and working
 */
export async function checkGroqStatus(): Promise<{
  available: boolean;
  model: string;
  error?: string;
}> {
  if (!GROQ_API_KEY) {
    return {
      available: false,
      model: GROQ_MODEL,
      error: 'No hay clave de IA configurada (GROQ_API_KEY u OPENROUTER_API_KEY)',
    };
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      return {
        available: false,
        model: GROQ_MODEL,
        error: `API error: ${response.status}`,
      };
    }

    return {
      available: true,
      model: GROQ_MODEL,
    };
  } catch (error: any) {
    return {
      available: false,
      model: GROQ_MODEL,
      error: error.message || 'Error desconocido',
    };
  }
}

/**
 * Get configured Groq settings
 */
export function getGroqConfig() {
  return {
    model: GROQ_MODEL,
    hasApiKey: !!GROQ_API_KEY,
  };
}
