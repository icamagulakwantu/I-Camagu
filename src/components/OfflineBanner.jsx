import { useState, useEffect } from 'react'

// A real, common gap for members on mobile data in areas with patchy
// coverage: every screen just showed a generic "could not load" toast with
// no indication of *why*, indistinguishable from a real server error. This
// says plainly when the device itself has no connection.
export default function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[200] bg-terracotta text-white text-center text-xs font-bold py-2 px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}
    >
      You're offline — some features won't work until you're back online.
    </div>
  )
}
