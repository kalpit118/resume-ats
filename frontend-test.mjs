import puppeteer from 'puppeteer-core';

async function takeScreenshot() {
  const browser = await puppeteer.launch({
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1024 });
  await page.goto('http://localhost:5173');
  
  // Click the button
  await page.click('button:has-text("Run Optimization Engine")');
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'frontend-test.png' });
  await browser.close();
}

takeScreenshot().catch(console.error);
