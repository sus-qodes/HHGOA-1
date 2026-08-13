# Feature — Shareable Card Link + Real X Link Preview

## 1. What this solves

X (Twitter) web intents can carry text + a URL, but never an attached image. The only way to make a shared *link* show the actual generated card as its preview is to give X's crawler a real URL with server-rendered `og:image` meta tags pointing at a real, hosted image — the crawler doesn't execute JS, so a client-only SPA can never do this on its own.

So: the moment a card is generated, we silently save it, mint a short unguessable URL for it, and that URL — not the raw image — is what goes into the tweet. X's crawler fetches the URL, reads the meta tags, and renders the real card as the link preview.

**⚠️ This introduces a backend.** The rest of the site is fully static with zero backend, zero storage — that's correct and should stay true everywhere else. This feature is a deliberately scoped, minimal exception, isolated to exactly the two endpoints and one viewer route described below. Nothing else about the site's static, no-storage nature changes.

---

## 2. Stack (fastest to implement, free)

**Vercel + Vercel Functions + Vercel Blob.**

- The existing static React app deploys to Vercel exactly as planned — no change there.
- Vercel Functions give us server-rendered routes (needed for per-card OG tags) that live in the same project/deploy, same domain, no separate service to stand up.
- Vercel Blob is the object store for the two card assets.
- **No database.** We don't need one — see §3.

The feature remains deliberately scoped to the two endpoints and one viewer route described below. Nothing else about the site's static, no-storage nature changes.

---

## 3. Data model — no DB, the object key *is* the record

Two objects per card, both in Vercel Blob storage:

| Key pattern Contents Used for  |                                                      |                                                                 |
| ------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------- |
| `cards/{slug}.png`             | The portrait card exactly as shown/downloaded in-app | Displayed on the `/id/{slug}` viewer page                       |
| `cards/{slug}-og.jpg`          | The landscape composite (see §4)                     | `og:image` / `twitter:image` — never shown to the user directly |

No slug ever needs a lookup table — `HEAD cards/{slug}.png` existing *is* "this card exists." A slug is valid if and only if the object exists. This keeps the whole feature to "two files in a bucket," nothing more.

---

## 4. The two exported images

### 4a. Portrait card (unchanged)

Whatever the existing card-generation code already produces for on-screen preview/download — no change to this asset or its dimensions.

### 4b. New: landscape OG composite (never shown in-app, save-only)

A **completely separate composition**, built specifically to look right as an X large-image card:

- **Canvas size:** `1200×630` (X's recommended large-image-card ratio, 1.91:1).
- **Right side:** the finished portrait card, **scaled down with no cropping**, height-matched to fill the full `630px` canvas height. At the portrait card's native 4:5 ratio, that's `630 × (portraitW/portraitH)` wide — e.g. if the portrait export is 1080×1350, the scaled card is \~504px wide, right-aligned (flush right or with a small margin — designer's call).
- **Left side:** the remaining width (\~696px at the numbers above) filled with brand background (`#0B6839` green) and the `Hacker-house-v2.svg` mark, plus optionally the event dateline in Victor Mono. This is pure branding real-estate — no user data here, so it can be drawn once and reused as a static background layer, with only the card on the right changing per-user.
- **Export format:** JPEG, quality \~85. This is a link-preview thumbnail, not a keepsake — JPEG keeps the saved object small and the file fetches fast when X's crawler requests it. (Assumption — flag if you'd rather keep it PNG for the SVG edge crispness.)

Because the left half is static, an optimization worth doing: pre-render the "branding half" once as a background image asset and only composite the per-user card onto it at generation time, rather than re-drawing the SVG from scratch on every single card.

---

## 5. Upload flow (background, non-blocking — per your answer to Q5)

```
User clicks "Generate My Card"
   │
   ├─→ Portrait canvas renders → shown in Card View immediately (existing behavior, unchanged)
   │
   └─→ (fires in parallel, invisible to the user)
         1. Render the OG landscape composite (§4b) — cheap, same canvas APIs
         2. POST both blobs to /api/cards
         3. Function generates a slug, writes both objects to R2, returns { slug, url }
         4. Client stores the returned url in state, ready for the Share button

```

The user never sees a spinner for this under normal conditions — it happens while they're still looking at their card. The **Share button** is the only place this matters, and needs a small state machine:

| Share button state Trigger Behavior  |                                               |                                                                                                                                                                     |
| ------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pending`                            | Card just generated, upload in flight         | Button shows a brief "preparing link…" state if tapped before upload resolves — waits for the in-flight request rather than opening a broken/placeholder URL        |
| `ready`                              | Upload resolved                               | Tapping immediately opens the X intent with the real URL                                                                                                            |
| `error`                              | Upload failed (offline, function error, etc.) | Button shows "retry" — tapping re-attempts the upload. If it fails again, fall back to the old static flow (Download + manual attach), so Share is never a dead end |

---

## 6. API contract

### `POST /api/cards`

- **Body:** multipart form data — `portrait` (PNG blob), `og` (JPEG blob)
- **Server logic:** 
  1. Generate slug: `nanoid(10)` (URL-safe alphabet, \~60 bits of entropy — collision-checking is unnecessary at any realistic volume, but a cheap `HEAD`-before-`PUT` retry-on-collision loop costs nothing to add)
  2. `PUT` both objects to R2 under the keys in §3
  3. Return `{ "slug": "aB3xQ9kLmZ", "url": "https://{DOMAIN}/id/aB3xQ9kLmZ" }`
- No auth, no rate limiting (per your answer to Q8) — the only light guardrail worth keeping is a basic file-size cap on the incoming blobs (e.g. reject >5MB) purely so a stray bug can't fill the bucket, not as abuse protection.

### `GET /id/:slug`

Server-rendered by a Pages Function (not the static SPA) so the OG tags are present in the initial HTML response before any JS runs:

- If `cards/{slug}.png` exists in R2: 
  - Returns an HTML shell with: 
    - `og:image` / `twitter:image` → `https://{DOMAIN}/cards/{slug}-og.jpg`
    - `twitter:card` → `summary_large_image`
    - `og:title` → e.g. "I'm building at HH Goa 2026"
    - `og:url` → the canonical `/id/{slug}` URL
  - Body renders the **viewer page** (§7)
- If the slug doesn't exist: standard 404, with generic HH Goa 2026 branding/OG tags (never a broken/blank preview).

Since a card never changes once saved, this response is safe to cache aggressively at the edge — `Cache-Control: public, max-age=31536000, immutable` — which also keeps Function invocations (and therefore free-tier usage) low for popular cards.

### Image serving

`cards/{slug}.png` and `cards/{slug}-og.jpg` are served directly from Vercel Blob storage — no separate image-serving logic needed.

---

## 7. Viewer page — `/id/{slug}` (per your answer to Q6)

- The portrait card image, front and center — this **is** the page.
- Small HH Goa 2026 branding (logo/footer).
- **"Make Your Own"** CTA → links back to the landing page/form. This is the viral loop: anyone who lands here from a friend's tweet has one obvious next action.
- Nothing else — no nav, no other content, matches the "just the card and branding" brief.

---

## 8. Tweet intent text

Unchanged in shape from the original static-share plan, except the `url` param now points at `/id/{slug}` instead of the generic event URL:

```
https://twitter.com/intent/tweet
  ?text=<caption copy + #FrameInGoa>
  &url=https://{DOMAIN}/id/{slug}

```

Because the URL itself now carries a real preview, the **"download it, then attach it"** instruction from the old static flow is no longer needed — this replaces that UX entirely. The Download button can stay (people may still want the file for themselves), but Share no longer depends on it.

---

## 9. Client-side changes needed

- The card-generation module gains a second export function for the §4b landscape composite.
- The card preview view fires the background upload right after the portrait card renders, holds `{status: 'pending'|'ready'|'error', url?: string}` in state.
- Share button wired to the state machine in §5.
- New tiny route/page component for `/id/{slug}` — note this one **cannot** be purely client-rendered the way the rest of the app is; it needs a real, server-resolvable URL, so it's the one place in the whole site that isn't a client-side view toggle.

---

## 10. Explicit assumptions (flag anything you want changed)

1. OG image exported as JPEG q85; portrait stays PNG.
2. OG composite is a from-scratch canvas render, not a crop of the portrait card.
3. Slug = `nanoid(10)`, URL-safe alphabet, no collision table needed at this volume.
4. No delete/takedown endpoint exists — "kept forever" per your answer, but worth a one-line note that if someone ever asks to be removed, it'd currently require manual deletion from the R2 bucket, since there's no account system to self-serve that.
5. Domain for `{DOMAIN}` still open from the original PRD (Q6 there) — this feature works the same regardless of what's decided.

---

## 11. Out of scope (per your answers)

- Rate limiting / abuse protection (Q8 — explicitly not needed for v1).
- Any moderation of uploaded photos.
- Analytics on card views.
- Card deletion/expiry — everything is permanent by design.