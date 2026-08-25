# Easy Tagg — Frontend

React + TypeScript + Vite client for Easy Tagg. It's an authentication shell around two things: the original vanilla-JS Easy Tagg tagging app (kept intact under `public/legacy/`, still the primary way users tag games) and a newer set of React screens that talk to the backend's normalized `games`/`players`/`tags` API directly.

## Tech stack

- **Build tool**: Vite 6+ (`@vitejs/plugin-react`)
- **Language**: TypeScript, strict mode
- **UI**: Plain React (no component library), hand-written CSS (`src/styles.css`)
- **Testing**: Playwright (`tests/e2e/`)

## Project structure

```
frontend/
├── src/
│   ├── main.tsx            # ReactDOM bootstrap
│   ├── App.tsx              # Auth gate, tab navigation, account bar
│   ├── api.ts                # Fetch wrapper: base URL, auth header, error handling
│   ├── env.d.ts              # Vite env typing (VITE_API_URL)
│   ├── styles.css            # All app styling (dark theme)
│   └── components/
│       ├── Auth.tsx          # Sign in / Create account / Magic link / Google OAuth
│       ├── Players.tsx       # Player roster CRUD
│       ├── History.tsx       # Flat list of all tagged pitches, with delete
│       ├── Tagging.tsx       # Live pitch-by-pitch tagging screen (count, zone, results)
│       ├── Zone.tsx          # 3x3 strike-zone picker used by Tagging
│       ├── DetailSheet.tsx   # Quality/Trajectory picker for batted-ball results
│       └── MigratePanel.tsx  # One-time legacy-snapshot → normalized-tables migration UI
├── public/
│   └── legacy/                # The original Easy Tagg app: index.html, app.js (~12k lines), assets. Served as static files and iframed by App.tsx's "Legacy" tab. Not part of the Vite/React build.
├── tests/e2e/
│   └── tagging.spec.ts       # Playwright test for the Tagging save flow
└── vite.config.ts            # Dev server (port 5173) + /api proxy to localhost:4000
```

## Requirements

- Node.js 20+
- npm
- The backend running (locally on `:4000`, or a deployed URL — see below)

## Environment variables

Vite env vars, read at **build time** (prefix `VITE_`):

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | no | `/api` (relative) | Base URL for API calls. Leave unset when the frontend and backend are served from the same origin (local dev via the Vite proxy, or the single-service production build where the backend serves the built frontend). Set it to the backend's full URL (e.g. `https://your-backend.onrender.com/api`) when frontend and backend are deployed as **separate** services/origins. |

Set it in a `.env`/`.env.production` file read by Vite, or as a build-time environment variable in your hosting platform (it must be present *when `npm run build` runs*, not just at request time).

## Running locally

```bash
npm install
npm run dev       # http://localhost:5173, proxies /api to http://localhost:4000
```

Other scripts:

```bash
npm run build      # tsc -b && vite build -> dist/
npm run preview    # serve the production build locally
npx playwright test  # run the e2e suite (spins up its own dev server on :5173; backend must already be running on :4000)
```

## Architecture

`main.tsx` renders `App.tsx`, which:

1. On mount, checks `localStorage.et_access_token` (or a `?token=` query param, used by the magic-link/Google OAuth redirect flow) and calls `GET /auth/me` to resolve the current user.
2. If there's no valid session, renders `<Auth />` (sign in / register / magic link / Google) and nothing else.
3. Once authenticated, renders the app shell: an account bar (email + Migrate + Sign out) and a tab bar switching between **Legacy**, **Players**, **History**, and **Tagging**.

`api.ts` is the single fetch wrapper every component uses: it prefixes requests with the API base URL, attaches `Authorization: Bearer <token>` from `localStorage`, sends cookies (`credentials: 'include'`, for the refresh cookie), and throws on non-2xx responses with the server's `error` message.

### Screens and what they call

| Component | Purpose | Endpoints used |
|---|---|---|
| `Auth.tsx` | Sign in, create account, request a magic link, or start Google OAuth. | `POST /auth/register`, `POST /auth/login`, `POST /auth/magic/request`, `GET /auth/google` (full-page redirect, not fetched) |
| `Players.tsx` | Add/list/delete players (roster used by Tagging). | `GET /players`, `POST /players`, `DELETE /players/:id` |
| `History.tsx` | Flat, most-recent-first list of every tagged pitch across all games, with delete. | `GET /tags`, `DELETE /tags/:id` |
| `Tagging.tsx` | The core live-tagging screen: pick a game/batter/pitcher, track the count and strike zone, tap a result, and save a tag. Batted-ball results (Single/Double/Triple/HR/Out) open `DetailSheet` first to capture contact quality + trajectory before saving. | `GET /games`, `GET /players`, `GET /tags?game_id=`, `POST /tags` |
| `Zone.tsx` | Presentational 3x3 strike-zone grid, controlled by `Tagging.tsx`. | none (no API calls) |
| `DetailSheet.tsx` | Modal that collects **Quality** (Hard/Medium/Soft) and **Trajectory** (Ground Ball/Line Drive/Fly Ball) for batted-ball results — required before `Tagging.tsx` will save the tag. | none (calls back into `Tagging.tsx`, which does the actual save) |
| `MigratePanel.tsx` | Modal (opened via the account bar's "Migrate" button) that previews and then commits a one-time import of the legacy client's localStorage snapshot into the backend's normalized `games`/`players`/`tags` tables. | `GET /migrate/preview`, `POST /migrate/snapshot` |

### The "Legacy" tab

`App.tsx`'s **Legacy** tab renders an `<iframe src="/legacy/index.html">`. That's a separate, self-contained vanilla-JS application (`public/legacy/app.js`, ~12k lines) with its own localStorage-based state, its own game/player/tagging UI, CSV/Excel exports, and PDF recap generation. It talks to the backend independently via `cloud-sync.js` (snapshot sync) rather than through `src/api.ts`. It is **not** legacy in the sense of "deprecated" — it's the original, feature-complete tagging app and still the primary way most tagging happens today; the React screens above are a newer, parallel implementation against the normalized API. Treat `public/legacy/` as a separate app when making changes there.

## Testing

`tests/e2e/tagging.spec.ts` drives the real Tagging save flow end to end against a running backend: it logs in via the backend's dev-login endpoint, creates a throwaway game/players through the real API, exercises the UI (select game → pick a batted-ball result → fill Quality+Trajectory → save), asserts the tag was actually persisted, and cleans up after itself. `playwright.config.ts` boots its own Vite dev server on a fixed port (`5173`) for the run — you only need the **backend** running separately (`localhost:4000`) before executing `npx playwright test`.

## Deployment notes

- **Single-service deploy** (this frontend's `dist/` served by the backend from the same origin): don't set `VITE_API_URL` — the default relative `/api` is correct.
- **Separate-service deploy** (this frontend as its own static site/host, backend elsewhere): set `VITE_API_URL` to the backend's public URL at build time, and make sure the backend's `ALLOWED_ORIGINS`/`FRONTEND_URL` include this frontend's deployed origin (see the backend README's CORS section).
- The build is a static site (`npm run build` → `dist/`) — deployable to any static host (Render Static Site, Vercel, Netlify, etc.).
