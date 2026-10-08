import type { SoundscapeId } from "./settings";

export const BRAND = {
  name: "Regulate",
  shortName: "Regulate",
  description: "A passive ambient reset designed to support relaxation.",
} as const;

export const APP_TITLE = BRAND.name;
export const APP_SUBTITLE = "Ambient sound & visuals";

// 5-minute reset timing
export const RESET_DURATION_MS = 300_000;
export const FADE_IN_MS = 5_000;
export const WIND_DOWN_AT_MS = 255_000;
export const FADE_OUT_AT_MS = 295_000;

// 10-minute reset timing
export const TEN_MINUTE_DURATION_MS = 600_000;
export const TEN_MINUTE_WIND_DOWN_AT_MS = 540_000;
export const TEN_MINUTE_FADE_OUT_AT_MS = 595_000;

export const MASTER_SWELL_DEPTH = 0.20;

export const ONBOARDING_VERSION = 1;
export const ONBOARDING_STORAGE_KEY = "regulate-onboarding-v";

export const SOUNDSCAPE_DESCRIPTIONS: Record<SoundscapeId, string> = {
  calm: "Warm tones for settling",
  ground: "Earthy tones for presence",
  drift: "Airy tones for drifting",
};
