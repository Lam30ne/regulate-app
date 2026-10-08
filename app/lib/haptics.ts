export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

export function hapticTap(enabled: boolean, ms: number = 50): void {
  if (enabled && canVibrate()) {
    navigator.vibrate(ms);
  }
}
