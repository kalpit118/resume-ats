import { normalizeKeyword } from '../normalization/index.js';

export type MatchType = 'Exact' | 'Normalized' | 'Semantic' | 'Missing';

export interface MatchResult {
  requirement: string;
  type: MatchType;
  status: 'matched' | 'partial' | 'missing';
  confidence: number;
}

/**
 * Level 1 & 2 Matching Engine
 * Checks if a JD requirement exists in the resume text.
 */
export const performMatching = (jdRequirements: string[], resumeText: string): MatchResult[] => {
  const resumeTextLower = resumeText.toLowerCase();
  const results: MatchResult[] = [];

  for (const req of jdRequirements) {
    const reqLower = req.toLowerCase().trim();
    const normalizedReq = normalizeKeyword(req);
    
    // Level 1: Exact Match
    if (resumeTextLower.includes(reqLower)) {
      results.push({
        requirement: req,
        type: 'Exact',
        status: 'matched',
        confidence: 1.0
      });
      continue;
    }

    // Level 2: Normalized Match
    const isNormalizedMatched = resumeTextLower.includes(normalizedReq);
    if (isNormalizedMatched) {
      results.push({
        requirement: req,
        type: 'Normalized',
        status: 'matched',
        confidence: 0.95
      });
      continue;
    }

    // Missing (Level 3 Semantic is omitted for Local Phase 2)
    results.push({
      requirement: req,
      type: 'Missing',
      status: 'missing',
      confidence: 1.0
    });
  }

  return results;
};
