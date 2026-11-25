#!/usr/bin/env node
// Builds the marketing site into _site/: the landing page from site/ plus the live
// component library from lib/ (static: no wf server, so the store starts empty).
// Zero dependencies. Usage: node scripts/build-site.js [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.argv[2] || '_site');

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'site'), out, { recursive: true });

fs.mkdirSync(path.join(out, 'wf'), { recursive: true });
for (const f of ['wf.css', 'wf.js']) fs.copyFileSync(path.join(root, 'lib', f), path.join(out, 'wf', f));

let lib = fs.readFileSync(path.join(root, 'lib', 'library.html'), 'utf8');
lib = lib.replaceAll('/_wf/', '../wf/');
lib = lib.replace('<link rel="stylesheet"', '<script>window.wfStatic = true;</script>\n<link rel="stylesheet"');
lib = lib.replace('<wf-sidebar brand="wf library">', '<wf-sidebar brand="wf library">\n    <wf-nav-item href="../" icon="arrow-left">Wireframe home</wf-nav-item>');
if (!lib.includes('window.wfStatic') || !lib.includes('Wireframe home')) throw new Error('library.html changed shape; update scripts/build-site.js');
fs.mkdirSync(path.join(out, 'library'), { recursive: true });
fs.writeFileSync(path.join(out, 'library', 'index.html'), lib);
fs.writeFileSync(path.join(out, '.nojekyll'), '');

console.log(`Built ${path.relative(root, out) || out}/: index.html, library/, wf/`);
