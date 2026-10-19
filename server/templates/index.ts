import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  filename: string;
  previewUrl: string;
  isMultiFile?: boolean;
}

/**
 * Normalizes a string for fuzzy matching (removes non-alphanumeric, lowercase).
 */
function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Converts a string into a clean, URL-safe ID.
 */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extracts human-readable title and description from LaTeX comments, or formats fallback.
 */
function getTemplateMetadata(filePath: string, fallbackName: string): { name: string; description: string } {
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').slice(0, 20);
      let name = '';
      let description = '';

      for (const line of lines) {
        const titleMatch = line.match(/^%\s*(?:Template|Title):\s*(.+)/i);
        if (titleMatch && !name) {
          name = titleMatch[1].trim();
        }
        const descMatch = line.match(/^%\s*Description:\s*(.+)/i);
        if (descMatch && !description) {
          description = descMatch[1].trim();
        }
      }

      if (name) {
        return {
          name,
          description: description || `Professional ${name} LaTeX resume layout.`,
        };
      }
    }
  } catch {}

  const cleanName = fallbackName
    .replace(/\.tex$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  return {
    name: cleanName,
    description: `Professional ${cleanName} LaTeX resume layout.`,
  };
}

/**
 * Finds a matching preview image in public/templates/.
 * Matches any extension (.png, .jpg, .jpeg, .webp, .svg), case-insensitive and punctuation-insensitive.
 */
function findPreviewUrl(templateKey: string, publicDir: string): string {
  try {
    if (!fs.existsSync(publicDir)) return '/templates/default-preview.svg';
    const files = fs.readdirSync(publicDir);
    const targetNorm = normalizeName(templateKey);

    // 1. Exact normalized match
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) continue;
      const base = path.basename(f, ext);
      if (normalizeName(base) === targetNorm) {
        return `/templates/${encodeURIComponent(f)}`;
      }
    }

    // 2. Substring or partial match
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext)) continue;
      const base = path.basename(f, ext);
      const baseNorm = normalizeName(base);
      if (baseNorm.includes(targetNorm) || targetNorm.includes(baseNorm)) {
        return `/templates/${encodeURIComponent(f)}`;
      }
    }
  } catch {}

  return '/templates/default-preview.svg';
}

/**
 * Dynamically scans the server/templates directory for all .tex files
 * and multi-file template directories.
 */
export function getAvailableTemplates(): TemplateInfo[] {
  const templatesDir = __dirname;
  const publicDir = path.resolve(__dirname, '../../public/templates');
  const results: TemplateInfo[] = [];

  if (!fs.existsSync(templatesDir)) return [];

  const items = fs.readdirSync(templatesDir);

  for (const item of items) {
    if (item === 'index.ts' || item === 'index.js' || item.startsWith('.')) continue;

    const itemPath = path.join(templatesDir, item);
    const stat = fs.statSync(itemPath);

    if (stat.isFile() && item.toLowerCase().endsWith('.tex')) {
      const baseName = item.replace(/\.tex$/i, '');
      const meta = getTemplateMetadata(itemPath, baseName);
      const previewUrl = findPreviewUrl(baseName, publicDir);

      results.push({
        id: slugify(baseName),
        name: meta.name,
        description: meta.description,
        filename: item,
        previewUrl,
        isMultiFile: false,
      });
    } else if (stat.isDirectory()) {
      const subFiles = fs.readdirSync(itemPath);
      const mainCandidates = ['main.tex', 'resume.tex', 'cv.tex', 'index.tex'];
      let mainFile = subFiles.find(f => mainCandidates.includes(f.toLowerCase()));
      if (!mainFile) {
        mainFile = subFiles.find(f => f.toLowerCase().endsWith('.tex'));
      }

      if (mainFile) {
        const meta = getTemplateMetadata(path.join(itemPath, mainFile), item);
        const previewUrl = findPreviewUrl(item, publicDir);

        results.push({
          id: slugify(item),
          name: meta.name,
          description: meta.description,
          filename: item, // directory name
          previewUrl,
          isMultiFile: true,
        });
      }
    }
  }

  // Prioritize primary built-ins first, then custom additions
  const priority = ['classic', 'modern', 'minimal', 'academic'];
  results.sort((a, b) => {
    const pA = priority.indexOf(a.id);
    const pB = priority.indexOf(b.id);
    if (pA !== -1 && pB !== -1) return pA - pB;
    if (pA !== -1) return -1;
    if (pB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  return results;
}

/**
 * Loads a template's LaTeX source code.
 * If the template is a multi-file directory, automatically inlines \input and \include files.
 */
export function loadTemplateSource(templateItem: string): string {
  const templatesDir = __dirname;
  const targetPath = path.join(templatesDir, templateItem);

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Template path not found: ${templateItem}`);
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    return fs.readFileSync(targetPath, 'utf8');
  }

  // Multi-file directory: find main entry file
  const subFiles = fs.readdirSync(targetPath);
  const mainCandidates = ['main.tex', 'resume.tex', 'cv.tex', 'index.tex'];
  let mainFile = subFiles.find(f => mainCandidates.includes(f.toLowerCase()));
  if (!mainFile) {
    mainFile = subFiles.find(f => f.toLowerCase().endsWith('.tex'));
  }

  if (!mainFile) {
    throw new Error(`No .tex entry file found in template directory: ${templateItem}`);
  }

  const mainFilePath = path.join(targetPath, mainFile);

  // Recursively inline \input and \include statements
  function inlineFile(filePath: string, visited = new Set<string>()): string {
    if (visited.has(filePath)) return '';
    visited.add(filePath);

    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(/\\(?:input|include)\{([^}]+)\}/g, (match, relPath) => {
      const candidates = [
        path.resolve(path.dirname(filePath), relPath),
        path.resolve(path.dirname(filePath), relPath + '.tex'),
        path.resolve(targetPath, relPath),
        path.resolve(targetPath, relPath + '.tex'),
      ];

      const found = candidates.find(c => fs.existsSync(c) && fs.statSync(c).isFile());
      if (found) {
        return `\n% --- INLINED: ${relPath} ---\n` + inlineFile(found, visited) + `\n% --- END INLINED ---\n`;
      }
      return match;
    });

    return content;
  }

  return inlineFile(mainFilePath);
}

// Dynamic proxy export for backwards compatibility
export const TEMPLATES = new Proxy([] as TemplateInfo[], {
  get(_target, prop) {
    const list = getAvailableTemplates();
    return (list as any)[prop];
  },
});
