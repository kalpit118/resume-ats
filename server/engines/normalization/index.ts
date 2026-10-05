export const aliasDictionary: Record<string, string[]> = {
  "node.js": ["nodejs", "node js", "node.js", "node"],
  "react": ["reactjs", "react.js"],
  "javascript": ["js", "es6", "vanilla js"],
  "typescript": ["ts"],
  "python": ["python3", "py"],
  "amazon web services": ["aws"],
  "google cloud platform": ["gcp"],
  "kubernetes": ["k8s"],
  "postgresql": ["postgres", "psql"],
  "c++": ["cpp", "c plus plus"],
  "c#": ["csharp", "c sharp"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "ui/ux": ["ux/ui", "ui", "ux", "user interface", "user experience"]
};

/**
 * Normalizes a keyword based on the alias dictionary.
 * If no alias is found, it returns the lowercase, trimmed version.
 */
export const normalizeKeyword = (keyword: string): string => {
  const normalized = keyword.toLowerCase().trim();
  
  for (const [canonical, aliases] of Object.entries(aliasDictionary)) {
    if (canonical === normalized || aliases.includes(normalized)) {
      return canonical;
    }
  }
  
  return normalized;
};
