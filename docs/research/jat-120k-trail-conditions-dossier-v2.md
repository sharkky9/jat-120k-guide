# Julian Alps Trail 120K Trail-Conditions Dossier v2

Generated: 2026-06-19T03:29:14+00:00

Working folder note: v1 artifacts were unavailable in this environment; this report does not claim a verified v1 diff.

## 1. V1 Comparison Status And V2 Methodology Notes

A byte-level v1 comparison cannot be made from this environment. What can be stated is only methodological: this v2 artifact uses the official 2026 page payload, two byte-checked GPX downloads, OSM highway/path nearest-way matching, and retained local trail-guide context for the Stol/Završnica block. It should not be read as proof that a specific v1 claim changed unless the missing v1 files are supplied.

## 2. Source Inventory With Evidence Quality

Inventory rows: 22. Archived surface-relevant rows: 4. Official route/geometry/context rows: 7. Unresolved attempts are kept in the CSV but not counted as retained evidence. Full inventory: `research/source-inventory-v2.csv`.

Highest-value evidence now separated by role:

- Official route truth: race page and embedded payload for distance, aid/checkpoint points, difficulty, services, cutoffs, and start time.
- GPX truth: visible button and payload GPX are hashed during generation and must match before artifacts are written. SHA-256: `971fbad73773809a9c72d09cb18615844956104c680557181e4db13526ed63ff`.
- OSM source-tag layer: exact Overpass query and raw-file hash are recorded below; bare highway-only matches are capped as inference.
- Local trail-guide context: Hike.uno Stol/Završnica route pages support the high-section terrain sequence, but remain adjacent/named-route context rather than race-meter proof.
- Visual media: official videos/photos are broad context only unless a future pass extracts and geolocates frames.

## 3. Source Candidate Log: Not Exhaustion Proof

Candidate/search rows: 38. Planned-but-not-verified search probes: 16. Full log: `research/source-candidate-log-v2.csv`.

The previous wording overstated source exhaustion. The CSV now distinguishes archived/direct sources from planned search probes and unresolved attempts. Blank result URLs are no longer evidence; they are explicit gaps for a future research pass.

## 4. Official Route Truth, Hashes, And OSM Provenance

Official payload: 124,499 m, +5,893 m, -5,572 m, min elevation 408 m, max elevation 2,166 m. Raw GPX point-to-point length from the local GPX is 122.86 km. The reason for the discrepancy is unresolved; possible causes include official route-distance calculation method, GPX simplification, and point-sum method. Do not treat the raw point-sum as a route change.

- visible GPX hash: `971fbad73773809a9c72d09cb18615844956104c680557181e4db13526ed63ff`
- embedded GPX hash: `971fbad73773809a9c72d09cb18615844956104c680557181e4db13526ed63ff`
- official page SHA-256: `a1ecfc8a93fb7dc4f045301da2957b39a4000adb04845bc26f8e30d3c2f7976d`
- OSM extract SHA-256: `45c611e67e42c8c76354f4f9e3129654388cb2455029ed574dca5508aa135871`
- OSM base timestamp: `2026-06-08T06:09:44Z`
- Overpass bbox/query: `[out:json][timeout:180];way[highway](46.30,13.76,46.51,14.24);out body;>;out skel qt;`
- OSM matched route: 124.5 km matched, 0.0 km unmatched; matched micro-segments 1091/1091; unique matched OSM ways 386; median/p90/p95 nearest-way distance 0.3/1.9/3.4 m.

Elevation note: micro-ledger and km-summary ascent/descent fields are `raw_gpx_edge_sum_not_official_reconciled`. Their summed +6,137 m / -5,815 m is not the official payload total (+5,893 m / -5,572 m), so official interval gain/loss should govern planning comparisons.

## 5. Aid-Station Interval Analysis

- RADOVLJICA to TALEŽ: 11.8 km, +468 m / -240 m, official difficulty T2, slowest window Fri 09:00 PM to Fri 10:57 PM.
- TALEŽ to KUPLJENIK: 8.8 km, +477 m / -560 m, official difficulty T2, slowest window Fri 10:57 PM to Sat 12:49 AM.
- KUPLJENIK to BOHINJSKA BELA: 6.7 km, +113 m / -267 m, official difficulty T3, slowest window Sat 12:49 AM to Sat 02:00 AM.
- BOHINJSKA BELA to Bled: 18.7 km, +983 m / -988 m, official difficulty T3, slowest window Sat 02:00 AM to Sat 06:39 AM.
- Bled to ŽIROVNICA: 13.9 km, +358 m / -285 m, official difficulty T2, slowest window Sat 06:39 AM to Sat 09:30 AM.
- ŽIROVNICA to ZAVRŠNICA: 12.5 km, +1252 m / -374 m, official difficulty T4, slowest window Sat 09:30 AM to Sat 02:12 PM.
- ZAVRŠNICA to KOČA NA STOLU: 4.9 km, +836 m / -103 m, official difficulty T4, slowest window Sat 02:12 PM to Sat 04:40 PM.
- KOČA NA STOLU to SEDLO SUHA: 12.1 km, +189 m / -915 m, official difficulty T2, slowest window Sat 04:40 PM to Sat 07:40 PM.
- SEDLO SUHA to DOVJE: 16.7 km, +646 m / -1372 m, official difficulty T3, slowest window Sat 07:40 PM to Sun 12:36 AM.
- DOVJE to GOZD MARTULJEK: 10.8 km, +272 m / -231 m, official difficulty T2, slowest window Sun 12:36 AM to Sun 03:09 AM.
- GOZD MARTULJEK to KRANJSKA GORA: 7.4 km, +293 m / -234 m, official difficulty T2, slowest window Sun 03:09 AM to Sun 05:03 AM.

Equipment-oriented interval table:

| interval | km | fastest/slowest pace band | dominant model surface | hard/trail/inferred | confidence | shoe action | poles | light action | wet fallback | wet/night flags |
|---|---:|---|---|---|---|---|---|---|---|---|
| RADOVLJICA->TALEŽ | 11.8 | Fri 09:00 PM to Fri 09:44 PM fastest / Fri 09:00 PM to Fri 10:57 PM slowest (dark->dark; dark->dark) | gravel road | 11% / 14% / 19% | medium | technical trail grip | mostly stow/optional | main lamp active; spare immediately accessible | slow technical descents and prioritize grip over pace | wet high, night high |
| TALEŽ->KUPLJENIK | 8.8 | Fri 09:44 PM to Fri 10:29 PM fastest / Fri 10:57 PM to Sat 12:49 AM slowest (dark->dark; dark->dark) | gravel road | 6% / 39% / 18% | medium | technical trail grip | mostly stow/optional | main lamp active; spare immediately accessible | slow technical descents and prioritize grip over pace | wet high, night high |
| KUPLJENIK->BOHINJSKA BELA | 6.7 | Fri 10:29 PM to Fri 10:56 PM fastest / Sat 12:49 AM to Sat 02:00 AM slowest (dark->dark; dark->dark) | asphalt road | 34% / 0% / 6% | medium | versatile trail shoe | mostly stow/optional | main lamp active; spare immediately accessible | normal wet-road caution; keep outsole confidence | wet medium, night medium-high |
| BOHINJSKA BELA->Bled | 18.7 | Fri 10:56 PM to Sat 12:41 AM fastest / Sat 02:00 AM to Sat 06:39 AM slowest (dark->dark; dark->twilight) | gravel road | 8% / 22% / 12% | medium | technical trail grip | deploy/practice | main lamp active; spare immediately accessible | slow technical descents and prioritize grip over pace | wet high, night high |
| Bled->ŽIROVNICA | 13.9 | Sat 12:41 AM to Sat 01:52 AM fastest / Sat 06:39 AM to Sat 09:30 AM slowest (dark->dark; twilight->day) | gravel road | 35% / 16% / 10% | medium | technical trail grip | mostly stow/optional | main lamp active; spare immediately accessible | slow technical descents and prioritize grip over pace | wet high, night high |
| ŽIROVNICA->ZAVRŠNICA | 12.5 | Sat 01:52 AM to Sat 03:37 AM fastest / Sat 09:30 AM to Sat 02:12 PM slowest (dark->dark; day->day) | muddy/leaf-litter risk | 6% / 59% / 5% | medium | technical trail grip | deploy/practice | standard carried-light readiness | slow technical descents and prioritize grip over pace | wet high, night medium |
| ZAVRŠNICA->KOČA NA STOLU | 4.9 | Sat 03:37 AM to Sat 04:30 AM fastest / Sat 02:12 PM to Sat 04:40 PM slowest (dark->dark; day->day) | high alpine ridge trail | 0% / 58% / 3% | medium-high | technical trail grip | deploy/practice | standard carried-light readiness | slow technical descents and prioritize grip over pace | wet high, night medium |
| KOČA NA STOLU->SEDLO SUHA | 12.1 | Sat 04:30 AM to Sat 05:35 AM fastest / Sat 04:40 PM to Sat 07:40 PM slowest (dark->twilight; day->day) | gravel path | 0% / 13% / 24% | medium | technical trail grip | mostly stow/optional | standard carried-light readiness | slow technical descents and prioritize grip over pace | wet high, night medium |
| SEDLO SUHA->DOVJE | 16.7 | Sat 05:35 AM to Sat 07:25 AM fastest / Sat 07:40 PM to Sun 12:36 AM slowest (twilight->day; day->dark) | gravel road | 5% / 9% / 30% | medium | technical trail grip | deploy/practice | standard carried-light readiness | slow technical descents and prioritize grip over pace | wet high, night medium |
| DOVJE->GOZD MARTULJEK | 10.8 | Sat 07:25 AM to Sat 08:24 AM fastest / Sun 12:36 AM to Sun 03:09 AM slowest (day->day; dark->dark) | paved pedestrian/cycleway | 45% / 18% / 18% | medium | technical trail grip | mostly stow/optional | main lamp active; spare immediately accessible | slow technical descents and prioritize grip over pace | wet high, night high |
| GOZD MARTULJEK->KRANJSKA GORA | 7.4 | Sat 08:24 AM to Sat 09:09 AM fastest / Sun 03:09 AM to Sun 05:03 AM slowest (day->day; dark->twilight) | asphalt road | 41% / 35% / 6% | medium | technical trail grip | mostly stow/optional | main lamp active; spare immediately accessible | slow technical descents and prioritize grip over pace | wet high, night high |

## 6. Micro-Segment Methodology

The GPX is split by OSM way changes, taxonomy changes, grade-bin changes, aid boundaries, and a 250 m target ceiling. Dominant taxonomy, landcover, aid interval, and difficulty are now length-weighted. Each segment records OSM match distance, tag depth, inferred-surface flag, p95 grade, raw max grade, direct visual IDs, context visual IDs, and separate surface/visual/equipment confidence fields.

Direct geotagged visual proof is currently zero. Context visuals are official broad thumbnails or local adjacent-route photo sets and are separated from direct proof.

Micro-segments generated: 1091.

## 7. Kilometer-by-Kilometer Surface And Equipment Summary

Full table: `research/km-surface-summary-v2.csv`. It now includes `shoe_action`, `pole_action`, `light_action`, `wet_fallback_action`, `wet_traction_risk`, `night_visibility_risk`, `p95_abs_grade_pct`, `raw_max_abs_grade_pct`, `unknown_or_inferred_pct`, `bare_osm_or_inferred_overlay_pct`, `aid_interval_mix`, `elevation_metric_basis`, and `evidence_weakness_score`.

Course-level surface totals from micro-segments:

- gravel road: 32.7 km (26.2%)
- asphalt road: 12.9 km (10.4%)
- smooth forest singletrack: 10.3 km (8.3%)
- forest road / cart track: 10.0 km (8.0%)
- gravel path: 9.9 km (8.0%)
- inferred forest singletrack: 7.9 km (6.3%)
- paved pedestrian/cycleway: 6.4 km (5.1%)
- rooty forest singletrack: 5.1 km (4.1%)
- muddy/leaf-litter risk: 5.1 km (4.1%)
- inferred road surface unknown: 4.6 km (3.7%)
- high alpine ridge trail: 3.7 km (3.0%)
- inferred alpine/open trail: 3.5 km (2.8%)
- coarse rocky wash / eroded track: 3.4 km (2.7%)
- unknown / insufficient evidence: 3.2 km (2.6%)
- grassy alpine trail: 2.0 km (1.6%)
- compacted dirt road: 1.9 km (1.5%)
- compacted path: 1.5 km (1.2%)
- cobbles/stairs/urban hard surface: 0.4 km (0.3%)

Estimated hard-surface total: 19.7 km. Estimated singletrack/alpine total: 29.6 km. These are model outputs, not official declarations.

## 8. Weakest-Evidence Sections

Ten weakest kilometers by evidence score, not by grade:

- km 29: weakness score 95.0, inferred/unknown 100.0%, surface confidence low-medium, context `none`; change trigger: Conservative trail shoe; surface is inferred, so do not optimize for speed here.
- km 92: weakness score 95.0, inferred/unknown 100.0%, surface confidence low-medium, context `none`; change trigger: Conservative trail shoe; surface is inferred, so do not optimize for speed here.
- km 93: weakness score 95.0, inferred/unknown 100.0%, surface confidence low-medium, context `none`; change trigger: Conservative trail shoe; surface is inferred, so do not optimize for speed here.
- km 94: weakness score 95.0, inferred/unknown 100.0%, surface confidence low-medium, context `none`; change trigger: Conservative trail shoe; surface is inferred, so do not optimize for speed here.
- km 14: weakness score 87.2, inferred/unknown 84.4%, surface confidence low-medium, context `none`; change trigger: Conservative trail shoe; surface is inferred, so do not optimize for speed here.
- km 28: weakness score 84.3, inferred/unknown 78.6%, surface confidence low-medium, context `none`; change trigger: Conservative trail shoe; surface is inferred, so do not optimize for speed here.
- km 106: weakness score 83.5, inferred/unknown 77.0%, surface confidence low-medium, context `none`; change trigger: Conservative trail shoe; surface is inferred, so do not optimize for speed here.
- km 6: weakness score 83.2, inferred/unknown 76.5%, surface confidence low-medium, context `none`; change trigger: Conservative trail shoe; surface is inferred, so do not optimize for speed here.
- km 95: weakness score 77.8, inferred/unknown 65.6%, surface confidence low-medium, context `none`; change trigger: Conservative trail shoe; surface is inferred, so do not optimize for speed here.
- km 96: weakness score 77.2, inferred/unknown 64.3%, surface confidence low-medium, context `none`; change trigger: Conservative trail shoe; surface is inferred, so do not optimize for speed here.

The weakness score penalizes inferred/unknown surface, missing direct visual proof, missing local context, and lower surface confidence. Raw max grade is no longer used as evidence weakness.

## 9. Late-Race Runnable/Hard-Surface Audit

The late-race block is not uniformly runnable. Contiguous windows from km 106 onward:

- km 106-107: mixed runnable with caution.
- km 108-109: technical or footing-limited.
- km 110-110: mixed runnable with caution.
- km 111-111: technical or footing-limited.
- km 112-116: genuinely runnable hard/mixed.
- km 117-117: mixed runnable with caution.
- km 118-119: technical or footing-limited.
- km 120-120: mixed runnable with caution.
- km 121-122: technical or footing-limited.
- km 123-124: genuinely runnable hard/mixed.

“Runnable” here requires hard/mixed surface and no p95-grade spike above the threshold. Official T2/T3 labels alone are not used as runnability proof.

## 10. Shoe/Equipment Implications

High-confidence conclusion: choose a real trail shoe, not a road-trail hybrid optimized for pavement. The current evidence supports wet rubber, stable platform, secure upper lockdown, and toe protection. The overbuilt-shoe penalty is real on hard/runnable sections, but the downside of under-gripped shoes is larger in wet forest, Stol/Karawanks, and late technical sections.

Do not overread: exact surface percentages in inferred road/path segments, broad official video contexts, and any Hike.uno variant-route context. Those should guide caution, not prove every meter.

Poles: highest expected value from Žirovnica/Završnica/Stol and technical descents. Stow on genuinely hard/runnable windows unless fatigue or wet conditions justify them.

Lights: the 21:00 start makes early route finding and footing detection a material equipment issue. Use the official required two headlamps as a floor, not the performance target.

## 11. Wet-Weather Alternate Interpretation

Wet weather shifts the decision toward outsole confidence and away from road speed. Specific triggers are in the km summary: high `wet_traction_risk`, high `night_visibility_risk`, p95 grade spikes, and inferred surfaces where OSM lacks surface/smoothness tags.

## 12. Final Adversarial Audit

Claims still mostly OSM inference: all rows with high `unknown_or_inferred_pct`, bare highway/path tags, or missing local context.

Visual evidence that might be nearby but not the race route: every official thumbnail and every local guide photo set until a frame/photo is geolocated to the GPX line.

Official pages that conflict: the two GPX URLs differ by filename/path but hash to identical local bytes. Race guide remains unavailable.

Hard-surface claims that may be undercounted: village approaches, Bled/Žirovnica valley transitions, Gozd Martuljek/Kranjska Gora, and blank road surfaces now classified as inferred rather than asphalt.

Rocky/technical claims that may be overgeneralized: Stol/Karawanks is not all limestone block; the model separates grassy alpine, high ridge, gravel/path, and inferred alpine/open trail.

Conclusion most vulnerable to August GPX changes: late-race hard-surface percentage and any aid-boundary kilometer attribution. Re-run the generator if the GPX changes.

## Proof Of Done

- Source inventory rows: 22
- Archived surface-relevant evidence rows: 4
- Candidate/search/probe rows logged: 38
- Planned/not-yet-verified query rows: 16
- Direct geotagged route visual items: 0
- Official broad visual context items: 7
- Local adjacent-route visual/context items: 3
- Videos/photo sets/pages logged: 10
- Micro-segments in ledger: 1091
- Course with direct geotagged route visual proof: 0.0%
- Course with broad official visual context: 20.5%
- Course with local adjacent-route context: 24.1%
- Course relying mainly on OSM/map inference: 56.2%
- Course weak/low-confidence by evidence score: 64.3%
- Ten weakest kilometers by evidence score: km 29, km 92, km 93, km 94, km 14, km 28, km 106, km 6, km 95, km 96
- Official GPX SHA-256: `971fbad73773809a9c72d09cb18615844956104c680557181e4db13526ed63ff`
- Changed from v1: unresolved because v1 files were not mounted.

Generated artifacts:

Project-relative generated artifacts:

- `outputs/jat-120k-trail-conditions-dossier-v2.md`
- `research/source-candidate-log-v2.csv`
- `research/source-inventory-v2.csv`
- `research/micro-segment-surface-ledger-v2.csv`
- `research/km-surface-summary-v2.csv`
- `research/visual-evidence-index-v2.csv`
- `outputs/visual-evidence-v2/selected-stills-contact-sheet.jpg`
- `outputs/visual-evidence-v2/stills-list.csv`
- `outputs/visual-evidence-v2/`
