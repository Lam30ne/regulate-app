import { describe, it, expect, beforeEach } from "vitest";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "./settings";

beforeEach(() => {
  localStorage.clear();
});

describe("loadSettings", () => {
  it("returns defaults when localStorage is empty", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults when stored value is invalid JSON", () => {
    localStorage.setItem("regulate-settings", "not json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults when stored value is null", () => {
    localStorage.setItem("regulate-settings", "null");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("merges partial saved data with defaults", () => {
    localStorage.setItem("regulate-settings", JSON.stringify({ volume: 0.3 }));
    const result = loadSettings();
    expect(result.volume).toBe(0.3);
    expect(result.brightness).toBe(DEFAULT_SETTINGS.brightness);
    expect(result.soundscape).toBe(DEFAULT_SETTINGS.soundscape);
  });

  it("ignores invalid field values", () => {
    localStorage.setItem(
      "regulate-settings",
      JSON.stringify({ soundscape: "invalid", volume: -5, binauralEnabled: "yes" }),
    );
    const result = loadSettings();
    expect(result.soundscape).toBe(DEFAULT_SETTINGS.soundscape);
    expect(result.volume).toBe(DEFAULT_SETTINGS.volume);
    expect(result.binauralEnabled).toBe(DEFAULT_SETTINGS.binauralEnabled);
  });

  it("loads all valid fields correctly including new fields", () => {
    const custom = {
      rhythmPreset: "slower" as const,
      binauralEnabled: false,
      experienceMode: "audio-only" as const,
      motionPreference: "reduced" as const,
      keepControlsVisible: true,
      volume: 0.5,
      brightness: 0.3,
      soundscape: "drift" as const,
      pathway: "external-focus" as const,
      audioReactivity: "reduced" as const,
      cycleShape: "balanced" as const,
      announceRhythm: true,
      announcerCadence: "every-other" as const,
      announcerVerbosity: "descriptive" as const,
      hapticEnabled: true,
      highContrast: true,
    };
    localStorage.setItem("regulate-settings", JSON.stringify(custom));
    expect(loadSettings()).toEqual(custom);
  });

  it("defaults new fields when absent from stored data", () => {
    localStorage.setItem(
      "regulate-settings",
      JSON.stringify({ volume: 0.5, soundscape: "ground" }),
    );
    const result = loadSettings();
    expect(result.pathway).toBe(DEFAULT_SETTINGS.pathway);
    expect(result.audioReactivity).toBe(DEFAULT_SETTINGS.audioReactivity);
    expect(result.cycleShape).toBe(DEFAULT_SETTINGS.cycleShape);
    expect(result.announceRhythm).toBe(DEFAULT_SETTINGS.announceRhythm);
    expect(result.announcerCadence).toBe(DEFAULT_SETTINGS.announcerCadence);
    expect(result.announcerVerbosity).toBe(DEFAULT_SETTINGS.announcerVerbosity);
    expect(result.hapticEnabled).toBe(DEFAULT_SETTINGS.hapticEnabled);
    expect(result.highContrast).toBe(DEFAULT_SETTINGS.highContrast);
  });

  it("rejects invalid pathway values", () => {
    localStorage.setItem("regulate-settings", JSON.stringify({ pathway: "invalid" }));
    expect(loadSettings().pathway).toBe(DEFAULT_SETTINGS.pathway);
  });

  it("rejects invalid audioReactivity values", () => {
    localStorage.setItem("regulate-settings", JSON.stringify({ audioReactivity: "max" }));
    expect(loadSettings().audioReactivity).toBe(DEFAULT_SETTINGS.audioReactivity);
  });

  it("rejects invalid cycleShape values", () => {
    localStorage.setItem("regulate-settings", JSON.stringify({ cycleShape: "fast-rise" }));
    expect(loadSettings().cycleShape).toBe(DEFAULT_SETTINGS.cycleShape);
  });

  it("rejects non-boolean announceRhythm", () => {
    localStorage.setItem("regulate-settings", JSON.stringify({ announceRhythm: "yes" }));
    expect(loadSettings().announceRhythm).toBe(DEFAULT_SETTINGS.announceRhythm);
  });

  it("round-trips all valid pathway values", () => {
    for (const p of ["ambient-rhythm", "external-focus"] as const) {
      const s = { ...DEFAULT_SETTINGS, pathway: p };
      saveSettings(s);
      expect(loadSettings().pathway).toBe(p);
    }
  });

  it("round-trips all valid audioReactivity values", () => {
    for (const r of ["on", "reduced", "off"] as const) {
      const s = { ...DEFAULT_SETTINGS, audioReactivity: r };
      saveSettings(s);
      expect(loadSettings().audioReactivity).toBe(r);
    }
  });

  it("round-trips all valid cycleShape values", () => {
    for (const c of ["longer-release", "balanced"] as const) {
      const s = { ...DEFAULT_SETTINGS, cycleShape: c };
      saveSettings(s);
      expect(loadSettings().cycleShape).toBe(c);
    }
  });
});

describe("saveSettings / loadSettings round-trip", () => {
  it("persists and retrieves settings", () => {
    const settings = { ...DEFAULT_SETTINGS, volume: 0.42, soundscape: "ground" as const };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });
});
