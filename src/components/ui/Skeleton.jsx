import { cn } from '../../lib/utils'

export function Skeleton({ className, circle = false }) {
  return (
    <div
      className={cn(
        'animate-shimmer bg-gradient-to-r from-cream-dark via-[#e0ddd5] to-cream-dark bg-[length:200%_100%]',
        circle ? 'rounded-full' : 'rounded-soft',
        className
      )}
    />
  )
}

export function StokvelCardSkeleton() {
  return (
    <div className="bg-white border-2 border-ink rounded-soft p-4 flex items-center gap-3 mb-2">
      <Skeleton circle className="h-10 w-10" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function StokvelDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-white border-2 border-ink rounded-soft p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="bg-white border border-ink/20 rounded-soft p-4 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  )
}
