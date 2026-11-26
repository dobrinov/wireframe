// Release notes and update checks. CHANGELOG.md is the single source of truth: the
// installed copy says what this version brought, and the copy on GitHub's main branch
// (what `/plugin update` installs) says whether a newer version is out.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { KIT_ROOT, readJSON, writeJSON } from './project.js';

export const CHANGELOG_URL = 'https://raw.githubusercontent.com/dobrinov/wireframe/main/CHANGELOG.md';
export const UPDATE_COMMANDS = ['claude plugin marketplace update dobrinov', 'claude plugin update wireframe@dobrinov'];
const CACHE = path.join(os.homedir(), '.wireframe', 'update-check.json');
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const RETRY_MS = 60 * 60 * 1000; // after a failed check (offline, firewall), wait this long before trying again
const inflight = new Map();

export const VERSION = readJSON(path.join(KIT_ROOT, 'package.json')).version;

// "1.10.0" > "1.9.2". Pre-release suffixes are ignored.
export function compareVersions(a, b) {
  const pa = String(a).split(/[.-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(/[.-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  return 0;
}

// `## 0.2.0 · 2026-11-26` (any separator, date optional) starts a release; `- ` lines are its changes.
// Lines that continue a bullet (indented) are joined to it. Newest release first.
export function parseChangelog(md) {
  const releases = [];
  let cur = null;
  for (const line of String(md).split(/\r?\n/)) {
    const h = /^##\s+\[?v?(\d+\.\d+\.\d+)\]?\s*(?:[-–—·|(]\s*)?(\d{4}-\d{2}-\d{2})?/.exec(line);
    if (h) { cur = { version: h[1], date: h[2] || null, changes: [] }; releases.push(cur); continue; }
    if (/^#{1,2}\s/.test(line)) { cur = null; continue; }
    if (!cur) continue;
    const item = /^[-*]\s+(.*)$/.exec(line);
    if (item) cur.changes.push(item[1].trim());
    else if (/^\s+\S/.test(line) && cur.changes.length) cur.changes[cur.changes.length - 1] += ' ' + line.trim();
  }
  return releases.sort((a, b) => compareVersions(b.version, a.version));
}

export function localChangelog() {
  try { return parseChangelog(fs.readFileSync(path.join(KIT_ROOT, 'CHANGELOG.md'), 'utf8')); } catch { return []; }
}

export function updateCheckDisabled(config = {}) {
  return config.updateCheck === false || !!process.env.WF_NO_UPDATE_CHECK || !!process.env.CI;
}

// The newest published changelog, from a 12-hour cache or GitHub. Never throws.
// { releases, fresh }: fresh is false when GitHub couldn't be reached and the releases are an old cache (or null).
// Concurrent checks (several tabs, server startup) share one request.
export function fetchLatest({ force = false, url = process.env.WF_UPDATE_URL || CHANGELOG_URL, cacheFile = process.env.WF_UPDATE_CACHE || CACHE } = {}) {
  const key = `${force}|${url}|${cacheFile}`;
  if (!inflight.has(key)) inflight.set(key, check({ force, url, cacheFile }).finally(() => inflight.delete(key)));
  return inflight.get(key);
}

async function check({ force, url, cacheFile }) {
  let cached = null;
  try { cached = readJSON(cacheFile, null); } catch {} // A broken cache is rewritten by the fetch below.
  if (cached?.url !== url) cached = null;
  const since = (t) => (t ? Date.now() - new Date(t) : Infinity);
  if (!force && cached?.releases && since(cached.checkedAt) < MAX_AGE_MS) return { releases: cached.releases, fresh: true };
  if (!force && since(cached?.failedAt) < RETRY_MS) return { releases: cached.releases || null, fresh: false };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { 'user-agent': `wf/${VERSION}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const releases = parseChangelog(await res.text());
    if (!releases.length) throw new Error('no releases in the changelog');
    try { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); writeJSON(cacheFile, { url, checkedAt: new Date().toISOString(), releases }); } catch {}
    return { releases, fresh: true };
  } catch {
    try { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); writeJSON(cacheFile, { ...cached, url, failedAt: new Date().toISOString() }); } catch {}
    return { releases: cached?.releases || null, fresh: false };
  }
}

// What the browser banner and `wf update` need: this version, the newest one, and what changed in between.
export async function updateInfo({ config = {}, force = false, current = VERSION } = {}) {
  const changelog = localChangelog();
  const base = { current, latest: null, available: false, news: [], changelog, commands: UPDATE_COMMANDS, checked: false };
  if (updateCheckDisabled(config)) return { ...base, disabled: true };
  const { releases, fresh } = await fetchLatest({ force });
  if (!releases?.length) return base;
  const latest = releases[0].version;
  const news = releases.filter((r) => compareVersions(r.version, current) > 0);
  // From an old cache, a newer release is still worth showing, but "no update" can't be trusted: checked stays false.
  return { ...base, latest, available: news.length > 0, news, checked: fresh };
}
