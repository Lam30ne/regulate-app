import { useEffect, useState, useCallback } from "react";

interface KeyboardShortcutsProps {
  onToggleSession: () => void;
  onToggleMute: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
  isActive: boolean;
  settingsOpen: boolean;
}

const SHORTCUTS = [
  { key: "Space", label: "Start / Stop" },
  { key: "M", label: "Mute / Unmute" },
  { key: "S", label: "Settings" },
  { key: "F", label: "Fullscreen" },
  { key: "?", label: "Shortcuts" },
  { key: "Esc", label: "Close overlay" },
];

export function useKeyboardShortcuts({
  onToggleSession,
  onToggleMute,
  onToggleSettings,
  onToggleFullscreen,
  isActive,
  settingsOpen,
}: KeyboardShortcutsProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setHelpOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape") {
        if (helpOpen) {
          e.preventDefault();
          setHelpOpen(false);
        }
        return;
      }

      if (settingsOpen || helpOpen) return;

      if (e.key === " ") {
        e.preventDefault();
        onToggleSession();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        onToggleMute();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        onToggleSettings();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        onToggleFullscreen();
      }
    },
    [onToggleSession, onToggleMute, onToggleSettings, onToggleFullscreen, settingsOpen, helpOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { helpOpen, setHelpOpen };
}

export function KeyboardHelpOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="bg-[#1a1510]/95 border border-amber-200/15 rounded-2xl p-6 max-w-xs w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-amber-100/80 text-sm font-light tracking-[0.2em] uppercase mb-4 text-center">
          Keyboard shortcuts
        </h2>
        <ul className="space-y-2">
          {SHORTCUTS.map(({ key, label }) => (
            <li key={key} className="flex items-center justify-between">
              <span className="text-amber-100/50 text-xs tracking-wider">
                {label}
              </span>
              <kbd className="min-w-[2.5rem] text-center px-2 py-1 rounded bg-white/8 border border-amber-200/15 text-amber-100/70 text-xs font-mono">
                {key}
              </kbd>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-full text-amber-100/50 text-xs tracking-wider hover:text-amber-100/70 hover:bg-white/5 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none"
        >
          Close
        </button>
      </div>
    </div>
  );
}
