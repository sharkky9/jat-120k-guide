# Visual Atlas Evidence Overview v3

Generated: 2026-06-20. This catalog is generated from `outputs/visual-evidence-v3/visual-atlas-data.json` and the v3 CSV exports. It separates same-route/section evidence from broad race context, event-wide video thumbnails, page chrome, remote-only rows, duplicate/low-value rows, and access-limited sources.

## Verifier Summary
- Source candidates: 548
- Visual records: 5559
- Downloaded local assets: 5559
- Inspectable assets: 3779
- Section/same-location visual rows: 1135
- Video/source thumbnail rows: 1532
- Remote-only rows: 0
- Failed / low-yield query classes logged: 69
- Harvest errors logged: 29

## Inventory
- sources: 548
- visual_items: 5559
- downloaded_assets: 5559
- inspectable_assets: 3779
- thumbnail_context_records: 1532
- remote_only_records: 0
- higher_confidence_visual_items: 1135
- section_or_same_location_records: 1135
- coverage_sections: 9
- failed_queries: 69
- download_errors: 29
- latest harvest source candidates: 334
- latest harvest visual rows: 2411

## Source Exhaustion By Surface
| Surface | Source candidates | Visual rows | Inspectable | Route/place | Thumbnail/remote | Limited | Source-only | Latest pass | Failed query refs | Blockers | Caveat |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| Video platforms and race vlogs | 232 | 1570 | 45 | 17 | 1525 | 27 | 2 | 115 | FQ001;FQ002;FQ013;FQ015;FQ017;FQ019;FQ020;FQ021;FQ023;FQ024;FQ025;FQ026;FQ027;FQ028;FQ029;FQ030;FQ031;FQ032;FQ033;FQ034;FQ035;FQ037;FQ040;FQ042;FQ043;FQ044;FQ045;FQ046;FQ047;FQ056;FQ060;FQ067;FQ068;FQ069 | UB001;UB004 | Public video leads are cataloged; most YouTube rows are thumbnails until true frames are extracted. |
| Local trail/photo context | 129 | 2412 | 2218 | 1036 | 0 | 14 | 3 | 69 | FQ007;FQ010;FQ011;FQ017;FQ018;FQ021;FQ024;FQ025;FQ026;FQ028;FQ031;FQ033;FQ034;FQ035;FQ039;FQ040;FQ041;FQ042;FQ043;FQ045;FQ046;FQ047;FQ050;FQ051;FQ052;FQ053;FQ055;FQ059;FQ061;FQ062;FQ064;FQ065 | UB006 | Open local and named-route imagery improves section context, but blocked user-photo/activity galleries mean exact-route local imagery is bounded rather than fully exhausted. |
| Social video/photo surfaces | 94 | 184 | 177 | 3 | 7 | 3 | 4 | 91 | FQ003;FQ004;FQ016;FQ017;FQ019;FQ021;FQ024;FQ025;FQ028;FQ029;FQ031;FQ032;FQ033;FQ035;FQ036;FQ040;FQ042;FQ044;FQ045;FQ046 | UB002 | Known public social URLs are cataloged; broad profile/feed enumeration remains access-limited. |
| Open race reports and photo pages | 68 | 1289 | 1236 | 2 | 0 | 3 | 5 | 51 | FQ005;FQ009;FQ010;FQ011;FQ012;FQ014;FQ016;FQ017;FQ021;FQ022;FQ035;FQ036;FQ039;FQ040;FQ041;FQ042;FQ044;FQ045;FQ046;FQ047;FQ048;FQ049;FQ051;FQ052;FQ053;FQ055;FQ058;FQ062;FQ063;FQ064;FQ065 | UB005 | Open reports and inline photo pages are retained when downloadable; page chrome and duplicates are downgraded. |
| Street-level and open map imagery | 22 | 78 | 77 | 77 | 0 | 6 | 6 | 8 | FQ008;FQ014;FQ016;FQ021;FQ025;FQ031;FQ040;FQ045;FQ046 | UB004 | Open street-level substitutes are retained where APIs allow; browser-only surfaces remain bounded. |
| Gated official/photo-service surfaces | 3 | 26 | 26 | 0 | 0 | 3 | 2 | 0 | FQ005;FQ009;FQ010;FQ011;FQ012;FQ016;FQ017;FQ018;FQ019;FQ021;FQ025;FQ029;FQ031;FQ035;FQ036;FQ039;FQ040;FQ042;FQ044;FQ045;FQ046;FQ048;FQ049;FQ055;FQ062;FQ064;FQ065;FQ066 | UB003 | Official service, press/media-kit, or gated gallery leads retained, but not open-harvest proof. |

## Unresolved Access And Extraction Blockers
- **UB001 / YouTube true-frame extraction**: Blocked by HTTP 429, bot/sign-in challenges, and storyboard 403 responses from this environment. Impact: YouTube rows remain thumbnails/autostills and source leads unless another route produces timestamped frames. Current handling: Retain source URLs, public thumbnail/autostill assets, oEmbed metadata, and failed-query rows FQ013/FQ015/FQ020/FQ023/FQ030/FQ034/FQ037/FQ046. Proof needed: Browser/cookie-assisted or otherwise authorized extraction of representative frames with timestamp and section localization.
- **UB002 / Facebook, Instagram, and residual social-feed enumeration**: Direct known Facebook reels are harvestable and a bounded TikTok profile crawl retained TK005-TK081, but Facebook page/reel/photo and Instagram profile enumeration remain login-heavy or JS-limited. Impact: Official/social race imagery cannot be claimed exhaustively enumerated from public command-line access; TikTok is bounded by the 2026-06-20 crawl rather than fully closed across all social surfaces. Current handling: Catalog known Facebook reels FB001-FB009 with frames where possible, retain PG004/PG005 and TK001 as access-limited profile/source-catalog rows, retain TK005-TK081 from the successful TikTok profile crawl, and log unresolved rows FQ003/FQ004/FQ016/FQ021/FQ025/FQ028/FQ033/FQ036. Proof needed: Authorized browser/API review or export of official/public social albums, reels, posts, and profile inventories with duplicate accounting.
- **UB003 / Sportograf and official press/media assets**: Official photo service, subevent pages, and press/media-kit surfaces are gated, terms-limited, search/pay-flow oriented, or not exposed as stable open galleries. Impact: Personal bib/photo-location imagery and official press assets likely exist but are not harvestable as public route evidence here. Current handling: Retain PG001/PG002 as source candidates, keep PG003 as source-only after filtering false-positive global/Istria media-shell filenames, treat the external media-kit flow as gated, and log Sportograf/official photo/media-kit limitations in FQ005/FQ036/FQ066/FQ068. Proof needed: Open gallery access, official media export, media-kit/accreditation access, or user-authorized photo access with license/access constraints recorded.
- **UB004 / Vimeo, Mapillary, Google Street View, and similar browser-only visual surfaces**: Vimeo is Cloudflare-blocked; Mapillary and Google Street View are login/browser/API constrained for this workflow. Impact: Some street-level or third-party video imagery may remain undiscovered or link-only. Current handling: Use open KartaView/Panoramax/Commons alternatives where available and retain failed-search rows FQ002/FQ008/FQ016/FQ021/FQ025/FQ035. Proof needed: Accessible exports or compliant manual/browser review with source URLs and no prohibited scraping.
- **UB005 / UTMB Live/LiveTrail and runner-detail/browser shells**: Public command-line API access now exposes point-100 finish livecam stills, but the app shells, runner-detail pages, and any authorized/browser-only media beyond that endpoint remain incompletely enumerable. Impact: PG073 provides official finish-line race-day imagery; upstream course surface and broader runner-detail/live-page imagery remain represented as watchlist, duplicate-banner, or source-only evidence. Current handling: Catalog representative PG045/PG055/PG056/PG062/PG063/PG071/PG072 rows, integrate public point-100 finish livecam stills as PG073, and log live-shell/official-placeholder/livecam limitations in FQ017/FQ021/FQ023/FQ025/FQ026/FQ029/FQ038/FQ047/FQ063. Proof needed: Authorized/browser-visible image enumeration with duplicate filtering, confirmation of any non-finish media, and proof that runner-detail/livecam/photo endpoints beyond public point 100 are exhausted.
- **UB006 / Local route/user-photo and activity-platform galleries**: Some route-near local gallery and activity-platform sources remain browser-visible but command-line blocked, challenge-gated, 403/429 limited, or expose text without stable image URLs; LR036/LR073/LR075/LR083/LR095 now have bounded direct/proxied image recoveries. Impact: Local visual coverage is strong where open pages are harvestable, but exact/current route coverage is not fully exhausted for remaining Wikiloc/Bergfex/AllTrails/Outdooractive-style and similar user-photo galleries. Current handling: Integrate recovered LR036/LR073/LR075/LR083/LR095 imagery with explicit proxy/cache notes, retain still-blocked/source-only local candidates such as LR035/LR094 and broader activity-platform gaps, and count source-only rows in the source-exhaustion table. Proof needed: Compliant browser/API export or direct image URL recovery for the remaining blocked local/activity galleries, with duplicate filtering and route-localization caveats.

## Display Status
- display: 3470
- thumbnail-only: 1532
- small-thumbnail: 309
- duplicate: 166
- non-evidence: 82

## Evidence Scope
- thumbnail-only context: 1532
- adjacent context: 1205
- same-location anchor: 619
- section/same-route: 516
- race-wide current-route: 499
- broad/older context: 398
- uncategorized: 388
- excluded/non-evidence: 248
- overlapping race route: 112
- local corridor context: 42

## Visual Evidence Class
- local route photo: 1846
- video thumbnail/source-existence only: 1532
- official/race media: 638
- race media/blog: 594
- small local route photo: 277
- video-derived frame/contact sheet: 190
- duplicate: 166
- non-evidence: 82
- street-level/open image: 77
- commons/open image: 67
- local route-gallery corridor photo: 42
- small race media/blog: 29
- video thumbnail: 16
- small commons/open image: 1
- small official/race media: 1
- small video thumbnail: 1

## Route/Place Course-Section Coverage
| Section | km | Visual rows | Full display assets | Small thumbnail assets | Inspectable assets | Section/same-location rows | Inspectable route/place rows | Section video/source rows | Global video thumbnail rows | Candidate sources | Source-only candidates | No local inspectable sources | Gap note |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Radovljica to Talez | 0.0-11.9 | 1395 | 698 | 41 | 739 | 87 | 87 | 33 | 567 | 233 | 14 | 102 | exact/local inspectable evidence exists (87 rows), but global thumbnails/uncategorized context dominate (921 rows); not exact-current-route exhausted |
| Talez to Kupljenik/Babji zob | 11.9-20.7 | 1608 | 794 | 143 | 937 | 268 | 268 | 48 | 567 | 242 | 13 | 103 | inspectable exact/local visual evidence present (268 rows); still verify exact route frame-by-frame |
| Kupljenik/Bohinjska Bela/Bled | 20.7-46.1 | 1841 | 883 | 132 | 1015 | 222 | 222 | 69 | 704 | 267 | 14 | 127 | inspectable exact/local visual evidence present (222 rows); still verify exact route frame-by-frame |
| Bled to Zirovnica | 46.1-59.9 | 1859 | 1040 | 35 | 1075 | 262 | 262 | 19 | 691 | 257 | 15 | 119 | inspectable exact/local visual evidence present (262 rows); still verify exact route frame-by-frame |
| Zirovnica/Zavrsnica to Stol | 59.9-77.4 | 2064 | 893 | 138 | 1031 | 172 | 172 | 91 | 865 | 306 | 14 | 154 | exact/local inspectable evidence exists (172 rows), but global thumbnails/uncategorized context dominate (1224 rows); not exact-current-route exhausted |
| Stol / Sedlo Suha / Golica ridge | 77.4-90.0 | 2267 | 1047 | 123 | 1170 | 252 | 252 | 170 | 872 | 326 | 14 | 166 | Sedlo Suha exact-photo gap improved by LR020 Hribi.net same-location route imagery; still verify frame-by-frame against the race line |
| Sedlo Suha to Dovje/Mojstrana | 90.0-106.2 | 2879 | 1665 | 31 | 1696 | 244 | 244 | 191 | 878 | 359 | 15 | 171 | Sedlo Suha exact-photo gap improved by LR020 Hribi.net same-location route imagery; still verify frame-by-frame against the race line |
| Dovje to Gozd Martuljek | 106.2-117.1 | 2618 | 1418 | 31 | 1449 | 105 | 105 | 211 | 864 | 341 | 16 | 174 | exact/local inspectable evidence exists (105 rows), but global thumbnails/uncategorized context dominate (1237 rows); not exact-current-route exhausted |
| Gozd Martuljek/Srednji Vrh to Kranjska Gora | 117.1-124.5 | 3286 | 2008 | 69 | 2077 | 148 | 148 | 284 | 857 | 366 | 15 | 182 | exact/local inspectable evidence exists (148 rows), but global thumbnails/uncategorized context dominate (1244 rows); not exact-current-route exhausted |
