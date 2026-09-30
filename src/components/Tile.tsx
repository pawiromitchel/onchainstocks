import { useState } from 'react'
import type { Stock } from '../tokens'

// Official Coinbase equity icon with a Base dot; falls back to a serif monogram.
export function Tile({ stock, size = 44 }: { stock: Stock; size?: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      className={stock.icon && !failed ? 'tile tile-icon' : 'tile'}
      style={{ '--cl': stock.light, '--cd': stock.dark, width: size, height: size } as React.CSSProperties}
      aria-hidden="true"
    >
      {stock.icon && !failed ? (
        <img src={stock.icon} alt="" width={size} height={size} onError={() => setFailed(true)} loading="lazy" decoding="async" />
      ) : (
        stock.mono
      )}
      <i className="tile-base"><i /></i>
    </span>
  )
}
