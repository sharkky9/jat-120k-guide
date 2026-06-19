const DATA = window.JAT_DATA;
let state = { interval: 'all', surface: 'all', query: '', filter: 'all', activeKm: 0 };
const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat('en-US');
const surfaceColor = (name) => DATA.colors[name] || '#777';

function heroBrief() {
  const m = DATA.meta;
  $('heroBrief').innerHTML = [
    ['Distance', `${m.distanceKm} km`],
    ['Gain', `${fmt.format(m.gainM)} m+`],
    ['Start', m.startTime.replace(', ', '<br>')],
    ['Max time', '32 hours'],
    ['High point', `${fmt.format(m.maxEle)} m`],
    ['Micro-segments', fmt.format(m.microSegments)]
  ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');

  $('briefGrid').innerHTML = [
    ['Modeled hard surface', `${m.hardKm} km`, 'Enough asphalt/paved/cobbled running to make cushion matter, but not enough to justify a road-first shoe.'],
    ['Singletrack / alpine', `${m.singletrackKm} km`, 'The practical reason to prioritize grip, lockdown, toe protection and stability.'],
    ['Context visuals only', `${Math.round(m.broadVisualPct + m.localContextPct)}%`, 'Broad official and adjacent-route context exists, but direct geotagged route visual proof is 0%.'],
    ['Weak / low confidence', `${m.weakPct}%`, 'A conservative evidence score, not a terrain-danger score. Use it to spot where claims are most caveated.']
  ].map(([a, b, c]) => `<article class="brief-tile"><span>${a}</span><b>${b}</b><p>${c}</p></article>`).join('');
}

function project(points, w, h, pad = 22) {
  const minLat = Math.min(...points.map(p => p.lat));
  const maxLat = Math.max(...points.map(p => p.lat));
  const minLon = Math.min(...points.map(p => p.lon));
  const maxLon = Math.max(...points.map(p => p.lon));
  const sx = (w - pad * 2) / (maxLon - minLon);
  const sy = (h - pad * 2) / (maxLat - minLat);
  const s = Math.min(sx, sy);
  const ox = (w - (maxLon - minLon) * s) / 2;
  const oy = (h - (maxLat - minLat) * s) / 2;
  return points.map(p => ({ ...p, x: ox + (p.lon - minLon) * s, y: h - (oy + (p.lat - minLat) * s) }));
}

function routeSvg(target, opts = {}) {
  const el = $(target);
  if (!el) return;
  const w = el.clientWidth || 800;
  const h = el.clientHeight || 520;
  const pts = project(DATA.route, w, h, 28);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const aid = DATA.aidPoints.map(a => DATA.route.reduce((best, p) => Math.abs(p.km - a.distance / 1000) < Math.abs(best.km - a.distance / 1000) ? p : best, DATA.route[0]));
  const aidPts = project(aid, w, h, 28);
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${path}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${opts.dark ? '#243c32' : '#f5f0e6'}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>${aidPts.map((p, i) => `<g><circle cx="${p.x}" cy="${p.y}" r="${i === 0 || i === aidPts.length - 1 ? 7 : 5}" fill="${i === 0 ? '#9fbf73' : i === aidPts.length - 1 ? '#d69a2d' : '#f1c27e'}" stroke="${opts.dark ? '#fff' : '#090b0c'}" stroke-width="2"/><text x="${p.x + 8}" y="${p.y - 8}" fill="${opts.dark ? '#243c32' : '#fff'}" font-size="10" font-weight="800">${DATA.aidPoints[i].shortName}</text></g>`).join('')}</svg>`;
}

function bars(items) {
  return `<div class="surface-bars">${items.map(s => `<span title="${s.name} ${Math.round(s.pct)}%" style="width:${Math.max(.5, s.pct)}%;background:${s.color || surfaceColor(s.name)}"></span>`).join('')}</div>`;
}

function tags(items, max = 4) {
  return `<div class="surface-tags">${items.slice(0, max).map(s => `<span class="tag"><i class="dot" style="background:${s.color || surfaceColor(s.name)}"></i>${s.name} ${Math.round(s.pct)}%</span>`).join('')}</div>`;
}

function renderIntervals() {
  const strip = $('courseStrip');
  const list = $('intervalList');
  const sel = $('intervalSelect');
  strip.innerHTML = DATA.intervals.map((it, i) => `<button data-interval="${it.from}->${it.to}" style="flex:${it.distanceKm};background:${i < 5 ? '#243c32' : i < 8 ? '#637b49' : '#596d72'}"><small>${it.kmStart}-${it.kmEnd} km</small><b>${it.to}</b></button>`).join('');
  sel.innerHTML = '<option value="all">All intervals</option>' + DATA.intervals.map(it => `<option value="${it.from}->${it.to}">${it.from} -> ${it.to}</option>`).join('');
  list.innerHTML = DATA.intervals.map(it => `<article class="interval-card" data-interval="${it.from}->${it.to}"><div class="interval-title"><h3>${it.fromFull} -> ${it.toFull}</h3><span>${it.distanceKm} km</span></div>${bars(it.topSurfaces)}${tags(it.topSurfaces, 3)}<p class="interval-decision">${it.decision}</p><div class="mini-metrics"><div><small>Gain/loss</small><b>+${it.gain} / -${it.loss} m</b></div><div><small>Difficulty</small><b>${it.difficulty}</b></div><div><small>Wet/night</small><b>${it.wetRisk} / ${it.nightRisk}</b></div><div><small>Services</small><b>${it.supplies}${it.hasBag ? ' + bag' : ''}</b></div></div><div class="interval-ops"><p><b>Shoe:</b> ${it.gear?.shoe || 'Use modeled surface and weather risk.'}</p><p><b>Poles:</b> ${it.gear?.poles || 'Use if practiced.'}</p><p><b>Light:</b> ${it.gear?.light || 'Keep required lighting ready.'}</p></div><div class="km-evidence"><span class="pill">${it.confidence}</span><span class="pill">${it.gear?.phase || 'phase varies'}</span>${it.cutoff ? `<span class="pill warn">cutoff ${it.cutoff}</span>` : ''}${it.localGuidePct ? `<span class="pill good">local guide ${it.localGuidePct}%</span>` : ''}</div></article>`).join('');
  document.querySelectorAll('[data-interval]').forEach(btn => btn.addEventListener('click', () => {
    state.interval = btn.dataset.interval;
    $('intervalSelect').value = state.interval;
    renderKmList();
    markActive();
    document.querySelector('#kilometers').scrollIntoView({ behavior: 'smooth' });
  }));
}

function renderCritical() {
  const items = [
    ['km 1-11', 'Early night forest/root sections', 'Start discipline matters immediately; wet roots and night navigation can punish an over-fast opening.'],
    ['km 44-61', 'Bled -> Žirovnica transition', 'Runnable and hard-surface enough to affect legs; use it for eating, not ego.'],
    ['km 60-78', 'Završnica / Stol climb', 'The technical core: local guide evidence supports forest, cart track, rough slope, grass and high terrain.'],
    ['km 78-106', 'Stol / Sedlo Suha / Dovje descent', 'Long braking, fatigue, broad alpine context, and evidence caveats. Audit cluster km 92-96 is mostly map-inferred.'],
    ['km 106-124', 'Final runnable corridor', 'Looks simpler by label, but km 106 and the 117-122 footing-limited finish corridor deserve caution.']
  ];
  $('criticalGrid').innerHTML = items.map(([a, b, c]) => `<article class="critical-card"><span>${a}</span><b>${b}</b><p>${c}</p></article>`).join('');
}

function profileViz() {
  const el = $('profileViz');
  const w = el.clientWidth || 1100;
  const h = 420;
  const pad = { l: 38, r: 16, t: 24, b: 88 };
  const minEle = DATA.meta.minEle;
  const maxEle = DATA.meta.maxEle;
  const total = DATA.meta.distanceKm;
  const pts = DATA.route.map(p => ({ x: pad.l + p.km / total * (w - pad.l - pad.r), y: pad.t + (maxEle - p.ele) / (maxEle - minEle) * (h - pad.t - pad.b) }));
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const kmBars = DATA.km.map(k => `<rect x="${pad.l + k.start / total * (w - pad.l - pad.r)}" y="${h - pad.b + 18}" width="${Math.max(1, (k.end - k.start) / total * (w - pad.l - pad.r))}" height="22" fill="${surfaceColor(k.surface)}"><title>km ${k.km}: ${k.surface}</title></rect>`).join('');
  const weak = DATA.weakKm.map(k => { const x = pad.l + k / total * (w - pad.l - pad.r); return `<line x1="${x}" x2="${x}" y1="${pad.t}" y2="${h - pad.b + 52}" stroke="#d69a2d" stroke-width="1" stroke-dasharray="4 5" opacity=".85"/>`; }).join('');
  const aid = DATA.aidPoints.map(a => { const x = pad.l + (a.distance / 1000) / total * (w - pad.l - pad.r); return `<g><line x1="${x}" x2="${x}" y1="${pad.t}" y2="${h - pad.b + 48}" stroke="rgba(255,255,255,.2)"/><text x="${x + 4}" y="${h - 24}" fill="rgba(255,255,255,.68)" font-size="10" transform="rotate(-35 ${x + 4} ${h - 24})">${a.shortName}</text></g>`; }).join('');
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><rect width="${w}" height="${h}" fill="#111818"/>${weak}${aid}<path d="${d} L ${pts[pts.length - 1].x} ${h - pad.b} L ${pad.l} ${h - pad.b} Z" fill="rgba(159,181,186,.13)"/><path d="${d}" fill="none" stroke="#9fb5ba" stroke-width="3"/><text x="${pad.l}" y="18" fill="rgba(255,255,255,.6)" font-size="12">${minEle}-${maxEle} m elevation</text>${kmBars}<text x="${pad.l}" y="${h - pad.b + 58}" fill="rgba(255,255,255,.6)" font-size="12">dominant surface by kilometer; amber dashed = audit watchlist</text></svg>`;
  $('surfaceLegend').innerHTML = DATA.surfaces.map(s => `<span><i class="dot" style="background:${s.color}"></i>${s.name} ${s.km} km</span>`).join('');
}

function fillFilters() {
  const surfaces = [...new Set(DATA.km.map(k => k.surface))].sort();
  $('surfaceSelect').innerHTML = '<option value="all">All surfaces</option>' + surfaces.map(s => `<option>${s}</option>`).join('');
}

function filteredKm() {
  const q = state.query.toLowerCase().trim();
  return DATA.km.filter(k => {
    if (state.interval !== 'all' && k.interval !== state.interval) return false;
    if (state.surface !== 'all' && k.surface !== state.surface) return false;
    if (state.filter === 'hard' && k.hard < 45) return false;
    if (state.filter === 'technical' && !/(rocky|limestone|alpine|rooty|coarse|muddy)/i.test(k.surface)) return false;
    if (state.filter === 'wet' && !/(rooty|muddy|limestone|alpine|grassy|rocky|leaf)/i.test(k.surface)) return false;
    if (state.filter === 'weak' && !DATA.weakKm.includes(k.km)) return false;
    if (!q) return true;
    const auditTerms = DATA.weakKm.includes(k.km) ? ' audit watch weak caveat' : '';
    const hay = `km ${k.km} ${k.interval} ${k.surface} ${k.confidence} ${k.shoe} ${k.sourceIds.join(' ')} ${k.visualIds.join(' ')} ${auditTerms}`.toLowerCase();
    return hay.includes(q);
  });
}

function renderKmList() {
  const rows = filteredKm();
  $('kmList').innerHTML = rows.map(k => `<article class="km-card ${k.km === state.activeKm ? 'active' : ''}" data-km="${k.km}"><div><div class="km-top"><b>km ${k.km}</b><small>${k.interval}</small></div><h3>${k.surface}</h3>${bars(k.mix)}</div><div><div class="mini-metrics"><div><small>+ / -</small><b>${Math.round(k.ascent)} / ${Math.round(k.descent)} m</b></div><div><small>Grade</small><b>${k.grade}</b></div><div><small>Hard</small><b>${Math.round(k.hard)}%</b></div><div><small>Trail</small><b>${Math.round(k.trail)}%</b></div></div><div class="km-evidence"><span class="pill ${DATA.weakKm.includes(k.km) ? 'warn' : 'good'}">${DATA.weakKm.includes(k.km) ? 'audit watch' : 'modeled'}</span><span class="pill">${k.confidence}</span>${k.visualIds.length ? '<span class="pill">visual context</span>' : ''}</div></div></article>`).join('');
  document.querySelectorAll('.km-card').forEach(card => card.addEventListener('click', () => { state.activeKm = Number(card.dataset.km); renderKmList(); renderDetail(); }));
  if (rows.length && !rows.find(r => r.km === state.activeKm)) { state.activeKm = rows[0].km; renderDetail(); }
}

function sourceLinks(ids) {
  return ids.map(id => { const s = DATA.sources.find(x => x.source_id === id); return s ? `<a href="${s.url}" target="_blank" rel="noreferrer">${id}</a>` : id; }).join(' ');
}


function visualLinks(ids) {
  return ids.map(id => {
    const v = DATA.visuals.find(x => x.visual_id === id);
    if (!v) return id;
    return `<a href="${v.url}" target="_blank" rel="noreferrer">${id}</a> <span class="visual-note">(${v.confidence}; ${v.caveats || 'context only'})</span>`;
  }).join(' ');
}

function renderDetail() {
  const k = DATA.km.find(x => x.km === state.activeKm) || DATA.km[0];
  const segs = DATA.micro.filter(s => s.end > k.start && s.start < k.end);
  $('detailPane').innerHTML = `<h3>km ${k.km}: ${k.surface}</h3><p>${k.shoe}</p>${bars(k.mix)}${tags(k.mix, 6)}<div class="mini-metrics"><div><small>Interval</small><b>${k.interval}</b></div><div><small>Ascent</small><b>${Math.round(k.ascent)} m</b></div><div><small>Descent</small><b>${Math.round(k.descent)} m</b></div><div><small>Evidence</small><b>${k.confidence}</b></div></div><p><b>Official route:</b> ${sourceLinks(k.officialIds || k.sourceIds)}<br><b>Surface model:</b> ${sourceLinks(k.mapIds || ['S003'])}<br><b>Evidence score:</b> ${Math.round(k.evidenceWeaknessScore || 0)} (${Math.round(k.unknownOrInferred || 0)}% inferred/unknown) ${k.visualIds.length ? `<br><b>Visual context:</b> ${visualLinks(k.visualIds)}` : ''}</p><div class="micro-list">${segs.map(s => `<div class="micro-row" style="border-left-color:${s.color}"><b>${s.id} • ${s.start.toFixed(3)}-${s.end.toFixed(3)} km • ${s.taxonomy}</b><small>${s.evidence} • map ${sourceLinks(s.mapIds || ['S003'])} • ${s.highway || 'path?'} ${s.surfaceTag ? '/ ' + s.surfaceTag : ''} • wet ${s.wet} • night ${s.night}</small><small>${s.shoe}</small></div>`).join('')}</div>`;
}

function markActive() { document.querySelectorAll('[data-interval]').forEach(n => n.classList.toggle('active', n.dataset.interval === state.interval)); }
function renderSources() { $('sourceTable').innerHTML = DATA.sources.map(s => `<div class="source-row"><b>${s.source_id}</b><div><b>${s.title}</b><p>${s.source_class} • ${s.evidence_quality}</p><p>${s.key_claims}</p><p class="source-caveat">Caveat: ${s.caveats || 'Use with source-class limits.'}</p></div><a href="${s.url}" target="_blank" rel="noreferrer">Open source</a></div>`).join(''); }
function renderGallery() { const imgs = DATA.visuals.filter(v => v.still_path).slice(0, 6); $('visualGallery').innerHTML = imgs.map(v => `<a class="visual-card" href="${v.url}" target="_blank" rel="noreferrer"><img src="assets/images/${v.still_path.split('/').pop()}" alt="${v.source_title}"><div><b>${v.visual_id}: ${v.source_title}</b><span>${v.confidence} • ${v.location_claim}<br>${v.caveats || 'Context only; not meter-level proof.'}</span></div></a>`).join(''); }
function bind() {
  $('kmSearch').addEventListener('input', e => { state.query = e.target.value; renderKmList(); });
  $('intervalSelect').addEventListener('change', e => { state.interval = e.target.value; renderKmList(); markActive(); });
  $('surfaceSelect').addEventListener('change', e => { state.surface = e.target.value; renderKmList(); });
  document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active')); btn.classList.add('active'); state.filter = btn.dataset.filter; renderKmList(); }));
  window.addEventListener('resize', () => { routeSvg('heroRoute'); routeSvg('routeMap', { dark: true }); profileViz(); });
}
function init() { heroBrief(); routeSvg('heroRoute'); routeSvg('routeMap', { dark: true }); renderIntervals(); renderCritical(); profileViz(); fillFilters(); renderKmList(); renderDetail(); renderSources(); renderGallery(); bind(); }
init();
