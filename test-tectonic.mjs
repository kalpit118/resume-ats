import pkg from 'node-tectonic';
const { compile } = pkg;
import fs from 'fs';

async function test() {
  const tex = `\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}`;
  try {
    const pdfBuffer = await compile({ tex });
    fs.writeFileSync('test.pdf', pdfBuffer);
    console.log('Success! Saved test.pdf');
  } catch (err) {
    console.error('Failed to compile:', err);
  }
}

test();
