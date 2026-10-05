import { applyChangesToLatex } from './server/engines/export/applyLatexChanges.js';

const latex = `
\\section{Summary}
I am a versatile Full Stack Web Developer with strong expertise in HTML, CSS, JavaScript, React, Node.js, Express, and MongoDB. Skilled in C, C++, Python, and proficient with Git, and Figma. Built standout projects including a memory game with leaderboard, personal portfolio website, and a responsive Spotify UI clone. Dedicated to building visually appealing, high-performance web applications and continuously honing skills. Collaborative, creative, and driven by user-focused design.
`;

const original = "I am a versatile Full Stack Web Developer with strong expertise in HTML, CSS, JavaScript, React, Node.js, Express, and MongoDB. Skilled in C, C++, Python, and proficient with Git, and Figma. Built standout projects including a memory game with leaderboard, personal portfolio website, and a responsive Spotify UI clone. Dedicated to building visually appealing, high-performance web applications and continuously honing skills. Collaborative, creative, and driven by user-focused design.";
const optimized = "Full-Stack Web Developer with solid experience...";

const res = applyChangesToLatex(latex, [{original, optimized, accepted: true}]);
console.log(res !== latex ? 'SUCCESS' : 'FAILED');
