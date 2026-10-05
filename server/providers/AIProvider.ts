export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  /**
   * Generates a structured JSON response from the LLM based on a prompt.
   * Forces the LLM to return valid JSON.
   */
  generateStructuredJSON<T>(systemPrompt: string, userPrompt: string): Promise<T>;
  
  /**
   * Generates standard text response.
   */
  generateText(systemPrompt: string, userPrompt: string): Promise<string>;

  /**
   * Returns the name of the provider currently in use.
   */
  getProviderName(): string;
}
