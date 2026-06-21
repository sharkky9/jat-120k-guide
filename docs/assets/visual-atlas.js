const atlas = window.JAT_VISUAL_ATLAS || { summary: {}, sources: [], visuals: [], coverage: [], failed_queries: [], errors: [] };
const course = window.JAT_DATA || { route: [], aidPoints: [] };
const state = { section: 0, q: '', sourceClass: 'all', evidence: 'all', match: 'inspectable', mode: 'exact', sort: 'confidence', currentness: 'all', access: 'all', focusVisual: '', kmBin: null, limit: 24, showAllSources: false, latestOnly: false };
let currentGalleryAssets = [];
let lightboxIndex = 0;
let lightboxOpener = null;
let searchRenderTimer = 0;
const TABLE_PREVIEW_LIMIT = 300;
let lazyTableCounter = 0;
const lazyTables = new Map();
const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat('en-US');
const latestHarvestBatches = Array.from(new Set(atlas.sources.map(s => s.harvest_batch).filter(Boolean))).sort();
const latestHarvestBatch = latestHarvestBatches[latestHarvestBatches.length - 1] || '';
const sourceById = new Map(atlas.sources.map(s => [s.source_id, s]));
const failedQueryById = new Map((atlas.failed_queries || []).map(q => [q.query_id, q]));
const blockerById = new Map((atlas.unresolved_blockers || []).map(b => [b.blocker_id, b]));
const visualsBySource = new Map();
const duplicatesBySha = new Map();
atlas.visuals.forEach(v => {
  if (!visualsBySource.has(v.source_id)) visualsBySource.set(v.source_id, []);
  visualsBySource.get(v.source_id).push(v);
  if (v.asset_sha256) {
    if (!duplicatesBySha.has(v.asset_sha256)) duplicatesBySha.set(v.asset_sha256, []);
    duplicatesBySha.get(v.asset_sha256).push(v);
  }
});
const sourceCountsById = new Map(Array.from(visualsBySource, ([sourceId, rows]) => [sourceId, {
  total: rows.length,
  display: rows.filter(v => v.is_display_asset === 'display').length,
  small: rows.filter(v => v.is_display_asset === 'small-thumbnail').length,
  thumbnail: rows.filter(v => v.is_display_asset === 'thumbnail-only').length,
  remote: rows.filter(v => v.is_display_asset === 'remote-only').length,
  nonEvidence: rows.filter(v => v.is_display_asset === 'non-evidence' || v.is_display_asset === 'duplicate').length
}]));

const scopeLabels = {
  all: 'All scopes',
  'section/same-route': 'Same route',
  'same-location anchor': 'Same place',
  'race-wide current-route': 'Current race-wide',
  'overlapping race route': 'Overlapping race route',
  'adjacent context': 'Nearby context',
  'local corridor context': 'Local corridor',
  'broad/older context': 'Broad/older context',
  'thumbnail-only context': 'Video/source only',
  'remote-only source context': 'Remote source only',
  'excluded/non-evidence': 'Excluded/non-evidence',
  uncategorized: 'Uncategorized'
};
const statusLabels = {
  all: 'All statuses',
  inspectable: 'Display + small thumbs',
  display: 'Full display assets',
  'small-thumbnail': 'Small thumbnails',
  'thumbnail-only': 'Video/source thumbnails',
  'remote-only': 'Remote only',
  'non-evidence': 'Non-evidence',
  duplicate: 'Duplicates'
};
const currentnessLabels = {
  all: 'All years',
  current: '2026 listing/promo',
  '2025': '2025 race/current media',
  '2024': '2024',
  older: '2023 and older',
  mixed: 'Mixed / multi-year',
  unknown: 'Unknown / ambiguous'
};
const evidenceOptions = ['all', 'section/same-route', 'same-location anchor', 'race-wide current-route', 'overlapping race route', 'adjacent context', 'local corridor context', 'broad/older context', 'thumbnail-only context', 'remote-only source context', 'excluded/non-evidence', 'uncategorized'];
const matchOptions = ['all', 'display', 'inspectable', 'small-thumbnail', 'thumbnail-only', 'remote-only', 'non-evidence', 'duplicate'];
const modeOptions = ['exact', 'context', 'remote', 'all'];
const sortOptions = ['course', 'confidence', 'source'];
const currentnessOptions = ['all', 'current', '2025', '2024', 'older', 'mixed', 'unknown'];
const accessLabels = { all: 'All access states', open: 'Open/harvestable', limited: 'Gated/link-only' };
const accessOptions = ['all', 'open', 'limited'];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function refIds(value) {
  return String(value || '').split(/[;,]/).map(x => x.trim()).filter(Boolean);
}
function auditRefChips(value, type) {
  const ids = refIds(value);
  if (!ids.length) return '<span class="ref-chip empty">none</span>';
  const map = type === 'blocker' ? blockerById : failedQueryById;
  const prefix = type === 'blocker' ? 'blocker' : 'failed-query';
  return ids.map(id => {
    const target = map.get(id);
    const label = esc(id);
    if (!target) return `<span class="ref-chip missing" title="Missing audit reference">${label}</span>`;
    const title = type === 'blocker' ? `${target.surface || ''}: ${target.status || ''}` : `${target.query || ''}`;
    return `<a class="ref-chip" href="#${prefix}-${esc(id)}" title="${esc(title)}">${label}</a>`;
  }).join('');
}
function imgSrc(v) {
  if (!v.asset_path) return '';
  return 'assets/visual-v3/' + v.asset_path.replace(/^assets\//, '');
}
function overlaps(v, section) {
  return Number(v.km_start) < Number(section.km_end) && Number(v.km_end) > Number(section.km_start);
}
function overlapKm(v, section) {
  return Math.max(0, Math.min(Number(v.km_end), Number(section.km_end)) - Math.max(Number(v.km_start), Number(section.km_start)));
}
function sectionMidpointCovered(v, section) {
  const mid = (Number(section.km_start) + Number(section.km_end)) / 2;
  return Number(v.km_start) <= mid && Number(v.km_end) >= mid;
}
function sourceFor(v) { return sourceById.get(v.source_id) || {}; }
function sourceOrigin(s) { return s.subagent_origin || 'unknown pass'; }
function sourceBatch(s) { return s.harvest_batch || ''; }
function sourceYear(s) { return String(s.year || '').trim(); }
function currentnessBucket(s) {
  const y = sourceYear(s).toLowerCase();
  const years = Array.from(new Set((y.match(/\b(?:19|20)\d{2}\b/g) || []).map(Number))).sort();
  if (!y || /unknown|various|current-ish/.test(y)) return 'unknown';
  if (years.length > 1 || /mixed|range|through|\bto\b|\d{4}\s*[-/]\s*\d{2,4}/.test(y)) return 'mixed';
  if (years.length === 1) {
    const year = years[0];
    if (year >= 2026) return 'current';
    if (year === 2025) return '2025';
    if (year === 2024) return '2024';
    return 'older';
  }
  if (/current/.test(y)) return 'current';
  if (/older|legacy/.test(y)) return 'older';
  return 'unknown';
}
function currentnessMatchesSource(s) {
  if (state.currentness === 'all') return true;
  return currentnessBucket(s) === state.currentness;
}
function accessMatchesSource(s) {
  if (state.access === 'all') return true;
  const limited = limitedSource(s);
  if (state.access === 'limited') return limited;
  if (state.access === 'open') return !limited;
  return true;
}
function latestPassSource(s) { return Boolean(sourceBatch(s)) && (!latestHarvestBatch || sourceBatch(s) === latestHarvestBatch); }
function classLabelFromVisual(v) { return v.visual_evidence_class || v.display_class || 'unknown'; }
function visualEvidenceClass(v) { return v.visual_evidence_class || v.display_class || 'unknown'; }
function visualScope(v) { return v.visual_evidence_scope || v.evidence_scope || 'unknown'; }
function statusAllowed(v) { return ['display','small-thumbnail','thumbnail-only','remote-only','non-evidence','duplicate'].includes(v.is_display_asset); }
function statusMatches(v) {
  if (state.match === 'all') return statusAllowed(v);
  if (state.match === 'inspectable') return ['display','small-thumbnail'].includes(v.is_display_asset);
  return v.is_display_asset === state.match;
}
function sourceOverlaps(s, section) {
  return Number(s.km_start) < Number(section.km_end) && Number(s.km_end) > Number(section.km_start);
}
function spanKm(row) { return Number(row.km_end) - Number(row.km_start); }
function formatKmLabelValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return Math.abs(n - Math.round(n)) < 0.01 ? String(Math.round(n)) : n.toFixed(1);
}
function isGlobalVideoRecord(v) {
  return v.is_display_asset === 'thumbnail-only' && String(v.source_id).startsWith('YV') && spanKm(v) >= 20;
}
function isGlobalVideoSource(s) {
  return String(s.source_id).startsWith('YV') && spanKm(s) >= 20;
}
function showGlobalVideoContext() {
  return state.mode === 'all' || state.mode === 'remote' || state.match === 'all' || state.match === 'thumbnail-only' || state.match === 'remote-only';
}
function sectionVideoSourceCount(section) {
  return Number(section.remote_only_records || 0) + Number(section.thumbnail_context_records || 0);
}
function globalVideoSourceCount(section) {
  return Number(section.global_thumbnail_context_records || 0);
}
function inspectableAssetRecords(section) {
  if (section.inspectable_asset_records !== undefined) return Number(section.inspectable_asset_records || 0);
  return Number(section.display_asset_records || 0) + Number(section.small_thumbnail_asset_records || 0);
}
function inspectableSectionRecords(section) {
  if (section.inspectable_section_specific_records !== undefined) return Number(section.inspectable_section_specific_records || 0);
  return Number(section.display_section_specific_records || 0) + Number(section.small_thumbnail_section_specific_records || 0);
}
function sourceVisualCounts(sourceId) {
  return sourceCountsById.get(sourceId) || { total: 0, display: 0, small: 0, thumbnail: 0, remote: 0, nonEvidence: 0 };
}
function sourceHasVisual(sourceId) { return (visualsBySource.get(sourceId) || []).length > 0; }
function sourceHasInspectable(sourceId) {
  const c = sourceVisualCounts(sourceId);
  return c.display + c.small > 0;
}
function sourceRowsInSection(sourceId, section) {
  return (visualsBySource.get(sourceId) || []).filter(v => overlaps(v, section));
}
function sourceVisualCountsInSection(sourceId, section) {
  const rows = sourceRowsInSection(sourceId, section);
  return {
    total: rows.length,
    display: rows.filter(v => v.is_display_asset === 'display').length,
    small: rows.filter(v => v.is_display_asset === 'small-thumbnail').length,
    thumbnail: rows.filter(v => v.is_display_asset === 'thumbnail-only').length,
    remote: rows.filter(v => v.is_display_asset === 'remote-only').length,
    nonEvidence: rows.filter(v => v.is_display_asset === 'non-evidence' || v.is_display_asset === 'duplicate').length
  };
}
function sourceSectionScore(sourceId, section) {
  const rows = sourceRowsInSection(sourceId, section);
  if (!rows.length) return 0;
  const display = rows.filter(v => v.is_display_asset === 'display').length;
  const small = rows.filter(v => v.is_display_asset === 'small-thumbnail').length;
  const thumbnail = rows.filter(v => v.is_display_asset === 'thumbnail-only').length;
  const remote = rows.filter(v => v.is_display_asset === 'remote-only').length;
  const exact = rows.filter(isSectionSpecificAsset).length;
  const context = rows.filter(v => !isSectionSpecificAsset(v) && isContextRecord(v)).length;
  return rows.length + display * 80 + small * 55 + exact * 35 + context * 12 + thumbnail * 5 + remote * 3;
}
function bestSectionIndexForSource(sourceId, preferredIndex = state.section) {
  const src = sourceById.get(sourceId);
  if (preferredIndex >= 0 && preferredIndex < atlas.coverage.length) {
    const preferred = atlas.coverage[preferredIndex];
    if (sourceSectionScore(sourceId, preferred) > 0 || (src && sourceOverlaps(src, preferred))) return preferredIndex;
  }
  let bestIndex = preferredIndex;
  let bestScore = -1;
  atlas.coverage.forEach((section, i) => {
    const score = sourceSectionScore(sourceId, section);
    if (score > bestScore) { bestScore = score; bestIndex = i; }
  });
  if (bestScore > 0) return bestIndex;
  if (src) {
    let bestOverlap = 0;
    atlas.coverage.forEach((section, i) => {
      const km = overlapKm(src, section);
      if (km > bestOverlap) { bestOverlap = km; bestIndex = i; }
    });
    if (bestOverlap > 0) return bestIndex;
  }
  return preferredIndex;
}
function selectBestSectionForSourceId(sourceId, focusTarget = 'panel') {
  const next = bestSectionIndexForSource(sourceId);
  if (Number.isFinite(next) && next >= 0 && next < atlas.coverage.length) state.section = next;
  clearKmBin();
  pendingFocusTarget = focusTarget;
  return state.section;
}
function sourceHasInspectableInSection(sourceId, section) {
  const c = sourceVisualCountsInSection(sourceId, section);
  return c.display + c.small > 0;
}
function sourceOnlyGroup(src) {
  const counts = sourceVisualCounts(src.source_id);
  if (isGlobalVideoSource(src)) return 'global media lead';
  if (String(src.source_id).startsWith('YV')) return 'video frame-review lead';
  if (limitedSource(src)) return 'gated/link-only source';
  if (counts.remote > 0) return 'remote-only image row';
  if (counts.total > 0) return 'downloaded non-display / duplicate rows';
  return 'catalog-only source candidate';
}
function sourceOnlyMarkup(sources) {
  if (!sources.length) return '<p>Every matching overlapping source candidate has at least one local inspectable image row under the current filter set.</p>';
  const order = ['video frame-review lead', 'remote-only image row', 'gated/link-only source', 'downloaded non-display / duplicate rows', 'catalog-only source candidate', 'global media lead'];
  return order.map(group => {
    const rows = sources.filter(src => sourceOnlyGroup(src) === group);
    if (!rows.length) return '';
    const cards = rows.slice(0, 6).map(src => {
      const c = sourceVisualCounts(src.source_id);
      return `<div class="confidence-row"><b>${esc(src.source_id)} / ${esc(group)}</b><span>${esc(src.title)}<br>${esc(sourceYear(src) || 'year unknown')} / ${esc(sourceBatch(src) || sourceOrigin(src))} / ${esc(src.access_status)} / rows ${c.total}, display ${c.display}, small ${c.small}, thumb ${c.thumbnail}, remote ${c.remote} / <a href="${esc(src.url)}" target="_blank" rel="noreferrer">open</a></span></div>`;
    }).join('');
    const more = rows.length > 6 ? `<p>${rows.length - 6} more ${esc(group)} rows are in the source inventory.</p>` : '';
    return `<div class="source-only-group"><h4>${esc(group)} (${rows.length})</h4>${cards}${more}</div>`;
  }).join('');
}
function limitedSource(s) {
  return /gated|login|blocked|challenge|js shell|app shell|shell|link only|view\/link|view-only|pay|limited|timeout-limited|http 403|http 429|browser-only|rate-limited|captcha|bot|unsupported/i.test(s.access_status || "");
}
function isSameRouteAsset(v) {
  return visualScope(v) === 'section/same-route';
}
function isSamePlaceAnchor(v) {
  return visualScope(v) === 'same-location anchor';
}
function isSectionSpecificAsset(v) {
  return isSameRouteAsset(v) || isSamePlaceAnchor(v);
}
function isContextRecord(v) {
  return ['race-wide current-route', 'overlapping race route', 'adjacent context', 'local corridor context', 'broad/older context', 'uncategorized'].includes(visualScope(v));
}
function modeMatches(v) {
  if (state.mode === 'all') return true;
  if (state.mode === 'exact') return isSectionSpecificAsset(v);
  if (state.mode === 'context') return !isSectionSpecificAsset(v) && isContextRecord(v);
  if (state.mode === 'remote') return ['remote-only', 'thumbnail-only'].includes(v.is_display_asset) || ['remote-only source context', 'thumbnail-only context'].includes(visualScope(v));
  return true;
}
function evidenceAllowedForMode(value, mode = state.mode) {
  if (value === 'all') return true;
  if (mode === 'all') return true;
  if (mode === 'exact') return ['section/same-route', 'same-location anchor'].includes(value);
  if (mode === 'context') return ['race-wide current-route', 'overlapping race route', 'adjacent context', 'local corridor context', 'broad/older context', 'uncategorized'].includes(value);
  if (mode === 'remote') return ['thumbnail-only context', 'remote-only source context'].includes(value);
  return true;
}
function matchAllowedForMode(value, mode = state.mode) {
  if (mode === 'remote') return ['all', 'thumbnail-only', 'remote-only'].includes(value);
  if (mode === 'exact') return ['all', 'display', 'inspectable', 'small-thumbnail'].includes(value);
  if (mode === 'context') return ['all', 'display', 'inspectable', 'small-thumbnail', 'thumbnail-only', 'remote-only'].includes(value);
  return matchOptions.includes(value);
}
function scopeRank(v) {
  return {
    'section/same-route': 6,
    'same-location anchor': 5,
    'race-wide current-route': 4,
    'overlapping race route': 3,
    'adjacent context': 2,
    'local corridor context': 2,
    'broad/older context': 1,
    'thumbnail-only context': 0,
    'remote-only source context': 0,
    'excluded/non-evidence': -2,
    uncategorized: 0
  }[visualScope(v)] ?? 0;
}
function confidenceRank(v, section = null) {
  const m = String(v.route_match_confidence || '').toLowerCase();
  const span = Number(v.km_end) - Number(v.km_start);
  let score = 0;
  if (m.includes('specific-section')) score += 120;
  if (m.includes('same-route')) score += 110;
  if (m.includes('same-location-high')) score += 95;
  if (m.includes('direct-current')) score += 82;
  if (m.includes('overlap-route-high')) score += 70;
  if (String(v.source_id).startsWith('LR')) score += 35;
  if (String(v.source_id).startsWith('CM')) score += 30;
  if (String(v.source_id).startsWith('PX') || String(v.source_id).startsWith('SL')) score += 22;
  if (visualScope(v) === 'local corridor context') score += 12;
  score += scopeRank(v) * 24;
  if (v.is_display_asset === 'display') score += 18;
  if (v.is_display_asset === 'small-thumbnail') score -= 8;
  if (v.is_display_asset === 'thumbnail-only') score -= 90;
  if (v.is_display_asset === 'remote-only') score -= 80;
  if (v.is_display_asset === 'non-evidence') score -= 200;
  if (v.is_display_asset === 'duplicate') score -= 160;
  if (span > 80) score -= 35;
  if (section) {
    const sectionSpan = Number(section.km_end) - Number(section.km_start);
    const overlap = overlapKm(v, section);
    const overlapShare = sectionSpan > 0 ? overlap / sectionSpan : 0;
    score += Math.min(50, overlapShare * 80);
    if (sectionMidpointCovered(v, section)) score += 24;
    if (overlapShare < 0.08 && span > overlap * 8) score -= 90;
    else if (overlapShare < 0.2 && span > overlap * 4) score -= 55;
  }
  if (!imgSrc(v)) score -= 90;
  return score;
}
function visualText(v) {
  const s = sourceFor(v);
  return `${v.visual_id} ${v.source_id} ${v.source_title} ${v.route_section} ${v.location_claim} ${v.surface_observations} ${v.evidence_role} ${v.evidence_class} ${v.media_type} ${v.visual_evidence_class} ${v.evidence_scope} ${v.visual_evidence_scope} ${v.route_match_confidence} ${v.visual_confidence} ${v.capture_date} ${v.caveats} ${v.license_or_access} ${v.source_url} ${v.remote_url} ${v.image_width}x${v.image_height} ${s.title} ${s.year} ${s.notes} ${sourceOrigin(s)} ${sourceBatch(s)} ${s.source_class} ${s.access_status}`.toLowerCase();
}
function sourceText(s) {
  return `${s.source_id} ${s.title} ${s.url} ${s.source_class} ${s.year} ${s.route_section} ${s.km_start}-${s.km_end} ${s.route_match_confidence} ${s.evidence_class} ${s.access_status} ${s.expected_visual_count} ${sourceOrigin(s)} ${sourceBatch(s)} ${s.notes}`.toLowerCase();
}
function sourceMatchesActiveFilters(s) {
  return (!state.latestOnly || latestPassSource(s)) && currentnessMatchesSource(s) && accessMatchesSource(s) && (!state.q || sourceText(s).includes(state.q.toLowerCase()));
}
function visualAlt(v) {
  return `${v.visual_id} ${v.route_section}, ${scopeLabels[visualScope(v)] || visualScope(v)}: ${v.location_claim || v.source_title}`;
}
function baseFilteredVisuals(section, opts = {}) {
  const applyStatus = opts.applyStatus !== false;
  const applyMode = opts.applyMode !== false;
  return atlas.visuals.filter(v => {
    if (!overlaps(v, section)) return false;
    const activeBin = kmBinSection();
    if (activeBin && !overlaps(v, activeBin)) return false;
    const src = sourceFor(v);
    if (state.latestOnly && !latestPassSource(src)) return false;
    if (!currentnessMatchesSource(src)) return false;
    if (!accessMatchesSource(src)) return false;
    const cls = classLabelFromVisual(v);
    if (!statusAllowed(v)) return false;
    if (state.sourceClass !== 'all' && cls !== state.sourceClass) return false;
    if (state.evidence !== 'all' && visualScope(v) !== state.evidence) return false;
    if (applyStatus && !statusMatches(v)) return false;
    if (applyMode && !modeMatches(v)) return false;
    if (state.q && !visualText(v).includes(state.q.toLowerCase())) return false;
    return true;
  });
}
function courseWideSortPenalty(v, section) {
  if (!section) return spanKm(v) >= 20 ? 1 : 0;
  const overlap = overlapKm(v, section);
  const sectionSpan = Number(section.km_end) - Number(section.km_start);
  const span = spanKm(v);
  if (span >= 20 && span > Math.max(sectionSpan * 3, overlap * 6)) return 1;
  return 0;
}
function clippedSectionStart(v, section) {
  return section ? Math.max(Number(v.km_start), Number(section.km_start)) : Number(v.km_start);
}
function sortVisuals(rows, section) {
  const sorted = [...rows];
  if (state.sort === 'confidence') {
    sorted.sort((a,b) => confidenceRank(b, section) - confidenceRank(a, section) || courseWideSortPenalty(a, section) - courseWideSortPenalty(b, section) || clippedSectionStart(a, section) - clippedSectionStart(b, section));
  } else if (state.sort === 'source') {
    sorted.sort((a,b) => String(a.source_id).localeCompare(String(b.source_id)) || courseWideSortPenalty(a, section) - courseWideSortPenalty(b, section) || clippedSectionStart(a, section) - clippedSectionStart(b, section));
  } else {
    sorted.sort((a,b) => courseWideSortPenalty(a, section) - courseWideSortPenalty(b, section) || clippedSectionStart(a, section) - clippedSectionStart(b, section) || spanKm(a) - spanKm(b) || confidenceRank(b, section) - confidenceRank(a, section));
  }
  return sorted;
}
function filteredVisuals(section) { return sortVisuals(baseFilteredVisuals(section), section); }
function filteredRoutePlaceCount(section) {
  return baseFilteredVisuals(section).filter(v => isSectionSpecificAsset(v) && ['display', 'small-thumbnail'].includes(v.is_display_asset)).length;
}
function duplicateGroup(v) {
  if (!v.asset_sha256) return [];
  return duplicatesBySha.get(v.asset_sha256) || [];
}
function duplicatePill(v) {
  const group = duplicateGroup(v);
  return group.length > 1 ? `<span class="pill dupe">+${group.length - 1} duplicate${group.length > 2 ? 's' : ''}</span>` : '';
}
function duplicateDetail(v) {
  const group = duplicateGroup(v).filter(row => row.visual_id !== v.visual_id).slice(0, 8);
  if (!group.length) return '';
  return `<p><b>Duplicate rows sharing this asset:</b> ${group.map(row => `${esc(row.visual_id)}/${esc(row.source_id)}`).join(', ')}${duplicateGroup(v).length > 9 ? ', ...' : ''}</p>`;
}
function galleryAssetVisible(v) {
  if (!imgSrc(v)) return false;
  if (['display', 'small-thumbnail'].includes(v.is_display_asset)) return true;
  if (downgradedGalleryVisible(v)) return true;
  if (v.is_display_asset === 'thumbnail-only') return state.mode === 'remote' || state.mode === 'all' || state.match === 'thumbnail-only' || state.match === 'all';
  return false;
}
function downgradedGalleryVisible(v) {
  return ['duplicate', 'non-evidence'].includes(v.is_display_asset) && (state.mode === 'all' || state.match === 'all' || state.match === v.is_display_asset);
}
function downgradedEvidenceWarning(v) {
  if (v.is_display_asset === 'duplicate') return '<div class="evidence-banner duplicate">Duplicate asset: retained for source accounting; inspect source before using independently.</div>';
  if (v.is_display_asset === 'non-evidence') return '<div class="evidence-banner excluded">Excluded/non-evidence: cataloged for audit only.</div>';
  return '';
}
function project(points, w, h, pad = 30) {
  const minLat = Math.min(...points.map(p => p.lat));
  const maxLat = Math.max(...points.map(p => p.lat));
  const minLon = Math.min(...points.map(p => p.lon));
  const maxLon = Math.max(...points.map(p => p.lon));
  const sx = (w - pad * 2) / (maxLon - minLon);
  const sy = (h - pad * 2) / (maxLat - minLat);
  const s = Math.min(sx, sy);
  const ox = (w - (maxLon - minLon) * s) / 2;
  const oy = (h - (maxLat - minLat) * s) / 2;
  return points.map(p => ({...p, x: ox + (p.lon - minLon) * s, y: h - (oy + (p.lat - minLat) * s)}));
}
function pathFor(points) {
  return points.map((p,i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}
function strictCountsForSection(section, rows = atlas.visuals) {
  const strict = rows.filter(v => overlaps(v, section) && isSectionSpecificAsset(v));
  const inspectableStrict = strict.filter(v => ['display', 'small-thumbnail'].includes(v.is_display_asset));
  const full = strict.filter(v => v.is_display_asset === 'display').length;
  const small = strict.filter(v => v.is_display_asset === 'small-thumbnail').length;
  const thumbnail = strict.filter(v => v.is_display_asset === 'thumbnail-only').length;
  const remote = strict.filter(v => v.is_display_asset === 'remote-only').length;
  const sameRoute = inspectableStrict.filter(isSameRouteAsset).length;
  const samePlace = inspectableStrict.filter(isSamePlaceAnchor).length;
  return { full, small, thumbnail, remote, sameRoute, samePlace, total: full + small };
}
function coverageStats(section) {
  const span = Math.max(0.1, Number(section.km_end) - Number(section.km_start));
  const strict = strictCountsForSection(section);
  const exact = strict.total;
  const sameRoute = strict.sameRoute;
  const samePlace = strict.samePlace;
  const context = Number(section.context_records || 0) + Number(section.broad_or_older_records || 0) + Number(section.uncategorized_records || 0);
  const remote = sectionVideoSourceCount(section);
  const globalRemote = globalVideoSourceCount(section);
  const gated = Number(section.gated_or_link_only_sources || 0);
  const sourceOnly = Number(section.source_only_candidates || 0);
  const noLocalInspectable = Number(section.no_local_inspectable_sources || 0);
  const exactDensity = exact / span;
  const fullDensity = strict.full / span;
  const sameRouteDensity = sameRoute / span;
  const strictFullShare = exact ? strict.full / exact : 0;
  const burden = (context + remote + gated * 8 + sourceOnly * 10) / Math.max(1, exact);
  return { span, exact, exactFull: strict.full, exactSmall: strict.small, exactThumbnail: strict.thumbnail, exactRemote: strict.remote, sameRoute, samePlace, context, remote, globalRemote, gated, sourceOnly, noLocalInspectable, exactDensity, fullDensity, sameRouteDensity, strictFullShare, burden };
}
function qualityLabel(section) {
  const q = coverageStats(section);
  if (q.sameRoute === 0 && q.samePlace > 0) return 'same-place only candidates';
  if (q.sameRouteDensity < 1 && q.samePlace > q.sameRoute * 2) return 'same-place-heavy candidates';
  if (q.exactDensity >= 2 && q.strictFullShare < 0.35) return 'thumbnail-heavy audit candidates';
  if (q.exactDensity >= 10 && q.burden <= 5) return 'dense route/place candidates';
  if (q.exactDensity >= 5 && q.burden <= 12) return 'mixed audit candidates';
  if (q.exactDensity >= 2 && q.burden <= 18) return 'thin audit candidates';
  return 'audit-priority gap';
}
function qualityColor(section) {
  const label = qualityLabel(section);
  if (label === 'dense route/place candidates') return '#2f8b67';
  if (label === 'mixed audit candidates') return '#d79a2b';
  if (label === 'same-place only candidates') return '#607f95';
  if (label === 'same-place-heavy candidates') return '#7f6b46';
  if (label === 'thumbnail-heavy audit candidates') return '#9a6b23';
  if (label === 'thin audit candidates') return '#b95d3c';
  return '#5f2b2b';
}
function weakScore(section) {
  const q = coverageStats(section);
  return q.exactDensity * 10 - q.burden - q.gated * 2;
}
function resetLimit() { state.limit = 24; }
function clearKmBin() { state.kmBin = null; }
function kmBinActive() { return state.kmBin && Number.isFinite(state.kmBin.start) && Number.isFinite(state.kmBin.end) && state.kmBin.end > state.kmBin.start; }
function kmBinSection() { return kmBinActive() ? { km_start: state.kmBin.start, km_end: state.kmBin.end } : null; }
function formatKmRange(start, end) { return `${formatKmLabelValue(start)}-${formatKmLabelValue(end)} km`; }
let pendingFocusTarget = "";
let pendingGalleryFocus = "";
function sectionLabel(i) {
  const s = atlas.coverage[i];
  return s ? `${s.km_start}-${s.km_end} km / ${s.section}` : "";
}
function selectSection(index, focusTarget = "panel") {
  const next = Math.max(0, Math.min(atlas.coverage.length - 1, Math.trunc(Number(index))));
  if (!Number.isFinite(next) || next === state.section) return;
  state.section = next;
  clearKmBin();
  resetLimit();
  pendingFocusTarget = focusTarget;
  renderAll();
}
function moveSection(delta, focusTarget = "panel") {
  selectSection(state.section + delta, focusTarget);
}
function restorePendingFocus() {
  if (!pendingFocusTarget) return;
  const target = pendingFocusTarget;
  pendingFocusTarget = "";
  let node = $("sectionPanel");
  if (target === "strip") node = document.querySelector(".section-button.active");
  if (target === "gallery") {
    node = $("galleryTitle") || document.querySelector(".visual-card");
    if (node) node.setAttribute("tabindex", "-1");
  }
  if (node && typeof node.focus === "function") node.focus({preventScroll: true});
}
function sectionKeyTraversalAllowed(e) {
  if (e.altKey) return true;
  const active = document.activeElement;
  if (!active) return false;
  if (active.closest("input,select,textarea,a,button,summary,.table-scroll,.controls,.visual-grid,.source-list")) return false;
  return Boolean(active.closest("#routeMap,#sectionStrip,#sectionPanel"));
}
function coverageMeter(s) {
  const q = coverageStats(s);
  const exact = q.exact;
  const context = q.context;
  const remote = q.remote;
  const limited = q.gated;
  const sourceOnly = q.sourceOnly;
  const total = Math.max(1, q.exactFull + q.exactSmall + context + remote + limited + sourceOnly);
  const parts = [
    ['exact', q.exactFull, 'full route/place image'],
    ['small', q.exactSmall, 'small route/place thumbnail'],
    ['context', context, 'context'],
    ['remote', remote, 'video/source'],
    ['limited', limited, 'limited source'],
    ['source-only', sourceOnly, 'source-only candidate']
  ];
  const bars = parts.map(([cls, value, label]) => `<span class="coverage-part ${cls}" style="width:${Math.max(value ? 5 : 0, (value / total) * 100).toFixed(2)}%" title="${esc(value)} ${esc(label)}"></span>`).join('');
  const legend = parts.map(([cls, value, label]) => `<span><i class="coverage-dot ${cls}"></i><b>${fmt.format(value)}</b> ${esc(label)}</span>`).join('');
  const globalNote = q.globalRemote ? ` / ${fmt.format(q.globalRemote)} global video thumbnails kept separate` : '';
  const sourceOnlyNote = q.sourceOnly || q.noLocalInspectable ? ` / ${fmt.format(q.sourceOnly)} source-only, ${fmt.format(q.noLocalInspectable)} without local inspectable rows` : '';
  return `<div class="coverage-meter" aria-label="Section evidence mix"><div class="coverage-quality"><b style="color:${qualityColor(s)}">${esc(qualityLabel(s))}</b><span>${q.exactDensity.toFixed(1)} inspectable route/place leads/km (${fmt.format(q.exactFull)} full + ${fmt.format(q.exactSmall)} small route thumbnails; ${fmt.format(q.sameRoute)} same-route + ${fmt.format(q.samePlace)} same-place) / ${q.burden.toFixed(1)} section context-video-source burden${esc(globalNote)}${esc(sourceOnlyNote)}</span></div><div class="coverage-track">${bars}</div><div class="coverage-legend">${legend}</div></div>`;
}
function kmRailBins(section) {
  const start = Number(section.km_start);
  const end = Number(section.km_end);
  const first = Math.floor(start);
  const last = Math.ceil(end);
  const bins = [];
  for (let km = first; km < last; km += 1) {
    const bin = { km_start: Math.max(start, km), km_end: Math.min(end, km + 1) };
    if (bin.km_end <= bin.km_start) continue;
    const allRows = atlas.visuals.filter(v => overlaps(v, bin));
    const inspectable = allRows.filter(v => ['display', 'small-thumbnail'].includes(v.is_display_asset));
    const sameRoute = inspectable.filter(isSameRouteAsset);
    const samePlace = inspectable.filter(isSamePlaceAnchor);
    const bounded = (v) => spanKm(v) < 20 && !isGlobalVideoRecord(v);
    const context = inspectable.filter(v => !isSectionSpecificAsset(v) && isContextRecord(v) && bounded(v));
    const video = allRows.filter(v => ['thumbnail-only', 'remote-only'].includes(v.is_display_asset) && bounded(v));
    const evidenceRows = sameRoute.concat(samePlace, context, video);
    const candidates = evidenceRows.filter(v => imgSrc(v));
    const priority = (v) => {
      if (isSameRouteAsset(v) && v.is_display_asset === 'display') return 600;
      if (isSameRouteAsset(v)) return 540;
      if (isSamePlaceAnchor(v) && v.is_display_asset === 'display') return 500;
      if (isSamePlaceAnchor(v)) return 440;
      if (isContextRecord(v) && v.is_display_asset === 'display') return 280;
      if (isContextRecord(v)) return 230;
      if (v.is_display_asset === 'thumbnail-only') return 80;
      if (v.is_display_asset === 'remote-only') return 50;
      return 0;
    };
    const best = candidates.sort((a,b) => priority(b) - priority(a) || confidenceRank(b, bin) - confidenceRank(a, bin) || spanKm(a) - spanKm(b))[0];
    const sourceCount = new Set(evidenceRows.map(v => v.source_id)).size;
    const tier = sameRoute.length ? 'same-route' : samePlace.length ? 'same-place' : context.length ? 'context' : video.length ? 'video-source' : 'empty';
    bins.push({ ...bin, rows: evidenceRows, allRows, sameRoute, samePlace, context, video, sourceCount, best, tier });
  }
  return bins;
}
function kmVisualRail(section) {
  const bins = kmRailBins(section);
  const tiles = bins.map(bin => {
    const label = `${formatKmLabelValue(bin.km_start)}-${formatKmLabelValue(bin.km_end)} km`;
    const title = `${label}: ${bin.sameRoute.length} same-route, ${bin.samePlace.length} same-place, ${bin.context.length} context, ${bin.video.length} video/source rows from ${bin.sourceCount} sources`;
    const image = bin.best ? `<span class="km-thumb"><img loading="lazy" src="${esc(imgSrc(bin.best))}" alt="${esc(visualAlt(bin.best))}"></span>` : '<span class="km-thumb empty-thumb">No local image</span>';
    const ids = bin.best ? `<small>${esc(bin.best.visual_id)} / ${esc(bin.best.source_id)}</small>` : '<small>no local asset</small>';
    const attrs = bin.rows.length ? `data-km-bin-start="${esc(bin.km_start)}" data-km-bin-end="${esc(bin.km_end)}"` : 'disabled';
    return `<button type="button" class="km-bin ${esc(bin.tier)}" ${attrs} aria-label="${esc(title)}. Open all records in this kilometer bin." title="${esc(title)} / open all records in this bin">${image}<span class="km-label">${esc(label)}</span><span class="km-bin-stats"><b>${fmt.format(bin.sameRoute.length)}</b> same-route<br><b>${fmt.format(bin.samePlace.length)}</b> same-place<br><b>${fmt.format(bin.context.length)}</b> context / <b>${fmt.format(bin.video.length)}</b> video</span>${ids}</button>`;
  }).join('');
  return `<div class="km-rail-block"><div class="km-rail-head"><div><p class="eyebrow">Km visual rail</p><h3>Traverse by kilometer.</h3></div><span>1 km bins; fixed evidence coverage, not current filters.</span></div><div class="km-rail" aria-label="Fixed kilometer visual evidence bins">${tiles}</div></div>`;
}
function renderRoute() {
  const el = $('routeMap');
  const w = el.clientWidth || 900;
  const h = el.clientHeight || 460;
  const pts = project(course.route, w, h, 28);
  const basePath = pathFor(pts);
  const sectionPaths = atlas.coverage.map((sec, i) => {
    const segPts = pts.filter(p => Number(p.km) >= Number(sec.km_start) && Number(p.km) <= Number(sec.km_end));
    if (segPts.length < 2) return '';
    const active = i === state.section;
    const filteredCount = filteredRoutePlaceCount(sec);
    const fixedCount = coverageStats(sec).exact;
    const color = qualityColor(sec);
    const q = coverageStats(sec);
    const label = `${sec.section}: ${qualityLabel(sec)}, ${q.exactDensity.toFixed(1)} inspectable route/place leads per km, ${filteredCount} current filtered route/place inspectable records`;
    return `<path class="route-section ${active ? 'active' : ''}" data-map-section="${i}" tabindex="0" role="button" aria-label="${esc(label)}" d="${pathFor(segPts)}" fill="none" stroke="${color}" stroke-width="${active ? 11 : 7}" stroke-linecap="round" stroke-linejoin="round" opacity="${active ? 1 : .72}"><title>${esc(label)} / ${fixedCount} fixed route/place inspectable leads</title></path>`;
  }).join('');
  const midMarkers = atlas.coverage.map((sec, i) => {
    const mid = (Number(sec.km_start) + Number(sec.km_end)) / 2;
    const p = pts.reduce((best, pt) => Math.abs(pt.km - mid) < Math.abs(best.km - mid) ? pt : best, pts[0]);
    const fixed = coverageStats(sec).exact;
    const current = filteredRoutePlaceCount(sec);
    const filtered = current !== fixed;
    const label = `${sec.section}: ${current} current filtered route/place inspectable records, ${fixed} fixed route/place inspectable leads, ${qualityLabel(sec)}`;
    return `<g class="route-count ${filtered ? 'filtered' : ''}" data-map-section="${i}" tabindex="0" role="button" aria-label="${esc(label)}"><title>${esc(label)}</title><circle cx="${p.x}" cy="${p.y}" r="${i === state.section ? 13 : 10}" fill="${filtered ? '#fff7d7' : '#fff'}" stroke="${qualityColor(sec)}" stroke-width="3"/><text x="${p.x}" y="${p.y + 4}" text-anchor="middle" fill="#101515" font-size="10" font-weight="900">${current}</text></g>`;
  }).join('');
  const aidPts = course.aidPoints.map(a => pts.reduce((best, p) => Math.abs(p.km - a.distance / 1000) < Math.abs(best.km - a.distance / 1000) ? p : best, pts[0]));
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet"><path d="${basePath}" fill="none" stroke="rgba(21,24,23,.14)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>${sectionPaths}${midMarkers}${aidPts.map((p,i) => `<g class="aid-label"><circle cx="${p.x}" cy="${p.y}" r="${i===0||i===aidPts.length-1?5:3}" fill="${i===0?'#668154':i===aidPts.length-1?'#d79a2b':'#fff'}" stroke="#101515" stroke-width="1.2"/><text x="${p.x+7}" y="${p.y-7}" fill="#101515" font-size="10" font-weight="800">${esc(course.aidPoints[i].shortName)}</text></g>`).join('')}</svg>`;
  el.querySelectorAll('[data-map-section]').forEach(node => {
    const select = () => { selectSection(Number(node.getAttribute("data-map-section")), "panel"); };
    node.addEventListener('click', select);
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
  });
}
function renderSummary() {
  const s = atlas.summary;
  $('summaryStats').innerHTML = [
    ['sources', s.sources], ['records', s.visual_items], ['inspectable', s.inspectable_assets ?? s.downloaded_assets], ['route/place leads', s.section_or_same_location_records ?? s.higher_confidence_visual_items ?? 0], ['failed searches', s.failed_queries ?? 0], ['harvest errors', s.download_errors ?? 0], ['blockers', (atlas.unresolved_blockers || []).length], ['sections', s.coverage_sections]
  ].map(([a,b]) => `<div><span>${a}</span><b>${fmt.format(b)}</b></div>`).join('');
  const legend = $('mapLegend');
  if (legend) {
    legend.innerHTML = [
      ['#2f8b67', 'dense candidates'], ['#d79a2b', 'mixed candidates'], ['#607f95', 'same-place only'], ['#7f6b46', 'same-place heavy'], ['#9a6b23', 'thumbnail-heavy'], ['#b95d3c', 'thin candidates'], ['#5f2b2b', 'audit gap'], ['#fff7d7', 'filtered count']
    ].map(([color,label]) => `<span><i style="background:${color}"></i>${esc(label)}</span>`).join('');
  }
}
function renderStrip() {
  $('sectionStrip').innerHTML = atlas.coverage.map((s,i) => {
    const q = coverageStats(s);
    const global = globalVideoSourceCount(s);
    const sourceOnly = q.sourceOnly ? `<br><strong>${fmt.format(q.sourceOnly)}</strong> source-only / ${fmt.format(q.noLocalInspectable)} no local inspectable` : '';
    return `<button class="section-button ${i===state.section?'active':''}" data-section="${i}"><span>${s.km_start}-${s.km_end} km</span><b>${esc(s.section)}</b><small><em>${esc(qualityLabel(s))}</em><strong>${q.exact}</strong> route/place leads (${q.sameRoute} same-route/${q.samePlace} same-place) / ${q.exactDensity.toFixed(1)} inspectable leads/km<br><strong>${sectionVideoSourceCount(s)}</strong> section video rows${global ? ` + ${fmt.format(global)} global` : ''} / burden ${q.burden.toFixed(1)}${sourceOnly}</small></button>`;
  }).join('');
  document.querySelectorAll('[data-section]').forEach(btn => btn.addEventListener('click', () => { selectSection(Number(btn.dataset.section), "strip"); }));
}
function renderPanel() {
  const s = atlas.coverage[state.section];
  const visuals = atlas.visuals.filter(v => overlaps(v, s));
  const shown = filteredVisuals(s);
  const strictCounts = strictCountsForSection(s);
  const exactTotal = strictCounts.total;
  const matchingInspectable = shown.filter(v => ['display', 'small-thumbnail'].includes(v.is_display_asset)).length;
  const matchingExact = shown.filter(v => isSectionSpecificAsset(v) && ['display', 'small-thumbnail'].includes(v.is_display_asset)).length;
  const matchingFull = shown.filter(v => isSectionSpecificAsset(v) && v.is_display_asset === 'display').length;
  const matchingSmall = shown.filter(v => isSectionSpecificAsset(v) && v.is_display_asset === 'small-thumbnail').length;
  const matchingSameRoute = shown.filter(v => isSameRouteAsset(v) && ['display', 'small-thumbnail'].includes(v.is_display_asset)).length;
  const matchingSamePlace = shown.filter(v => isSamePlaceAnchor(v) && ['display', 'small-thumbnail'].includes(v.is_display_asset)).length;
  const bestFull = shown.filter(v => isSectionSpecificAsset(v) && v.is_display_asset === "display");
  const bestSmall = shown.filter(v => isSectionSpecificAsset(v) && v.is_display_asset === "small-thumbnail");
  const best = bestFull.concat(bestSmall).sort((a,b) => confidenceRank(b, s) - confidenceRank(a, s) || Number(a.km_start) - Number(b.km_start)).slice(0,5);
  const showGlobal = showGlobalVideoContext();
  const panelContextRows = baseFilteredVisuals(s, { applyStatus: false, applyMode: false });
  const linked = panelContextRows.filter(v => ['remote-only', 'thumbnail-only'].includes(v.is_display_asset) && (showGlobal || !isGlobalVideoRecord(v))).sort((a,b) => confidenceRank(b, s) - confidenceRank(a, s)).slice(0,10);
  const sourceOnly = atlas.sources.filter(src => sourceOverlaps(src, s) && sourceMatchesActiveFilters(src) && !sourceHasInspectableInSection(src.source_id, s) && (showGlobal || !isGlobalVideoSource(src))).sort((a,b) => spanKm(a) - spanKm(b) || String(a.source_id).localeCompare(String(b.source_id)));
  const generatedSourceOnly = Number(s.source_only_candidates || 0);
  const generatedNoLocalInspectable = Number(s.no_local_inspectable_sources || 0);
  const hiddenGlobalNote = !showGlobal && globalVideoSourceCount(s) ? `<p>${fmt.format(globalVideoSourceCount(s))} event-wide video/source thumbnail rows are hidden here because they overlap the whole course; switch to Remote/video/source mode to inspect them.</p>` : '';
  const linkedRows = linked.map(v => `<div class="confidence-row"><b>${esc(v.visual_id)} / ${esc(v.source_id)}</b><span>${esc(v.source_title)}<br>${esc(scopeLabels[visualScope(v)] || visualScope(v))} / ${esc(statusLabels[v.is_display_asset] || v.is_display_asset)} / ${esc(compactText(v.visual_confidence, 90))}<br>${esc(compactText(v.caveats, 130))} / <a href="${esc(v.remote_url || v.source_url)}" target="_blank" rel="noreferrer">open</a></span></div>`).join('') || '<p>No remote-only or thumbnail-only visual rows match this section/filter set.</p>';
  const sourceRows = sourceOnlyMarkup(sourceOnly);
  const bestRows = best.map(v => `<div class="confidence-row actionable"><button type="button" data-focus-visual="${esc(v.visual_id)}"><b>${esc(v.visual_id)} / ${esc(v.source_id)}</b><span>${esc(v.source_title)}<br>${esc(scopeLabels[visualScope(v)] || visualScope(v))} / km ${esc(v.km_start)}-${esc(v.km_end)}</span></button><a href="${esc(imgSrc(v) || v.remote_url || v.source_url)}" target="_blank" rel="noreferrer">asset</a><a href="${esc(v.source_url)}" target="_blank" rel="noreferrer">source</a></div>`).join('') || '<p>No route/place inspectable records.</p>';
  const hiddenContextRows = panelContextRows.filter(v => !isSectionSpecificAsset(v) && isContextRecord(v) && ['display', 'small-thumbnail'].includes(v.is_display_asset) && imgSrc(v));
  const contextNudge = state.mode === 'exact' && hiddenContextRows.length ? `<div class="context-nudge"><b>${fmt.format(hiddenContextRows.length)} nearby context images are hidden by Route/place mode.</b><span>Use them to inspect local terrain texture, but keep their adjacent/context caveats separate from direct route proof.</span><button type="button" data-section-context-mode="context">Show nearby context</button></div>` : '';
  const contextPreviewRows = hiddenContextRows.sort((a,b) => confidenceRank(b, s) - confidenceRank(a, s) || overlapKm(b, s) - overlapKm(a, s) || spanKm(a) - spanKm(b)).slice(0, 6);
  const nearbyContextBlock = hiddenContextRows.length ? `<h3>Nearby local context images</h3><div class="context-preview-list">${contextPreviewRows.map(v => `<button type="button" class="context-preview-card" data-focus-visual="${esc(v.visual_id)}"><span class="context-preview-thumb"><img loading="lazy" src="${esc(imgSrc(v))}" alt="${esc(visualAlt(v))}"></span><span><b>${esc(v.visual_id)} / ${esc(v.source_id)}</b><small>${esc(compactText(v.source_title, 88))}<br>${esc(scopeLabels[visualScope(v)] || visualScope(v))} / km ${esc(v.km_start)}-${esc(v.km_end)} / ${overlapKm(v, s).toFixed(1)} km here</small></span></button>`).join('')}${hiddenContextRows.length > contextPreviewRows.length ? `<p>${fmt.format(hiddenContextRows.length - contextPreviewRows.length)} more context images are available in Context/triage imagery or All records mode.</p>` : ''}</div>` : '';
  $('sectionPanel').innerHTML = `<div class="section-nav"><button type="button" data-section-step="-1" ${state.section === 0 ? 'disabled' : ''}>Prev</button><span>${esc(sectionLabel(state.section))}</span><button type="button" data-section-step="1" ${state.section === atlas.coverage.length - 1 ? 'disabled' : ''}>Next</button></div><p class="eyebrow">${s.km_start}-${s.km_end} km</p><h2>${esc(s.section)}</h2><p>${esc(s.remaining_gap)}</p>${coverageMeter(s)}${contextNudge}${kmVisualRail(s)}<div class="section-metrics"><div><span>matching records</span><b>${shown.length}/${visuals.length}</b></div><div><span>matching inspectable</span><b>${matchingInspectable}/${inspectableAssetRecords(s)}</b></div><div><span>matching leads</span><b>${matchingExact}/${exactTotal}</b></div><div><span>route/place full/small</span><b>${matchingFull}/${strictCounts.full} + ${matchingSmall}/${strictCounts.small}</b></div><div><span>same-route/place</span><b>${matchingSameRoute}/${strictCounts.sameRoute} + ${matchingSamePlace}/${strictCounts.samePlace}</b></div><div><span>video/source rows</span><b>${sectionVideoSourceCount(s)} + ${globalVideoSourceCount(s)} global</b></div><div><span>source-only candidates</span><b>${generatedSourceOnly}</b></div><div><span>no local inspectable</span><b>${generatedNoLocalInspectable}</b></div></div><h3>Best full route/place image records</h3><div class="confidence-list">${bestRows}</div>${nearbyContextBlock}<h3>Section source-only / thumbnail context</h3>${hiddenGlobalNote}<div class="confidence-list">${linkedRows}</div><h3>No local inspectable source candidates</h3><div class="confidence-list">${sourceRows}</div>`;
  document.querySelectorAll('[data-section-step]').forEach(btn => btn.addEventListener('click', () => moveSection(Number(btn.dataset.sectionStep))));
}
function advancedFiltersActive() {
  return state.sourceClass !== "all" || state.evidence !== "all" || state.match !== "inspectable" || state.currentness !== "all" || state.access !== "all";
}
function syncAdvancedFilters() {
  const el = $("advancedFilters");
  if (el && advancedFiltersActive()) el.open = true;
}
function renderFilters() {
  const classes = ['all', ...Array.from(new Set(atlas.visuals.map(v => classLabelFromVisual(v)).filter(Boolean))).sort()];
  $('classFilter').innerHTML = classes.map(c => `<option value="${esc(c)}">${c === 'all' ? 'All media classes' : esc(c)}</option>`).join('');
  $('evidenceFilter').innerHTML = evidenceOptions.map(c => `<option value="${esc(c)}" ${evidenceAllowedForMode(c) ? '' : 'disabled'}>${esc(scopeLabels[c] || c)}</option>`).join('');
  $('matchFilter').innerHTML = matchOptions.map(c => `<option value="${esc(c)}" ${matchAllowedForMode(c) ? '' : 'disabled'}>${esc(statusLabels[c] || c)}</option>`).join('');
  $('currentnessFilter').innerHTML = currentnessOptions.map(c => `<option value="${esc(c)}">${esc(currentnessLabels[c] || c)}</option>`).join('');
  $('accessFilter').innerHTML = accessOptions.map(c => `<option value="${esc(c)}">${esc(accessLabels[c] || c)}</option>`).join('');
  $('galleryMode').innerHTML = [
    ['exact', 'Route/place images'], ['context', 'Context/triage imagery'], ['remote', 'Remote/video/source'], ['all', 'All records']
  ].map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
  $('sortMode').innerHTML = [
    ['course', 'Course order'], ['confidence', 'Highest confidence'], ['source', 'Source ID']
  ].map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
  $('classFilter').value = state.sourceClass;
  $('evidenceFilter').value = state.evidence;
  $('matchFilter').value = state.match;
  $('currentnessFilter').value = state.currentness;
  $('accessFilter').value = state.access;
  $('galleryMode').value = state.mode;
  $('sortMode').value = state.sort;
  syncAdvancedFilters();
}
function renderPresets() {
  const latestCount = atlas.sources.filter(latestPassSource).length;
  const latestHint = latestCount ? `${fmt.format(latestCount)} latest-batch source candidates` : 'Regenerate data to enable latest-batch filtering';
  const presets = [
    ['best', 'Best route/place images', 'Full-size same-route and same-place assets'],
    ['allExact', 'All route/place evidence', 'Include small same-route and same-place thumbnails'],
    ['context', 'Context/triage imagery', 'Adjacent, broad, race-wide, and uncategorized context; not route proof'],
    ['video', 'Video/source', 'video/source thumbnails and remote rows'],
    ['limited', 'Gated/link-only', 'Browser-only, source-only, blocked, or link-only candidates'],
    ['latest', 'Latest harvest pass', latestHint],
    ['late', 'Late course', 'Sedlo Suha through Kranjska Gora'],
    ['weak', 'Weakest gap', 'Jump to thinnest route/place section']
  ];
  const baseClean = state.q === '' && state.sourceClass === 'all' && state.evidence === 'all' && state.currentness === 'all';
  const active = (id) => {
    if (!baseClean) return false;
    if (id !== 'limited' && state.access !== 'all') return false;
    if (id !== 'latest' && state.latestOnly) return false;
    if (id === 'best') return state.mode === 'exact' && state.match === 'display' && state.sort === 'confidence';
    if (id === 'allExact') return state.mode === 'exact' && state.match === 'inspectable' && state.sort === 'confidence';
    if (id === 'context') return state.mode === 'context' && state.match === 'inspectable' && state.sort === 'course';
    if (id === 'video') return state.mode === 'remote' && state.match === 'all' && state.sort === 'confidence';
    if (id === 'limited') return state.access === 'limited' && state.mode === 'all' && state.match === 'all' && state.sort === 'confidence';
    if (id === 'latest') return state.latestOnly && state.mode === 'all' && state.match === 'all' && state.sort === 'confidence';
    if (id === 'late') return state.section >= 6 && state.mode === 'all' && state.match === 'inspectable' && state.sort === 'confidence';
    return false;
  };
  const chips = presets.map(([id, label, hint]) => `<button type="button" class="preset-chip ${active(id) ? 'active' : ''}" data-preset="${id}"><b>${esc(label)}</b><span>${esc(hint)}</span></button>`).join('');
  const latestNotice = state.latestOnly ? `<button type="button" class="preset-chip active latest-filter" data-clear-latest="1"><b>Latest-pass filter active</b><span>Click to clear and restore full source set.</span></button>` : '';
  $('presetBar').innerHTML = chips + latestNotice;
}
function applyPreset(id) {
  state.q = '';
  state.focusVisual = '';
  state.currentness = 'all';
  state.access = 'all';
  const search = $('searchInput');
  if (search) search.value = '';
  if (id === 'best') {
    state.latestOnly = false; state.mode = 'exact'; state.match = 'display'; state.evidence = 'all'; state.sourceClass = 'all'; state.sort = 'confidence';
  } else if (id === 'allExact') {
    state.latestOnly = false; state.mode = 'exact'; state.match = 'inspectable'; state.evidence = 'all'; state.sourceClass = 'all'; state.sort = 'confidence';
  } else if (id === 'context') {
    state.latestOnly = false; state.mode = 'context'; state.match = 'inspectable'; state.evidence = 'all'; state.sourceClass = 'all'; state.sort = 'course';
  } else if (id === 'video') {
    state.latestOnly = false; state.mode = 'remote'; state.match = 'all'; state.evidence = 'all'; state.sourceClass = 'all'; state.sort = 'confidence';
  } else if (id === 'limited') {
    state.latestOnly = false; state.access = 'limited'; state.mode = 'all'; state.match = 'all'; state.evidence = 'all'; state.sourceClass = 'all'; state.sort = 'confidence'; state.showAllSources = true;
  } else if (id === 'latest') {
    state.latestOnly = true; state.mode = 'all'; state.match = 'all'; state.evidence = 'all'; state.sourceClass = 'all'; state.sort = 'confidence';
  } else if (id === 'late') {
    state.section = Math.max(6, state.section); pendingFocusTarget = "panel";
    state.latestOnly = false; state.mode = 'all'; state.match = 'inspectable'; state.evidence = 'all'; state.sourceClass = 'all'; state.sort = 'confidence';
  } else if (id === 'weak') {
    const weakest = weakestSections()[0];
    if (weakest) { state.section = weakest.index; pendingFocusTarget = "panel"; }
    state.latestOnly = false; state.mode = 'all'; state.match = 'all'; state.evidence = 'all'; state.sourceClass = 'all'; state.sort = 'confidence';
  }
  resetLimit();
  renderFilters();
  renderAll();
}
function compactText(value, max = 140) {
  const text = String(value || '').trim();
  return text.length > max ? text.slice(0, max - 1) + '...' : text;
}
function starterVisuals(section, limit = 6) {
  const candidates = filteredVisuals(section)
    .filter(v => ["display", "small-thumbnail", "thumbnail-only"].includes(v.is_display_asset) && imgSrc(v));
  const starterScore = (v) => {
    let score = 0;
    if (isSameRouteAsset(v)) score += 900;
    else if (isSamePlaceAnchor(v)) score += 780;
    else if (visualScope(v) === 'local corridor context') score += 520;
    else if (visualScope(v) === 'adjacent context') score += 450;
    else if (visualScope(v) === 'overlapping race route') score += 390;
    else if (visualScope(v) === 'race-wide current-route') score += 250;
    else if (visualScope(v) === 'broad/older context') score += 120;
    if (v.is_display_asset === 'display') score += 90;
    if (v.is_display_asset === 'small-thumbnail') score += 45;
    if (v.is_display_asset === 'thumbnail-only') score -= 80;
    if (isGlobalVideoRecord(v)) score -= 180;
    return score;
  };
  const ranker = (a,b) => starterScore(b) - starterScore(a) || confidenceRank(b, section) - confidenceRank(a, section) || overlapKm(b, section) - overlapKm(a, section) || spanKm(a) - spanKm(b);
  const ranked = candidates.sort(ranker);
  const seenAssets = new Set();
  const seenSources = new Set();
  const primary = [];
  const fallback = [];
  ranked.forEach(v => {
    const assetKey = v.asset_sha256 || imgSrc(v);
    if (assetKey && seenAssets.has(assetKey)) return;
    const target = seenSources.has(v.source_id) ? fallback : primary;
    target.push(v);
    if (assetKey) seenAssets.add(assetKey);
    seenSources.add(v.source_id);
  });
  return primary.concat(fallback).slice(0, limit);
}
function starterCard(v, i, section) {
  const src = sourceFor(v);
  const warnings = [];
  if (v.is_display_asset === "small-thumbnail") warnings.push("small thumb");
  if (v.is_display_asset === "thumbnail-only") warnings.push("source thumb");
  if (isGlobalVideoRecord(v)) warnings.push("event-wide");
  if (!isSectionSpecificAsset(v)) warnings.push("not route proof");
  const warning = warnings.map(label => `<span class="starter-warning">${esc(label)}</span>`).join(' ');
  return `<button type="button" class="starter-card ${i === 0 ? "lead" : ""}" data-focus-visual="${esc(v.visual_id)}" aria-label="Open ${esc(v.visual_id)} in the gallery"><span class="starter-image"><img loading="lazy" src="${esc(imgSrc(v))}" alt="${esc(visualAlt(v))}"></span><span class="starter-copy"><b>${esc(v.visual_id)} / ${esc(v.source_id)}</b><span>${esc(compactText(v.source_title, 76))}</span><small>${esc(scopeLabels[visualScope(v)] || visualScope(v))} / ${esc(v.km_start)}-${esc(v.km_end)} km / ${overlapKm(v, section).toFixed(1)} km here ${warning}</small><em>${esc(currentnessLabels[currentnessBucket(src)] || currentnessBucket(src))} / ${esc(sourceOrigin(src))}</em></span></button>`;
}
function starterPackSummary(rows) {
  const routePlace = rows.filter(isSectionSpecificAsset).length;
  const context = rows.filter(v => !isSectionSpecificAsset(v) && isContextRecord(v)).length;
  const sourceThumbs = rows.filter(v => v.is_display_asset === 'thumbnail-only').length;
  const parts = [];
  if (routePlace) parts.push(`${fmt.format(routePlace)} route/place`);
  if (context) parts.push(`${fmt.format(context)} context/triage`);
  if (sourceThumbs) parts.push(`${fmt.format(sourceThumbs)} source thumbnails`);
  return parts.join(' / ') || `${fmt.format(rows.length)} image leads`;
}
function starterScopeWarning(rows) {
  const contextRows = rows.filter(v => !isSectionSpecificAsset(v) && isContextRecord(v)).length;
  const sourceThumbs = rows.filter(v => v.is_display_asset === 'thumbnail-only').length;
  const broad = rows.filter(v => ['broad/older context', 'uncategorized', 'race-wide current-route'].includes(visualScope(v))).length;
  if (!contextRows && !sourceThumbs && !broad) return '';
  const parts = [];
  if (contextRows) parts.push(`${fmt.format(contextRows)} context images`);
  if (broad) parts.push(`${fmt.format(broad)} broad/race/uncategorized rows`);
  if (sourceThumbs) parts.push(`${fmt.format(sourceThumbs)} source thumbnails`);
  return `<div class="starter-scope-warning"><b>Starter pack includes non-route-proof records.</b><span>${esc(parts.join(' / '))}. Use these for triage and terrain context; route/place records remain the stronger evidence layer.</span></div>`;
}
function renderStarterPack() {
  const el = $("starterPack");
  if (!el) return;
  const section = atlas.coverage[state.section];
  const rows = starterVisuals(section);
  const q = coverageStats(section);
  if (!rows.length) {
    el.innerHTML = `<div class="starter-empty"><b>No starter images for this filter state.</b><span>Use Route/place, Context/triage imagery, Remote/video/source, or All records mode to inspect a different evidence layer for this section.</span></div>`;
    return;
  }
  const sources = new Set(rows.map(v => v.source_id)).size;
  el.innerHTML = `<div class="starter-head"><div><p class="eyebrow">Section starter pack</p><h3>Open these first.</h3></div><p>${starterPackSummary(rows)} from ${fmt.format(sources)} sources under the active mode / ${fmt.format(q.exact)} total inspectable route/place leads in this section. Click any image to focus it in the full gallery and table.</p></div>${starterScopeWarning(rows)}<div class="starter-grid">${rows.map((v,i) => starterCard(v, i, section)).join("")}</div>`;
}
function visualCard(v, i, section) {
  const cls = classLabelFromVisual(v);
  const src = sourceFor(v);
  const hot = confidenceRank(v, section) >= 90;
  const overlap = section ? overlapKm(v, section) : 0;
  const downgraded = ['duplicate', 'non-evidence'].includes(v.is_display_asset);
  const statusClass = [v.is_display_asset === 'small-thumbnail' ? 'small-evidence-card' : '', downgraded ? 'downgraded-evidence-card' : ''].filter(Boolean).join(' ');
  const primaryClass = i === 0 && v.is_display_asset === 'display' ? 'primary' : '';
  const warning = (v.is_display_asset === 'small-thumbnail' ? '<div class="evidence-banner small">Small thumbnail: inspect source before treating it as surface evidence.</div>' : '') + (v.is_display_asset === 'thumbnail-only' ? '<div class="evidence-banner video">Video/source thumbnail only: use as a source lead, not route-proof imagery.</div>' : '') + downgradedEvidenceWarning(v);
  return `<article class="visual-card ${primaryClass} ${statusClass}" data-visual-id="${esc(v.visual_id)}" tabindex="-1"><button class="image-button" type="button" data-open-visual="${i}" aria-label="Open ${esc(v.visual_id)} image"><img loading="lazy" src="${esc(imgSrc(v))}" alt="${esc(visualAlt(v))}"></button>${warning}<div class="visual-body"><h3>${esc(v.source_title)}</h3><p>${esc(v.route_section)} / km ${v.km_start}-${v.km_end}</p><div class="pills"><span class="pill ${hot?'good':''}">${esc(v.visual_id)}</span><span class="pill ${hot?'hot':''}">${esc(scopeLabels[visualScope(v)] || visualScope(v))}</span><span class="pill">${esc(cls)}</span><span class="pill">${esc(statusLabels[v.is_display_asset] || v.is_display_asset)}</span><span class="pill currentness">${esc(currentnessLabels[currentnessBucket(src)] || currentnessBucket(src))}</span><span class="pill origin">${esc(sourceOrigin(src))}</span><span class="pill">${v.image_width}x${v.image_height}</span>${duplicatePill(v)}${v.capture_date ? `<span class="pill">${esc(v.capture_date.slice(0,10))}</span>` : ''}${section ? `<span class="pill">${overlap.toFixed(1)} km here</span>` : ''}</div><p><b>${esc(v.route_match_confidence)}</b><br><span class="confidence-note">${esc(compactText(v.visual_confidence, 130))}</span><br>${esc(compactText(v.caveats, 150))}</p><details><summary>Details</summary><p>${esc(v.location_claim)}</p><p>${esc(v.surface_observations)}</p><p>${esc(v.caveats)}</p>${duplicateDetail(v)}<p>${esc(v.license_or_access)}</p></details><div class="visual-actions"><a href="${esc(v.source_url)}" target="_blank" rel="noreferrer">Open source</a><a href="${esc(v.remote_url || v.source_url)}" target="_blank" rel="noreferrer">Image/link</a></div></div></article>`;
}
function remoteRecordCard(v) {
  const src = sourceFor(v);
  return `<article class="visual-card remote-card" data-visual-id="${esc(v.visual_id)}" tabindex="-1"><div class="evidence-banner remote">Remote-only link: not locally inspected; verify source before treating as evidence.</div><div class="remote-card-body"><p class="eyebrow">${esc(statusLabels[v.is_display_asset] || v.is_display_asset)}</p><h3>${esc(v.source_title)}</h3><p>${esc(v.route_section)} / km ${v.km_start}-${v.km_end}</p><div class="pills"><span class="pill">${esc(v.visual_id)}</span><span class="pill">${esc(v.source_id)}</span><span class="pill">${esc(scopeLabels[visualScope(v)] || visualScope(v))}</span><span class="pill">${esc(classLabelFromVisual(v))}</span><span class="pill currentness">${esc(currentnessLabels[currentnessBucket(src)] || currentnessBucket(src))}</span><span class="pill origin">${esc(sourceOrigin(src))}</span></div><p><b>${esc(v.route_match_confidence)}</b><br><span class="confidence-note">${esc(compactText(v.visual_confidence, 130))}</span><br>${esc(compactText(v.caveats, 190))}</p><div class="visual-actions"><a href="${esc(v.remote_url || v.source_url)}" target="_blank" rel="noreferrer">Open link</a><a href="${esc(v.source_url)}" target="_blank" rel="noreferrer">Open source</a></div></div></article>`;
}
function thumbnailRecordCard(v, i, section) {
  const src = sourceFor(v);
  const overlap = section ? overlapKm(v, section) : 0;
  const image = imgSrc(v) ? `<button class="thumbnail-image" type="button" data-open-visual="${i}" aria-label="Open ${esc(v.visual_id)} thumbnail"><img loading="lazy" src="${esc(imgSrc(v))}" alt="${esc(visualAlt(v))}"></button>` : '<div class="thumbnail-image"></div>';
  return `<article class="visual-card thumbnail-evidence-card" data-visual-id="${esc(v.visual_id)}" tabindex="-1">${image}<div class="evidence-banner video">Video/source thumbnail only: source lead, not route proof.</div><div class="remote-card-body"><p class="eyebrow">${esc(statusLabels[v.is_display_asset] || v.is_display_asset)}</p><h3>${esc(v.source_title)}</h3><p>${esc(v.route_section)} / km ${v.km_start}-${v.km_end}${section ? ` / ${overlap.toFixed(1)} km here` : ''}</p><div class="pills"><span class="pill">${esc(v.visual_id)}</span><span class="pill">${esc(v.source_id)}</span><span class="pill">${esc(scopeLabels[visualScope(v)] || visualScope(v))}</span><span class="pill currentness">${esc(currentnessLabels[currentnessBucket(src)] || currentnessBucket(src))}</span><span class="pill origin">${esc(sourceOrigin(src))}</span></div><p><b>${esc(v.route_match_confidence)}</b><br><span class="confidence-note">Public thumbnail/autostill only. Frame extraction and timestamp localization are still needed.</span><br>${esc(compactText(v.caveats, 190))}</p><div class="visual-actions"><a href="${esc(v.source_url)}" target="_blank" rel="noreferrer">Open video/source</a><a href="${esc(v.remote_url || v.source_url)}" target="_blank" rel="noreferrer">Thumbnail/link</a></div></div></article>`;
}
function focusedVisualNotice() {
  if (!state.focusVisual) return '';
  const target = atlas.visuals.find(v => v.visual_id === state.focusVisual);
  const label = target ? `${target.visual_id} / ${target.source_id}` : state.focusVisual;
  const source = target ? target.source_title : 'Focused visual record';
  return `<div class="focus-notice"><b>Focused on ${esc(label)}</b><span>${esc(compactText(source, 120))}. The global search is narrowed to this record.</span><button type="button" data-clear-focus>Clear focus</button></div>`;
}
function galleryBucketCounts(rows) {
  const routePlace = rows.filter(isSectionSpecificAsset).length;
  const sourceThumbs = rows.filter(v => v.is_display_asset === 'thumbnail-only').length;
  const remoteLinks = rows.filter(v => v.is_display_asset === 'remote-only').length;
  const duplicates = rows.filter(v => v.is_display_asset === 'duplicate').length;
  const nonEvidence = rows.filter(v => v.is_display_asset === 'non-evidence').length;
  const contextRows = rows.filter(v => !isSectionSpecificAsset(v) && isContextRecord(v) && !['thumbnail-only', 'remote-only', 'duplicate', 'non-evidence'].includes(v.is_display_asset)).length;
  const broadOrUncategorized = rows.filter(v => ['broad/older context', 'uncategorized', 'race-wide current-route'].includes(visualScope(v)) && !['thumbnail-only', 'remote-only', 'duplicate', 'non-evidence'].includes(v.is_display_asset)).length;
  return { routePlace, contextRows, broadOrUncategorized, sourceThumbs, remoteLinks, duplicates, nonEvidence };
}
function galleryRecordVisible(v) {
  if (galleryAssetVisible(v)) return true;
  if (state.mode === 'remote' || state.match === 'remote-only' || state.match === 'all') {
    return !imgSrc(v) && ['remote-only', 'thumbnail-only'].includes(v.is_display_asset);
  }
  return false;
}
function renderGallery() {
  const section = atlas.coverage[state.section];
  const visuals = filteredVisuals(section);
  const withAssets = visuals.filter(galleryRecordVisible);
  const buckets = galleryBucketCounts(withAssets);
  const capped = withAssets.slice(0, state.limit);
  currentGalleryAssets = withAssets;
  $('galleryTitle').textContent = `${section.section}`;
  const fullImages = withAssets.filter(v => v.is_display_asset === 'display').length;
  const smallThumbs = withAssets.filter(v => v.is_display_asset === 'small-thumbnail').length;
  const videoThumbs = withAssets.filter(v => v.is_display_asset === 'thumbnail-only').length;
  const downgradedCards = buckets.duplicates + buckets.nonEvidence;
  const remoteCards = buckets.remoteLinks;
  const cappedDowngraded = capped.filter(v => ['duplicate', 'non-evidence'].includes(v.is_display_asset)).length;
  const binLabel = kmBinActive() ? formatKmRange(state.kmBin.start, state.kmBin.end) : '';
  const broadNote = buckets.broadOrUncategorized ? `, ${fmt.format(buckets.broadOrUncategorized)} broad/race/uncategorized` : '';
  const galleryCountText = `showing ${capped.length} of ${withAssets.length} gallery records${binLabel ? ` in ${binLabel}` : ''} (${fullImages} full images, ${smallThumbs} small thumbnails, ${videoThumbs} video/source thumbnails, ${fmt.format(buckets.duplicates)} duplicate, ${fmt.format(buckets.nonEvidence)} non-evidence, ${remoteCards} remote/link cards; ${buckets.routePlace} route/place, ${buckets.contextRows} context${broadNote}) / ${visuals.length} filtered catalog rows`;
  $('galleryCount').innerHTML = `<div class="gallery-section-nav"><button type="button" data-gallery-section-step="-1" ${state.section === 0 ? 'disabled' : ''}>Prev section</button><span>${esc(galleryCountText)}</span><button type="button" data-gallery-section-step="1" ${state.section === atlas.coverage.length - 1 ? 'disabled' : ''}>Next section</button></div>`;
  const kmBinNote = kmBinActive() ? `<div class="km-bin-notice"><b>Focused kilometer bin: ${esc(binLabel)}</b><span>Showing every matching visual/source row that overlaps this 1 km rail bin; clear it to return to the full section.</span><button type="button" data-clear-km-bin>Clear km bin</button></div>` : '';
  const downgradedNote = downgradedCards && (state.mode === 'all' || state.match === 'all') && !cappedDowngraded ? `<div class="downgraded-callout"><b>${fmt.format(downgradedCards)} downgraded image rows match this view.</b><span>They are retained for audit/accounting and sorted below stronger evidence. Inspect them directly:</span><button type="button" data-match-preset="duplicate">Duplicates</button><button type="button" data-match-preset="non-evidence">Non-evidence</button></div>` : '';
  const cards = capped.map((v, i) => v.is_display_asset === 'thumbnail-only' ? thumbnailRecordCard(v, i, section) : (imgSrc(v) ? visualCard(v, i, section) : remoteRecordCard(v))).join('');
  const more = withAssets.length > capped.length ? `<button id="loadMoreButton" class="load-more" type="button">Show ${Math.min(24, withAssets.length - capped.length)} more</button>` : '';
  $('visualGrid').innerHTML = focusedVisualNotice() + kmBinNote + downgradedNote + ((cards + more) || '<div class="empty">No local image assets match these gallery filters. Check the section evidence table below for remote-only, thumbnail-only, source-only, duplicate, or excluded rows.</div>');
  const button = $('loadMoreButton');
  if (button) button.addEventListener('click', () => { state.limit += 24; renderGallery(); });
}
function focusPendingGalleryVisual() {
  if (!pendingGalleryFocus) return;
  const targetId = pendingGalleryFocus;
  pendingGalleryFocus = "";
  const card = Array.from(document.querySelectorAll('[data-visual-id]')).find(node => node.dataset.visualId === targetId);
  if (card && typeof card.focus === "function") card.focus({ preventScroll: true });
}
function tableRowsMarkup(rows) {
  return rows.map(v => {
    const src = sourceFor(v);
    const hash = v.asset_sha256 ? `${v.asset_sha256.slice(0, 10)}...` : '';
    const openLink = imgSrc(v) ? `<a href="${esc(imgSrc(v))}" target="_blank" rel="noreferrer">asset</a>` : `<a href="${esc(v.remote_url || v.source_url)}" target="_blank" rel="noreferrer">link</a>`;
    const focusAction = imgSrc(v) ? `<button type="button" class="table-action-button" data-focus-visual="${esc(v.visual_id)}">Focus</button>` : '';
    const sourceAction = `<button type="button" class="table-action-button" data-source-query="${esc(v.source_id)}">${esc(v.source_id)}</button>`;
    return `<tr><td>${esc(v.visual_id)}</td><td>${sourceAction}</td><td>${esc(v.km_start)}-${esc(v.km_end)}</td><td>${esc(scopeLabels[visualScope(v)] || visualScope(v))}</td><td>${esc(statusLabels[v.is_display_asset] || v.is_display_asset)}${duplicateGroup(v).length > 1 ? ` (+${duplicateGroup(v).length - 1})` : ''}</td><td>${esc(v.media_type || '')}</td><td>${esc(v.evidence_role || '')}</td><td>${esc(src.year || '')}</td><td>${esc(classLabelFromVisual(v))}</td><td>${esc(sourceOrigin(src))}${sourceBatch(src) ? `<br>${esc(sourceBatch(src))}` : ''}</td><td>${esc(v.route_match_confidence)}</td><td>${esc(v.visual_confidence)}</td><td>${esc(compactText(v.location_claim, 180))}</td><td>${esc(compactText(v.caveats, 220))}</td><td>${esc(hash)}</td><td>${esc(src.access_status || '')}</td><td><span class="table-actions">${focusAction}${openLink}</span></td></tr>`;
  }).join('') || '<tr><td colspan="17">No rows match these filters.</td></tr>';
}
function catalogMixSummary(rows) {
  const b = galleryBucketCounts(rows);
  return `${fmt.format(b.routePlace)} route/place / ${fmt.format(b.contextRows)} context / ${fmt.format(b.sourceThumbs)} source-thumbnail / ${fmt.format(b.remoteLinks)} remote / ${fmt.format(b.duplicates)} duplicate / ${fmt.format(b.nonEvidence)} non-evidence`;
}
function evidenceTableMarkup(title, note, rows, limit = Number.POSITIVE_INFINITY) {
  const shown = Number.isFinite(limit) ? rows.slice(0, limit) : rows;
  const omitted = rows.length - shown.length;
  const mix = catalogMixSummary(rows);
  const cappedNote = omitted > 0 ? `${note} / ${mix} / first ${shown.length} shown, ${omitted} more in CSV` : `${note} / ${mix}`;
  return `<div class="table-head"><h3>${esc(title)}</h3><span>${esc(cappedNote)}</span></div><div class="table-scroll"><table><caption>${esc(title)}. ${esc(cappedNote)}</caption><thead><tr><th scope="col">ID</th><th scope="col">Source</th><th scope="col">km</th><th scope="col">Scope</th><th scope="col">Status</th><th scope="col">Media</th><th scope="col">Role</th><th scope="col">Year</th><th scope="col">Class</th><th scope="col">Origin/batch</th><th scope="col">Route match</th><th scope="col">Visual confidence</th><th scope="col">Location claim</th><th scope="col">Caveat</th><th scope="col">Hash</th><th scope="col">Source access</th><th scope="col">Open</th></tr></thead><tbody>${tableRowsMarkup(shown)}</tbody></table></div>`;
}
function lazyTableDetails(summary, title, note, rows, mode = 'table') {
  const lazyId = `lazy-table-${++lazyTableCounter}`;
  lazyTables.set(lazyId, { title, note, rows, mode });
  return `<details class="audit-details lazy-table" data-lazy-table="${esc(lazyId)}"><summary>${esc(summary)}</summary><div class="lazy-table-content"><div class="lazy-table-placeholder">Open to render this table in the browser.</div></div></details>`;
}
function evidenceTableBlock(title, note, rows) {
  const preview = evidenceTableMarkup(title, note, rows, TABLE_PREVIEW_LIMIT);
  if (rows.length <= TABLE_PREVIEW_LIMIT) return preview;
  const allTitle = `All ${title.toLowerCase()}`;
  return preview + lazyTableDetails(`Show all ${rows.length} rows for ${title}`, allTitle, `${note} / full table`, rows);
}
function renderLazyEvidenceTable(details) {
  if (!details || !details.open || details.dataset.lazyRendered === '1') return;
  const payload = lazyTables.get(details.dataset.lazyTable);
  const target = Array.from(details.children).find(el => el.classList && el.classList.contains('lazy-table-content'));
  if (!payload || !target) return;
  target.innerHTML = payload.mode === 'block' ? evidenceTableBlock(payload.title, payload.note, payload.rows) : evidenceTableMarkup(payload.title, payload.note, payload.rows);
  details.dataset.lazyRendered = '1';
}
function renderEvidenceTable() {
  lazyTables.clear();
  lazyTableCounter = 0;
  const section = atlas.coverage[state.section];
  const activeRows = sortVisuals(baseFilteredVisuals(section), section);
  const auditRows = sortVisuals(baseFilteredVisuals(section, { applyStatus: false, applyMode: false }), section);
  const audit = auditRows.length === activeRows.length ? '' : lazyTableDetails(`Show audit rows before gallery-mode/display-status filters (${auditRows.length})`, 'All audit rows for active section', 'Search/media/scope filters apply; gallery mode and display status do not.', auditRows, 'block');
  $('evidenceTable').innerHTML = evidenceTableBlock('Active filtered catalog rows', `${activeRows.length} visual/source records after all active controls`, activeRows) + audit;
}
function weakestSections() {
  return [...atlas.coverage].map((s,i) => ({...s, index:i, score:weakScore(s)})).sort((a,b) => a.score - b.score || inspectableSectionRecords(a) - inspectableSectionRecords(b));
}
function frameReviewQueue() {
  return [...atlas.coverage].map((s, i) => {
    const q = coverageStats(s);
    const videoRows = sectionVideoSourceCount(s);
    const globalRows = globalVideoSourceCount(s);
    const localBurden = videoRows / Math.max(1, q.exactFull);
    const weakFullImagePenalty = 1 / Math.max(1, q.exactFull);
    const score = localBurden * 18 + q.gated * 3 + q.context / Math.max(1, q.exact) + weakFullImagePenalty * 25;
    return {...s, index: i, queueScore: score, queueVideoRows: videoRows, queueGlobalRows: globalRows, queueFullImages: q.exactFull, queueSmallImages: q.exactSmall, queueGated: q.gated, queueContext: q.context};
  }).sort((a, b) => b.queueScore - a.queueScore || b.queueVideoRows - a.queueVideoRows || a.queueFullImages - b.queueFullImages);
}
function sourceFrameReviewQueue() {
  const priorityIds = new Set(['YV010', 'YV011', 'YV012', 'YV013', 'YV026', 'YV027', 'YV029', 'YV110', 'YV151', 'YV220', 'YV221', 'YV222']);
  return atlas.sources.map(src => {
    const rows = visualsBySource.get(src.source_id) || [];
    const videoRows = rows.filter(v => ['thumbnail-only', 'remote-only'].includes(v.is_display_asset));
    const inspectable = rows.filter(v => ['display', 'small-thumbnail'].includes(v.is_display_asset));
    const routeRows = inspectable.filter(isSameRouteAsset);
    const placeRows = inspectable.filter(isSamePlaceAnchor);
    const sectionRows = atlas.coverage.filter(section => sourceOverlaps(src, section)).length;
    const broad = spanKm(src) >= 20 || isGlobalVideoSource(src);
    const limited = limitedSource(src);
    const noLocalInspectable = !inspectable.length;
    const zeroRow = !rows.length;
    const frameCandidate = String(src.source_id).startsWith('YV') || String(src.source_class || '').toLowerCase().includes('video') || videoRows.length || limited || zeroRow || noLocalInspectable;
    if (!frameCandidate) return null;
    const priority = priorityIds.has(String(src.source_id));
    const score = (priority ? 180 : 0) + videoRows.length * 3 + (limited ? 45 : 0) + (zeroRow ? 55 : 0) + (noLocalInspectable ? 35 : 0) + (broad ? 18 : 0) + sectionRows * 4 - inspectable.length * 2 - routeRows.length * 4 - placeRows.length;
    return { src, rows, videoRows, inspectable, routeRows, placeRows, sectionRows, broad, limited, priority, score };
  }).filter(Boolean).sort((a,b) => b.score - a.score || b.videoRows.length - a.videoRows.length || a.inspectable.length - b.inspectable.length || String(a.src.source_id).localeCompare(String(b.src.source_id)));
}
function sourceOnlyCandidates() {
  return atlas.sources.filter(src => !sourceHasVisual(src.source_id)).sort((a,b) => String(a.source_class || '').localeCompare(String(b.source_class || '')) || String(a.source_id).localeCompare(String(b.source_id)));
}
function renderSourceOnlyInventory() {
  const rows = sourceOnlyCandidates();
  if (!rows.length) return '<details id="sourceOnlyInventory" class="latest-details source-only-inventory"><summary>Source-only candidate inventory</summary><p>No source-only candidates remain.</p></details>';
  const cards = rows.map(src => `<button type="button" data-source-query="${esc(src.source_id)}"><b>${esc(src.source_id)} / ${esc(compactText(src.title, 74))}</b><span>${esc(src.source_class || 'unknown class')} / km ${esc(src.km_start)}-${esc(src.km_end)}<br>${esc(src.access_status || 'unknown access')}<br>${esc(compactText(src.notes, 160))}</span></button>`).join('');
  return `<details id="sourceOnlyInventory" class="latest-details source-only-inventory" open><summary>Source-only candidate inventory / ${fmt.format(rows.length)}</summary><div class="source-only-inventory-list">${cards}</div></details>`;
}
function renderSourceExhaustion() {
  const rows = atlas.source_exhaustion || [];
  if (!rows.length) return '<details class="latest-details exhaustion-details"><summary>Source exhaustion by surface</summary><p>No source-exhaustion rows were generated.</p></details>';
  const cards = rows.map(row => {
    const failed = auditRefChips(row.failed_query_refs, 'failed-query');
    const blockers = auditRefChips(row.unresolved_blocker_refs, 'blocker');
    const sourceOnly = Number(row.source_only_candidates || 0);
    const sourceOnlyMarkup = sourceOnly ? `<strong class="source-only-warning">${fmt.format(sourceOnly)} source-only candidates</strong>` : `${fmt.format(sourceOnly)} source-only candidates`;
    const sourceOnlyAction = sourceOnly ? '<button type="button" data-show-source-only>Inspect source-only inventory</button>' : '';
    return `<article class="exhaustion-item"><b>${esc(row.surface)}</b><span>${fmt.format(Number(row.source_count || 0))} sources / ${fmt.format(Number(row.visual_records || 0))} visual rows</span><small>${fmt.format(Number(row.inspectable_records || 0))} inspectable / ${fmt.format(Number(row.route_or_place_records || 0))} route-place / ${fmt.format(Number(row.thumbnail_or_remote_records || 0))} thumbnail-remote / ${fmt.format(Number(row.limited_sources || 0))} limited / ${sourceOnlyMarkup} / ${fmt.format(Number(row.latest_harvest_sources || 0))} latest-pass</small>${sourceOnlyAction}<small><strong>Failed refs</strong> <span class="ref-chip-row">${failed}</span><br><strong>Blockers</strong> <span class="ref-chip-row">${blockers}</span><br>${esc(row.caveat || '')}</small></article>`;
  }).join('');
  return `<details class="latest-details exhaustion-details" open><summary>Source exhaustion by surface</summary><div class="exhaustion-grid">${cards}</div></details>`;
}

function renderAudit() {
  const gated = atlas.sources.filter(limitedSource).length;
  $('auditMetrics').innerHTML = [
    ['source candidates', atlas.summary.sources], ['visual records', atlas.summary.visual_items], ['inspectable assets', atlas.summary.inspectable_assets ?? atlas.summary.downloaded_assets], ['route/place rows', atlas.summary.section_or_same_location_records ?? atlas.summary.higher_confidence_visual_items ?? 0], ['failed searches', atlas.summary.failed_queries ?? 0], ['harvest errors', atlas.summary.download_errors ?? 0], ['blockers', (atlas.unresolved_blockers || []).length], ['remote-only', atlas.summary.remote_only_records ?? 0], ['thumbnail-only', atlas.summary.thumbnail_context_records ?? 0], ['limited sources', gated, 'limited']
  ].map(([a,b,action]) => action ? `<button type="button" data-access-preset="${esc(action)}"><span>${a}</span><b>${fmt.format(b)}</b></button>` : `<div><span>${a}</span><b>${fmt.format(b)}</b></div>`).join('');
  const originRows = Array.from(new Set(atlas.sources.map(sourceOrigin))).map(origin => {
    const sources = atlas.sources.filter(s => sourceOrigin(s) === origin);
    const visuals = sources.flatMap(s => visualsBySource.get(s.source_id) || []);
    return {
      origin,
      sourceCount: sources.length,
      visualCount: visuals.length,
      inspectable: visuals.filter(v => ['display', 'small-thumbnail'].includes(v.is_display_asset)).length,
      exact: visuals.filter(v => isSectionSpecificAsset(v)).length
    };
  }).sort((a,b) => b.visualCount - a.visualCount || b.sourceCount - a.sourceCount);
  const currentnessRows = ['current', '2025', '2024', 'older', 'mixed', 'unknown'].map(bucket => {
    const bucketSources = atlas.sources.filter(s => currentnessBucket(s) === bucket);
    const bucketVisuals = bucketSources.flatMap(s => visualsBySource.get(s.source_id) || []);
    return `<button type="button" data-currentness-query="${esc(bucket)}"><span>${esc(currentnessLabels[bucket])}</span><b>${fmt.format(bucketVisuals.length)}</b><small>${fmt.format(bucketSources.length)} sources / ${fmt.format(bucketVisuals.filter(v => ['display', 'small-thumbnail'].includes(v.is_display_asset)).length)} inspectable</small></button>`;
  }).join('');
  const latestRows = atlas.sources.filter(latestPassSource).map(s => {
    const c = sourceVisualCounts(s.source_id);
    return `<button type="button" data-source-query="${esc(s.source_id)}"><b>${esc(s.source_id)} / ${esc(s.title)}</b><span>${esc(sourceBatch(s) || sourceOrigin(s))} / ${esc(s.year || 'year unknown')}: ${c.total} rows, ${c.display + c.small} inspectable, ${c.thumbnail + c.remote} source/video records</span></button>`;
  }).join('');
  const exhaustionPanel = renderSourceExhaustion();
  const sourceOnlyPanel = renderSourceOnlyInventory();
  $('provenancePanel').innerHTML = `<div class="provenance-grid">${originRows.slice(0,8).map(row => `<button type="button" data-source-query="${esc(row.origin)}"><span>${esc(row.origin)}</span><b>${fmt.format(row.visualCount)}</b><small>${fmt.format(row.sourceCount)} sources / ${fmt.format(row.inspectable)} inspectable / ${fmt.format(row.exact)} route/place</small></button>`).join('')}</div>${exhaustionPanel}${sourceOnlyPanel}<details class="latest-details" open><summary>Currentness / source year buckets</summary><div class="provenance-grid currentness-grid">${currentnessRows}</div></details><details class="latest-details" ${state.latestOnly ? 'open' : ''}><summary>Latest-pass source additions${latestHarvestBatch ? ` / ${esc(latestHarvestBatch)}` : ''}</summary><div class="latest-list">${latestRows || '<p>No latest-pass sources found.</p>'}</div></details>`;
  $('weakSections').innerHTML = weakestSections().slice(0,5).map(s => { const q = coverageStats(s); return `<button type="button" data-weak-section="${s.index}"><b>${esc(s.section)}</b><span>${q.exact} route/place leads (${q.exactFull} full/${q.exactSmall} small) / ${q.context} context and broad rows / ${sectionVideoSourceCount(s)} section video/source rows${globalVideoSourceCount(s) ? ` / ${fmt.format(globalVideoSourceCount(s))} global video` : ''}</span></button>`; }).join('');
  const sourceQueue = sourceFrameReviewQueue();
  const sourceQueueCounts = {
    zeroRow: sourceQueue.filter(item => item.rows.length === 0).length,
    thumbnailOnly: sourceQueue.filter(item => item.rows.length > 0 && !item.inspectable.length && item.videoRows.length > 0).length,
    gated: sourceQueue.filter(item => item.limited).length,
    noLocalInspectable: sourceQueue.filter(item => !item.inspectable.length).length
  };
  const sourceQueueGroups = [
    ['priority video/source leads', item => item.priority],
    ['zero-row source candidates', item => item.rows.length === 0],
    ['gated/link-only candidates', item => item.limited],
    ['thumbnail-only video/source leads', item => item.rows.length > 0 && !item.inspectable.length && item.videoRows.length > 0],
    ['no local inspectable candidates', item => !item.inspectable.length],
    ['remaining frame-review leads', () => true]
  ];
  const sourceQueueGroup = (item) => sourceQueueGroups.find(([, test]) => test(item))?.[0] || 'remaining frame-review leads';
  const sourceQueueButton = (item) => {
    const src = item.src;
    const flag = item.priority ? 'priority' : (item.limited ? 'limited' : (item.broad ? 'broad' : 'section'));
    return `<button type="button" data-frame-review-source="${esc(src.source_id)}"><b>${esc(src.source_id)} / ${esc(compactText(src.title, 72))}</b><span>${esc(flag)} / ${esc(src.source_class)} / ${esc(src.year || 'year unknown')} / km ${esc(src.km_start)}-${esc(src.km_end)}<br>${fmt.format(item.videoRows.length)} video/source rows, ${fmt.format(item.inspectable.length)} inspectable, ${fmt.format(item.routeRows.length)} same-route, ${fmt.format(item.placeRows.length)} same-place, ${fmt.format(item.sectionRows)} sections / ${esc(sourceBatch(src) || sourceOrigin(src))}</span></button>`;
  };
  const sourceQueueRows = sourceQueueGroups.map(([label]) => {
    const rows = sourceQueue.filter(item => sourceQueueGroup(item) === label);
    if (!rows.length) return '';
    return `<details class="source-review-group" open><summary>${esc(label)} / ${fmt.format(rows.length)}</summary><div class="source-frame-review-queue">${rows.map(sourceQueueButton).join('')}</div></details>`;
  }).join('');
  const sourceQueueSummary = `<div class="source-queue-summary"><span><b>${fmt.format(sourceQueue.length)}</b> source/video review candidates</span><span><b>${fmt.format(sourceQueueCounts.zeroRow)}</b> zero-row</span><span><b>${fmt.format(sourceQueueCounts.thumbnailOnly)}</b> thumbnail-only</span><span><b>${fmt.format(sourceQueueCounts.gated)}</b> gated/link-only</span><span><b>${fmt.format(sourceQueueCounts.noLocalInspectable)}</b> no local inspectable</span></div>`;
  const reviewRows = frameReviewQueue().slice(0, 5).map(s => `<button type="button" data-frame-review-section="${s.index}"><b>${esc(s.section)}</b><span>${fmt.format(s.queueVideoRows)} section video/source rows + ${fmt.format(s.queueGated)} limited sources against ${fmt.format(s.queueFullImages)} full route/place images (${fmt.format(s.queueSmallImages)} small). ${fmt.format(s.queueGlobalRows)} event-wide thumbnails are tracked separately.</span></button>`).join('');
  const reviewPanel = $('frameReviewQueue');
  if (reviewPanel) reviewPanel.innerHTML = `${sourceQueueSummary}<details class="latest-details source-review-details" open><summary>Source/video review queue / ${fmt.format(sourceQueue.length)}</summary>${sourceQueueRows || '<p>No source-level frame-review rows were generated.</p>'}</details><h4>Section burden</h4>${reviewRows || '<p>No section frame-review queue rows were generated.</p>'}`;
  document.querySelectorAll('[data-weak-section]').forEach(btn => btn.addEventListener('click', () => { selectSection(Number(btn.dataset.weakSection), "panel"); }));
  document.querySelectorAll('[data-frame-review-source]').forEach(btn => btn.addEventListener('click', () => {
    const sourceId = btn.dataset.frameReviewSource;
    if (sourceById.has(sourceId)) selectBestSectionForSourceId(sourceId, "panel");
    state.q = sourceId;
    state.focusVisual = '';
    state.latestOnly = false;
    state.mode = 'all';
    state.match = 'all';
    state.evidence = 'all';
    state.sourceClass = 'all';
    state.currentness = 'all';
    state.access = 'all';
    state.sort = 'confidence';
    state.showAllSources = true;
    const search = $('searchInput');
    if (search) search.value = sourceId;
    pendingFocusTarget = "panel";
    resetLimit();
    renderFilters();
    renderAll();
    $('sources').scrollIntoView({behavior:'smooth', block:'start'});
  }));
  document.querySelectorAll('[data-frame-review-section]').forEach(btn => btn.addEventListener('click', () => {
    state.section = Number(btn.dataset.frameReviewSection);
    state.q = '';
    state.focusVisual = '';
    state.latestOnly = false;
    state.mode = 'remote';
    state.match = 'all';
    state.evidence = 'all';
    state.sourceClass = 'all';
    state.currentness = 'all';
    state.access = 'all';
    state.sort = 'confidence';
    const search = $('searchInput');
    if (search) search.value = '';
    pendingFocusTarget = "panel";
    resetLimit();
    renderFilters();
    renderAll();
    $('gallery').scrollIntoView({behavior:'smooth', block:'start'});
  }));
  document.querySelectorAll('[data-currentness-query]').forEach(btn => btn.addEventListener('click', () => {
    state.currentness = btn.dataset.currentnessQuery;
    state.q = '';
    state.focusVisual = '';
    state.latestOnly = false;
    state.mode = 'all';
    state.match = 'inspectable';
    state.evidence = 'all';
    state.sourceClass = 'all';
    state.sort = 'confidence';
    const search = $('searchInput');
    if (search) search.value = '';
    resetLimit();
    renderFilters();
    renderAll();
  }));
  document.querySelectorAll('[data-show-source-only]').forEach(btn => btn.addEventListener('click', () => {
    const panel = $('sourceOnlyInventory');
    if (panel) { panel.open = true; panel.scrollIntoView({behavior:'smooth', block:'start'}); }
  }));
  document.querySelectorAll('[data-source-query]').forEach(btn => btn.addEventListener('click', () => {
    state.q = btn.dataset.sourceQuery;
    state.focusVisual = '';
    state.latestOnly = false;
    state.mode = 'all';
    state.match = 'all';
    state.evidence = 'all';
    state.sourceClass = 'all';
    state.currentness = 'all';
    state.access = 'all';
    state.sort = 'confidence';
    state.showAllSources = true;
    if (sourceById.has(state.q)) selectBestSectionForSourceId(state.q, "panel");
    const search = $('searchInput');
    if (search) search.value = state.q;
    resetLimit();
    renderFilters();
    renderAll();
    $('sources').scrollIntoView({behavior:'smooth', block:'start'});
  }));
  const weakest = weakestSections()[0];
  $('knownLimits').innerHTML = [
    '2026 race is future-dated; current public imagery is 2025 and older plus 2026 promo material.',
    'Route colors use fixed route/place coverage; map bubbles show current filtered route/place inspectable counts and turn dashed when filters change the count.',
    'Event-wide video/source thumbnails are counted separately as global thumbnail rows so they do not inflate section-local coverage quality.',
    `Current weakest route/place section is ${weakest.section}: ${coverageStats(weakest).exact} route/place rows (${coverageStats(weakest).exactFull} full + ${coverageStats(weakest).exactSmall} small) and ${weakest.remaining_gap}`,
    'YouTube rows are thumbnails/source records unless frame-extracted and timestamp-tagged; direct video extraction is bot-gated from this environment.',
    `${(atlas.unresolved_blockers || []).length} unresolved access/extraction blockers are listed below; they bound source exhaustion claims even when the current public catalog is broad.`,
    'Use the section evidence table for remote-only, thumbnail-only, duplicate, non-evidence, and source-link rows that are not shown as image cards.'
  ].map(x => `<li>${esc(x)}</li>`).join('');
  const blockers = atlas.unresolved_blockers || [];
  const blockerRows = blockers.map(b => `<article class="blocker-item" id="blocker-${esc(b.blocker_id)}"><b>${esc(b.blocker_id)} / ${esc(b.surface)}</b><span>${esc(b.status)}</span><small><strong>Impact</strong> ${esc(b.evidence_impact)}<br><strong>Handling</strong> ${esc(b.current_handling)}<br><strong>Proof needed</strong> ${esc(b.proof_needed)}</small></article>`).join('');
  const blockerSection = blockerRows ? `<h4>Unresolved access/extraction blockers</h4><div class="blocker-grid">${blockerRows}</div>` : '';
  const allErrors = atlas.errors || [];
  const errorLimit = 24;
  const errorRows = allErrors.slice(0, errorLimit).map((err, i) => `<div class="failed-item error"><b>E${String(i + 1).padStart(3, '0')}</b><span>${esc(err)}</span></div>`).join('');
  const allErrorRows = allErrors.slice(errorLimit).map((err, i) => `<div class="failed-item error"><b>E${String(errorLimit + i + 1).padStart(3, '0')}</b><span>${esc(err)}</span></div>`).join('');
  const errorNote = allErrors.length > errorLimit ? `<details class="truncation-note"><summary>Showing ${errorLimit} of ${allErrors.length} harvest/download errors; expand remaining rows or open <a href="research/visual-harvest-error-log-v3.csv">the error CSV</a>.</summary>${allErrorRows}</details>` : '';
  const queryRows = atlas.failed_queries.map(q => `<div class="failed-item" id="failed-query-${esc(q.query_id)}"><b>${esc(q.query_id)} / ${esc(q.query)}</b><span>${esc(q.result)}</span></div>`).join('');
  $('failedQueries').innerHTML = `${blockerSection}<h4>Harvest/download errors</h4>${errorRows || '<p>No harvest errors recorded.</p>'}${errorNote}<h4>Failed / blocked searches</h4>${queryRows}`;
}
function renderSources() {
  const current = atlas.coverage[state.section];
  const activeRows = baseFilteredVisuals(current);
  const activeSourceIds = new Set(activeRows.map(v => v.source_id));
  const activeRowsBySource = new Map();
  activeRows.forEach(v => {
    if (!activeRowsBySource.has(v.source_id)) activeRowsBySource.set(v.source_id, []);
    activeRowsBySource.get(v.source_id).push(v);
  });
  const sourcePriority = (s) => {
    const rows = activeRowsBySource.get(s.source_id) || [];
    if (rows.some(isSameRouteAsset)) return 0;
    if (rows.some(isSamePlaceAnchor)) return 1;
    if (rows.some(v => ['display', 'small-thumbnail'].includes(v.is_display_asset))) return 2;
    if (rows.length) return 3;
    if (!sourceHasVisual(s.source_id)) return 4;
    return 5;
  };
  const sorted = [...atlas.sources].sort((a,b) => Number(sourceOverlaps(b,current)) - Number(sourceOverlaps(a,current)) || sourcePriority(a) - sourcePriority(b) || String(a.source_id).localeCompare(String(b.source_id)));
  const sourceMatchesState = sourceMatchesActiveFilters;
  const overlapping = sorted.filter(s => sourceOverlaps(s, current) && sourceMatchesState(s));
  const rows = state.showAllSources ? sorted.filter(sourceMatchesState) : overlapping;
  const visualFilterOnly = overlapping.filter(s => !activeSourceIds.has(s.source_id)).length;
  const sectionSourceTotal = sorted.filter(s => sourceOverlaps(s, current)).length;
  const hiddenBySearchCurrentnessAccess = state.showAllSources ? 0 : sectionSourceTotal - overlapping.length;
  const noInspectable = overlapping.filter(s => !sourceHasInspectableInSection(s.source_id, current)).length;
  const toolbar = `<div class="source-toolbar"><div><b>${rows.length}</b> sources shown / <b>${activeSourceIds.size}</b> have rows under active visual filters / <b>${overlapping.length}</b> match search-currentness-access in this section / <b>${visualFilterOnly}</b> have no rows under active visual filters / <b>${noInspectable}</b> with no local inspectable images / <b>${hiddenBySearchCurrentnessAccess}</b> hidden by search-currentness-access / <b>${atlas.sources.length}</b> total${state.latestOnly ? " / latest-pass filter active" : ""}${state.q ? ` / search: ${esc(state.q)}` : ""}</div><button type="button" data-toggle-sources>${state.showAllSources ? "Show section source inventory" : "Show all source inventory"}</button></div>`;
  const cards = rows.map(s => {
    const counts = sourceVisualCounts(s.source_id);
    const sectionCounts = sourceVisualCountsInSection(s.source_id, current);
    const activeRowsForSource = activeRowsBySource.get(s.source_id) || [];
    const activeDisplay = activeRowsForSource.filter(v => v.is_display_asset === 'display').length;
    const activeSmall = activeRowsForSource.filter(v => v.is_display_asset === 'small-thumbnail').length;
    const activeVideoRemote = activeRowsForSource.filter(v => ['thumbnail-only', 'remote-only'].includes(v.is_display_asset)).length;
    const activeRoute = activeRowsForSource.filter(isSameRouteAsset).length;
    const activePlace = activeRowsForSource.filter(isSamePlaceAnchor).length;
    const active = sourceOverlaps(s, current);
      const targetSection = atlas.coverage[bestSectionIndexForSource(s.source_id)];
    const targetCounts = targetSection ? sourceVisualCountsInSection(s.source_id, targetSection) : sectionCounts;
    const showMode = targetCounts.display + targetCounts.small ? 'inspectable' : 'all';
    const sourceCta = counts.total ? `<button type="button" data-source-show="${esc(s.source_id)}" data-source-show-match="${esc(showMode)}">Show source images</button>` : `<button type="button" data-source-show="${esc(s.source_id)}" data-source-show-match="all">Focus source section</button>`;
    return `<article class="source-card ${active?'active-source':''} ${latestPassSource(s)?'latest-source':''}"><h3>${esc(s.source_id)} / ${esc(s.title)}</h3><p>${esc(s.source_class)} / ${esc(s.route_section)} / km ${s.km_start}-${s.km_end}</p><p><span class="source-badge">${esc(currentnessLabels[currentnessBucket(s)] || currentnessBucket(s))}</span> ${esc(s.year || 'year unknown')} / ${esc(s.route_match_confidence)} / ${esc(s.access_status)} / ${esc(sourceBatch(s) || sourceOrigin(s))}</p><p><b>Active filters:</b> ${activeRowsForSource.length} rows (${activeDisplay} full/${activeSmall} small/${activeVideoRemote} video-remote; ${activeRoute} same-route/${activePlace} same-place). <b>Active section:</b> ${sectionCounts.total} rows, ${sectionCounts.display + sectionCounts.small} inspectable (${sectionCounts.display} full/${sectionCounts.small} small), ${sectionCounts.thumbnail + sectionCounts.remote} video/remote. <b>Total source:</b> ${counts.total} rows, ${counts.display + counts.small} inspectable.</p><p>${esc(s.notes)}</p><div class="source-actions">${sourceCta}<a href="${esc(s.url)}" target="_blank" rel="noreferrer">Open source</a></div></article>`;
  }).join('');
  $('sourceList').innerHTML = toolbar + cards;
}
function lightboxImages() {
  return currentGalleryAssets.filter(v => imgSrc(v));
}
function lightboxTemplate(v) {
  const section = atlas.coverage[state.section];
  const warning = (v.is_display_asset === 'small-thumbnail' ? '<div class="evidence-banner small">Small thumbnail: inspect source before treating it as surface evidence.</div>' : '') + (v.is_display_asset === 'thumbnail-only' ? '<div class="evidence-banner video">Video/source thumbnail only: use as a source lead, not route-proof imagery.</div>' : '') + downgradedEvidenceWarning(v);
  return `<div class="lightbox-backdrop" data-lightbox="close"></div><div class="lightbox-dialog" role="dialog" aria-modal="true" aria-label="Visual evidence detail"><div class="lightbox-top"><div><b>${esc(v.visual_id)} / ${esc(v.source_id)}</b><span>${esc(scopeLabels[visualScope(v)] || visualScope(v))} / ${esc(statusLabels[v.is_display_asset] || v.is_display_asset)} / km ${esc(v.km_start)}-${esc(v.km_end)}</span></div><button type="button" data-lightbox="close" aria-label="Close image viewer">Close</button></div><div class="lightbox-body"><button type="button" class="lightbox-step prev" data-lightbox="prev" aria-label="Previous image">Prev</button><img src="${esc(imgSrc(v))}" alt="${esc(visualAlt(v))}"><button type="button" class="lightbox-step next" data-lightbox="next" aria-label="Next image">Next</button></div>${warning}<div class="lightbox-meta"><h3>${esc(v.source_title)}</h3><p>${esc(v.route_section)} / overlap in active section: ${overlapKm(v, section).toFixed(1)} km</p><div class="pills"><span class="pill">${esc(visualEvidenceClass(v))}</span><span class="pill">${esc(v.route_match_confidence)}</span><span class="pill">${esc(v.image_width)}x${esc(v.image_height)}</span>${v.capture_date ? `<span class="pill">${esc(v.capture_date.slice(0,10))}</span>` : ''}</div><p>${esc(v.surface_observations)}</p><p>${esc(v.caveats)}</p><div class="visual-actions"><a href="${esc(v.source_url)}" target="_blank" rel="noreferrer">Open source</a><a href="${esc(v.remote_url || v.source_url)}" target="_blank" rel="noreferrer">Image/link</a></div></div></div>`;
}
function ensureLightbox() {
  let el = $('lightbox');
  if (!el) {
    el = document.createElement('div');
    el.id = 'lightbox';
    el.className = 'lightbox';
    el.hidden = true;
    document.body.appendChild(el);
  }
  return el;
}
function renderLightbox() {
  const el = ensureLightbox();
  const images = lightboxImages();
  const v = images[lightboxIndex];
  if (!v) return closeLightbox();
  el.innerHTML = lightboxTemplate(v);
  el.hidden = false;
  document.body.classList.add('modal-open');
  el.querySelector('.lightbox-top [data-lightbox="close"]')?.focus();
}
function openLightbox(index) {
  lightboxOpener = document.activeElement;
  const selected = currentGalleryAssets[index];
  if (!selected || !imgSrc(selected)) return;
  const images = lightboxImages();
  lightboxIndex = images.findIndex(v => v.visual_id === selected.visual_id);
  if (lightboxIndex < 0) return;
  renderLightbox();
}
function closeLightbox() {
  const el = $('lightbox');
  if (el) el.hidden = true;
  document.body.classList.remove('modal-open');
  if (lightboxOpener && typeof lightboxOpener.focus === 'function') lightboxOpener.focus();
  lightboxOpener = null;
}
function stepLightbox(delta) {
  const images = lightboxImages();
  if (!images.length) return;
  lightboxIndex = (lightboxIndex + delta + images.length) % images.length;
  renderLightbox();
}
function normalizeFilters() {
  const classes = new Set(['all', ...atlas.visuals.map(v => classLabelFromVisual(v)).filter(Boolean)]);
  if (!modeOptions.includes(state.mode)) state.mode = 'exact';
  if (!matchOptions.includes(state.match) || !matchAllowedForMode(state.match)) state.match = state.mode === 'remote' || state.mode === 'all' ? 'all' : 'inspectable';
  if (!evidenceOptions.includes(state.evidence) || !evidenceAllowedForMode(state.evidence)) state.evidence = 'all';
  if (!sortOptions.includes(state.sort)) state.sort = 'confidence';
  if (!currentnessOptions.includes(state.currentness)) state.currentness = 'all';
  if (!accessOptions.includes(state.access)) state.access = 'all';
  if (!classes.has(state.sourceClass)) state.sourceClass = 'all';
}
function readUrlState() {
  if (typeof URLSearchParams === 'undefined' || !window.location) return;
  const params = new URLSearchParams(window.location.search || '');
  const section = Number(params.get('section'));
  if (Number.isFinite(section)) state.section = Math.max(0, Math.min(atlas.coverage.length - 1, Math.trunc(section)));
  const stringKeys = { q: 'q', mode: 'mode', match: 'match', evidence: 'evidence', sourceClass: 'class', sort: 'sort', currentness: 'currentness', access: 'access' };
  Object.entries(stringKeys).forEach(([key, param]) => {
    const value = params.get(param);
    if (value) state[key] = value;
  });
  if (params.get('latest') === '1') state.latestOnly = true;
  if (params.get('sources') === 'all') state.showAllSources = true;
  const kmStart = Number(params.get('kmStart'));
  const kmEnd = Number(params.get('kmEnd'));
  if (Number.isFinite(kmStart) && Number.isFinite(kmEnd) && kmEnd > kmStart) state.kmBin = { start: kmStart, end: kmEnd };
  const focus = params.get('visual') || params.get('source');
  if (focus) { state.focusVisual = params.get('visual') || ''; if (!state.q) state.q = focus; }
  normalizeFilters();
}
function buildStateUrl(forceSection = false) {
  if (typeof URLSearchParams === 'undefined' || !window.location) return '';
  const params = new URLSearchParams();
  if (forceSection || state.section) params.set('section', String(state.section));
  if (state.focusVisual) params.set('visual', state.focusVisual);
  if (state.q) params.set('q', state.q);
  if (state.mode !== 'exact') params.set('mode', state.mode);
  if (state.match !== 'inspectable') params.set('match', state.match);
  if (state.evidence !== 'all') params.set('evidence', state.evidence);
  if (state.sourceClass !== 'all') params.set('class', state.sourceClass);
  if (state.sort !== 'confidence') params.set('sort', state.sort);
  if (state.currentness !== 'all') params.set('currentness', state.currentness);
  if (state.access !== 'all') params.set('access', state.access);
  if (state.latestOnly) params.set('latest', '1');
  if (state.showAllSources) params.set('sources', 'all');
  if (kmBinActive()) { params.set('kmStart', String(state.kmBin.start)); params.set('kmEnd', String(state.kmBin.end)); }
  const query = params.toString();
  const path = window.location.pathname || '';
  const hash = window.location.hash || '';
  return `${path}${query ? '?' + query : ''}${hash}`;
}
function writeUrlState() {
  if (!window.history || typeof window.history.replaceState !== 'function') return;
  const next = buildStateUrl(false);
  if (!next) return;
  const current = `${window.location.pathname || ''}${window.location.search || ''}${window.location.hash || ''}`;
  if (next !== current) window.history.replaceState(null, '', next);
}
function syncControlState() {
  const search = $('searchInput');
  if (search && search.value !== state.q) search.value = state.q;
}
function copyCurrentView() {
  const btn = $('copyViewButton');
  const rel = buildStateUrl(true);
  let url = '';
  try {
    url = rel ? new URL(rel, window.location.href).href : window.location.href;
  } catch (err) {
    url = window.location.href || rel || '';
  }
  if (!url) return;
  const done = () => { if (btn) { btn.textContent = 'Copied'; window.setTimeout?.(() => { btn.textContent = 'Copy view'; }, 1600); } };
  if (window.navigator?.clipboard?.writeText) window.navigator.clipboard.writeText(url).then(done).catch(() => { if (btn) btn.textContent = 'Use address bar'; });
  else if (btn) btn.textContent = 'Use address bar';
}
function bind() {
  $('searchInput').addEventListener('input', e => { state.q = e.target.value.trim(); state.focusVisual = ''; resetLimit(); window.clearTimeout(searchRenderTimer); searchRenderTimer = window.setTimeout(() => renderAll(), 160); });
  $('classFilter').addEventListener('change', e => { state.sourceClass = e.target.value; resetLimit(); renderAll(); });
  $('evidenceFilter').addEventListener('change', e => { state.evidence = e.target.value; resetLimit(); renderAll(); });
  $('matchFilter').addEventListener('change', e => { state.match = e.target.value; resetLimit(); renderAll(); });
  $('currentnessFilter').addEventListener('change', e => { state.currentness = e.target.value; resetLimit(); renderAll(); });
  $('accessFilter').addEventListener('change', e => { state.access = e.target.value; resetLimit(); renderAll(); });
  $('galleryMode').addEventListener('change', e => {
    state.mode = e.target.value;
    if (state.mode === 'all' && state.match === 'inspectable') state.match = 'all';
    resetLimit();
    renderAll();
  });
  $('sortMode').addEventListener('change', e => { state.sort = e.target.value; resetLimit(); renderAll(); });
  $('presetBar').addEventListener('click', e => {
    const clearLatest = e.target.closest('[data-clear-latest]');
    if (clearLatest) { state.latestOnly = false; resetLimit(); renderAll(); return; }
    const btn = e.target.closest('[data-preset]');
    if (btn) applyPreset(btn.dataset.preset);
  });
  $('copyViewButton').addEventListener('click', copyCurrentView);
  document.addEventListener('click', e => {
    const clearKm = e.target.closest('[data-clear-km-bin]');
    if (clearKm) { clearKmBin(); resetLimit(); renderAll(); $('gallery').scrollIntoView({behavior:'smooth', block:'start'}); return; }
    const kmBin = e.target.closest('[data-km-bin-start]');
    if (kmBin) {
      const start = Number(kmBin.dataset.kmBinStart);
      const end = Number(kmBin.dataset.kmBinEnd);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        state.kmBin = { start, end };
        state.q = '';
        state.focusVisual = '';
        state.latestOnly = false;
        state.mode = 'all';
        state.match = 'all';
        state.evidence = 'all';
        state.sourceClass = 'all';
        state.currentness = 'all';
        state.access = 'all';
        state.sort = 'confidence';
        const search = $('searchInput');
        if (search) search.value = '';
        resetLimit();
        renderFilters();
        renderAll();
        $('gallery').scrollIntoView({behavior:'smooth', block:'start'});
      }
      return;
    }
    const clearFocus = e.target.closest('[data-clear-focus]');
    if (clearFocus) {
      state.focusVisual = '';
      state.q = '';
      state.mode = 'exact';
      state.match = 'inspectable';
      state.sort = 'confidence';
      clearKmBin();
      resetLimit();
      renderFilters();
      renderAll();
      $('gallery').scrollIntoView({behavior:'smooth', block:'start'});
      return;
    }
    const focus = e.target.closest('[data-focus-visual]');
    if (focus) {
      const targetId = focus.dataset.focusVisual;
      const target = atlas.visuals.find(v => v.visual_id === targetId);
      state.q = targetId;
      state.focusVisual = targetId;
      state.sourceClass = 'all';
      state.evidence = 'all';
      state.access = 'all';
      state.currentness = 'all';
      state.latestOnly = false;
      state.mode = target && isSectionSpecificAsset(target) ? 'exact' : 'all';
      state.match = target && target.is_display_asset === 'small-thumbnail' ? 'inspectable' : (target?.is_display_asset || 'all');
      state.sort = 'confidence';
      clearKmBin();
      pendingGalleryFocus = targetId;
      $('searchInput').value = state.q;
      resetLimit();
      renderFilters();
      renderAll();
      $('gallery').scrollIntoView({behavior:'smooth', block:'start'});
      window.setTimeout(focusPendingGalleryVisual, 80);
    }
    const contextMode = e.target.closest('[data-section-context-mode]');
    if (contextMode) {
      state.mode = contextMode.dataset.sectionContextMode;
      state.match = 'inspectable';
      state.evidence = 'all';
      state.sourceClass = 'all';
      state.latestOnly = false;
      state.focusVisual = '';
      resetLimit();
      renderFilters();
      renderAll();
      $('gallery').scrollIntoView({behavior:'smooth', block:'start'});
      return;
    }
    const galleryStep = e.target.closest('[data-gallery-section-step]');
    if (galleryStep) {
      moveSection(Number(galleryStep.dataset.gallerySectionStep), 'gallery');
      $('gallery').scrollIntoView({behavior:'smooth', block:'start'});
      return;
    }
    const sourceShow = e.target.closest('[data-source-show]');
    if (sourceShow) {
      const sourceId = sourceShow.dataset.sourceShow;
      selectBestSectionForSourceId(sourceId, 'gallery');
      const destSection = atlas.coverage[state.section];
      const destCounts = destSection ? sourceVisualCountsInSection(sourceId, destSection) : { display: 0, small: 0 };
      state.q = sourceId;
      state.focusVisual = '';
      state.latestOnly = false;
      state.mode = 'all';
      state.match = destCounts.display + destCounts.small ? 'inspectable' : (sourceShow.dataset.sourceShowMatch || 'all');
      state.evidence = 'all';
      state.sourceClass = 'all';
      state.currentness = 'all';
      state.access = 'all';
      state.sort = 'confidence';
      state.showAllSources = true;
      pendingFocusTarget = 'gallery';
      const search = $('searchInput');
      if (search) search.value = sourceId;
      resetLimit();
      renderFilters();
      renderAll();
      $('gallery').scrollIntoView({behavior:'smooth', block:'start'});
      return;
    }
    const accessPreset = e.target.closest('[data-access-preset]');
    if (accessPreset) { state.access = accessPreset.dataset.accessPreset; state.mode = 'all'; state.match = 'all'; state.evidence = 'all'; state.sourceClass = 'all'; state.latestOnly = false; state.showAllSources = true; resetLimit(); renderFilters(); renderAll(); return; }
    const sourceToggle = e.target.closest('[data-toggle-sources]');
    if (sourceToggle) { state.showAllSources = !state.showAllSources; renderAll(); }
    const matchPreset = e.target.closest('[data-match-preset]');
    if (matchPreset) { state.mode = 'all'; state.match = matchPreset.dataset.matchPreset; resetLimit(); renderAll(); return; }
    const imgButton = e.target.closest('[data-open-visual]');
    if (imgButton) openLightbox(Number(imgButton.dataset.openVisual));
    const action = e.target.closest('[data-lightbox]');
    if (!action) return;
    const value = action.dataset.lightbox;
    if (value === 'close') closeLightbox();
    if (value === 'prev') stepLightbox(-1);
    if (value === 'next') stepLightbox(1);
  });
  document.addEventListener('toggle', e => {
    const details = e.target.closest?.('[data-lazy-table]');
    if (details) renderLazyEvidenceTable(details);
  }, true);
  document.addEventListener('keydown', e => {
    const tag = String(document.activeElement?.tagName || '').toLowerCase();
    const typing = ['input', 'select', 'textarea'].includes(tag);
    const lightboxOpen = $('lightbox') && !$('lightbox').hidden;
    if (lightboxOpen) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
      if (e.key === 'Tab') {
        const focusable = Array.from($('lightbox').querySelectorAll('button,a,[tabindex]:not([tabindex="-1"])')).filter(el => !el.disabled);
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      return;
    }
    if (typing) return;
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && sectionKeyTraversalAllowed(e)) {
      e.preventDefault();
      moveSection(e.key === "ArrowLeft" ? -1 : 1);
    }
  });
  window.addEventListener('resize', renderRoute);
  document.addEventListener('error', e => {
    const img = e.target;
    if (!img || String(img.tagName || '').toLowerCase() !== 'img' || img.dataset.assetError) return;
    img.dataset.assetError = '1';
    img.classList.add('image-missing');
    const card = img.closest('.visual-card, .lightbox-dialog, .thumbnail-evidence-card');
    if (card && !card.querySelector('.evidence-banner.missing')) {
      const note = document.createElement('div');
      note.className = 'evidence-banner missing';
      note.textContent = 'Local asset failed to load; use the source link.';
      card.appendChild(note);
    }
  }, true);
}
function renderAll() {
  normalizeFilters();
  syncControlState();
  renderFilters();
  renderSummary();
  renderPresets();
  renderRoute();
  renderStrip();
  renderPanel();
  renderStarterPack();
  renderGallery();
  renderEvidenceTable();
  renderAudit();
  renderSources();
  const live = $('atlasLive');
  if (live) live.textContent = `${sectionLabel(state.section)}: ${$('galleryCount')?.textContent || ''}`;
  writeUrlState();
  restorePendingFocus();
}
function init() {
  if (!window.JAT_VISUAL_ATLAS || !window.JAT_DATA) {
    document.body.insertAdjacentHTML('afterbegin', '<div class="empty atlas-error">Atlas data failed to load.</div>');
    return;
  }
  readUrlState(); renderFilters(); bind(); renderAll();
}
init();
