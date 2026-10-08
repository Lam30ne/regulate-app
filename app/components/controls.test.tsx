import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Controls } from "./controls";

afterEach(() => {
  cleanup();
});

function renderControls(overrides: Record<string, unknown> = {}) {
  const defaults = {
    sessionState: "idle" as const,
    sessionType: "five-minute" as const,
    progress: 0,
    soundscape: "calm" as const,
    volume: 0.7,
    brightness: 0.7,
    pathway: "ambient-rhythm" as const,
    onStartReset: vi.fn(),
    onStartTenMinuteReset: vi.fn(),
    onStartOpen: vi.fn(),
    onStop: vi.fn(),
    onReplay: vi.fn(),
    onSoundscapeChange: vi.fn(),
    onVolumeChange: vi.fn(),
    onBrightnessChange: vi.fn(),
    onPathwayChange: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  };
  return { ...render(<Controls {...defaults} />), ...defaults };
}

describe("Controls", () => {
  it("renders start buttons when idle", () => {
    renderControls();
    expect(screen.getByText("Start 5-Minute Reset")).toBeInTheDocument();
    expect(screen.getByText("10-Minute Reset")).toBeInTheDocument();
    expect(screen.getByText("Open session")).toBeInTheDocument();
  });

  it("calls onStartReset when start button clicked", async () => {
    const { onStartReset } = renderControls();
    const user = userEvent.setup();
    await user.click(screen.getByText("Start 5-Minute Reset"));
    expect(onStartReset).toHaveBeenCalledOnce();
  });

  it("renders stop button when active", () => {
    renderControls({ sessionState: "running" });
    expect(screen.getByLabelText("Stop")).toBeInTheDocument();
    expect(screen.queryByText("Start 5-Minute Reset")).not.toBeInTheDocument();
  });

  it("calls onStop when stop button clicked", async () => {
    const { onStop } = renderControls({ sessionState: "running" });
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Stop"));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("renders soundscape buttons", () => {
    renderControls();
    expect(screen.getByText("Calm")).toBeInTheDocument();
    expect(screen.getByText("Ground")).toBeInTheDocument();
    expect(screen.getByText("Drift")).toBeInTheDocument();
  });

  it("marks current soundscape as pressed", () => {
    renderControls({ soundscape: "ground" });
    expect(screen.getByText("Ground")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Calm")).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onSoundscapeChange on click", async () => {
    const { onSoundscapeChange } = renderControls();
    const user = userEvent.setup();
    await user.click(screen.getByText("Drift"));
    expect(onSoundscapeChange).toHaveBeenCalledWith("drift");
  });

  it("renders pathway selector", () => {
    renderControls();
    expect(screen.getByText("Ambient Rhythm")).toBeInTheDocument();
    expect(screen.getByText("External Focus")).toBeInTheDocument();
  });

  it("has volume and brightness sliders", () => {
    renderControls();
    expect(screen.getByLabelText("Volume")).toBeInTheDocument();
    expect(screen.getByLabelText("Visual brightness")).toBeInTheDocument();
  });

  it("renders settings button", async () => {
    const { onOpenSettings } = renderControls();
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Open settings"));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("has toolbar role for accessibility", () => {
    renderControls();
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });
});
