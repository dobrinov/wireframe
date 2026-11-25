import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  KIT_ROOT, DEFAULT_HOME, paths, findProject, requireProject, loadUsers, loadComments, updateComment,
  pending, formatForAgent, runningServer, viaServer, readJSON, isProject,
} from './project.js';
import { serve, which, openBrowser } from './server.js';
import { lint } from './lint.js';

const HELP = `wf — agentic LoFi wireframing helper

Start
  wf setup                 Get this computer ready (folder, wf command, checks)
  wf doctor [--json]       Check everything and explain any problem
  wf new <name>            Create a prototype in ~/Wireframes/<name>
  wf serve [dir] [--open]  Run a prototype with live reload and comments
  wf library [--open]      Browse every wireframe component

Agent loop
  wf watch [--once]        Wait for comments sent to the agent and print them
  wf inbox                 List comments waiting for the agent
  wf reply <id> "<text>" [--resolve]   Answer a comment (and resolve it)
  wf lint [dir]            Check screens follow the wireframe style rules
  wf snapshot [label]      Save a copy of screens and seed data in history

Info
  wf users                 Show the seeded users of this prototype
  wf status                Is the prototype running? What is waiting?
  wf docs [style|components|patterns|personas]   Print the reference docs
`;

export async function main(argv) {
  const { _: args, flags } = parse(argv);
  const cmd = args.shift() || 'help';
  switch (cmd) {
    case 'help': case '--help': case '-h': return console.log(HELP);
    case 'version': case '--version': return console.log(readJSON(path.join(KIT_ROOT, 'package.json')).version);
    case 'new': return cmdNew(args[0], flags);
    case 'serve': case 'open': case 'start': return cmdServe(args[0], flags);
    case 'library': return serve({ root: null, port: Number(flags.port) || 4320, open: !!flags.open, library: true });
    case 'watch': return cmdWatch(args[0], flags);
    case 'inbox': return cmdInbox(args[0], flags);
    case 'reply': return cmdReply(args, flags);
    case 'lint': return cmdLint(args[0], flags);
    case 'snapshot': return cmdSnapshot(args[0], flags);
    case 'users': return cmdUsers(args[0], flags);
    case 'status': return cmdStatus(args[0], flags);
    case 'docs': return cmdDocs(args[0]);
    case 'doctor': return cmdDoctor(flags);
    case 'setup': return cmdSetup(flags);
    default: throw new Error(`unknown command "${cmd}". Run: wf help`);
  }
}

function parse(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out.flags[k] = v;
      else if (['port', 'dir', 'name'].includes(k)) out.flags[k] = argv[++i];
      else out.flags[k] = true;
    } else out._.push(a);
  }
  return out;
}

const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60);

// ---- new ----
function cmdNew(name, flags) {
  if (!name) throw new Error('give the prototype a name, e.g. wf new expense-approvals');
  const dir = flags.here ? path.resolve(name) : path.join(flags.dir ? path.resolve(flags.dir) : DEFAULT_HOME, slug(name));
  if (fs.existsSync(dir) && fs.readdirSync(dir).length) throw new Error(`${dir} already exists and is not empty`);
  const title = flags.title || name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  copyTemplate(path.join(KIT_ROOT, 'templates', 'project'), dir, { NAME: title, SLUG: slug(name), DATE: new Date().toISOString().slice(0, 10) });
  fs.mkdirSync(path.join(dir, '.wireframe', 'inbox'), { recursive: true });
  console.log(`Created ${dir}\nNext: wf serve "${dir}" --open`);
  if (flags.json) console.log(JSON.stringify({ dir }));
}

function copyTemplate(from, to, vars) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyTemplate(src, dst, vars);
    else fs.writeFileSync(dst, fs.readFileSync(src, 'utf8').replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m));
  }
}

// ---- serve ----
async function cmdServe(dir, flags) {
  const root = resolveProject(dir);
  const running = runningServer(root);
  if (running && !flags.force) {
    const url = `http://localhost:${running.port}/`;
    console.log(`Already running: ${url}`);
    if (flags.open) openBrowser(url);
    return;
  }
  await serve({ root, port: Number(flags.port) || 4321, open: !!flags.open });
}

function resolveProject(dir) {
  if (dir) {
    const direct = path.resolve(dir);
    if (fs.existsSync(direct)) return requireProject(direct);
    const inHome = path.join(DEFAULT_HOME, dir);
    if (fs.existsSync(inHome)) return requireProject(inHome);
    throw new Error(`no prototype at ${direct} or ${inHome}`);
  }
  return requireProject(process.cwd());
}

// ---- agent loop ----
async function cmdWatch(dir, flags) {
  const root = resolveProject(dir);
  const once = !!flags.once;
  const working = pending(root).filter((c) => c.status === 'working');
  if (working.length && !flags.quiet) {
    console.log(`(${working.length} comment(s) already with an agent: ${working.map((c) => '#' + c.id).join(', ')}. See: wf inbox)\n`);
  }
  const info = runningServer(root);
  const print = (items) => {
    for (const c of items) console.log((c.text || formatForAgent(c)) + '\n');
  };
  if (!info) {
    // No server: poll the files directly.
    console.log('Prototype server is not running; watching .wireframe/comments.json directly.');
    for (;;) {
      const queued = pending(root).filter((c) => c.status === 'queued');
      if (queued.length) {
        print(queued.map((c) => updateComment(root, c.id, { status: 'working' })));
        if (once) return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  if (!flags.quiet) console.log(`Listening for comments on http://localhost:${info.port}/ …`);
  const res = await fetch(`http://127.0.0.1:${info.port}/_wf/api/agent/stream`, { headers: { origin: `http://localhost:${info.port}` } });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) { console.log('Prototype server stopped.'); return; }
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const ev = /^event: (.*)$/m.exec(chunk)?.[1];
      const data = /^data: (.*)$/m.exec(chunk)?.[1];
      if (ev === 'items' && data) {
        print(JSON.parse(data));
        if (once) { reader.cancel().catch(() => {}); process.exit(0); }
      }
    }
  }
}

function cmdInbox(dir, flags) {
  const root = resolveProject(dir);
  const items = pending(root);
  if (flags.json) return console.log(JSON.stringify(items, null, 2));
  if (!items.length) return console.log('Nothing waiting for the agent.');
  for (const c of items) console.log(formatForAgent(c) + '\n');
}

async function cmdReply(args, flags) {
  const [id, ...rest] = args;
  const text = rest.join(' ').trim();
  if (!id || !text) throw new Error('usage: wf reply <id> "<what you changed>" [--resolve]');
  const root = resolveProject(flags.dir);
  const patch = { reply: { by: flags.user ? 'user' : 'agent', name: flags.user ? String(flags.user) : 'Agent', body: text } };
  if (flags.resolve) patch.status = 'resolved';
  else if (flags.open) patch.status = 'open';
  const c = (await viaServer(root, 'PATCH', `/_wf/api/comments/${Number(id)}`, patch)) || updateComment(root, id, patch);
  console.log(`Comment #${c.id} → ${c.status}`);
}

function cmdLint(dir, flags) {
  const root = resolveProject(dir);
  const problems = lint(root);
  if (flags.json) return console.log(JSON.stringify(problems, null, 2));
  if (!problems.length) return console.log('✓ Screens follow the wireframe style rules.');
  for (const p of problems) console.log(`${p.file}:${p.line}  ${p.rule}  ${p.message}`);
  console.log(`\n${problems.length} problem(s). Style rules: wf docs style`);
  process.exitCode = 1;
}

function cmdSnapshot(label, flags) {
  const root = resolveProject(flags.dir);
  const p = paths(root);
  fs.mkdirSync(p.history, { recursive: true });
  const n = fs.readdirSync(p.history).filter((f) => /^v\d+/.test(f)).length + 1;
  const dest = path.join(p.history, `v${n}${label ? '-' + slug(label) : ''}`);
  for (const sub of ['screens', 'seed', 'WIREFRAME.md']) {
    const src = path.join(root, sub);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(dest, sub), { recursive: true });
  }
  console.log(`Saved ${path.relative(root, dest)}`);
}

function cmdUsers(dir, flags) {
  const root = resolveProject(dir);
  const users = loadUsers(root);
  if (flags.json) return console.log(JSON.stringify(users, null, 2));
  for (const u of users) console.log(`${u.id.padEnd(16)} ${u.name.padEnd(20)} ${u.tagline || ''}\n${' '.repeat(17)}why: ${u.why || '—'}`);
}

function cmdStatus(dir) {
  const root = resolveProject(dir);
  const info = runningServer(root);
  const comments = loadComments(root);
  const by = (s) => comments.filter((c) => c.status === s).length;
  console.log(`Prototype: ${path.basename(root)} (${root})`);
  console.log(`Server:    ${info ? `running at http://localhost:${info.port}/` : 'not running (wf serve)'}`);
  console.log(`Users:     ${loadUsers(root).length}`);
  console.log(`Comments:  ${by('open')} open · ${by('queued')} waiting for agent · ${by('working')} with agent · ${by('resolved')} resolved`);
}

function cmdDocs(name = 'index') {
  const dir = path.join(KIT_ROOT, 'skills', 'wireframe', 'reference');
  const map = { index: null, style: 'STYLE.md', components: 'COMPONENTS.md', personas: 'PERSONAS.md', patterns: 'PATTERNS.md' };
  if (!map[name]) {
    console.log('Docs: ' + Object.keys(map).filter((k) => map[k]).join(', '));
    return;
  }
  console.log(fs.readFileSync(path.join(dir, map[name]), 'utf8'));
}

// ---- setup & doctor ----
function shimDir() {
  return process.platform === 'win32' ? path.join(os.homedir(), '.wireframe', 'bin') : path.join(os.homedir(), '.local', 'bin');
}

function checks() {
  const list = [];
  const add = (id, ok, label, fix) => list.push({ id, ok, label, fix: ok ? null : fix });
  const major = Number(process.versions.node.split('.')[0]);
  add('runtime', major >= 18, `Runtime: Node ${process.versions.node}`, 'Run install/bootstrap.sh (Mac) or install/bootstrap.ps1 (Windows); it installs a private runtime for wf.');
  const wfPath = which('wf');
  add('wf', !!wfPath, wfPath ? `wf command: ${wfPath}` : 'wf command is not on your PATH', 'Run: wf setup (or ask Claude: "/wireframe setup").');
  if (wfPath) {
    const pathDirs = (process.env.PATH || '').split(path.delimiter);
    if (!pathDirs.includes(shimDir()) && wfPath.startsWith(shimDir())) add('path', false, 'PATH', `Add ${shimDir()} to your PATH.`);
  }
  const claude = which('claude');
  add('claude', !!claude, claude ? `Claude Code: ${claude}` : 'Claude Code not found', 'Install Claude Code from https://claude.com/claude-code, then reopen this window.');
  add('home', fs.existsSync(DEFAULT_HOME), `Prototypes folder: ${DEFAULT_HOME}`, 'Run: wf setup');
  const installed = readJSON(path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json'), {});
  const hasPlugin = JSON.stringify(installed).includes('wireframe@') || fs.existsSync(path.join(os.homedir(), '.claude', 'skills', 'wireframe', 'SKILL.md'));
  add('plugin', hasPlugin, hasPlugin ? '/wireframe is installed in Claude Code' : '/wireframe is not installed in Claude Code yet',
    `In Claude Code run: /plugin marketplace add ${KIT_ROOT}  then  /plugin install wireframe@wireframe-kit`);
  const proj = findProject(process.cwd());
  if (proj) {
    const p = paths(proj);
    let users = [];
    try { users = loadUsers(proj); add('users', users.length > 0, `Seeded users: ${users.length}`, 'Add users to seed/users.json.'); }
    catch (err) { add('users', false, 'seed/users.json is not valid JSON', err.message); }
    for (const u of users) {
      const f = u.seed ? path.resolve(proj, u.seed) : path.join(p.seed, `${u.id}.json`);
      if (!fs.existsSync(f)) add(`seed-${u.id}`, false, `Seed data for ${u.id}`, `Create ${path.relative(proj, f)} (can be {}).`);
    }
    add('index', fs.existsSync(path.join(p.screens, 'index.html')), 'screens/index.html', 'Create the start screen screens/index.html.');
  }
  return list;
}

function cmdDoctor(flags) {
  const list = checks();
  if (flags.json) return console.log(JSON.stringify({ ok: list.every((c) => c.ok), checks: list }, null, 2));
  for (const c of list) console.log(`${c.ok ? '✓' : '✗'} ${c.label}${c.fix ? `\n    → ${c.fix}` : ''}`);
  const bad = list.filter((c) => !c.ok).length;
  console.log(bad ? `\n${bad} thing(s) to fix.` : '\nAll good. In Claude Code, type: /wireframe <what you want to build>');
  if (bad) process.exitCode = 1;
}

function cmdSetup(flags) {
  const steps = [];
  fs.mkdirSync(DEFAULT_HOME, { recursive: true });
  steps.push(`Prototypes folder ready: ${DEFAULT_HOME}`);
  const dir = shimDir();
  fs.mkdirSync(dir, { recursive: true });
  const entry = path.join(KIT_ROOT, 'bin', 'wf.js');
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(dir, 'wf.cmd'), `@echo off\r\n"${process.execPath}" "${entry}" %*\r\n`);
  } else {
    const shim = path.join(dir, 'wf');
    fs.writeFileSync(shim, `#!/bin/sh\nexec "${process.execPath}" "${entry}" "$@"\n`);
    fs.chmodSync(shim, 0o755);
  }
  steps.push(`wf command installed in ${dir}`);
  const onPath = (process.env.PATH || '').split(path.delimiter).includes(dir);
  if (!onPath) {
    if (process.platform === 'win32') {
      steps.push(`Add ${dir} to your PATH (Settings → Environment variables), then reopen the terminal.`);
    } else {
      const rc = path.join(os.homedir(), process.env.SHELL?.endsWith('bash') ? '.bashrc' : '.zshrc');
      const line = `export PATH="${dir}:$PATH"`;
      const cur = fs.existsSync(rc) ? fs.readFileSync(rc, 'utf8') : '';
      if (!cur.includes(dir)) fs.appendFileSync(rc, `\n# added by wf setup\n${line}\n`);
      steps.push(`Added ${dir} to PATH in ${rc} (new terminal windows pick it up).`);
    }
  }
  for (const s of steps) console.log('✓ ' + s);
  console.log('');
  cmdDoctor(flags);
}

export { isProject };
