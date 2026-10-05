/**
 * LatexCompiler - Compiles LaTeX source to PDF using the Texapi cloud service.
 * https://texapi.ovh — stateless REST API, no local LaTeX install required.
 *
 * The API accepts a POST with LaTeX JSON and responds directly with
 * the compiled PDF binary (Content-Type: application/pdf).
 *
 * Requires TEXAPI_KEY environment variable.
 */

const TEXAPI_COMPILE_URL = 'https://texapi.ovh/api/latex/compile';

/**
 * Compiles a LaTeX document string to a PDF buffer via Texapi.
 */
export async function compileLatexToPDF(
  latexSource: string,
  apiKey: string = process.env.TEXAPI_KEY || ''
): Promise<Buffer> {
  if (!apiKey) {
    throw new Error('TEXAPI_KEY is not set. Please add it to your .env file.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

  let response: Response;
  try {
    response = await fetch(TEXAPI_COMPILE_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: latexSource }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(`Texapi compile failed (${response.status}): ${text.substring(0, 300)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/pdf')) {
    const body = await response.text().catch(() => '');
    throw new Error(`Texapi returned non-PDF response (${contentType}): ${body.substring(0, 300)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
