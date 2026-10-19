import { Router, Request, Response } from 'express';
/*
// ============================================================================
// [ARCHIVED / DEPRECATED] Puppeteer PDF Exporter
// Historical Context:
//   Used to convert markdown to basic HTML and print to PDF via headless Chrome.
// Deactivated In Favor Of:
//   Texapi cloud LaTeX compiler (compileLatexToPDF) and LaTeX templates.
// ============================================================================
import { PDFExporter } from '../engines/export/PDFExporter.js';
*/
import { TXTExporter } from '../engines/export/TXTExporter.js';
import { MarkdownExporter } from '../engines/export/MarkdownExporter.js';
import { compileLatexToPDF } from '../engines/export/LatexCompiler.js';
import { applyChangesToLatex } from '../engines/export/applyLatexChanges.js';
import { injectResumeIntoTemplate } from '../engines/export/latexTemplateInjector.js';
import { getAvailableTemplates, loadTemplateSource } from '../templates/index.js';
import { getAIProvider } from '../providers/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ── GET /api/export/templates — dynamically list available templates ─────────
router.get('/templates', (_req: Request, res: Response) => {
  try {
    const templates = getAvailableTemplates();
    res.json({ templates });
  } catch (err: any) {
    console.error('[Export] Error listing templates:', err);
    res.status(500).json({ error: 'Failed to list templates', details: err.message });
  }
});

// ── POST /api/export — main export handler ────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { format, resumeContent, template } = req.body;
    
    if (!resumeContent) {
      return res.status(400).json({ error: 'Resume content required for export' });
    }

    let result;
    
    switch (format?.toUpperCase()) {
      case 'TXT':
        result = await new TXTExporter().export({ resumeContent, template });
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.txt');
        return res.send(result);
        
      case 'MARKDOWN':
      case 'MD':
        result = await new MarkdownExporter().export({ resumeContent, template });
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.md');
        return res.send(result);
        
      case 'PDF':
      default: {
        const { rawLatex, templateId, customLatex, changes, aiProvider: providerName, apiKey, aiModel } = req.body;
        
        console.log(
          '[Export] PDF request — rawLatex:', !!rawLatex,
          '| templateId:', templateId || 'none',
          '| customLatex:', !!customLatex,
          '| TEXAPI_KEY set:', !!process.env.TEXAPI_KEY,
          '| changes:', changes?.length ?? 0
        );

        // ── Path A: .tex file uploaded (existing LaTeX) ─────────────────────
        if (rawLatex) {
          console.log('[Export] Path A: Direct LaTeX compile (rawLatex source)');
          let latexToCompile: string = rawLatex;
          if (Array.isArray(changes) && changes.length > 0) {
            latexToCompile = applyChangesToLatex(latexToCompile, changes);
          }
          const pdfBuffer = await compileLatexToPDF(latexToCompile);
          console.log('[Export] LaTeX compiled, size:', pdfBuffer.length, 'bytes');
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
          return res.send(pdfBuffer);
        }

        // ── Path B: Template-based export (Primary flow for all inputs) ────
        // Smart fallback: If templateId is not provided and no customLatex was given,
        // automatically resolve to the default available template so PDF generation
        // always succeeds using our high-fidelity LaTeX engine.
        const allTemplates = getAvailableTemplates();
        const resolvedTemplateId = templateId || (!customLatex ? (allTemplates[0]?.id || 'SWE_Resume') : undefined);

        if (resolvedTemplateId || customLatex) {
          console.log('[Export] Path B: Template-based export (Template:', resolvedTemplateId || 'Custom', ')');

          let templateLatex: string;

          if (customLatex) {
            // User uploaded their own .tex file (passed as string from frontend)
            templateLatex = customLatex;
            console.log('[Export] Using custom uploaded LaTeX template');
          } else {
            // Built-in or dynamically discovered template
            const templateInfo = allTemplates.find(t => t.id === resolvedTemplateId || t.filename === resolvedTemplateId);
            if (!templateInfo) {
              return res.status(400).json({ error: `Unknown template id: ${resolvedTemplateId}` });
            }
            templateLatex = loadTemplateSource(templateInfo.filename);
            console.log('[Export] Loaded template:', templateInfo.name);
          }

          // Initialise AI provider for template injection
          const provider = getAIProvider({
            provider: providerName || process.env.DEFAULT_AI_PROVIDER || 'groq',
            apiKey: apiKey || process.env.GROQ_API_KEY || '',
            model: aiModel || process.env.DEFAULT_AI_MODEL || 'llama-3.1-8b-instant',
          });

          // Inject candidate data into template via AI
          const filledLatex = await injectResumeIntoTemplate(
            provider,
            templateLatex,
            resumeContent,
            Array.isArray(changes) ? changes : []
          );

          // Compile to PDF via Texapi
          if (!process.env.TEXAPI_KEY) {
            return res.status(500).json({
              error: 'TEXAPI_KEY is not set. Please add it to your .env file to enable PDF compilation.'
            });
          }
          const pdfBuffer = await compileLatexToPDF(filledLatex);
          console.log('[Export] Template PDF compiled, size:', pdfBuffer.length, 'bytes');
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
          return res.send(pdfBuffer);
        }

        /*
        // ============================================================================
        // [ARCHIVED / DEPRECATED] Path C: Legacy PyMuPDF in-place edit (PDF original)
        // ============================================================================
        // Historical Context:
        //   Ran Python script `edit_pdf.py` via child_process to alter binary PDFs in-place.
        //
        // Why Deactivated:
        //   - Replaced by high-fidelity LaTeX templating (Path B) via Texapi.
        //   - Eliminates Python runtime and C-extension (PyMuPDF / fitz) dependencies.
        //
        // To Re-enable:
        //   1. Uncomment the block below.
        //   2. Ensure Python 3 and PyMuPDF (`pip install PyMuPDF`) are available.
        //   3. Pass `originalPdfPath` in the export request payload.
        // ============================================================================
        if (req.body.originalPdfPath) {
          console.log('[Export] Path C: Legacy PyMuPDF edit (fallback)');
          const { execFile } = await import('child_process');
          const { promisify } = await import('util');
          const execFileAsync = promisify(execFile);
          
          const inputPdfPath = path.join(process.cwd(), 'uploads', req.body.originalPdfPath);
          const tempOutputPdfPath = path.join(process.cwd(), 'uploads', `edited_${Date.now()}.pdf`);
          const tempChangesPath = path.join(process.cwd(), 'uploads', `changes_${Date.now()}.json`);
          
          try {
            fs.writeFileSync(tempChangesPath, JSON.stringify(changes || []));
            const scriptPath = path.join(process.cwd(), 'server', 'engines', 'export', 'edit_pdf.py');
            await execFileAsync('python', [scriptPath, inputPdfPath, tempOutputPdfPath, tempChangesPath]);
            const pdfBuffer = fs.readFileSync(tempOutputPdfPath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
            return res.send(pdfBuffer);
          } finally {
            if (fs.existsSync(tempOutputPdfPath)) fs.unlinkSync(tempOutputPdfPath);
            if (fs.existsSync(tempChangesPath)) fs.unlinkSync(tempChangesPath);
          }
        }
        // ============================================================================
        */

        /*
        // ============================================================================
        // [ARCHIVED / DEPRECATED] Path D: Puppeteer HTML-to-PDF fallback
        // ============================================================================
        // Historical Context:
        //   Rendered markdown to HTML and converted to PDF using a headless Chromium
        //   browser via Puppeteer.
        //
        // Why Deactivated:
        //   - Superseded by LaTeX templates + Texapi cloud service.
        //   - Eliminates need for 300MB+ Chromium binary and system graphics/fonts libs.
        //
        // To Re-enable:
        //   1. Uncomment `import { PDFExporter } ...` at the top of this file.
        //   2. Uncomment the block below.
        // ============================================================================
        console.log('[Export] Path D: Puppeteer HTML-to-PDF fallback');
        result = await new PDFExporter().export({ resumeContent, template });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
        return res.send(result);
        // ============================================================================
        */

        return res.status(400).json({
          error: 'No valid LaTeX source or template could be found for PDF generation.'
        });
      }
    }

  } catch (error: any) {
    console.error('[Export] Error:', error);
    try {
      fs.appendFileSync('error.log', new Date().toISOString() + ' - Export error: ' + (error.stack || error) + '\n');
    } catch (e) {}
    res.status(500).json({ error: 'Failed to export document', details: error.message });
  }
});

export default router;
