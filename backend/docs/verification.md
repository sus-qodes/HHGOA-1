# Runtime verification record

Recorded on 2026-08-13 in the Windows workspace with Node.js 24.12.0,
npm 11.6.2, Sharp 0.35.3, and `@vercel/blob` 2.8.0.

## Production-shaped local checks

- `npm.cmd run probe:runtime` passed with a metadata-bearing `1134x1926` PNG.
  The result was metadata-free, contained only public PNG chunks, and produced a
  `1200x630` JPEG.
- `npm install`/audit reported zero known vulnerabilities.

## External launch gates

Still required in an actual Vercel Preview/Production environment:

- connect and verify the intended **public** Blob store and its OIDC variables;
- deploy the Fastify entrypoint and exercise an upload near 8 MiB;
- prove the signed completion callback can reach the public token route;
- prove finalization succeeds even when that callback is delayed;
- verify Cron authentication, pagination, deletion, and monitoring;
- verify DNS/TLS, Deployment Protection exclusions, CORS, and crawler access;
- publish a real X staging post and inspect cache/preview behavior;
- approve final licensed OG/page artwork and test venue-NAT traffic;
- complete frontend real-device/HEIC testing.
