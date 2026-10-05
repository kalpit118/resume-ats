import { PDFExporter } from './server/engines/export/PDFExporter.js';

async function test() {
  const exporter = new PDFExporter();
  try {
    console.log('Testing PDF exporter...');
    await exporter.export({ resumeContent: 'Test', template: 'test' });
    console.log('Success!');
  } catch (err) {
    console.error('Error in PDFExporter:', err);
  }
}

test();
