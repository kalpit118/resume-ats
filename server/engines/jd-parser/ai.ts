import { AIProvider } from '../../providers/AIProvider.js';

export interface JDParserResponse {
  keywords: string[];
}

export const extractKeywordsAI = async (provider: AIProvider, jdText: string): Promise<string[]> => {
  const systemPrompt = `
You are an expert technical recruiter and resume analyzer.
Your task is to extract all the critical requirements and skills from the following job description.

Extract:
- Programming languages (e.g., Python, Rust, JavaScript, Java)
- Frameworks and libraries (e.g., React, Django)
- Tools and platforms (e.g., AWS, Git, Docker, Figma)
- Soft skills and methodologies (e.g., UX principles, communication, Agile)

Return ONLY a JSON object in this exact format:
{
  "keywords": ["Rust", "React", "HTML", "UX principles", "communication", "JavaScript", "CSS"]
}
`;

  try {
    const response = await provider.generateStructuredJSON<JDParserResponse>(systemPrompt, `Job Description:\n${jdText}`);
    return response.keywords || [];
  } catch (error) {
    console.error("AI Keyword Extraction failed:", error);
    throw error;
  }
};
