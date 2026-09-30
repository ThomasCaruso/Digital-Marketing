# FORM discovery refinement implementation plan

Approved design: C:/Users/Tommy/form-product-qa/refinement-design.md.
Execution: inline in the current working tree to preserve the existing uncommitted five-tab UI. No commit or push.

Goal: a restrained discovery screen with deliberate gesture feedback and consistent interaction polish.
Architecture: persisted decisions stay in the Zustand store; transient undo captures only the affected product. A focused discovery component owns gestures and transition locks. Shared press and haptic helpers keep feedback consistent.
Tech stack: existing Expo SDK 57, React Native Animated/PanResponder, Zustand, expo-haptics.

- [x] Add scripts/test-discovery.cjs using the existing TypeScript transpile and memory-storage harness. Assert duplicate decisions do not advance twice, undo restores eligibility without losing other saves, refresh/profile changes invalidate undo, and undo does not survive restart. Run node scripts/test-discovery.cjs and observe failure.
- [x] Add reviewPiece(product, status) and undoPieceReview() to src/state/store.ts. Keep discoveryUndo outside partialize; invalidate on refresh, profile changes and product mutations. Add src/domain/discoveryGesture.ts and threshold/cancellation tests. Run discovery and persistence checks.
- [x] Create src/components/DiscoveryCard.tsx: horizontal-only responder, guarded native exit/entry transitions, snap-back cancellation, reduced-motion behavior, accessible alternatives. Replace app/(tabs)/home.tsx with compact masthead, framed garment stage, concise hierarchy, pass/save and undo, completion/refresh routes.
- [x] Create src/components/MotionPressable.tsx and src/utils/haptics.ts. Refine src/components/FormTabBar.tsx, Editorial.tsx, DetailHeader.tsx, AppButton.tsx and Toast.tsx for consistent touch feedback and restrained motion. Keep accessible targets and OS reduced-motion behavior.
- [x] Run npx tsc --noEmit, npx expo lint, node scripts/test-discovery.cjs and node scripts/test-persistence.cjs. Bundle Android using Expo export to verify native imports. Review diff and any available device/browser preview; record actual verification limits.

## Angled swipe and real stack refinement
User directed continuation: improve motion, reveal the real next card and show stacked corners. Implementation uses shared DiscoveryCardFace presentation for the front and the next two unseen products. Preview layers ignore input and are hidden from accessibility. Depth transforms fan the corners at rest and promote the next piece during horizontal drag. The front remains opaque, pivots below its center, and exits at up to 22 degrees. Release continues from the dragged position with velocity-informed duration; canceled gestures settle via a damped spring. Haptics fire at decision release. Keep the deck mounted between products and reset native values before painting so promotion has no entrance fade. Preserve existing decision threshold, undo and focus-cancellation behavior.

- [x] Extract shared card face; pass two upcoming products from Home.
- [x] Implement depth transforms, angled travel, spring return and persistent deck handoff.
- [x] Run TypeScript, Expo lint and existing discovery regression checks.
- [x] Verify native rest/drag screenshots, both directions, cancellation, undo and button decisions. Restore QA decisions.

## Fixed Home, directional travel and glass material
- [x] Replace Home ScrollView with a fixed scene sized from onLayout; compact card presentation keeps controls inside shorter screens.
- [x] Test exit-vector quadrants and slope before implementation; track both drag axes and extend the release vector without downward bias. Keep anchored stack and deliberate decision threshold.
- [x] Add reusable layered GlassMaterial with existing Expo LinearGradient to navigation, selected tab, undo and decision controls; soft background tint and fine lens edges. Apple Liquid Glass is iOS-only; this Android material uses translucency and gradients without new native modules.
- [x] Run typecheck, lint, discovery and direction tests. Check physical phone for static vertical layout, diagonal swipes, undo, controls and glass rendering.


## Native tracking correction
- [x] Native UI-thread gesture tracking, resisted vertical travel, atomic pose, controlled spring return and focus-safe commit guards.
- [x] Optimized Android build, direct transform configuration and native gesture press targets.
- [x] TypeScript, lint, regression checks and user-confirmed slow finger drag ('Smooth and controlled').
