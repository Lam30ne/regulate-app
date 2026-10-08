import { describe, it, expect, vi, afterEach } from "vitest";
import { isMobile } from "./device";

describe("isMobile", () => {
  const originalInnerWidth = window.innerWidth;
  const originalConcurrency = navigator.hardwareConcurrency;

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(navigator, "hardwareConcurrency", {
      writable: true,
      configurable: true,
      value: originalConcurrency,
    });
  });

  it("returns true when innerWidth is under 768px", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 767,
    });
    Object.defineProperty(navigator, "hardwareConcurrency", {
      writable: true,
      configurable: true,
      value: 8,
    });
    expect(isMobile()).toBe(true);
  });

  it("returns true when hardwareConcurrency is <= 4 even if desktop width", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1200,
    });
    Object.defineProperty(navigator, "hardwareConcurrency", {
      writable: true,
      configurable: true,
      value: 4,
    });
    expect(isMobile()).toBe(true);
  });

  it("returns false for wide screen and high concurrency", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(navigator, "hardwareConcurrency", {
      writable: true,
      configurable: true,
      value: 8,
    });
    expect(isMobile()).toBe(false);
  });
});
