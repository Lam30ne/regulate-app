import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionHistory } from "./session-history";
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

describe("SessionHistory", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <SessionHistory isOpen={false} onClose={() => {}} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows empty state when no history", () => {
    render(<SessionHistory isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("No sessions yet")).toBeInTheDocument();
  });

  it("renders session entries", () => {
    seedHistory([sampleRecord]);
    render(<SessionHistory isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("5m 0s")).toBeInTheDocument();
  });

  it("shows stopped early for incomplete sessions", () => {
    seedHistory([{ ...sampleRecord, completed: false, actualDurationMs: 120000 }]);
    render(<SessionHistory isOpen={true} onClose={() => {}} />);
    expect(screen.getByText("stopped early")).toBeInTheDocument();
    expect(screen.getByText("2m 0s")).toBeInTheDocument();
  });

  it("clears history on double-click of clear button", async () => {
    const user = userEvent.setup();
    seedHistory([sampleRecord]);
    render(<SessionHistory isOpen={true} onClose={() => {}} />);

    const clearBtn = screen.getByText("Clear history");
    await user.click(clearBtn);
    expect(screen.getByText("Confirm clear history")).toBeInTheDocument();

    await user.click(screen.getByText("Confirm clear history"));
    expect(screen.getByText("No sessions yet")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SessionHistory isOpen={true} onClose={onClose} />);

    await user.click(screen.getByLabelText("Close history"));
    expect(onClose).toHaveBeenCalled();
  });

  it("has dialog role", () => {
    render(<SessionHistory isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-label",
      "Session history",
    );
  });
});
