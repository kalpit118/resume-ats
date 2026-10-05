/**
 * Applies a list of accepted text changes to a LaTeX source document.
 *
 * Strategy:
 *   1. Exact literal match — fastest path, used when the AI original happens to
 *      appear verbatim in the source (e.g. plain-text sections).
 *   2. Normalized full-document search — strip all inline LaTeX formatting from
 *      both the document and the search term, then use a sliding window over
 *      consecutive lines to find the best-matching span.  Once located, replace
 *      the raw (un-normalized) lines with the optimized text, preserving any
 *      surrounding LaTeX environment commands (\\item, \\resumeItem, etc.).
 *
 * This approach correctly handles:
 *   - Multi-line paragraphs (e.g. \\resumeSummary{...})
 *   - Inline formatting inside a line (\\textbf{}, \\textit{}, etc.)
 *   - Custom resume macros (\\resumeItem, \\cvitem, \\item)
 *   - Partial matches within a longer line
 */

interface Change {
  original: string;
  optimized: string;
  accepted: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip inline LaTeX commands so plain text can be compared. */
function stripLatexFormatting(s: string): string {
  return s
    .replace(/\\textbf\{([^}]+)\}/g, '$1')
    .replace(/\\textit\{([^}]+)\}/g, '$1')
    .replace(/\\emph\{([^}]+)\}/g, '$1')
    .replace(/\\underline\{([^}]+)\}/g, '$1')
    .replace(/\\texttt\{([^}]+)\}/g, '$1')
    .replace(/\\textrm\{([^}]+)\}/g, '$1')
    .replace(/\\textsc\{([^}]+)\}/g, '$1')
    .replace(/\\href\{[^}]+\}\{([^}]+)\}/g, '$1')
    .replace(/\\url\{[^}]+\}/g, '')
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1') // generic unknown commands — keep content
    .replace(/\\\\/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalise a string for fuzzy comparison:
 *  - strip LaTeX formatting
 *  - collapse whitespace
 *  - lower-case
 */
function normalize(s: string): string {
  return stripLatexFormatting(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Compute word-level Jaccard similarity [0-1] between two normalised strings.
 * Lets us pick the best matching window even when the AI slightly reworded the original.
 */
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/));
  const wordsB = new Set(b.split(/\s+/));
  let intersection = 0;
  for (const w of wordsA) if (wordsB.has(w)) intersection++;
  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ---------------------------------------------------------------------------
// Leading LaTeX environment command detection
// ---------------------------------------------------------------------------

/**
 * Returns the leading environment macro prefix of a line if present,
 * e.g. "  \\resumeItem{" from "  \\resumeItem{Built a portfolio website...}"
 */
function extractLeadingMacro(line: string): string | null {
  const m = line.match(/^(\s*\\(?:item|resumeItem|cvitem|cvlistitem|entry|denseitem)[^{]*\{?)/i);
  return m ? m[1] : null;
}

/** True if a line is purely structural LaTeX (not prose content). */
function isStructuralLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed === '' ||
    /^%/.test(trimmed) ||
    /^\\(?:begin|end|section|subsection|documentclass|usepackage|newcommand|def|vspace|hspace|noindent|centering|raggedright|small|large|Large|huge|Huge)\b/.test(trimmed)
  );
}

// ---------------------------------------------------------------------------
// Core replacement function
// ---------------------------------------------------------------------------

function replaceInLatex(latexSource: string, original: string, optimized: string): string {

  // ── Strategy 1: Exact literal match ──────────────────────────────────────
  if (latexSource.includes(original)) {
    console.log('[LatexReplace] Strategy 1 (exact) matched');
    return latexSource.replace(original, optimized);
  }

  // ── Strategy 2: Normalised sliding-window match ───────────────────────────
  const normOriginal = normalize(original);
  if (!normOriginal) return latexSource;

  const lines = latexSource.split('\n');
  const normLines = lines.map(normalize);

  // Build all possible windows of 1..MAX_WINDOW consecutive non-structural lines
  const MAX_WINDOW = 8;
  let bestScore = 0;
  let bestStart = -1;
  let bestEnd = -1;  // inclusive

  for (let start = 0; start < lines.length; start++) {
    if (isStructuralLine(lines[start])) continue;
    let windowText = '';

    for (let end = start; end < Math.min(start + MAX_WINDOW, lines.length); end++) {
      if (isStructuralLine(lines[end]) && end > start) break;

      windowText += (windowText ? ' ' : '') + normLines[end];

      // Only consider windows whose normalized text is at least 60% the length
      // of what we are looking for (avoids false-positive tiny windows)
      if (windowText.length < normOriginal.length * 0.6) continue;

      const score = similarity(windowText, normOriginal);
      const containsSubstr = windowText.includes(normOriginal) || normOriginal.includes(windowText);

      if ((score > bestScore || (containsSubstr && score > 0.4)) && score >= 0.5) {
        bestScore = score;
        bestStart = start;
        bestEnd = end;
      }
    }
  }

  if (bestStart !== -1) {
    console.log(`[LatexReplace] Strategy 2 (normalised window) matched lines ${bestStart}-${bestEnd} with score ${bestScore.toFixed(2)}`);

    // Preserve leading macro of the first matched line if present
    const firstLine = lines[bestStart];
    const leadingMacro = extractLeadingMacro(firstLine);

    let replacement: string;
    if (leadingMacro && leadingMacro.endsWith('{')) {
      // The macro opens a brace group. Replace the content inside those braces
      // with the optimized text, keeping the macro command intact.
      // e.g.  "  \resumeItem{old content}" → "  \resumeItem{new content}"
      const macroEnd = firstLine.indexOf(leadingMacro) + leadingMacro.length; // index after '{'
      const closingBrace = firstLine.lastIndexOf('}');
      const prefix = firstLine.substring(0, macroEnd);  // everything up to and including '{'
      const suffix = closingBrace > macroEnd ? '}' : ''; // closing brace if it was on this line
      replacement = prefix + optimized + suffix;
    } else if (leadingMacro) {
      replacement = leadingMacro + optimized;
    } else {
      replacement = optimized;
    }

    // Replace the matched span with the single replacement line
    lines.splice(bestStart, bestEnd - bestStart + 1, replacement);
    return lines.join('\n');
  }

  // No match found
  console.warn(`[LatexReplace] Could not find match for: "${original.substring(0, 80)}..."`);
  return latexSource;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Applies all accepted changes to a LaTeX document source.
 */
export function applyChangesToLatex(latexSource: string, changes: Change[]): string {
  let result = latexSource;
  let appliedCount = 0;
  const acceptedChanges = changes.filter(c => c.accepted);

  for (const change of acceptedChanges) {
    // Coerce to string to guard against null/undefined/object from AI response
    const originalStr = typeof change.original === 'string' ? change.original : String(change.original ?? '');
    const optimizedStr = typeof change.optimized === 'string' ? change.optimized : String(change.optimized ?? '');

    if (!originalStr.trim() || !optimizedStr.trim()) continue;
    if (originalStr.trim() === optimizedStr.trim()) continue;

    const before = result;
    result = replaceInLatex(result, originalStr, optimizedStr);
    if (result !== before) appliedCount++;
  }

  console.log(`[LatexReplace] Applied ${appliedCount}/${acceptedChanges.length} accepted changes`);
  return result;
}

