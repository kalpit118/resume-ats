import { AIProvider } from './AIProvider.js';

/**
 * Mock provider to simulate AI processing when no API key is present.
 */
export class MockProvider implements AIProvider {
  async generateStructuredJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    console.log('[MockProvider] Generating structured JSON for prompt length:', userPrompt.length);
    
    // Naive heuristic to guess what the caller wants based on the prompt content
    if (systemPrompt.toLowerCase().includes('evidence guard') || systemPrompt.toLowerCase().includes('validate')) {
      // Mock validation response
      return {
        isValid: true,
        reasoning: 'Mock validation passed. Claim is supported by existing resume content.',
        requiresUserConfirmation: false
      } as any;
    }

    if (systemPrompt.toLowerCase().includes('extract') && systemPrompt.toLowerCase().includes('structure')) {
      // Mock parsing structure
      return {
        summary: "Mock extracted summary from resume.",
        experience: [{ role: "Developer", company: "Tech Co", bullets: ["Built things."] }],
        skills: ["MockSkill1", "MockSkill2"]
      } as any;
    }
    
    // Default mock response for optimization plan
    // Extract a real line from the resume text in the prompt to make it look realistic
    let originalText = "Built things.";
    const resumeMatch = userPrompt.match(/Resume:\s*"""([\s\S]*?)"""/);
    
    if (resumeMatch && resumeMatch[1]) {
      const lines = resumeMatch[1].split('\n').map(l => l.trim()).filter(l => l.length > 15);
      if (lines.length > 0) {
        // Pick the first substantial line and strip bullets
        originalText = lines[Math.floor(lines.length / 2)].replace(/^[-•*]\s*/, '');
      }
    }

    return {
      profile: {
        name: "User Name (Extracted)",
        email: "user@example.com",
        summary: "Extracted summary from resume.",
        experience: [
          {
            role: "Software Professional",
            company: "User's Company",
            bullets: [originalText]
          }
        ]
      },
      optimizationPlan: [
        {
          section: "experience",
          original: originalText,
          optimized: `${originalText.replace(/\.$/, '')} using industry-standard methodologies to deliver measurable impact.`,
          reasoning: "Improves professional tone and aligns with JD keywords without fabricating."
        }
      ]
    } as any;
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    console.log('[MockProvider] Generating text for prompt length:', userPrompt.length);
    return "This is a mock AI response. Please configure GROQ_API_KEY or NVIDIA_NIM_API_KEY.";
  }

  getProviderName(): string {
    return 'Mock (No API Key)';
  }
}
