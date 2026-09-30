import { STOCKS } from '../tokens'

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'What are Coinbase tokenized stocks?',
    a: (
      <>
        Tokens issued by Coinbase on Base that track a listed company’s share price, such as NVDAc for NVIDIA. There
        are {STOCKS.length} of them right now. The list comes from Coinbase’s own API and is refreshed every day.
      </>
    ),
  },
  {
    q: 'Why only Base, and why only Coinbase?',
    a: (
      <>
        That is where Coinbase issues them. Showing one issuer on one chain keeps the list short and makes look-alike
        tokens impossible: the site only reads balances for the exact contract addresses Coinbase publishes.
      </>
    ),
  },
  {
    q: 'Why does the price differ from the stock market?',
    a: (
      <>
        Prices come from on-chain DEX pools (via DexScreener), not from a stock exchange. They trade around the clock,
        including when markets are closed, and a small pool can drift. Pools under $25K are marked “thin”.
      </>
    ),
  },
  {
    q: 'Does this site touch my funds?',
    a: (
      <>
        No. It only reads balances. It never asks for a signature or an approval. Buy links open an exchange such as
        Aerodrome or Uniswap, and you confirm everything there.
      </>
    ),
  },
  {
    q: 'Why is a token I own missing?',
    a: (
      <>
        It is either on another chain, from another issuer, or a look-alike at a different address. Open the stock’s
        page here to compare contract addresses.
      </>
    ),
  },
  {
    q: 'Can I look at someone else’s wallet?',
    a: (
      <>
        Yes, enter any address or ENS name on the home page. That view is read-only and has a link you can share.
      </>
    ),
  },
]

export function About() {
  return (
    <main>
      <section className="page-head">
        <div className="eyebrow">About</div>
        <h1>Questions, answered</h1>
      </section>
      <section className="faq">
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>
      <p className="sub">Not financial advice. Availability of tokenized stocks varies by region.</p>
    </main>
  )
}
