# HH Goa 2026 Builder ID frontend

Mobile-first React frontend for the HH Goa 2026 Builder ID flow:

1. Reference-style animated intro
2. Create form
3. Generated card with download and hosted X sharing

Source photos and form fields stay in browser memory. Only the complete,
flattened `1134x1926` PNG is published, and only after the user selects
**Share on X**. The browser obtains a narrow, short-lived presigned upload URL
from the backend and uploads the PNG directly to Vercel Blob before the public
pass is finalized. No Blob credential is included in the frontend; the backend
authorizes the upload through Vercel OIDC.

## Development

Requires Node.js 24 and npm. On this Windows workspace, use `npm.cmd` because
PowerShell may block the `npm.ps1` shim.

```powershell
npm.cmd install
npm.cmd run dev
```

The development app runs at `http://127.0.0.1:3000`. Start the sibling backend
at `http://127.0.0.1:3001` to test hosted sharing.

Copy `.env.example` to `.env.local` to point the app at another backend origin:

```text
VITE_BACKEND_ORIGIN=https://share.example
VITE_PUBLIC_APP_URL=https://your-public-generator.example
```

Set `VITE_BACKEND_ORIGIN` when the API uses a separate share domain. If it is
omitted, the production build uses the current browser origin, which supports a
same-origin frontend/backend deployment without falling back to localhost.

## Verification

```powershell
npm.cmd run check
npm.cmd run preview
```

`check` runs strict TypeScript, ESLint, and a production build. Use `preview` to
serve the production build locally at `http://127.0.0.1:4173`.

## Replacing the temporary artwork

All screen components use semantic assets rather than importing individual SVGs.
Update `src/brand/assetManifest.ts` and the files in `src/assets/placeholders/`
when the final UI SVGs arrive. The card export geometry lives in `src/templates/`.
Supplied tall artwork and the publish canvas share the exact 1134x1926 geometry,
so it is never cropped, padded or distorted and DOM breakpoints do not affect
PNG output.
