# Feasibility Studio — implementation notes

React implementation of the Claude Design handoff in `project/Feasibility Studio.dc.html`.
Desktop 1440, light mode, Bahasa Indonesia — matching the prototype the user signed off on.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm run typecheck
```

## Stack

React 19 + TypeScript + Vite. No UI library — the prototype's visual language is
specific enough that tokens plus inline style objects reproduce it exactly and stay
readable next to the design file.

## Layout of the code

```
src/
  theme/tokens.ts       colors, font shorthands, layout constants (literal from the prototype)
  theme/styles.ts       repeated style fragments: card, table head cell, chip, buttons
  styles/global.css     reset, scrollbar, keyframes, and every :hover rule
  types.ts              domain types for all six screens + the three drawers
  data/                 fixtures — the Cluster Anggrek sample project, verbatim numbers
  api/client.ts         mock transport: latency, in-memory cache, error type
  api/index.ts          one function per endpoint, keyed by the URL it will call for real
  hooks/useResource.ts  reads one endpoint; warm cache skips the loading frame
  state/settings.tsx    sidebar theme + AI banner toggles
  components/           Sidebar, Header, AiBanner, TweaksPanel, primitives
  screens/              Dashboard, Spesifikasi, BuildUpCost, BiayaMutuWaktu,
                        GambarKomposit, BqRab
  drawers/              Drawer shell + Volume / VE / Clash bodies
  lib/scenario.ts       weighting, scoring, radar geometry, recommendation
```

## Data layer

Every screen reads through `src/api`, which returns promises and exposes cache keys
shaped like the eventual REST paths (`/projects/:id/bq`). Swapping the fixtures for
`fetch` is a change inside `api/` only — components already handle pending and error
states. `LATENCY` in `api/client.ts` controls the simulated round trip; results are
memoised so navigating back to a screen is instant rather than re-flashing a skeleton.

Two operations are modelled as jobs rather than reads, because the design gives them
progress UI: `parseSpecDocuments` (Spesifikasi "Memproses") and `recalculateBq`
(BQ "Hitung ulang volume & BQ"). Both are cancellable and resolve back into the
loaded state.

## Interactions carried over from the prototype

- sidebar navigation between the six screens; header project switcher (Esc / click-away closes)
- right drawer in three variants — volume traceability (BQ item), VE proposal, clash detail;
  each fetches its own detail payload and closes on Esc or overlay click
- **Spesifikasi**: Terisi / Kosong / Memproses / Parsial state switcher, all four wired
- **Biaya–Mutu–Waktu**: three weight sliders that always renormalise to 100%; scores,
  radar polygons and the recommendation block all recompute live (`lib/scenario.ts`)
- **Gambar Komposit**: four layer toggles + opacity slider driving the SVG overlay,
  floor segmented control, clash rows open the drawer
- **BQ / RAB**: three tabs, collapsible divisions (1 and 2 open by default, as in the
  prototype), item rows open the volume drawer, sticky dark total row
- **Tampilan** panel (bottom right): sidebar theme gelap/terang and the AI-verification
  banner — the two switches the prototype exposed through the design tool's Tweaks panel

## Notes

- Numbers, copy, and unit prices are the prototype's — AHSP 2026 + 2026 mid-market
  ranges used as sample figures. They are not verified quantities; the in-app banner
  says the same thing.
- Drawing views are the prototype's schematic SVG placeholders, not real PDF/DWG rendering.
- IBM Plex Sans / IBM Plex Mono load from Google Fonts, as in the prototype. Self-host
  them if the deployment target blocks that origin.
