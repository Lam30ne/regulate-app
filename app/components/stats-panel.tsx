import { useEffect, useRef, useState } from "react";
import { loadHistory } from "../lib/session-history";
import { computeStats, type SessionStats } from "../lib/session-stats";

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTotalTime(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatAvgTime(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

const SOUNDSCAPE_LABELS: Record<string, string> = {
  calm: "Calm",
  ground: "Ground",
  drift: "Drift",
};

const PATHWAY_LABELS: Record<string, string> = {
  "ambient-rhythm": "Ambient",
  "external-focus": "External",
};

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-amber-100/50 text-xs tracking-wider">{label}</span>
      <span className="text-amber-100/80 text-xs tracking-wider tabular-nums">{value}</span>
    </div>
  );
}

export function StatsPanel({ isOpen, onClose }: StatsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStats(computeStats(loadHistory()));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    panel.addEventListener("keydown", trap);
    return () => panel.removeEventListener("keydown", trap);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasMoodData = stats && (stats.avgMoodBefore !== null || stats.avgMoodAfter !== null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Usage stats"
        aria-modal="true"
        className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[#1a1410] border-t border-amber-200/10 p-6 pb-8 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-amber-100/70 text-sm font-light tracking-wider uppercase">
            Usage stats
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-amber-100/50 hover:text-amber-100/80 hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none"
            aria-label="Close stats"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {!stats || stats.totalSessions === 0 ? (
          <p className="text-amber-100/30 text-xs tracking-wider text-center py-8">
            Complete a session to see your stats
          </p>
        ) : (
          <div className="space-y-1">
            <StatRow label="Total sessions" value={String(stats.totalSessions)} />
            <StatRow label="Total time" value={formatTotalTime(stats.totalTimeMs)} />
            <StatRow label="Avg session" value={formatAvgTime(stats.avgDurationMs)} />
            <StatRow label="Completion rate" value={formatPercent(stats.completionRate)} />

            <div className="border-t border-amber-200/5 mt-2 pt-2">
              <StatRow
                label="Top soundscape"
                value={stats.mostUsedSoundscape ? (SOUNDSCAPE_LABELS[stats.mostUsedSoundscape] ?? stats.mostUsedSoundscape) : "—"}
              />
              <StatRow
                label="Top pathway"
                value={stats.mostUsedPathway ? (PATHWAY_LABELS[stats.mostUsedPathway] ?? stats.mostUsedPathway) : "—"}
              />
            </div>

            <div className="border-t border-amber-200/5 mt-2 pt-2">
              <StatRow label="Last 7 days" value={`${stats.sessionsLast7Days} sessions`} />
              <StatRow label="Last 30 days" value={`${stats.sessionsLast30Days} sessions`} />
            </div>

            {hasMoodData && (
              <div className="border-t border-amber-200/5 mt-2 pt-2">
                {stats.avgMoodBefore !== null && (
                  <StatRow label="Avg mood before" value={stats.avgMoodBefore.toFixed(1)} />
                )}
                {stats.avgMoodAfter !== null && (
                  <StatRow label="Avg mood after" value={stats.avgMoodAfter.toFixed(1)} />
                )}
                {stats.moodImprovement !== null && (
                  <StatRow
                    label="Typical shift"
                    value={`${stats.moodImprovement >= 0 ? "+" : ""}${stats.moodImprovement.toFixed(1)}`}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
