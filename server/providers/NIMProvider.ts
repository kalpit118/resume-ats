import { AIProvider } from './AIProvider.js';

export class NIMProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://integrate.api.nvidia.com/v1';

  constructor(apiKey: string, model: string = 'meta/llama-3.1-8b-instruct') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateStructuredJSON<T>(systemPrompt: string, userPrompt: string, retries = 2): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey.trim()}`
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: this.model,
          response_format: { type: 'json_object' },
          temperature: 0.1,
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        console.error(`[NIMProvider] HTTP ${response.status} Error:`, errorText);
        throw new Error(`NIM API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      
      try {
        return JSON.parse(content) as T;
      } catch (e) {
        console.error('Failed to parse NIM JSON response', content);
        throw new Error('Invalid JSON returned from AI provider');
      }
    } catch (e: any) {
      if (e.message?.includes('429') || e.message?.includes('500') || e.message?.includes('502') || e.message?.includes('503')) {
        if (retries > 0) {
          console.log(`NIM fetch failed (rate limit / server error). Retrying in 10s... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          return this.generateStructuredJSON<T>(systemPrompt, userPrompt, retries - 1);
        }
      }
      throw e;
    }
  }

  async generateText(systemPrompt: string, userPrompt: string, retries = 2): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey.trim()}`
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          model: this.model,
          temperature: 0.3,
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        console.error(`[NIMProvider] HTTP ${response.status} Error:`, errorText);
        throw new Error(`NIM API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (e: any) {
      if (e.message?.includes('429') || e.message?.includes('500') || e.message?.includes('502') || e.message?.includes('503')) {
        if (retries > 0) {
          console.log(`NIM fetch failed (rate limit / server error). Retrying in 10s... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          return this.generateText(systemPrompt, userPrompt, retries - 1);
        }
      }
      throw e;
    }
  }

  getProviderName(): string {
    return `NVIDIA NIM (${this.model})`;
  }
}
