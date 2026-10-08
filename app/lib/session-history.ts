import type { SessionDuration } from "./session-controller";
import { isValidSoundscape, isValidPathway } from "./settings";

export interface SessionRecord {
  startedAt: number;
  duration: SessionDuration;
  soundscape: string;
  pathway: string;
  actualDurationMs: number;
  completed: boolean;
}

const STORAGE_KEY = "regulate-session-history";
const MAX_ENTRIES = 100;

function isValidDuration(v: unknown): v is SessionDuration {
  return v === "five-minute" || v === "ten-minute" || v === "open";
}

function isValidRecord(v: unknown): v is SessionRecord {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.startedAt === "number" &&
    isValidDuration(r.duration) &&
    isValidSoundscape(r.soundscape) &&
    isValidPathway(r.pathway) &&
    typeof r.actualDurationMs === "number" &&
    r.actualDurationMs >= 0 &&
    typeof r.completed === "boolean"
  );
}

export function loadHistory(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRecord);
  } catch {
    return [];
  }
}

export function saveHistory(records: SessionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // localStorage may be unavailable
  }
}

export function addSessionRecord(record: SessionRecord): SessionRecord[] {
  const history = loadHistory();
  history.unshift(record);
  const capped = history.slice(0, MAX_ENTRIES);
  saveHistory(capped);
  return capped;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage may be unavailable
  }
}
