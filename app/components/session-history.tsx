import { useEffect, useRef, useState } from "react";
import { loadHistory, clearHistory, type SessionRecord } from "../lib/session-history";

interface SessionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `Today ${time}`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  }) + ` ${time}`;
}

const DURATION_LABELS: Record<string, string> = {
  "five-minute": "5 min",
  "ten-minute": "10 min",
  open: "Open",
};

const SOUNDSCAPE_LABELS: Record<string, string> = {
  calm: "Calm",
  ground: "Ground",
  drift: "Drift",
};

const PATHWAY_LABELS: Record<string, string> = {
  "ambient-rhythm": "Ambient",
  "external-focus": "External",
};

function SessionEntry({ record }: { record: SessionRecord }) {
  return (
    <li className="flex items-center justify-between py-3 border-b border-amber-200/5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-amber-100/60 text-xs tracking-wider">
          {formatDate(record.startedAt)}
        </div>
        <div className="text-amber-100/40 text-[10px] mt-0.5 flex gap-2">
          <span>{DURATION_LABELS[record.duration] ?? record.duration}</span>
          <span>{SOUNDSCAPE_LABELS[record.soundscape] ?? record.soundscape}</span>
          <span>{PATHWAY_LABELS[record.pathway] ?? record.pathway}</span>
        </div>
      </div>
      <div className="text-right ml-3 shrink-0">
        <div className="text-amber-100/60 text-xs tracking-wider">
          {formatTime(record.actualDurationMs)}
        </div>
        <div className={`text-[10px] mt-0.5 ${record.completed ? "text-amber-200/40" : "text-amber-100/30"}`}>
          {record.completed ? "completed" : "stopped early"}
        </div>
      </div>
    </li>
  );
}

export function SessionHistory({ isOpen, onClose }: SessionHistoryProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRecords(loadHistory());
      setConfirmClear(false);
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

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearHistory();
    setRecords([]);
    setConfirmClear(false);
  };

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
        aria-label="Session history"
        aria-modal="true"
        className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[#1a1410] border-t border-amber-200/10 p-6 pb-8 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-amber-100/70 text-sm font-light tracking-wider uppercase">
            Session history
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-amber-100/50 hover:text-amber-100/80 hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none"
            aria-label="Close history"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {records.length === 0 ? (
          <p className="text-amber-100/30 text-xs tracking-wider text-center py-8">
            No sessions yet
          </p>
        ) : (
          <>
            <ul className="space-y-0">
              {records.map((r, i) => (
                <SessionEntry key={`${r.startedAt}-${i}`} record={r} />
              ))}
            </ul>

            <div className="mt-6 pt-4 border-t border-amber-200/5">
              <button
                onClick={handleClear}
                className="w-full py-2 rounded-full text-amber-100/40 text-xs tracking-wider hover:text-amber-100/60 hover:bg-white/5 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none"
              >
                {confirmClear ? "Confirm clear history" : "Clear history"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
