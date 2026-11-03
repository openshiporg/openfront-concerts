import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PlatformSurface({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[24px] border border-zinc-200/80 bg-zinc-50/95 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]',
        'dark:border-white/10 dark:bg-zinc-950/70 dark:shadow-none',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function PlatformSurfaceHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string
  description?: string
  eyebrow?: string
  action?: ReactNode
}) {
  return (
    <header className="border-b border-zinc-200/80 px-4 py-4 sm:px-5 dark:border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-[11px] uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  )
}

export function PlatformSurfaceBody({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn('p-3 sm:p-4', className)}>{children}</div>
}

export function PlatformMetaStrip({
  items,
}: {
  items: Array<{ label: string; value: string }>
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-zinc-200/80 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/5"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            {item.label}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

export function PlatformSubcard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-zinc-200/80 bg-white p-3 sm:p-4 dark:border-white/10 dark:bg-white/5',
        className,
      )}
    >
      {children}
    </div>
  )
}
