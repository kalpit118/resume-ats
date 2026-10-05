// A simple list of common tech and soft skills to extract if AI isn't available
const commonSkills = [
  "javascript", "typescript", "react", "node.js", "python", "java", "c++", "c#",
  "aws", "gcp", "azure", "docker", "kubernetes", "sql", "postgresql", "mongodb",
  "html", "css", "git", "linux", "agile", "scrum", "rest api", "graphql", "machine learning"
];

/**
 * Local/Fallback JD Parser.
 * Uses naive keyword extraction based on a predefined dictionary.
 */
export const extractKeywordsLocal = (text: string): string[] => {
  const textLower = text.toLowerCase();
  const extracted = new Set<string>();

  for (const skill of commonSkills) {
    if (textLower.includes(skill)) {
      extracted.add(skill);
    }
  }

  return Array.from(extracted);
};
