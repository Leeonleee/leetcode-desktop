# LeetCode Desktop

A desktop-first LeetCode experience inspired by `leetcode.nvim`: use your LeetCode cookie, browse/search problems, solve in an in-app editor, run/submit, and avoid the LeetCode website during practice.

This repository currently contains:
- A modular React + Express + TypeScript backend/frontend workspace.
- A Tailwind-based auth shell UI with reusable components (login modal, theme toggle, logged-in placeholder state).
- An Electron shell to run the app as a desktop window.
- A local copy of `leetcode.nvim` used as a reference for endpoint behavior and payload shapes.

## Current Status

- Implemented: core backend endpoints for auth, problems, run/submit/check, daily challenge, and latest submission restore.
- Implemented: local code-file storage endpoints (`local-solutions/` on disk).
- Implemented: Electron dev bootstrap (`npm run dev:electron`).
- Implemented: frontend auth experience (`/api/auth/login` + `/api/auth/logout`) with domain selection and cookie-header input.
- In progress: final product UI (sidebar browser + Monaco-style editor experience).

## Project Structure

- `client/`: Vite + React + Tailwind frontend with reusable UI primitives in `src/components/ui/`.
- `server/`: Express backend with organized modules:
  - `controllers/`
  - `routes/`
  - `services/`
  - `middleware/`
  - `types/`
  - `lib/`
- `electron/`: Electron main process entry.
- `leetcode.nvim/`: reference implementation for LeetCode web integration.

## Documentation

- API endpoints: [`docs/API_ENDPOINTS.md`](./docs/API_ENDPOINTS.md)
- Frontend auth flow: [`docs/FRONTEND_AUTH_UI.md`](./docs/FRONTEND_AUTH_UI.md)

## Quick Start

Install dependencies:

```bash
npm install
```

Run web mode (frontend + backend):

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

Run desktop mode (Electron + frontend + backend):

```bash
npm run dev:electron
```

## Current Frontend Flow

1. Launch screen shows centered `Login` and `Exit` actions.
2. Theme toggle is pinned at the bottom and persists to `localStorage` (`leetcode-desktop-theme`).
3. Login modal collects:
   - Domain: `leetcode.com` or `leetcode.cn`
   - Full cookie header string
4. On successful login:
   - `sessionToken` is stored in app state
   - A logged-in placeholder card is shown with session token preview
5. Logout clears local UI session and attempts `POST /api/auth/logout`.

Notes:
- The frontend currently integrates auth endpoints directly.
- Problem browsing/editor/run/submit UI is not wired yet, but backend endpoints are implemented and documented.

## Backend Overview

The backend acts as a local BFF (backend-for-frontend):
- Accept app requests.
- Proxy to LeetCode web endpoints.
- Normalize responses for UI consumption.
- Centralize cookie/session handling.

### Implemented API Endpoints

Health:
- `GET /api/health`

Auth:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/test` (backward-compatible from prototype)

Problems and solving:
- `GET /api/problems`
- `GET /api/problems/daily`
- `GET /api/problems/:titleSlug`
- `POST /api/problems/:titleSlug/run`
- `POST /api/problems/:titleSlug/submit`
- `GET /api/submissions/:id/check`
- `GET /api/problems/:questionId/submissions/latest`

Local solution files:
- `GET /api/code`
- `GET /api/code/:titleSlug?lang=<langSlug>`
- `PUT /api/code/:titleSlug` with body `{ "lang": "python3", "code": "..." }`

Auth notes:
- `POST /api/auth/login` accepts:
  - `cookie`: full browser `Cookie` request-header value
  - `domain`: `"com"` or `"cn"`
- Protected endpoints require: `Authorization: Bearer <sessionToken>`

## Upstream LeetCode Endpoints Used

- `POST https://leetcode.{domain}/graphql/` (auth, question detail, daily challenge)
- `GET https://leetcode.{domain}/api/problems/algorithms/`
- `POST https://leetcode.{domain}/problems/{titleSlug}/interpret_solution/`
- `POST https://leetcode.{domain}/problems/{titleSlug}/submit/`
- `GET https://leetcode.{domain}/submissions/detail/{id}/check/`
- `GET https://leetcode.{domain}/submissions/latest/?qid={questionId}&lang={langSlug}`

## Local Code Storage

Saved files are written to:

- `local-solutions/<lang>/<title-slug>.<ext>`

Examples:
- `local-solutions/python3/two-sum.py`
- `local-solutions/javascript/two-sum.js`

## Notes

- This is an unofficial LeetCode web integration and may break if LeetCode changes web endpoints or anti-bot behavior.
- Copy cookie values from browser request headers (not `set-cookie` response headers).
- Session storage is currently in-memory (good for local development, not production deployment).
