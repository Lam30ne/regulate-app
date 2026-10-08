import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SkipLink } from "./root";

afterEach(() => {
  cleanup();
});

describe("SkipLink component", () => {
  it("renders a link with href pointing to #main-content", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("#main-content");
  });

  it("is hidden by default with sr-only and visible on focus", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link.className).toContain("sr-only");
    expect(link.className).toContain("focus-visible:not-sr-only");
  });
});
