import { AIProvider } from './AIProvider.js';
import { GroqProvider } from './GroqProvider.js';
import { NIMProvider } from './NIMProvider.js';
import { MockProvider } from './MockProvider.js';
import dotenv from 'dotenv';

dotenv.config();

export const getAIProvider = (config?: { provider?: string, apiKey?: string, model?: string }): AIProvider => {
  const provider = (config?.provider || process.env.AI_PROVIDER || 'mock').toLowerCase();
  
  if (provider === 'groq') {
    const apiKey = config?.apiKey || process.env.GROQ_API_KEY;
    if (apiKey) {
      return new GroqProvider(apiKey, config?.model || process.env.GROQ_MODEL || 'llama-3.1-8b-instant');
    }
  }

  if (provider === 'nim') {
    const apiKey = config?.apiKey || process.env.NIM_API_KEY;
    if (apiKey) {
      return new NIMProvider(apiKey, config?.model || process.env.NIM_MODEL || 'meta/llama-3.1-8b-instruct');
    }
  }

  // Fallback to mock if configured or missing keys
  return new MockProvider();
};
