import { describe, it, expect, beforeEach } from "vitest";
import {
  loadHistory,
  saveHistory,
  addSessionRecord,
  clearHistory,
  type SessionRecord,
} from "./session-history";

const validRecord: SessionRecord = {
  startedAt: 1696780000000,
  duration: "five-minute",
  soundscape: "calm",
  pathway: "ambient-rhythm",
  actualDurationMs: 300000,
  completed: true,
};

beforeEach(() => {
  localStorage.clear();
});

describe("loadHistory", () => {
  it("returns empty array when localStorage is empty", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("returns empty array on invalid JSON", () => {
    localStorage.setItem("regulate-session-history", "not json");
    expect(loadHistory()).toEqual([]);
  });

  it("returns empty array when stored value is not an array", () => {
    localStorage.setItem("regulate-session-history", '"hello"');
    expect(loadHistory()).toEqual([]);
  });

  it("filters out invalid entries", () => {
    const data = [validRecord, { bad: true }, validRecord];
    localStorage.setItem("regulate-session-history", JSON.stringify(data));
    expect(loadHistory()).toHaveLength(2);
  });

  it("rejects records with invalid soundscape", () => {
    const bad = { ...validRecord, soundscape: "invalid" };
    localStorage.setItem("regulate-session-history", JSON.stringify([bad]));
    expect(loadHistory()).toEqual([]);
  });

  it("rejects records with invalid pathway", () => {
    const bad = { ...validRecord, pathway: "invalid" };
    localStorage.setItem("regulate-session-history", JSON.stringify([bad]));
    expect(loadHistory()).toEqual([]);
  });

  it("rejects records with negative actualDurationMs", () => {
    const bad = { ...validRecord, actualDurationMs: -1 };
    localStorage.setItem("regulate-session-history", JSON.stringify([bad]));
    expect(loadHistory()).toEqual([]);
  });
});

describe("saveHistory / loadHistory round-trip", () => {
  it("persists and retrieves records", () => {
    saveHistory([validRecord]);
    expect(loadHistory()).toEqual([validRecord]);
  });
});

describe("addSessionRecord", () => {
  it("prepends the new record", () => {
    const second = { ...validRecord, startedAt: 1696790000000 };
    addSessionRecord(validRecord);
    const result = addSessionRecord(second);
    expect(result[0]).toEqual(second);
    expect(result[1]).toEqual(validRecord);
  });

  it("caps at 100 entries", () => {
    for (let i = 0; i < 101; i++) {
      addSessionRecord({ ...validRecord, startedAt: i });
    }
    const result = loadHistory();
    expect(result).toHaveLength(100);
    expect(result[0].startedAt).toBe(100);
  });
});

describe("clearHistory", () => {
  it("removes all history", () => {
    addSessionRecord(validRecord);
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });
});
