import { useState, useEffect, useCallback } from "react";
import type { RhythmPresetId, CycleShape } from "./regulation-clock";

export type SoundscapeId = "calm" | "ground" | "drift";
export type ExperienceMode = "audio-visuals" | "audio-only" | "visuals-only";
export type MotionPreference = "system" | "full" | "reduced" | "static";
export type Pathway = "ambient-rhythm" | "external-focus";
export type AudioReactivity = "on" | "reduced" | "off";
export type SessionDuration = "five-minute" | "ten-minute" | "open";
export type AnnouncerCadence = "every-cycle" | "every-other" | "every-five";
export type AnnouncerVerbosity = "minimal" | "descriptive";

export interface UserSettings {
  rhythmPreset: RhythmPresetId;
  binauralEnabled: boolean;
  experienceMode: ExperienceMode;
  motionPreference: MotionPreference;
  keepControlsVisible: boolean;
  volume: number;
  brightness: number;
  soundscape: SoundscapeId;
  pathway: Pathway;
  audioReactivity: AudioReactivity;
  cycleShape: CycleShape;
  announceRhythm: boolean;
  announcerCadence: AnnouncerCadence;
  announcerVerbosity: AnnouncerVerbosity;
  hapticEnabled: boolean;
  highContrast: boolean;
}

const STORAGE_KEY = "regulate-settings";

export const DEFAULT_SETTINGS: UserSettings = {
  rhythmPreset: "steady",
  binauralEnabled: true,
  experienceMode: "audio-visuals",
  motionPreference: "system",
  keepControlsVisible: false,
  volume: 0.7,
  brightness: 0.7,
  soundscape: "calm",
  pathway: "ambient-rhythm",
  audioReactivity: "on",
  cycleShape: "longer-release",
  announceRhythm: false,
  announcerCadence: "every-cycle",
  announcerVerbosity: "minimal",
  hapticEnabled: false,
  highContrast: false,
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { ...DEFAULT_SETTINGS };
    return {
      rhythmPreset: isValidPreset(parsed.rhythmPreset) ? parsed.rhythmPreset : DEFAULT_SETTINGS.rhythmPreset,
      binauralEnabled: typeof parsed.binauralEnabled === "boolean" ? parsed.binauralEnabled : DEFAULT_SETTINGS.binauralEnabled,
      experienceMode: isValidExperience(parsed.experienceMode) ? parsed.experienceMode : DEFAULT_SETTINGS.experienceMode,
      motionPreference: isValidMotion(parsed.motionPreference) ? parsed.motionPreference : DEFAULT_SETTINGS.motionPreference,
      keepControlsVisible: typeof parsed.keepControlsVisible === "boolean" ? parsed.keepControlsVisible : DEFAULT_SETTINGS.keepControlsVisible,
      volume: isValidNumber(parsed.volume) ? parsed.volume : DEFAULT_SETTINGS.volume,
      brightness: isValidNumber(parsed.brightness) ? parsed.brightness : DEFAULT_SETTINGS.brightness,
      soundscape: isValidSoundscape(parsed.soundscape) ? parsed.soundscape : DEFAULT_SETTINGS.soundscape,
      pathway: isValidPathway(parsed.pathway) ? parsed.pathway : DEFAULT_SETTINGS.pathway,
      audioReactivity: isValidAudioReactivity(parsed.audioReactivity) ? parsed.audioReactivity : DEFAULT_SETTINGS.audioReactivity,
      cycleShape: isValidCycleShape(parsed.cycleShape) ? parsed.cycleShape : DEFAULT_SETTINGS.cycleShape,
      announceRhythm: typeof parsed.announceRhythm === "boolean" ? parsed.announceRhythm : DEFAULT_SETTINGS.announceRhythm,
      announcerCadence: isValidAnnouncerCadence(parsed.announcerCadence) ? parsed.announcerCadence : DEFAULT_SETTINGS.announcerCadence,
      announcerVerbosity: isValidAnnouncerVerbosity(parsed.announcerVerbosity) ? parsed.announcerVerbosity : DEFAULT_SETTINGS.announcerVerbosity,
      hapticEnabled: typeof parsed.hapticEnabled === "boolean" ? parsed.hapticEnabled : DEFAULT_SETTINGS.hapticEnabled,
      highContrast: typeof parsed.highContrast === "boolean" ? parsed.highContrast : DEFAULT_SETTINGS.highContrast,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable
  }
}

export function isValidPreset(v: unknown): v is RhythmPresetId {
  return v === "slower" || v === "steady" || v === "faster";
}

export function isValidSoundscape(v: unknown): v is SoundscapeId {
  return v === "calm" || v === "ground" || v === "drift";
}

function isValidExperience(v: unknown): v is ExperienceMode {
  return v === "audio-visuals" || v === "audio-only" || v === "visuals-only";
}

function isValidMotion(v: unknown): v is MotionPreference {
  return v === "system" || v === "full" || v === "reduced" || v === "static";
}

function isValidNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}

export function isValidPathway(v: unknown): v is Pathway {
  return v === "ambient-rhythm" || v === "external-focus";
}

function isValidAudioReactivity(v: unknown): v is AudioReactivity {
  return v === "on" || v === "reduced" || v === "off";
}

export function isValidCycleShape(v: unknown): v is CycleShape {
  return v === "longer-release" || v === "balanced";
}

function isValidAnnouncerCadence(v: unknown): v is AnnouncerCadence {
  return v === "every-cycle" || v === "every-other" || v === "every-five";
}

function isValidAnnouncerVerbosity(v: unknown): v is AnnouncerVerbosity {
  return v === "minimal" || v === "descriptive";
}

const URL_PARAM_MAP: Record<string, keyof UserSettings> = {
  s: "soundscape",
  r: "rhythmPreset",
  p: "pathway",
  cs: "cycleShape",
  b: "binauralEnabled",
};

const REVERSE_PARAM_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(URL_PARAM_MAP).map(([k, v]) => [v, k]),
);

export function loadSettingsFromUrl(): Partial<UserSettings> {
  try {
    const params = new URLSearchParams(window.location.search);
    const overrides: Partial<UserSettings> = {};

    for (const [key, field] of Object.entries(URL_PARAM_MAP)) {
      const val = params.get(key);
      if (val === null) continue;

      if (field === "binauralEnabled") {
        if (val === "on" || val === "true" || val === "1") overrides.binauralEnabled = true;
        else if (val === "off" || val === "false" || val === "0") overrides.binauralEnabled = false;
      } else if (field === "soundscape" && isValidSoundscape(val)) {
        overrides.soundscape = val;
      } else if (field === "rhythmPreset" && isValidPreset(val)) {
        overrides.rhythmPreset = val;
      } else if (field === "pathway" && isValidPathway(val)) {
        overrides.pathway = val;
      } else if (field === "cycleShape" && isValidCycleShape(val)) {
        overrides.cycleShape = val;
      }
    }

    return overrides;
  } catch {
    return {};
  }
}

function loadSettingsWithUrlOverrides(): UserSettings {
  const base = loadSettings();
  const overrides = loadSettingsFromUrl();
  return { ...base, ...overrides };
}

export function buildShareUrl(settings: UserSettings): string {
  const params = new URLSearchParams();

  for (const [field, key] of Object.entries(REVERSE_PARAM_MAP)) {
    const val = settings[field as keyof UserSettings];
    const def = DEFAULT_SETTINGS[field as keyof UserSettings];
    if (val === def) continue;

    if (field === "binauralEnabled") {
      params.set(key, val ? "on" : "off");
    } else {
      params.set(key, String(val));
    }
  }

  const search = params.toString();
  const base = window.location.origin + window.location.pathname;
  return search ? `${base}?${search}` : base;
}

function clearUrlParams(): void {
  if (window.location.search) {
    window.history.replaceState({}, "", window.location.pathname);
  }
}

export function useSettings(): [UserSettings, (update: Partial<UserSettings>) => void] {
  const [settings, setSettings] = useState<UserSettings>(loadSettingsWithUrlOverrides);

  const updateSettings = useCallback((update: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...update };
      saveSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    clearUrlParams();
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  return [settings, updateSettings];
}
