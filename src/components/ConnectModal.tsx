import { m } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useConnect, useConnectors } from 'wagmi'

export function ConnectModal({ onClose }: { onClose: () => void }) {
  const connectors = useConnectors()
  const { connect, isPending, error, variables } = useConnect({
    mutation: { onSuccess: onClose },
  })
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  // Wallets found through EIP-6963 have their own id; the generic fallback is only
  // useful when nothing else was detected.
  const detected = connectors.filter((c) => c.id !== 'injected')
  const list = detected.length ? detected : connectors

  return (
    <dialog ref={dialog} className="modal" onClose={onClose} onClick={(e) => e.target === dialog.current && onClose()}>
      <m.div
        className="modal-card"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <div className="modal-head">
          <h2>Connect a wallet</h2>
          <button className="icon-btn ghost" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="wallet-list">
          {list.map((c) => (
            <button key={c.uid} className="wallet" disabled={isPending} onClick={() => connect({ connector: c })}>
              {c.icon ? <img src={c.icon} alt="" width="36" height="36" /> : <span className="wallet-fallback">{c.name[0]}</span>}
              <span className="wallet-name">{c.name}</span>
              <span className="wallet-tag">
                {isPending && variables?.connector === c ? 'Waiting…' : c.id === 'injected' ? 'Browser wallet' : 'Detected'}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="form-error" role="alert">{error.message.split('\n')[0]}</p>}
        {!detected.length && (
          <p className="modal-note">No wallet extension found. Install MetaMask or Rabby, or open this site in your wallet's browser.</p>
        )}
        <p className="modal-note">We only read balances. Nothing is signed unless you choose to swap on an exchange.</p>
      </m.div>
    </dialog>
  )
}
