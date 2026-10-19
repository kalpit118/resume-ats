import { AIProvider } from '../../providers/AIProvider.js';

export interface OptimizationPlanRequest {
  resumeText: string;
  jdText: string;
  rules: any; // Intensity, Length, Style
  matchedKeywords?: string[];
  missingKeywords?: string[];
  jobMatchScore?: number;
}

export interface OptimizationChange {
  section: string;
  original: string;
  optimized: string;
  reasoning: string;
}

export interface ResumeSectionItem {
  title?: string;
  subtitle?: string;
  bullets?: string[];
  content?: string;
}

export interface ResumeSection {
  name: string;
  type: 'summary' | 'experience' | 'projects' | 'skills' | 'education' | 'certifications' | 'other';
  items: ResumeSectionItem[];
}

export interface OptimizationPlanResponse {
  profile: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    summary: string;
    sections: ResumeSection[];
  };
  optimizationPlan: OptimizationChange[];
}

/**
 * Section 17: Optimization Engine
 * Dynamically parses all resume sections — never assumes experience/projects structure.
 */
export const generateOptimizationPlan = async (
  provider: AIProvider,
  request: OptimizationPlanRequest
): Promise<OptimizationPlanResponse> => {
  const systemPrompt = `
You are a senior technical resume optimization engine.
Optimize the resume to maximize alignment with the supplied job description while strictly upholding factual accuracy.

CORE OBJECTIVES:
1. Align terminology, highlight relevant technical accomplishments, and strengthen bullet points using job-relevant phrasing.
2. For MATCHED skills: Highlight and prominently position these verified skills throughout the resume's bullets, project descriptions, and summary.
3. For MISSING skills / QUALIFICATION GAPS:
   - Identify truthful, transferable overlap (e.g. if the role seeks 'testing', 'debugging', 'performance optimization', or 'collaboration', and the candidate describes feature development, rewrite the bullet to explicitly surface the testing, debugging, or performance aspects).
   - ANTI-FABRICATION RULE: NEVER invent completely unsupported hard technologies (e.g. do NOT claim PHP/WordPress if the resume only demonstrates JavaScript/Python), companies, metrics, or degrees.
   - If a candidate's background does NOT substantiate a missing hard technology, do NOT fabricate it. Instead, optimize their existing technical contributions to be as strong and high-impact as possible.

STRICT RULES:
1. You may rewrite, reorganize and clarify information already supported by the resume.
2. You must not fabricate qualifications, technologies, experience, or achievements.
3. Do not introduce unsupported technologies, metrics, employers, or certifications.
4. Use job-description terminology naturally when supported by the existing resume.
5. Preserve factual accuracy and the user's identity.
6. USER PREFERENCES RULE: Strictly obey the "Optimization Rules" JSON block provided in the user prompt (Intensity, Writing Style, Target Length, Content Preferences). If a preference says to be concise, make it concise. If it says professional, use professional tone.
7. CRITICAL SECTION RULE: Only parse and optimize sections that ACTUALLY EXIST in the provided resume text.
   - Do NOT create new sections that are not in the resume. Never use "new_section" as a section value.
   - The "name" field for each section must exactly match the heading as it appears in the resume (e.g., "Projects", "Skills", "Technologies").
   - The "section" field in optimizationPlan must be a simple lowercase section name — NO dots, NO slashes, NO sub-paths (e.g., use "technologies" not "technologies.tools").
   - Never add entries to the optimizationPlan for sections that don't exist in the resume.
8. ONLY MODIFIED CONTENT RULE: The "optimizationPlan" array MUST ONLY contain items where you actually changed, rewritten, or improved the text.
   - Do NOT include items where "original" and "optimized" are identical or unchanged.
   - If a sentence, bullet point, or skill list is already optimal, do not include it in "optimizationPlan".
   - Every single entry in "optimizationPlan" MUST represent an actual, meaningful modification.
9. ORIGINAL TEXT EXTRACTION RULE: When filling the "original" field in optimizationPlan:
   - Copy the COMPLETE sentence, bullet, or line verbatim from the resume — do not extract a partial phrase.
   - Preserve ALL separators: commas, spaces, semicolons between list items MUST be retained exactly.
   - Include leading symbols (e.g., *, -, •) if they are part of the line.
   - Do not paraphrase or summarize the original — copy it exactly character-for-character.
   - If a line contains a comma-separated list (e.g., "Git, GitHub, Figma"), copy the ENTIRE list including all commas and spaces.
   - This ensures the system can find and replace it accurately without corrupting formatting.

STEPS:
1. Read the resume carefully and list ONLY the section headings that actually exist in the text.
2. Build the profile using only those real sections — do not invent new ones.
3. Review the job description and missing/matched keywords. Optimize bullet points and summary to improve match alignment wherever supported by evidence in the resume.
4. Generate optimization changes ONLY for sections and bullets where you actually modify or improve the text. Never include unchanged items.

Respond ONLY with valid JSON in this exact format:

{
  "profile": {
    "name": "Applicant Name",
    "email": "email@example.com",
    "phone": "phone if present, else empty string",
    "location": "City, Country if present, else empty string",
    "summary": "summary text if summary section exists, else empty string",
    "sections": [
      {
        "name": "Exact Section Name from resume (e.g. Projects, Skills, Education)",
        "type": "one of: summary | experience | projects | skills | education | certifications | other",
        "items": [
          {
            "title": "item title (project name, job title, degree, etc.)",
            "subtitle": "company, link, institution, etc.",
            "bullets": ["bullet 1", "bullet 2"],
            "content": "for flat sections like skills: raw text"
          }
        ]
      }
    ]
  },
  "optimizationPlan": [
    {
      "section": "lowercase exact section name from the resume (e.g. 'projects', 'summary', 'skills')",
      "original": "exact original text snippet from the resume — copy it VERBATIM including any leading symbols like * or punctuation",
      "optimized": "improved version of the text — must be the COMPLETE replacement for that snippet, not a prefix or suffix. Do NOT repeat words that already exist before this snippet in the same line.",
      "reasoning": "why this improves the match to the job description"
    }
  ]
}

FORMATTING RULES FOR optimizationPlan (CRITICAL):
- The "original" field must be copied VERBATIM from the resume, including any leading *, italics markers, or punctuation.
- The "optimized" field must preserve the SAME formatting style as the original:
  * If the original uses bold on certain words, keep bold only on those same words or words of the same type.
  * Do NOT add bold/italic/underline formatting that was not present in the original snippet.
  * Do NOT remove bold/italic/underline formatting that was present in the original.
  * If the original has no bold text, the optimized must have no bold text.
  * If the original uses a leading symbol (like *), preserve it in the optimized.
- The "optimized" must be a COMPLETE drop-in replacement for "original". If the original is a full bullet point, the optimized must be a full bullet point. Do not return only a suffix or only a phrase.
- Do NOT repeat the start of the original in the optimized (e.g., if original is "Built a portfolio website...", do NOT start optimized with "Built a portfolio website..." if you're only adding to the end — instead write the full complete new sentence).
- Match the original's writing style: capitalization, punctuation, sentence structure.
  `;

  const userPrompt = `
Job Description:
"""${request.jdText}"""

Resume:
"""${request.resumeText}"""

Match Analysis Context:
- Current Match Score: ${request.jobMatchScore !== undefined ? `${request.jobMatchScore}/100` : 'N/A'}
- Matched Keywords: ${(request.matchedKeywords && request.matchedKeywords.length > 0) ? request.matchedKeywords.join(', ') : 'None identified'}
- Missing Keywords: ${(request.missingKeywords && request.missingKeywords.length > 0) ? request.missingKeywords.join(', ') : 'None identified'}

Optimization Rules:
${JSON.stringify(request.rules)}
  `;

  return await provider.generateStructuredJSON<OptimizationPlanResponse>(systemPrompt, userPrompt);
};
