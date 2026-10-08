import { describe, it, expect } from "vitest";
import { computeStats } from "./session-stats";
import type { SessionRecord } from "./session-history";

function makeRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    startedAt: Date.now(),
    duration: "five-minute",
    soundscape: "calm",
    pathway: "ambient-rhythm",
    actualDurationMs: 300000,
    completed: true,
    ...overrides,
  };
}

describe("computeStats", () => {
  it("returns zeros/nulls for empty array", () => {
    const stats = computeStats([]);
    expect(stats.totalSessions).toBe(0);
    expect(stats.totalTimeMs).toBe(0);
    expect(stats.avgDurationMs).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.mostUsedSoundscape).toBeNull();
    expect(stats.mostUsedPathway).toBeNull();
    expect(stats.avgMoodBefore).toBeNull();
    expect(stats.avgMoodAfter).toBeNull();
    expect(stats.moodImprovement).toBeNull();
  });

  it("computes stats for a single completed session", () => {
    const stats = computeStats([makeRecord({ actualDurationMs: 120000 })]);
    expect(stats.totalSessions).toBe(1);
    expect(stats.totalTimeMs).toBe(120000);
    expect(stats.avgDurationMs).toBe(120000);
    expect(stats.completionRate).toBe(1);
  });

  it("computes correct completion rate with mixed sessions", () => {
    const records = [
      makeRecord({ completed: true }),
      makeRecord({ completed: true }),
      makeRecord({ completed: false }),
      makeRecord({ completed: false }),
    ];
    expect(computeStats(records).completionRate).toBe(0.5);
  });

  it("finds most-used soundscape", () => {
    const records = [
      makeRecord({ soundscape: "calm" }),
      makeRecord({ soundscape: "drift" }),
      makeRecord({ soundscape: "drift" }),
    ];
    expect(computeStats(records).mostUsedSoundscape).toBe("drift");
  });

  it("finds most-used pathway", () => {
    const records = [
      makeRecord({ pathway: "ambient-rhythm" }),
      makeRecord({ pathway: "external-focus" }),
      makeRecord({ pathway: "external-focus" }),
      makeRecord({ pathway: "external-focus" }),
    ];
    expect(computeStats(records).mostUsedPathway).toBe("external-focus");
  });

  it("counts sessions in last 7 days", () => {
    const now = Date.now();
    const records = [
      makeRecord({ startedAt: now - 1000 }),
      makeRecord({ startedAt: now - 3 * 24 * 60 * 60 * 1000 }),
      makeRecord({ startedAt: now - 10 * 24 * 60 * 60 * 1000 }),
    ];
    expect(computeStats(records).sessionsLast7Days).toBe(2);
  });

  it("counts sessions in last 30 days", () => {
    const now = Date.now();
    const records = [
      makeRecord({ startedAt: now - 1000 }),
      makeRecord({ startedAt: now - 15 * 24 * 60 * 60 * 1000 }),
      makeRecord({ startedAt: now - 60 * 24 * 60 * 60 * 1000 }),
    ];
    expect(computeStats(records).sessionsLast30Days).toBe(2);
  });

  it("computes mood averages", () => {
    const records = [
      makeRecord({ moodBefore: 2, moodAfter: 4 }),
      makeRecord({ moodBefore: 4, moodAfter: 4 }),
    ];
    const stats = computeStats(records);
    expect(stats.avgMoodBefore).toBe(3);
    expect(stats.avgMoodAfter).toBe(4);
  });

  it("computes mood improvement", () => {
    const records = [
      makeRecord({ moodBefore: 2, moodAfter: 4 }),
      makeRecord({ moodBefore: 2, moodAfter: 4 }),
    ];
    expect(computeStats(records).moodImprovement).toBe(2);
  });

  it("returns null mood averages when no mood data", () => {
    const records = [makeRecord(), makeRecord()];
    const stats = computeStats(records);
    expect(stats.avgMoodBefore).toBeNull();
    expect(stats.avgMoodAfter).toBeNull();
    expect(stats.moodImprovement).toBeNull();
  });

  it("computes mood averages from only records that have mood data", () => {
    const records = [
      makeRecord({ moodBefore: 2 }),
      makeRecord(),
      makeRecord({ moodBefore: 4 }),
    ];
    expect(computeStats(records).avgMoodBefore).toBe(3);
    expect(computeStats(records).avgMoodAfter).toBeNull();
  });

  it("sums total time across all sessions", () => {
    const records = [
      makeRecord({ actualDurationMs: 100000 }),
      makeRecord({ actualDurationMs: 200000 }),
    ];
    expect(computeStats(records).totalTimeMs).toBe(300000);
    expect(computeStats(records).avgDurationMs).toBe(150000);
  });
});
