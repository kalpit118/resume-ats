import { AIProvider } from '../../providers/AIProvider.js';

export interface ProposedChange {
  section: string;
  originalText: string;
  newText: string;
}

export interface EvidenceValidationRequest {
  originalResumeText: string;
  proposedChanges: ProposedChange[];
}

export interface ValidationResult {
  isValid: boolean;
  reasoning: string;
  requiresUserConfirmation: boolean;
}

export interface EvidenceValidationResponse {
  validations: ValidationResult[];
}

/**
 * Section 16: No-Fabrication Engine / Evidence Guard
 */
export const validateChanges = async (
  provider: AIProvider,
  request: EvidenceValidationRequest
): Promise<EvidenceValidationResponse> => {
  const systemPrompt = `
You are the Evidence Guard for a resume optimization engine.
Your sole job is to enforce the "no-fabrication" rule.

Given the Original Resume Text and a list of Proposed Changes, you must verify for each change:
1. Does the claim already exist in the resume?
2. Is the claim a valid paraphrase?
3. Is there supporting evidence?
4. Does it introduce a new skill, achievement, or numerical claim?

If a new text introduces unsupported claims, you MUST reject it or require user confirmation.

Respond in JSON format:
{
  "validations": [
    {
      "isValid": boolean,
      "reasoning": "string explanation",
      "requiresUserConfirmation": boolean
    }
  ]
}
The output array must have the exact same length and order as the input Proposed Changes.
  `;

  const changesText = request.proposedChanges.map((c, i) => `
Change [${i}] (Section: ${c.section}):
Original: "${c.originalText}"
New: "${c.newText}"
  `).join('\n');

  const userPrompt = `
Original Resume Text:
"""${request.originalResumeText}"""

Proposed Changes:
${changesText}
  `;

  return await provider.generateStructuredJSON<EvidenceValidationResponse>(systemPrompt, userPrompt);
};
