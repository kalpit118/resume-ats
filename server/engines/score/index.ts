import { MatchResult } from '../matching/index.js';

export interface ScoreBreakdown {
  score: number;
  keywordCoverage: number;
  matchedCount: number;
  missingCount: number;
}

/**
 * Calculates a transparent Job Match Score.
 */
export const calculateScore = (matches: MatchResult[]): ScoreBreakdown => {
  if (matches.length === 0) {
    return { score: 0, keywordCoverage: 0, matchedCount: 0, missingCount: 0 };
  }

  const matched = matches.filter(m => m.status === 'matched').length;
  const partial = matches.filter(m => m.status === 'partial').length;
  const missing = matches.filter(m => m.status === 'missing').length;

  const keywordCoverage = Math.round((matched + (partial * 0.5)) / matches.length * 100);
  
  // Phase 2 naive scoring
  const score = keywordCoverage;

  return {
    score,
    keywordCoverage,
    matchedCount: matched,
    missingCount: missing
  };
};
