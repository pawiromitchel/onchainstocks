import { useState } from 'react'
import { isAddress, type Address } from 'viem'
import { normalize } from 'viem/ens'
import { mainnet } from 'wagmi/chains'
import { useAccount, useDisconnect, useEnsAddress, useEnsName } from 'wagmi'
import { ConnectModal } from './components/ConnectModal'
import { Header } from './components/Header'
import { Landing } from './components/Landing'
import { Portfolio } from './components/Portfolio'
import { useTheme } from './hooks/useTheme'
import { shortAddr } from './lib/format'
import { leaveView, useViewTarget } from './lib/route'

function safeNormalize(name: string) {
  try {
    return normalize(name)
  } catch {
    return undefined
  }
}

function ViewOnly({ target }: { target: string }) {
  const direct = isAddress(target, { strict: false })
  const name = direct ? undefined : safeNormalize(target)
  const ens = useEnsAddress({ name, chainId: mainnet.id, query: { enabled: !!name } })
  const address = (direct ? target : ens.data) as Address | undefined

  return (
    <>
      <div className="banner" role="status">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
        <p>
          <strong>View only.</strong> You are looking at <code>{direct ? shortAddr(target) : target}</code>
          {!direct && address && <> <code className="faint">({shortAddr(address)})</code></>}. Buying and swapping need a connected wallet.
        </p>
        <button className="btn btn-outline" onClick={leaveView}>Look up another</button>
      </div>
      {address ? (
        <Portfolio address={address} viewOnly />
      ) : ens.isLoading ? (
        <p className="empty">Resolving {target}…</p>
      ) : (
        <p className="empty">Could not find a wallet for “{target}”. Check the address or ENS name.</p>
      )}
    </>
  )
}

export default function App() {
  const { theme, toggle } = useTheme()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const ensName = useEnsName({ address, chainId: mainnet.id })
  const target = useViewTarget()
  const [modal, setModal] = useState(false)

  const wallet = isConnected && address ? (
    <span className="chip chip-wallet">
      <i className="dot-live" />
      {ensName.data ?? shortAddr(address)}
      <button className="icon-btn ghost sm" onClick={() => disconnect()} aria-label="Disconnect wallet">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
      </button>
    </span>
  ) : (
    <button className="btn" onClick={() => setModal(true)}>Connect wallet</button>
  )

  return (
    <div className="shell">
      <Header theme={theme} onToggleTheme={toggle}>{wallet}</Header>

      {target ? (
        <ViewOnly target={target} />
      ) : isConnected && address ? (
        <Portfolio address={address} viewOnly={false} />
      ) : (
        <Landing onConnect={() => setModal(true)} />
      )}

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

      {modal && !isConnected && <ConnectModal onClose={() => setModal(false)} />}
    </div>
  )
}
