import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SessionController } from "./session-controller";
import {
  RESET_DURATION_MS,
  FADE_IN_MS,
  WIND_DOWN_AT_MS,
  FADE_OUT_AT_MS,
  TEN_MINUTE_DURATION_MS,
  TEN_MINUTE_WIND_DOWN_AT_MS,
  TEN_MINUTE_FADE_OUT_AT_MS,
} from "./constants";

let onStateChange: ReturnType<typeof vi.fn>;
let onComplete: ReturnType<typeof vi.fn>;
let controller: SessionController;

beforeEach(() => {
  vi.useFakeTimers();
  onStateChange = vi.fn();
  onComplete = vi.fn();
  controller = new SessionController({ onStateChange, onComplete });
});

afterEach(() => {
  controller.dispose();
  vi.useRealTimers();
});

describe("initial state", () => {
  it("starts in idle", () => {
    expect(controller.getState()).toBe("idle");
  });

  it("returns 0 elapsed when idle", () => {
    expect(controller.getElapsedMs()).toBe(0);
  });

  it("returns 0 progress when idle", () => {
    expect(controller.getProgress()).toBe(0);
  });
});

describe("reset session", () => {
  it("transitions to starting on startReset", () => {
    controller.startReset();
    expect(controller.getState()).toBe("starting");
    expect(controller.getSessionDuration()).toBe("five-minute");
    expect(onStateChange).toHaveBeenCalledWith("starting", "five-minute");
  });

  it("transitions to running after FADE_IN_MS", () => {
    controller.startReset();
    vi.advanceTimersByTime(FADE_IN_MS + 250);
    expect(controller.getState()).toBe("running");
  });

  it("transitions to winding-down after WIND_DOWN_AT_MS", () => {
    controller.startReset();
    vi.advanceTimersByTime(WIND_DOWN_AT_MS + 250);
    expect(controller.getState()).toBe("winding-down");
  });

  it("transitions to stopping after FADE_OUT_AT_MS", () => {
    controller.startReset();
    vi.advanceTimersByTime(FADE_OUT_AT_MS + 250);
    expect(controller.getState()).toBe("stopping");
  });

  it("transitions to completed after RESET_DURATION_MS", () => {
    controller.startReset();
    vi.advanceTimersByTime(RESET_DURATION_MS + 250);
    expect(controller.getState()).toBe("completed");
    expect(onComplete).toHaveBeenCalled();
  });

  it("returns correct progress at midpoint", () => {
    controller.startReset();
    vi.advanceTimersByTime(RESET_DURATION_MS / 2);
    expect(controller.getProgress()).toBeCloseTo(0.5, 1);
  });

  it("returns 1 progress when completed", () => {
    controller.startReset();
    vi.advanceTimersByTime(RESET_DURATION_MS + 250);
    expect(controller.getProgress()).toBe(1);
  });
});

describe("open session", () => {
  it("transitions to starting on startOpen", () => {
    controller.startOpen();
    expect(controller.getState()).toBe("starting");
    expect(controller.getSessionDuration()).toBe("open");
  });

  it("transitions to running after FADE_IN_MS", () => {
    controller.startOpen();
    vi.advanceTimersByTime(FADE_IN_MS + 250);
    expect(controller.getState()).toBe("running");
  });

  it("never transitions to winding-down", () => {
    controller.startOpen();
    vi.advanceTimersByTime(RESET_DURATION_MS + 10000);
    expect(controller.getState()).toBe("running");
  });
});

describe("stop", () => {
  it("transitions through stopping to idle from running", () => {
    controller.startReset();
    vi.advanceTimersByTime(FADE_IN_MS + 250);
    controller.stop();
    expect(controller.getState()).toBe("idle");
    expect(onStateChange).toHaveBeenCalledWith("stopping", "five-minute");
    expect(onStateChange).toHaveBeenCalledWith("idle", "five-minute");
  });

  it("transitions through stopping to idle from starting", () => {
    controller.startReset();
    controller.stop();
    expect(controller.getState()).toBe("idle");
    expect(onStateChange).toHaveBeenCalledWith("stopping", "five-minute");
  });

  it("does nothing from idle", () => {
    controller.stop();
    expect(controller.getState()).toBe("idle");
  });
});

describe("duplicate prevention", () => {
  it("ignores startReset when already running", () => {
    controller.startReset();
    vi.advanceTimersByTime(FADE_IN_MS + 250);
    const callCount = onStateChange.mock.calls.length;
    controller.startReset();
    expect(onStateChange.mock.calls.length).toBe(callCount);
  });
});

describe("replay", () => {
  it("restarts a reset session from completed", () => {
    controller.startReset();
    vi.advanceTimersByTime(RESET_DURATION_MS + 250);
    expect(controller.getState()).toBe("completed");
    controller.replay();
    expect(controller.getState()).toBe("starting");
    expect(controller.getSessionDuration()).toBe("five-minute");
  });
});

describe("dispose", () => {
  it("cleans up timers", () => {
    controller.startReset();
    controller.dispose();
    expect(controller.getState()).toBe("idle");
  });
});

describe("ten-minute reset session", () => {
  it("transitions to starting on startTenMinuteReset", () => {
    controller.startTenMinuteReset();
    expect(controller.getState()).toBe("starting");
    expect(controller.getSessionDuration()).toBe("ten-minute");
    expect(onStateChange).toHaveBeenCalledWith("starting", "ten-minute");
  });

  it("transitions to running after FADE_IN_MS", () => {
    controller.startTenMinuteReset();
    vi.advanceTimersByTime(FADE_IN_MS + 250);
    expect(controller.getState()).toBe("running");
  });

  it("transitions to winding-down after TEN_MINUTE_WIND_DOWN_AT_MS", () => {
    controller.startTenMinuteReset();
    vi.advanceTimersByTime(TEN_MINUTE_WIND_DOWN_AT_MS + 250);
    expect(controller.getState()).toBe("winding-down");
  });

  it("transitions to stopping after TEN_MINUTE_FADE_OUT_AT_MS", () => {
    controller.startTenMinuteReset();
    vi.advanceTimersByTime(TEN_MINUTE_FADE_OUT_AT_MS + 250);
    expect(controller.getState()).toBe("stopping");
  });

  it("transitions to completed after TEN_MINUTE_DURATION_MS", () => {
    controller.startTenMinuteReset();
    vi.advanceTimersByTime(TEN_MINUTE_DURATION_MS + 250);
    expect(controller.getState()).toBe("completed");
    expect(onComplete).toHaveBeenCalled();
  });

  it("returns correct progress at midpoint (300s)", () => {
    controller.startTenMinuteReset();
    vi.advanceTimersByTime(TEN_MINUTE_DURATION_MS / 2);
    expect(controller.getProgress()).toBeCloseTo(0.5, 1);
  });

  it("replays ten-minute session from completed", () => {
    controller.startTenMinuteReset();
    vi.advanceTimersByTime(TEN_MINUTE_DURATION_MS + 250);
    expect(controller.getState()).toBe("completed");
    controller.replay();
    expect(controller.getState()).toBe("starting");
    expect(controller.getSessionDuration()).toBe("ten-minute");
  });
});
