# Share storage

Every runtime uses a **public Vercel Blob store**. Binary images belong in
object storage; no relational/document database is needed for immutable opaque
pass URLs.

Vercel deployments authenticate through the connected store's short-lived OIDC
credentials (`BLOB_STORE_ID` plus the platform-provided OIDC token). Supplying
`BLOB_READ_WRITE_TOKEN` remains supported as an explicit local/legacy fallback.

Each pass stores only:

- `passes/<id>/card.png`: sanitized, metadata-free flattened pass;
- `passes/<id>/og.jpg`: generated `1200x630` crawler preview;
- `passes/<id>/manifest.json`: version, timestamps, direct URLs, sizes, and
  SHA-256 integrity values.

The source photo, browser filename, EXIF/GPS, crop parameters, and separate form
fields are never stored. `staging/<id>/source.png` is itself an already-flattened
public-share image, is addressed by a random 192-bit ID, and is deleted after
finalization or approximately 24 hours when abandoned.

## Retention

Vercel Blob does not provide per-object TTL. `vercel.json` schedules the
authenticated retention route daily. It paginates Blob listings and deletes:

- committed pass bundles whose manifest is older than `SHARE_RETENTION_DAYS`
  (90 by default);
- uncommitted final prefixes older than the staging grace period;
- abandoned staging objects older than approximately 24 hours.

Deletion is approximate. Blob/CDN/browser caches can persist briefly after
origin deletion, and X controls its own cache. Product copy must say
"approximately N days," not promise deletion at an exact timestamp.

No local share adapter exists. Development must use a separate connected Blob
store.
