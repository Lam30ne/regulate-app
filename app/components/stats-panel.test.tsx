import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatsPanel } from "./stats-panel";
import type { SessionRecord } from "../lib/session-history";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
});

const sampleRecord: SessionRecord = {
  startedAt: Date.now() - 600000,
  duration: "five-minute",
  soundscape: "calm",
  pathway: "ambient-rhythm",
  actualDurationMs: 300000,
  completed: true,
};

function seedHistory(records: SessionRecord[]) {
  localStorage.setItem("regulate-session-history", JSON.stringify(records));
}

describe("StatsPanel", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <StatsPanel isOpen={false} onClose={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows empty state when no history", () => {
    render(<StatsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("Complete a session to see your stats")).toBeInTheDocument();
  });

  it("displays computed stats when history exists", () => {
    seedHistory([sampleRecord, { ...sampleRecord, completed: false, actualDurationMs: 120000 }]);
    render(<StatsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Calm")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StatsPanel isOpen={true} onClose={onClose} />);

    await user.click(screen.getByLabelText("Close stats"));
    expect(onClose).toHaveBeenCalled();
  });

  it("has dialog role with correct aria attributes", () => {
    render(<StatsPanel isOpen={true} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Usage stats");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("shows mood section when mood data exists", () => {
    seedHistory([{ ...sampleRecord, moodBefore: 2, moodAfter: 4 }]);
    render(<StatsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("Avg mood before")).toBeInTheDocument();
    expect(screen.getByText("Avg mood after")).toBeInTheDocument();
    expect(screen.getByText("Typical shift")).toBeInTheDocument();
  });

  it("hides mood section when no mood data", () => {
    seedHistory([sampleRecord]);
    render(<StatsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.queryByText("Avg mood before")).not.toBeInTheDocument();
    expect(screen.queryByText("Typical shift")).not.toBeInTheDocument();
  });
});
