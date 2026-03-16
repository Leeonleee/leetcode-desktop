# Frontend Auth UI

This document describes the current frontend behavior implemented in `client/src/App.tsx`.

## Stack

- React + TypeScript (Vite)
- Tailwind CSS
- Reusable UI primitives in `client/src/components/ui/`
- Radix switch primitive for theme toggle
- Lucide icons

## Screens and States

### 1. Logged out (default)

- Full-screen landing with centered title and actions:
  - `Login`
  - `Exit`
- Bottom-pinned theme toggle (`light` / `dark`).
- Theme selection is persisted in `localStorage` under key `leetcode-desktop-theme`.

### 2. Login modal

Opened by pressing `Login`.

Fields:
- Domain selector:
  - `leetcode.com` (`domain = "com"`)
  - `leetcode.cn` (`domain = "cn"`)
- Cookie header textarea (`csrftoken=...; LEETCODE_SESSION=...; ...`)

Behavior:
- Submit sends `POST /api/auth/login`.
- Escape key closes modal when not submitting.
- Empty cookie input is rejected client-side.
- API errors are shown inline in the modal.

### 3. Logged in placeholder

After successful login:
- Session token is stored in component state.
- Username/slug from login response is displayed in a welcome message.
- Session token is shown read-only for debugging.
- `Logout` triggers `POST /api/auth/logout` (best-effort) and clears local state.
- `Exit` requests app window close via `window.close()`.

## API Endpoints Currently Used by Frontend

- `POST /api/auth/login`
- `POST /api/auth/logout`

Other backend endpoints are implemented but not yet wired into the current UI.
