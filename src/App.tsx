import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { useEffect, useState } from 'react'
import { isAddress, type Address } from 'viem'
import { mainnet } from 'wagmi/chains'
import { useAccount, useDisconnect, useEnsAddress, useEnsName } from 'wagmi'
import { About } from './components/About'
import { ConnectModal } from './components/ConnectModal'
import { CopyButton } from './components/CopyButton'
import { Header } from './components/Header'
import { Landing } from './components/Landing'
import { MarketPage } from './components/Market'
import { Portfolio } from './components/Portfolio'
import { StockPage } from './components/StockPage'
import { useTheme } from './hooks/useTheme'
import { shortAddr } from './lib/format'
import { rememberLookup } from './lib/recent'
import { leaveView, useRoute, type Route } from './lib/route'

// The ENS normalizer (~25 KB gzipped) is only needed to look up a name, so it loads on demand.
async function safeNormalize(name: string) {
  const { normalize } = await import('viem/ens')
  try {
    return normalize(name)
  } catch {
    return null
  }
}

function ViewOnly({ target }: { target: string }) {
  const direct = isAddress(target, { strict: false })
  const normalized = useQuery({
    queryKey: ['ens-normalize', target],
    queryFn: () => safeNormalize(target),
    enabled: !direct,
    staleTime: Infinity,
  })
  const name = normalized.data ?? undefined
  const ens = useEnsAddress({ name, chainId: mainnet.id, query: { enabled: !!name } })
  const address = (direct ? target : ens.data) as Address | undefined

  // Only remember lookups that actually led to a wallet.
  useEffect(() => {
    if (address) rememberLookup(target)
  }, [address, target])

  return (
    <>
      <div className="banner" role="status">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
        <p>
          <strong>View only.</strong> You are looking at <code>{direct ? shortAddr(target) : target}</code>
          {!direct && address && <> <code className="faint">({shortAddr(address)})</code></>}. Buying and swapping need a connected wallet.
        </p>
        <div className="banner-actions">
          <CopyButton text={window.location.href} label="Copy link" />
          <button className="btn btn-outline" onClick={leaveView}>Look up another</button>
        </div>
      </div>
      {address ? (
        <Portfolio address={address} viewOnly />
      ) : normalized.isLoading || ens.isLoading ? (
        <p className="empty">Resolving {target}…</p>
      ) : (
        <p className="empty">Could not find a wallet for “{target}”. Check the address or ENS name.</p>
      )}
    </>
  )
}

const SITE = 'Onchain Stocks'

function titleFor(route: Route) {
  switch (route.name) {
    case 'stocks': return `All stocks · ${SITE}`
    case 'stock': return `${route.symbol} · ${SITE}`
    case 'about': return `About · ${SITE}`
    case 'view': return `${route.target} · ${SITE}`
    default: return SITE
  }
}

export default function App() {
  const { theme, toggle } = useTheme()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const ensName = useEnsName({ address, chainId: mainnet.id })
  const route = useRoute()
  const [modal, setModal] = useState(false)
  const routeKey = route.name === 'view' ? `view:${route.target}` : route.name === 'stock' ? `stock:${route.symbol}` : route.name

  const viewKey = route.name === 'home' ? (isConnected ? 'connected' : 'landing') : routeKey
  // index.html already painted the landing headline; don't fade it out and back in on mount.
  const [firstKey] = useState(viewKey)
  const fromShell = document.documentElement.dataset.shell === 'hero' && viewKey === firstKey

  useEffect(() => {
    document.title = titleFor(route)
    window.scrollTo(0, 0)
  }, [routeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const wallet = isConnected && address ? (
    <span className="chip chip-wallet">
      <i className="dot-live" />
      {ensName.data ?? shortAddr(address)}
      <button className="icon-btn ghost sm" onClick={() => disconnect()} aria-label="Disconnect wallet">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
      </button>
    </span>
  ) : (
    <button className="btn" onClick={() => setModal(true)} aria-label="Connect wallet">
      <span className="long">Connect wallet</span><span className="short" aria-hidden="true">Connect</span>
    </button>
  )

  return (
    <div className="shell">
      <Header theme={theme} route={route} onToggleTheme={toggle}>{wallet}</Header>

      <m.div
        key={viewKey}
        className="view"
        initial={fromShell ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {route.name === 'view' ? (
          <ViewOnly target={route.target} />
        ) : route.name === 'stocks' ? (
          <MarketPage />
        ) : route.name === 'stock' ? (
          <StockPage symbol={route.symbol} owner={isConnected ? address : undefined} />
        ) : route.name === 'about' ? (
          <About />
        ) : isConnected && address ? (
          <Portfolio address={address} viewOnly={false} />
        ) : (
          <Landing onConnect={() => setModal(true)} fromShell={fromShell} />
        )}
      </m.div>

      <footer className="footer">
        <p>
          Tokenized stocks are issued by Coinbase and exist on Base only. Tokens from other issuers or other chains
          are ignored. Prices come from on-chain DEX pools via DexScreener and can differ from stock market prices.
          Availability varies by region. Not financial advice.
        </p>
        <p className="love">
          Created with ❤️ by <a href="https://pawiromitchel.com/" target="_blank" rel="noreferrer noopener">Mitchel</a>
        </p>
      </footer>

      <AnimatePresence>{modal && !isConnected && <ConnectModal onClose={() => setModal(false)} />}</AnimatePresence>
    </div>
  )
}
