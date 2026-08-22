/**
 * Google Gemini API Client
 * Uses the Vercel AI SDK (@ai-sdk/google) to talk to Gemini directly.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, type UserContent } from 'ai';
import type { ContentPart } from './groq-client';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const google = GEMINI_API_KEY ? createGoogleGenerativeAI({ apiKey: GEMINI_API_KEY }) : null;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

/** Gemini sí entiende imágenes: a diferencia del resto, acá no se descartan. */
function aContenidoGemini(content: string | ContentPart[]): string | UserContent {
  if (typeof content === 'string') return content;
  return content.map(parte =>
    parte.type === 'text'
      ? { type: 'text' as const, text: parte.text }
      : { type: 'image' as const, image: parte.image_url.url }
  );
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chat with Gemini via the Vercel AI SDK (with retry on rate limit/server errors)
 */
export async function chat(
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<ChatMessage> {
  if (!google) {
    throw new Error('GEMINI_API_KEY no está configurada');
  }

  const systemMsg = messages.find(m => m.role === 'system')?.content;
  const system = typeof systemMsg === 'string' ? systemMsg : undefined;
  const rest = messages
    .filter(m => m.role !== 'system')
    .map(m =>
      m.role === 'user'
        ? { role: 'user' as const, content: aContenidoGemini(m.content) }
        : { role: 'assistant' as const, content: typeof m.content === 'string' ? m.content : '' }
    );

  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { text } = await generateText({
        model: google(GEMINI_MODEL),
        system,
        messages: rest,
        temperature: options?.temperature ?? 0.1,
        maxOutputTokens: options?.maxTokens ?? 2048,
      });

      return { role: 'assistant', content: text };
    } catch (error: any) {
      const status = error?.statusCode ?? error?.status;
      const isRetryable = status === 429 || status >= 500 || error.message?.includes('fetch failed');

      if (isRetryable) {
        lastError = error;
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Gemini error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

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
  if (!google) {
    return {
      available: false,
      model: GEMINI_MODEL,
      error: 'GEMINI_API_KEY no está configurada',
    };
  }

  try {
    await generateText({
      model: google(GEMINI_MODEL),
      messages: [{ role: 'user', content: 'test' }],
      maxOutputTokens: 10,
    });

    return { available: true, model: GEMINI_MODEL };
  } catch (error: any) {
    return {
      available: false,
      model: GEMINI_MODEL,
      error: error.message || 'Error desconocido',
    };
  }
}

/**
 * Language model instance, para usar con generateText/streamText y tool calling directo.
 */
export function getGeminiModel() {
  if (!google) {
    throw new Error('GEMINI_API_KEY no está configurada');
  }
  return google(GEMINI_MODEL);
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
