import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPanel } from "./settings-panel";
import type { UserSettings } from "../lib/settings";

afterEach(() => {
  cleanup();
});

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

function renderPanel(overrides: Partial<{ settings: UserSettings; isOpen: boolean }> = {}) {
  const onUpdate = vi.fn();
  const onClose = vi.fn();
  const result = render(
    <SettingsPanel
      settings={overrides.settings ?? defaultSettings}
      onUpdate={onUpdate}
      isOpen={overrides.isOpen ?? true}
      onClose={onClose}
    />,
  );
  return { ...result, onUpdate, onClose };
}

describe("SettingsPanel", () => {
  it("renders nothing when closed", () => {
    const { container } = renderPanel({ isOpen: false });
    expect(container.innerHTML).toBe("");
  });

  it("renders settings heading when open", () => {
    renderPanel();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("has a dialog role", () => {
    renderPanel();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const { onClose } = renderPanel();
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Close settings"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders rhythm presets", () => {
    renderPanel();
    expect(screen.getByText("Slower")).toBeInTheDocument();
    expect(screen.getByText("Steady")).toBeInTheDocument();
    expect(screen.getByText("Faster")).toBeInTheDocument();
  });

  it("toggles binaural tones", async () => {
    const { onUpdate } = renderPanel();
    const user = userEvent.setup();
    const label = screen.getByText("Binaural tones");
    const container = label.parentElement!.parentElement!;
    const toggle = within(container).getByRole("switch");
    await user.click(toggle);
    expect(onUpdate).toHaveBeenCalledWith({ binauralEnabled: false });
  });

  it("renders experience mode options", () => {
    renderPanel();
    expect(screen.getByText("Audio + Visuals")).toBeInTheDocument();
    expect(screen.getByText("Audio only")).toBeInTheDocument();
    expect(screen.getByText("Visuals only")).toBeInTheDocument();
  });

  it("renders motion preference fieldset", () => {
    renderPanel();
    const motionLegend = screen.getByText("Motion");
    const fieldset = motionLegend.closest("fieldset")!;
    expect(within(fieldset).getByText("Full")).toBeInTheDocument();
    expect(within(fieldset).getByText("Static")).toBeInTheDocument();
  });

  it("toggles safety information", async () => {
    renderPanel();
    const user = userEvent.setup();

    await user.click(screen.getByText("Review safety information"));
    expect(screen.getByText(/Consult a qualified clinician/)).toBeInTheDocument();
  });
});
