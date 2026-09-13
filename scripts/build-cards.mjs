// Renders the "liquid glass" SVG cards used by README.md.
//
//   GITHUB_TOKEN=... node scripts/build-cards.mjs [outDir]
//
// Each card is a self-contained animated SVG: blurred colour blobs drift
// behind translucent panels with a gradient edge and a moving specular
// sheen. Everything is inline (CSS keyframes + a base64 avatar) because
// GitHub renders README images through camo inside <img>, where external
// fonts, scripts and backdrop-filter are unavailable but CSS animation is.
//
// Live numbers come from the GraphQL API; a GitHub Action reruns this daily
// and publishes the output to the `output` branch.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const LOGIN = "Nam-Antoine";
const OUT = process.argv[2] ?? "dist";
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error("GITHUB_TOKEN is required");

// ───────────────────────────── data ─────────────────────────────

const QUERY = `query($login:String!){
  user(login:$login){
    avatarUrl(size:200)
    followers{ totalCount }
    repositories(first:100, privacy:PUBLIC, ownerAffiliations:OWNER, isFork:false, orderBy:{field:PUSHED_AT, direction:DESC}){
      totalCount
      nodes{
        name description stargazerCount forkCount pushedAt url
        primaryLanguage{ name color }
        languages(first:10, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{ name color } } }
        releases(last:1){ nodes{ tagName } }
      }
    }
    contributionsCollection{
      contributionCalendar{
        totalContributions
        weeks{ contributionDays{ date contributionCount } }
      }
    }
  }
}`;

async function gql() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { authorization: `bearer ${TOKEN}`, "content-type": "application/json", "user-agent": LOGIN },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.user;
}

async function avatarDataUri(url) {
  const res = await fetch(url, { headers: { "user-agent": LOGIN } });
  const type = res.headers.get("content-type") ?? "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${type};base64,${buf.toString("base64")}`;
}

function streaks(weeks) {
  const days = weeks.flatMap((w) => w.contributionDays).sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0, run = 0;
  for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  // current streak: walk back from today, allowing today to be empty
  let current = 0;
  const rev = [...days].reverse();
  const start = rev[0]?.contributionCount === 0 ? 1 : 0;
  for (let i = start; i < rev.length; i++) { if (rev[i].contributionCount > 0) current++; else break; }
  return { current, longest, days };
}

function languageShare(repos) {
  const sum = new Map();
  for (const r of repos) for (const e of r.languages.edges) {
    const cur = sum.get(e.node.name) ?? { size: 0, color: e.node.color ?? "#8b949e" };
    cur.size += e.size; sum.set(e.node.name, cur);
  }
  const total = [...sum.values()].reduce((a, b) => a + b.size, 0) || 1;
  return [...sum.entries()].map(([name, v]) => ({ name, color: v.color, pct: (v.size / total) * 100 }))
    .sort((a, b) => b.pct - a.pct).slice(0, 6);
}

// ───────────────────────────── themes ─────────────────────────────

const THEMES = {
  dark: {
    bg: "#070c18", bg2: "#0d1630",
    blobs: ["#1155BC", "#22d3ee", "#7c3aed", "#2563eb"], blobOpacity: 0.85,
    glass: "rgba(255,255,255,0.065)", glassEdgeTop: "rgba(255,255,255,0.55)", glassEdgeBottom: "rgba(255,255,255,0.08)",
    sheen: "rgba(255,255,255,0.22)", shadow: 0.45,
    text: "#f3f6fb", muted: "rgba(243,246,251,0.66)", faint: "rgba(243,246,251,0.4)", accent: "#8ccbff", chip: "rgba(255,255,255,0.09)",
    trackBg: "rgba(255,255,255,0.1)",
  },
  light: {
    bg: "#eaf1fc", bg2: "#f7f9ff",
    blobs: ["#1155BC", "#38bdf8", "#a78bfa", "#60a5fa"], blobOpacity: 0.45,
    glass: "rgba(255,255,255,0.55)", glassEdgeTop: "rgba(255,255,255,1)", glassEdgeBottom: "rgba(17,85,188,0.14)",
    sheen: "rgba(255,255,255,0.7)", shadow: 0.18,
    text: "#0b1220", muted: "rgba(11,18,32,0.62)", faint: "rgba(11,18,32,0.42)", accent: "#1155BC", chip: "rgba(255,255,255,0.7)",
    trackBg: "rgba(17,85,188,0.1)",
  },
};

const FONT = `'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const textW = (s, size) => [...String(s)].reduce((w, ch) => w + (/[A-Z0-9]/.test(ch) ? 0.66 : /[il.,' ]/.test(ch) ? 0.3 : 0.54), 0) * size;

function wrap(text, maxChars, maxLines) {
  const words = text.split(/\s+/); const lines = []; let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) { lines.push(cur.trim()); cur = w; } else cur += " " + w;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && cur.trim()) lines.push(cur.trim());
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s?\S*$/, "…");
  return lines;
}

// Shared <defs> + <style>. `id` keeps ids unique per card in case several
// SVGs are inlined on one page.
function frame({ id, w, h, t, blobs }) {
  const blobEls = blobs.map((b, i) => {
    const color = t.blobs[i % t.blobs.length];
    return `<circle class="blob b${i}" cx="${b.x}" cy="${b.y}" r="${b.r}" fill="${color}" />`;
  }).join("");
  return `
<defs>
  <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
  <linearGradient id="${id}-edge" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${t.glassEdgeTop}"/><stop offset="0.45" stop-color="${t.glassEdgeBottom}"/><stop offset="1" stop-color="${t.glassEdgeTop}" stop-opacity="0.6"/></linearGradient>
  <linearGradient id="${id}-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.sheen}" stop-opacity="0"/><stop offset="0.5" stop-color="${t.sheen}"/><stop offset="1" stop-color="${t.sheen}" stop-opacity="0"/></linearGradient>
  <linearGradient id="${id}-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <filter id="${id}-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="46"/></filter>
  <filter id="${id}-shadow" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#020617" flood-opacity="${t.shadow}"/></filter>
  <clipPath id="${id}-clip"><rect width="${w}" height="${h}" rx="24"/></clipPath>
</defs>
<style>
  .blob { filter: url(#${id}-blur); opacity: ${t.blobOpacity}; mix-blend-mode: screen; }
  @keyframes ${id}-drift0 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(70px,-40px) scale(1.15)} 100%{transform:translate(0,0) scale(1)} }
  @keyframes ${id}-drift1 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-90px,30px) scale(0.9)} 100%{transform:translate(0,0) scale(1)} }
  @keyframes ${id}-drift2 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,60px) scale(1.2)} 100%{transform:translate(0,0) scale(1)} }
  @keyframes ${id}-drift3 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-50px,-60px) scale(1.05)} 100%{transform:translate(0,0) scale(1)} }
  .b0{animation:${id}-drift0 14s ease-in-out infinite} .b1{animation:${id}-drift1 17s ease-in-out infinite}
  .b2{animation:${id}-drift2 19s ease-in-out infinite} .b3{animation:${id}-drift3 15s ease-in-out infinite}
  @keyframes ${id}-sweep { 0%{transform:translateX(-${w}px) skewX(-18deg)} 35%,100%{transform:translateX(${w * 1.2}px) skewX(-18deg)} }
  .sheen { animation: ${id}-sweep 7s cubic-bezier(.4,0,.2,1) infinite; }
  @keyframes ${id}-rise { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .rise { animation: ${id}-rise .8s cubic-bezier(.2,.7,.2,1) both; }
  .d1{animation-delay:.1s} .d2{animation-delay:.25s} .d3{animation-delay:.4s} .d4{animation-delay:.55s} .d5{animation-delay:.7s} .d6{animation-delay:.85s}
  text { font-family: ${FONT}; }
</style>
<rect width="${w}" height="${h}" rx="24" fill="url(#${id}-bg)"/>
<g clip-path="url(#${id}-clip)">${blobEls}</g>`;
}

// A glass panel with gradient edge, top highlight and the sweeping sheen.
function panel({ id, x, y, w, h, t, rx = 20, sheen = true }) {
  const cid = `${id}-p${x}-${y}`;
  return `
<g filter="url(#${id}-shadow)">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${t.glass}" stroke="url(#${id}-edge)" stroke-width="1.2"/>
</g>
<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${Math.min(28, h / 3)}" rx="${rx - 1}" fill="url(#${id}-top)" opacity="0.5"/>
${sheen ? `<clipPath id="${cid}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath>
<g clip-path="url(#${cid})"><rect class="sheen" x="${x}" y="${y - 20}" width="${Math.max(90, w * 0.18)}" height="${h + 40}" fill="url(#${id}-sheen)"/></g>` : ""}`;
}

function chip({ x, y, label, t, dot, size = 12, rise = "" }) {
  const w = Math.round(textW(label, size) + 22 + (dot ? 14 : 0));
  return {
    w,
    svg: `<g class="rise ${rise}"><rect x="${x}" y="${y}" width="${w}" height="${size + 14}" rx="${(size + 14) / 2}" fill="${t.chip}" stroke="${t.glassEdgeBottom}"/>
      ${dot ? `<circle cx="${x + 13}" cy="${y + (size + 14) / 2}" r="4" fill="${dot}"/>` : ""}
      <text x="${x + 11 + (dot ? 14 : 0)}" y="${y + size + 3}" font-size="${size}" fill="${t.text}">${esc(label)}</text></g>`,
  };
}

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">${body}</svg>`;

// ───────────────────────────── cards ─────────────────────────────

function hero({ theme, t, avatar, user }) {
  const w = 900, h = 300, id = `hero-${theme}`;
  const lines = ["I build the tools I wish I had.", "Then I ship web apps end to end.", "Next.js · NestJS · Electron · Tauri", "Final-year ICT student at USTH, Hanoi"];
  const cycle = lines.length * 3.2;
  const taglines = lines.map((l, i) =>
    `<text class="tl tl${i}" x="52" y="156" font-size="20" fill="${t.muted}">${esc(l)}</text>`).join("");
  const tlStyle = `<style>
    @keyframes ${id}-cycle { 0%,4%{opacity:0;transform:translateY(8px)} 8%,${100 / lines.length - 4}%{opacity:1;transform:translateY(0)} ${100 / lines.length}%,100%{opacity:0;transform:translateY(-8px)} }
    .tl { opacity:0; animation:${id}-cycle ${cycle}s ease-in-out infinite; }
    ${lines.map((_, i) => `.tl${i}{animation-delay:${(i * cycle) / lines.length}s}`).join(" ")}
    @keyframes ${id}-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
    .ring { transform-origin: 760px 150px; animation:${id}-pulse 5s ease-in-out infinite; }
    @keyframes ${id}-spin { to{transform:rotate(360deg)} }
    .orbit { transform-origin: 760px 150px; animation:${id}-spin 18s linear infinite; }
  </style>`;

  const pills = [
    { label: "ICT @ USTH", dot: "#8ccbff" },
    { label: "Hanoi · UTC+7", dot: "#34d399" },
    { label: `${user.repositories.totalCount} public repos`, dot: "#fbbf24" },
    { label: `${user.followers.totalCount} followers`, dot: "#f472b6" },
  ];
  let px = 52; const pillSvg = pills.map((p, i) => { const c = chip({ x: px, y: 212, label: p.label, t, dot: p.dot, size: 13, rise: `d${i + 3}` }); px += c.w + 10; return c.svg; }).join("");

  const body = `
${frame({ id, w, h, t, blobs: [{ x: 120, y: 60, r: 170 }, { x: 560, y: 260, r: 200 }, { x: 800, y: 40, r: 150 }, { x: 350, y: 180, r: 120 }] })}
${tlStyle}
${panel({ id, x: 24, y: 24, w: 852, h: 252, t, rx: 26 })}
<text class="rise" x="52" y="84" font-size="15" letter-spacing="3" fill="${t.faint}">HI THERE, I'M</text>
<text class="rise d1" x="52" y="126" font-size="42" font-weight="700" fill="${t.text}">Nam-Antoine</text>
${taglines}
${pillSvg}
<defs><clipPath id="${id}-av"><circle cx="760" cy="150" r="72"/></clipPath>
<linearGradient id="${id}-orbit" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></linearGradient></defs>
<g class="ring"><circle cx="760" cy="150" r="88" fill="${t.glass}" stroke="url(#${id}-edge)" stroke-width="1.2"/></g>
<g class="orbit"><circle cx="760" cy="150" r="88" fill="none" stroke="url(#${id}-orbit)" stroke-width="2" stroke-dasharray="120 440" stroke-linecap="round"/></g>
<image class="rise d2" href="${avatar}" x="688" y="78" width="144" height="144" clip-path="url(#${id}-av)"/>
<circle cx="760" cy="150" r="72" fill="none" stroke="${t.glassEdgeTop}" stroke-opacity="0.6"/>`;
  return svg(w, h, body);
}

function projectCard({ theme, t, p }) {
  const w = 440, h = 210, id = `proj-${theme}-${p.key}`;
  const lines = wrap(p.description, 62, 3);
  const descSvg = lines.map((l, i) => `<text class="rise d2" x="34" y="${82 + i * 18}" font-size="13" fill="${t.muted}">${esc(l)}</text>`).join("");
  let cx = 34; const chips = p.tech.map((c, i) => { const ch = chip({ x: cx, y: 140, label: c, t, size: 11, rise: `d${Math.min(6, i + 3)}` }); cx += ch.w + 8; return ch.svg; }).join("");
  const meta = [];
  if (p.lang) meta.push(`<circle cx="${34 + 5}" cy="181" r="5" fill="${p.langColor}"/><text x="46" y="185" font-size="12" fill="${t.muted}">${esc(p.lang)}</text>`);
  const right = [p.stars != null ? `★ ${p.stars}` : null, p.release ? p.release : null, p.updated].filter(Boolean).join("   ·   ");
  const body = `
${frame({ id, w, h, t, blobs: [{ x: p.seed * 90 % 440, y: 40, r: 130 }, { x: 380 - (p.seed * 60 % 300), y: 200, r: 150 }, { x: 220, y: 110, r: 90 }] })}
${panel({ id, x: 14, y: 14, w: 412, h: 182, t, rx: 22 })}
<text class="rise" x="34" y="52" font-size="20" font-weight="700" fill="${t.text}">${esc(p.title)}</text>
${p.badge ? `<text class="rise d1" x="${34 + textW(p.title, 20) + 12}" y="51" font-size="11" fill="${t.faint}">${esc(p.badge)}</text>` : ""}
${descSvg}
${chips}
${meta.join("")}
<text class="rise d4" x="406" y="185" font-size="12" text-anchor="end" fill="${t.faint}">${esc(right)}</text>`;
  return svg(w, h, body);
}

function stackCard({ theme, t }) {
  const w = 900, h = 196, id = `stack-${theme}`;
  const groups = [
    ["Web", ["TypeScript", "Next.js", "React", "NestJS", "Prisma", "PostgreSQL", "Tailwind", "Playwright"]],
    ["Desktop", ["Electron", "Tauri", "Rust"]],
    ["Data & infra", ["Python", "Jupyter", "scikit-learn", "Docker", "Kubernetes", "GitHub Actions"]],
    ["Workflow", ["Claude Code", "pnpm", "Figma", "Linear"]],
  ];
  let y = 38, out = "", n = 0;
  for (const [label, items] of groups) {
    out += `<text class="rise" x="40" y="${y + 16}" font-size="11" letter-spacing="2" fill="${t.faint}">${esc(label.toUpperCase())}</text>`;
    let x = 150;
    for (const it of items) { const c = chip({ x, y, label: it, t, size: 11, rise: `d${(n++ % 6) + 1}` }); x += c.w + 8; out += c.svg; }
    y += 30;
  }
  const body = `
${frame({ id, w, h, t, blobs: [{ x: 100, y: 150, r: 150 }, { x: 500, y: 0, r: 160 }, { x: 850, y: 140, r: 140 }, { x: 300, y: 80, r: 100 }] })}
${panel({ id, x: 16, y: 16, w: 868, h: 164, t, rx: 22 })}
${out}`;
  return svg(w, h, body);
}

function activityCard({ theme, t, user, st, langs }) {
  const w = 900, h = 200, id = `act-${theme}`;
  const stats = [
    { n: user.contributionsCollection.contributionCalendar.totalContributions, l: "contributions, past year" },
    { n: st.current, l: "day current streak" },
    { n: st.longest, l: "day longest streak" },
    { n: user.repositories.nodes.reduce((a, r) => a + r.stargazerCount, 0), l: "stars across repos" },
  ];
  const statSvg = stats.map((s, i) => `
    <text class="rise d${i + 1}" x="46" y="${68 + i * 34}" font-size="26" font-weight="700" fill="${t.text}" text-anchor="end" transform="translate(30,0)">${s.n}</text>
    <text class="rise d${i + 1}" x="90" y="${68 + i * 34}" font-size="12" fill="${t.muted}">${esc(s.l)}</text>`).join("");

  // last 12 weeks of the calendar as a mini heat-strip
  const days = st.days.slice(-84);
  const max = Math.max(1, ...days.map((d) => d.contributionCount));
  const cells = days.map((d, i) => {
    const wk = Math.floor(i / 7), dow = i % 7, a = d.contributionCount === 0 ? 0.12 : 0.3 + 0.7 * (d.contributionCount / max);
    return `<rect class="rise d${(wk % 6) + 1}" x="${330 + wk * 14}" y="${44 + dow * 14}" width="11" height="11" rx="3" fill="${t.accent}" fill-opacity="${a.toFixed(2)}"/>`;
  }).join("");

  const barStyle = `<style>@keyframes ${id}-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}} .bar{transform-origin:520px 0;animation:${id}-grow 1.2s cubic-bezier(.2,.7,.2,1) both}</style>`;
  const bars = langs.map((l, i) => `
    <text class="rise d${i + 1}" x="520" y="${52 + i * 24}" font-size="12" fill="${t.text}">${esc(l.name)}</text>
    <text class="rise d${i + 1}" x="856" y="${52 + i * 24}" font-size="11" text-anchor="end" fill="${t.faint}">${l.pct.toFixed(1)}%</text>
    <rect x="520" y="${57 + i * 24}" width="336" height="6" rx="3" fill="${t.trackBg}"/>
    <rect class="bar" style="animation-delay:${0.15 * i}s" x="520" y="${57 + i * 24}" width="${Math.max(6, (336 * l.pct) / 100).toFixed(1)}" height="6" rx="3" fill="${l.color}"/>`).join("");

  const body = `
${frame({ id, w, h, t, blobs: [{ x: 80, y: 40, r: 150 }, { x: 450, y: 220, r: 180 }, { x: 860, y: 30, r: 140 }, { x: 650, y: 100, r: 90 }] })}
${barStyle}
${panel({ id, x: 16, y: 16, w: 868, h: 168, t, rx: 22 })}
${statSvg}
<text x="330" y="34" font-size="11" letter-spacing="2" fill="${t.faint}">LAST 12 WEEKS</text>
${cells}
<text x="520" y="34" font-size="11" letter-spacing="2" fill="${t.faint}">LANGUAGES</text>
${bars}`;
  return svg(w, h, body);
}

// ───────────────────────────── main ─────────────────────────────

const user = await gql();
const avatar = await avatarDataUri(user.avatarUrl);
const st = streaks(user.contributionsCollection.contributionCalendar.weeks);
const langs = languageShare(user.repositories.nodes.filter((r) => r.name !== LOGIN));
const byName = Object.fromEntries(user.repositories.nodes.map((r) => [r.name, r]));
const ago = (iso) => { const d = Math.floor((Date.now() - Date.parse(iso)) / 864e5); return d === 0 ? "updated today" : d === 1 ? "updated yesterday" : d < 30 ? `updated ${d}d ago` : `updated ${Math.floor(d / 30)}mo ago`; };
const live = (name) => { const r = byName[name]; return r ? { stars: r.stargazerCount, updated: ago(r.pushedAt), lang: r.primaryLanguage?.name, langColor: r.primaryLanguage?.color, release: r.releases.nodes[0]?.tagName } : {}; };

const PROJECTS = [
  { key: "nmux", seed: 1, title: "Nmux", description: "A persistent desktop home for Claude Code. Sessions live in real terminals that Nmux owns, so closing VS Code or the window never kills them — reopen to the same screen, relaunch and resume the conversation.", tech: ["TypeScript", "Electron", "React", "xterm.js"], ...live("Nmux") },
  { key: "tkb", seed: 2, title: "USTH Timetable", description: "A Windows tray app that watches the USTH student portal and pings you — toast, ntfy, Discord, Telegram or any webhook — when a class is added, moved, or changes room or teacher. Self-updating from GitHub Releases.", tech: ["Tauri", "Rust", "JavaScript"], ...live("TKB") },
  { key: "fleetview", seed: 3, title: "FleetView", badge: "final-year project · private until submission", description: "A read-only dashboard over many Kubernetes clusters that puts cost/waste, configuration drift and fleet health on one screen — with reviewable recommendations that come with the kubectl one-liner and the USD/month it saves.", tech: ["Python", "Kubernetes", "Chart.js"], lang: "Python", langColor: "#3572A5", updated: "in progress" },
  { key: "ml1", seed: 4, title: "ML1-project", description: "Can an AI assistant actually improve model building, evaluation and error analysis? A bachelor-level ML study on a small classification task — data, models, results and slides in one place.", tech: ["Jupyter", "scikit-learn"], ...live("ML1-project") },
];

await mkdir(OUT, { recursive: true });
const files = [];
for (const theme of Object.keys(THEMES)) {
  const t = THEMES[theme];
  files.push([`hero-${theme}.svg`, hero({ theme, t, avatar, user })]);
  files.push([`stack-${theme}.svg`, stackCard({ theme, t })]);
  files.push([`activity-${theme}.svg`, activityCard({ theme, t, user, st, langs })]);
  for (const p of PROJECTS) files.push([`project-${p.key}-${theme}.svg`, projectCard({ theme, t, p })]);
}
for (const [name, content] of files) await writeFile(join(OUT, name), content);
console.log(`wrote ${files.length} cards to ${OUT}/ — ${st.current}d streak, ${langs.map((l) => l.name).join(", ")}`);
