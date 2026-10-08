/**
 * Detects whether the current environment is a mobile-class device based on
 * viewport width (< 768px) or low hardware concurrency (<= 4 cores).
 * Returns false during SSR or non-browser environments.
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || navigator.hardwareConcurrency <= 4;
}
