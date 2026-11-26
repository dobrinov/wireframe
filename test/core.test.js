import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { addComment, updateComment, deleteComment, pending, loadSeed, loadUsers, paths, saveAttachment, formatForAgent } from '../src/project.js';
import { lint } from '../src/lint.js';

const WF = path.resolve('bin/wf.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'));
const newProject = () => {
  const dir = tmp();
  execFileSync(process.execPath, [WF, 'new', 'demo', '--dir', dir], { stdio: 'pipe' });
  return path.join(dir, 'demo');
};

test('wf new scaffolds a project with users and a start screen', () => {
  const root = newProject();
  assert.ok(fs.existsSync(path.join(root, 'screens/index.html')));
  assert.equal(loadUsers(root).length, 2);
  assert.equal(loadUsers(root)[0].initials, 'EN');
});

test('comments flow: queued → inbox file → working → resolved removes inbox file', () => {
  const root = newProject();
  const c = addComment(root, { body: 'Bigger header', screen: '/index.html', sendToAgent: true, as: { id: 'empty', name: 'Elif' } });
  assert.equal(c.status, 'queued');
  const inboxFile = path.join(paths(root).inbox, '0001.json');
  assert.ok(fs.existsSync(inboxFile));
  updateComment(root, c.id, { status: 'working' });
  assert.equal(pending(root)[0].status, 'working');
  const done = updateComment(root, c.id, { status: 'resolved', reply: { by: 'agent', body: 'Done' } });
  assert.equal(done.replies[0].by, 'agent');
  assert.ok(!fs.existsSync(inboxFile));
  assert.equal(pending(root).length, 0);
});

test('comments not sent to the agent stay out of the inbox until sent', () => {
  const root = newProject();
  const c = addComment(root, { body: 'Note to self', screen: '/' });
  assert.equal(c.status, 'open');
  assert.equal(pending(root).length, 0);
  updateComment(root, c.id, { sendToAgent: true });
  assert.equal(pending(root).length, 1);
});

test('empty comments are rejected', () => {
  assert.throws(() => addComment(newProject(), { body: '   ' }), /empty/);
});

test('pasted images attach to comments and replies, reach the agent, and go with the comment', () => {
  const root = newProject();
  const png = Buffer.from('89504e470d0a1a0a', 'hex');
  const a = saveAttachment(root, png, 'image/png');
  const b = saveAttachment(root, png, 'image/png');
  assert.throws(() => saveAttachment(root, png, 'text/html'), /PNG/);
  const c = addComment(root, { body: '', images: [a, '../../etc/passwd', 'missing.png'], screen: '/' });
  assert.deepEqual(c.images, [a]);
  const r = updateComment(root, c.id, { reply: { by: 'user', body: '', images: [b] } });
  assert.deepEqual(r.replies[0].images, [b]);
  const text = formatForAgent(r, root);
  assert.ok(text.includes(path.join(paths(root).attachments, a)));
  assert.ok(text.includes(path.join(paths(root).attachments, b)));
  deleteComment(root, c.id);
  assert.ok(!fs.existsSync(path.join(paths(root).attachments, a)));
  assert.ok(!fs.existsSync(path.join(paths(root).attachments, b)));
});

test('seed loading merges shared data and refuses files outside seed/', () => {
  const root = newProject();
  fs.writeFileSync(path.join(root, 'seed/shared.json'), JSON.stringify({ data: { plans: [1] } }));
  fs.writeFileSync(path.join(root, 'seed/empty.json'), JSON.stringify({ data: { items: [{ id: 'a' }] } }));
  const s = loadSeed(root, 'empty');
  assert.deepEqual(Object.keys(s.data).sort(), ['items', 'plans']);
  const users = JSON.parse(fs.readFileSync(paths(root).users));
  users.users[0].seed = '../../etc/passwd';
  fs.writeFileSync(paths(root).users, JSON.stringify(users));
  assert.throws(() => loadSeed(root, 'empty'), /seed\//);
});

test('lint flags off-style screens and passes the example', () => {
  const root = newProject();
  fs.writeFileSync(path.join(root, 'screens/bad.html'), '<div style="color:#ff0000;box-shadow:0 4px 12px black;background:linear-gradient(red,blue)"></div><wf-carousel></wf-carousel>');
  const rules = new Set(lint(root).map((p) => p.rule));
  for (const r of ['raw-colour', 'blur-shadow', 'gradient', 'unknown-component']) assert.ok(rules.has(r), r);
  assert.deepEqual(lint(path.resolve('examples/expense-approvals')), []);
});

test('shared world: every user gets the same shared data and a shared flag', () => {
  const root = newProject();
  const users = JSON.parse(fs.readFileSync(paths(root).users));
  users.world = 'shared';
  fs.writeFileSync(paths(root).users, JSON.stringify(users));
  fs.writeFileSync(path.join(root, 'seed/shared.json'), JSON.stringify({ data: { requests: [{ id: 'r1' }] } }));
  fs.writeFileSync(path.join(root, 'seed/empty.json'), JSON.stringify({ data: { ignored: [1] } }));
  const a = loadSeed(root, 'empty');
  const b = loadSeed(root, 'power');
  assert.equal(a.shared, true);
  assert.deepEqual(a.data, b.data);
  assert.equal(a.version, b.version);
  assert.ok(!('ignored' in a.data));
});

test('prototypes inside a code repository: gitignored runtime, found from the repo root, listed', () => {
  const repo = tmp();
  fs.mkdirSync(path.join(repo, '.git'));
  fs.mkdirSync(path.join(repo, 'node_modules', 'x', 'seed'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'node_modules', 'x', 'seed', 'users.json'), '{}');
  execFileSync(process.execPath, [WF, 'new', 'billing', '--dir', path.join(repo, 'wireframes')], { stdio: 'pipe' });
  const root = path.join(repo, 'wireframes', 'billing');
  assert.match(fs.readFileSync(path.join(root, '.wireframe', '.gitignore'), 'utf8'), /server\.json/);
  const run = (...a) => execFileSync(process.execPath, [WF, ...a], { cwd: repo, encoding: 'utf8' });
  assert.match(run('status'), new RegExp(`Prototype: billing`));
  assert.match(run('status', 'billing'), /Prototype: billing/);
  const list = JSON.parse(run('list', '--json'));
  const local = list.prototypes.filter((p) => p.where === 'repo');
  assert.deepEqual(local.map((p) => p.name), ['billing']);
  execFileSync(process.execPath, [WF, 'new', 'onboarding', '--dir', path.join(repo, 'wireframes')], { stdio: 'pipe' });
  assert.throws(() => run('status'), /several prototypes/);
});

// ---- versions, changelog and update checks ----
import http from 'node:http';
import { parseChangelog, compareVersions, updateInfo, VERSION, localChangelog } from '../src/update.js';

test('package.json, plugin.json and the newest CHANGELOG entry agree on the version', () => {
  const plugin = JSON.parse(fs.readFileSync('.claude-plugin/plugin.json', 'utf8'));
  assert.equal(plugin.version, VERSION, 'bump .claude-plugin/plugin.json with package.json');
  const top = localChangelog()[0];
  assert.ok(top, 'CHANGELOG.md has no releases');
  assert.equal(top.version, VERSION, 'add a CHANGELOG.md section for the new version');
  assert.ok(top.changes.length, 'the newest CHANGELOG.md section lists no changes');
});

test('parseChangelog reads releases, dates, bullets and wrapped lines, newest first', () => {
  const md = `# Changelog\n\nIntro with - not a bullet\n\n## 0.9.0 · 2026-01-02\n\n- **One.** first\n  continued\n- Two\n\n## 0.10.0 - 2026-02-03\n- Ten\n\n## [1.0.0]\n- Big\n`;
  const r = parseChangelog(md);
  assert.deepEqual(r.map((x) => x.version), ['1.0.0', '0.10.0', '0.9.0']);
  assert.equal(r[2].date, '2026-01-02');
  assert.equal(r[0].date, null);
  assert.deepEqual(r[2].changes, ['**One.** first continued', 'Two']);
  assert.equal(compareVersions('0.10.0', '0.9.9'), 1);
  assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
  assert.equal(compareVersions('0.1.0', '0.2.0'), -1);
});

test('updateInfo reports newer releases from the published changelog and caches them', async () => {
  let hits = 0;
  const srv = http.createServer((req, res) => { hits++; res.end('## 9.1.0 · 2030-01-01\n- Newest\n## 9.0.0\n- Newer\n## 0.0.1\n- Old\n'); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const env = { url: process.env.WF_UPDATE_URL, cache: process.env.WF_UPDATE_CACHE, ci: process.env.CI };
  process.env.WF_UPDATE_URL = `http://127.0.0.1:${srv.address().port}/CHANGELOG.md`;
  process.env.WF_UPDATE_CACHE = path.join(tmp(), 'update-check.json');
  delete process.env.CI;
  try {
    const u = await updateInfo({ current: '1.0.0' });
    assert.equal(u.available, true);
    assert.equal(u.latest, '9.1.0');
    assert.deepEqual(u.news.map((r) => r.version), ['9.1.0', '9.0.0']);
    assert.equal((await updateInfo({ current: '9.1.0' })).available, false);
    assert.equal(hits, 1, 'second check should come from the cache');
    assert.equal((await updateInfo({ current: '1.0.0', config: { updateCheck: false } })).checked, false);
  } finally {
    srv.close();
    for (const [k, v] of [['WF_UPDATE_URL', env.url], ['WF_UPDATE_CACHE', env.cache], ['CI', env.ci]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});

test('telemetry: install once, update on version change, nothing when off', async () => {
  const { track } = await import('../src/telemetry.js');
  const { VERSION } = await import('../src/update.js');
  const got = [];
  const srv = http.createServer((req, res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { got.push({ ...JSON.parse(b), ua: req.headers['user-agent'] }); res.end('ok'); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const keys = ['WF_TELEMETRY_URL', 'WF_TELEMETRY_STATE', 'CI', 'DO_NOT_TRACK', 'WF_NO_TELEMETRY'];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  process.env.WF_TELEMETRY_URL = `http://127.0.0.1:${srv.address().port}/api/event`;
  process.env.WF_TELEMETRY_STATE = path.join(tmp(), 'telemetry.json');
  for (const k of ['CI', 'DO_NOT_TRACK', 'WF_NO_TELEMETRY']) delete process.env[k];
  const notices = [];
  const log = (s) => notices.push(s);
  try {
    await track('serve', { mode: 'prototype' }, { log });
    assert.deepEqual(got.map((e) => e.name).sort(), ['install', 'serve']);
    assert.equal(notices.length, 1);
    const serveEvent = got.find((e) => e.name === 'serve');
    assert.equal(serveEvent.domain, 'dobrinov.github.io/wireframe');
    assert.equal(serveEvent.props.version, VERSION);
    assert.equal(serveEvent.props.mode, 'prototype');
    assert.match(serveEvent.ua, /^Mozilla\/5\.0 .* wf\//);

    got.length = 0;
    await track('serve', {}, { log });
    assert.deepEqual(got.map((e) => e.name), ['serve'], 'no second install');
    assert.equal(notices.length, 1, 'notice only once');

    got.length = 0;
    fs.writeFileSync(process.env.WF_TELEMETRY_STATE, JSON.stringify({ enabled: true, version: '0.0.1' }));
    await track(null, {}, { log });
    assert.deepEqual(got.map((e) => [e.name, e.props.from, e.props.to]), [['update', '0.0.1', VERSION]]);

    got.length = 0;
    await track('serve', {}, { log, config: { telemetry: false } });
    process.env.DO_NOT_TRACK = '1';
    await track('serve', {}, { log });
    delete process.env.DO_NOT_TRACK;
    fs.writeFileSync(process.env.WF_TELEMETRY_STATE, JSON.stringify({ enabled: false, version: VERSION }));
    await track('serve', {}, { log });
    assert.equal(got.length, 0);
  } finally {
    srv.close();
    for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
});
