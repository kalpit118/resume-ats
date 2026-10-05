import { AIProvider } from './AIProvider.js';
import Groq from 'groq-sdk';

export class GroqProvider implements AIProvider {
  private client: Groq;
  private model: string;

  constructor(apiKey: string, model: string = 'llama-3.1-8b-instant') {
    this.client = new Groq({ apiKey });
    this.model = model;
  }

  async generateStructuredJSON<T>(systemPrompt: string, userPrompt: string, retries = 2): Promise<T> {
    try {
      const response = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: this.model,
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content || '{}';
      try {
        return JSON.parse(content) as T;
      } catch (e) {
        console.error('Failed to parse Groq JSON response', content);
        throw new Error('Invalid JSON returned from AI provider');
      }
    } catch (e: any) {
      if (e.status === 429 && retries > 0) {
        console.log(`Rate limit hit. Retrying in 10s... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.generateStructuredJSON<T>(systemPrompt, userPrompt, retries - 1);
      }
      throw e;
    }
  }

  async generateText(systemPrompt: string, userPrompt: string, retries = 2): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: this.model,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || '';
    } catch (e: any) {
      if (e.status === 429 && retries > 0) {
        console.log(`Rate limit hit. Retrying in 10s... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.generateText(systemPrompt, userPrompt, retries - 1);
      }
      throw e;
    }
  }

  getProviderName(): string {
    return `Groq (${this.model})`;
  }
}
