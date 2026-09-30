# onchainstocks

Crypto Stonks: a stock-only portfolio viewer for [Coinbase tokenized stocks on Base](https://www.base.org/stocks).

- Connect MetaMask, Rabby or any other EVM wallet and see your balances of every Coinbase-issued stock token on Base (40 at the time of writing).
- Buy or swap links per stock (Aerodrome first, plus Uniswap, Matcha, 1inch and CoW Swap).
- **View-only mode:** paste any `0x` address or `name.eth` to look up a wallet. No buy buttons, nothing to sign. Shareable as `#/view/<address or ens>`.
- Light and OLED dark themes, with [Motion](https://motion.dev) animations that respect the visitor's reduced-motion setting.
- Fully static: no backend, no database. Balances are read straight from Base, prices from DexScreener.

## Develop

```bash
npm install
npm run dev
```

Optional environment variables (for example in `.env.local`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_BASE_RPC` | Base RPC endpoint | `https://base-rpc.publicnode.com` |
| `VITE_MAINNET_RPC` | Ethereum mainnet RPC, used only for ENS | `https://ethereum-rpc.publicnode.com` |

The public RPCs are rate limited. For heavy use, point these at your own Alchemy, Infura or QuickNode key. Note that any `VITE_` value ends up in the public bundle.

## Test

```bash
npm run test:e2e
```

Playwright drives a real Chromium on a desktop and a phone viewport. A fake EIP-6963 wallet stands in for MetaMask or Rabby, and the Base RPC and DexScreener are mocked, so the suite is fast, deterministic and needs no network. It covers connect, disconnect, reconnect on reload, view-only lookup, the venue menu, the expandable stock list, theme persistence, horizontal overflow and animation completion. CI runs it on every push and pull request (`.github/workflows/test.yml`). Failed runs upload traces.

Not covered: ENS resolution against the real mainnet, and whether each exchange's deep link still opens the right pair. Check those by hand.

## Deploy to GitHub Pages

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it.
One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

The build uses a relative base path and hash routing, so it works at `https://<user>.github.io/onchainstocks/` or on a custom domain without changes.

## How it works

- `src/stocks.json` is a snapshot of the official [Coinbase tokenized stocks API](https://docs.base.org/sdks/tokenized-stocks/api-reference/list-tokenized-stocks) (`npm run sync`, also run by every build). The API sends no CORS headers, so the browser can't call it directly. A daily GitHub Actions run re-syncs the list, commits `src/stocks.json` if it changed, and redeploys, so new listings appear without a code change. (If you protect `main`, allow the Actions bot to push, or that commit step will fail.)
- `src/tokens.ts` turns that snapshot into the allowlist of token addresses. Nothing outside it is ever read.
- `src/hooks/usePortfolio.ts` multicalls `balanceOf` on Base, and pulls prices and 24h change from the deepest DEX pool per token. Pools under $25k liquidity are flagged as thin (for example MSTRc and TSLAc at the time of writing). Stocks with no DEX pool yet have no buy button.
- `src/lib/venues.ts` builds the swap deep links. Click-test them if you change them.

## Caveats

- Prices are DEX pool prices, not stock exchange prices. They can drift from the real market, especially outside market hours.
- Tokenized stocks are not available in all regions. Not financial advice.
