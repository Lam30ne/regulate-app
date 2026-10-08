import {
  RESET_DURATION_MS,
  FADE_IN_MS,
  WIND_DOWN_AT_MS,
  FADE_OUT_AT_MS,
  TEN_MINUTE_DURATION_MS,
  TEN_MINUTE_WIND_DOWN_AT_MS,
  TEN_MINUTE_FADE_OUT_AT_MS,
} from "./constants";

export type SessionState =
  | "idle"
  | "starting"
  | "running"
  | "winding-down"
  | "stopping"
  | "completed";

export type SessionDuration = "five-minute" | "ten-minute" | "open";

export interface SessionCallbacks {
  onStateChange: (state: SessionState, duration: SessionDuration) => void;
  onComplete?: () => void;
}

export class SessionController {
  private state: SessionState = "idle";
  private duration: SessionDuration = "five-minute";
  private startTime = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private callbacks: SessionCallbacks;

  constructor(callbacks: SessionCallbacks) {
    this.callbacks = callbacks;
  }

  getState(): SessionState {
    return this.state;
  }

  getSessionDuration(): SessionDuration {
    return this.duration;
  }

  getElapsedMs(): number {
    if (this.state === "idle") return 0;
    return performance.now() - this.startTime;
  }

  getProgress(): number {
    if (this.duration === "open") return 0;
    if (this.state === "completed") return 1;
    if (this.state === "idle") return 0;
    const totalMs = this.duration === "ten-minute" ? TEN_MINUTE_DURATION_MS : RESET_DURATION_MS;
    return Math.min(1, this.getElapsedMs() / totalMs);
  }

  getWindDownProgress(): number {
    if (this.state !== "winding-down") return 0;
    const elapsed = this.getElapsedMs();
    const windDownAt = this.duration === "ten-minute" ? TEN_MINUTE_WIND_DOWN_AT_MS : WIND_DOWN_AT_MS;
    const fadeOutAt = this.duration === "ten-minute" ? TEN_MINUTE_FADE_OUT_AT_MS : FADE_OUT_AT_MS;
    const windDownDuration = fadeOutAt - windDownAt;
    return Math.min(1, Math.max(0, (elapsed - windDownAt) / windDownDuration));
  }

  startReset(): void {
    this.startSession("five-minute");
  }

  startTenMinuteReset(): void {
    this.startSession("ten-minute");
  }

  startOpen(): void {
    this.startSession("open");
  }

  private startSession(d: SessionDuration): void {
    if (this.state !== "idle" && this.state !== "completed") return;
    this.duration = d;
    this.startTime = performance.now();
    this.setState("starting");
    this.startTicking();
  }

  stop(): void {
    if (this.state === "idle" || this.state === "completed") return;
    this.setState("stopping");
    this.stopTicking();
  }

  replay(): void {
    this.stopTicking();
    this.state = "idle";
    this.startSession(this.duration);
  }

  dispose(): void {
    this.stopTicking();
    this.state = "idle";
  }

  private setState(next: SessionState): void {
    if (this.state === next) return;
    this.state = next;
    this.callbacks.onStateChange(next, this.duration);
    if (next === "completed") {
      this.callbacks.onComplete?.();
    }
  }

  private startTicking(): void {
    this.stopTicking();
    this.tickInterval = setInterval(() => this.tick(), 250);
  }

  private stopTicking(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private tick(): void {
    if (this.state === "idle" || this.state === "completed") return;

    const elapsed = this.getElapsedMs();

    if (this.state === "stopping" && this.duration !== "open") {
      const totalMs = this.duration === "ten-minute" ? TEN_MINUTE_DURATION_MS : RESET_DURATION_MS;
      if (elapsed >= totalMs) {
        this.stopTicking();
        this.setState("completed");
        return;
      }
    }

    if (this.state === "stopping") return;

    if (this.duration === "open") {
      if (this.state === "starting" && elapsed >= FADE_IN_MS) {
        this.setState("running");
      }
      return;
    }

    const windDownAt = this.duration === "ten-minute" ? TEN_MINUTE_WIND_DOWN_AT_MS : WIND_DOWN_AT_MS;
    const fadeOutAt = this.duration === "ten-minute" ? TEN_MINUTE_FADE_OUT_AT_MS : FADE_OUT_AT_MS;

    if (this.state === "starting" && elapsed >= FADE_IN_MS) {
      this.setState("running");
    }

    if (this.state === "running" && elapsed >= windDownAt) {
      this.setState("winding-down");
    }

    if (this.state === "winding-down" && elapsed >= fadeOutAt) {
      this.setState("stopping");
    }
  }
}
