import type { SessionRecord } from "./session-history";

export interface SessionStats {
  totalSessions: number;
  totalTimeMs: number;
  avgDurationMs: number;
  completionRate: number;
  mostUsedSoundscape: string | null;
  mostUsedPathway: string | null;
  sessionsLast7Days: number;
  sessionsLast30Days: number;
  avgMoodBefore: number | null;
  avgMoodAfter: number | null;
  moodImprovement: number | null;
}

function mostFrequent(counts: Record<string, number>): string | null {
  let max = 0;
  let key: string | null = null;
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) { max = v; key = k; }
  }
  return key;
}

export function computeStats(records: SessionRecord[]): SessionStats {
  if (records.length === 0) {
    return {
      totalSessions: 0,
      totalTimeMs: 0,
      avgDurationMs: 0,
      completionRate: 0,
      mostUsedSoundscape: null,
      mostUsedPathway: null,
      sessionsLast7Days: 0,
      sessionsLast30Days: 0,
      avgMoodBefore: null,
      avgMoodAfter: null,
      moodImprovement: null,
    };
  }

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  let totalTimeMs = 0;
  let completedCount = 0;
  let sessionsLast7Days = 0;
  let sessionsLast30Days = 0;
  const soundscapeCounts: Record<string, number> = {};
  const pathwayCounts: Record<string, number> = {};
  let moodBeforeSum = 0;
  let moodBeforeCount = 0;
  let moodAfterSum = 0;
  let moodAfterCount = 0;

  for (const r of records) {
    totalTimeMs += r.actualDurationMs;
    if (r.completed) completedCount++;
    if (r.startedAt >= sevenDaysAgo) sessionsLast7Days++;
    if (r.startedAt >= thirtyDaysAgo) sessionsLast30Days++;
    soundscapeCounts[r.soundscape] = (soundscapeCounts[r.soundscape] ?? 0) + 1;
    pathwayCounts[r.pathway] = (pathwayCounts[r.pathway] ?? 0) + 1;
    if (r.moodBefore !== undefined) {
      moodBeforeSum += r.moodBefore;
      moodBeforeCount++;
    }
    if (r.moodAfter !== undefined) {
      moodAfterSum += r.moodAfter;
      moodAfterCount++;
    }
  }

  const avgMoodBefore = moodBeforeCount > 0 ? moodBeforeSum / moodBeforeCount : null;
  const avgMoodAfter = moodAfterCount > 0 ? moodAfterSum / moodAfterCount : null;

  return {
    totalSessions: records.length,
    totalTimeMs,
    avgDurationMs: totalTimeMs / records.length,
    completionRate: completedCount / records.length,
    mostUsedSoundscape: mostFrequent(soundscapeCounts),
    mostUsedPathway: mostFrequent(pathwayCounts),
    sessionsLast7Days,
    sessionsLast30Days,
    avgMoodBefore,
    avgMoodAfter,
    moodImprovement: avgMoodBefore !== null && avgMoodAfter !== null
      ? avgMoodAfter - avgMoodBefore
      : null,
  };
}
