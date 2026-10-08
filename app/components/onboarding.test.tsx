import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Onboarding, hasSeenOnboarding } from "./onboarding";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("hasSeenOnboarding", () => {
  it("returns false when not seen", () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("returns true after onboarding is dismissed", async () => {
    const onDismiss = vi.fn();
    render(<Onboarding onDismiss={onDismiss} />);

    const user = userEvent.setup();
    await user.click(screen.getByText("Start ambient reset"));

    expect(hasSeenOnboarding()).toBe(true);
  });
});

describe("Onboarding", () => {
  it("renders the before-you-begin screen", () => {
    render(<Onboarding onDismiss={vi.fn()} />);
    expect(screen.getByText("Before you begin")).toBeInTheDocument();
    expect(screen.getByText("Start ambient reset")).toBeInTheDocument();
    expect(screen.getByText("Use external focus")).toBeInTheDocument();
  });

  it("calls onDismiss with ambient-rhythm when primary button clicked", async () => {
    const onDismiss = vi.fn();
    render(<Onboarding onDismiss={onDismiss} />);

    const user = userEvent.setup();
    await user.click(screen.getByText("Start ambient reset"));
    expect(onDismiss).toHaveBeenCalledWith("ambient-rhythm");
  });

  it("calls onDismiss with external-focus when secondary button clicked", async () => {
    const onDismiss = vi.fn();
    render(<Onboarding onDismiss={onDismiss} />);

    const user = userEvent.setup();
    await user.click(screen.getByText("Use external focus"));
    expect(onDismiss).toHaveBeenCalledWith("external-focus");
  });

  it("toggles safety information", async () => {
    render(<Onboarding onDismiss={vi.fn()} />);
    const user = userEvent.setup();

    expect(screen.queryByText(/Consult a qualified clinician/)).not.toBeInTheDocument();

    await user.click(screen.getByText("Review safety information"));
    expect(screen.getByText(/Consult a qualified clinician/)).toBeInTheDocument();

    await user.click(screen.getByText("Hide safety information"));
    expect(screen.queryByText(/Consult a qualified clinician/)).not.toBeInTheDocument();
  });
});
