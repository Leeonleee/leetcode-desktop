# Frontend Auth UI

This document describes the current frontend behavior orchestrated by `client/src/App.tsx`, with the
stateful logic split into hooks and screen-level UI moved into dedicated components.

## Stack

- React + TypeScript (Vite)
- Tailwind CSS
- Reusable UI primitives in `client/src/components/ui/`
- Radix switch primitive for theme toggle
- Lucide icons
- App-specific hooks in `client/src/hooks/`
- App screens in `client/src/components/app/`

## Screens and States

### 1. Startup auth check

On app start:
- The renderer asks Electron for a cached auth payload (handled by `useAuth`).
- The cache file stores the last successful:
  - `cookie`
  - `domain`
- If a cached payload exists, the app attempts `POST /api/auth/login` immediately.
- If auto-login fails, the cache is cleared and the app falls through to the logged-out screen.

Note:
- This cache file is available in Electron desktop mode via a preload bridge.
- In plain web mode, the cache bridge does not exist, so the app simply starts logged out.

### 2. Logged out

- Full-screen landing with centered title and actions:
  - `Login`
  - `Exit`
- Bottom-pinned theme toggle (`light` / `dark`).
- Theme selection is persisted in `localStorage` under key `leetcode-desktop-theme`.
- UI lives in `client/src/components/app/LoggedOutScreen.tsx`.

### 3. Login modal

Opened by pressing `Login`.

Fields:
- Domain selector:
  - `leetcode.com` (`domain = "com"`)
  - `leetcode.cn` (`domain = "cn"`)
- Cookie header textarea (`csrftoken=...; LEETCODE_SESSION=...; ...`)

Behavior:
- Submit sends `POST /api/auth/login` (via `useAuth`).
- Successful login also writes `{cookie, domain}` to the Electron auth cache file.
- Escape key closes modal when not submitting.
- Empty cookie input is rejected client-side.
- API errors are shown inline in the modal.
- UI lives in `client/src/components/app/LoginModal.tsx`.

### 4. Logged in home sidebar

After successful login:
- Session token is stored in auth hook state.
- Username/slug from login response is displayed in the sidebar header.
- The sidebar fetches:
  - `GET /api/problems`
  - `GET /api/problems/daily`
- Search input filters by title, slug, and frontend id.
- Difficulty filter buttons default to showing all problems.
- The daily problem is pinned to the top of the rendered list.
- Dark mode toggle remains pinned at the bottom of the sidebar.
- `Logout` triggers `POST /api/auth/logout` (best-effort), clears local state, and clears the auth cache file.
- Data loading and filtering live in `client/src/hooks/useProblems.ts`.
- UI lives in `client/src/components/app/Sidebar.tsx`.

## API Endpoints Currently Used by Frontend

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/problems`
- `GET /api/problems/daily`

Other backend endpoints are implemented but not yet wired into the current UI.
