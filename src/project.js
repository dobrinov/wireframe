// Project layout, comments store and agent inbox. Shared by the server and the CLI.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_HOME = path.join(os.homedir(), 'Wireframes');

export function paths(root) {
  const meta = path.join(root, '.wireframe');
  return {
    root,
    screens: path.join(root, 'screens'),
    seed: path.join(root, 'seed'),
    users: path.join(root, 'seed', 'users.json'),
    brief: path.join(root, 'WIREFRAME.md'),
    meta,
    comments: path.join(meta, 'comments.json'),
    inbox: path.join(meta, 'inbox'),
    history: path.join(meta, 'history'),
    server: path.join(meta, 'server.json'),
    config: path.join(meta, 'config.json'),
    headlessLog: path.join(meta, 'headless.log'),
  };
}

export function isProject(dir) {
  if (fs.existsSync(path.join(dir, 'seed', 'users.json'))) return true;
  // ~/.wireframe holds the private runtime, not a prototype.
  return path.resolve(dir) !== os.homedir() && fs.existsSync(path.join(dir, '.wireframe', 'comments.json'));
}

// Runtime files that stay out of git when a prototype lives inside a code repository.
export const META_GITIGNORE = `# Written by wf. Runtime files stay out of git;
# comments.json (decisions and their reasons) and config.json are worth keeping.
server.json
inbox/
history/
headless.log
*.tmp
`;

// Nearest folder above `start` (inclusive) that is a git repository, or null.
export function findRepo(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', 'target', 'coverage', 'tmp', 'log', '_site']);

// Prototypes inside `start`, breadth first, not descending into dot folders, dependencies or other prototypes.
export function findProjectsBelow(start, { maxDepth = 5, limit = 200 } = {}) {
  const found = [];
  let level = [path.resolve(start)];
  for (let depth = 0; depth <= maxDepth && level.length && found.length < limit; depth++) {
    const next = [];
    for (const dir of level) {
      if (isProject(dir)) { found.push(dir); continue; }
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name)) next.push(path.join(dir, e.name));
      }
    }
    level = next;
  }
  return found.sort();
}

// Walk up from `start` to the nearest wireframe project.
export function findProject(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    if (isProject(dir)) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

export function requireProject(start) {
  const root = findProject(start);
  if (!root) throw new Error(`no wireframe project found in ${path.resolve(start || '.')} (looked for seed/users.json). Create one with: wf new <name>`);
  return root;
}

export function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw new Error(`${file}: ${err.message}`);
  }
}

export function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

export function loadConfig(root) {
  return { headless: true, headlessDelaySec: 20, ...readJSON(paths(root).config, {}) };
}

// ---- users -------------------------------------------------------------

export function loadUsers(root) {
  const raw = readJSON(paths(root).users, { users: [] });
  const users = Array.isArray(raw) ? raw : raw.users || [];
  return users.map((u) => ({
    initials: initials(u.name || u.id),
    ...u,
  }));
}

// A project is either "per-user" (default: every seeded user has a private copy of
// their own seed) or a shared world ({"world": "shared"} in users.json): every user
// sees and changes the same data, so multi-role workflows (draft → approve) work.
export function worldMode(root) {
  const raw = readJSON(paths(root).users, {});
  return !Array.isArray(raw) && raw.world === 'shared' ? 'shared' : 'per-user';
}

export function loadSeed(root, userId) {
  const user = loadUsers(root).find((u) => u.id === userId);
  if (!user) return null;
  const p = paths(root);
  const sharedFile = path.join(p.seed, 'shared.json');
  const shared = readJSON(sharedFile, {});
  const mtime = (f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);
  if (worldMode(root) === 'shared') {
    return { user, data: shared.data || shared, version: `${mtime(sharedFile)}-${mtime(p.users)}`, shared: true };
  }
  const file = user.seed ? path.resolve(root, user.seed) : path.join(p.seed, `${userId}.json`);
  if (!file.startsWith(p.seed + path.sep)) throw new Error(`seed for ${userId} must live in seed/`);
  const own = readJSON(file, {});
  const data = { ...(shared.data || shared), ...(own.data || own) };
  const version = [sharedFile, file, p.users].map(mtime).join('-');
  return { user, data, version, shared: false };
}

function initials(name) {
  return String(name).split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
}

// ---- comments ----------------------------------------------------------
// status: open (kept for humans) → queued (sent to agent) → working → resolved

export function loadComments(root) {
  return readJSON(paths(root).comments, []);
}

function saveComments(root, list) {
  writeJSON(paths(root).comments, list);
  syncInbox(root, list);
}

function syncInbox(root, list) {
  const dir = paths(root).inbox;
  fs.mkdirSync(dir, { recursive: true });
  const want = new Set();
  for (const c of list) {
    if (c.status === 'queued' || c.status === 'working') {
      const name = `${String(c.id).padStart(4, '0')}.json`;
      want.add(name);
      writeJSON(path.join(dir, name), c);
    }
  }
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.json') && !want.has(f)) fs.rmSync(path.join(dir, f), { force: true });
  }
}

const clean = (s, max = 4000) => String(s ?? '').slice(0, max);

export function addComment(root, input) {
  const list = loadComments(root);
  const now = new Date().toISOString();
  const body = clean(input.body).trim();
  if (!body) throw new Error('comment body is empty');
  const c = {
    id: list.reduce((m, x) => Math.max(m, x.id), 0) + 1,
    body,
    screen: clean(input.screen, 300),
    title: clean(input.title, 200),
    host: input.host ? clean(input.host, 300) : undefined,
    anchor: input.anchor && typeof input.anchor === 'object' ? {
      selector: clean(input.anchor.selector, 600),
      text: clean(input.anchor.text, 200),
      tag: clean(input.anchor.tag, 40),
      x: Number(input.anchor.x) || 0,
      y: Number(input.anchor.y) || 0,
    } : null,
    viewport: clean(input.viewport, 20),
    as: input.as && typeof input.as === 'object' ? {
      id: clean(input.as.id, 80), name: clean(input.as.name, 120), role: clean(input.as.role, 120),
    } : null,
    sendToAgent: !!input.sendToAgent,
    status: input.sendToAgent ? 'queued' : 'open',
    replies: [],
    createdAt: now,
    updatedAt: now,
  };
  list.push(c);
  saveComments(root, list);
  return c;
}

export function updateComment(root, id, patch) {
  const list = loadComments(root);
  const c = list.find((x) => x.id === Number(id));
  if (!c) throw new Error(`comment #${id} not found`);
  if (patch.reply) {
    c.replies.push({ by: patch.reply.by === 'agent' ? 'agent' : 'user', name: clean(patch.reply.name, 120), body: clean(patch.reply.body), at: new Date().toISOString() });
  }
  if (patch.sendToAgent === true && c.status !== 'resolved') { c.sendToAgent = true; c.status = 'queued'; }
  if (patch.status && ['open', 'queued', 'working', 'resolved'].includes(patch.status)) c.status = patch.status;
  if (typeof patch.body === 'string' && patch.body.trim()) c.body = clean(patch.body).trim();
  if (patch.agentRun && typeof patch.agentRun === 'object') {
    const r = patch.agentRun;
    c.agentRuns = [...(c.agentRuns || []), {
      kind: clean(r.kind, 20), label: clean(r.label, 120), detail: clean(r.detail, 200), cwd: clean(r.cwd, 300),
      startedAt: clean(r.startedAt, 40), endedAt: clean(r.endedAt, 40), steps: (r.steps || []).slice(-40).map((x) => ({ at: clean(x.at, 40), text: clean(x.text, 160) })),
    }].slice(-5);
  }
  c.updatedAt = new Date().toISOString();
  saveComments(root, list);
  return c;
}

export function deleteComment(root, id) {
  const list = loadComments(root).filter((x) => x.id !== Number(id));
  saveComments(root, list);
}

export function pending(root) {
  return loadComments(root).filter((c) => c.status === 'queued' || c.status === 'working');
}

export function formatForAgent(c) {
  const lines = [
    `── Comment #${c.id} · ${c.status} ──────────────────────────`,
    `Screen:   screens${c.screen && c.screen !== '/' ? c.screen : '/index.html'}${c.title ? `  (“${c.title}”)` : ''}`,
  ];
  if (c.anchor?.selector) lines.push(`Element:  ${c.anchor.selector}${c.anchor.text ? `  “${c.anchor.text}”` : ''}`);
  if (c.as) lines.push(`Viewed as: ${c.as.name} (${c.as.id}${c.as.role ? `, ${c.as.role}` : ''})`);
  if (c.viewport) lines.push(`Viewport: ${c.viewport}`);
  lines.push('', c.body);
  for (const r of c.replies || []) lines.push('', `${r.by === 'agent' ? 'Agent' : r.name || 'User'}: ${r.body}`);
  lines.push('', `When done: wf reply ${c.id} "<what you changed>" --resolve`);
  return lines.join('\n');
}

// ---- running server ----------------------------------------------------

export function runningServer(root) {
  const info = readJSON(paths(root).server, null);
  if (!info) return null;
  try { process.kill(info.pid, 0); return info; } catch { return null; }
}

// Call the running server when there is one, so open browsers update live.
export async function viaServer(root, method, url, body) {
  const info = runningServer(root);
  if (!info) return null;
  try {
    const res = await fetch(`http://127.0.0.1:${info.port}${url}`, {
      method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    return await res.json();
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') return null;
    throw err;
  }
}
