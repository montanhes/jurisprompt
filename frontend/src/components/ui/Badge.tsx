import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  className?: string
}

export default function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-xs px-sm py-1 rounded-full bg-secondary-container text-on-secondary font-label-sm text-label-sm uppercase tracking-wider font-bold ${className}`}
    >
      {children}
    </span>
  )
}
