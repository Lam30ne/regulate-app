import { describe, it, expect, beforeEach } from "vitest";
import {
  loadHistory,
  saveHistory,
  addSessionRecord,
  clearHistory,
  isValidMood,
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

describe("mood fields", () => {
  it("accepts records without mood fields (backward compat)", () => {
    localStorage.setItem("regulate-session-history", JSON.stringify([validRecord]));
    expect(loadHistory()).toHaveLength(1);
  });

  it("accepts records with valid moodBefore", () => {
    const record = { ...validRecord, moodBefore: 3 };
    localStorage.setItem("regulate-session-history", JSON.stringify([record]));
    const loaded = loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].moodBefore).toBe(3);
  });

  it("accepts records with valid moodAfter", () => {
    const record = { ...validRecord, moodAfter: 5 };
    localStorage.setItem("regulate-session-history", JSON.stringify([record]));
    const loaded = loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].moodAfter).toBe(5);
  });

  it("accepts records with both mood fields", () => {
    const record = { ...validRecord, moodBefore: 2, moodAfter: 4 };
    localStorage.setItem("regulate-session-history", JSON.stringify([record]));
    const loaded = loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].moodBefore).toBe(2);
    expect(loaded[0].moodAfter).toBe(4);
  });

  it("rejects records with out-of-range moodBefore (0)", () => {
    const record = { ...validRecord, moodBefore: 0 };
    localStorage.setItem("regulate-session-history", JSON.stringify([record]));
    expect(loadHistory()).toEqual([]);
  });

  it("rejects records with out-of-range moodBefore (6)", () => {
    const record = { ...validRecord, moodBefore: 6 };
    localStorage.setItem("regulate-session-history", JSON.stringify([record]));
    expect(loadHistory()).toEqual([]);
  });

  it("rejects records with non-numeric moodBefore", () => {
    const record = { ...validRecord, moodBefore: "happy" };
    localStorage.setItem("regulate-session-history", JSON.stringify([record]));
    expect(loadHistory()).toEqual([]);
  });

  it("rejects records with null moodAfter", () => {
    const record = { ...validRecord, moodAfter: null };
    localStorage.setItem("regulate-session-history", JSON.stringify([record]));
    expect(loadHistory()).toEqual([]);
  });
});

describe("isValidMood", () => {
  it("returns true for values 1-5", () => {
    for (let i = 1; i <= 5; i++) {
      expect(isValidMood(i)).toBe(true);
    }
  });

  it("returns false for out-of-range numbers", () => {
    expect(isValidMood(0)).toBe(false);
    expect(isValidMood(6)).toBe(false);
  });

  it("returns false for non-numbers", () => {
    expect(isValidMood("3")).toBe(false);
    expect(isValidMood(null)).toBe(false);
  });
});
