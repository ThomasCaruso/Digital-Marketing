# FORM product loop implementation plan
Goal: Implement the supplied product model within the approved five-tab presentation.
Architecture: One persisted Zustand domain store; stable catalog IDs; immutable saved look snapshots. A pure fixture engine ranks recommendations and builds/adjusts complete looks without services. Retailer access is an isolated demo adapter.
Tech: Expo SDK 57, Expo Router, React Native, AsyncStorage.
Execution: Inline in the existing working tree to preserve approved uncommitted UI. No commits or pushes.
- [x] Add behavioral fixture tests: budget/brand/style changes, feedback exhaustion, request retention, adjustments.
- [x] Extend domain types and catalog; implement deterministic ranking and request-aware MockLooksProvider.
- [x] Extend existing storage with pieces, recommendation review, profile updates and bounded sessions; migrate defaults.
- [x] Connect For You; remove duplicate New; completion and refresh; product detail and related edit.
- [x] Connect Edits/detail: horizontal paging, progress, garments, save, try-on, request form, six adjustments.
- [x] Replace try-on handle with explicit Original/Preview; current/saved look selection.
- [x] Connect Saved and editable You to durable state with consistent navigation.
- [x] Improve contrast, touch regions, screen-reader labels and reduce-motion handling.
- [x] Run fixture tests, npx tsc --noEmit, npx expo lint.
- [x] Exercise all requested paths and cold restart on connected Samsung A14; capture evidence.
Design decisions: Fixture product identity is stable across sessions. Saved pieces remain excluded from unseen recommendations, passed items excluded until explicit refresh. Profile changes rerank unseen items without clearing reviewed IDs. Request budget is a whole-look cap; impossible fixture requests show an honest empty result. Modified outfits use a styling board rather than unchanged photography. Product gallery photography is labeled fixture imagery. Try-on is a static demo on a reference model with no fit claims.
