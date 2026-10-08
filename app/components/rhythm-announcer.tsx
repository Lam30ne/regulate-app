import { useRef, useEffect, useState } from "react";
import type { AnnouncerCadence, AnnouncerVerbosity } from "../lib/settings";

interface RhythmAnnouncerProps {
  enabled: boolean;
  breathPhase: number;
  cadence?: AnnouncerCadence;
  verbosity?: AnnouncerVerbosity;
}

function formatAnnouncement(direction: "rising" | "settling", verbosity: AnnouncerVerbosity, cycle: number): string {
  if (verbosity === "descriptive") {
    return direction === "rising"
      ? `Breath rising slowly, cycle ${cycle}`
      : `Breath settling, cycle ${cycle}`;
  }
  return direction;
}

function getCadenceInterval(cadence: AnnouncerCadence): number {
  if (cadence === "every-other") return 2;
  if (cadence === "every-five") return 5;
  return 1;
}

export function RhythmAnnouncer({
  enabled,
  breathPhase,
  cadence = "every-cycle",
  verbosity = "minimal",
}: RhythmAnnouncerProps) {
  const [announcement, setAnnouncement] = useState("");
  const prevPhaseRef = useRef(breathPhase);
  const lastAnnouncedRef = useRef(0);
  const cycleCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setAnnouncement("");
      cycleCountRef.current = 0;
      return;
    }

    const prev = prevPhaseRef.current;
    prevPhaseRef.current = breathPhase;

    const now = Date.now();
    if (now - lastAnnouncedRef.current < 2000) return;

    const interval = getCadenceInterval(cadence);

    if (prev <= 0.5 && breathPhase > 0.5) {
      cycleCountRef.current++;
      if (cycleCountRef.current % interval === 0) {
        setAnnouncement(formatAnnouncement("rising", verbosity, cycleCountRef.current));
        lastAnnouncedRef.current = now;
      }
    } else if (prev >= 0.5 && breathPhase < 0.5) {
      if (cycleCountRef.current % interval === 0) {
        setAnnouncement(formatAnnouncement("settling", verbosity, cycleCountRef.current));
        lastAnnouncedRef.current = now;
      }
    }
  }, [enabled, breathPhase, cadence, verbosity]);

  if (!enabled || !announcement) return null;

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}
