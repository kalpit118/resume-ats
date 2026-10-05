import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

async function test() {
  try {
    fs.writeFileSync('dummy.pdf', '%PDF-1.4\n%EOF\n');
    const dataBuffer = fs.readFileSync('dummy.pdf');
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    console.log("Success:", data.text);
  } catch (err) {
    console.error("Caught Error:", err);
  }
}
test();
