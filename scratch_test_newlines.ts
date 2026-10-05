function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const latexSource = "\\item{Built standout projects}";
const original = "Built standout projects";
const optimized = "Developed great apps";

const words = original.trim().split(/[^a-zA-Z0-9]+/).filter(w => w.length >= 1);
const texMid = '[^a-zA-Z0-9]*(?:\\\\[a-zA-Z]+(?:\\{[^}]*\\})?|\\})*[^a-zA-Z0-9]*';
const pattern = words.map(escapeRegex).join(texMid);
const regex = new RegExp(pattern, 's');

console.log(latexSource.replace(regex, optimized));
