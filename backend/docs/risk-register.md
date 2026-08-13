# Risk register and release gates

| Risk | Current control | Gate before launch |
| --- | --- | --- |
| Vercel Function payload is 4.5 MiB | Browser uploads directly to Blob; final images are direct Blob URLs | Prove a near-8-MiB pass in Preview/Production |
| Public staging object | It is already flattened/consented, uses a random 192-bit path, and is deleted after finalize/validation or ~24h | Confirm disclosure and cron cleanup |
| Anonymous upload abuse | Exact Origin checks, strict one-path token, PNG/8-MiB/15-minute/no-overwrite constraints, and rate limiting | Add edge/WAF tuning and test venue NAT |
| Blob callback delay/failure | Callback is validation-only; finalize reads deterministic staging path | Prove finalize while callback is delayed |
| No Blob TTL | Authenticated daily list/delete cron | Alert on failures and prove catch-up |
| Partial publication | Manifest written last; partial prefixes cleaned later | Inject put failures and retry finalize |
| X caches stale metadata | Immutable IDs and direct initial OG tags | Real staging X post with fresh IDs |
| Temporary OG artwork | Current derivative renderer is provisional | Approve final licensed/versioned OG design |
| Public domain/protection | Routes must be crawler reachable without auth/challenges | External GET/HEAD and X crawler validation |
| Real HEIC/browser path | Backend accepts only flattened PNG | Real iPhone/device frontend testing |
| No database | Opaque immutable URL needs none | Add one only if moderation/ownership/search/revocation becomes required |

Local checks do not prove Vercel deployment, the connected public store,
DNS/TLS, callback reachability, retention execution, or X caching.
