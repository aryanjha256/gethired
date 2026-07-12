import * as React from "react"

const MOBILE_BREAKPOINT = 768

// window.matchMedia is an external, subscribable browser API, not React
// state — useSyncExternalStore subscribes to its "change" event and reads a
// fresh snapshot on each one, instead of a useEffect that calls setState.
function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}
