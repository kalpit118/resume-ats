import { Router, Request, Response } from 'express';
import { PDFExporter } from '../engines/export/PDFExporter.js';
import { TXTExporter } from '../engines/export/TXTExporter.js';
import { MarkdownExporter } from '../engines/export/MarkdownExporter.js';
import { compileLatexToPDF } from '../engines/export/LatexCompiler.js';
import { applyChangesToLatex } from '../engines/export/applyLatexChanges.js';

const router = Router();

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
      default:
        console.log('[Export] PDF request. rawLatex present:', !!req.body.rawLatex, '| TEXAPI_KEY set:', !!process.env.TEXAPI_KEY, '| changes:', req.body.changes?.length ?? 0);
        if (req.body.rawLatex) {
          console.log('[Export] Attempting LaTeX compilation via Texapi...');
          // Apply accepted changes to the LaTeX source before compilation
          let latexToCompile: string = req.body.rawLatex;
          if (Array.isArray(req.body.changes) && req.body.changes.length > 0) {
            latexToCompile = applyChangesToLatex(latexToCompile, req.body.changes);
          }
          console.log('[Export] LaTeX source preview (first 500 chars):\n', latexToCompile.substring(0, 500));
          const pdfBuffer = await compileLatexToPDF(latexToCompile);
          console.log('[Export] LaTeX compiled successfully, PDF size:', pdfBuffer.length, 'bytes');
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
          return res.send(pdfBuffer);
        } else if (req.body.originalPdfPath) {
          console.log('[Export] originalPdfPath present — attempting in-place PyMuPDF edit.');
          const path = await import('path');
          const fs = await import('fs');
          const { execFile } = await import('child_process');
          const { promisify } = await import('util');
          const execFileAsync = promisify(execFile);
          
          const inputPdfPath = path.join(process.cwd(), 'uploads', req.body.originalPdfPath);
          const tempOutputPdfPath = path.join(process.cwd(), 'uploads', `edited_${Date.now()}.pdf`);
          const tempChangesPath = path.join(process.cwd(), 'uploads', `changes_${Date.now()}.json`);
          
          try {
            // Write changes to temp file
            fs.writeFileSync(tempChangesPath, JSON.stringify(req.body.changes || []));
            
            // Call Python script
            const scriptPath = path.join(process.cwd(), 'server', 'engines', 'export', 'edit_pdf.py');
            await execFileAsync('python', [scriptPath, inputPdfPath, tempOutputPdfPath, tempChangesPath]);
            
            // Read back the edited PDF
            const pdfBuffer = fs.readFileSync(tempOutputPdfPath);
            console.log('[Export] PyMuPDF edited successfully, size:', pdfBuffer.length);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
            res.send(pdfBuffer);
          } finally {
            // Cleanup temp files
            if (fs.existsSync(tempOutputPdfPath)) fs.unlinkSync(tempOutputPdfPath);
            if (fs.existsSync(tempChangesPath)) fs.unlinkSync(tempChangesPath);
          }
          return;
        } else {
          console.log('[Export] No rawLatex or originalPdfPath — using standard PDF exporter.');
        }
        
        // Default or fallback PDF exporter (Puppeteer HTML-to-PDF)
        result = await new PDFExporter().export({ resumeContent, template });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
        return res.send(result);
    }

  } catch (error: any) {
    console.error('Export error:', error);
    try {
      (await import('fs')).appendFileSync('error.log', new Date().toISOString() + ' - Export error: ' + (error.stack || error) + '\n');
    } catch (e) {}
    res.status(500).json({ error: 'Failed to export document', details: error.message });
  }
});

export default router;
