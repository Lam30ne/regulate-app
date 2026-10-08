import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Controls } from "./components/controls";
import { SettingsPanel } from "./components/settings-panel";
import { Onboarding } from "./components/onboarding";
import type { UserSettings } from "./lib/settings";

afterEach(() => {
  cleanup();
});

const noop = () => {};

const defaultSettings: UserSettings = {
  soundscape: "calm",
  volume: 0.7,
  brightness: 0.7,
  rhythmPreset: "steady",
  cycleShape: "longer-release",
  binauralEnabled: true,
  motionPreference: "system",
  experienceMode: "audio-visuals",
  keepControlsVisible: false,
  announceRhythm: false,
  pathway: "ambient-rhythm",
  audioReactivity: "on",
};

describe("Accessibility (axe-core)", () => {
  it("Controls in idle state has no violations", async () => {
    const { container } = render(
      <Controls
        sessionState="idle"
        sessionType="five-minute"
        progress={0}
        soundscape="calm"
        volume={0.7}
        brightness={0.7}
        pathway="ambient-rhythm"
        onStartReset={noop}
        onStartTenMinuteReset={noop}
        onStartOpen={noop}
        onStop={noop}
        onReplay={noop}
        onSoundscapeChange={noop}
        onVolumeChange={noop}
        onBrightnessChange={noop}
        onPathwayChange={noop}
        onOpenSettings={noop}
      />,
    );
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it("Controls in running state has no violations", async () => {
    const { container } = render(
      <Controls
        sessionState="running"
        sessionType="five-minute"
        progress={0.5}
        soundscape="calm"
        volume={0.7}
        brightness={0.7}
        pathway="ambient-rhythm"
        onStartReset={noop}
        onStartTenMinuteReset={noop}
        onStartOpen={noop}
        onStop={noop}
        onReplay={noop}
        onSoundscapeChange={noop}
        onVolumeChange={noop}
        onBrightnessChange={noop}
        onPathwayChange={noop}
        onOpenSettings={noop}
      />,
    );
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it("SettingsPanel has no violations", async () => {
    const { container } = render(
      <SettingsPanel
        settings={defaultSettings}
        onUpdate={noop}
        isOpen={true}
        onClose={noop}
      />,
    );
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it("Onboarding screen has no violations", async () => {
    const { container } = render(<Onboarding onDismiss={noop} />);
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it("Controls in completed state has no violations", async () => {
    const { container } = render(
      <Controls
        sessionState="completed"
        sessionType="five-minute"
        progress={1}
        soundscape="calm"
        volume={0.7}
        brightness={0.7}
        pathway="ambient-rhythm"
        onStartReset={noop}
        onStartTenMinuteReset={noop}
        onStartOpen={noop}
        onStop={noop}
        onReplay={noop}
        onSoundscapeChange={noop}
        onVolumeChange={noop}
        onBrightnessChange={noop}
        onPathwayChange={noop}
        onOpenSettings={noop}
      />,
    );
    const results = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });
});
