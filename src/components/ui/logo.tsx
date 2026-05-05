'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  linkTo?: string
}

export function Logo({ className, size = 'md', linkTo = '/' }: LogoProps) {
  const sizes = {
    sm: { badge: 'w-7 h-7 text-xs', text: 'text-lg' },
    md: { badge: 'w-9 h-9 text-sm', text: 'text-xl' },
    lg: { badge: 'w-12 h-12 text-base', text: 'text-2xl' },
  }
  const s = sizes[size]

  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className={cn('rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center font-black text-white shrink-0', s.badge)}>
        G
      </div>
      <span className={cn('font-black text-foreground', s.text)}>
        Gabarit<span className="gradient-text dark:gradient-text-dark">AI</span>
      </span>
    </div>
  )

  if (!linkTo) return content
  return <Link href={linkTo}>{content}</Link>
}
