/* eslint-disable @next/next/no-img-element */
// A photo staff uploaded on the event or venue. With none there is a plain panel, never a decorative fill.
export function Photo({ src, alt, className = '', priority }: { src: string | null; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-lg bg-black/10 ${className}`}>
      {src ? <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} className="size-full object-cover" />
        : <div className="flex size-full items-center justify-center text-sm text-black/50">No photo yet</div>}
    </div>
  );
}
