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

## Backend (Neon + Blob) & Vercel deployment

The data layer is backed by a real database when deployed on Vercel. Nothing in
the UI changes — `src/api` still exposes the same functions — but reads now go
through serverless functions in `/api`:

```
api/
  _lib/db.ts            Neon client + idempotent schema bootstrap
  _lib/http.ts          api-key auth, CORS, raw-body reader
  health.ts             GET /api/health — verification endpoint
  store/[...path].ts    GET/PUT the JSONB store, keyed by the REST paths in `keys`
  documents.ts          GET list / POST upload (Blob file + Neon metadata row)
```

**How the data gets there.** The store is a `store(path, value jsonb)` table
whose keys are exactly the endpoint paths already in `src/api/index.ts`
(`/projects/:id/bq`, …). On first read of a resource the client gets a 404,
renders the bundled fixture, and seeds that fixture into Neon; every later read
is served from Neon. So the database fills itself from the fixtures on first use
— no separate seed step. If `/api` is unreachable (e.g. plain `npm run dev`
without `vercel dev`), reads fall back to the fixtures and the app still runs.

**Blob.** The Spesifikasi "Upload dokumen" button uploads real files to Vercel
Blob and records `{name, url, size}` in Neon; the chips list what's stored.

**Environment variables** (set in Vercel → Settings → Environment Variables,
see `.env.example`):

| Var | Source | Purpose |
|-----|--------|---------|
| `DATABASE_URL` (or `POSTGRES_URL`) | Neon integration | Postgres connection |
| `BLOB_READ_WRITE_TOKEN` | Blob integration | file uploads |
| `API_KEY` | you | authorizes writes; if unset, writes are open |
| `VITE_API_KEY` | you | public key the browser sends with writes — set equal to `API_KEY` |

**Verify the setup:** after deploying, open `https://<your-app>/api/health`. A
healthy setup returns `{ "ok": true, "neon": { "ok": true, … }, "blob": { "configured": true }, … }`.
If `neon.ok` is false it echoes the connection error; if `blob.configured` is
false the Blob token is missing.

**Local development** with the backend live uses `vercel dev` (needs the same
env vars in `.env.local`). Plain `npm run dev` works too, on fixtures.

## Notes

- Numbers, copy, and unit prices are the prototype's — AHSP 2026 + 2026 mid-market
  ranges used as sample figures. They are not verified quantities; the in-app banner
  says the same thing.
- Drawing views are the prototype's schematic SVG placeholders, not real PDF/DWG rendering.
- IBM Plex Sans / IBM Plex Mono load from Google Fonts, as in the prototype. Self-host
  them if the deployment target blocks that origin.
