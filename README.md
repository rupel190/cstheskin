# Guess the CS2 Skin

A cropped CS2 skin is shown and you have to guess its name. If you fail it reveals another
crop. In the last stage you'll see the whole skin. Put in the weapon type first for better
suggestions.

**Play it: <https://rupel.xyz/guesstheskin>**

## How it's built

SvelteKit on Cloudflare Workers; skins, per-stage image references and player progress in D1,
the five crops in R2, round state in a cookie so there's no account. Stages aren't generated on
the fly — each skin is cropped once offline by a small editor built for the job. Deciding where
to crop is a judgement call per skin, currently done per weapon type.

## The cheating problem

Any guessing game where the answer reaches the browser is solvable with devtools, and if all
five images ship up front stage five is one network tab away. So the image endpoint checks
progress server-side and returns a 403 for an unearned stage, and `skins` stores an
`encrypted_name` alongside the display name. Time will tell if it's better than VAC.

The progress cookie carries an HMAC so it can't simply be edited to `solved: true` — `httpOnly`
stops page JavaScript from reading a cookie, not a person from setting one. See
[`svelte-page/src/lib/cookie-auth.ts`](svelte-page/src/lib/cookie-auth.ts).

## Getting the names right

No official CS2 API, so a scraper works case by case — Dreams & Nightmares, Fracture, Kilowatt —
into per-case JSON.

## Layout

| | |
| --- | --- |
| `svelte-page/` | the game — SvelteKit, deployed to Cloudflare Workers |
| `webscraper/` | per-case skin data + image scraper |
| `cropper/` | the offline crop editor that produces the five stages |
| `db-storage-uploader/` | pushes skins and crops into D1 and R2 |

Scraped output (per-case JSON, `cases/`, `collections/`, `skins/`) is deliberately **not** in
the repo — it's Valve's artwork and data, and re-running the scraper regenerates it.

## Running it

```bash
cd svelte-page
npm install
npm run dev            # vite dev server
npm run check          # svelte-check
npm run deploy         # build + wrangler deploy
```

The deployed Worker needs one secret, used to sign the progress cookie:

```bash
npx wrangler secret put COOKIE_SECRET
```

Without it no progress cookie is written, so the game can't advance past the first crop.

## Licence

[AGPL-3.0](LICENSE). If you run a modified version as a public service, its source has to be
available too.
