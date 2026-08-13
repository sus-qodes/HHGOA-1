# Vercel production deployment

Production is one Vercel Fastify Function plus one **public Vercel Blob store**.
The project root must be `backend/`. Vercel detects `src/app.ts`; that file
listens only when `VERCEL=1`, while `src/main.ts` remains the local/container
entrypoint.

## Required setup

1. Create a Public Blob store and connect it to the backend project.
2. Keep the connection's default OIDC authentication enabled. It exposes
   `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY`; Vercel injects its short-lived
   OIDC token into Functions automatically. A long-lived read-write token is not
   needed on Vercel.
3. Configure the variables below for Production and applicable Preview
   environments.
4. Attach the public share domain and ensure `/pass/*` and
   `/v2/pass-uploads/token` are reachable without Deployment Protection,
   cookies, login, or bot challenges. The Blob completion callback is signed by
   Vercel and must reach the token route, although finalization never waits for
   it.

| Variable | Requirement |
| --- | --- |
| `NODE_ENV` | `production` |
| `BLOB_STORE_ID` | Store selected by the OIDC-connected project |
| `BLOB_WEBHOOK_PUBLIC_KEY` | Public key used to verify upload callbacks |
| `BLOB_READ_WRITE_TOKEN` | Optional fallback for local or legacy token authentication |
| `CRON_SECRET` | Strong secret used by Vercel Cron |
| `PUBLIC_APP_URL` | HTTPS frontend origin |
| `PUBLIC_SHARE_BASE_URL` | HTTPS public backend/share origin |
| `CORS_ALLOWED_ORIGINS` | Explicit comma-separated frontend origins, never `*` |
| `SHARE_RETENTION_DAYS` | `90` unless product policy changes |
| `TRUST_PROXY_HOPS` | Usually `0` on Vercel; change only with evidence |

Production startup requires either `BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN`,
plus the Blob webhook public key and cron secret. It also rejects non-HTTPS
public origins.

## Why client uploads are mandatory

Vercel Functions impose a 4.5 MiB request/response body ceiling. Generated PNGs
may be as large as 8 MiB. The browser therefore obtains a scoped presigned URL
and sends the PNG directly to Blob. Final card and OG responses are direct
public Blob URLs, so large images are not proxied back through the Function
either.

Use the direct v2 flow for all sizes. `multipart: true` is part of the returned
contract and gives the Blob SDK retryable direct transfer without introducing a
second frontend code path.

## Retention

`vercel.json` runs `/internal/cron/retention` daily. Vercel supplies
`Authorization: Bearer <CRON_SECRET>`. The route paginates Blob objects and
removes expired manifests/bundles, partial publications, and staging uploads.

There is no Blob TTL. Monitor cron invocations and failures. Cached copies at
Blob/CDN/browser/X layers can briefly outlive deletion, so retention remains
approximate.

## Verification

Before launch, create a disposable pass through the real browser flow, then run:

```sh
curl --fail --silent --show-error --head \
  --user-agent 'Twitterbot/1.0' \
  https://share.example.com/pass/REPLACE_WITH_32_CHARACTER_ID

curl --silent --show-error --head \
  https://share.example.com/pass/REPLACE_WITH_32_CHARACTER_ID/og.jpg
```

The page must return `200 text/html`; card/OG artifact routes return `307`
to the connected `.public.blob.vercel-storage.com` origin. Inspect the HTML and
confirm absolute canonical, `og:image`, `twitter:card=summary_large_image`, and
`twitter:image` tags. Then make a real staging X post. X may cache failures, so
use a fresh immutable pass ID after any correction.

Also prove:

- `1134x1926` input near 8 MiB completes without a Function `413`;
- invalid/wrong-dimension PNGs are deleted from staging best-effort;
- finalization retries return the same pass;
- the cron route rejects missing/wrong credentials and deletes disposable objects;
- previews use the intended 1200x630 OG artwork;
- venue-NAT traffic does not exhaust the configured per-instance rate limit.
