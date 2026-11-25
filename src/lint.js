// `wf lint`: keeps screens inside the wireframe style rules (see STYLE.md).
import fs from 'node:fs';
import path from 'node:path';
import { paths } from './project.js';

const ALLOWED_HEX = new Set(['#1c1c1a', '#3a3a36', '#55554f', '#8a887f', '#c9c7bf', '#d6d4cc', '#e3e1da', '#efede6', '#f2f1ec', '#f7f6f2', '#ffffff', '#fff', '#000', '#000000']);
const KNOWN_TAGS = new Set(`app sidebar nav-item nav-group topbar page page-header stack row grid card section divider split spacer
text-ph image icon avatar avatar-group field switch segmented stepper upload tags combobox search
tabs tab tab-panel breadcrumbs pagination steps menu menu-item command
table stat chart badge tag desc timeline timeline-item kanban kanban-column calendar map video file thread message list list-item
modal drawer popover toast alert banner progress spinner skeleton empty checklist notifications note callout gate`.split(/\s+/));

export function lint(root) {
  const dir = paths(root).screens;
  const out = [];
  for (const file of walk(dir)) {
    if (!/\.(html|css|js)$/.test(file)) continue;
    const rel = path.relative(root, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const at = (rule, message) => out.push({ file: rel, line: i + 1, rule, message });
      for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        if (/&#|href="#|href='#|url\(#/.test(line.slice(Math.max(0, m.index - 6), m.index + 1))) continue;
        if (!ALLOWED_HEX.has(m[0].toLowerCase())) at('raw-colour', `${m[0]} is not a wf colour; use var(--wf-…) tokens`);
      }
      if (/\b(rgb|hsl)a?\(/.test(line) && !/var\(--wf/.test(line)) at('raw-colour', 'rgb()/hsl() colour; use var(--wf-…) tokens');
      if (/(linear|radial|conic)-gradient/.test(line)) at('gradient', 'gradients are not part of the wireframe style');
      for (const m of line.matchAll(/box-shadow\s*:\s*([^;"']+)/g)) {
        const parts = m[1].trim().split(/\s+/);
        if (parts[0] !== 'none' && !parts[0].startsWith('var(') && parts.length >= 3 && parseFloat(parts[2]) > 0) at('blur-shadow', 'shadows are flat offsets only (blur 0): use var(--wf-shadow-1|2)');
      }
      if (/font-family\s*:/.test(line) && !/var\(--wf-font/.test(line)) at('font', 'use var(--wf-font), var(--wf-font-display) or var(--wf-font-mono)');
      if (/<img[^>]+src=["']https?:/i.test(line)) at('real-image', 'use <wf-image> placeholders instead of real images');
      if (/\p{Extended_Pictographic}/u.test(line) && !/<!--/.test(line)) at('emoji', 'no emoji; use <wf-icon name="…">');
      for (const m of line.matchAll(/<wf-([a-z-]+)/g)) {
        if (!KNOWN_TAGS.has(m[1])) at('unknown-component', `<wf-${m[1]}> is not in the library (wf docs components)`);
      }
    });
  }
  return out;
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}
