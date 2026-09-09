import { useRef, useState, useEffect, useCallback } from 'react'

// A single line of text the user can swipe sideways to read in full, for
// labels too long to fit — ceremony checklist items especially, where the
// old ellipsis hid the end of the sentence with no way to see it.
//
// The right edge fades only while there is more text off-screen, so it reads
// as an invitation to keep pushing, and clears once the user reaches the end
// so the last words aren't left permanently faded.
export default function ScrollableLabel({ children, className = '' }) {
  const ref = useRef(null)
  const [hasMore, setHasMore] = useState(false)
  // Where the finger went down, so a swipe to read the label doesn't also
  // count as a tap. These labels sit inside the row's toggle button, and
  // ticking an item off as "bought" just because someone dragged it to read
  // the end would be worse than the truncation this replaces.
  const gesture = useRef({ x: 0, scrollLeft: 0 })

  const onPointerDown = (e) => {
    gesture.current = { x: e.clientX, scrollLeft: ref.current?.scrollLeft ?? 0 }
  }

  const onClickCapture = (e) => {
    const el = ref.current
    if (!el) return
    const movedFinger = Math.abs(e.clientX - gesture.current.x) > 8
    const movedText = Math.abs(el.scrollLeft - gesture.current.scrollLeft) > 1
    if (movedFinger || movedText) {
      // A drag, not a tap — swallow it before the row's toggle sees it.
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    // 1px of tolerance — sub-pixel widths otherwise report a phantom overflow
    // on text that actually fits.
    setHasMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 1)
  }, [])

  useEffect(() => {
    update()
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    // Re-check when the row is resized — rotating the phone, or the Buy
    // button appearing and taking width away from the label.
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [update, children])

  return (
    <span
      ref={ref}
      onScroll={update}
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
      className={`scroll-x-text ${hasMore ? 'scroll-x-text--more' : ''} ${className}`}
    >
      {children}
    </span>
  )
}
