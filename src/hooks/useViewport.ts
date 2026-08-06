import { useEffect, useState } from 'react'

/**
 * Viewport width, as the three decisions the layout actually makes.
 *
 * The prototype was drawn at desktop 1440 and its screens are built from inline
 * style objects, so media queries in the stylesheet cannot reach them — a CSS
 * rule loses to a `style` attribute. Breakpoints are therefore read in JS and
 * fed back into the same style objects, which keeps each screen's layout
 * readable in one place instead of split across a stylesheet.
 */

/** Below this the sidebar stops being a column and becomes an overlay. */
export const SIDEBAR_BREAKPOINT = 900
/** Below this a screen's right-hand panel stacks under the main column. */
export const STACK_BREAKPOINT = 1160
/** Below this we are on a phone: single column, tighter padding, bigger taps. */
export const PHONE_BREAKPOINT = 640

export interface Viewport {
  width: number
  /** Phone-sized: stack everything, shrink the chrome. */
  isPhone: boolean
  /** Sidebar is an overlay rather than a column. */
  isNarrow: boolean
  /** Side panels stack under the main column. */
  isCompact: boolean
}

const read = (): Viewport => {
  // Guard for a non-browser render; the desktop layout is the sensible default.
  const width = typeof window === 'undefined' ? 1440 : window.innerWidth
  return {
    width,
    isPhone: width < PHONE_BREAKPOINT,
    isNarrow: width < SIDEBAR_BREAKPOINT,
    isCompact: width < STACK_BREAKPOINT,
  }
}

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState(read)

  useEffect(() => {
    let frame = 0
    const onResize = () => {
      // Resize fires per pixel dragged; one update per frame is plenty.
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setViewport((prev) => {
          const next = read()
          // Only re-render when a decision changes, not on every pixel.
          return prev.isPhone === next.isPhone &&
            prev.isNarrow === next.isNarrow &&
            prev.isCompact === next.isCompact
            ? prev
            : next
        })
      })
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  return viewport
}
