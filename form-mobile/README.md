# FORM mobile

React Native / Expo consumer app for FORM. Phase 1: native product experience
on demo data only — no Supabase, Rakuten, GLM, FASHN, or payments. The web
frontend (`ai-stylist-mvp/`) and all backend code remain untouched.

## Run on a physical device (Expo Go)

```bash
npx expo start
```

Scan the QR code with **Expo Go** (Android: Play Store). Phone and computer
must share a Wi-Fi network — allow Node.js through Windows Firewall when
prompted. If LAN mode fails, use `npx expo start --tunnel`.

## Architecture

```
app/                    Expo Router routes (file-based)
  _layout.tsx           root stack: fonts, splash, toast
  index.tsx             cover
  results.tsx           three looks for an occasion (pushed from Home)
  (tabs)/               bottom tabs: Home, Saved, Your FORM
src/
  theme/                design tokens + typography (port of the web :root)
  domain/               types, pure selectors, pure look transforms
  data/                 demo catalog (prices are integer cents)
  providers/            LooksProvider boundary — MockLooksProvider today,
                        real orchestrator later; screens never touch raw data
  state/                single Zustand store, persisted to AsyncStorage
  components/           figure placeholder, look scene/card, buttons, toast
```

Invariants carried over from the plan:

- **Money is integer cents** everywhere internally; formatted only at the UI edge.
- **Saved looks are immutable snapshots** (look, colors, prices, occasion,
  timestamp) — the web demo's saved-by-id resolution bug is intentionally not
  ported.
- **Session look ids are unique** per generated session.
- Reference photos (later phase) stay device-local via file URIs.

## Phase 1 stop point

Implemented: scaffold, theme, routing shell, bottom tabs, Home, loading
experience, Results, Home → Results state flow, persistence.

Next phase (after device review): look detail modal, swap bottom sheet,
color swatches, simulated try-on, full Saved board, Your FORM, onboarding
with `expo-image-picker`.
