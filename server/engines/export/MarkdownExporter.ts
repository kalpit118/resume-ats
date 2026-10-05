import { Exporter, ExportRequest } from './Exporter.js';

export class MarkdownExporter implements Exporter {
  async export(request: ExportRequest): Promise<string> {
    const data = request.resumeContent;
    let output = '';

    if (data.name) output += `# ${data.name}\n\n`;

    const contactParts = [
      data.email && `**Email:** ${data.email}`,
      data.phone && `**Phone:** ${data.phone}`,
      data.location && `**Location:** ${data.location}`
    ].filter(Boolean);
    if (contactParts.length > 0) output += `${contactParts.join(' | ')}\n\n`;

    if (data.summary) {
      output += `## Summary\n\n${data.summary}\n\n`;
    }

    // Dynamic sections (projects, skills, education, certifications, etc.)
    if (data.sections && data.sections.length > 0) {
      for (const sec of data.sections) {
        if (sec.name.toLowerCase() === 'summary') continue; // already handled
        output += `## ${sec.name}\n\n`;
        if (sec.items) {
          for (const item of sec.items) {
            if (item.title) {
              const heading = item.subtitle ? `### ${item.title} — ${item.subtitle}` : `### ${item.title}`;
              output += `${heading}\n\n`;
            }
            if (item.bullets && item.bullets.length > 0) {
              for (const bullet of item.bullets) {
                if (bullet.trim()) output += `- ${bullet}\n`;
              }
              output += '\n';
            }
            if (item.content) {
              output += `${item.content}\n\n`;
            }
          }
        }
      }
    } else if (data.experience && data.experience.length > 0) {
      // Legacy fallback
      output += `## Experience\n\n`;
      for (const exp of data.experience) {
        output += `### ${exp.role} @ ${exp.company}\n\n`;
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
