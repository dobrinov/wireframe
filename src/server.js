// The wf helper's local server: serves screens, the wf library and harness,
// live-reloads on file changes, and carries comments between browser and agent.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import {
  KIT_ROOT, paths, loadUsers, loadSeed, loadComments, addComment, updateComment, deleteComment,
  pending, formatForAgent, writeJSON, loadConfig,
} from './project.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
const LIB = path.join(KIT_ROOT, 'lib');
const HARNESS_TAG = '<script type="module" src="/_wf/harness.js"></script>';

// Turn one `claude -p --output-format stream-json` event into short, plain progress lines.
function describeStreamEvent(ev, root) {
  if (ev.type !== 'assistant') return [];
  const rel = (f) => (f ? path.relative(root, String(f)) || String(f) : '');
  const out = [];
  for (const part of ev.message?.content || []) {
    if (part.type === 'text' && part.text?.trim()) out.push(part.text.trim().split('\n')[0].slice(0, 140));
    if (part.type !== 'tool_use') continue;
    const i = part.input || {};
    if (part.name === 'Read') out.push(`Reading ${rel(i.file_path)}`);
    else if (part.name === 'Edit' || part.name === 'MultiEdit') out.push(`Editing ${rel(i.file_path)}`);
    else if (part.name === 'Write') out.push(`Writing ${rel(i.file_path)}`);
    else if (part.name === 'Glob' || part.name === 'Grep') out.push(`Searching for ${String(i.pattern || '').slice(0, 60)}`);
    else if (part.name === 'Bash') out.push(/\breply\b/.test(i.command || '') ? 'Replying on the comment' : /\blint\b/.test(i.command || '') ? 'Checking style rules (wf lint)' : `Running ${String(i.command || '').slice(0, 60)}`);
    else if (part.name === 'Skill') out.push(`Loading the ${i.skill || i.command || ''} skill`.replace('  ', ' '));
    else if (part.name === 'TodoWrite') out.push('Planning the steps');
    else out.push(`Using ${part.name}`);
  }
  return out;
}

export async function serve({ root, port = 4321, open = false, library = false, quiet = false }) {
  const p = root ? paths(root) : null;
  const browsers = new Set();
  const watchers = new Set();
  let headless = null;
  let headlessTimer = null;
  let headlessAt = null;
  // Live agent activity shown in the browser: who is working, where, and what it is doing.
  let run = null;      // { kind, ids, startedAt, where, steps[] }
  let lastRun = null;  // the previous run, kept so the browser can say "finished in 40s"
  const startRun = (kind, ids, where) => {
    run = { kind, ids, startedAt: new Date().toISOString(), where, steps: [] };
    step(kind === 'headless' ? 'Started a background Claude Code run' : 'Handed to Claude Code');
  };
  const step = (text) => {
    if (!run || !text) return;
    const last = run.steps[run.steps.length - 1];
    if (last && last.text === text) return;
    run.steps.push({ at: new Date().toISOString(), text: String(text).slice(0, 160) });
    if (run.steps.length > 40) run.steps.shift();
    send(browsers, 'agent', agentState());
  };
  const finishRun = (extra = {}) => {
    if (!run) return;
    lastRun = { ...run, where: { ...run.where }, endedAt: new Date().toISOString(), ...extra };
    const { kind, startedAt, endedAt, steps } = lastRun;
    for (const id of run.ids) {
      try { updateComment(root, id, { agentRun: { kind, startedAt, endedAt, steps, label: run.where?.label, detail: run.where?.detail, cwd: run.where?.cwd } }); } catch {}
    }
    run = null;
  };
  const endRunIfDone = () => {
    if (!run || run.kind === 'headless') return;
    const open = pending(root).filter((c) => run.ids.includes(c.id) && c.status === 'working');
    if (!open.length) finishRun();
  };
  const log = (...a) => { if (!quiet) console.log(...a); };

  const send = (set, event, data) => {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) res.write(msg);
  };
  const agentState = () => ({
    watching: watchers.size > 0,
    headless: !!headless,
    queued: root ? pending(root).filter((c) => c.status === 'queued').length : 0,
    working: root ? pending(root).filter((c) => c.status === 'working').length : 0,
    run, lastRun,
    headlessAt: headlessAt && !headless && root && pending(root).some((c) => c.status === 'queued') ? headlessAt : null,
    listener: [...watchers].map((w) => w.wfInfo).find(Boolean) || null,
  });
  const broadcastComments = () => {
    if (!root) return;
    send(browsers, 'comments', loadComments(root));
    send(browsers, 'agent', agentState());
  };

  // Hand queued comments to a waiting agent (`wf watch`), batching bursts.
  let flushTimer = null;
  const scheduleFlush = () => {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flushToWatchers, 1200);
  };
  function flushToWatchers() {
    if (!root) return;
    const queued = pending(root).filter((c) => c.status === 'queued');
    if (!queued.length) return;
    if (watchers.size) {
      const items = queued.map((c) => updateComment(root, c.id, { status: 'working' }));
      const info = [...watchers].map((w) => w.wfInfo).find(Boolean);
      if (run && run.kind === 'session') { run.ids.push(...items.map((c) => c.id)); step(`Received #${items.map((c) => c.id).join(', #')}`); }
      else startRun('session', items.map((c) => c.id), info || { label: 'Claude Code session', cwd: root });
      send(watchers, 'items', items.map((c) => ({ ...c, text: formatForAgent(c) })));
      broadcastComments();
      return;
    }
    maybeHeadless();
  }

  function maybeHeadless() {
    const cfg = loadConfig(root);
    if (!cfg.headless || headless || headlessTimer) return;
    const delay = (cfg.headlessDelaySec ?? 20) * 1000;
    headlessAt = new Date(Date.now() + delay).toISOString();
    send(browsers, 'agent', agentState());
    headlessTimer = setTimeout(() => {
      headlessTimer = null;
      headlessAt = null;
      if (watchers.size || headless) return;
      const queued = pending(root).filter((c) => c.status === 'queued');
      if (!queued.length) return;
      const claude = which('claude');
      if (!claude) { log('  ! No agent is listening and Claude Code was not found; comments stay queued.'); return; }
      for (const c of queued) updateComment(root, c.id, { status: 'working' });
      const prompt = [
        'You are the /sketch agent for the LoFi prototype in this folder. No interactive session was listening, so you were started to handle comments left on the prototype.',
        'Read WIREFRAME.md, then follow the wireframe skill (style rules and components). For each comment below: make the change in screens/ or seed/, keep it LoFi and on-library, then run the reply command it shows with a one-line summary.',
        '', ...queued.map((c) => formatForAgent({ ...c, status: 'working' })),
      ].join('\n');
      const logFd = fs.openSync(p.headlessLog, 'a');
      fs.writeSync(logFd, `\n===== ${new Date().toISOString()} headless run for #${queued.map((c) => c.id).join(', #')}\n`);
      log(`  ↻ No agent listening; starting a headless Claude Code run for ${queued.length} comment(s).`);
      headless = spawn(claude, ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits', '--allowedTools', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash(wf *)', 'Bash(node *wf.js *)'], {
        cwd: root, stdio: ['ignore', 'pipe', logFd], env: { ...process.env, WF_HEADLESS: '1' },
      });
      startRun('headless', queued.map((c) => c.id), { label: 'Background Claude Code run', detail: 'Started by the prototype server because no Claude Code session was listening', cwd: root, pid: headless.pid });
      let out = '';
      headless.stdout.on('data', (chunk) => {
        fs.writeSync(logFd, chunk);
        out += chunk;
        let i;
        while ((i = out.indexOf('\n')) >= 0) {
          const line = out.slice(0, i); out = out.slice(i + 1);
          try { describeStreamEvent(JSON.parse(line), root).forEach(step); } catch {}
        }
      });
      broadcastComments();
      headless.on('exit', (code) => {
        fs.closeSync(logFd);
        headless = null;
        if (run) { step(code === 0 ? 'Finished' : `Stopped (exit ${code})`); finishRun({ exit: code }); }
        // Anything the run did not resolve goes back to the queue for the next agent.
        for (const c of pending(root)) if (c.status === 'working') updateComment(root, c.id, { status: 'queued' });
        log(`  ↻ Headless run finished (exit ${code}).`);
        broadcastComments();
      });
    }, (cfg.headlessDelaySec ?? 20) * 1000);
  }

  // ---- live reload ----
  let reloadTimer = null;
  let changed = new Set();
  if (root) {
    try {
      fs.watch(root, { recursive: true }, (_ev, file) => {
        if (!file || file.startsWith('.wireframe') || file.includes(`${path.sep}.`) || file.startsWith('.')) return;
        changed.add(file);
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => {
          const files = [...changed]; changed = new Set();
          if (run) for (const f of files.filter((f) => !/\.tmp\b|~$|\.swp$/.test(f)).slice(0, 3)) step(`Saved ${f}`);
          const cssOnly = files.every((f) => f.endsWith('.css'));
          const seed = files.some((f) => f.startsWith('seed'));
          send(browsers, 'reload', { files, cssOnly, seed });
        }, 150);
      });
    } catch (err) {
      log(`  ! Live reload unavailable: ${err.message}`);
    }
    // Comments written by `wf reply` without the server still reach browsers.
    fs.watchFile(p.comments, { interval: 700 }, () => broadcastComments());
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      if (!isLocal(req)) return json(res, 403, { error: 'local requests only' });

      if (route === '/_wf/api/events') {
        sse(res);
        browsers.add(res);
        res.write(`event: agent\ndata: ${JSON.stringify(agentState())}\n\n`);
        req.on('close', () => browsers.delete(res));
        return;
      }
      if (route === '/_wf/api/agent/stream') {
        sse(res);
        const q = url.searchParams;
        res.wfInfo = {
          label: q.get('client') === 'claude-code' ? 'Claude Code session' : 'Coding agent',
          detail: [q.get('term') && `in ${q.get('term')}`, q.get('session') && `session ${q.get('session')}`, q.get('pid') && `pid ${q.get('pid')}`].filter(Boolean).join(' · '),
          cwd: q.get('cwd') || root, pid: Number(q.get('pid')) || undefined,
        };
        watchers.add(res);
        send(browsers, 'agent', agentState());
        req.on('close', () => { watchers.delete(res); send(browsers, 'agent', agentState()); });
        scheduleFlush();
        return;
      }
      if (route === '/_wf/api/project') {
        return json(res, 200, root ? { name: path.basename(root), root, library } : { name: 'wf library', library: true });
      }
      if (route === '/_wf/api/users') return json(res, 200, root ? loadUsers(root) : []);
      if (route.startsWith('/_wf/api/seed/')) {
        const seed = root && loadSeed(root, decodeURIComponent(route.slice(14)));
        return seed ? json(res, 200, seed) : json(res, 404, { error: 'no such user' });
      }
      if (route === '/_wf/api/agent') return json(res, 200, agentState());
      if (route === '/_wf/api/agent/progress' && req.method === 'POST') {
        const b = await body(req);
        if (!run) startRun('session', b.id ? [Number(b.id)] : [], [...watchers].map((w) => w.wfInfo).find(Boolean) || { label: 'Claude Code session', cwd: root });
        step(b.text);
        return json(res, 200, { ok: true });
      }
      if (route === '/_wf/api/comments' && req.method === 'GET') return json(res, 200, root ? loadComments(root) : []);
      if (route === '/_wf/api/comments' && req.method === 'POST') {
        if (!root) return json(res, 400, { error: 'no project' });
        const c = addComment(root, await body(req));
        log(`  ✎ Comment #${c.id}${c.sendToAgent ? ' → agent' : ''}: ${c.body.slice(0, 70)}`);
        broadcastComments();
        if (c.status === 'queued') scheduleFlush();
        return json(res, 201, c);
      }
      const m = route.match(/^\/_wf\/api\/comments\/(\d+)$/);
      if (m && req.method === 'PATCH') {
        const patch = await body(req);
        const c = updateComment(root, m[1], patch);
        if (run && patch.reply?.by === 'agent') step(`Replied on #${c.id}${c.status === 'resolved' ? ' and resolved it' : ''}`);
        endRunIfDone();
        broadcastComments();
        if (c.status === 'queued') scheduleFlush();
        return json(res, 200, c);
      }
      if (m && req.method === 'DELETE') {
        deleteComment(root, m[1]);
        broadcastComments();
        return json(res, 200, { ok: true });
      }

      if (route === '/_wf/library' || route === '/_wf/library/') return file(res, path.join(LIB, 'library.html'), true);
      if (route.startsWith('/_wf/')) return file(res, safeJoin(LIB, route.slice(5)), false);

      if (!root) { res.writeHead(302, { location: '/_wf/library' }); return res.end(); }
      let target = safeJoin(p.screens, decodeURIComponent(route));
      if (target && fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
      if (target && !path.extname(target) && fs.existsSync(`${target}.html`)) target = `${target}.html`;
      return file(res, target, true);
    } catch (err) {
      json(res, 500, { error: err.message });
    }
  });

  const actualPort = await listen(server, port);
  if (root) writeJSON(p.server, { port: actualPort, pid: process.pid, startedAt: new Date().toISOString() });
  const url = `http://localhost:${actualPort}${library ? '/_wf/library' : '/'}`;
  log(`\n  wf ${library ? 'library' : `· ${path.basename(root)}`}\n  ➜ ${url}\n`);
  if (root) log('  Comments sent to the agent arrive via: wf watch\n');
  if (open) openBrowser(url);

  const stop = () => {
    if (root) { try { fs.rmSync(p.server, { force: true }); } catch {} }
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  // Keep SSE connections alive through proxies and sleeping laptops.
  setInterval(() => { for (const r of [...browsers, ...watchers]) r.write(': ping\n\n'); }, 20000).unref();
  return { server, port: actualPort, url };
}

function file(res, target, inject) {
  if (!target || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(notFound());
  }
  const ext = path.extname(target).toLowerCase();
  const headers = { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store' };
  if (ext === '.html' && inject) {
    let html = fs.readFileSync(target, 'utf8');
    if (!html.includes('/_wf/harness.js')) {
      html = html.includes('</body>') ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${HARNESS_TAG}\n</body>`) : html + HARNESS_TAG;
    }
    res.writeHead(200, headers);
    return res.end(html);
  }
  res.writeHead(200, headers);
  fs.createReadStream(target).pipe(res);
}

function notFound() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Not found</title><link rel="stylesheet" href="/_wf/wf.css"><script type="module" src="/_wf/wf.js"></script></head>
<body class="wf"><wf-page><wf-empty icon="search" title="This screen doesn't exist yet" text="Ask the agent to add it, or leave a comment here."><a href="/" class="wf-btn" data-variant="primary">Go to start</a></wf-empty></wf-page></body></html>`;
}

function safeJoin(base, rel) {
  const target = path.resolve(base, '.' + path.posix.normalize('/' + rel));
  return target === base || target.startsWith(base + path.sep) ? target : null;
}

function isLocal(req) {
  const host = (req.headers.host || '').split(':')[0];
  const okHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(host);
  const origin = req.headers.origin;
  const okOrigin = !origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return okHost && okOrigin;
}

function sse(res) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
  res.write(': connected\n\n');
}

function json(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (d) => { s += d; if (s.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch { reject(new Error('invalid JSON')); } });
    req.on('error', reject);
  });
}

// Bind the same port on IPv4 and IPv6 loopback so "localhost" always reaches us,
// whichever address the browser resolves it to. Never binds to the network.
async function listen(server, port) {
  const handler = server.listeners('request')[0];
  const bind = (srv, p, host) => new Promise((resolve, reject) => {
    const onErr = (err) => { srv.off('listening', onOk); reject(err); };
    const onOk = () => { srv.off('error', onErr); resolve(); };
    srv.once('error', onErr);
    srv.once('listening', onOk);
    srv.listen(p, host);
  });
  for (let p = port; p < port + 30; p++) {
    try {
      await bind(server, p, '127.0.0.1');
    } catch (err) {
      if (err.code === 'EADDRINUSE') continue;
      throw err;
    }
    const v6 = http.createServer(handler);
    try {
      await bind(v6, p, '::1');
      server.on('close', () => v6.close());
    } catch (err) {
      if (err.code === 'EADDRINUSE') { await new Promise((r) => server.close(r)); continue; }
      // No IPv6 loopback on this machine: IPv4 alone is fine.
    }
    return p;
  }
  throw new Error(`no free port between ${port} and ${port + 29}`);
}

export function which(cmd) {
  try {
    const out = execFileSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: ['ignore', 'pipe', 'ignore'] });
    return out.toString().split(/\r?\n/)[0].trim() || null;
  } catch { return null; }
}

export function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true }).unref(); } catch {}
}
