# FORM product loop review
Date: 2026-09-29
Status: Ready for human physical review. No commit or push.
Scope: Existing approved typography, palette, five-tab structure and editorial composition retained. Local fixture behavior only. Original curated photographs remain available; generated and adjusted outfits use the existing garment board so the visual reflects the chosen pieces. No live Rakuten, GLM, FASHN, auth, payment, checkout, inventory or production recommendation services were added.

## 1. Product loop
Discovery -> product -> complete edit -> adjustment -> preview -> save -> personalization is connected through one persisted store.

## 2. For You
Stable catalog IDs; session review states; save/pass advance; reviewed items never repeat until explicit refresh. Saved pieces persist and remain excluded from unseen discovery. Removing a save treats the reviewed item as passed for that session. New was removed. Completion and refresh verified on A14: ten remaining pieces reviewed with no repetition, then "That's today's edit."; refresh preserved saved pieces.

## 3. Product detail
Full view/detail crop gallery, brand, name, color, price, fixture material and available sizes, current profile-based demo recommended size, short demo-rule reasoning, related complete look, save/not-for-me, isolated demo retailer destination. All catalog pieces have a complete fixture pairing. Retailer button displays an honest demo dialog without external catalog or stock calls.

## 4. Edits / Create edit
Horizontal paging, numbered progress and selectable indicators; tappable garments; Save look; Try this on; six deterministic adjustments. Secondary Create an edit route has occasion, dress code, budget, optional location and notes. MockLooksProvider stores the exact request on the Session. Eight recent sessions remain accessible. Impossible requests produce an empty state. Generated budget is capped by both request and profile.
A14 request: Dinner in Manhattan / Smart casual / $350 / New York / Drinks after understated. Three looks generated; request visible in detail. Lower price changed $203 to $163.

## 5. Try On
Original/Preview controls replace the inactive comparison handle. Static reference-model photographs and fixture garment boards are explicitly demo content; no fit, exact-size or production VTON claims. Current, related and saved looks can be selected and saved. Generated/adjusted edits show a board rather than an unrelated model outfit.

## 6. Saved
Looks and Pieces persist. Each thumbnail and title share one Pressable: look -> edit detail; piece -> product detail. Saved look contents and original requests are snapshots; later adjustments and history trimming do not mutate them.

## 7. You
Styles, favorite/avoided colors, preferred/avoided brands, height, top size, waist, inseam, shoe size and typical look budget are editable. Avoid lists exclude fixtures; budget excludes expensive pieces and caps generated outfits; styles/favorites rank items; measurements populate demo size suggestions. Only catalog-supported styles are offered; older unsupported selections remain removable and explicitly labeled.
A14: avoided COS, set $200 budget; eligible collection changed from 13 to 11. Adding Classic showed Straight Trouser next; removing Classic returned Lambswool Crewneck.

## 8. Persistence
Existing AsyncStorage key retained; older profile defaults merged without erasing prior history. Saves, feedback, profile, selected look, generated sessions and requests survive restart. Saved requests remain available after source history expires and still cap refinements. Storage failures show a visible notice rather than blocking hydration indefinitely.
A14 process force-stop and cold launch verified. Development client needed its local-server deep link to reopen the bundle; no storage reset or reinstall was used. Budget, avoided COS, styles, saved pieces/looks, request and active generated session retained.

## 9. Accessibility
Secondary text #645f57 has contrast ratios 5.49:1 on paper, 4.84:1 on paper2, 4.75:1 on the neutral pill surface. Controls have 48dp minimum targets or enlarged hit regions. Icon actions carry labels; saved, tab and checkbox states exposed. Navigation honors OS reduce motion; programmatic paging and toast confirmations do not animate. Form keyboard taps preserved.
TalkBack and large-font exhaustive auditing remain human review items.

## 10. Files changed in this phase
Modified:
- app/(tabs)/home.tsx
- app/(tabs)/edits.tsx
- app/(tabs)/tryon.tsx
- app/(tabs)/saved.tsx
- app/(tabs)/profile.tsx
- app/_layout.tsx
- app/results.tsx
- src/components/Editorial.tsx
- src/components/Toast.tsx
- src/data/preview.ts (assets only; unused fake collections removed)
- src/domain/types.ts
- src/providers/mockLooksProvider.ts
- src/providers/types.ts
- src/state/store.ts
- src/theme/tokens.ts
Added:
- app/product.tsx
- app/create-edit.tsx
- app/edit-profile.tsx
- src/components/DetailHeader.tsx
- src/components/LookControls.tsx
- src/components/LookVisual.tsx
- src/components/ProductVisual.tsx
- src/data/catalog.ts
- src/domain/fixtureEngine.ts
- src/hooks/useCurrentEdit.ts
- src/hooks/useReduceMotion.ts
- src/providers/retailerDestination.ts
- scripts/test-product-loop.cjs
- scripts/test-persistence.cjs
- docs/superpowers/plans/2026-09-29-product-loop.md
- docs/product-loop-review.md
Removed:
- src/state/previewStore.ts (disconnected temporary state)
Other working-tree changes from the approved UI phase were already present and remain uncommitted.

## 11. TypeScript
npx tsc --noEmit: exit 0.

## 12. Lint and regression checks
npx expo lint: exit 0, zero errors/warnings.
node scripts/test-persistence.cjs: fixture and persistence suites pass.
Coverage: ranking, budgets, exclusions, feed exhaustion, stable identity, requests, all six adjustments, different-content refinement IDs, expired-session request budgets, snapshots, legacy defaults, persistence and refresh.

## 13. Device QA
Physical device: Samsung A14 SM-A146U, connected via USB. ADB taps, swipes, keyboard input, accessibility-tree assertions and screenshots used.
Verified: For You pass/save/detail/gallery/retailer demo/related edit; Edits swipe/progress/product inspection/create request/adjust/save; Try On select/Original/Preview/save; Saved both categories and consistent details; profile changes, ranking response, force-stop restart persistence, exhaustion and refresh.
Final reviewer findings fixed: saved request caps after history trimming; distinct refinement identities; unsupported styles.
Screenshots and helper scripts: C:/Users/Tommy/form-product-qa/
Evidence: 06-create-request, 08-adjusted-look, 09-tryon-preview, 10-tryon-original, 11-saved-look-detail, 12-saved-piece-detail, 13-preference-ranking, 14-classic-removed, 15-profile-after-restart, 16-saved-after-restart, 17-feed-complete, 18-feed-refreshed, 20-final-preview.

## 14. Physical review
Ready. Human visual/tactile review and broader TalkBack/large-font checks pending. QA changed the device profile to a $200 budget with COS avoided, and retained demo saves and requests so the preference response is visible.
