import { Request, Response } from 'express';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
import { extractKeywordsLocal } from '../engines/jd-parser/local.js';
import { extractKeywordsAI } from '../engines/jd-parser/ai.js';
import { performMatching } from '../engines/matching/index.js';
import { calculateScore } from '../engines/score/index.js';
import { getAIProvider } from '../providers/index.js';
import { generateOptimizationPlan } from '../engines/optimization/index.js';
import { validateChanges } from '../engines/evidence/index.js';
import { stripLatexFormatting } from '../engines/export/applyLatexChanges.js';

export const processUpload = async (req: Request, res: Response) => {
  try {
    const jdText = req.body.jdText;
    const rules = req.body.rules ? JSON.parse(req.body.rules) : {};
    
    let resumeText = req.body.resumeText || '';
    // rawLatex is ONLY set when a .tex file is uploaded — this is the source of truth
    // for whether LaTeX export is available. We keep it separate from resumeText (plain text
    // for AI) so PDF uploads never accidentally trigger LaTeX export.
    let rawLatex: string | null = null;

    if (req.file) {
      const filePath = req.file.path;
      const mimetype = req.file.mimetype;
      const isTexFile = mimetype === 'text/x-tex'
        || mimetype === 'application/x-tex'
        || req.file.originalname.toLowerCase().endsWith('.tex');

      try {
        if (mimetype === 'application/pdf') {
          const dataBuffer = fs.readFileSync(filePath);
          const parser = new PDFParse({ data: dataBuffer });
          const data = await parser.getText();
          resumeText = data.text;
        } else if (
          mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          mimetype === 'application/msword'
        ) {
          const result = await mammoth.extractRawText({ path: filePath });
          resumeText = result.value;
        } else if (mimetype === 'text/plain' || isTexFile) {
          resumeText = fs.readFileSync(filePath, 'utf8');
          // Preserve the raw LaTeX source for compilation during export
          if (isTexFile) {
            rawLatex = resumeText;
          }
        } else {
          return res.status(400).json({ error: 'Unsupported file format: ' + mimetype });
        }
      } finally {
        /*
        // ============================================================================
        // [LEGACY FILE RETENTION] Formerly preserved PDFs on disk for edit_pdf.py
        // ============================================================================
        // if (mimetype !== 'application/pdf' && fs.existsSync(filePath)) {
        //   fs.unlinkSync(filePath);
        // }
        // ============================================================================
        */
        // Clean up all temporary uploaded files immediately to prevent disk leaks.
        // Since resume data is parsed in memory and exports compile LaTeX templates
        // via Texapi, local PDF binaries no longer need to persist on disk.
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (unlinkErr) {
          console.error('Failed to clean up uploaded file:', unlinkErr);
        }
      }
    }

    if (!resumeText) {
      return res.status(400).json({ error: 'No resume provided' });
    }

    if (!jdText) {
      return res.status(400).json({ error: 'No job description provided' });
    }

    // Setup AI Provider early so we can use it for both JD parsing and optimization
    const providerConfig = {
      provider: req.body.aiProvider,
      apiKey: req.body.aiApiKey,
      model: req.body.aiModel
    };
    const provider = getAIProvider(providerConfig);

    // PHASE 2 Pipeline:
    // 1. Extract Keywords from JD
    let jdRequirements: string[] = [];
    try {
      jdRequirements = await extractKeywordsAI(provider, jdText);
    } catch (e) {
      console.warn("Falling back to local keyword extraction...");
      jdRequirements = extractKeywordsLocal(jdText);
    }

    
    // 2. Perform Matching
    const matches = performMatching(jdRequirements, resumeText);
    
    // 3. Calculate Score
    const scoreBreakdown = calculateScore(matches);

// PHASE 4: AI Optimization & Evidence Guard
    
    // Generate the rewrite plan
    // If it's a LaTeX file, we must clean it up first before passing it to the AI to prevent 
    // it from hallucinating structural tags (like egin{highlights}) into its text extraction.
    const cleanResumeText = rawLatex ? stripLatexFormatting(resumeText) : resumeText;
    
    const matchedKeywords = matches.filter((m: any) => m.status === 'matched').map((m: any) => m.requirement);
    const missingKeywords = matches.filter((m: any) => m.status === 'missing').map((m: any) => m.requirement);

    const optimizationResult = await generateOptimizationPlan(provider, {
      resumeText: cleanResumeText,
      jdText,
      rules,
      matchedKeywords,
      missingKeywords,
      jobMatchScore: scoreBreakdown.score
    });

    // Run changes through Evidence Guard
    // Sanitize the plan first: remove fabricated new sections, invalid entries, and no-op changes
    const sanitizedPlan = (optimizationResult.optimizationPlan || []).filter((change: any) => {
      // Must have a string original that is not empty (no fabricated additions)
      if (typeof change.original !== 'string' || !change.original.trim()) return false;
      // Must have a string optimized
      if (typeof change.optimized !== 'string' || !change.optimized.trim()) return false;

      // Omit changes where original and optimized are identical (no actual change made)
      const cleanOrig = stripLatexFormatting(change.original).trim();
      const cleanOpt = stripLatexFormatting(change.optimized).trim();
      if (cleanOrig === cleanOpt) {
        console.warn(`[Sanitize] Skipping unchanged entry: "${cleanOrig.substring(0, 60)}"`);
        return false;
      }

      // Reject if section is 'new_section' or contains a dot (sub-section fabrication like 'technologies.tools')
      const sec = (change.section || '').toLowerCase().trim();
      if (sec === 'new_section' || sec === '') return false;
      // Allow dot-notation only as display label, but skip changes that add new top-level sections
      // by checking if the original text actually appears in the resume
      const cleanSearch = stripLatexFormatting(change.original).toLowerCase().substring(0, 20).trim();
      const rawSearch = change.original.toLowerCase().substring(0, 20).trim();
      const inClean = cleanResumeText.toLowerCase().includes(cleanSearch) || cleanResumeText.toLowerCase().includes(rawSearch);
      const inRaw = resumeText.toLowerCase().includes(cleanSearch) || resumeText.toLowerCase().includes(rawSearch);

      if (!inClean && !inRaw) {
        console.warn(`[Sanitize] Skipping change — original not found in resume: "${change.original.substring(0, 60)}"`);
        return false;
      }
      return true;
    });

    const proposedChanges = sanitizedPlan.map((change: any) => ({
      section: change.section,
      originalText: change.original,
      newText: change.optimized
    }));

    let validations: any[] = [];
    if (proposedChanges.length > 0) {
      try {
        const validationResponse = await validateChanges(provider, {
          originalResumeText: resumeText,
          proposedChanges
        });
        validations = validationResponse.validations || [];
      } catch (err) {
        console.error('Validation Error:', err);
        validations = proposedChanges.map(() => ({ isValid: false, reasoning: 'Validation error (e.g. rate limit)', requiresUserConfirmation: true }));
      }
    }

    const validatedPlan = sanitizedPlan.map((change: any, index: number) => ({
      ...change,
      // Store raw strings in case needed for literal LaTeX replacement,
      // but ensure original and optimized are stripped of LaTeX commands for UI display
      rawOriginal: change.original,
      rawOptimized: change.optimized,
      original: stripLatexFormatting(change.original),
      optimized: stripLatexFormatting(change.optimized),
      validation: validations[index] || { isValid: false, reasoning: 'Validation failed or missing', requiresUserConfirmation: true }
    })).filter((item: any) => item.original.trim() !== item.optimized.trim());

    // Clean LaTeX commands from parsed profile so editor & manual fields are readable plain text
    const cleanProfile = (prof: any) => {
      if (!prof) return prof;
      const clean = JSON.parse(JSON.stringify(prof));
      if (clean.summary) clean.summary = stripLatexFormatting(clean.summary);
      if (Array.isArray(clean.sections)) {
        clean.sections = clean.sections.map((sec: any) => {
          if (!sec || !Array.isArray(sec.items)) return sec;
          sec.items = sec.items.map((item: any) => {
            if (item.title) item.title = stripLatexFormatting(item.title);
            if (item.subtitle) item.subtitle = stripLatexFormatting(item.subtitle);
            if (item.content) item.content = stripLatexFormatting(item.content);
            if (Array.isArray(item.bullets)) {
              item.bullets = item.bullets.map((b: string) => stripLatexFormatting(b));
            }
            return item;
          });
          return sec;
        });
      }
      return clean;
    };

    res.json({
      success: true,
      data: {
        scoreBreakdown,
        matches,
        providerUsed: provider.getProviderName(),
        validatedPlan,
        profile: cleanProfile(optimizationResult.profile),
        rawText: resumeText,
        // rawLatex is non-null only when a .tex file was uploaded — used for LaTeX-to-PDF export
        rawLatex: rawLatex ?? undefined,
        isLatexSource: rawLatex !== null,
        /*
        // ============================================================================
        // [ARCHIVED] originalPdfPath was previously used for legacy edit_pdf.py
        // ============================================================================
        // originalPdfPath: req.file && req.file.mimetype === 'application/pdf' ? req.file.filename : undefined,
        // ============================================================================
        */
        originalPdfPath: undefined,
        message: 'Phase 4: AI Optimization & Evidence Guard executed',
      }
    });

  } catch (error: any) {
    console.error('Error processing upload:', error);
    fs.appendFileSync('error.log', new Date().toISOString() + ' - ' + (error.stack || error) + '\n');
    
    let errorMessage = 'Internal server error processing the files';
    if (error.message) {
      if (error.name === 'AbortError' || error.message.includes('timed out') || error.message.includes('stream timeout') || error.message.includes('UND_ERR_INFO')) {
        errorMessage = error.message.includes('NIM API request') ? error.message : 'AI provider request timed out. Please try again or switch to a faster model.';
      } else if (error.message.includes('404') || error.message.includes('Not Found') || error.message.includes('Not found for account')) {
        errorMessage = 'Model not found or not available for your account. Please select a different model in AI Configuration.';
      } else if (error.message.includes('401') || error.message.includes('403') || error.message.includes('invalid_api_key')) {
        errorMessage = 'Invalid API Key. Please check your AI provider API key and ensure it has access to the selected model.';
      } else if (error.message.includes('429') || error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded for the AI provider. Please try again later or check your billing.';
      } else if (error.message.includes('API') || error.message.includes('JSON')) {
        errorMessage = 'AI Provider Error: ' + error.message;
      } else if (error.name === 'InvalidPDFException') {
        errorMessage = 'Invalid PDF file. Please upload a valid document.';
      }
    }
    
    res.status(500).json({ error: errorMessage });
  }
};
