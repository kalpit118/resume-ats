/**
 * latexTemplateInjector.ts
 *
 * Universal AI-powered LaTeX Resume Injector.
 * Takes ANY LaTeX resume template (whether built-in or custom uploaded by user)
 * and smartly injects the candidate's optimized resume content into the appropriate
 * positions, environments, and commands.
 */

import { AIProvider } from '../../providers/AIProvider.js';
import { applyChangesToLatex } from './applyLatexChanges.js';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Change {
  original: string;
  optimized: string;
  accepted: boolean;
}

export interface ResumeProfile {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  summary?: string;
  sections?: Array<{
    name: string;
    type: string;
    items?: Array<{
      title?: string;
      subtitle?: string;
      date?: string;
      location?: string;
      bullets?: string[];
      content?: string;
    }>;
  }>;
  // Legacy flat keys
  experience?: any[];
  education?: any[];
  skills?: any;
  projects?: any[];
}

interface ParsedSection {
  name: string;          // e.g. "HEADER", "EXPERIENCE", "EDUCATION"
  title?: string;        // original title in template, e.g. "Work Experience"
  category: 'HEADER' | 'SUMMARY' | 'EXPERIENCE' | 'EDUCATION' | 'PROJECTS' | 'SKILLS' | 'PUBLICATIONS' | 'BOILERPLATE' | 'OTHER';
  startIndex: number;    // start offset in template
  endIndex: number;      // end offset in template
  originalBlock: string; // raw LaTeX of this section
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Escapes special LaTeX characters for plain-text strings.
 */
export function escapeLaTeX(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\^{}')
    .replace(/~/g, '\\~{}')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

/**
 * Categorizes a section title into a known resume section type.
 */
function categorizeSection(title: string): ParsedSection['category'] {
  const t = title.toLowerCase().trim();
  if (/^(?:welcome|quick guide|guide|instruction|sample|boilerplate|about rendercv)/i.test(t)) {
    return 'BOILERPLATE';
  }
  if (/(?:experience|employment|work history|career|positions)/i.test(t)) {
    return 'EXPERIENCE';
  }
  if (/(?:education|academic|qualification|studies|degrees)/i.test(t)) {
    return 'EDUCATION';
  }
  if (/(?:projects|technical projects|key projects|selected projects)/i.test(t)) {
    return 'PROJECTS';
  }
  if (/(?:skills|technologies|technical skills|competencies|languages|tools)/i.test(t)) {
    return 'SKILLS';
  }
  if (/(?:summary|profile|about|objective|overview)/i.test(t)) {
    return 'SUMMARY';
  }
  if (/(?:publication|paper|research)/i.test(t)) {
    return 'PUBLICATIONS';
  }
  return 'OTHER';
}

/**
 * Applies accepted AI changes to the resume profile JSON object.
 */
function applyChangesToProfile(profile: ResumeProfile, changes: Change[]): ResumeProfile {
  const acceptedChanges = changes.filter(c => c.accepted);
  let profileJson = JSON.stringify(profile, null, 2);

  for (const ch of acceptedChanges) {
    if (ch.original && ch.optimized && ch.original.trim() !== ch.optimized.trim()) {
      profileJson = profileJson.split(ch.original).join(ch.optimized);
    }
  }

  try {
    return JSON.parse(profileJson);
  } catch {
    return profile;
  }
}

/**
 * Formats candidate section data into readable text for AI prompts.
 */
function formatCandidateSectionData(category: ParsedSection['category'], profile: ResumeProfile): string {
  const lines: string[] = [];

  switch (category) {
    case 'HEADER': {
      lines.push(`Full Name: ${profile.name || 'Candidate'}`);
      if (profile.email) lines.push(`Email: ${profile.email}`);
      if (profile.phone) lines.push(`Phone: ${profile.phone}`);
      if (profile.location) lines.push(`Location: ${profile.location}`);
      if (profile.linkedin) lines.push(`LinkedIn: ${profile.linkedin}`);
      if (profile.github) lines.push(`GitHub: ${profile.github}`);
      if (profile.website) lines.push(`Website: ${profile.website}`);
      break;
    }

    case 'SUMMARY': {
      if (profile.summary) {
        lines.push(profile.summary);
      }
      break;
    }

    case 'EXPERIENCE': {
      // Check unified sections first
      const expSec = profile.sections?.find(s => s.type === 'experience' || /experience|work/i.test(s.name));
      if (expSec?.items && expSec.items.length > 0) {
        for (const item of expSec.items) {
          lines.push(`Role / Title: ${item.title || ''}`);
          lines.push(`Company: ${item.subtitle || ''}`);
          lines.push(`Dates: ${item.date || ''}`);
          lines.push(`Location: ${item.location || ''}`);
          if (item.bullets && item.bullets.length > 0) {
            lines.push('Key Responsibilities & Achievements:');
            for (const b of item.bullets) lines.push(`  * ${b}`);
          }
          lines.push('');
        }
      } else if (profile.experience && Array.isArray(profile.experience)) {
        for (const exp of profile.experience) {
          lines.push(`Role: ${exp.title || exp.role || ''}`);
          lines.push(`Company: ${exp.company || exp.organization || ''}`);
          lines.push(`Dates: ${exp.date || exp.duration || ''}`);
          lines.push(`Location: ${exp.location || ''}`);
          if (exp.bullets) {
            for (const b of exp.bullets) lines.push(`  * ${b}`);
          }
          lines.push('');
        }
      }
      break;
    }

    case 'EDUCATION': {
      const eduSec = profile.sections?.find(s => s.type === 'education' || /education/i.test(s.name));
      if (eduSec?.items && eduSec.items.length > 0) {
        for (const item of eduSec.items) {
          lines.push(`Degree: ${item.title || ''}`);
          lines.push(`Institution / School: ${item.subtitle || ''}`);
          lines.push(`Dates / Year: ${item.date || ''}`);
          lines.push(`Location: ${item.location || ''}`);
          if (item.bullets) {
            for (const b of item.bullets) lines.push(`  * ${b}`);
          }
          if (item.content) lines.push(`  Details: ${item.content}`);
          lines.push('');
        }
      } else if (profile.education && Array.isArray(profile.education)) {
        for (const edu of profile.education) {
          lines.push(`Degree: ${edu.degree || edu.title || ''}`);
          lines.push(`School: ${edu.institution || edu.school || ''}`);
          lines.push(`Year: ${edu.date || edu.year || ''}`);
          if (edu.bullets) {
            for (const b of edu.bullets) lines.push(`  * ${b}`);
          }
          lines.push('');
        }
      }
      break;
    }

    case 'PROJECTS': {
      const projSec = profile.sections?.find(s => s.type === 'projects' || /project/i.test(s.name));
      if (projSec?.items && projSec.items.length > 0) {
        for (const item of projSec.items) {
          lines.push(`Project Name: ${item.title || ''}`);
          lines.push(`Role / Tech: ${item.subtitle || ''}`);
          lines.push(`Link / URL: ${item.location || ''}`);
          lines.push(`Date: ${item.date || ''}`);
          if (item.bullets) {
            for (const b of item.bullets) lines.push(`  * ${b}`);
          }
          if (item.content) lines.push(`  Details: ${item.content}`);
          lines.push('');
        }
      } else if (profile.projects && Array.isArray(profile.projects)) {
        for (const proj of profile.projects) {
          lines.push(`Project: ${proj.name || proj.title || ''}`);
          lines.push(`Technologies: ${proj.technologies || proj.subtitle || ''}`);
          lines.push(`Link: ${proj.link || proj.url || ''}`);
          if (proj.bullets) {
            for (const b of proj.bullets) lines.push(`  * ${b}`);
          }
          lines.push('');
        }
      }
      break;
    }

    case 'SKILLS': {
      const skillSec = profile.sections?.find(s => s.type === 'skills' || /skill|technolog/i.test(s.name));
      if (skillSec?.items && skillSec.items.length > 0) {
        for (const item of skillSec.items) {
          const title = item.title ? `${item.title}: ` : '';
          const content = item.content || item.bullets?.join(', ') || '';
          lines.push(`${title}${content}`);
        }
      } else if (profile.skills) {
        if (typeof profile.skills === 'string') {
          lines.push(profile.skills);
        } else if (Array.isArray(profile.skills)) {
          lines.push(profile.skills.join(', '));
        } else if (typeof profile.skills === 'object') {
          for (const [cat, vals] of Object.entries(profile.skills)) {
            lines.push(`${cat}: ${Array.isArray(vals) ? vals.join(', ') : vals}`);
          }
        }
      }
      break;
    }

    default:
      break;
  }

  return lines.join('\n');
}

// ─── Section Parsing (Slot Markers or Dynamic Detection) ───────────────────

/**
 * Extracts sections from a LaTeX document.
 * Supports both explicit %% SLOT: markers and automatic LaTeX section discovery.
 */
function parseLatexSections(templateLatex: string): { preamble: string; sections: ParsedSection[]; postamble: string } {
  // Find \begin{document}
  const docBeginMatch = templateLatex.match(/\\begin\{document\}/);
  const docEndMatch = templateLatex.match(/\\end\{document\}/);

  if (!docBeginMatch) {
    return { preamble: '', sections: [], postamble: '' };
  }

  const docBeginIdx = docBeginMatch.index! + docBeginMatch[0].length;
  const docEndIdx = docEndMatch ? docEndMatch.index! : templateLatex.length;

  const preamble = templateLatex.substring(0, docBeginIdx);
  const body = templateLatex.substring(docBeginIdx, docEndIdx);
  const postamble = docEndMatch ? templateLatex.substring(docEndIdx) : '\\end{document}';

  // Strategy 1: Check for explicit %% SLOT: markers in body
  const slotPattern = /(?:^|\n)(%+)\s*SLOT:\s*([A-Za-z0-9_-]+)/gi;
  const slotMatches: Array<{ name: string; index: number }> = [];
  let sMatch;
  while ((sMatch = slotPattern.exec(body)) !== null) {
    slotMatches.push({ name: sMatch[2].toUpperCase().trim(), index: sMatch.index });
  }

  if (slotMatches.length > 0) {
    const sections: ParsedSection[] = [];
    for (let i = 0; i < slotMatches.length; i++) {
      const current = slotMatches[i];
      const nextIdx = (i + 1 < slotMatches.length) ? slotMatches[i + 1].index : body.length;
      const block = body.substring(current.index, nextIdx);
      const cat = categorizeSection(current.name);
      sections.push({
        name: current.name,
        category: cat,
        startIndex: current.index,
        endIndex: nextIdx,
        originalBlock: block,
      });
    }
    return { preamble, sections, postamble };
  }

  // Strategy 2: Dynamic LaTeX section discovery
  const sectionCommandRegex = /(?:^|\n)([ \t]*\\(?:section|sectitle|cvsection|resumesection|heading)\*?\{([^}]+)\})/g;
  const sectionMatches: Array<{ fullMatch: string; title: string; index: number }> = [];
  let cmdMatch;
  while ((cmdMatch = sectionCommandRegex.exec(body)) !== null) {
    sectionMatches.push({
      fullMatch: cmdMatch[1],
      title: cmdMatch[2].trim(),
      index: cmdMatch.index,
    });
  }

  const sections: ParsedSection[] = [];

  // Header slot: from start of body up to first section command (or entire body if no sections)
  const firstSectionIdx = sectionMatches.length > 0 ? sectionMatches[0].index : body.length;
  if (firstSectionIdx > 0) {
    const headerBlock = body.substring(0, firstSectionIdx);
    sections.push({
      name: 'HEADER',
      category: 'HEADER',
      startIndex: 0,
      endIndex: firstSectionIdx,
      originalBlock: headerBlock,
    });
  }

  // Add each body section
  for (let i = 0; i < sectionMatches.length; i++) {
    const current = sectionMatches[i];
    const nextIdx = (i + 1 < sectionMatches.length) ? sectionMatches[i + 1].index : body.length;
    const block = body.substring(current.index, nextIdx);
    const cat = categorizeSection(current.title);

    sections.push({
      name: current.title.toUpperCase(),
      title: current.title,
      category: cat,
      startIndex: current.index,
      endIndex: nextIdx,
      originalBlock: block,
    });
  }

  return { preamble, sections, postamble };
}

// ─── AI Section Generator ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert LaTeX resume typesetter.
Your job is to generate a specific LaTeX code section for a resume, formatted EXACTLY using the template's LaTeX commands and environments, but filled with the candidate's actual content.

Critical Rules:
1. Output ONLY valid LaTeX code for the requested section. No markdown backticks, no prose, no explanations.
2. Maintain the template's exact LaTeX commands, environments, and formatting (e.g. \\begin{twocolentry}, \\begin{highlights}, \\item, \\textbf, \\textit, \\href, etc.).
3. Escape special LaTeX characters in text: & -> \\&, % -> \\%, $ -> \\$, # -> \\#, _ -> \\^, ~ -> \\~{}.
4. Do NOT output \\documentclass, \\begin{document}, or \\end{document}.
5. Fill in ALL relevant candidate items and bullet points provided.`;

async function generateSectionWithAI(
  provider: AIProvider,
  section: ParsedSection,
  candidateData: string,
  preamble: string,
  profile: ResumeProfile
): Promise<string> {
  // If candidate has no data for this section
  if (!candidateData.trim()) {
    if (section.category === 'BOILERPLATE') {
      return ''; // drop boilerplate instructions
    }
    // If no candidate data, keep original or omit
    return '';
  }

  if (section.category === 'HEADER') {
    const userPrompt = `
Here is the template's header LaTeX code:
\`\`\`latex
${section.originalBlock}
\`\`\`

Here is the candidate's actual personal information:
${candidateData}

Generate the replacement LaTeX code for the header, replacing the placeholder name, email, phone, location, and social links with the candidate's information.
Keep all icons, spacing, font styling, and layout environments exactly as they are in the template.
Output ONLY the LaTeX code.`;

    const res = await provider.generateText(SYSTEM_PROMPT, userPrompt);
    return res.replace(/^```(?:latex)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  }

  const userPrompt = `
Here is the template preamble context (do not repeat it in output):
\`\`\`latex
${preamble.slice(0, 500)}
\`\`\`

Here is the template's original LaTeX code for the [${section.title || section.name}] section (use its environments and macro structure as your pattern):
\`\`\`latex
${section.originalBlock.slice(0, 1200)}
\`\`\`

Here is the candidate's actual data for this section (with all optimization changes included):
${candidateData}

Generate the complete LaTeX code for this section (${section.title || section.name}) containing ALL candidate entries and bullet points, typeset in the template's exact LaTeX environments.
Output ONLY the LaTeX code for this section.`;

  const res = await provider.generateText(SYSTEM_PROMPT, userPrompt);
  return res.replace(/^```(?:latex)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

// ─── Deterministic Header Substitution ─────────────────────────────────────

function substituteHeaderValues(headerBlock: string, profile: ResumeProfile): string {
  const safe = (s?: string) => escapeLaTeX(s || '');
  let result = headerBlock;

  // Replace names
  if (profile.name) {
    result = result
      .replace(/John Doe/g, safe(profile.name))
      .replace(/Jane Smith/g, safe(profile.name))
      .replace(/Alex Johnson/g, safe(profile.name))
      .replace(/Dr\.\s*Morgan Lee/g, safe(profile.name))
      .replace(/YOUR NAME/g, safe(profile.name));
  }

  // Replace email
  if (profile.email) {
    result = result
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, safe(profile.email));
  }

  // Replace phone
  if (profile.phone) {
    result = result
      .replace(/\+?90-541-999-99-99/g, safe(profile.phone))
      .replace(/0541 999 99 99/g, safe(profile.phone))
      .replace(/\(?555\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, safe(profile.phone));
  }

  // Replace location
  if (profile.location) {
    result = result
      .replace(/Your Location/g, safe(profile.location))
      .replace(/New York,\s*NY/g, safe(profile.location))
      .replace(/Austin,\s*TX/g, safe(profile.location))
      .replace(/Seattle,\s*WA/g, safe(profile.location))
      .replace(/Boston,\s*MA/g, safe(profile.location))
      .replace(/Address,\s*YY,\s*XX/g, safe(profile.location));
  }

  return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Universal template injection:
 * Works on ANY LaTeX resume template (custom uploaded or built-in).
 * Injects candidate data with accepted AI changes into appropriate positions.
 */
export async function injectResumeIntoTemplate(
  provider: AIProvider,
  templateLatex: string,
  rawProfile: ResumeProfile,
  changes: Change[]
): Promise<string> {
  console.log('[Injector] Starting Universal LaTeX Resume Injection...');

  // 1. Prepare profile with accepted changes
  const updatedProfile = applyChangesToProfile(rawProfile, changes);

  // 2. Parse template sections
  const { preamble, sections, postamble } = parseLatexSections(templateLatex);
  console.log(`[Injector] Found ${sections.length} sections in template: ${sections.map(s => `${s.name} (${s.category})`).join(', ')}`);

  // If no sections could be identified at all, fall back to applying changes directly
  if (sections.length === 0) {
    console.warn('[Injector] No sections identified. Running direct substitutions.');
    let result = substituteHeaderValues(templateLatex, updatedProfile);
    if (Array.isArray(changes) && changes.length > 0) {
      result = applyChangesToLatex(result, changes);
    }
    return result;
  }

  // 3. Generate each section via AI
  const filledBlocks: string[] = [];

  for (const section of sections) {
    console.log(`[Injector] Processing section: ${section.name} [${section.category}]...`);

    if (section.category === 'BOILERPLATE') {
      // If candidate has a summary and no dedicated summary section exists, insert summary here
      const hasSummarySection = sections.some(s => s.category === 'SUMMARY');
      if (updatedProfile.summary && !hasSummarySection) {
        console.log('[Injector] Replacing boilerplate section with Candidate Summary');
        const summaryData = formatCandidateSectionData('SUMMARY', updatedProfile);
        try {
          const filled = await generateSectionWithAI(provider, { ...section, category: 'SUMMARY' }, summaryData, preamble, updatedProfile);
          if (filled.trim()) filledBlocks.push(filled);
        } catch {
          filledBlocks.push(`\\section{Professional Summary}\n${escapeLaTeX(updatedProfile.summary)}\n`);
        }
      } else {
        console.log('[Injector] Omitting template boilerplate section');
      }
      continue;
    }

    const candidateData = formatCandidateSectionData(section.category, updatedProfile);

    // If candidate has no data for this optional section (e.g. PUBLICATIONS)
    if (!candidateData.trim() && (section.category === 'PUBLICATIONS' || section.category === 'OTHER')) {
      console.log(`[Injector] No candidate data for optional section ${section.name}, omitting.`);
      continue;
    }

    try {
      const generated = await generateSectionWithAI(provider, section, candidateData, preamble, updatedProfile);
      if (generated && generated.trim()) {
        filledBlocks.push(generated);
        console.log(`[Injector] Successfully injected ${section.name} (${generated.length} chars)`);
      } else {
        // Fallback: use substituted original block
        const fallback = substituteHeaderValues(section.originalBlock, updatedProfile);
        filledBlocks.push(fallback);
      }
    } catch (err: any) {
      console.error(`[Injector] AI error for ${section.name}: ${err.message}. Using fallback.`);
      const fallback = substituteHeaderValues(section.originalBlock, updatedProfile);
      filledBlocks.push(fallback);
    }
  }

  // 4. Check if candidate has major sections that were NOT present in the template
  const presentCategories = new Set(sections.map(s => s.category));

  // If candidate has Projects but template had none
  if (!presentCategories.has('PROJECTS')) {
    const projData = formatCandidateSectionData('PROJECTS', updatedProfile);
    if (projData.trim()) {
      console.log('[Injector] Adding missing Projects section to template...');
      const expSection = sections.find(s => s.category === 'EXPERIENCE') || sections[0];
      try {
        const projGenerated = await generateSectionWithAI(
          provider,
          {
            name: 'PROJECTS',
            title: 'Projects',
            category: 'PROJECTS',
            startIndex: 0,
            endIndex: 0,
            originalBlock: expSection ? expSection.originalBlock : '\\section{Projects}',
          },
          projData,
          preamble,
          updatedProfile
        );
        if (projGenerated.trim()) filledBlocks.push(projGenerated);
      } catch {}
    }
  }

  // 5. Assemble final LaTeX document
  let finalLatex = preamble + '\n\n' + filledBlocks.join('\n\n') + '\n\n' + postamble;

  // 6. Guarantee: Apply accepted AI changes via fuzzy matcher
  if (Array.isArray(changes) && changes.length > 0) {
    console.log('[Injector] Applying accepted text changes directly to final LaTeX source...');
    finalLatex = applyChangesToLatex(finalLatex, changes);
  }

  console.log(`[Injector] Injection completed successfully. Output size: ${finalLatex.length} chars.`);
  return finalLatex;
}
