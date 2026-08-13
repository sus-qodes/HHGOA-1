# HH Goa 2026 Builder Pass backend

Fastify backend for immutable Builder Pass URLs and X/Open Graph previews.

## Production scope

- `POST /v2/pass-uploads` — begin a browser-to-Blob upload
- `POST /v2/pass-uploads/token` — scoped presigned upload authorization/callback
- `POST /v2/pass-uploads/:id/finalize` — validate, sanitize, derive OG, commit
- `GET|HEAD /pass/:id` — crawler-ready HTML
- `GET|HEAD /pass/:id/card.png` and `/og.jpg` — redirects to public Blob
- `GET /internal/cron/retention` — `CRON_SECRET`-protected cleanup
- `GET /healthz`, `GET /readyz`, and Swagger at `GET /docs/`

The publish contract is `builder-pass-v2` version `2`: a flattened PNG exactly
`1134x1926`, at most 8 MiB. No source photo, filename, EXIF, or separate form
field is accepted or retained.

Production uses a public Vercel Blob store and no database. Browser bytes go
directly to Blob, so 5–8 MiB cards do not cross Vercel's Function payload limit.
The small `/pass/:id` HTML points OG/X tags directly at immutable Blob assets.

## Development

Node.js 24 and npm are required. On this Windows workspace use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run check
npm.cmd run dev
```

Every runtime uses Vercel Blob. A Vercel deployment connected with OIDC receives
`BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY`, and a short-lived OIDC token from the
platform. For local development, copy `.env.example` to `.env` and either pull
those connection variables with the Vercel CLI or set a legacy
`BLOB_READ_WRITE_TOKEN`; Vercel has no local Blob emulator. The webhook public
key is required for upload callback verification in both cases. `npm run dev`
and `npm start` load `.env` when it exists, while variables supplied by the host
take priority. Completion callbacks need a public tunnel.

See `docs/architecture.md`, `docs/api.md`, `docs/frontend-integration.md`,
`docs/storage.md`, and `docs/deployment.md`.
