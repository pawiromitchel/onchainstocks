# AGENTS.md

Guidance for AI coding agents (Antigravity, Claude Code, Codex, Cursor, etc.) working on **Onchain Stocks** (repo: `onchainstocks`).
Read this first. Keep it current when you change behavior, design tokens or workflows.

## What this is

A static, read-only portfolio viewer for **Coinbase tokenized stocks on Base**. Connect any EVM wallet (MetaMask, Rabby, ...) or look up an address / ENS name view-only, see stock balances, and get buy/swap links.

- **Scope is strict:** Coinbase-issued stock tokens, on Base only. Other assets, issuers and chains are never shown. Say so in copy wherever scope matters.
- **No backend, no database.** Everything is read from Base (RPC) and DexScreener (prices) in the browser.
- **Live at** `https://onchainstocks.pawiromitchel.com/` (GitHub Pages custom domain; DNS `CNAME onchainstocks -> pawiromitchel.github.io`; the `cname` input in `deploy.yml` writes the CNAME file on `gh-pages`). Author: Mitchel, https://pawiromitchel.com/
- The app never asks for signatures or approvals. Swaps happen on the exchange's own site.

## Commands

```bash
npm install
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build  -> dist/
npm run lint         # oxlint
npm run test:e2e     # Playwright (desktop + Pixel 7), everything mocked, ~15s
npm run sync         # refresh src/stocks.json from the Coinbase API
npx playwright install chromium   # once, before the first e2e run
```

Before finishing any change: `npx tsc -b && npx oxlint && npm run test:e2e`.

## Stack

Vite + React 19 + TypeScript, wagmi v3 + viem + TanStack Query, Motion (`motion/react`), plain CSS (no Tailwind), Playwright. Node 22 in CI.

## Architecture

```
src/
  main.tsx                 providers: Wagmi, QueryClient, LazyMotion(strict), MotionConfig(reducedMotion="user"); prefetches quotes
  App.tsx                  shell: header, routed view, footer, connect modal. Chooses the view (see Flow), sets document.title per route.
  wagmi.ts                 chains [base, mainnet(ENS only)], injected() connector, publicnode RPCs (VITE_BASE_RPC / VITE_MAINNET_RPC override)
  stocks.json              GENERATED snapshot of the Coinbase tokenized stocks API. Do not hand-edit.
  tokens.ts                turns stocks.json into the STOCKS allowlist (+ colors, short names)
  hooks/useQuotes.ts       DexScreener quotes (deepest pool per token), THIN_LIQUIDITY_USD, useMarket() for the stock list
  hooks/usePortfolio.ts    balanceOf multicall on Base + quotes -> held / notHeld rows, totals, 24h delta, freshness
  hooks/useTheme.ts        light/dark, persisted in localStorage, sets <html data-theme>
  lib/venues.ts            swap deep links per exchange (Aerodrome first)
  lib/history.ts           price history from GeckoTerminal OHLCV (7D hourly closes, 30D 4-hour closes) for a token's deepest pool
  lib/dexscreener.ts       quote URLs (30 addresses per request), shared with vite.config.ts
  lib/route.ts             hash routing: #/, #/stocks, #/stock/<SYMBOL>, #/about, #/view/<0x address | name.eth>
  lib/recent.ts            recent view-only lookups (localStorage, max 5, guarded)
  lib/format.ts            money, compact money, amount, change, "x ago", address formatting
  components/              Header (+ nav), Landing, Market (MarketTable, MarketPage), StockPage, PriceChart, About (FAQ),
                           ConnectModal, Portfolio (+ Holding, VenueMenu), Tile, Freshness, CopyButton, CountUp
  index.css                all styling, CSS variables per theme
scripts/sync-stocks.mjs    fetches the API into src/stocks.json (keeps the old file if the API is down)
tests/e2e/                 fixtures.ts (mock RPC, DexScreener, fake EIP-6963 wallet) + app.spec.ts
.github/workflows/         test.yml, deploy.yml, sync-stocks.yml
```

### Data rules (easy to get wrong)

- **Token list** comes from `https://api.coinbase.com/v1/tokenized-stocks` (58 tokens at time of writing; base.org/stocks shows only a subset). That API sends **no CORS headers**, so the browser cannot call it. It is snapshotted into `src/stocks.json` at CI time. Never add a runtime fetch to it.
- **Only addresses in the allowlist are read.** Keep it that way so look-alike tokens never show.
- **Decimals** come from the API (8 for these tokens, not 18). Don't assume 18.
- **Prices** are DEX pool prices from DexScreener (`/tokens/v1/base/{addresses}`, max 30 per call, so it is chunked). The deepest-liquidity pool wins. Under $25k liquidity is flagged "thin" (warn in UI and in the venue menu). A token with no pool has no price and **no buy button**.
- **Price history** (stock page only) comes from GeckoTerminal (`api.geckoterminal.com`, sends CORS headers, free but rate limited, so fetch it only on the stock page). DexScreener has none. The pool address is the deepest pool's `pairAddress`, stored on each quote (`Quote.pool`; quotes cached before the chart existed lack it, so the chart waits for fresh prices). 7D = hourly closes, 30D = 4-hour closes; the chosen range is kept in localStorage (`chart-range`). Hidden when a token has no pool.
- **24h delta** is derived from each token's own h24 % change.
- **Balances are read on Base regardless of the wallet's current network**, so there is no "wrong network" state to handle.
- wagmi **auto-reconnects** a wallet that has already authorized the site. That is expected.

## Performance (keep it fast)

Measured on a throttled phone profile (4G at 1.6 Mbps and 150 ms latency, 4x slower CPU): first and largest paint went from ~1.7 s to ~0.55 s, layout shift from 0.013 to 0, and the first-load transfer from 378 KB to 358 KB. Network, not CPU, is the bottleneck, so bytes on the critical path matter most.

- **Static shell**: `index.html` contains the header and the landing headline, so they paint before any JS. An inline script fits it to the route (drops the headline on other routes or when `wagmi.store` says a wallet is connected, sets `aria-current`) and sets `<html data-shell="hero|bare">`. React replaces it on mount; `App`/`Landing` skip the intro animation for the parts the shell already showed. **If you change the header or the landing headline/lede/tag, change `index.html` too.** The "static shell" e2e test fails if they differ.
- **Prices start in the HTML**: the `prefetch-quotes` plugin in `vite.config.ts` injects a script that fires the DexScreener requests immediately (`window.__quotes`); `useQuotes` consumes it once, then fetches normally.
- **Price cache**: the last quotes are kept in `localStorage` (`quotes-cache`, max 1 h old) and used as `initialData`, so repeat visits show prices instantly; the freshness line shows their age and they are refetched at once.
- **Chunks** (`vite.config.ts`): `react`, `motion`, `web3` (all other npm code) and the app, so a deploy only invalidates the small app chunk. The ENS normalizer (~25 KB gzipped) is loaded on demand in `ViewOnly` (dynamic `import('viem/ens')`) and kept out of `web3` by the `LAZY_ENS` pattern.
- Fonts load without blocking paint (`preload` + `media="print"` swap); preconnects for DexScreener and the Base RPC.
- Don't add dependencies to the critical path casually; check `npm run build` output (no chunk should near 500 KB).

## User flow

Header nav on every screen: **Portfolio** (`#/`), **Stocks** (`#/stocks`), **About** (`#/about`), with `aria-current` on the active one. On phones the nav drops to its own row and "Connect wallet" shortens to "Connect".

1. **Landing** (not connected, no hash): headline, "Connect wallet" button, a "look up any wallet, view only" field (address or ENS) with up to 5 **recent lookups** below it (only lookups that resolved; "Clear" wipes them), a **"How it works"** column on the right, and **"Deepest pools on Base"**: the top 8 stocks by liquidity with a "See all N stocks" link.
2. **Connect** -> modal lists wallets found via EIP-6963 (falls back to a generic "Injected" entry). Success closes the modal and shows the connected portfolio. No WalletConnect yet (needs a Reown project ID).
3. **Connected portfolio**: total value (count-up), 24h change (moves under half a cent show as `<$0.01`), allocation bar + legend, a side panel with positions, largest holding, "Updated Xs ago" + refresh, and "Browse all N stocks", "Your stocks" table sorted by value, each row with **Buy more** (Aerodrome deep link) and a chevron menu with all venues. Below: **"Not in your wallet yet"**, only stocks that have a pool, deepest first, 8 shown, "Show all N stocks" expands. Header wallet chip has a disconnect button.
4. **View only** (`#/view/<address|ens>`): yellow banner ("View only. You are looking at ...") with **Copy link** and **Look up another**, same totals, side panel and table, **no buy buttons, no venue menu, no "not in your wallet" section, no "Browse all stocks"**. "Look up another" returns to landing. ENS resolves on mainnet; unresolvable input shows "Could not find a wallet".
5. **Stocks** (`#/stocks`): all stocks with price, 24h, pool liquidity (thin flag) and a Buy link, deepest first, stocks without a pool last ("No pool yet"). Search by ticker or company; sort by clicking column headers (desktop) or the Sort select (phones, where headers are hidden). Freshness + refresh.
6. **Stock page** (`#/stock/<SYMBOL>`, case-insensitive): name, DEX price, 24h, pool liquidity (+ thin warning), your balance if connected, **Price history** (line chart, 7D/30D toggle, high/low/change; hover, drag or arrow keys read a price; SVG drawn at real pixel width, no chart library), every venue as a row with its own link, contract address with Copy + BaseScan. Unknown symbols get "Not a Coinbase stock token". Asset names in every table link here.
7. **About** (`#/about`): FAQ as `<details>`.
8. **Empty wallet**: "No Coinbase tokenized stocks in this wallet on Base." (connected users still see the buy cards).

View-only is a hard rule: anything that implies trading is hidden.

## UI direction

The look is **financial newspaper, not crypto dashboard**: ruled tables, serif numbers, hard shadows, flat color. It was deliberately moved away from a purple/lime "DeFi" look (too close to Jumper Exchange's design). **Do not reintroduce purple gradients, glassmorphism, rounded-pill everything, or glow.**

**Typography** (Google Fonts, loaded in `index.html`)
- Fraunces (serif): brand (italic 600), headings, big totals, row values.
- IBM Plex Sans: body and buttons.
- IBM Plex Mono: prices, balances, addresses, percentages, legends.

**Layout**: 1360px max width, 80px side padding (16px under 900px). Heavy 3px ink rule under the header, 1px hairlines between rows. Sharp corners on boxes and buttons; only token tiles are rounded (10px).

**Color tokens** (CSS variables on `:root[data-theme=...]`):

| Token | Light | Dark (OLED) |
| --- | --- | --- |
| `--bg` | `#f3efe6` | `#000000` |
| `--ink` | `#14181f` | `#f2efe8` |
| `--muted` | `#5a606b` | `#9b9ba4` |
| `--card` | `#fffdf8` | `#0b0b0d` |
| `--soft` (hairlines) | `#cfc8b8` | `#26262b` |
| `--btn-bg` / `--btn-ink` | `#14181f` / `#f3efe6` | `#f2efe8` / `#000000` |
| `--up` / `--down` | `#0a7a4b` / `#b3261e` | `#4ade80` / `#ff7b72` |
| `--base` (chain dot) | `#2446ff` | `#6b87ff` |
| `--accent` (logo square, view-only banner) | `#f2b705` | `#f2b705` |

- Dark mode must stay **true black** (OLED). Initial theme: saved choice, else `prefers-color-scheme`. An inline script in `index.html` sets it before paint.
- Token tiles/allocation colors have a light and a dark variant (`--cl` / `--cd`); dark variants are lighter so they read on black.
- Gains/losses never rely on color alone: always a triangle (▲/▼) plus sign.
- Primary action = solid ink button. Secondary = outlined. The accent yellow is only for the logo square and the view-only banner.

**Components to keep consistent**
- Stock tile: official Coinbase equity icon on a white rounded square with a small Base dot badge; falls back to a serif monogram if the image fails.
- Venue menu: paper card, 1px ink border, `6px 6px 0` hard shadow, "Deepest liquidity" note in green on Aerodrome, thin-liquidity warning in red.
- Connect modal: native `<dialog>` with `showModal()`, same hard shadow.
- Section headers use `.block-head` (h2 left, link right, wraps on phones). Page headers use `.page-head` (3px rule, serif h1).
- Metadata lives in `index.html`: description, canonical, Open Graph + Twitter tags (`public/og.png`, 1200x630, light theme), JSON-LD `WebApplication`, theme-color (updated by `useTheme` when toggled). Icons: `favicon.svg` (source of truth), `favicon.ico`, `apple-touch-icon.png`, `icon-192/512.png`, `icon-maskable-512.png` (mark within the safe zone), referenced by `manifest.webmanifest`. Also `robots.txt` and `sitemap.xml` (home only; hash routes are one URL to crawlers). If you change the brand or headline, re-render og.png and the icons.
- Footer: scope disclaimer on the left, **"Created with ❤️ by Mitchel"** (links to https://pawiromitchel.com/) on the right. Keep it on every screen.

**Responsive**: under 900px the holdings table becomes compact rows (asset + value on top; price / 24h / balance in three columns; full-width actions). Stock cards go two columns, tile stacked above the name. No horizontal scrolling at any width (tested).

**Accessibility**: real `<button>`/`<a>`/`<label>`; icon-only buttons have `aria-label`; 44px touch targets; `:focus-visible` ring; errors use `role="alert"`, the view-only banner `role="status"`. Keep contrast at 4.5:1 or better in both themes.

**Motion** (Motion, `m.*` components only because `LazyMotion strict` is on):
- Landing: staggered fade/slide-in. View changes: short fade.
- Holdings rows: fade + slide, staggered (capped at 10). Buy cards: lighter stagger.
- Total value counts up (`CountUp`); allocation segments grow from zero.
- Modal: spring in, eased out. Venue menu: quick scale/fade. Theme icon: rotate swap. Theme change cross-fades colors via a temporary `.theme-anim` class.
- Everything respects `prefers-reduced-motion` (`MotionConfig reducedMotion="user"`, `CountUp` jumps straight to the value).
- Motion should explain state changes, never delay reading data. Keep durations under ~0.5s (count-up and bar growth up to ~0.9s).

**Copy**: plain and short. Always make the scope clear ("Coinbase-issued", "Base only"). No financial advice; keep the "not financial advice" line in the footer. No emoji except the footer heart.

## Testing

`tests/e2e/fixtures.ts` mocks the Base RPC (`eth_call` to Multicall3 `aggregate3` -> fake `balanceOf` results), the mainnet RPC (returns empty), DexScreener, and icon images, and injects a fake EIP-6963 wallet ("Test Wallet") that only exposes accounts after `eth_requestAccounts`. Fixture wallet holds NVDAc 1.5, AAPLc 2, TSLAc 0.25 -> total `$1,000.00`; TSLAc is a thin pool; WENc and BIRDc have no pool.

- Tests run on a desktop and a Pixel 7 project with `reducedMotion: 'reduce'`; the `motion` describe opts back into animations.
- When you change visible copy, roles or labels, update the specs. They query by role/name.
- Not covered (check by hand): real ENS resolution, the exchange deep links in `lib/venues.ts` (formats are from public URL schemes, not click-tested), real wallets.

## CI/CD (`.github/workflows/`)

1. `test.yml`: PRs and pushes to `main`: `tsc -b`, `oxlint`, Playwright. Uploads traces on failure.
2. `deploy.yml`: push to `main` (i.e. a merged PR) or manual: `npm ci`, `npm run build`, copy `index.html` to `404.html`, publish `dist/` to the `gh-pages` branch with `peaceiris/actions-gh-pages@v3` (same pattern as the pawiromitchel.com repo). Pages source must be "Deploy from a branch: gh-pages".
3. `sync-stocks.yml`: daily cron (05:17 UTC) or manual: runs `npm run sync`; if `src/stocks.json` changed, commits it to `main` and runs `gh workflow run deploy.yml` (pushes made with `GITHUB_TOKEN` don't trigger other workflows, hence the explicit dispatch).

Build output is relative (`base: './'`) with hash routing, so it works at any path, including `/onchainstocks/`.

## Conventions

- TypeScript strict, no `any` unless unavoidable. Keep components small; styles go in `index.css` using the tokens above.
- Don't add dependencies casually (first load is ~180 KB of gzipped JS across four chunks).
- Don't commit `node_modules`, `dist`, `test-results`, `.env*.local` (all gitignored). `VITE_*` env vars end up in the public bundle, so never put secrets in them.
- Commits: short imperative subject; explain why in the body.

## Open items / ideas

- Verify each venue deep link in `lib/venues.ts` by clicking through.
- WalletConnect for mobile wallets (needs a Reown project ID).
- Further speed: the ~106 KB of web fonts compete with JS on first load; lazy-loading wagmi/viem until a wallet is needed would take ~60 KB off the critical path (bigger refactor).
- E2E for real ENS resolution.
- Optional: per-token detail (history chart), cost basis (would need an indexer or backend, out of scope for now).
