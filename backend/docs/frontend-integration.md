# Frontend integration

Use the v2 direct-upload flow for **every** generated pass, not only files above
4.5 MiB. One path avoids environment-dependent Vercel Function limits.

The PNG must be `image/png`, exactly `1134x1926`, no more than 8 MiB, and must
represent `builder-pass-v2` version `2`.

## 1. Begin

```ts
const beginResponse = await fetch(`${backendOrigin}/v2/pass-uploads`, {
  method: "POST",
});
const { upload: instructions } = await beginResponse.json();
```

The `201` envelope is:

```json
{
  "upload": {
    "id": "<32-character base64url ID>",
    "pathname": "staging/<id>/source.png",
    "tokenUrl": "https://share.example/v2/pass-uploads/token",
    "finalizeUrl": "https://share.example/v2/pass-uploads/<id>/finalize",
    "access": "public",
    "contentType": "image/png",
    "maximumSizeInBytes": 8388608,
    "multipart": true,
    "template": { "id": "builder-pass-v2", "version": 2 }
  }
}
```

`tokenUrl` and `finalizeUrl` are absolute. Treat `pathname` as opaque and use
the returned value exactly.

## 2. Upload directly to Blob

```ts
import { uploadPresigned } from "@vercel/blob/client";

await uploadPresigned(instructions.pathname, preparedPngBlob, {
  access: "public",
  handleUploadUrl: instructions.tokenUrl,
  clientPayload: instructions.id,
  contentType: instructions.contentType,
  multipart: instructions.multipart,
});
```

Do not submit the returned Blob URL to finalization. The server reads only the
deterministic path that it issued.

## 3. Finalize

```ts
const finalResponse = await fetch(instructions.finalizeUrl, { method: "POST" });
const { pass } = await finalResponse.json();
```

First success is `201`; an idempotent retry is `200`. Both return:

```json
{
  "pass": {
    "id": "<id>",
    "url": "https://share.example/pass/<id>",
    "cardUrl": "https://<store>.public.blob.vercel-storage.com/passes/<id>/card.png",
    "ogImageUrl": "https://<store>.public.blob.vercel-storage.com/passes/<id>/og.jpg",
    "template": { "id": "builder-pass-v2", "version": 2 },
    "retentionDays": 90,
    "scheduledDeletionAfter": "2026-11-11T10:00:00.000Z"
  }
}
```

Tweet `pass.url`, not `cardUrl`: the pass page supplies X/OG metadata. Open the
X window synchronously before the async begin/upload/finalize chain, then assign
the intent URL after success. Keep local download/native share available on all
backend failures.

`UPLOAD_NOT_READY`, `RATE_LIMITED`, `SERVICE_BUSY`, processing timeout, and
storage-unavailable errors are retryable; honor `Retry-After`. Disclose before
beginning that publication creates a public image link retained for
approximately `retentionDays`.
