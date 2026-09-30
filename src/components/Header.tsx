import { AnimatePresence, m } from 'motion/react'
import type { Theme } from '../hooks/useTheme'

export function Header({
  theme,
  onToggleTheme,
  children,
}: {
  theme: Theme
  onToggleTheme: () => void
  children?: React.ReactNode
}) {
  return (
    <header className="header">
      <a className="brand" href="#/" aria-label="Crypto Stonks home">
        <span className="brand-mark" />
        <span className="brand-name">Crypto Stonks</span>
      </a>
      <div className="header-actions">
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={theme}
              className="icon-swap"
              initial={{ rotate: -70, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 70, scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
              )}
            </m.span>
          </AnimatePresence>
        </button>
        <span className="chip"><i className="dot-base" />Base</span>
        {children}
      </div>
    </header>
  )
}
