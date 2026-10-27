// Run on a Mac matching the packaged app architecture:
// node scripts/smoke-mac.cjs dist/fixed/mac-arm64/Dayleaf.app
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
(async () => {
 const app = path.resolve(process.argv[2]);
 const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dayleaf-smoke-'));
 const executable = path.join(app, 'Contents/MacOS/Dayleaf');
 const child = spawn(executable, ['--remote-debugging-port=0'], {
  env: { ...process.env, ELECTRON_USER_DATA_DIR: profile }, stdio: ['ignore', 'pipe', 'pipe'],
 });
 let output = '';
 child.stdout.on('data', chunk => { output += chunk; });
 child.stderr.on('data', chunk => { output += chunk; });
 child.on('error', error => { output += error.message; });
 let browser;
 try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  const deadline = Date.now() + 30000;
  while (!fs.existsSync(portFile)) {
   if (child.exitCode !== null || child.signalCode !== null || Date.now() > deadline) {
    throw Error(`App failed to start: ${output}`);
   }
   await new Promise(resolve => setTimeout(resolve, 200));
  }
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const page = browser.contexts()[0].pages()[0];
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible' });
  if (!page.url().startsWith('file:')) throw Error(`Unexpected page: ${page.url()}`);
  console.log('PASS: packaged app launched and rendered its initial screen.');
  console.log((await page.locator('body').innerText()).slice(0, 300));
 } finally {
  if (browser) await browser.close();
  if (child.exitCode === null && child.signalCode === null) {
   child.kill('SIGTERM');
   await new Promise(resolve => child.once('exit', resolve));
  }
  fs.rmSync(profile, { recursive: true, force: true });
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
