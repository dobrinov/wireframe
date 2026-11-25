// wf.js — wireframe components (light-DOM custom elements), mock data store and helpers.
// No build step. Include on every screen:
//   <link rel="stylesheet" href="/_wf/wf.css"><script type="module" src="/_wf/wf.js"></script>
// Screen scripts: <script type="module"> const wf = await window.wfReady; … </script>

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const attr = (el, name, d = '') => (el.hasAttribute(name) ? el.getAttribute(name) : d);
const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);
let uid = 0;
const nextId = (p = 'wf') => `${p}-${++uid}`;
const emit = (el, name, detail) => el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));

// ---------------------------------------------------------------- icons
const P = {
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12.5l4.5 4.5L19 7',
  'chevron-down': 'M6 9l6 6 6-6', 'chevron-up': 'M6 15l6-6 6 6', 'chevron-left': 'M15 6l-6 6 6 6', 'chevron-right': 'M9 6l6 6-6 6',
  'arrow-right': 'M5 12h14M13 6l6 6-6 6', 'arrow-left': 'M19 12H5M11 6l-6 6 6 6', 'arrow-up': 'M12 19V5M6 11l6-6 6 6', 'arrow-down': 'M12 5v14M6 13l6 6 6-6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4.2-4.2', home: 'M4 11l8-7 8 7v9H4zM10 20v-6h4v6',
  inbox: 'M4 13l2.5-8h11L20 13v6H4zM4 13h5l1 2h4l1-2h5', file: 'M7 3h7l5 5v13H7zM14 3v5h5', folder: 'M3 6h6l2 2h10v11H3z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6', users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 15c2 .6 3.2 2.2 3.5 5',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2 1.2L14.8 21h-4l-.3-2.4a7 7 0 0 1-2-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-2.4L4.6 9.9l2-3.4 1.9.7a7 7 0 0 1 2-1.2L10.8 3.5h4l.3 2.5a7 7 0 0 1 2 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 2.4z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0', calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6', 'credit-card': 'M3 6h18v12H3zM3 10h18M7 15h4', receipt: 'M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21zM9 8h6M9 12h6M9 16h3',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16', download: 'M12 4v12M7 11l5 5 5-5M4 20h16', edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', more: 'M5 12h.01M12 12h.01M19 12h.01', 'more-vertical': 'M12 5h.01M12 12h.01M12 19h.01',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z', sort: 'M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4', link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3', unlock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 7.5-2', mail: 'M3 6h18v12H3zM3 7l9 7 9-7', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  'map-pin': 'M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z',
  heart: 'M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.2 12 20 12 20z', image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01',
  menu: 'M4 7h16M4 12h16M4 17h16', logout: 'M10 4H5v16h5M14 8l4 4-4 4M18 12H9', help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01', alert: 'M12 4l9 16H3zM12 10v4M12 17.5h.01', external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  copy: 'M8 8h12v12H8zM4 16V4h12', eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', refresh: 'M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01', tag: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01',
  message: 'M4 5h16v11H9l-5 4z', send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z', play: 'M7 4l13 8-13 8z', pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
  money: 'M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9v.01M18 15v.01', building: 'M5 21V4h10v17M15 9h4v12M3 21h18M8 8h4M8 12h4M8 16h4',
  cart: 'M3 4h2l2.5 11h11l2-8H6.5M9 20h.01M18 20h.01', box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', zap: 'M13 3L4 14h7l-1 7 9-11h-7z', bookmark: 'M6 3h12v18l-6-4-6 4z', sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  sidebar: 'M3 4h18v16H3zM9 4v16', dashboard: 'M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z', activity: 'M3 12h4l3-8 4 16 3-8h4',
};
export const icons = Object.keys(P);
const svg = (name, size) => P[name]
  ? `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name]}"/></svg>`
  : '';
const icon = (name, size = 18) => (name ? `<wf-icon name="${esc(name)}" style="--wf-icon:${size}px"></wf-icon>` : '');

// ---------------------------------------------------------------- base element
class WfEl extends HTMLElement {
  connectedCallback() {
    if (!this._wfInit) { this._wfInit = true; this.setup?.(); }
    this.render?.();
  }
  attributeChangedCallback() { if (this._wfInit) this.render?.(); }
}
const define = (name, cls) => { if (!customElements.get(name)) customElements.define(name, cls); };
// Wrap author children once so generated chrome can sit beside them.
function adopt(el) {
  if (el._wfKids) return el._wfKids;
  const frag = document.createDocumentFragment();
  while (el.firstChild) frag.appendChild(el.firstChild);
  el._wfKids = frag;
  return frag;
}

// ---------------------------------------------------------------- content
define('wf-icon', class extends WfEl {
  static observedAttributes = ['name', 'size', 'label'];
  render() {
    const name = attr(this, 'name');
    const size = attr(this, 'size');
    if (size) this.style.setProperty('--wf-icon', `${size}px`);
    this.classList.toggle('wf-x-unknown', !P[name]);
    this.innerHTML = svg(name, '100%');
    if (this.hasAttribute('label')) { this.setAttribute('role', 'img'); this.setAttribute('aria-label', attr(this, 'label')); }
    else this.setAttribute('aria-hidden', 'true');
  }
});

define('wf-text-ph', class extends WfEl {
  static observedAttributes = ['lines', 'heading'];
  render() {
    const n = num(attr(this, 'lines', 3), 3);
    const widths = [100, 94, 97, 88, 92, 76];
    let h = this.hasAttribute('heading') ? '<div class="wf-x-bar wf-x-head"></div>' : '';
    for (let i = 0; i < n; i++) h += `<div class="wf-x-bar" style="width:${i === n - 1 && n > 1 ? 62 : widths[i % widths.length]}%"></div>`;
    this.innerHTML = h;
    this.setAttribute('aria-hidden', 'true');
  }
});

define('wf-image', class extends WfEl {
  static observedAttributes = ['label', 'ratio', 'height'];
  render() {
    const r = attr(this, 'ratio');
    if (r) this.style.setProperty('--wf-ratio', r.replace(':', '/'));
    if (this.hasAttribute('height')) { this.style.height = `${attr(this, 'height')}px`; this.style.aspectRatio = 'auto'; }
    const label = attr(this, 'label');
    this.innerHTML = label ? `<span class="wf-x-label">${esc(label)}</span>` : '';
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', label || 'Image placeholder');
  }
});

const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
define('wf-avatar', class extends WfEl {
  static observedAttributes = ['name', 'size'];
  render() {
    const size = attr(this, 'size');
    if (size) this.style.setProperty('--wf-av', `${size}px`);
    this.textContent = initials(attr(this, 'name'));
    this.title = attr(this, 'name');
  }
});
define('wf-avatar-group', class extends WfEl {
  static observedAttributes = ['names', 'max', 'size'];
  render() {
    const names = String(attr(this, 'names')).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const max = num(attr(this, 'max', 4), 4);
    const size = attr(this, 'size', '28');
    this.innerHTML = names.slice(0, max).map((n) => `<wf-avatar name="${esc(n)}" size="${esc(size)}"></wf-avatar>`).join('')
      + (names.length > max ? `<span class="wf-x-more">+${names.length - max}</span>` : '');
  }
});

// ---------------------------------------------------------------- layout
define('wf-sidebar', class extends WfEl {
  setup() {
    const kids = adopt(this);
    const brand = attr(this, 'brand');
    if (brand) {
      const b = document.createElement('div');
      b.className = 'wf-x-brand';
      b.innerHTML = `<span class="wf-x-logo"></span>${esc(brand)}`;
      this.appendChild(b);
    }
    this.appendChild(kids);
    this.setAttribute('role', 'navigation');
  }
});
define('wf-nav-item', class extends WfEl {
  static observedAttributes = ['href', 'icon', 'count', 'active', 'label'];
  setup() { this._label = attr(this, 'label') || this.textContent.trim(); }
  render() {
    const href = attr(this, 'href', '#');
    const here = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    const target = new URL(href, location.href).pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    const active = this.hasAttribute('active') || (href !== '#' && here === target);
    const count = attr(this, 'count');
    this.innerHTML = `<a href="${esc(href)}"${active ? ' aria-current="page"' : ''}>${icon(attr(this, 'icon'), 18)}<span>${esc(this._label)}</span>${count ? `<span class="wf-x-count">${esc(count)}</span>` : ''}</a>`;
  }
});
define('wf-nav-group', class extends WfEl {});
define('wf-topbar', class extends WfEl {
  setup() {
    const kids = adopt(this);
    const brand = attr(this, 'brand');
    if (brand) {
      const b = document.createElement('div');
      b.className = 'wf-x-brand';
      b.innerHTML = `<span class="wf-x-logo" style="width:22px;height:22px;border-radius:6px;background:var(--wf-fill);border:1px solid var(--wf-divider)"></span>${esc(brand)}`;
      this.appendChild(b);
    }
    this.appendChild(kids);
    const here = location.pathname;
    this.querySelectorAll('a[href]').forEach((a) => { if (new URL(a.href).pathname === here) a.setAttribute('aria-current', 'page'); });
  }
});
['wf-app', 'wf-page', 'wf-spacer', 'wf-divider', 'wf-split'].forEach((n) => define(n, class extends WfEl {
  render() {
    if (n === 'wf-split' && this.hasAttribute('ratio')) {
      const [a, b] = attr(this, 'ratio').split(':');
      this.style.setProperty('--wf-split-a', a); this.style.setProperty('--wf-split-b', b);
    }
  }
}));
['wf-stack', 'wf-row'].forEach((n) => define(n, class extends WfEl {}));
define('wf-grid', class extends WfEl {
  static observedAttributes = ['cols'];
  render() { this.style.setProperty('--wf-cols', attr(this, 'cols', '3')); }
});
define('wf-page-header', class extends WfEl {
  setup() {
    const kids = adopt(this);
    const crumbs = attr(this, 'crumbs');
    const t = document.createElement('div');
    t.className = 'wf-x-titles';
    t.innerHTML = (crumbs ? `<wf-breadcrumbs>${crumbs.split(/\s+\/\s+/).map((c) => {
      const [label, href] = c.split('|').map((s) => s.trim());
      return href ? `<a href="${esc(href)}">${esc(label)}</a>` : `<span>${esc(label)}</span>`;
    }).join('')}</wf-breadcrumbs>` : '')
      + `<h1>${esc(attr(this, 'title'))}</h1>` + (this.hasAttribute('subtitle') ? `<p>${esc(attr(this, 'subtitle'))}</p>` : '');
    const a = document.createElement('div');
    a.className = 'wf-x-actions';
    a.appendChild(kids);
    this.append(t, a);
  }
});
define('wf-card', class extends WfEl {
  setup() {
    const kids = adopt(this);
    const title = attr(this, 'title');
    if (title || this.hasAttribute('action')) {
      const h = document.createElement('div');
      h.className = 'wf-x-card-head';
      h.innerHTML = `<h3>${esc(title)}</h3>${this.hasAttribute('action') ? `<a href="${esc(attr(this, 'action-href', '#'))}" style="font-size:13px">${esc(attr(this, 'action'))}</a>` : ''}`;
      this.appendChild(h);
    }
    this.appendChild(kids);
    if (this.hasAttribute('href')) {
      this.tabIndex = 0;
      this.setAttribute('role', 'link');
      const go = () => { location.href = attr(this, 'href'); };
      this.addEventListener('click', (e) => { if (!e.target.closest('a,button,input')) go(); });
      this.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    }
  }
});
define('wf-section', class extends WfEl {
  setup() {
    const kids = adopt(this);
    if (this.hasAttribute('title')) {
      const h = document.createElement('div');
      h.className = 'wf-x-sec-head';
      h.innerHTML = `<h2>${esc(attr(this, 'title'))}</h2>${this.hasAttribute('subtitle') ? `<small>${esc(attr(this, 'subtitle'))}</small>` : ''}`;
      this.appendChild(h);
    }
    this.appendChild(kids);
  }
});

// ---------------------------------------------------------------- inputs
define('wf-field', class extends WfEl {
  static observedAttributes = ['error', 'help', 'label'];
  setup() {
    const kids = adopt(this);
    this._label = document.createElement('label');
    this._help = document.createElement('span');
    this._help.className = 'wf-help';
    this._help.id = nextId('help');
    this.append(this._label, kids, this._help);
  }
  render() {
    const control = this.querySelector('input,select,textarea,wf-combobox input,wf-tags input');
    if (control && !control.id) control.id = nextId('f');
    if (control) this._label.htmlFor = control.id;
    this._label.innerHTML = esc(attr(this, 'label')) + (this.hasAttribute('optional') ? ' <span class="wf-optional">(optional)</span>' : '') + (this.hasAttribute('required') ? ' <span aria-hidden="true">*</span>' : '');
    const err = attr(this, 'error');
    this._help.className = err ? 'wf-error' : 'wf-help';
    this._help.textContent = err || attr(this, 'help');
    this._help.hidden = !this._help.textContent;
    if (control) {
      control.setAttribute('aria-invalid', err ? 'true' : 'false');
      if (this._help.textContent) control.setAttribute('aria-describedby', this._help.id);
      if (this.hasAttribute('required')) control.required = true;
    }
  }
});

define('wf-switch', class extends WfEl {
  setup() {
    const label = attr(this, 'label') || this.textContent.trim();
    this.innerHTML = '';
    const l = document.createElement('label');
    l.style.cssText = 'display:inline-flex;align-items:center;gap:10px;cursor:inherit;justify-content:space-between;width:100%';
    l.innerHTML = `${this.hasAttribute('label-after') ? '' : `<span>${esc(label)}</span>`}<input type="checkbox" role="switch"${this.hasAttribute('checked') ? ' checked' : ''}${this.hasAttribute('disabled') ? ' disabled' : ''} name="${esc(attr(this, 'name'))}"><span class="wf-x-track"><span class="wf-x-knob"></span></span>${this.hasAttribute('label-after') ? `<span>${esc(label)}</span>` : ''}`;
    this.appendChild(l);
    this.input = l.querySelector('input');
    this.input.addEventListener('change', () => { emit(this, 'change', { checked: this.input.checked }); });
  }
  get checked() { return this.input?.checked; }
  set checked(v) { if (this.input) this.input.checked = !!v; }
});

define('wf-segmented', class extends WfEl {
  static observedAttributes = ['options', 'value'];
  render() {
    const opts = list(attr(this, 'options'));
    const value = attr(this, 'value', opts[0]);
    this.setAttribute('role', 'group');
    this.innerHTML = opts.map((o) => `<button type="button" class="wf-x-seg" aria-pressed="${o === value}">${esc(o)}</button>`).join('');
    this.querySelectorAll('button').forEach((b, i) => b.addEventListener('click', () => {
      this.setAttribute('value', opts[i]);
      emit(this, 'change', { value: opts[i] });
    }));
  }
  get value() { return attr(this, 'value', list(attr(this, 'options'))[0]); }
});

define('wf-stepper', class extends WfEl {
  setup() {
    const v = num(attr(this, 'value', 0));
    this.innerHTML = `<button type="button" class="wf-x-step" aria-label="Decrease">−</button><input class="wf-x-num" inputmode="numeric" value="${v}" aria-label="${esc(attr(this, 'label', 'Quantity'))}"><button type="button" class="wf-x-step" aria-label="Increase">+</button>`;
    const [dec, input, inc] = this.children;
    const set = (n) => {
      const min = num(attr(this, 'min', -Infinity), -Infinity);
      const max = num(attr(this, 'max', Infinity), Infinity);
      n = Math.min(max, Math.max(min, n));
      input.value = n;
      this.setAttribute('value', n);
      emit(this, 'change', { value: n });
    };
    dec.onclick = () => set(num(input.value) - num(attr(this, 'step', 1), 1));
    inc.onclick = () => set(num(input.value) + num(attr(this, 'step', 1), 1));
    input.onchange = () => set(num(input.value));
  }
  get value() { return num(attr(this, 'value', 0)); }
});

const fmtSize = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
define('wf-upload', class extends WfEl {
  setup() {
    this.files = [];
    this.innerHTML = `<label class="wf-x-drop">${icon('upload', 22)}<span><b>${esc(attr(this, 'label', 'Drop files here'))}</b> or browse</span><small>${esc(attr(this, 'hint', 'Any file up to 10 MB'))}</small><input type="file" class="wf-sr"${this.hasAttribute('multiple') ? ' multiple' : ''}></label><div class="wf-x-files"></div>`;
    const drop = this.querySelector('.wf-x-drop');
    const input = this.querySelector('input');
    const add = (files) => {
      for (const f of files) this.files.push({ name: f.name, size: f.size });
      this.paint();
      emit(this, 'change', { files: this.files });
    };
    input.onchange = () => add(input.files);
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('wf-x-over'); };
    drop.ondragleave = () => drop.classList.remove('wf-x-over');
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('wf-x-over'); add(e.dataTransfer.files); };
    list(attr(this, 'files')).forEach((n) => this.files.push({ name: n, size: 240000 }));
    this.paint();
  }
  paint() {
    const box = this.querySelector('.wf-x-files');
    box.innerHTML = this.files.map((f, i) => `<div class="wf-x-file">${icon('file', 16)}<span>${esc(f.name)}</span><small>${fmtSize(f.size)}</small><button type="button" class="wf-x-close" data-i="${i}" aria-label="Remove ${esc(f.name)}" style="margin-left:auto">${svg('x', 14)}</button></div>`).join('');
    box.querySelectorAll('button').forEach((b) => b.onclick = () => { this.files.splice(Number(b.dataset.i), 1); this.paint(); emit(this, 'change', { files: this.files }); });
  }
});

define('wf-tags', class extends WfEl {
  setup() {
    this.tags = list(attr(this, 'value'));
    this.addEventListener('click', () => this.querySelector('input')?.focus());
    this.paint();
  }
  paint() {
    this.innerHTML = this.tags.map((t, i) => `<span class="wf-x-chip">${esc(t)}<button type="button" data-i="${i}" aria-label="Remove ${esc(t)}">×</button></span>`).join('')
      + `<input class="wf-x-tagin" placeholder="${esc(attr(this, 'placeholder', 'Add…'))}" aria-label="${esc(attr(this, 'label', 'Add tag'))}">`;
    this.querySelectorAll('button').forEach((b) => b.onclick = (e) => { e.stopPropagation(); this.tags.splice(Number(b.dataset.i), 1); this.paint(); this.changed(); });
    const input = this.querySelector('input');
    input.onkeydown = (e) => {
      if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) { e.preventDefault(); this.tags.push(input.value.trim()); this.paint(); this.changed(); this.querySelector('input').focus(); }
      else if (e.key === 'Backspace' && !input.value && this.tags.length) { this.tags.pop(); this.paint(); this.changed(); this.querySelector('input').focus(); }
    };
  }
  changed() { this.setAttribute('value', this.tags.join(',')); emit(this, 'change', { value: this.tags }); }
  get value() { return this.tags; }
});

// Shared floating list used by combobox, search suggestions and menu.
function floatingList(host, items, { onPick, align, checked } = {}) {
  closeFloating();
  const box = document.createElement('div');
  box.className = 'wf-x-list';
  box.setAttribute('role', 'listbox');
  if (align) box.dataset.align = align;
  box.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : it.group ? `<div class="wf-x-group">${esc(it.group)}</div>`
    : `<${it.href ? `a href="${esc(it.href)}"` : 'button type="button"'} class="wf-x-opt" role="option" data-i="${i}"${checked === it.label ? ' aria-checked="true"' : ''}${it.variant ? ` data-variant="${esc(it.variant)}"` : ''}>${icon(it.icon, 16)}<span>${esc(it.label)}</span>${it.kbd ? `<span class="wf-x-kbd">${esc(it.kbd)}</span>` : ''}</${it.href ? 'a' : 'button'}>`).join('');
  host.appendChild(box);
  box.querySelectorAll('.wf-x-opt').forEach((o) => o.addEventListener('click', (e) => { const it = items[Number(o.dataset.i)]; closeFloating(); onPick?.(it, e); }));
  floatingList.open = { host, box };
  setTimeout(() => document.addEventListener('click', outside, { once: true }));
  function outside(e) { if (floatingList.open?.box === box && !host.contains(e.target)) closeFloating(); else if (floatingList.open?.box === box) document.addEventListener('click', outside, { once: true }); }
  return box;
}
function closeFloating() { floatingList.open?.box.remove(); floatingList.open = null; }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFloating(); });

define('wf-combobox', class extends WfEl {
  setup() {
    this.options = list(attr(this, 'options'));
    this.innerHTML = `<input role="combobox" aria-expanded="false" autocomplete="off" placeholder="${esc(attr(this, 'placeholder', 'Select…'))}" value="${esc(attr(this, 'value'))}" name="${esc(attr(this, 'name'))}">`;
    const input = this.firstChild;
    const show = () => {
      const q = input.value.toLowerCase();
      const items = this.options.filter((o) => !q || o.toLowerCase().includes(q) || o === attr(this, 'value')).map((label) => ({ label }));
      floatingList(this, items.length ? items : [{ label: 'No matches' }], { checked: attr(this, 'value'), onPick: (it) => {
        if (it.label === 'No matches') return;
        input.value = it.label; this.setAttribute('value', it.label); emit(this, 'change', { value: it.label });
      } });
    };
    input.addEventListener('focus', show);
    input.addEventListener('input', show);
  }
  get value() { return attr(this, 'value'); }
});

define('wf-search', class extends WfEl {
  setup() {
    const sc = attr(this, 'shortcut');
    this.innerHTML = `${icon('search', 16).replace('<wf-icon', '<wf-icon class="wf-x-lead"')}<input type="search" placeholder="${esc(attr(this, 'placeholder', 'Search'))}" aria-label="${esc(attr(this, 'placeholder', 'Search'))}" value="${esc(attr(this, 'value'))}">${sc ? `<kbd>${esc(sc)}</kbd>` : ''}`;
    const input = this.querySelector('input');
    input.addEventListener('input', () => emit(this, 'search', { value: input.value }));
    if (sc) document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === sc.slice(-1).toLowerCase() && !this.closest('wf-command')) { e.preventDefault(); input.focus(); } });
  }
  get value() { return this.querySelector('input')?.value || ''; }
});

// ---------------------------------------------------------------- navigation
define('wf-tabs', class extends WfEl {
  static observedAttributes = ['value', 'counts', 'tabs'];
  setup() {
    adopt(this);
    this.panels = [...this._wfKids.children].filter((c) => c.hasAttribute('data-tab') || c.tagName === 'WF-TAB-PANEL');
    this.tabs = list(attr(this, 'tabs'));
    if (!this.tabs.length) this.tabs = this.panels.map((p) => p.getAttribute('data-tab') || p.getAttribute('label'));
    this.bar = document.createElement('div');
    this.bar.className = 'wf-x-tablist';
    this.bar.setAttribute('role', 'tablist');
    this.append(this.bar, this._wfKids);
  }
  render() {
    if (this.hasAttribute('tabs')) this.tabs = list(attr(this, 'tabs'));
    const value = attr(this, 'value', this.tabs[0]);
    const counts = list(attr(this, 'counts'));
    this.bar.innerHTML = this.tabs.map((t, i) => `<button type="button" role="tab" class="wf-x-tab" aria-selected="${t === value}">${esc(t)}${counts[i] ? `<span class="wf-x-count">${esc(counts[i])}</span>` : ''}</button>`).join('');
    this.bar.querySelectorAll('button').forEach((b, i) => b.onclick = () => { this.setAttribute('value', this.tabs[i]); emit(this, 'change', { value: this.tabs[i] }); });
    this.panels.forEach((p) => { p.hidden = (p.getAttribute('data-tab') || p.getAttribute('label')) !== value; p.setAttribute('role', 'tabpanel'); });
  }
  get value() { return attr(this, 'value', this.tabs?.[0]); }
});
define('wf-tab-panel', class extends WfEl {});
define('wf-breadcrumbs', class extends WfEl { setup() { this.setAttribute('aria-label', 'Breadcrumb'); } });

define('wf-pagination', class extends WfEl {
  static observedAttributes = ['page', 'pages', 'total', 'per-page'];
  render() {
    const total = num(attr(this, 'total', 0));
    const per = num(attr(this, 'per-page', 25), 25);
    const pages = num(attr(this, 'pages', Math.max(1, Math.ceil(total / per))), 1);
    const page = Math.min(pages, Math.max(1, num(attr(this, 'page', 1), 1)));
    const nums = [];
    for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
    this.setAttribute('role', 'navigation');
    this.innerHTML = `<button type="button" class="wf-x-pg wf-x-edge" data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>`
      + nums.map((n) => n === '…' ? '<span>…</span>' : `<button type="button" class="wf-x-pg" data-p="${n}"${n === page ? ' aria-current="page"' : ''}>${n}</button>`).join('')
      + `<button type="button" class="wf-x-pg wf-x-edge" data-p="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Next page">›</button>`
      + (total ? `<span class="wf-x-summary">${(page - 1) * per + 1}–${Math.min(total, page * per)} of ${total}</span>` : '');
    this.querySelectorAll('button').forEach((b) => b.onclick = () => { this.setAttribute('page', b.dataset.p); emit(this, 'change', { page: Number(b.dataset.p) }); });
  }
});

define('wf-steps', class extends WfEl {
  static observedAttributes = ['items', 'current'];
  render() {
    const items = list(attr(this, 'items'));
    const cur = num(attr(this, 'current', 1), 1);
    this.innerHTML = items.map((t, i) => {
      const state = i + 1 < cur ? 'done' : i + 1 === cur ? 'current' : 'todo';
      return `<div class="wf-x-step" data-state="${state}"${state === 'current' ? ' aria-current="step"' : ''}><span class="wf-x-dot">${state === 'done' ? '✓' : i + 1}</span>${esc(t)}</div>`;
    }).join('');
  }
});

define('wf-menu', class extends WfEl {
  setup() {
    const kids = adopt(this);
    this.items = [...kids.children].map((c) => c.tagName === 'HR' ? '-' : {
      label: c.getAttribute('label') || c.textContent.trim(), icon: c.getAttribute('icon'), href: c.getAttribute('href'),
      kbd: c.getAttribute('shortcut'), variant: c.getAttribute('variant'), value: c.getAttribute('value'),
    });
    const label = attr(this, 'label');
    const ic = attr(this, 'icon', label ? 'chevron-down' : 'more');
    this.btn = document.createElement('button');
    this.btn.type = 'button';
    this.btn.setAttribute('aria-haspopup', 'menu');
    if (label) { this.btn.innerHTML = `${esc(label)}${icon(ic, 16)}`; if (attr(this, 'variant')) this.btn.dataset.variant = attr(this, 'variant'); }
    else { this.btn.innerHTML = icon(ic, 18); this.btn.dataset.iconOnly = ''; this.btn.dataset.variant = 'ghost'; this.btn.setAttribute('aria-label', attr(this, 'aria-label', 'More actions')); }
    if (attr(this, 'size')) this.btn.dataset.size = attr(this, 'size');
    this.appendChild(this.btn);
    this.btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (floatingList.open?.host === this) return closeFloating();
      const box = floatingList(this, this.items, { align: attr(this, 'align', 'left'), onPick: (it) => emit(this, 'select', { value: it.value || it.label, item: it }) });
      box.setAttribute('role', 'menu');
      box.style.minWidth = '180px';
      box.querySelector('.wf-x-opt')?.focus();
    });
  }
});
define('wf-menu-item', class extends WfEl {});

define('wf-command', class extends WfEl {
  setup() {
    const kids = adopt(this);
    this.extra = [...kids.children].map((c) => ({ label: c.getAttribute('label') || c.textContent.trim(), href: c.getAttribute('href'), icon: c.getAttribute('icon'), group: undefined }));
    document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); this.open(); } });
  }
  open() {
    const pages = [...document.querySelectorAll('wf-nav-item')].map((n) => ({ label: n._label || n.textContent.trim(), href: n.getAttribute('href'), icon: n.getAttribute('icon') }));
    const all = [{ group: 'Go to' }, ...pages, ...(this.extra.length ? [{ group: 'Actions' }, ...this.extra] : [])];
    const ov = overlay(`<div class="wf-x-dialog" role="dialog" aria-label="Command menu" style="--wf-w:560px;align-self:flex-start;margin-top:12vh"><div style="padding:10px 12px;border-bottom:1px solid var(--wf-divider)"><input placeholder="Type a command or search…" aria-label="Command" style="border:0;height:32px"></div><div class="wf-x-cmdlist" style="position:relative;min-height:60px"></div></div>`);
    const input = ov.querySelector('input');
    const host = ov.querySelector('.wf-x-cmdlist');
    const paint = () => {
      const q = input.value.toLowerCase();
      const items = all.filter((it) => it.group || it.label.toLowerCase().includes(q));
      const box = floatingList(host, items, { onPick: (it) => { ov.close(); if (it.href) location.href = it.href; else emit(this, 'select', { value: it.label }); } });
      box.style.cssText = 'position:static;border:0;box-shadow:none;max-height:50vh';
    };
    input.oninput = paint;
    paint();
    input.focus();
  }
});

// ---------------------------------------------------------------- data display
define('wf-table', class extends WfEl {
  static observedAttributes = ['empty'];
  setup() {
    this.sort = null;
    this.observer = new MutationObserver(() => { if (!this._busy) this.enhance(); });
    this.observer.observe(this, { childList: true, subtree: true });
  }
  render() { this.enhance(); }
  enhance() {
    const table = this.querySelector('table');
    if (!table) return;
    this._busy = true;
    const selectable = this.hasAttribute('selectable');
    const headRow = table.tHead?.rows[0];
    const body = table.tBodies[0];
    const rows = body ? [...body.rows].filter((r) => !r.classList.contains('wf-x-empty')) : [];
    if (selectable && headRow && !headRow.querySelector('.wf-x-selcol')) {
      const th = document.createElement('th');
      th.className = 'wf-x-selcol';
      th.innerHTML = '<input type="checkbox" aria-label="Select all rows">';
      headRow.prepend(th);
      th.firstChild.onchange = (e) => { this.rows().forEach((r) => this.select(r, e.target.checked)); this.changed(); };
    }
    for (const r of rows) {
      if (selectable && !r.querySelector('.wf-x-selcol')) {
        const td = document.createElement('td');
        td.className = 'wf-x-selcol';
        td.innerHTML = `<input type="checkbox" aria-label="Select row">`;
        r.prepend(td);
        td.firstChild.onchange = (e) => { this.select(r, e.target.checked); this.changed(); };
      }
      if (r.dataset.href && !r._wfLink) {
        r._wfLink = true;
        r.addEventListener('click', (e) => { if (!e.target.closest('a,button,input,wf-menu')) location.href = r.dataset.href; });
      }
    }
    if (this.hasAttribute('sortable') && headRow) {
      [...headRow.cells].forEach((th, i) => {
        if (th.classList.contains('wf-x-selcol') || th.hasAttribute('data-nosort') || th._wfSort) return;
        th._wfSort = true;
        th.dataset.sortable = '';
        th.tabIndex = 0;
        const go = () => this.sortBy(i, th);
        th.addEventListener('click', go);
        th.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      });
    }
    const cols = headRow ? headRow.cells.length : 1;
    const emptyRow = body?.querySelector('.wf-x-empty');
    if (body && !rows.length && this.hasAttribute('empty')) {
      if (!emptyRow) {
        const tr = document.createElement('tr');
        tr.className = 'wf-x-empty';
        tr.innerHTML = `<td colspan="${cols}" style="padding:16px"><wf-empty icon="${esc(attr(this, 'empty-icon', 'inbox'))}" title="${esc(attr(this, 'empty'))}" text="${esc(attr(this, 'empty-text'))}"></wf-empty></td>`;
        body.appendChild(tr);
      }
    } else if (emptyRow && rows.length) emptyRow.remove();
    this._busy = false;
    this.changed(true);
  }
  rows() { return [...(this.querySelector('tbody')?.rows || [])].filter((r) => !r.classList.contains('wf-x-empty')); }
  select(r, on) { r.setAttribute('aria-selected', on ? 'true' : 'false'); const cb = r.querySelector('.wf-x-selcol input'); if (cb) cb.checked = on; }
  get selected() { return this.rows().filter((r) => r.getAttribute('aria-selected') === 'true').map((r) => r.dataset.id ?? r.rowIndex); }
  changed(quiet) {
    if (!this.hasAttribute('selectable')) return;
    const sel = this.selected;
    const all = this.querySelector('thead .wf-x-selcol input');
    if (all) { all.checked = sel.length && sel.length === this.rows().length; all.indeterminate = sel.length > 0 && sel.length < this.rows().length; }
    if (!quiet) emit(this, 'selection', { ids: sel });
  }
  sortBy(i, th) {
    const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    th.parentNode.querySelectorAll('th').forEach((h) => h.removeAttribute('aria-sort'));
    th.setAttribute('aria-sort', dir);
    const val = (r) => { const t = r.cells[i]?.dataset.sort ?? r.cells[i]?.textContent.trim() ?? ''; const n = Number(t.replace(/[^0-9.-]/g, '')); return t && /\d/.test(t) && !Number.isNaN(n) && !/[a-z]{3,}/i.test(t.replace(/[€$£]|eur|usd|gbp/gi, '')) ? n : t.toLowerCase(); };
    const body = this.querySelector('tbody');
    this._busy = true;
    this.rows().sort((a, b) => { const x = val(a), y = val(b); return (x > y ? 1 : x < y ? -1 : 0) * (dir === 'ascending' ? 1 : -1); }).forEach((r) => body.appendChild(r));
    this._busy = false;
    emit(this, 'sort', { column: i, dir });
  }
});

const spark = (vals, w = 200, h = 28) => {
  if (vals.length < 2) return '';
  const max = Math.max(...vals), min = Math.min(...vals), span = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" height="${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--wf-ink)" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
};
define('wf-stat', class extends WfEl {
  static observedAttributes = ['label', 'value', 'delta', 'trend'];
  render() {
    const delta = attr(this, 'delta');
    const up = delta && !delta.trim().startsWith('-');
    this.innerHTML = `<span class="wf-x-label">${esc(attr(this, 'label'))}</span><span class="wf-x-value">${esc(attr(this, 'value'))}</span>`
      + (delta ? `<span class="wf-x-delta">${up ? '▲' : '▼'} ${esc(delta.replace(/^[+-]/, ''))}</span>` : '')
      + spark(list(attr(this, 'trend')).map(Number));
  }
});

define('wf-chart', class extends WfEl {
  static observedAttributes = ['type', 'values', 'labels', 'height', 'series'];
  render() {
    const type = attr(this, 'type', 'bar');
    const series = attr(this, 'values', '3,5,4,7,6,8').split('|').map((s) => list(s).map(Number));
    const labels = list(attr(this, 'labels'));
    const names = list(attr(this, 'series'));
    const H = num(attr(this, 'height', 180), 180);
    const W = 600;
    const fills = ['var(--wf-ink)', 'var(--wf-line)', 'var(--wf-line-soft)', 'var(--wf-divider)'];
    let body = '';
    if (type === 'donut' || type === 'pie') {
      const vals = series[0];
      const total = vals.reduce((a, b) => a + b, 0) || 1;
      const r = 15.9155; let acc = 0;
      body = `<svg viewBox="0 0 42 42" style="max-width:${H}px;height:${H}px" role="img" aria-label="${esc(attr(this, 'label', 'Chart'))}"><circle cx="21" cy="21" r="${r}" fill="none" stroke="var(--wf-skeleton)" stroke-width="7"/>`
        + vals.map((v, i) => { const pct = (v / total) * 100; const s = `<circle cx="21" cy="21" r="${r}" fill="none" stroke="${fills[i % 4]}" stroke-width="7" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${25 - acc}"/>`; acc += pct; return s; }).join('')
        + `</svg>`;
      this.innerHTML = body + (labels.length ? `<div class="wf-x-legend">${labels.map((l, i) => `<span style="--wf-sw:${fills[i % 4]}">${esc(l)}</span>`).join('')}</div>` : '');
      return;
    }
    const all = series.flat();
    const max = Math.max(...all, 1);
    const n = Math.max(...series.map((s) => s.length));
    const pad = 22;
    const y = (v) => H - pad - (v / max) * (H - pad - 8);
    let grid = '';
    for (let g = 0; g <= 3; g++) { const gy = 8 + (g * (H - pad - 8)) / 3; grid += `<line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="var(--wf-skeleton)" stroke-width="1"/>`; }
    if (type === 'bar') {
      const slot = W / n; const bw = (slot * 0.7) / series.length;
      series.forEach((s, si) => s.forEach((v, i) => { body += `<rect x="${i * slot + slot * 0.15 + si * bw}" y="${y(v)}" width="${bw - 2}" height="${H - pad - y(v)}" fill="${fills[si % 4]}"/>`; }));
    } else {
      series.forEach((s, si) => {
        const pts = s.map((v, i) => `${(i / Math.max(1, s.length - 1)) * W},${y(v)}`);
        if (type === 'area') body += `<polygon points="0,${H - pad} ${pts.join(' ')} ${W},${H - pad}" fill="${fills[(si + 2) % 4]}" opacity=".6"/>`;
        body += `<polyline points="${pts.join(' ')}" fill="none" stroke="${si ? 'var(--wf-line)' : 'var(--wf-ink)'}" stroke-width="2" ${si ? 'stroke-dasharray="6 4"' : ''} vector-effect="non-scaling-stroke"/>`;
      });
    }
    const lab = labels.map((l, i) => `<text x="${type === 'bar' ? (i + 0.5) * (W / n) : (i / Math.max(1, n - 1)) * W}" y="${H - 4}" font-size="11" text-anchor="middle" fill="var(--wf-muted)" font-family="var(--wf-font)">${esc(l)}</text>`).join('');
    this.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" preserveAspectRatio="none" role="img" aria-label="${esc(attr(this, 'label', 'Chart'))}">${grid}${body}<line x1="0" x2="${W}" y1="${H - pad}" y2="${H - pad}" stroke="var(--wf-ink)" stroke-width="1.5"/>${lab}</svg>`
      + (names.length ? `<div class="wf-x-legend">${names.map((l, i) => `<span style="--wf-sw:${fills[i % 4]}">${esc(l)}</span>`).join('')}</div>` : '');
  }
});

['wf-badge', 'wf-tag'].forEach((n) => define(n, class extends WfEl {}));

define('wf-timeline', class extends WfEl {});
define('wf-timeline-item', class extends WfEl {
  setup() {
    const kids = adopt(this);
    const t = document.createElement('div');
    t.innerHTML = this.hasAttribute('title') ? `<b>${esc(attr(this, 'title'))}</b> ` : '';
    t.appendChild(kids);
    const m = document.createElement('div');
    m.className = 'wf-x-meta';
    m.textContent = attr(this, 'meta');
    this.append(t, m);
  }
});

define('wf-list', class extends WfEl { setup() { this.setAttribute('role', 'list'); } });
define('wf-list-item', class extends WfEl {
  setup() {
    const kids = adopt(this);
    this.setAttribute('role', 'listitem');
    const avatar = attr(this, 'avatar');
    const ic = attr(this, 'icon');
    const lead = avatar ? `<wf-avatar name="${esc(avatar)}"></wf-avatar>` : ic ? `<span style="width:32px;height:32px;border-radius:6px;background:var(--wf-fill);display:flex;align-items:center;justify-content:center;flex:none">${icon(ic, 16)}</span>` : '';
    const body = document.createElement('div');
    body.className = 'wf-x-body';
    if (this.hasAttribute('title')) body.innerHTML = `<span class="wf-x-title">${esc(attr(this, 'title'))}</span>${this.hasAttribute('meta') ? `<span class="wf-x-meta">${esc(attr(this, 'meta'))}</span>` : ''}`;
    const trail = document.createElement('div');
    trail.style.cssText = 'display:flex;align-items:center;gap:8px;flex:none';
    if (this.hasAttribute('title')) trail.appendChild(kids); else body.appendChild(kids);
    this.insertAdjacentHTML('afterbegin', lead);
    this.append(body, trail);
    if (this.hasAttribute('href')) {
      trail.insertAdjacentHTML('beforeend', icon('chevron-right', 16));
      this.tabIndex = 0;
      const go = () => { location.href = attr(this, 'href'); };
      this.addEventListener('click', (e) => { if (!e.target.closest('a,button,input,wf-menu')) go(); });
      this.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    }
  }
});

define('wf-kanban', class extends WfEl {});
define('wf-kanban-column', class extends WfEl {
  setup() {
    const kids = adopt(this);
    const h = document.createElement('div');
    h.className = 'wf-x-colhead';
    h.innerHTML = `<span>${esc(attr(this, 'title'))}</span><span class="wf-muted">${kids.children.length}</span>`;
    this.append(h, kids);
  }
});

define('wf-calendar', class extends WfEl {
  static observedAttributes = ['month', 'marks', 'selected'];
  render() {
    const [y, m] = attr(this, 'month', new Date().toISOString().slice(0, 7)).split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const days = new Date(y, m, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const marks = list(attr(this, 'marks')).map(Number);
    const sel = num(attr(this, 'selected', 0));
    let cells = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<span class="wf-x-dow">${d}</span>`).join('');
    for (let i = 0; i < offset; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) cells += `<button type="button" class="wf-x-day" data-d="${d}" aria-pressed="${d === sel}">${d}${marks.includes(d) ? '<span class="wf-x-mark"></span>' : ''}</button>`;
    const title = first.toLocaleString('en', { month: 'long', year: 'numeric' });
    this.innerHTML = `<div class="wf-x-calhead"><button type="button" class="wf-x-close" data-step="-1" aria-label="Previous month">${svg('chevron-left', 16)}</button><span>${title}</span><button type="button" class="wf-x-close" data-step="1" aria-label="Next month">${svg('chevron-right', 16)}</button></div><div class="wf-x-calgrid">${cells}</div>`;
    this.querySelectorAll('.wf-x-day').forEach((b) => b.onclick = () => { this.setAttribute('selected', b.dataset.d); emit(this, 'change', { date: `${y}-${String(m).padStart(2, '0')}-${String(b.dataset.d).padStart(2, '0')}` }); });
    this.querySelectorAll('[data-step]').forEach((b) => b.onclick = () => { const d = new Date(y, m - 1 + Number(b.dataset.step), 1); this.setAttribute('month', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); });
  }
});

define('wf-map', class extends WfEl {
  static observedAttributes = ['pins', 'ratio'];
  render() {
    if (this.hasAttribute('ratio')) this.style.setProperty('--wf-ratio', attr(this, 'ratio').replace(':', '/'));
    const pins = attr(this, 'pins', '45:40').split(/\s+/).filter(Boolean);
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', attr(this, 'label', 'Map placeholder'));
    this.innerHTML = pins.map((p) => { const [x, y] = p.split(':'); return `<span class="wf-x-pin" style="left:${x}%;top:${y}%">${icon('map-pin', 26)}</span>`; }).join('');
  }
});
define('wf-video', class extends WfEl {
  render() {
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', attr(this, 'label', 'Video placeholder'));
    this.innerHTML = `<span class="wf-x-play">${svg('play', 20)}</span><span class="wf-x-bar"></span>`;
  }
});
define('wf-file', class extends WfEl {
  static observedAttributes = ['name', 'size'];
  render() {
    const name = attr(this, 'name', 'document.pdf');
    const ext = name.includes('.') ? name.split('.').pop() : 'file';
    this.innerHTML = `<span class="wf-x-ext">${esc(ext)}</span><span>${esc(name)}</span><span class="wf-x-size">${esc(attr(this, 'size'))}</span>`;
  }
});
define('wf-thread', class extends WfEl {});
define('wf-message', class extends WfEl {
  setup() {
    const kids = adopt(this);
    const b = document.createElement('div');
    b.className = 'wf-x-bubble';
    b.appendChild(kids);
    if (this.hasAttribute('time')) b.insertAdjacentHTML('beforeend', `<span class="wf-x-time">${esc(attr(this, 'time'))}</span>`);
    this.insertAdjacentHTML('afterbegin', `<wf-avatar name="${esc(attr(this, 'name'))}" size="26"></wf-avatar>`);
    this.appendChild(b);
  }
});

// ---------------------------------------------------------------- feedback & overlays
function overlay(html, { drawer, side, onClose } = {}) {
  const ov = document.createElement('div');
  ov.className = `wf-x-overlay wf${drawer ? ' wf-x-drawer' : ''}`;
  if (side) ov.dataset.side = side;
  ov.innerHTML = html;
  document.body.appendChild(ov);
  const prev = document.activeElement;
  const close = () => { ov.remove(); document.removeEventListener('keydown', key); prev?.focus?.(); onClose?.(); };
  const key = (e) => { if (e.key === 'Escape' && document.querySelector('.wf-x-overlay:last-of-type') === ov) close(); };
  document.addEventListener('keydown', key);
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
  ov.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  ov.close = close;
  return ov;
}

// Dialog content stays inside the (hidden) element while closed, so screens can
// find and wire up its fields on load; it moves into the overlay while open.
class WfDialog extends WfEl {
  open() {
    if (this._ov) return;
    const drawer = this.tagName === 'WF-DRAWER';
    const id = nextId('dlg');
    const ov = overlay(`<div class="wf-x-dialog" role="dialog" aria-modal="true" aria-labelledby="${id}" style="--wf-w:${esc(attr(this, 'width', drawer ? '420' : '480'))}px"><div class="wf-x-dhead"><h2 id="${id}" style="font-size:18px">${esc(attr(this, 'title'))}</h2><button type="button" class="wf-x-close" data-close aria-label="Close">${svg('x', 18)}</button></div><div class="wf-x-dbody"></div></div>`,
      { drawer, side: attr(this, 'side'), onClose: () => { moved.forEach((n) => this.appendChild(n)); this._ov = null; emit(this, 'close'); } });
    const body = ov.querySelector('.wf-x-dbody');
    const moved = [...this.childNodes];
    const foot = moved.find((c) => c.tagName === 'FOOTER');
    moved.forEach((n) => { if (n !== foot) body.appendChild(n); });
    if (foot) ov.querySelector('.wf-x-dialog').appendChild(foot);
    this._ov = ov;
    ov.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); ov.close(); }));
    (body.querySelector('input,select,textarea,button') || ov.querySelector('.wf-x-close')).focus();
    emit(this, 'open');
  }
  close() { this._ov?.close(); }
}
define('wf-modal', class extends WfDialog {});
define('wf-drawer', class extends WfDialog {});

define('wf-popover', class extends WfEl {
  toggle(anchor) { this._pop ? this.close() : this.open(anchor); }
  open(anchor) {
    this.close();
    const pop = document.createElement('div');
    pop.className = 'wf-x-pop';
    pop.setAttribute('role', 'dialog');
    if (this.hasAttribute('width')) pop.style.setProperty('--wf-w', `${attr(this, 'width')}px`);
    if (this.hasAttribute('title')) pop.innerHTML = `<div class="wf-x-pophead"><span>${esc(attr(this, 'title'))}</span><button type="button" class="wf-x-close" aria-label="Close">${svg('x', 14)}</button></div>`;
    this._moved = [...this.childNodes];
    this._moved.forEach((n) => pop.appendChild(n));
    document.body.appendChild(pop);
    document.body.classList.add('wf');
    place(pop, anchor, attr(this, 'placement', 'bottom'), 8);
    this._pop = pop; this._anchor = anchor;
    anchor?.setAttribute('aria-expanded', 'true');
    pop.querySelector('.wf-x-close')?.addEventListener('click', () => this.close());
    pop.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) this.close(); });
    this._out = (e) => { if (!pop.contains(e.target) && !anchor?.contains(e.target)) this.close(); };
    this._key = (e) => { if (e.key === 'Escape') this.close(); };
    setTimeout(() => { document.addEventListener('mousedown', this._out); document.addEventListener('keydown', this._key); });
    (pop.querySelector('input,textarea,select') || pop.querySelector('button'))?.focus();
    emit(this, 'open');
  }
  close() {
    if (!this._pop) return;
    this._moved.forEach((n) => this.appendChild(n));
    this._pop.remove(); this._pop = null;
    this._anchor?.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', this._out);
    document.removeEventListener('keydown', this._key);
    emit(this, 'close');
  }
});

function place(el, anchor, pos, gap) {
  if (!anchor) { el.style.left = '50%'; el.style.top = '30%'; return; }
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  const sx = scrollX, sy = scrollY;
  let x, y;
  const fits = { top: r.top - h - gap > 0, bottom: r.bottom + h + gap < innerHeight, left: r.left - w - gap > 0, right: r.right + w + gap < innerWidth };
  if (!fits[pos]) pos = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[pos] || pos;
  if (pos === 'top') { x = r.left + r.width / 2 - w / 2; y = r.top - h - gap; }
  else if (pos === 'left') { x = r.left - w - gap; y = r.top + r.height / 2 - h / 2; }
  else if (pos === 'right') { x = r.right + gap; y = r.top + r.height / 2 - h / 2; }
  else if (pos === 'bottom-start') { x = r.left; y = r.bottom + gap; pos = 'bottom'; }
  else { x = r.left + r.width / 2 - w / 2; y = r.bottom + gap; }
  x = Math.max(8, Math.min(x, innerWidth - w - 8));
  el.style.left = `${x + sx}px`;
  el.style.top = `${y + sy}px`;
  return pos;
}

// Tooltips: any element with data-tip="…" (optional data-tip-pos, data-tip-kbd).
let tipEl = null;
function showTip(target) {
  hideTip();
  tipEl = document.createElement('div');
  tipEl.className = 'wf-x-tip';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.id = 'wf-tip';
  tipEl.innerHTML = esc(target.dataset.tip) + (target.dataset.tipKbd ? `<kbd>${esc(target.dataset.tipKbd)}</kbd>` : '');
  document.body.appendChild(tipEl);
  document.body.classList.add('wf');
  tipEl.dataset.pos = place(tipEl, target, target.dataset.tipPos || 'top', 8);
  target.setAttribute('aria-describedby', 'wf-tip');
}
function hideTip() { tipEl?.remove(); tipEl = null; }
document.addEventListener('mouseover', (e) => { const t = e.target.closest?.('[data-tip]'); if (t) showTip(t); });
document.addEventListener('mouseout', (e) => { if (e.target.closest?.('[data-tip]')) hideTip(); });
document.addEventListener('focusin', (e) => { const t = e.target.closest?.('[data-tip]'); if (t) showTip(t); });
document.addEventListener('focusout', hideTip);
document.addEventListener('scroll', hideTip, true);

// Declarative openers: data-open="id" (modal/drawer/popover), data-toast="text".
document.addEventListener('click', (e) => {
  const opener = e.target.closest?.('[data-open]');
  if (opener) {
    const target = document.getElementById(opener.dataset.open);
    if (target?.tagName === 'WF-POPOVER') target.toggle(opener);
    else target?.open?.();
  }
  const toaster = e.target.closest?.('[data-toast]');
  if (toaster) toast(toaster.dataset.toast);
});

function toast(text, { action, onAction, variant, duration = 4000 } = {}) {
  let box = document.querySelector('.wf-x-toasts');
  if (!box) { box = document.createElement('div'); box.className = 'wf-x-toasts wf'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'wf-x-toast';
  if (variant) t.dataset.variant = variant;
  t.innerHTML = `<span>${variant === 'problem' ? '! ' : '✓ '}${esc(text)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  t.querySelector('button')?.addEventListener('click', () => { onAction?.(); t.remove(); });
  box.appendChild(t);
  setTimeout(() => t.remove(), duration);
}
define('wf-toast', class extends WfEl {
  render() { if (!this._done) { this._done = true; this.insertAdjacentHTML('afterbegin', `<span>${this.getAttribute('variant') === 'problem' ? '!' : '✓'}</span>`); } }
});

function confirmDialog({ title = 'Are you sure?', text = '', confirm = 'Confirm', cancel = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    let ok = false;
    const id = nextId('cf');
    const ov = overlay(`<div class="wf-x-dialog" role="alertdialog" aria-modal="true" aria-labelledby="${id}" style="--wf-w:400px"><div class="wf-x-dhead"><h2 id="${id}" style="font-size:18px">${esc(title)}</h2></div><div class="wf-x-dbody"><p>${esc(text)}</p></div><div class="wf-x-dfoot"><button type="button" data-close>${esc(cancel)}</button><button type="button" data-variant="${danger ? 'danger' : 'primary'}" class="wf-x-ok-btn" style="${danger ? '' : ''}">${esc(confirm)}</button></div></div>`, { onClose: () => resolve(ok) });
    const okBtn = ov.querySelector('.wf-x-ok-btn');
    okBtn.className = '';
    okBtn.addEventListener('click', () => { ok = true; ov.close(); });
    okBtn.focus();
  });
}

define('wf-alert', class extends WfEl {
  setup() {
    const kids = adopt(this);
    const variant = attr(this, 'variant', 'info');
    const ic = { info: 'info', warning: 'alert', problem: 'alert', success: 'check' }[variant] || 'info';
    const body = document.createElement('div');
    body.className = 'wf-x-abody';
    if (this.hasAttribute('title')) body.innerHTML = `<span class="wf-x-atitle">${esc(attr(this, 'title'))}</span>`;
    body.appendChild(kids);
    this.setAttribute('role', variant === 'problem' ? 'alert' : 'status');
    this.insertAdjacentHTML('afterbegin', icon(ic, 18));
    this.appendChild(body);
    if (this.hasAttribute('dismissible')) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'wf-x-close'; b.setAttribute('aria-label', 'Dismiss'); b.innerHTML = svg('x', 14);
      b.onclick = () => this.remove();
      this.appendChild(b);
    }
  }
});
define('wf-banner', class extends WfEl {
  setup() {
    const kids = adopt(this);
    const text = document.createElement('span');
    text.appendChild(kids);
    const actions = document.createElement('div');
    actions.className = 'wf-x-actions';
    if (this.hasAttribute('action')) actions.innerHTML = `<a href="${esc(attr(this, 'href', '#'))}">${esc(attr(this, 'action'))}</a>`;
    if (this.hasAttribute('dismissible')) { const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Dismiss'; b.onclick = () => this.remove(); actions.appendChild(b); }
    this.append(text, actions);
  }
});
define('wf-progress', class extends WfEl {
  static observedAttributes = ['value', 'max', 'label'];
  render() {
    const v = num(attr(this, 'value', 0)), max = num(attr(this, 'max', 100), 100);
    const pct = Math.round((v / max) * 100);
    this.setAttribute('role', 'progressbar');
    this.setAttribute('aria-valuenow', pct);
    this.setAttribute('aria-valuemin', 0);
    this.setAttribute('aria-valuemax', 100);
    this.innerHTML = `${this.hasAttribute('label') ? `<div class="wf-x-prow"><span>${esc(attr(this, 'label'))}</span><span>${pct}%</span></div>` : ''}<div class="wf-x-track"><div class="wf-x-fill" style="width:${pct}%"></div></div>`;
  }
});
define('wf-spinner', class extends WfEl { render() { this.setAttribute('role', 'status'); this.setAttribute('aria-label', attr(this, 'label', 'Loading')); } });
define('wf-skeleton', class extends WfEl {
  static observedAttributes = ['lines', 'avatar'];
  render() {
    const n = num(attr(this, 'lines', 2), 2);
    this.setAttribute('aria-busy', 'true');
    this.innerHTML = `${this.hasAttribute('avatar') ? '<span class="wf-x-sav"></span>' : ''}<span class="wf-x-slines">${Array.from({ length: n }, (_, i) => `<span class="wf-x-sline" style="width:${i === n - 1 && n > 1 ? 60 : 100}%"></span>`).join('')}</span>`;
  }
});
define('wf-empty', class extends WfEl {
  setup() {
    const kids = adopt(this);
    this.innerHTML = `<span class="wf-x-eicon">${icon(attr(this, 'icon', this.getAttribute('variant') === 'error' ? 'alert' : 'inbox'), 22)}</span><span class="wf-x-etitle">${esc(attr(this, 'title', 'Nothing here yet'))}</span>${this.hasAttribute('text') && attr(this, 'text') ? `<span class="wf-x-etext">${esc(attr(this, 'text'))}</span>` : ''}`;
    if (kids.childNodes.length) { const a = document.createElement('div'); a.className = 'wf-x-eact'; a.appendChild(kids); this.appendChild(a); }
  }
});
define('wf-checklist', class extends WfEl {
  setup() {
    const items = list(attr(this, 'items')).map((s) => { const [label, done] = s.split(':'); return { label, done: done === 'done' }; });
    const paint = () => {
      const done = items.filter((i) => i.done).length;
      this.innerHTML = `<div class="wf-x-clhead"><b>${esc(attr(this, 'title', 'Get set up'))}</b><span class="wf-muted">${done} / ${items.length}</span></div><div class="wf-x-cltrack"><div class="wf-x-clfill" style="width:${(done / Math.max(1, items.length)) * 100}%"></div></div>`
        + items.map((it, i) => `<label><input type="checkbox" data-i="${i}"${it.done ? ' checked' : ''}><span>${esc(it.label)}</span></label>`).join('');
      this.querySelectorAll('input').forEach((c) => c.onchange = () => { items[Number(c.dataset.i)].done = c.checked; paint(); emit(this, 'change', { items }); });
    };
    paint();
  }
});
define('wf-note', class extends WfEl {});
define('wf-callout', class extends WfEl {});
define('wf-gate', class extends WfEl {
  setup() {
    const kids = adopt(this);
    this.innerHTML = `<div class="wf-x-gfade" aria-hidden="true"><wf-text-ph lines="2"></wf-text-ph></div><div class="wf-x-gtitle">${icon('lock', 16)}${esc(attr(this, 'title', 'Upgrade to unlock'))}</div>${this.hasAttribute('text') ? `<p>${esc(attr(this, 'text'))}</p>` : ''}`;
    const a = document.createElement('div');
    a.style.cssText = 'display:flex;gap:8px;margin-top:4px';
    a.innerHTML = this.hasAttribute('action') ? `<a class="wf-btn" data-variant="primary" href="${esc(attr(this, 'href', '#'))}">${esc(attr(this, 'action'))}</a>` : '';
    a.appendChild(kids);
    this.appendChild(a);
  }
});

// ---------------------------------------------------------------- store
// Each seeded user has their own copy of the data, kept in localStorage and reset
// whenever the agent changes the seed files. The harness switches users.
const store = (() => {
  let project = 'wf';
  let user = null;
  let data = {};
  let dataKey = 'data:none';
  const subs = new Set();
  const key = (k) => `wf:${project}:${k}`;
  const save = () => { try { localStorage.setItem(key(dataKey), JSON.stringify({ version: store._version, data })); } catch {} };
  const notify = (change) => { save(); subs.forEach((fn) => { try { fn(change); } catch (err) { console.error(err); } }); };
  const col = (name) => (data[name] ||= []);
  const genId = (name) => { const ids = col(name).map((x) => Number(String(x.id).replace(/\D/g, ''))).filter(Number.isFinite); return `${name.replace(/s$/, '').slice(0, 3)}_${(Math.max(0, ...ids) + 1)}`; };
  return {
    async load() {
      try {
        const info = await (await fetch('/_wf/api/project')).json();
        project = info.name || 'wf';
        const users = await (await fetch('/_wf/api/users')).json();
        let id = localStorage.getItem(key('user'));
        if (!users.find((u) => u.id === id)) id = users[0]?.id;
        if (!id) return;
        const seed = await (await fetch(`/_wf/api/seed/${encodeURIComponent(id)}`)).json();
        user = seed.user;
        this._version = seed.version;
        this.shared = !!seed.shared;
        // Shared world: every user (and every frame) reads and writes one copy.
        dataKey = seed.shared ? 'data:_world' : `data:${id}`;
        const cached = JSON.parse(localStorage.getItem(key(dataKey)) || 'null');
        data = cached && cached.version === seed.version ? cached.data : structuredClone(seed.data || {});
        if (!cached || cached.version !== seed.version) save();
        // Changes made in another tab or an embedded iframe show up here live.
        addEventListener('storage', (e) => {
          if (e.key !== key(dataKey) || !e.newValue) return;
          try { data = JSON.parse(e.newValue).data; } catch { return; }
          subs.forEach((fn) => { try { fn({ type: 'sync' }); } catch (err) { console.error(err); } });
        });
      } catch (err) {
        console.warn('wf: running without the wf server; store is empty.', err);
      }
    },
    get user() { return user; },
    get project() { return project; },
    collections() { return Object.keys(data); },
    all(name) { return [...col(name)]; },
    get(name, id) { return col(name).find((x) => String(x.id) === String(id)) || null; },
    where(name, fn) { return col(name).filter(typeof fn === 'function' ? fn : (x) => Object.entries(fn).every(([k, v]) => x[k] === v)); },
    count(name, fn) { return fn ? this.where(name, fn).length : col(name).length; },
    add(name, item) { const it = { id: genId(name), createdAt: new Date().toISOString(), ...item }; col(name).push(it); notify({ type: 'add', name, item: it }); return it; },
    update(name, id, patch) { const it = this.get(name, id); if (!it) return null; Object.assign(it, typeof patch === 'function' ? patch(it) : patch); notify({ type: 'update', name, item: it }); return it; },
    remove(name, id) { const c = col(name); const i = c.findIndex((x) => String(x.id) === String(id)); if (i < 0) return null; const [it] = c.splice(i, 1); notify({ type: 'remove', name, item: it }); return it; },
    set(name, items) { data[name] = items; notify({ type: 'set', name }); },
    // Single values (settings, counters): wf.store.value('settings')
    value(name, v) { if (v === undefined) return data[name]; data[name] = v; notify({ type: 'set', name }); return v; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    reset() { try { localStorage.removeItem(key(dataKey)); } catch {} location.reload(); },
    _key: key,
  };
})();

// ---------------------------------------------------------------- helpers
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = (s) => new Raw(String(s ?? ''));
function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) {
      const v = vals[i];
      out += Array.isArray(v) ? v.map((x) => (x instanceof Raw ? x.s : esc(x))).join('') : v instanceof Raw ? v.s : v === false || v == null ? '' : esc(v);
    }
  });
  return raw(out);
}
// Re-render a region whenever the store changes. render() returns wf.html`…`.
function mount(target, render) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) throw new Error(`wf.mount: ${target} not found`);
  const paint = () => { el.innerHTML = String(render() ?? ''); };
  paint();
  store.subscribe(paint);
  return paint;
}
// Delegated events that survive re-renders: wf.on('click', '[data-approve]', (e, el) => …)
function on(type, selector, fn) {
  document.addEventListener(type, (e) => { const el = e.target.closest?.(selector); if (el) fn(e, el); });
}
const params = Object.fromEntries(new URLSearchParams(location.search));
const format = {
  money: (n, cur = 'EUR') => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur }).format(Number(n) || 0),
  number: (n) => new Intl.NumberFormat('en-GB').format(Number(n) || 0),
  date: (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''),
  shortDate: (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''),
  ago: (d) => { const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; },
};
// Read a form into an object: wf.formData(formEl)
const formData = (form) => Object.fromEntries(new FormData(form).entries());

const wf = {
  store, html, raw, mount, on, params, format, formData, toast, confirm: confirmDialog, icons, esc,
  get user() { return store.user; },
  open: (id) => document.getElementById(id)?.open?.(),
  close: (id) => document.getElementById(id)?.close?.(),
  go: (url) => { location.href = url; },
};
window.wf = wf;
window.wfReady = store.load().then(() => {
  document.documentElement.dataset.wfUser = store.user?.id || '';
  document.dispatchEvent(new CustomEvent('wf:ready', { detail: wf }));
  return wf;
});
export default wf;
