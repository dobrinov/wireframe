// harness.js — the layer above every prototype: user switcher, comment mode,
// pins and threads, agent status, live reload. Injected by the wf server.
// Lives in a shadow root so it never inherits or leaks prototype styles.

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (url, opts = {}) => {
  const res = await fetch(url, { ...opts, headers: { 'content-type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
};
const screenKey = (p = location.pathname) => (p.endsWith('/') ? `${p}index.html` : /\.[a-z]+$/i.test(p) ? p : `${p}.html`);
const ago = (d) => { const s = (Date.now() - new Date(d)) / 1000; if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)}m ago`; if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`; };
const STATUS = { open: 'Open', queued: 'Waiting for agent', working: 'Agent working', resolved: 'Resolved' };
const I = {
  x: 'M6 6l12 12M18 6L6 18', chev: 'M6 9l6 6 6-6', comment: 'M4 5h16v11H9l-5 4z', cursor: 'M5 3l14 7-6 2-2 6z', users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.5 3.3-5 6.5-5s5.7 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 15c2 .6 3.2 2.2 3.5 5',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01', more: 'M5 12h.01M12 12h.01M19 12h.01', check: 'M5 12.5l4.5 4.5L19 7', send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z', refresh: 'M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4',
};
const ic = (n, s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${I[n]}"/></svg>`;

const STYLES = `
:host { all: initial; --ink:#1C1C1A; --ink2:#3A3A36; --muted:#55554F; --line:#8A887F; --div:#D6D4CC; --fill:#EFEDE6; --paper:#F7F6F2; --agent:#2B59C3; --agent-soft:#EAF0FB; --agent-ink:#1E3F8A; --cmt:#C2410C; --cmt-soft:#FBEDE6;
  font: 13px/1.45 Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; color: var(--ink); }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; cursor: pointer; }
.mono { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11px; }
.bar { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 2147483000; display: flex; align-items: center; gap: 4px; background: var(--ink); color: #fff; border-radius: 26px; padding: 5px; box-shadow: 0 2px 0 rgba(0,0,0,.15); max-width: calc(100vw - 24px); }
.bar.hidden { transform: translate(-50%, 80px); }
.bar button { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 20px; font: 500 13px Inter, system-ui, sans-serif; white-space: nowrap; color: #fff; }
.bar button:hover { background: rgba(255,255,255,.12); }
.bar button:focus-visible { outline: 2px solid #8FB0F5; outline-offset: 1px; }
.bar button.on { background: #fff; color: var(--cmt); }
.bar .user { padding-left: 4px; border: 1.5px solid rgba(255,255,255,.35); }
.bar .av { width: 24px; height: 24px; border-radius: 50%; background: var(--agent); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
.bar .sep { width: 1px; height: 20px; background: rgba(255,255,255,.2); margin: 0 2px; }
.bar .agent { font-size: 12px; opacity: .92; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex: none; }
.dot.listen { background: #9BD3A4; } .dot.work { background: #8FB0F5; animation: pulse 1.2s infinite; } .dot.off { border: 1.5px solid #A8A69E; } .dot.wait { background: #F0A47A; }
@keyframes pulse { 50% { opacity: .35; } }
.count { background: var(--cmt); color: #fff; border-radius: 9px; font-size: 11px; font-weight: 700; padding: 0 6px; }
kbd { font: 10px 'JetBrains Mono', monospace; opacity: .6; }

.hl { position: fixed; z-index: 2147482990; pointer-events: none; border: 2px dashed var(--cmt); border-radius: 4px; background: rgba(194,65,12,.06); display: none; }
.hl .tag { position: absolute; top: -20px; left: -2px; background: var(--cmt); color: #fff; font: 10px 'JetBrains Mono', monospace; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
.pins { position: fixed; inset: 0; pointer-events: none; z-index: 2147482995; }
.pin { position: fixed; pointer-events: auto; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; background: var(--cmt); color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; box-shadow: 0 1px 0 rgba(0,0,0,.25); transform: translate(-4px, -24px); cursor: pointer; }
.pin.working, .pin.queued.watching { background: var(--agent); }
.pin.resolved { background: #fff; color: var(--muted); border-color: var(--line); }
.pin:focus-visible { outline: 2px solid var(--ink); }

.card { position: fixed; z-index: 2147483001; width: 380px; max-width: calc(100vw - 24px); background: #fff; border: 1.5px solid var(--ink); border-radius: 12px; box-shadow: 6px 6px 0 var(--cmt); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.card.thread { box-shadow: 6px 6px 0 var(--div); max-height: 70vh; overflow: auto; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { background: var(--fill); color: var(--ink2); border-radius: 4px; padding: 2px 6px; font: 11px 'JetBrains Mono', monospace; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chip.as { background: var(--agent-soft); color: var(--agent-ink); }
label.lbl { font-weight: 600; font-size: 13px; }
textarea { font: 14px/1.45 Inter, system-ui, sans-serif; width: 100%; min-height: 76px; resize: vertical; border: 1.5px solid var(--line); border-radius: 8px; padding: 10px; color: var(--ink); }
textarea:focus { outline: none; border: 2px solid var(--cmt); }
.send { display: flex; align-items: center; gap: 10px; background: var(--agent-soft); border-radius: 8px; padding: 10px 12px; cursor: pointer; }
.send input { width: 18px; height: 18px; accent-color: var(--agent); margin: 0; flex: none; }
.send b { color: var(--agent-ink); display: block; } .send span span { font-size: 12px; color: var(--ink2); }
.row { display: flex; align-items: center; gap: 8px; }
.row.end { justify-content: flex-end; } .row.between { justify-content: space-between; }
.btn { all: unset; cursor: pointer; border: 1.5px solid var(--ink); border-radius: 6px; padding: 6px 12px; font: 500 13px Inter, system-ui, sans-serif; display: inline-flex; gap: 6px; align-items: center; }
.btn.pri { background: var(--ink); color: #fff; } .btn.agent { background: var(--agent); border-color: var(--agent); color: #fff; } .btn.ghost { border-color: transparent; text-decoration: underline; padding: 6px 4px; }
.btn:focus-visible { outline: 2px solid var(--agent); outline-offset: 2px; }
.btn[disabled] { opacity: .5; cursor: default; }
.x { all: unset; cursor: pointer; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; } .x:hover { background: var(--fill); }
.status { font: 11px 'JetBrains Mono', monospace; border-radius: 4px; padding: 1px 6px; background: var(--fill); }
.status.working, .status.queued { background: var(--agent-soft); color: var(--agent-ink); } .status.open { background: var(--cmt-soft); color: #8A2E08; }
.msg { font-size: 14px; line-height: 1.45; white-space: pre-wrap; }
.reply { border-radius: 8px; padding: 8px 10px; font-size: 13px; line-height: 1.45; background: var(--fill); white-space: pre-wrap; }
.reply.agent { background: var(--agent-soft); } .reply b { color: var(--ink); } .reply.agent b { color: var(--agent-ink); }
.meta { font-size: 12px; color: var(--muted); }

.scrim { position: fixed; inset: 0; z-index: 2147483002; background: rgba(28,28,26,.4); display: flex; align-items: center; justify-content: center; padding: 16px; }
.users { width: min(1040px, 100%); height: min(680px, calc(100vh - 32px)); background: var(--paper); border: 1.5px solid var(--ink); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.uhead { background: var(--agent); color: #fff; padding: 10px 18px; display: flex; align-items: center; gap: 12px; font-size: 13px; }
.uhead b { font: 600 12px 'JetBrains Mono', monospace; letter-spacing: .04em; }
.uhead .x { color: #fff; margin-left: auto; } .uhead .x:hover { background: rgba(255,255,255,.15); }
.ubody { flex: 1; display: flex; gap: 24px; padding: 24px; min-height: 0; flex-wrap: wrap; overflow: auto; }
.ulist { flex: 1 1 300px; max-width: 380px; display: flex; flex-direction: column; gap: 8px; }
.ulist h2 { font: 700 24px/1.1 'Space Grotesk', Inter, sans-serif; margin: 0 0 2px; } .ulist p { margin: 0 0 8px; color: var(--ink2); }
.uc { all: unset; box-sizing: border-box; cursor: pointer; display: flex; gap: 12px; align-items: center; padding: 11px 12px; border-radius: 10px; background: #fff; border: 1.5px solid var(--div); }
.uc:hover { border-color: var(--line); } .uc:focus-visible { outline: 2px solid var(--agent); outline-offset: 2px; }
.uc.sel { border: 2px solid var(--agent); box-shadow: 4px 4px 0 var(--agent); }
.uav { width: 38px; height: 38px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; background: var(--fill); border: 1.5px solid var(--line); }
.uc.sel .uav, .ud .uav { background: var(--agent); border-color: var(--agent); color: #fff; }
.uc .t { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; } .uc .t b { font-size: 14px; } .uc .t span { font-size: 12px; color: var(--muted); }
.cur { font: 10px 'JetBrains Mono', monospace; color: var(--agent-ink); background: var(--agent-soft); border-radius: 4px; padding: 1px 5px; }
.ud { flex: 2 1 420px; background: #fff; border: 1.5px solid var(--ink); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 18px; min-width: 0; overflow: auto; }
.ud .top { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; } .ud .top .uav { width: 56px; height: 56px; font-size: 18px; }
.ud h3 { margin: 0; font: 700 22px 'Space Grotesk', Inter, sans-serif; } .ud .sub { color: var(--muted); font-size: 13px; }
.why { background: var(--paper); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
.k { font: 500 10.5px 'JetBrains Mono', monospace; color: var(--muted); letter-spacing: .06em; text-transform: uppercase; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; }
.stat { border: 1.5px solid var(--div); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; } .stat span { font-size: 12px; color: var(--muted); } .stat b { font: 700 22px 'Space Grotesk', Inter, sans-serif; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
.kv { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--div); font-size: 13px; }
.test { display: flex; gap: 8px; font-size: 13px; padding: 3px 0; } .test::before { content: "→"; color: var(--agent); }

.panel { position: fixed; top: 0; right: 0; bottom: 0; width: min(400px, 100vw); z-index: 2147483001; background: #fff; border-left: 1.5px solid var(--ink); display: flex; flex-direction: column; }
.phead { padding: 16px 18px; border-bottom: 1px solid var(--div); display: flex; align-items: center; gap: 10px; } .phead h2 { margin: 0; font: 600 18px 'Space Grotesk', Inter, sans-serif; flex: 1; }
.pfilter { display: flex; gap: 6px; padding: 10px 18px; border-bottom: 1px solid var(--div); flex-wrap: wrap; }
.pfilter button { all: unset; cursor: pointer; font-size: 12px; padding: 3px 10px; border-radius: 12px; border: 1px solid var(--div); } .pfilter button.on { background: var(--ink); color: #fff; border-color: var(--ink); }
.plist { flex: 1; overflow: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.pc { all: unset; box-sizing: border-box; cursor: pointer; border: 1.5px solid var(--div); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; } .pc:hover { border-color: var(--line); } .pc:focus-visible { outline: 2px solid var(--agent); }
.empty { color: var(--muted); text-align: center; padding: 40px 10px; }
.toast { position: fixed; z-index: 2147483003; left: 50%; top: 52px; transform: translateX(-50%); background: var(--agent); color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 13px; max-width: min(520px, 92vw); }
.menu { position: fixed; z-index: 2147483002; background: #fff; border: 1.5px solid var(--ink); border-radius: 8px; padding: 4px 0; min-width: 220px; box-shadow: 4px 4px 0 var(--div); }
.menu button { all: unset; box-sizing: border-box; cursor: pointer; display: block; width: 100%; padding: 8px 12px; font-size: 13px; } .menu button:hover, .menu button:focus-visible { background: var(--fill); }
.mode-hint { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 2147483000; background: var(--cmt); color: #fff; padding: 6px 14px; border-radius: 16px; font-size: 12px; font-weight: 500; }
`;

class Harness {
  constructor() {
    this.host = document.createElement('wf-harness');
    this.host.style.cssText = 'position:static';
    this.root = this.host.attachShadow({ mode: 'open' });
    this.root.innerHTML = `<style>${STYLES}</style><div class="pins"></div><div class="hl"><span class="tag"></span></div><div class="layer"></div><div class="bar" role="toolbar" aria-label="Wireframe harness"></div>`;
    document.documentElement.appendChild(this.host);
    // Leave room under the page for the floating toolbar.
    document.documentElement.style.paddingBottom = '72px';
    this.$ = (s) => this.root.querySelector(s);
    this.mode = 'browse';
    this.comments = [];
    this.users = [];
    this.agent = {};
    this.sendPref = localStorage.getItem('wf:sendToAgent') !== 'false';
    this.showResolved = false;
  }

  async start() {
    const [project, users, comments] = await Promise.all([api('/_wf/api/project'), api('/_wf/api/users'), api('/_wf/api/comments')]);
    this.project = project.name;
    this.isLibrary = !!project.library;
    this.users = users;
    this.comments = comments;
    this.userKey = `wf:${this.project}:user`;
    this.renderBar();
    this.renderPins();
    this.events();
    this.keys();
    this.track();
    if (!this.isLibrary && users.length && !localStorage.getItem(this.userKey)) this.openUsers(true);
    const open = new URLSearchParams(location.hash.slice(1)).get('wf-comment');
    if (open) setTimeout(() => this.openThread(Number(open)), 400);
  }

  get user() {
    const id = localStorage.getItem(this.userKey);
    return this.users.find((u) => u.id === id) || this.users[0] || null;
  }

  // ---------- toolbar ----------
  renderBar() {
    if (this.isLibrary) {
      this.$('.bar').innerHTML = '<button disabled style="cursor:default">wf · component library</button>';
      return;
    }
    const u = this.user;
    const open = this.comments.filter((c) => c.status !== 'resolved');
    const a = this.agent;
    const working = a.working || 0, queued = a.queued || 0;
    const [dot, label] = a.headless ? ['work', 'Agent running (headless)'] : working ? ['work', `Agent working on ${working}`]
      : a.watching ? ['listen', 'Agent listening'] : queued ? ['wait', `${queued} waiting for agent`] : ['off', 'Agent offline'];
    const tip = a.watching || working ? 'Comments you send reach Claude Code right away.' : 'Run /wireframe in Claude Code to connect. Sent comments wait in the inbox until then.';
    this.$('.bar').innerHTML = (this.isLibrary ? '' : `<button class="user" data-a="users" title="Switch user (U)"><span class="av">${esc(u?.initials || '?')}</span>${esc(u ? `${u.name.split(' ')[0]} · ${u.label || u.role || u.id}` : 'No users')}${ic('chev', 14)}</button><span class="sep"></span>`)
      + `<button data-a="browse" class="${this.mode === 'browse' ? 'on' : ''}" style="${this.mode === 'browse' ? 'color:var(--ink)' : ''}">${ic('cursor', 15)}Browse</button>`
      + `<button data-a="comment" class="${this.mode === 'comment' ? 'on' : ''}" title="Comment mode (C)">${ic('comment', 15)}Comment <kbd>C</kbd></button>`
      + `<button data-a="panel" title="All comments">${ic('list', 15)}${open.length ? `<span class="count">${open.length}</span>` : ''}</button><span class="sep"></span>`
      + `<button class="agent" data-a="agent" title="${esc(tip)}"><span class="dot ${dot}"></span>${esc(label)}</button>`
      + `<button data-a="more" aria-label="More">${ic('more', 16)}</button>`;
    this.$('.bar').querySelectorAll('button').forEach((b) => b.onclick = (e) => this.action(b.dataset.a, e, b));
  }

  action(a, e, btn) {
    if (a === 'users') this.openUsers();
    if (a === 'browse') this.setMode('browse');
    if (a === 'comment') this.setMode(this.mode === 'comment' ? 'browse' : 'comment');
    if (a === 'panel') this.openPanel();
    if (a === 'agent') this.flash(this.agent.watching ? 'Claude Code is listening. Tick “Send to coding agent” on a comment and it gets it within seconds.' : 'No agent connected. In Claude Code, run /wireframe in this project and it starts listening. Comments you send now wait in the inbox.');
    if (a === 'more') this.moreMenu(btn);
  }

  moreMenu(btn) {
    const r = btn.getBoundingClientRect();
    const m = document.createElement('div');
    m.className = 'menu';
    m.style.left = `${Math.min(r.left, innerWidth - 240)}px`;
    m.style.bottom = `${innerHeight - r.top + 8}px`;
    m.innerHTML = `<button data-m="reset">Reset this user’s data</button><button data-m="resolved">${this.showResolved ? 'Hide' : 'Show'} resolved pins</button><button data-m="library">Open component library</button><button data-m="hide">Hide toolbar (press H to show)</button>`;
    this.clearLayer();
    this.$('.layer').appendChild(m);
    m.querySelector('button').focus();
    m.onclick = (e) => {
      const k = e.target.dataset.m;
      this.clearLayer();
      if (k === 'reset') { localStorage.removeItem(`wf:${this.project}:data:${this.user?.id}`); location.reload(); }
      if (k === 'resolved') { this.showResolved = !this.showResolved; this.renderPins(); }
      if (k === 'library') window.open('/_wf/library', '_blank');
      if (k === 'hide') this.$('.bar').classList.add('hidden');
    };
    setTimeout(() => document.addEventListener('mousedown', (ev) => { if (!ev.composedPath().includes(m)) m.remove(); }, { once: true }));
  }

  setMode(m) {
    this.mode = m;
    this.clearLayer();
    this.$('.hl').style.display = 'none';
    document.documentElement.style.cursor = m === 'comment' ? 'crosshair' : '';
    this.root.querySelector('.mode-hint')?.remove();
    if (m === 'comment') {
      const hint = document.createElement('div');
      hint.className = 'mode-hint';
      hint.textContent = 'Click anything to comment · Esc to stop';
      this.root.appendChild(hint);
    }
    this.renderBar();
  }

  clearLayer() { this.$('.layer').innerHTML = ''; }

  flash(text, ms = 4500) {
    this.root.querySelector('.toast')?.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = text;
    this.root.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  // ---------- users ----------
  openUsers(first = false) {
    this.clearLayer();
    let sel = this.user?.id;
    const layer = this.$('.layer');
    const paint = () => {
      const u = this.users.find((x) => x.id === sel) || this.users[0];
      const stats = Object.entries(u?.stats || {});
      const flags = Object.entries(u?.flags || {});
      layer.innerHTML = `<div class="scrim"><div class="users" role="dialog" aria-modal="true" aria-label="Choose a user">
        <div class="uhead"><b>wf · users</b><span>${esc(this.project)} · ${this.users.length} seeded users</span><button class="x" data-close aria-label="Close">${ic('x')}</button></div>
        <div class="ubody">
          <div class="ulist"><h2>${first ? 'Who do you want to be?' : 'Switch user'}</h2><p>Each user is seeded to show a different state of the product.</p>
            ${this.users.map((x) => `<button class="uc ${x.id === sel ? 'sel' : ''}" data-u="${esc(x.id)}" aria-pressed="${x.id === sel}"><span class="uav">${esc(x.initials)}</span><span class="t"><b>${esc(x.name)}</b><span>${esc(x.tagline || x.role || '')}</span></span>${x.id === this.user?.id && !first ? '<span class="cur">current</span>' : ''}</button>`).join('')}
          </div>
          ${u ? `<div class="ud">
            <div class="top"><span class="uav">${esc(u.initials)}</span><div style="flex:1;min-width:200px"><h3>${esc(u.name)}</h3><div class="sub">${esc([u.role, u.email].filter(Boolean).join(' · '))}</div></div>
              <button class="btn pri" data-signin>Sign in as ${esc(u.name.split(' ')[0])} →</button></div>
            ${u.why ? `<div class="why"><span class="k">Why this user exists</span>${esc(u.why)}</div>` : ''}
            ${stats.length ? `<div class="stats">${stats.map(([k, v]) => `<div class="stat"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
            <div class="cols">
              ${flags.length ? `<div><div class="k" style="margin-bottom:6px">Account &amp; features</div>${flags.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
              ${(u.tests || []).length ? `<div><div class="k" style="margin-bottom:6px">Good for testing</div>${u.tests.map((t) => `<div class="test">${esc(t)}</div>`).join('')}</div>` : ''}
            </div>
            ${u.addedBecause ? `<div class="meta">Added ${esc(u.addedIn || '')} because ${esc(u.addedBecause)}</div>` : ''}
          </div>` : '<div class="ud"><div class="empty">No users in seed/users.json yet.</div></div>'}
        </div></div></div>`;
      layer.querySelectorAll('[data-u]').forEach((b) => b.onclick = () => { sel = b.dataset.u; paint(); layer.querySelector(`[data-u="${CSS.escape(sel)}"]`)?.focus(); });
      layer.querySelector('[data-close]').onclick = () => { if (first && !localStorage.getItem(this.userKey) && u) this.signIn(u.id); this.clearLayer(); };
      layer.querySelector('[data-signin]')?.addEventListener('click', () => this.signIn(u.id));
      layer.querySelector('.scrim').onmousedown = (e) => { if (e.target.classList.contains('scrim')) layer.querySelector('[data-close]').click(); };
    };
    paint();
    (layer.querySelector('.uc.sel') || layer.querySelector('.uc'))?.focus();
  }

  signIn(id) {
    localStorage.setItem(this.userKey, id);
    sessionStorage.setItem('wf:flash', `Signed in as ${this.users.find((u) => u.id === id)?.name}. Comments now carry this user.`);
    location.reload();
  }

  // ---------- comment mode ----------
  track() {
    const hl = this.$('.hl');
    const inHarness = (e) => e.composedPath().includes(this.host);
    document.addEventListener('mousemove', (e) => {
      if (this.mode !== 'comment' || this.composing || inHarness(e)) { if (!this.composing) hl.style.display = 'none'; return; }
      const el = e.target;
      if (!el || el === document.documentElement) return;
      const r = el.getBoundingClientRect();
      Object.assign(hl.style, { display: 'block', left: `${r.left - 2}px`, top: `${r.top - 2}px`, width: `${r.width + 4}px`, height: `${r.height + 4}px` });
      hl.querySelector('.tag').textContent = describe(el);
    }, true);
    const block = (e) => { if (this.mode === 'comment' && !inHarness(e)) { e.preventDefault(); e.stopPropagation(); } };
    ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'submit'].forEach((t) => document.addEventListener(t, block, true));
    document.addEventListener('click', (e) => {
      if (this.mode !== 'comment' || inHarness(e)) return;
      e.preventDefault(); e.stopPropagation();
      if (this.composing) return;
      const el = e.target;
      const r = el.getBoundingClientRect();
      this.compose(el, { x: (e.clientX - r.left) / Math.max(1, r.width), y: (e.clientY - r.top) / Math.max(1, r.height) }, e.clientX, e.clientY);
    }, true);
    const reposition = () => this.positionPins();
    addEventListener('scroll', reposition, true);
    addEventListener('resize', reposition);
    setInterval(reposition, 700);
    const flash = sessionStorage.getItem('wf:flash');
    if (flash) { sessionStorage.removeItem('wf:flash'); setTimeout(() => this.flash(flash), 300); }
  }

  compose(el, rel, cx, cy) {
    this.composing = true;
    const u = this.user;
    const selector = selectorFor(el);
    const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'New comment');
    card.innerHTML = `<div class="chips">${u ? `<span class="chip as">as ${esc(u.name)} · ${esc(u.role || u.id)}</span>` : ''}<span class="chip">${esc(screenKey())}</span><span class="chip" title="${esc(selector)}">${esc(describe(el))}</span></div>
      <label class="lbl" for="wf-c-text">Comment${text ? ` on “${esc(text.slice(0, 40))}”` : ''}</label>
      <textarea id="wf-c-text" placeholder="What should change here?"></textarea>
      <label class="send"><input type="checkbox" ${this.sendPref ? 'checked' : ''}><span><b>Send to coding agent</b><span>Claude Code on this computer picks it up${this.agent.watching ? ' now' : ' when it connects'}</span></span></label>
      <div class="row between"><span class="mono" style="color:var(--muted)">⌘↵ to post</span><div class="row"><button class="btn" data-cancel>Cancel</button><button class="btn pri" data-post>Post</button></div></div>`;
    this.clearLayer();
    this.$('.layer').appendChild(card);
    placeCard(card, cx, cy);
    const ta = card.querySelector('textarea');
    const cb = card.querySelector('input');
    const post = card.querySelector('[data-post]');
    const label = () => { post.innerHTML = cb.checked ? `${ic('send', 14)}Post &amp; send to agent` : 'Post comment'; post.className = `btn ${cb.checked ? 'agent' : 'pri'}`; };
    label();
    cb.onchange = () => { this.sendPref = cb.checked; localStorage.setItem('wf:sendToAgent', String(cb.checked)); label(); };
    const done = () => { this.composing = false; this.clearLayer(); this.$('.hl').style.display = 'none'; };
    card.querySelector('[data-cancel]').onclick = done;
    const submit = async () => {
      const body = ta.value.trim();
      if (!body) { ta.focus(); return; }
      post.disabled = true;
      try {
        const c = await api('/_wf/api/comments', { method: 'POST', body: {
          body, screen: screenKey(), title: document.title, viewport: `${innerWidth}x${innerHeight}`, sendToAgent: cb.checked,
          anchor: { selector, text, tag: el.tagName.toLowerCase(), x: rel.x, y: rel.y },
          as: u ? { id: u.id, name: u.name, role: u.role || '' } : null,
        } });
        this.upsert(c);
        done();
        this.flash(cb.checked ? (this.agent.watching ? `Comment #${c.id} sent to the agent.` : `Comment #${c.id} saved. It goes to the agent as soon as one connects.`) : `Comment #${c.id} saved.`);
      } catch (err) { post.disabled = false; this.flash(`Couldn’t save: ${err.message}`); }
    };
    post.onclick = submit;
    ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); if (e.key === 'Escape') done(); };
    ta.focus();
  }

  // ---------- pins & threads ----------
  visible() {
    return this.comments.filter((c) => c.screen === screenKey() && (this.showResolved || c.status !== 'resolved'));
  }
  renderPins() {
    const box = this.$('.pins');
    box.innerHTML = this.visible().map((c) => `<button class="pin ${c.status}${this.agent.watching ? ' watching' : ''}" data-id="${c.id}" aria-label="Comment ${c.id}: ${esc(STATUS[c.status])}">${c.status === 'working' ? ic('refresh', 13) : c.status === 'resolved' ? ic('check', 13) : c.id}</button>`).join('');
    box.querySelectorAll('.pin').forEach((p) => p.onclick = () => this.openThread(Number(p.dataset.id)));
    this.positionPins();
  }
  positionPins() {
    for (const p of this.$('.pins').children) {
      const c = this.comments.find((x) => x.id === Number(p.dataset.id));
      let el = null;
      try { el = c?.anchor?.selector ? document.querySelector(c.anchor.selector) : null; } catch {}
      if (!el) { p.style.display = 'none'; continue; }
      const r = el.getBoundingClientRect();
      const visible = r.width || r.height;
      p.style.display = visible ? 'flex' : 'none';
      p.style.left = `${r.left + Math.min(1, Math.max(0, c.anchor.x || 0)) * r.width}px`;
      p.style.top = `${r.top + Math.min(1, Math.max(0, c.anchor.y || 0)) * r.height}px`;
    }
  }

  openThread(id) {
    const c = this.comments.find((x) => x.id === id);
    if (!c) return;
    if (c.screen !== screenKey()) { location.href = `${c.screen}#wf-comment=${id}`; return; }
    this.clearLayer();
    const card = document.createElement('div');
    card.className = 'card thread';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', `Comment ${id}`);
    const paint = () => {
      const cur = this.comments.find((x) => x.id === id) || c;
      card.innerHTML = `<div class="row between"><div class="row"><b>#${cur.id}</b><span class="status ${cur.status}">${STATUS[cur.status]}</span></div><button class="x" data-close aria-label="Close">${ic('x')}</button></div>
        <div class="chips">${cur.as ? `<span class="chip as">as ${esc(cur.as.name)} · ${esc(cur.as.role || cur.as.id)}</span>` : ''}<span class="chip">${esc(cur.anchor?.tag || '')}${cur.anchor?.text ? ` “${esc(cur.anchor.text.slice(0, 30))}”` : ''}</span><span class="chip">${esc(ago(cur.createdAt))}</span></div>
        <div class="msg">${esc(cur.body)}</div>
        ${(cur.replies || []).map((r) => `<div class="reply ${r.by}"><b>${r.by === 'agent' ? 'Agent' : esc(r.name || 'You')}:</b> ${esc(r.body)}</div>`).join('')}
        <textarea placeholder="Reply…" style="min-height:56px" aria-label="Reply"></textarea>
        <div class="row between" style="flex-wrap:wrap">
          <button class="btn ghost" data-del>Delete</button>
          <div class="row" style="flex-wrap:wrap;justify-content:flex-end">
            ${cur.status === 'resolved' ? '<button class="btn" data-reopen>Reopen</button>' : '<button class="btn" data-resolve>Resolve</button>'}
            <button class="btn agent" data-send>${ic('send', 13)}${cur.status === 'queued' || cur.status === 'working' ? 'Reply' : 'Send to agent'}</button>
            <button class="btn pri" data-reply>Reply</button>
          </div></div>`;
      const ta = card.querySelector('textarea');
      const patch = async (body) => { const n = await api(`/_wf/api/comments/${id}`, { method: 'PATCH', body }); this.upsert(n); paint(); };
      const replyBody = () => (ta.value.trim() ? { reply: { by: 'user', name: this.user?.name || 'You', body: ta.value.trim() } } : {});
      card.querySelector('[data-close]').onclick = () => this.clearLayer();
      card.querySelector('[data-reply]').onclick = () => { if (ta.value.trim()) patch(replyBody()); };
      card.querySelector('[data-send]').onclick = () => patch({ ...replyBody(), sendToAgent: true });
      card.querySelector('[data-resolve]')?.addEventListener('click', () => patch({ ...replyBody(), status: 'resolved' }));
      card.querySelector('[data-reopen]')?.addEventListener('click', () => patch({ ...replyBody(), status: 'open' }));
      card.querySelector('[data-del]').onclick = async () => { await api(`/_wf/api/comments/${id}`, { method: 'DELETE' }); this.comments = this.comments.filter((x) => x.id !== id); this.clearLayer(); this.renderPins(); this.renderBar(); };
      ta.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) card.querySelector('[data-reply]').click(); };
    };
    paint();
    this.$('.layer').appendChild(card);
    const pin = this.$(`.pin[data-id="${id}"]`);
    const r = pin?.getBoundingClientRect();
    placeCard(card, r ? r.right : innerWidth / 2, r ? r.top : 120);
    this.threadPaint = { id, paint };
  }

  openPanel() {
    this.clearLayer();
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'All comments');
    let filter = 'active';
    const paint = () => {
      const items = this.comments.filter((c) => filter === 'all' || (filter === 'active' ? c.status !== 'resolved' : filter === 'screen' ? c.screen === screenKey() : c.status === filter)).sort((a, b) => b.id - a.id);
      panel.innerHTML = `<div class="phead"><h2>Comments</h2><span class="meta">${this.comments.filter((c) => c.status !== 'resolved').length} active</span><button class="x" data-close aria-label="Close">${ic('x')}</button></div>
        <div class="pfilter">${[['active', 'Active'], ['screen', 'This screen'], ['working', 'With agent'], ['resolved', 'Resolved'], ['all', 'All']].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="plist">${items.length ? items.map((c) => `<button class="pc" data-id="${c.id}"><div class="row between"><span class="row"><b>#${c.id}</b><span class="mono" style="color:var(--muted)">${esc(c.screen)}</span></span><span class="status ${c.status}">${STATUS[c.status]}</span></div><div style="font-size:14px">${esc(c.body.length > 160 ? c.body.slice(0, 160) + '…' : c.body)}</div>${c.as ? `<span class="mono" style="color:var(--agent-ink)">as ${esc(c.as.name)}</span>` : ''}${c.replies?.length ? `<div class="reply ${c.replies[c.replies.length - 1].by}">${esc(c.replies[c.replies.length - 1].body.slice(0, 140))}</div>` : ''}</button>`).join('') : '<div class="empty">No comments here. Press C and click anything to leave one.</div>'}</div>`;
      panel.querySelector('[data-close]').onclick = () => this.clearLayer();
      panel.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filter = b.dataset.f; paint(); });
      panel.querySelectorAll('.pc').forEach((b) => b.onclick = () => { const id = Number(b.dataset.id); const c = this.comments.find((x) => x.id === id); if (c.status === 'resolved' && !this.showResolved) { this.showResolved = true; this.renderPins(); } this.openThread(id); });
    };
    paint();
    this.$('.layer').appendChild(panel);
    this.panelPaint = paint;
  }

  upsert(c) {
    const i = this.comments.findIndex((x) => x.id === c.id);
    if (i >= 0) this.comments[i] = c; else this.comments.push(c);
    this.renderPins();
    this.renderBar();
  }

  // ---------- server events ----------
  events() {
    const es = new EventSource('/_wf/api/events');
    es.addEventListener('reload', (e) => {
      const d = JSON.parse(e.data);
      if (d.cssOnly) {
        document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => { const u = new URL(l.href); u.searchParams.set('v', Date.now()); l.href = u; });
        return;
      }
      if (this.composing) { this.pendingReload = true; return; }
      sessionStorage.setItem('wf:scroll', String(scrollY));
      location.reload();
    });
    es.addEventListener('comments', (e) => {
      const next = JSON.parse(e.data);
      for (const n of next) {
        const old = this.comments.find((x) => x.id === n.id);
        const last = n.replies?.[n.replies.length - 1];
        if (old && last?.by === 'agent' && (old.replies?.length || 0) < n.replies.length) this.flash(`Agent on #${n.id}: ${last.body.slice(0, 140)}`, 7000);
      }
      this.comments = next;
      this.renderPins();
      this.renderBar();
      this.threadPaint && this.$('.thread') && this.threadPaint.paint();
      this.panelPaint && this.$('.panel') && this.panelPaint();
    });
    es.addEventListener('agent', (e) => { this.agent = JSON.parse(e.data); this.renderBar(); this.renderPins(); });
    const y = sessionStorage.getItem('wf:scroll');
    if (y) { sessionStorage.removeItem('wf:scroll'); addEventListener('load', () => scrollTo(0, Number(y))); setTimeout(() => scrollTo(0, Number(y)), 60); }
  }

  keys() {
    document.addEventListener('keydown', (e) => {
      const typing = e.composedPath().some((n) => n instanceof HTMLElement && (n.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName)));
      if (e.key === 'Escape') {
        if (this.$('.layer').children.length) { this.composing = false; this.clearLayer(); this.$('.hl').style.display = 'none'; return; }
        if (this.mode === 'comment') this.setMode('browse');
        return;
      }
      if (typing || e.repeat || e.metaKey || e.ctrlKey || e.altKey || this.isLibrary) return;
      if (e.key === 'c' || e.key === 'C') this.setMode(this.mode === 'comment' ? 'browse' : 'comment');
      if ((e.key === 'u' || e.key === 'U') && !this.isLibrary) this.openUsers();
      if (e.key === 'h' || e.key === 'H') this.$('.bar').classList.toggle('hidden');
    });
  }
}

function describe(el) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls = !id && el.classList.length ? `.${[...el.classList].filter((c) => !c.startsWith('wf-x')).slice(0, 2).join('.')}` : '';
  return `${tag}${id}${cls === '.' ? '' : cls}`;
}

// A selector that finds the same element after reloads and small edits.
function selectorFor(el) {
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && node !== document.body && parts.length < 8) {
    if (node.id && !/^(wf|f|help|dlg|cf)-\d+$/.test(node.id)) { parts.unshift(`#${CSS.escape(node.id)}`); break; }
    const stable = ['data-id', 'data-wf-id', 'data-tab', 'name', 'href'].find((a) => node.hasAttribute(a) && node.getAttribute(a).length < 80);
    let part = node.tagName.toLowerCase();
    if (stable) part += `[${stable}="${CSS.escape(node.getAttribute(stable))}"]`;
    else if (node.parentElement) {
      const same = [...node.parentElement.children].filter((c) => c.tagName === node.tagName);
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
    }
    parts.unshift(part);
    node = node.parentElement;
  }
  if (parts.length && !parts[0].startsWith('#')) parts.unshift('body');
  return parts.join(' > ');
}

function placeCard(card, x, y) {
  const w = card.offsetWidth || 380, h = card.offsetHeight || 300;
  card.style.left = `${Math.max(12, Math.min(x + 16, innerWidth - w - 12))}px`;
  card.style.top = `${Math.max(12, Math.min(y - 20, innerHeight - h - 80))}px`;
}

if (!window.__wfHarness) {
  window.__wfHarness = new Harness();
  const go = () => window.__wfHarness.start().catch((err) => console.warn('wf harness:', err));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
}
