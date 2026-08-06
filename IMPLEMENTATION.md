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
  lib/buildup.ts        bill arithmetic (rate/amount/subtotal/total) + transport
  lib/buildupExport.ts  the bill as .xlsx / PDF / CSV / JSON
```

## Price basis

`src/data/priceBasis.ts` is the single source of truth: **AHSP 2026 · DKI
Jakarta**. It used to be a label and nothing more — the sidebar said "Jawa
Barat" while the sample figures were hand-written and generated bills were
priced from the model's own notion of Indonesian market rates, which reads as a
national average from whenever its training data ends. That is where the low
estimates came from.

The module now carries the region, the per-m² band per quality class, and
anchor rates for the items that dominate a residential bill. Those anchors are
sent to the model with every `/api/build-up` request and the prompt makes them
binding, so a generated bill is priced on the same basis the rest of the app
quotes. The prompt also asks the model to divide its own total by the floor
area and compare it against the band before answering — a bill landing under it
is nearly always missing scope rather than being efficient.

**What the anchors are, and are not.** They are indicative market rates,
restated from the negotiated bill in `Bill No.2 — Phs 1 (Rev Nego 18 Des '24,
PT.AM)` and escalated to a 2026 DKI basis (×1,18 escalation, ×1,12 regional).
They are **not** the published Permen PUPR AHSP coefficients or the DKI HSPK
tables. Upload that price list in **Pengetahuan** to quote the official
figures; the anchors then act as the fallback rather than the source.

The sample-project fixtures were restated onto the same basis — they were low
even for the Jawa Barat basis they claimed. Uplift is per division (1,38
structure through 1,50 preliminaries, weighted 1,43), which moves the sample
from Rp 6.148.000 to **Rp 8.768.000 per m²**, inside the 7,5–10 jt band for the
middle-class class it is labelled. Every dependent figure was recomputed:
division totals, item rates, collapsed remainders, the recap ladder, VE savings
and their percentages, the waterfall, scenario costs, and the dashboard KPIs.

## Build Up Cost — bill of quantities from an uploaded drawing set

The **Build Up Cost & VE** screen has two tabs. *Ringkasan & VE* is the
signed-off summary of a project that already has figures. *Build Up Cost dari
dokumen* is where those figures come from when all the user has is a drawing
set, so a project with no fixture opens there rather than on an empty state.

The workflow is upload → read → price → export:

1. **Read** — `lib/extract.ts` pulls the text layer out of a CAD-exported PDF
   (room names, FFL levels, grid references, dimensions) or renders the pages
   for OCR when there is no text layer. Spreadsheets and images work too. The
   file bytes never leave the browser; only the extracted text is posted.
2. **Price** — `POST /api/build-up` hands that text to the model with the target
   schema and gets back sections (PILING · EARTHWORK · SUBSTRUCTURE · STRUCTURE
   · ARCHITECT · MEP · EXTERNAL WORKS), the description-only headings that sit
   above them, measured items, and the analisa harga satuan behind each unit
   price. The model returns **inputs only** — quantities and the five build-up
   columns. It is told not to return a rate, an amount, a subtotal, or a total.
3. **Compute** — `lib/buildup.ts` derives everything that adds up:
   `rate = supply + accessories + profit + waste + labour`, `amount = qty × rate`,
   section subtotals, and the grand total including preliminaries. A model that
   slips a digit in a sum therefore cannot put a wrong figure on screen, and the
   profit / waste percentages in the toolbar reprice the whole bill locally —
   no second round trip.
4. **Export** — `.xlsx` (SheetJS, three sheets: the bill in the source
   workbook's exact column order, AHS, and a Catatan sheet carrying the
   assumptions), PDF via the print view, CSV, and the raw JSON.

**When data is missing, the estimate asks.** An uploaded drawing set almost
never carries everything a price needs. The model is told to produce the bill
regardless — on a stated assumption, because a number today beats a perfect
number next week — and to raise every gap that would move the total as a
question, tagged with what it assumed instead and how far the total shifts if
that assumption is wrong (>10% / 3–10% / <3%, highest first, capped at eight).
Answering one and pressing **Hitung ulang** re-runs the estimate with the
replies passed back as fact that outranks any assumption. No re-upload is
needed: the extracted document text travels with the bill. Answers persist,
survive a reload, carry across a re-run, and both the workbook and the PDF
print two lists — what the user confirmed, and what is still assumed.

**Floor area is entered, not guessed.** `areaM2` is the total of every floor
plate, and it drives the cost-per-m² check on the whole bill — so a wrong one
makes a sound bill read as under-priced. A drawing set exported to PDF often
carries no dimension text at all: the Scott Vale set, for instance, yields room
names, FFL levels, grid refs and a scale, and nothing to measure. The model
used to fill the gap from the unit designation — "UNIT 5 X 12 CORNER" × 2
floors = 120 m², which is the plot, not the building. It is now told that
multiplying out a plot code is the classic error, to return the area only with
a per-floor breakdown, and otherwise to leave it empty and say so. The field is
editable in the summary strip, the exports record whether the figure was
measured or typed, and three checks sit under it: area missing or model-read,
cost per m² outside the basis band, and a bill thinner than 60 items.

A second upload extends the bill rather than replacing it — architectural and
structural drawings usually arrive as separate files — and the result is saved
to `/projects/:id/build-up-bq`, so it survives a reload.

The volumes are read off drawings, not measured, which is the part that can
cost someone real money if it is taken on trust. Every assumption the model
made is carried in its own tab, printed in the PDF, and written into the
workbook, and the screen keeps the amber AI banner above the bill.

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
  ve-suggest.ts         POST — OpenAI-generated value-engineering proposals
  build-up.ts           POST — bill of quantities read out of an uploaded document
  knowledge.ts          GET/POST/DELETE — the RAG knowledge base
  chat.ts               POST — assistant answering over knowledge + app data
```

**Assistant (RAG).** Two screens sit under the sidebar's "ASISTEN" group.
*Pengetahuan* ingests documents: the browser extracts text (PDF via pdf.js,
loaded lazily; plus TXT/MD/CSV/JSON, or pasted text), the server splits it into
overlapping chunks, embeds them with `text-embedding-3-small`, and stores them
in `knowledge_chunks`. Embeddings are kept as JSON rather than `pgvector`, so no
database extension is required; similarity is scored in the function.
*Asisten AI* answers a question from two contexts at once — the top-matching
knowledge chunks **and** the project's own rows from `store`, so "berapa total
RAB?" is answered from live app data rather than the documents. Each reply shows
which sources it drew on.

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
| `OPENAI_API_KEY` | you | powers the assistant, the material reader, "Minta usulan VE dari AI", and the bill builder; if unset, those features report that AI is not configured |
| `OPENAI_MODEL` | optional | defaults to `gpt-4o` |

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
