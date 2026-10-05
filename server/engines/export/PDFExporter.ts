import { Exporter, ExportRequest } from './Exporter.js';
import puppeteer from 'puppeteer';
import { MarkdownExporter } from './MarkdownExporter.js';

export class PDFExporter implements Exporter {
  async export(request: ExportRequest): Promise<Buffer> {
    // For a real implementation, we would render a React component to HTML string or use a Handlebars template
    // Here we generate Markdown, convert to basic HTML, and use Puppeteer to print it to PDF
    
    const mdExporter = new MarkdownExporter();
    const markdown = await mdExporter.export(request);
    
    // Naive MD to HTML for the MVP
    let html = markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\n\n/gim, '<br />');
    
    // Wrap in Swiss Modernism CSS stub
    html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #000; max-width: 800px; margin: 0 auto; padding: 40px; }
            h1 { font-size: 24px; font-weight: 700; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
            h2 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 32px; margin-bottom: 8px; border-bottom: 1px solid #e0e0e0; }
            h3 { font-size: 14px; font-weight: 700; margin-top: 16px; }
            li { font-size: 13px; margin-bottom: 4px; }
            p { font-size: 13px; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    return Buffer.from(pdfBuffer);
  }
}
