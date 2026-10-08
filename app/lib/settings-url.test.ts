import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadSettingsFromUrl, buildShareUrl, DEFAULT_SETTINGS } from "./settings";
import type { UserSettings } from "./settings";

let originalLocation: Location;

beforeEach(() => {
  originalLocation = window.location;
  localStorage.clear();
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
  });
});

function setSearch(search: string) {
  Object.defineProperty(window, "location", {
    value: { ...originalLocation, search, pathname: "/regulate-app/", origin: "https://example.com" },
    writable: true,
  });
}

describe("loadSettingsFromUrl", () => {
  it("returns empty object when no params", () => {
    setSearch("");
    expect(loadSettingsFromUrl()).toEqual({});
  });

  it("parses valid soundscape", () => {
    setSearch("?s=drift");
    expect(loadSettingsFromUrl()).toEqual({ soundscape: "drift" });
  });

  it("parses valid rhythm preset", () => {
    setSearch("?r=slower");
    expect(loadSettingsFromUrl()).toEqual({ rhythmPreset: "slower" });
  });

  it("parses valid pathway", () => {
    setSearch("?p=external-focus");
    expect(loadSettingsFromUrl()).toEqual({ pathway: "external-focus" });
  });

  it("parses valid cycle shape", () => {
    setSearch("?cs=balanced");
    expect(loadSettingsFromUrl()).toEqual({ cycleShape: "balanced" });
  });

  it("parses binaural on/off", () => {
    setSearch("?b=off");
    expect(loadSettingsFromUrl()).toEqual({ binauralEnabled: false });

    setSearch("?b=on");
    expect(loadSettingsFromUrl()).toEqual({ binauralEnabled: true });
  });

  it("ignores invalid values", () => {
    setSearch("?s=invalid&r=nope");
    expect(loadSettingsFromUrl()).toEqual({});
  });

  it("parses multiple valid params", () => {
    setSearch("?s=ground&r=faster&p=external-focus");
    expect(loadSettingsFromUrl()).toEqual({
      soundscape: "ground",
      rhythmPreset: "faster",
      pathway: "external-focus",
    });
  });

  it("ignores unknown params", () => {
    setSearch("?s=calm&foo=bar");
    expect(loadSettingsFromUrl()).toEqual({ soundscape: "calm" });
  });
});

describe("buildShareUrl", () => {
  it("returns base URL when all settings are default", () => {
    setSearch("");
    const url = buildShareUrl(DEFAULT_SETTINGS);
    expect(url).toBe("https://example.com/regulate-app/");
  });

  it("only includes non-default values", () => {
    setSearch("");
    const settings: UserSettings = { ...DEFAULT_SETTINGS, soundscape: "drift" };
    const url = buildShareUrl(settings);
    expect(url).toContain("s=drift");
    expect(url).not.toContain("r=");
    expect(url).not.toContain("p=");
  });

  it("encodes binaural as on/off", () => {
    setSearch("");
    const settings: UserSettings = { ...DEFAULT_SETTINGS, binauralEnabled: false };
    const url = buildShareUrl(settings);
    expect(url).toContain("b=off");
  });

  it("round-trips: build then parse", () => {
    const custom: UserSettings = {
      ...DEFAULT_SETTINGS,
      soundscape: "drift",
      rhythmPreset: "slower",
      pathway: "external-focus",
      cycleShape: "balanced",
      binauralEnabled: false,
    };
    setSearch("");
    const url = buildShareUrl(custom);
    const search = "?" + url.split("?")[1];
    setSearch(search);
    const parsed = loadSettingsFromUrl();
    expect(parsed.soundscape).toBe("drift");
    expect(parsed.rhythmPreset).toBe("slower");
    expect(parsed.pathway).toBe("external-focus");
    expect(parsed.cycleShape).toBe("balanced");
    expect(parsed.binauralEnabled).toBe(false);
  });
});
