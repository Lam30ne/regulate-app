import { useEffect, useRef, useState } from "react";
import type { UserSettings } from "../lib/settings";
import { RHYTHM_PRESETS, type RhythmPresetId } from "../lib/regulation-clock";
import { BRAND } from "../lib/constants";
import { canVibrate } from "../lib/haptics";
import type { AnnouncerCadence, AnnouncerVerbosity } from "../lib/settings";

interface SettingsPanelProps {
  settings: UserSettings;
  onUpdate: (update: Partial<UserSettings>) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenHistory?: () => void;
  onShare?: () => void;
}

function ToggleSwitch({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-amber-100/60 text-xs tracking-wider">{label}</span>
        {description && <p className="text-amber-100/30 text-[10px] mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={`relative w-10 h-6 rounded-full transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none ${
          checked ? "bg-amber-200/25" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${
            checked ? "left-5 bg-amber-200/70" : "left-1 bg-amber-100/30"
          }`}
        />
      </button>
    </div>
  );
}

const pillClass = (active: boolean) =>
  `flex-1 min-h-[44px] px-2 py-2 rounded-full text-[11px] tracking-wider transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none ${
    active
      ? "bg-amber-200/12 text-amber-100/80 border border-amber-200/25"
      : "text-amber-100/40 border border-transparent hover:text-amber-100/60 hover:bg-white/5"
  }`;

export function SettingsPanel({ settings, onUpdate, isOpen, onClose, onOpenHistory, onShare }: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [showSafety, setShowSafety] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [tabindex]:not([tabindex="-1"]), input, select',
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
        aria-label="Settings"
        aria-modal="true"
        className="relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-2xl bg-[#1a1410] border-t border-amber-200/10 p-6 pb-8 space-y-6 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-amber-100/70 text-sm font-light tracking-wider uppercase">Settings</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-amber-100/50 hover:text-amber-100/80 hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none"
            aria-label="Close settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Rhythm */}
        <fieldset>
          <legend className="text-amber-100/50 text-xs tracking-wider uppercase mb-2">Rhythm</legend>
          <div className="flex gap-2">
            {(Object.keys(RHYTHM_PRESETS) as RhythmPresetId[]).map((id) => (
              <button
                key={id}
                onClick={() => onUpdate({ rhythmPreset: id })}
                aria-pressed={settings.rhythmPreset === id}
                className={`flex-1 min-h-[44px] px-3 py-2 rounded-full text-xs tracking-wider transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none ${
                  settings.rhythmPreset === id
                    ? "bg-amber-200/12 text-amber-100/80 border border-amber-200/25"
                    : "text-amber-100/40 border border-transparent hover:text-amber-100/60 hover:bg-white/5"
                }`}
              >
                <span className="block">{RHYTHM_PRESETS[id].label}</span>
                <span className="block text-[10px] opacity-60">{RHYTHM_PRESETS[id].bpm} cpm</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Cycle shape */}
        <fieldset>
          <legend className="text-amber-100/50 text-xs tracking-wider uppercase mb-2">Cycle shape</legend>
          <div className="flex gap-2">
            {([
              { id: "longer-release" as const, label: "Longer release" },
              { id: "balanced" as const, label: "Balanced" },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onUpdate({ cycleShape: id })}
                aria-pressed={settings.cycleShape === id}
                className={pillClass(settings.cycleShape === id)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Binaural */}
        <ToggleSwitch
          checked={settings.binauralEnabled}
          onChange={() => onUpdate({ binauralEnabled: !settings.binauralEnabled })}
          label="Binaural tones"
          description="An optional stereo texture most noticeable with headphones"
        />

        {/* Experience */}
        <fieldset>
          <legend className="text-amber-100/50 text-xs tracking-wider uppercase mb-2">Experience</legend>
          <div className="flex gap-2">
            {([
              { id: "audio-visuals" as const, label: "Audio + Visuals" },
              { id: "audio-only" as const, label: "Audio only" },
              { id: "visuals-only" as const, label: "Visuals only" },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onUpdate({ experienceMode: id })}
                aria-pressed={settings.experienceMode === id}
                className={pillClass(settings.experienceMode === id)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Audio reactivity */}
        <fieldset>
          <legend className="text-amber-100/50 text-xs tracking-wider uppercase mb-2">Audio reactivity</legend>
          <div className="flex gap-2">
            {([
              { id: "on" as const, label: "On" },
              { id: "reduced" as const, label: "Reduced" },
              { id: "off" as const, label: "Off" },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onUpdate({ audioReactivity: id })}
                aria-pressed={settings.audioReactivity === id}
                className={pillClass(settings.audioReactivity === id)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Motion */}
        <fieldset>
          <legend className="text-amber-100/50 text-xs tracking-wider uppercase mb-2">Motion</legend>
          <div className="flex gap-2">
            {([
              { id: "system" as const, label: "System" },
              { id: "full" as const, label: "Full" },
              { id: "reduced" as const, label: "Reduced" },
              { id: "static" as const, label: "Static" },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onUpdate({ motionPreference: id })}
                aria-pressed={settings.motionPreference === id}
                className={pillClass(settings.motionPreference === id)}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Keep controls visible */}
        <ToggleSwitch
          checked={settings.keepControlsVisible}
          onChange={() => onUpdate({ keepControlsVisible: !settings.keepControlsVisible })}
          label="Keep controls visible"
        />

        {/* High contrast */}
        <ToggleSwitch
          checked={settings.highContrast}
          onChange={() => onUpdate({ highContrast: !settings.highContrast })}
          label="High contrast"
          description="Increase text and border visibility"
        />

        {/* Haptic feedback (mobile only) */}
        {canVibrate() && (
          <ToggleSwitch
            checked={settings.hapticEnabled}
            onChange={() => onUpdate({ hapticEnabled: !settings.hapticEnabled })}
            label="Haptic feedback"
            description="Subtle vibration on session start and end"
          />
        )}

        {/* Announce rhythm changes */}
        <ToggleSwitch
          checked={settings.announceRhythm}
          onChange={() => onUpdate({ announceRhythm: !settings.announceRhythm })}
          label="Announce rhythm changes"
          description="Screen reader announces rising/settling"
        />

        {/* Announcer options (shown when announcer is enabled) */}
        {settings.announceRhythm && (
          <>
            <fieldset>
              <legend className="text-amber-100/50 text-xs tracking-wider uppercase mb-2">Announcement cadence</legend>
              <div className="flex gap-2">
                {([
                  { id: "every-cycle" as AnnouncerCadence, label: "Every cycle" },
                  { id: "every-other" as AnnouncerCadence, label: "Every other" },
                  { id: "every-five" as AnnouncerCadence, label: "Every 5th" },
                ]).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => onUpdate({ announcerCadence: id })}
                    aria-pressed={settings.announcerCadence === id}
                    className={pillClass(settings.announcerCadence === id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-amber-100/50 text-xs tracking-wider uppercase mb-2">Announcement detail</legend>
              <div className="flex gap-2">
                {([
                  { id: "minimal" as AnnouncerVerbosity, label: "Minimal" },
                  { id: "descriptive" as AnnouncerVerbosity, label: "Descriptive" },
                ]).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => onUpdate({ announcerVerbosity: id })}
                    aria-pressed={settings.announcerVerbosity === id}
                    className={pillClass(settings.announcerVerbosity === id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {/* Session history & share */}
        <div className="flex gap-2">
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-full text-amber-100/40 text-xs tracking-wider border border-transparent hover:text-amber-100/60 hover:bg-white/5 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none"
            >
              Session history
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              className="flex-1 min-h-[44px] px-3 py-2 rounded-full text-amber-100/40 text-xs tracking-wider border border-transparent hover:text-amber-100/60 hover:bg-white/5 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none"
            >
              Share settings
            </button>
          )}
        </div>

        {/* Safety info link */}
        <div className="pt-2 border-t border-amber-200/5">
          <button
            onClick={() => setShowSafety(!showSafety)}
            className="text-amber-100/30 text-[10px] tracking-wider hover:text-amber-100/50 transition-colors focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none"
            aria-expanded={showSafety}
          >
            {showSafety ? "Hide safety information" : "Review safety information"}
          </button>

          {showSafety && (
            <div className="mt-3 text-amber-100/30 text-[10px] leading-relaxed space-y-2 animate-fadeIn">
              <p>
                Consult a qualified clinician before using slow-paced breathing
                experiences if you are pregnant or have a relevant medical history.
              </p>
              <p>
                {BRAND.name} does not replace professional medical or mental-health care.
              </p>
            </div>
          )}

          <p className="text-amber-100/20 text-[10px] text-center mt-3">
            {BRAND.name} is a general wellness tool, not a medical device.
          </p>
        </div>
      </div>
    </div>
  );
}
