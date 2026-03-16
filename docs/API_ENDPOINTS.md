# API Endpoint Documentation

Base URL (local): `http://localhost:3001`

## Common Conventions

- Request and response format: JSON.
- Auth for protected endpoints:
  - Header: `Authorization: Bearer <sessionToken>`
  - `sessionToken` is returned by `POST /api/auth/login`.
- Standard error shape:

```json
{
  "ok": false,
  "status": 400,
  "message": "Human-readable error",
  "details": "Optional extra detail"
}
```

Current frontend wiring status:
- Wired in `client/src/App.tsx`: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/problems`, `GET /api/problems/daily`
- Problem detail/editor/run/submit endpoints below are backend-ready for upcoming screens.

## 1) Health

### `GET /api/health`

Returns backend health status.

Example response:

```json
{
  "ok": true,
  "now": "2026-03-16T07:10:00.000Z"
}
```

## 2) Auth

### `POST /api/auth/login`

Creates a local backend session from a LeetCode cookie.

Request body:

```json
{
  "cookie": "csrftoken=...; LEETCODE_SESSION=...; ...",
  "domain": "com"
}
```

- `domain`: `"com"` or `"cn"`.
- The desktop client may call this automatically on startup using a cached `{cookie, domain}` pair stored by Electron.

Example success response:

```json
{
  "ok": true,
  "domain": "com",
  "sessionToken": "<token>",
  "user": {
    "id": 123,
    "slug": "my-slug",
    "username": "my-user",
    "isPremium": false,
    "isVerified": true,
    "activeSessionId": 0
  }
}
```

### `POST /api/auth/logout`

Invalidates the current local backend session.

Auth required: yes

Desktop client behavior:
- Logout also clears the Electron-side cached auth payload so the next launch returns to the login screen unless a fresh login succeeds.

Example success response:

```json
{
  "ok": true
}
```

### `GET /api/auth/me`

Returns current authenticated user status from LeetCode.

Auth required: yes

Example success response:

```json
{
  "ok": true,
  "domain": "com",
  "user": {
    "id": 123,
    "slug": "my-slug",
    "username": "my-user",
    "isPremium": false,
    "isVerified": true,
    "activeSessionId": 0
  }
}
```

### `POST /api/auth/test`

Backward-compatible auth check endpoint from the prototype.

Request body:

```json
{
  "cookie": "csrftoken=...; LEETCODE_SESSION=...; ...",
  "domain": "com"
}
```

Example success response:

```json
{
  "ok": true,
  "domain": "com",
  "user": {
    "id": 123,
    "slug": "my-slug",
    "username": "my-user",
    "isPremium": false,
    "isVerified": true,
    "activeSessionId": 0
  }
}
```

## 3) Problems

### `GET /api/problems`

Returns paginated problem list (with server-side filtering).

Auth required: yes

Query params (all optional):
- `search`: text match against title/titleSlug/frontendId
- `status`: `ac` | `notac` | `todo`
- `difficulty`: `Easy` | `Medium` | `Hard`
- `paidOnly`: `true` | `false`
- `page`: number (default `1`)
- `pageSize`: number (default `50`, max `200`)

Example:
- `/api/problems?search=two&difficulty=Easy&page=1&pageSize=20`

Example response:

```json
{
  "ok": true,
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "items": [
    {
      "id": 1,
      "frontendId": "1",
      "title": "Two Sum",
      "titleSlug": "two-sum",
      "difficulty": "Easy",
      "status": "todo",
      "paidOnly": false,
      "starred": false,
      "acRate": 54.3,
      "link": "https://leetcode.com/problems/two-sum/"
    }
  ]
}
```

### `GET /api/problems/daily`

Returns daily challenge title slug.

Auth required: yes

Example response:

```json
{
  "ok": true,
  "daily": {
    "titleSlug": "two-sum"
  }
}
```

### `GET /api/problems/:titleSlug`

Returns detailed problem data from LeetCode GraphQL.

Auth required: yes

Path params:
- `titleSlug`: e.g. `two-sum`

Example response (truncated):

```json
{
  "ok": true,
  "question": {
    "questionId": "1",
    "questionFrontendId": "1",
    "title": "Two Sum",
    "titleSlug": "two-sum",
    "difficulty": "Easy",
    "content": "<p>...</p>",
    "codeSnippets": [
      {
        "lang": "Python3",
        "langSlug": "python3",
        "code": "class Solution: ..."
      }
    ]
  }
}
```

## 4) Run / Submit / Result Polling

### `POST /api/problems/:titleSlug/run`

Runs code against custom input.

Auth required: yes

Path params:
- `titleSlug`

Request body:

```json
{
  "lang": "python3",
  "questionId": "1",
  "typedCode": "class Solution:\n    ...",
  "dataInput": "[2,7,11,15]\n9"
}
```

Example response:

```json
{
  "ok": true,
  "runId": "1234567890",
  "raw": {
    "interpret_id": "1234567890"
  }
}
```

### `POST /api/problems/:titleSlug/submit`

Submits code to LeetCode judge.

Auth required: yes

Path params:
- `titleSlug`

Request body:

```json
{
  "lang": "python3",
  "questionId": "1",
  "typedCode": "class Solution:\n    ..."
}
```

Example response:

```json
{
  "ok": true,
  "submissionId": "1234567890",
  "raw": {
    "submission_id": 1234567890
  }
}
```

Notes:
- Backend accepts multiple ID key formats from LeetCode (`submission_id`, `submissionId`, `submission_id_str`, etc.).

### `GET /api/submissions/:id/check`

Polls run/submission status and result payload.

Auth required: yes

Path params:
- `id`: `runId` or `submissionId`

Example response:

```json
{
  "ok": true,
  "state": "SUCCESS",
  "result": {
    "status_code": 10,
    "status_msg": "Accepted"
  }
}
```

### `GET /api/problems/:questionId/submissions/latest?lang=<langSlug>`

Fetches latest submitted code for a question/language.

Auth required: yes

Path params:
- `questionId`: numeric LeetCode question id

Query params:
- `lang`: required, e.g. `python3`

Example response:

```json
{
  "ok": true,
  "submission": {
    "code": "class Solution:\n    ..."
  }
}
```

## 5) Local Code Storage

### `GET /api/code`

Lists locally saved solution files.

Auth required: no

Example response:

```json
{
  "ok": true,
  "items": [
    {
      "titleSlug": "two-sum",
      "lang": "python3",
      "filePath": "/.../local-solutions/python3/two-sum.py",
      "updatedAt": "2026-03-16T07:10:00.000Z",
      "bytes": 120
    }
  ]
}
```

### `GET /api/code/:titleSlug?lang=<langSlug>`

Reads one locally saved solution file.

Auth required: no

Path params:
- `titleSlug`

Query params:
- `lang`: required

Example response:

```json
{
  "ok": true,
  "code": {
    "titleSlug": "two-sum",
    "lang": "python3",
    "filePath": "/.../local-solutions/python3/two-sum.py",
    "updatedAt": "2026-03-16T07:10:00.000Z",
    "bytes": 120,
    "code": "class Solution:\n    ..."
  }
}
```

### `PUT /api/code/:titleSlug`

Writes/overwrites one locally saved solution file.

Auth required: no

Path params:
- `titleSlug`

Request body:

```json
{
  "lang": "python3",
  "code": "class Solution:\n    ..."
}
```

Example response:

```json
{
  "ok": true,
  "saved": {
    "titleSlug": "two-sum",
    "lang": "python3",
    "filePath": "/.../local-solutions/python3/two-sum.py",
    "bytes": 120
  }
}
```

## Useful curl Snippets

Login:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"cookie":"csrftoken=...; LEETCODE_SESSION=...; ...","domain":"com"}'
```

Fetch problems:

```bash
curl "http://localhost:3001/api/problems?page=1&pageSize=20" \
  -H "Authorization: Bearer <sessionToken>"
```

Save local code:

```bash
curl -X PUT http://localhost:3001/api/code/two-sum \
  -H "Content-Type: application/json" \
  -d '{"lang":"python3","code":"class Solution:\n    pass"}'
```
