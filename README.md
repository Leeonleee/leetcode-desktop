# LeetCode Web Auth Check (React + Express + TypeScript)

A minimal prototype to verify the cookie-based LeetCode auth flow.

## What it does

- React frontend where you paste the full `Cookie` request header value.
- Express backend that:
  - parses `csrftoken` and `LEETCODE_SESSION` from that cookie string
  - calls LeetCode GraphQL `userStatus`
  - returns a success/failure payload

## Run

```bash
cd playground/leetcode-web-auth-check
npm install
npm run dev
```

Then open `http://localhost:5173`.

## API endpoints

- `GET /api/health`
- `POST /api/auth/test`

Request body:

```json
{
  "cookie": "csrftoken=...; LEETCODE_SESSION=...; ...",
  "domain": "com"
}
```

`domain` can be `"com"` or `"cn"`.

## Notes

- Copy the `Cookie` header from browser **request headers**, not `set-cookie` response headers.
- This is an unofficial integration against LeetCode web endpoints and may break if LeetCode changes behavior.
- Do not use this prototype in production as-is.
