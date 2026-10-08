import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RhythmAnnouncer } from "./rhythm-announcer";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(100_000);
});

describe("RhythmAnnouncer", () => {
  it("renders nothing when disabled", () => {
    const { container } = render(
      <RhythmAnnouncer enabled={false} breathPhase={0.6} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when enabled but no phase transition", () => {
    const { container } = render(
      <RhythmAnnouncer enabled={true} breathPhase={0.3} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders an aria-live region", () => {
    const { rerender } = render(
      <RhythmAnnouncer enabled={true} breathPhase={0.4} />,
    );
    vi.spyOn(Date, "now").mockReturnValue(103_000);
    rerender(<RhythmAnnouncer enabled={true} breathPhase={0.6} />);
    const region = screen.getByText("rising");
    expect(region.closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  });

  it("announces 'rising' when phase crosses above 0.5", () => {
    const { rerender } = render(
      <RhythmAnnouncer enabled={true} breathPhase={0.4} />,
    );
    vi.spyOn(Date, "now").mockReturnValue(103_000);
    rerender(<RhythmAnnouncer enabled={true} breathPhase={0.6} />);
    expect(screen.getByText("rising")).toBeInTheDocument();
  });

  it("announces 'settling' when phase crosses below 0.5", () => {
    const { rerender } = render(
      <RhythmAnnouncer enabled={true} breathPhase={0.6} />,
    );
    vi.spyOn(Date, "now").mockReturnValue(103_000);
    rerender(<RhythmAnnouncer enabled={true} breathPhase={0.4} />);
    expect(screen.getByText("settling")).toBeInTheDocument();
  });

  it("throttles announcements to 2 seconds apart", () => {
    const { rerender } = render(
      <RhythmAnnouncer enabled={true} breathPhase={0.4} />,
    );

    vi.spyOn(Date, "now").mockReturnValue(100_500);
    rerender(<RhythmAnnouncer enabled={true} breathPhase={0.6} />);
    expect(screen.getByText("rising")).toBeInTheDocument();

    vi.spyOn(Date, "now").mockReturnValue(101_000);
    rerender(<RhythmAnnouncer enabled={true} breathPhase={0.4} />);
    expect(screen.getByText("rising")).toBeInTheDocument();
    expect(screen.queryByText("settling")).not.toBeInTheDocument();
  });

  it("clears announcement when disabled", () => {
    const { rerender } = render(
      <RhythmAnnouncer enabled={true} breathPhase={0.4} />,
    );
    vi.spyOn(Date, "now").mockReturnValue(103_000);
    rerender(<RhythmAnnouncer enabled={true} breathPhase={0.6} />);
    expect(screen.getByText("rising")).toBeInTheDocument();

    rerender(<RhythmAnnouncer enabled={false} breathPhase={0.6} />);
    expect(screen.queryByText("rising")).not.toBeInTheDocument();
  });

  it("has aria-atomic attribute", () => {
    const { rerender } = render(
      <RhythmAnnouncer enabled={true} breathPhase={0.4} />,
    );
    vi.spyOn(Date, "now").mockReturnValue(103_000);
    rerender(<RhythmAnnouncer enabled={true} breathPhase={0.6} />);
    expect(screen.getByText("rising").closest("[aria-atomic]")).toHaveAttribute(
      "aria-atomic",
      "true",
    );
  });
});
