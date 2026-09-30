# onchainstocks

Crypto Stonks: a stock-only portfolio viewer for [Coinbase tokenized stocks on Base](https://www.base.org/stocks).

- Connect MetaMask, Rabby or any other EVM wallet and see your balances of the 10 Coinbase-issued stock tokens.
- Buy or swap links per stock (Aerodrome first, plus Uniswap, Matcha, 1inch and CoW Swap).
- **View-only mode:** paste any `0x` address or `name.eth` to look up a wallet. No buy buttons, nothing to sign. Shareable as `#/view/<address or ens>`.
- Light and OLED dark themes.
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

## Deploy to GitHub Pages

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it.
One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

The build uses a relative base path and hash routing, so it works at `https://<user>.github.io/onchainstocks/` or on a custom domain without changes.

## How it works

- `src/tokens.ts` is the allowlist of the 10 token addresses. Nothing outside it is ever read.
- `src/hooks/usePortfolio.ts` multicalls `balanceOf` and `decimals` on Base, and pulls prices and 24h change from the deepest DEX pool per token. Pools under $25k liquidity are flagged as thin (currently MSTRc and TSLAc).
- `src/lib/venues.ts` builds the swap deep links. Click-test them if you change them.

## Caveats

- Prices are DEX pool prices, not stock exchange prices. They can drift from the real market, especially outside market hours.
- Tokenized stocks are not available in all regions. Not financial advice.
