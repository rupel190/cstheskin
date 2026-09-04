# svelte-page — the game frontend

SvelteKit + Tailwind, deployed to Cloudflare Workers.
Live: <https://guess-the-cs2-skin.rupel.xyz>

```bash
npm install
npm run dev        # vite dev server
npm run build      # production build
npm run deploy     # build + wrangler deploy
npm run check      # svelte-check
```

## Routes

| Route | What |
| --- | --- |
| `/` | The game — five progressively revealed images, one guess per stage |
| `/history` | Per-visitor round history (`noindex` — thin, per-user) |
| `/api/game/start`, `/api/guess`, `/api/history`, `/api/image`, `/api/skins` | Worker endpoints, `Disallow`ed in robots.txt |

## Head tags

Route-varying tags (`title`, `description`, `canonical`, `og:*`) live in each
route's own `<svelte:head>`. Only invariants (`og:site_name`, `twitter:card`,
`theme-color`) sit in `+layout.svelte` — Svelte *concatenates* head content
rather than overriding it, so a `<title>` in the layout plus one in a page
emits two tags.

`static/og-image.png` is 1200×630 and referenced absolutely; regenerate it from
a screenshot of the live game if the UI changes.
