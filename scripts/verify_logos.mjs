import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Minimal static server for dist/
const distDir = path.resolve('dist');

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html';
  if (ext === '.js') return 'application/javascript';
  if (ext === '.css') return 'text/css';
  if (ext === '.png') return 'image/png';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  let filePath = path.join(distDir, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, 'index.html');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': getMime(filePath) });
      res.end(data);
    }
  });
});

server.listen(4173, async () => {
  console.log('Server listening on http://localhost:4173');
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    // 1. Light Mode Verification
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
    // Ensure light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });

    const lightVisibility = await page.evaluate(() => {
      const lightImg = document.querySelector('.resumefit-logo-light');
      const darkImg = document.querySelector('.resumefit-logo-dark');
      const lightStyle = lightImg ? window.getComputedStyle(lightImg).display : null;
      const darkStyle = darkImg ? window.getComputedStyle(darkImg).display : null;
      return { lightStyle, darkStyle };
    });
    console.log('Light Mode display computed styles:', lightVisibility);

    // Screenshot navbar in light mode
    const navElem = await page.$('nav');
    if (navElem) {
      await navElem.screenshot({ path: 'public/navbar_live_light.png' });
    }

    // 2. Dark Mode Verification
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });

    const darkVisibility = await page.evaluate(() => {
      const lightImg = document.querySelector('.resumefit-logo-light');
      const darkImg = document.querySelector('.resumefit-logo-dark');
      const lightStyle = lightImg ? window.getComputedStyle(lightImg).display : null;
      const darkStyle = darkImg ? window.getComputedStyle(darkImg).display : null;
      return { lightStyle, darkStyle };
    });
    console.log('Dark Mode display computed styles:', darkVisibility);

    // Screenshot navbar in dark mode
    if (navElem) {
      await navElem.screenshot({ path: 'public/navbar_live_dark.png' });
    }

    await browser.close();
    server.close();
    console.log('Browser test complete! Screenshots saved to public/navbar_live_light.png and public/navbar_live_dark.png');
  } catch (err) {
    console.error('Puppeteer test failed:', err);
    server.close();
    process.exit(1);
  }
});
