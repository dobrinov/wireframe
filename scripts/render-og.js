#!/usr/bin/env node
// Renders scripts/og-card.html to site/og.png (1200×630) and the logo to site/apple-touch-icon.png (180×180)
// with headless Chrome. Run after changing the card: node scripts/render-og.js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Playwright's headless shell first: managed Chrome installs can block --screenshot.
const pwCache = path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Caches/ms-playwright' : '.cache/ms-playwright');
const shells = fs.existsSync(pwCache)
  ? fs.readdirSync(pwCache).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse()
      .flatMap((d) => fs.readdirSync(path.join(pwCache, d)).map((sub) => path.join(pwCache, d, sub, 'chrome-headless-shell')))
  : [];
const candidates = [
  process.env.CHROME,
  ...shells,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'google-chrome', 'chromium', 'chromium-browser',
].filter(Boolean);
const chrome = candidates.find((c) => !c.startsWith('/') || fs.existsSync(c));
if (!chrome) throw new Error('Chrome not found; set CHROME=/path/to/chrome');

function shot(html, out, w, h) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-og-'));
  execFileSync(chrome, [
    ...(chrome.includes('headless-shell') ? [] : ['--headless=new']), '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--user-data-dir=${tmp}`, `--window-size=${w},${h}`, '--virtual-time-budget=5000',
    `--screenshot=${out}`, html,
  ], { stdio: 'pipe', timeout: 60000 });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`Wrote ${path.relative(root, out)}`);
}

shot(pathToFileURL(path.join(root, 'scripts', 'og-card.html')).href, path.join(root, 'site', 'og.png'), 1200, 630);

const icon = `data:text/html,${encodeURIComponent(`<html><body style="margin:0;width:180px;height:180px;background:#F7F6F2;display:grid;place-items:center">
${fs.readFileSync(path.join(root, 'site', 'logo.svg'), 'utf8').replace('<svg ', '<svg width="132" height="132" ')}</body></html>`)}`;
shot(icon, path.join(root, 'site', 'apple-touch-icon.png'), 180, 180);
