import { useState } from 'react'

export function CopyButton({ text, label, className = 'btn btn-outline' }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard can be blocked; the text is still on screen to copy by hand */
    }
  }

  return (
    <button className={className} onClick={copy} aria-live="polite">
      {copied ? 'Copied' : label}
    </button>
  )
}
