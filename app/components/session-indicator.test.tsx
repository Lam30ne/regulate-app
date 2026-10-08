import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionIndicator, SessionAnnouncer } from "./session-indicator";

afterEach(() => {
  cleanup();
});

describe("SessionIndicator", () => {
  const defaults = {
    state: "idle" as const,
    sessionType: "five-minute" as const,
    progress: 0,
    onStartAgain: vi.fn(),
    onOpenSession: vi.fn(),
  };

  it("renders nothing when idle", () => {
    const { container } = render(<SessionIndicator {...defaults} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders completion view with buttons", async () => {
    const onStartAgain = vi.fn();
    const onOpenSession = vi.fn();
    render(
      <SessionIndicator
        {...defaults}
        state="completed"
        onStartAgain={onStartAgain}
        onOpenSession={onOpenSession}
      />,
    );

    expect(screen.getByText("Reset complete")).toBeInTheDocument();
    expect(screen.getByText("Run again")).toBeInTheDocument();
    expect(screen.getByText("Open session")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByText("Run again"));
    expect(onStartAgain).toHaveBeenCalledOnce();

    await user.click(screen.getByText("Open session"));
    expect(onOpenSession).toHaveBeenCalledOnce();
  });

  it("renders timer during running state", () => {
    render(
      <SessionIndicator
        {...defaults}
        state="running"
        progress={0.5}
      />,
    );
    expect(screen.getByText("2:30")).toBeInTheDocument();
  });

  it("renders nothing for open session type", () => {
    const { container } = render(
      <SessionIndicator
        {...defaults}
        state="running"
        sessionType="open"
        progress={0.5}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows correct time for ten-minute session", () => {
    render(
      <SessionIndicator
        {...defaults}
        state="running"
        sessionType="ten-minute"
        progress={0.5}
      />,
    );
    expect(screen.getByText("5:00")).toBeInTheDocument();
  });
});

describe("SessionAnnouncer", () => {
  it("announces session starting", () => {
    render(<SessionAnnouncer state="starting" />);
    expect(screen.getByText("Session starting")).toBeInTheDocument();
  });

  it("announces session complete", () => {
    render(<SessionAnnouncer state="completed" />);
    expect(screen.getByText("Session complete")).toBeInTheDocument();
  });

  it("announces session ending", () => {
    render(<SessionAnnouncer state="stopping" />);
    expect(screen.getByText("Session ending")).toBeInTheDocument();
  });

  it("renders nothing when running", () => {
    const { container } = render(<SessionAnnouncer state="running" />);
    expect(container.innerHTML).toBe("");
  });
});
