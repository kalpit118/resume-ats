import { Exporter, ExportRequest } from './Exporter.js';

export class TXTExporter implements Exporter {
  async export(request: ExportRequest): Promise<string> {
    const data = request.resumeContent;
    let output = '';

    if (data.name) output += `${data.name}\n`;
    if (data.email || data.phone || data.location) {
      const contactParts = [data.email, data.phone, data.location].filter(Boolean);
      output += `${contactParts.join(' | ')}\n\n`;
    }

    if (data.summary) {
      output += `SUMMARY\n--------------------------\n${data.summary}\n\n`;
    }

    // Dynamic sections (projects, skills, education, certifications, etc.)
    if (data.sections && data.sections.length > 0) {
      for (const sec of data.sections) {
        if (sec.name.toLowerCase() === 'summary') continue; // already handled
        output += `${sec.name.toUpperCase()}\n--------------------------\n`;
        if (sec.items) {
          for (const item of sec.items) {
            if (item.title) {
              const titleLine = item.subtitle ? `${item.title} | ${item.subtitle}` : item.title;
              output += `${titleLine}\n`;
            }
            if (item.bullets && item.bullets.length > 0) {
              for (const bullet of item.bullets) {
                if (bullet.trim()) output += `- ${bullet}\n`;
              }
            }
            if (item.content) {
              output += `${item.content}\n`;
            }
            output += '\n';
          }
        }
      }
    } else if (data.experience && data.experience.length > 0) {
      // Legacy fallback
      output += `EXPERIENCE\n--------------------------\n`;
      for (const exp of data.experience) {
        output += `${exp.role} at ${exp.company}\n`;
        if (exp.bullets) {
          for (const bullet of exp.bullets) {
            output += `- ${bullet}\n`;
          }
        }
        output += '\n';
      }
    }

    return output;
  }
}
