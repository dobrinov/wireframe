// Anonymous usage counts, sent to the project's Plausible (the same one the website uses).
// Only event names, the wf version, the operating system and the Node.js major version:
// no IDs, file names, prototype names, comment text or anything else from your computer.
// Off with WF_NO_TELEMETRY=1, DO_NOT_TRACK=1, `wf telemetry off`, {"telemetry": false}
// in a prototype's .wireframe/config.json, and always off in CI.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readJSON, writeJSON } from './project.js';
import { VERSION } from './update.js';

export const TELEMETRY_URL = 'https://stats.aparatnata.com/api/event';
const DOMAIN = 'dobrinov.github.io/wireframe';
const stateFile = () => process.env.WF_TELEMETRY_STATE || path.join(os.homedir(), '.wireframe', 'telemetry.json');

export const NOTICE = 'wf sends anonymous usage counts (command names, version, OS) to help improve it. Nothing about you or your prototypes. Turn it off: wf telemetry off';

const truthy = (v) => !!v && !/^(0|false|no|off)$/i.test(v);

export function readState() {
  try { return readJSON(stateFile(), null); } catch { return null; }
}

function saveState(state) {
  try { fs.mkdirSync(path.dirname(stateFile()), { recursive: true }); writeJSON(stateFile(), state); } catch {}
}

export function setEnabled(enabled) {
  saveState({ ...(readState() || { version: VERSION }), enabled, noticeShown: true });
}

// Why telemetry is off, or null when it is on.
export function disabledReason(config = {}) {
  if (truthy(process.env.WF_NO_TELEMETRY)) return 'WF_NO_TELEMETRY is set';
  if (truthy(process.env.DO_NOT_TRACK)) return 'DO_NOT_TRACK is set';
  if (process.env.CI) return 'running in CI';
  if (process.env.NODE_TEST_CONTEXT && !process.env.WF_TELEMETRY_URL) return 'running under tests';
  if (config.telemetry === false) return 'turned off in this prototype\'s .wireframe/config.json';
  if (readState()?.enabled === false) return 'turned off with wf telemetry off';
  return null;
}

// A User-Agent Plausible accepts and reads the operating system from.
function userAgent() {
  const platform = { darwin: 'Macintosh; Intel Mac OS X 10_15_7', win32: 'Windows NT 10.0; Win64; x64' }[process.platform] || 'X11; Linux x86_64';
  return `Mozilla/5.0 (${platform}) wf/${VERSION} Node/${process.versions.node}`;
}

function send(name, props = {}) {
  return fetch(process.env.WF_TELEMETRY_URL || TELEMETRY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': userAgent() },
    body: JSON.stringify({
      name, domain: DOMAIN, url: `app://wf/${name}`,
      props: { version: VERSION, os: process.platform, node: process.versions.node.split('.')[0], ...props },
    }),
    signal: AbortSignal.timeout(1500),
  }).then(() => {}, () => {});
}

// Count one event (name may be null to only record a first run or an update). Never throws.
// The first time on a computer it prints a one-line notice (to stderr, so --json output stays clean)
// and counts an install; when the version changed since last time it counts an update.
export function track(name, props = {}, { config = {}, log = (s) => console.error(s) } = {}) {
  try {
    if (disabledReason(config)) return Promise.resolve();
    const state = readState();
    const sends = [];
    if (!state) {
      log(NOTICE);
      sends.push(send('install'));
    } else if (state.version !== VERSION) {
      sends.push(send('update', { from: state.version || 'unknown', to: VERSION }));
    }
    if (!state || state.version !== VERSION) saveState({ ...state, enabled: true, version: VERSION, noticeShown: true });
    if (name) sends.push(send(name, props));
    return Promise.all(sends).then(() => {});
  } catch {
    return Promise.resolve();
  }
}
