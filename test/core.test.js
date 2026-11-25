import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { addComment, updateComment, pending, loadSeed, loadUsers, paths } from '../src/project.js';
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
