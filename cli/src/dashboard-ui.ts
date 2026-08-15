/** Live dashboard markup served by `glass dashboard`. */

export function dashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Stackglass</title>
<style>
  :root { color-scheme: dark; --bg:#090B0E; --surface:#12161B; --elev:#191E25; --primary:#61D6C5; --text:#F3F6F8; --muted:#8C98A5; --fail:#EF6262; --warn:#E7B14C; --ok:#57C785; --blue:#72A7FF; --mint:#93F1E4; --line:#1f2630; }
  * { box-sizing: border-box; }
  body { margin:0; font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background:var(--bg); color:var(--text); }
  header { display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid var(--line); }
  h1 { font-size:13px; letter-spacing:.22em; margin:0; font-weight:650; }
  h2 { font-size:13px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-weight:600; }
  .tag { color:var(--muted); }
  .live { color:var(--ok); font-size:11px; letter-spacing:.12em; }
  nav { display:flex; flex-wrap:wrap; gap:6px; padding:12px 20px; border-bottom:1px solid var(--line); }
  nav button { background:var(--surface); color:var(--text); border:1px solid #2a3340; padding:6px 10px; cursor:pointer; }
  nav button.active { border-color:var(--primary); color:var(--primary); }
  main { display:grid; grid-template-columns: 260px 1fr; min-height: calc(100vh - 108px); }
  aside { border-right:1px solid var(--line); padding:16px; background:var(--surface); }
  section { padding:20px; overflow:auto; max-height: calc(100vh - 108px); }
  .row { display:flex; justify-content:space-between; gap:12px; padding:7px 0; border-bottom:1px solid #1a2028; }
  .k { color:var(--muted); }
  .ok { color:var(--ok); } .fail { color:var(--fail); } .warn { color:var(--warn); }
  .card { background:var(--elev); padding:12px 14px; margin:0 0 12px; border:1px solid var(--line); }
  .beat { display:grid; grid-template-columns: 64px 1fr 1fr; gap:8px; padding:6px 0; border-bottom:1px solid #1a2028; }
  .bar { height:6px; background:#1a2028; margin-top:6px; }
  .bar > i { display:block; height:6px; background:var(--primary); }
  .attn { padding:8px 0; border-bottom:1px solid #1a2028; }
</style>
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <linearGradient id="sg-bg" x1="12" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#121821"/>
      <stop offset="1" stop-color="#090B0E"/>
    </linearGradient>
    <linearGradient id="sg-a" x1="16" y1="8" x2="52" y2="36" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9CC4FF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#3D6CB8" stop-opacity="0.12"/>
    </linearGradient>
    <linearGradient id="sg-b" x1="14" y1="16" x2="50" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#8AF0DE" stop-opacity="0.62"/>
      <stop offset="1" stop-color="#1F8A7A" stop-opacity="0.16"/>
    </linearGradient>
    <linearGradient id="sg-c" x1="12" y1="28" x2="48" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#E7FFF9" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#61D6C5" stop-opacity="0.08"/>
    </linearGradient>
    <linearGradient id="sg-s" x1="22" y1="12" x2="44" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#F7FFFD"/>
      <stop offset="0.42" stop-color="#93F1E4"/>
      <stop offset="1" stop-color="#61D6C5"/>
    </linearGradient>
    <symbol id="mark" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="url(#sg-bg)"/>
      <rect x="14" y="9" width="36" height="26" rx="7" fill="url(#sg-a)" transform="rotate(-9 32 22)"/>
      <rect x="14" y="19" width="36" height="26" rx="7" fill="url(#sg-b)"/>
      <rect x="14" y="29" width="36" height="26" rx="7" fill="url(#sg-c)" transform="rotate(9 32 42)"/>
      <path fill="none" stroke="#ffffff" stroke-linecap="round" stroke-width="1.15" opacity="0.28" d="M18 16.5c6.5-4 16-4.2 22 1"/>
      <path fill="url(#sg-s)" d="M42.55 20.05c0-4.55-3.85-7.45-9.7-7.45-5.7 0-10 2.55-11.35 6.75l5.05 1.5c.8-2.3 3.25-3.8 6.3-3.8 2.9 0 4.7 1.25 4.7 3.1 0 1.75-1.2 2.6-5.05 3.55l-3.35.85c-6 1.5-9.15 4.45-9.15 9.35 0 5.35 4.3 8.65 10.6 8.65 6.15 0 10.85-2.75 12.4-7.2l-5.15-1.55c-.9 2.5-3.6 4.25-7.2 4.25-3.35 0-5.4-1.4-5.4-3.55 0-1.75 1.3-2.8 5.45-3.9l3.35-.85c6.55-1.6 9.5-4.7 9.5-9.9z"/>
    </symbol>
  </defs>
</svg>
<header>
  <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true"><use href="#mark"/></svg>
  <div>
    <h1>STACKGLASS</h1>
    <div class="tag">See what your project is actually doing. <span class="live" id="live">LIVE</span></div>
  </div>
</header>
<nav id="nav"></nav>
<main>
  <aside id="side"></aside>
  <section id="view">Loading…</section>
</main>
<script>
const views = ["Overview","Why","Session","Heat","Timeline","Changes","GlassLab","Failures","Clusters","Coverage","Runtime","Configuration","Documentation","Release","MCP","Settings"];
const nav = document.getElementById("nav");
let current = "Overview";
views.forEach(v => {
  const b = document.createElement("button");
  b.textContent = v;
  b.onclick = () => { current = v; render(); };
  nav.appendChild(b);
});
async function api(p){ const r = await fetch("/api/"+p); if(!r.ok) throw new Error(p+" "+r.status); return r.json(); }
function esc(s){ return String(s??"").replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function kv(k,v,cls){ return "<div class='row'><span class='k'>"+esc(k)+"</span><span class='"+(cls||"")+"'>"+esc(v)+"</span></div>"; }
function fmtTests(t){ if(!t||t.availability!=="available") return t?.availability ?? "no_data"; return (t.passed??0)+" / "+(t.total??0); }
function sev(s){ return s==="error"?"fail":s==="warning"?"warn":"ok"; }
async function render(){
  [...nav.children].forEach(b => b.classList.toggle("active", b.textContent===current));
  const view = document.getElementById("view");
  const side = document.getElementById("side");
  try {
    const snap = await api("snapshot");
    const tests = fmtTests(snap.testStatus);
    const testCls = (snap.testStatus?.failed||0)>0 ? "fail" : snap.testStatus?.availability==="available" ? "ok" : "";
    side.innerHTML =
      kv("Branch", snap.repository?.branch ?? "n/a") +
      kv("Commit", snap.repository?.commitShort ?? "n/a") +
      kv("Changed", (snap.changedFiles||[]).length+" files") +
      kv("Tests", tests, testCls) +
      kv("Build", snap.buildStatus?.status ?? "not_run", snap.buildStatus?.status==="fail"?"fail":snap.buildStatus?.status==="pass"?"ok":"") +
      kv("Runtime", (snap.runtimeStatus?.processes||[]).length+" processes") +
      kv("Coverage", snap.coverage?.availability==="available" && snap.coverage.lines!=null ? snap.coverage.lines+"%" : (snap.coverage?.availability ?? "no_data"));
    if (current==="Overview") {
      const attn = snap.attention||[];
      view.innerHTML = "<h2>Project state</h2><div class='card'>"+side.innerHTML+"</div><h2>Attention</h2>" +
        (attn.length ? attn.map(a => "<div class='attn "+sev(a.severity)+"'>"+esc(a.message)+"</div>").join("") : "<p class='tag'>Nothing queued.</p>");
    } else if (current==="Why") {
      const n = await api("why");
      view.innerHTML = "<h2>Why</h2><div class='card'><strong>"+esc(n.headline)+"</strong>"+(n.paragraphs||[]).map(p=>"<p>"+esc(p)+"</p>").join("")+"</div>"+
        "<h2>Evidence</h2><div class='card'>"+(n.evidence||[]).map(e=>"<div>"+esc(e)+"</div>").join("")+"</div>"+
        "<h2>Unanswered</h2><div class='card'>"+(n.unanswered||[]).map(e=>"<div class='warn'>"+esc(e)+"</div>").join("")+"</div>";
    } else if (current==="Session") {
      const s = await api("session");
      view.innerHTML = "<h2>Session replay</h2><div class='card'>"+esc(s.summary)+"</div>"+
        (s.beats||[]).map(b => "<div class='beat'><span class='k'>"+esc(b.at)+"</span><span>"+esc(b.type)+"</span><span class='tag'>"+esc(b.detail)+"</span></div>").join("");
    } else if (current==="Heat") {
      const heat = await api("heat");
      const max = Math.max(1, ...heat.map(h => h.score||0));
      view.innerHTML = "<h2>File heat</h2>"+(heat.length?heat.map(h => "<div class='card'><div class='row'><span>"+esc(h.file)+"</span><span>"+h.score+"</span></div><div class='bar'><i style='width:"+(100*h.score/max)+"%'></i></div><div class='tag'>events "+h.events+" · changes "+h.changes+" · failures "+h.failures+"</div></div>").join(""):"<p class='tag'>No heat yet. Edit files or run tests through Stackglass.</p>");
    } else if (current==="Timeline") {
      const tl = await api("timeline");
      view.innerHTML = "<h2>Timeline</h2>"+(tl.length?tl.map(e => "<div class='beat'><span class='k'>"+esc((e.timestamp||"").slice(11,19))+"</span><span>"+esc(e.type)+"</span><span class='tag'>"+esc((e.relatedFiles&&e.relatedFiles[0])||e.result||"")+"</span></div>").join(""):"<p class='tag'>No data.</p>");
    } else if (current==="Changes") {
      const ch = await api("changes");
      const files = ch.files||[];
      view.innerHTML = "<h2>Changes</h2><div class='card'>"+kv("Insertions", ch.insertions??0)+kv("Deletions", ch.deletions??0)+kv("Compared to", ch.comparedTo??"HEAD")+"</div>"+
        files.map(f => "<div class='row'><span>"+esc(f.path)+"</span><span class='tag'>"+esc(f.status||"")+"</span></div>").join("");
    } else if (current==="GlassLab") {
      const t = await api("tests");
      view.innerHTML = "<h2>GlassLab</h2><div class='card'>"+kv("Files", (t.files||[]).length)+kv("Frameworks", (t.frameworks||[]).map(f=>f.name).join(", ")||"none")+"</div>"+
        (t.files||[]).slice(0,40).map(f => "<div class='row'><span>"+esc(f)+"</span></div>").join("");
    } else if (current==="Failures") {
      const fails = await api("failures");
      view.innerHTML = "<h2>Failure center</h2>"+(fails.length?fails.map(f => "<div class='card'><div class='row'><span class='fail'>"+esc(f.status)+"</span><span class='tag'>"+esc(f.file||"")+"</span></div><div>"+esc(f.message)+"</div></div>").join(""):"<p class='tag'>No stored failures.</p>");
    } else if (current==="Clusters") {
      const clusters = await api("clusters");
      view.innerHTML = "<h2>Failure clusters</h2>"+(clusters.length?clusters.map(c => "<div class='card'><div class='row'><span>"+esc(c.label)+"</span><span>"+c.count+"</span></div><div class='tag'>"+esc((c.sharedFiles||[]).join(", "))+"</div></div>").join(""):"<p class='tag'>No clusters.</p>");
    } else if (current==="Coverage") {
      const cov = await api("coverage");
      view.innerHTML = "<h2>Coverage</h2><div class='card'>"+kv("Availability", cov.availability)+kv("Lines", cov.lines?.pct ?? "n/a")+"</div>";
    } else if (current==="Runtime") {
      const rt = await api("runtime");
      const procs = rt.processes||[];
      view.innerHTML = "<h2>Runtime</h2>"+(procs.length?procs.map(p => "<div class='card'>"+kv("Name", p.name)+kv("Status", p.status)+kv("Command", p.command)+"</div>").join(""):"<p class='tag'>No Stackglass-managed processes.</p>");
    } else if (current==="Configuration") {
      const cfg = await api("config");
      view.innerHTML = "<h2>Configuration</h2>"+(cfg.findings||[]).map(f => "<div class='attn "+sev(f.severity)+"'>"+esc(f.message)+"</div>").join("") || "<p class='tag'>No findings.</p>";
    } else if (current==="Documentation") {
      const docs = await api("docs");
      view.innerHTML = "<h2>Documentation</h2>"+(docs.mismatches||[]).map(m => "<div class='attn "+sev(m.severity)+"'>"+esc(m.message)+"</div>").join("") || "<p class='tag'>No mismatches.</p>";
    } else if (current==="Release") {
      const rel = await api("release");
      view.innerHTML = "<h2>Release readiness</h2><div class='card'>"+kv("Ready", rel.ready, rel.ready?"ok":"fail")+"</div>"+(rel.checks||[]).map(c => "<div class='row'><span>"+esc(c.label||c.id)+"</span><span class='"+sev(c.status)+"'>"+esc(c.status)+"</span></div>").join("");
    } else if (current==="MCP") {
      view.innerHTML = "<h2>MCP</h2><p>22 canonical tools via <code>stackglass-mcp</code>.</p><p class='tag'>Resources: project, timeline, session, attention, clusters, heat, tests, failures, coverage, runtime, changes, configuration, release.</p>";
    } else {
      view.innerHTML = "<h2>Settings</h2><p>Local-first. Telemetry off by default. Watch auto-run is <code>watch.autoRun</code> in .stackglass/config.json.</p>";
    }
  } catch (e) {
    view.innerHTML = "<p class='fail'>"+esc(e)+"</p>";
  }
}
try {
  const es = new EventSource("/api/events");
  es.onmessage = () => { document.getElementById("live").textContent = "LIVE"; render(); };
  es.onerror = () => { document.getElementById("live").textContent = "IDLE"; };
} catch (e) {}
render();
</script>
</html>`;
}
