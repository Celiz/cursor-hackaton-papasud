/**
 * Unified AI Service
 * Abstracts Ollama, Gemini, and Groq behind a common interface
 * Supports tool_calls for agentic workflows
 */

import * as ollama from './ollama-client';
import * as gemini from './gemini-client';
import * as groq from './groq-client';
import type { ToolCall, ToolDefinition, ChatOptions, ContentPart } from './groq-client';

export type AIProvider = 'gemini' | 'ollama' | 'groq';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[] | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface AIStatus {
  provider: AIProvider;
  available: boolean;
  model: string;
  error?: string;
}

// Re-export types for consumers
export type { ToolCall, ToolDefinition, ChatOptions, ContentPart };

/**
 * Get the configured AI provider
 */
export function getProvider(): AIProvider {
  const configured = process.env.AI_PROVIDER as AIProvider | undefined;

  if (configured === 'ollama') {
    return 'ollama';
  }

  if (configured === 'groq') {
    return 'groq';
  }

  // Default to Groq if API key is available (fastest + best for SQL)
  if (process.env.GROQ_API_KEY) {
    return 'groq';
  }

  // Fallback to Gemini if API key is available
  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }

  // Last resort: Ollama
  return 'ollama';
}

/**
 * Chat with the configured AI provider
 * Supports tool_calls when using Groq
 */
export async function chat(
  messages: ChatMessage[],
  providerOrOptions?: AIProvider | ChatOptions & { provider?: AIProvider }
): Promise<ChatMessage> {
  // Parse arguments
  let provider: AIProvider | undefined;
  let options: ChatOptions | undefined;

  if (typeof providerOrOptions === 'string') {
    provider = providerOrOptions;
  } else if (providerOrOptions) {
    provider = providerOrOptions.provider;
    options = providerOrOptions;
  }

  const activeProvider = provider || getProvider();

  /**
   * Solo para Ollama, que en esta integración no acepta imágenes. Se conserva
   * el texto y se deja constancia de la imagen descartada, en vez de mandar
   * "[object Object]" al modelo.
   *
   * Gemini y el cliente compatible con OpenAI (Groq / OpenRouter) sí reciben
   * el contenido multimodal tal cual.
   */
  const aTexto = (c: ChatMessage['content']): string => {
    if (typeof c === 'string') return c;
    if (!c) return '';
    return c
      .map((parte) =>
        parte.type === 'text' ? parte.text : '[imagen omitida: este proveedor no acepta visión]'
      )
      .join('\n');
  };

  if (activeProvider === 'gemini') {
    // Gemini no soporta tools acá, pero sí imágenes: se pasan tal cual.
    const geminiMessages = messages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content ?? '',
    }));
    return gemini.chat(geminiMessages);
  }

  if (activeProvider === 'groq') {
    // Groq supports tools
    const groqMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
      tool_calls: m.tool_calls,
      tool_call_id: m.tool_call_id,
      name: m.name,
    }));
    return groq.chat(groqMessages, options);
  }

  // Ollama - doesn't support tools
  const ollamaMessages = messages.map(m => ({
    role: m.role as 'system' | 'user' | 'assistant',
    content: aTexto(m.content),
  }));

  const response = await ollama.chat(ollamaMessages);

  return {
    role: 'assistant',
    content: response.content,
  };
}

/**
 * Check status of the configured AI provider
 */
export async function checkStatus(provider?: AIProvider): Promise<AIStatus> {
  const activeProvider = provider || getProvider();

  /**
   * Solo para Ollama, que en esta integración no acepta imágenes. Se conserva
   * el texto y se deja constancia de la imagen descartada, en vez de mandar
   * "[object Object]" al modelo.
   *
   * Gemini y el cliente compatible con OpenAI (Groq / OpenRouter) sí reciben
   * el contenido multimodal tal cual.
   */
  const aTexto = (c: ChatMessage['content']): string => {
    if (typeof c === 'string') return c;
    if (!c) return '';
    return c
      .map((parte) =>
        parte.type === 'text' ? parte.text : '[imagen omitida: este proveedor no acepta visión]'
      )
      .join('\n');
  };

  if (activeProvider === 'gemini') {
    const status = await gemini.checkGeminiStatus();
    return {
      provider: 'gemini',
      available: status.available,
      model: status.model,
      error: status.error,
    };
  }

  if (activeProvider === 'groq') {
    const status = await groq.checkGroqStatus();
    return {
      provider: 'groq',
      available: status.available,
      model: status.model,
      error: status.error,
    };
  }

  // Ollama
  const status = await ollama.checkOllamaStatus();
  return {
    provider: 'ollama',
    available: status.running && status.modelAvailable,
    model: ollama.getOllamaConfig().model,
    error: status.error,
  };
}

/**
 * Check status of all providers
 */
export async function checkAllProviders(): Promise<{
  gemini: AIStatus;
  ollama: AIStatus;
  groq: AIStatus;
  active: AIProvider;
}> {
  const [geminiStatus, ollamaStatus, groqStatus] = await Promise.all([
    gemini.checkGeminiStatus().then(s => ({
      provider: 'gemini' as AIProvider,
      available: s.available,
      model: s.model,
      error: s.error,
    })),
    ollama.checkOllamaStatus().then(s => ({
      provider: 'ollama' as AIProvider,
      available: s.running && s.modelAvailable,
      model: ollama.getOllamaConfig().model,
      error: s.error,
    })),
    groq.checkGroqStatus().then(s => ({
      provider: 'groq' as AIProvider,
      available: s.available,
      model: s.model,
      error: s.error,
    })),
  ]);

  return {
    gemini: geminiStatus,
    ollama: ollamaStatus,
    groq: groqStatus,
    active: getProvider(),
  };
}

/**
 * Get configuration for all providers
 */
export function getConfig() {
  return {
    activeProvider: getProvider(),
    gemini: gemini.getGeminiConfig(),
    ollama: ollama.getOllamaConfig(),
    groq: groq.getGroqConfig(),
  };
}
