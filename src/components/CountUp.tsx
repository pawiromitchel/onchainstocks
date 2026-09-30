import { animate, m, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { fmtUsd } from '../lib/format'

// Counts from the previous value to the new one, so refreshed prices glide instead of jump.
export function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? value : 0)
  const text = useTransform(mv, fmtUsd)

  useEffect(() => {
    if (reduce) {
      mv.set(value)
      return
    }
    const controls = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [value, reduce, mv])

  return <m.span data-testid="total-value">{text}</m.span>
}
