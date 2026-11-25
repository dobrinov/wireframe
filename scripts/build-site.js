#!/usr/bin/env node
// Builds the marketing site into _site/: the landing page from site/ plus the live
// component library from lib/ (static: no wf server, so the store starts empty).
// Zero dependencies. Usage: node scripts/build-site.js [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, process.argv[2] || '_site');
const SITE = 'https://dobrinov.github.io/wireframe/';

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'site'), out, { recursive: true });

fs.mkdirSync(path.join(out, 'wf'), { recursive: true });
for (const f of ['wf.css', 'wf.js', 'library-data.js']) fs.copyFileSync(path.join(root, 'lib', f), path.join(out, 'wf', f));

let lib = fs.readFileSync(path.join(root, 'lib', 'library.html'), 'utf8');
lib = lib.replaceAll('/_wf/', '../wf/');
lib = lib.replace('<link rel="stylesheet"', '<script>window.wfStatic = true;</script>\n<link rel="stylesheet"');
lib = lib.replace('href="https://dobrinov.github.io/wireframe/"', 'href="../"');
lib = lib.replace('</title>', `</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Wireframe">
<meta property="og:title" content="Component library · Wireframe">
<meta property="og:description" content="Every wf component: greyscale, keyboard-usable LoFi building blocks with live examples and copy-ready snippets.">
<meta property="og:url" content="${SITE}library/">
<meta property="og:image" content="${SITE}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}og.png">
<link rel="canonical" href="${SITE}library/">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">`);
if (!lib.includes('window.wfStatic') || !lib.includes('href="../"') || !lib.includes('og:image')) throw new Error('library.html changed shape; update scripts/build-site.js');
fs.mkdirSync(path.join(out, 'library'), { recursive: true });
fs.writeFileSync(path.join(out, 'library', 'index.html'), lib);
fs.writeFileSync(path.join(out, '.nojekyll'), '');

console.log(`Built ${path.relative(root, out) || out}/: index.html, library/, wf/`);
