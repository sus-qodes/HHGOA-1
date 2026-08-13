# Vercel Blob operations runbook

## Invariants

1. The connected store is Public and dedicated to the pass service.
2. Never expose `BLOB_READ_WRITE_TOKEN` or `CRON_SECRET` to browser code/logs.
3. Never overwrite or manually mutate a pass with a committed manifest.
4. `manifest.json` is the commit marker; card/OG objects without it are partial.
5. Public `/pass/*` and the signed Blob callback endpoint remain free of login,
   Deployment Protection, cookie gates, and bot challenges.

## Routine checks

- `GET /healthz` proves the Function can answer.
- `GET /readyz` proves the configured Blob token can list the pass prefix.
- Vercel Cron invokes `/internal/cron/retention` daily with `CRON_SECRET`.
- Monitor Function 4xx/5xx rates, Blob operations/storage, cron failures, Sharp
  duration/timeouts, and upload rate limiting.
- Verify a disposable `/pass/<id>` and a real X staging preview after every
  domain, Blob-store, SDK, renderer, or OG change.

## Retention catch-up

Invoke the protected cron route repeatedly until reported expired/stale counts
fall below the daily creation rate. Each pass is bounded to 1,000 groups.
Investigate before raising that limit; Blob listing and delete operations have
service/cost limits.

## Token or store incident

1. Disable Share on X in the frontend or block begin/token routes at the edge.
2. Reconnect the Blob store's OIDC project connection and redeploy. If a legacy
   `BLOB_READ_WRITE_TOKEN` fallback is configured, rotate or remove it too.
3. Confirm readiness, one direct upload, finalization, public page, and cron.
4. Inspect Blob audit/usage data for unexpected staging/final prefixes.
5. Remove unauthorized objects by exact validated pathname; do not bulk-delete
   a computed broad prefix without a reviewed listing.

## Rollback

Application rollback is safe because published manifests and assets are
immutable. Do not roll back the Blob store. A code version that does not
understand manifest schema 2 must not serve `/pass/*`; retain the current
version until compatibility is proven.
