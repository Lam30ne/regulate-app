import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoodCheckIn } from "./mood-check-in";

afterEach(() => {
  cleanup();
});

describe("MoodCheckIn", () => {
  it("renders before-phase heading", () => {
    render(<MoodCheckIn phase="before" onSelect={() => {}} onSkip={() => {}} />);
    expect(screen.getByText("How are you feeling?")).toBeInTheDocument();
  });

  it("renders after-phase heading", () => {
    render(<MoodCheckIn phase="after" onSelect={() => {}} onSkip={() => {}} />);
    expect(screen.getByText("How are you feeling now?")).toBeInTheDocument();
  });

  it("renders all 5 mood options", () => {
    render(<MoodCheckIn phase="before" onSelect={() => {}} onSkip={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
  });

  it("calls onSelect with correct rating when mood button is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MoodCheckIn phase="before" onSelect={onSelect} onSkip={() => {}} />);

    await user.click(screen.getByLabelText("4 out of 5, Good"));
    expect(onSelect).toHaveBeenCalledWith(4);
  });

  it("calls onSkip when skip button is clicked", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<MoodCheckIn phase="before" onSelect={() => {}} onSkip={onSkip} />);

    await user.click(screen.getByText("Skip"));
    expect(onSkip).toHaveBeenCalled();
  });

  it("has dialog role with correct aria attributes", () => {
    render(<MoodCheckIn phase="before" onSelect={() => {}} onSkip={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Mood check-in");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("shows reassurance text", () => {
    render(<MoodCheckIn phase="before" onSelect={() => {}} onSkip={() => {}} />);
    expect(screen.getByText(/just for you/)).toBeInTheDocument();
  });
});
