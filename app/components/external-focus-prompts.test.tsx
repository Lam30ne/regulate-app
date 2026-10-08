import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { ExternalFocusPrompts } from "./external-focus-prompts";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ExternalFocusPrompts", () => {
  it("renders nothing when not active", () => {
    const { container } = render(
      <ExternalFocusPrompts active={false} visible={true} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when not visible", () => {
    const { container } = render(
      <ExternalFocusPrompts active={true} visible={false} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders an aria-live region when active and visible", () => {
    const { container } = render(
      <ExternalFocusPrompts active={true} visible={true} />,
    );
    const liveRegion = container.querySelector("[aria-live]");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });

  it("renders the first prompt initially", () => {
    render(<ExternalFocusPrompts active={true} visible={true} />);
    expect(
      screen.getByText("Notice one color around you."),
    ).toBeInTheDocument();
  });

  it("starts with opacity 0 before initial delay", () => {
    render(<ExternalFocusPrompts active={true} visible={true} />);
    const promptEl = screen.getByText("Notice one color around you.");
    expect(promptEl.style.opacity).toBe("0");
  });

  it("shows prompt after initial delay", () => {
    vi.useFakeTimers();
    render(<ExternalFocusPrompts active={true} visible={true} />);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    const promptEl = screen.getByText("Notice one color around you.");
    expect(promptEl.style.opacity).toBe("1");
  });

  it("cycles to next prompt after interval", () => {
    vi.useFakeTimers();
    render(<ExternalFocusPrompts active={true} visible={true} />);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(
      screen.getByText("Notice one color around you."),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(45_000);
    });
    expect(
      screen.getByText("Notice one sound outside the app."),
    ).toBeInTheDocument();
  });

  it("clears interval on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <ExternalFocusPrompts active={true} visible={true} />,
    );

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    unmount();
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(45_000);
      });
    }).not.toThrow();
  });
});
