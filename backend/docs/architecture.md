# Backend architecture

The production publishing path is a serverless Fastify application backed by
one **public Vercel Blob store**. There is no database. The browser still owns
photo decoding/cropping, form state, preview, Canvas rendering, download, and X
Web Intent construction.

The only accepted publish input is the already-flattened, consented Builder Pass
PNG: `image/png`, exactly `1134x1926`, at most 8 MiB, template
`builder-pass-v2` version `2`. The backend never accepts a source-photo field,
filename, EXIF field, name, role, team, or builder class separately.

## Production flow

1. `POST /v2/pass-uploads` creates a random 192-bit pass ID and returns the
   deterministic staging pathname, Blob authorization endpoint, and finalize endpoint.
2. `@vercel/blob/client` uploads the PNG from browser to Blob. The bytes do not
   cross the Vercel Function request-body boundary.
3. `POST /v2/pass-uploads/token` uses Vercel's signed client-upload protocol.
   Tokens last 15 minutes, allow only the returned pathname, allow only PNG,
   cap the object at 8 MiB, and forbid overwrite/random suffix changes.
4. `POST /v2/pass-uploads/:id/finalize` reads that exact staging object, validates
   and re-encodes it with Sharp, generates a `1200x630` OG JPEG, and writes final
   objects. `manifest.json` is written last and is the publication commit marker.
5. `/pass/:id` reads only the small manifest and returns initial HTML with
   canonical, Open Graph, and X card tags. Card and OG tags point directly to
   immutable public Blob URLs; artifact routes issue `307` redirects.

The Vercel upload-completion callback is validation-only. Finalization reads the
deterministic path itself and therefore does not depend on callback delivery or
timing.

## Storage and consistency

```text
staging/<id>/source.png             # short-lived, random URL
passes/<id>/card.png                # sanitized final PNG
passes/<id>/og.jpg                  # final crawler JPEG
passes/<id>/manifest.json           # written last; commit marker
```

The staging PNG is already flattened and explicitly consented for public
sharing. Its opaque ID is unguessable and it is removed best-effort immediately
after success or non-retryable validation failure. Scheduled cleanup removes
abandoned staging objects after approximately 24 hours.

Finalization is retry-safe: an existing valid manifest returns the same pass
with `200`; the first committed publication returns `201`. A retry may overwrite
uncommitted internal final objects, but a pass is public through the application
only after its valid manifest exists.

## Runtime invariants

- Every environment uses Vercel Blob; no local share state or raw backend
  upload route exists.
- Blob retention is invoked by Vercel Cron at
  `GET /internal/cron/retention`, authenticated with `CRON_SECRET`.

The service has no accounts, X OAuth, generic URL fetcher, or server-side
personal-data model.
