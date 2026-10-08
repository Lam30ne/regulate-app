import { useEffect, useRef } from "react";
import type { MoodRating } from "../lib/session-history";

interface MoodCheckInProps {
  phase: "before" | "after";
  onSelect: (mood: MoodRating) => void;
  onSkip: () => void;
}

const MOOD_OPTIONS: { value: MoodRating; label: string }[] = [
  { value: 1, label: "Unsettled" },
  { value: 2, label: "A bit off" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Really good" },
];

export function MoodCheckIn({ phase, onSelect, onSkip }: MoodCheckInProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
        onSkip();
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
  }, [onSkip]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSkip();
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Mood check-in"
        aria-modal="true"
        className="relative w-full max-w-sm mx-4 rounded-2xl bg-[#1a1410] border border-amber-200/10 p-6 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-amber-100/70 text-sm font-light tracking-wider text-center mb-6">
          {phase === "before" ? "How are you feeling?" : "How are you feeling now?"}
        </h2>

        <div role="radiogroup" aria-label="Mood scale" className="flex gap-2 justify-center mb-6">
          {MOOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              role="radio"
              aria-checked="false"
              aria-label={`${value} out of 5, ${label}`}
              onClick={() => onSelect(value)}
              className="flex flex-col items-center gap-1.5 min-w-[56px] min-h-[44px] px-2 py-2 rounded-xl text-amber-100/40 border border-transparent hover:text-amber-100/70 hover:bg-amber-200/8 hover:border-amber-200/15 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none"
            >
              <span className="text-lg leading-none">{value}</span>
              <span className="text-[9px] tracking-wider leading-tight">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onSkip}
            className="min-h-[44px] px-6 py-2 rounded-full text-amber-100/40 text-xs tracking-wider hover:text-amber-100/60 hover:bg-white/5 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none"
          >
            Skip
          </button>
          <p className="text-amber-100/20 text-[10px] tracking-wider">
            This is just for you — skip anytime
          </p>
        </div>
      </div>
    </div>
  );
}
