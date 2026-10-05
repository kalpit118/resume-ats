import { Request, Response } from 'express';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
import { extractKeywordsLocal } from '../engines/jd-parser/local.js';
import { performMatching } from '../engines/matching/index.js';
import { calculateScore } from '../engines/score/index.js';
import { getAIProvider } from '../providers/index.js';
import { generateOptimizationPlan } from '../engines/optimization/index.js';
import { validateChanges } from '../engines/evidence/index.js';

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
        // Clean up uploaded file
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (unlinkErr) {
          console.error('Failed to clean up file:', unlinkErr);
        }
      }
    }

    if (!resumeText) {
      return res.status(400).json({ error: 'No resume provided' });
    }

    if (!jdText) {
      return res.status(400).json({ error: 'No job description provided' });
    }

    // PHASE 2 Pipeline:
    // 1. Extract Keywords from JD
    const jdRequirements = extractKeywordsLocal(jdText);
    
    // 2. Perform Matching
    const matches = performMatching(jdRequirements, resumeText);
    
    // 3. Calculate Score
    const scoreBreakdown = calculateScore(matches);

    // PHASE 4: AI Optimization & Evidence Guard
    const providerConfig = {
      provider: req.body.aiProvider,
      apiKey: req.body.aiApiKey,
      model: req.body.aiModel
    };
    const provider = getAIProvider(providerConfig);
    
    // Generate the rewrite plan
    const optimizationResult = await generateOptimizationPlan(provider, {
      resumeText,
      jdText,
      rules
    });

    // Run changes through Evidence Guard
    // Sanitize the plan first: remove fabricated new sections and invalid entries
    const sanitizedPlan = (optimizationResult.optimizationPlan || []).filter((change: any) => {
      // Must have a string original that is not empty (no fabricated additions)
      if (typeof change.original !== 'string' || !change.original.trim()) return false;
      // Must have a string optimized
      if (typeof change.optimized !== 'string' || !change.optimized.trim()) return false;
      // Reject if section is 'new_section' or contains a dot (sub-section fabrication like 'technologies.tools')
      const sec = (change.section || '').toLowerCase().trim();
      if (sec === 'new_section' || sec === '') return false;
      // Allow dot-notation only as display label, but skip changes that add new top-level sections
      // by checking if the original text actually appears in the resume
      if (!resumeText.toLowerCase().includes(change.original.toLowerCase().substring(0, 20).trim())) {
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
      validation: validations[index] || { isValid: false, reasoning: 'Validation failed or missing', requiresUserConfirmation: true }
    }));

    res.json({
      success: true,
      data: {
        scoreBreakdown,
        matches,
        providerUsed: provider.getProviderName(),
        validatedPlan,
        profile: optimizationResult.profile,
        rawText: resumeText,
        // rawLatex is non-null only when a .tex file was uploaded — used for LaTeX-to-PDF export
        rawLatex: rawLatex ?? undefined,
        isLatexSource: rawLatex !== null,
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
