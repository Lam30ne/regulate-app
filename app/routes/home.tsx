import { useState, useRef, useCallback, useEffect } from "react";
import type { Route } from "./+types/home";
import { AudioEngine } from "../components/audio-engine";
import { AudioErrorBanner } from "../components/audio-error-banner";
import { VisualCanvas } from "../components/visual-canvas";
import { Controls } from "../components/controls";
import { SettingsPanel } from "../components/settings-panel";
import { Onboarding, hasSeenOnboarding } from "../components/onboarding";
import { DiagnosticsOverlay } from "../components/diagnostics-overlay";
import { RhythmAnnouncer } from "../components/rhythm-announcer";
import { ExternalFocusPrompts } from "../components/external-focus-prompts";
import { playWindDownChime } from "../components/wind-down-chime";
import { useKeyboardShortcuts, KeyboardHelpOverlay } from "../components/keyboard-shortcuts";
import { OfflineIndicator } from "../components/offline-indicator";
import { SessionHistory } from "../components/session-history";
import { StatsPanel } from "../components/stats-panel";
import { MoodCheckIn } from "../components/mood-check-in";
import { useSession } from "../hooks/use-session";
import { useSettings, buildShareUrl } from "../lib/settings";
import type { SoundscapeId, Pathway } from "../lib/settings";
import { addSessionRecord } from "../lib/session-history";
import type { MoodRating, SessionRecord } from "../lib/session-history";
import { getBreathHz, getShapedBreathPhase } from "../lib/regulation-clock";
import { BRAND, APP_SUBTITLE } from "../lib/constants";
import { isMobile } from "../lib/device";
import { hapticTap } from "../lib/haptics";
import type { SessionState, SessionDuration } from "../lib/session-controller";

export function meta({}: Route.MetaArgs) {
  return [
    { title: `${BRAND.name} — ${APP_SUBTITLE}` },
    {
      name: "description",
      content: BRAND.description,
    },
    { name: "apple-mobile-web-app-capable", content: "yes" },
    { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    { name: "theme-color", content: "#0f0a05" },
  ];
}

export default function Home() {
  const [settings, updateSettings] = useSettings();
  const audioRef = useRef<AudioEngine | null>(null);
  const [showUI, setShowUI] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visualIntensity] = useState(() => (isMobile() ? 0.5 : 0.65));
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const controlsHovered = useRef(false);
  const wasHiddenRef = useRef(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());
  const [breathPhase, setBreathPhase] = useState(0.5);
  const [audioLevel, setAudioLevel] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [moodPhase, setMoodPhase] = useState<"before" | "after" | null>(null);
  const [moodBefore, setMoodBefore] = useState<MoodRating | undefined>(undefined);
  const pendingStartRef = useRef<(() => void) | null>(null);
  const pendingRecordRef = useRef<SessionRecord | null>(null);
  const breathRafRef = useRef(0);
  const sessionStartTimeRef = useRef(0);
  const sessionStartWallClockRef = useRef(0);

  const handleStateChange = useCallback(
    (state: SessionState, _duration: SessionDuration) => {
      const engine = audioRef.current;
      if (!engine) return;

      if (state === "starting") {
        sessionStartTimeRef.current = performance.now();
        sessionStartWallClockRef.current = Date.now();
        hapticTap(settings.hapticEnabled, 50);
        if (settings.experienceMode !== "visuals-only") {
          engine.start(settings.soundscape, {
            rhythmPreset: settings.rhythmPreset,
            binauralEnabled: settings.binauralEnabled,
            pathway: settings.pathway,
          });
        }
      } else if (state === "winding-down") {
        const ctx = engine.getContext();
        if (ctx && settings.experienceMode !== "visuals-only") {
          playWindDownChime(ctx, engine.getOutputNode() ?? undefined);
        }
      } else if (state === "stopping") {
        engine.stop();
      } else if (state === "completed") {
        hapticTap(settings.hapticEnabled, 100);
        pendingRecordRef.current = {
          startedAt: sessionStartWallClockRef.current,
          duration: _duration,
          soundscape: settings.soundscape,
          pathway: settings.pathway,
          actualDurationMs: performance.now() - sessionStartTimeRef.current,
          completed: true,
          moodBefore,
        };
        setMoodPhase("after");
        setShowUI(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      } else if (state === "idle") {
        setShowUI(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      }
    },
    [settings.soundscape, settings.rhythmPreset, settings.binauralEnabled, settings.experienceMode, settings.pathway, settings.hapticEnabled],
  );

  const session = useSession(handleStateChange);
  const isActive = session.state !== "idle" && session.state !== "completed";

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new AudioEngine();
    }
    return () => {
      audioRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const hz = getBreathHz(settings.rhythmPreset);
    const tick = () => {
      const elapsed = performance.now() - sessionStartTimeRef.current;
      setBreathPhase(getShapedBreathPhase(elapsed, hz, settings.cycleShape));
      if (audioRef.current) {
        setAudioLevel(audioRef.current.getAudioLevel());
      }
      breathRafRef.current = requestAnimationFrame(tick);
    };
    breathRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(breathRafRef.current);
  }, [isActive, settings.rhythmPreset, settings.cycleShape]);

  // Auto-hide logic
  const startHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (!isActive) return;
    if (settings.keepControlsVisible) return;
    if (settingsOpen) return;

    hideTimerRef.current = setTimeout(() => {
      if (controlsHovered.current) return;
      const active = document.activeElement;
      const controls = document.querySelector('[role="toolbar"]');
      if (controls && active && controls.contains(active)) return;
      setShowUI(false);
    }, 5000);
  }, [isActive, settings.keepControlsVisible, settingsOpen]);

  const revealUI = useCallback(() => {
    setShowUI(true);
    startHideTimer();
  }, [startHideTimer]);

  useEffect(() => {
    if (isActive && !settings.keepControlsVisible && !settingsOpen) {
      startHideTimer();
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isActive, settings.keepControlsVisible, settingsOpen, startHideTimer]);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (!showUI) {
        e.stopPropagation();
        setShowUI(true);
        startHideTimer();
        wasHiddenRef.current = true;
        return;
      }
      if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        return;
      }
      if (!settingsOpen && isActive) {
        setShowUI((prev) => !prev);
        if (!showUI) startHideTimer();
      }
    },
    [showUI, settingsOpen, isActive, startHideTimer],
  );

  const handleSoundscapeChange = useCallback(
    (s: SoundscapeId) => {
      updateSettings({ soundscape: s });
      hapticTap(settings.hapticEnabled, 30);
      if (isActive && audioRef.current && settings.experienceMode !== "visuals-only") {
        audioRef.current.crossfadeTo(s);
      }
    },
    [isActive, updateSettings, settings.experienceMode, settings.hapticEnabled],
  );

  const handleVolumeChange = useCallback(
    (level: number) => {
      updateSettings({ volume: level });
      audioRef.current?.setVolume(level);
    },
    [updateSettings],
  );

  const handleBrightnessChange = useCallback(
    (level: number) => {
      updateSettings({ brightness: level });
    },
    [updateSettings],
  );

  const handlePathwayChange = useCallback(
    (p: Pathway) => {
      updateSettings({ pathway: p });
      audioRef.current?.setPathway(p);
    },
    [updateSettings],
  );

  const handleStartWithMood = useCallback((startFn: () => void) => {
    pendingStartRef.current = startFn;
    setMoodPhase("before");
  }, []);

  const handleMoodBeforeSelect = useCallback((mood: MoodRating) => {
    setMoodBefore(mood);
    setMoodPhase(null);
    pendingStartRef.current?.();
    pendingStartRef.current = null;
  }, []);

  const handleMoodBeforeSkip = useCallback(() => {
    setMoodBefore(undefined);
    setMoodPhase(null);
    pendingStartRef.current?.();
    pendingStartRef.current = null;
  }, []);

  const handleMoodAfterSelect = useCallback((mood: MoodRating) => {
    if (pendingRecordRef.current) {
      pendingRecordRef.current.moodAfter = mood;
      addSessionRecord(pendingRecordRef.current);
      pendingRecordRef.current = null;
    }
    setMoodPhase(null);
    setMoodBefore(undefined);
  }, []);

  const handleMoodAfterSkip = useCallback(() => {
    if (pendingRecordRef.current) {
      addSessionRecord(pendingRecordRef.current);
      pendingRecordRef.current = null;
    }
    setMoodPhase(null);
    setMoodBefore(undefined);
  }, []);

  const handleStartReset = useCallback(() => {
    audioRef.current?.setVolume(settings.volume);
    handleStartWithMood(() => { session.startReset(); startHideTimer(); });
  }, [session, settings.volume, startHideTimer, handleStartWithMood]);

  const handleStartTenMinuteReset = useCallback(() => {
    audioRef.current?.setVolume(settings.volume);
    handleStartWithMood(() => { session.startTenMinuteReset(); startHideTimer(); });
  }, [session, settings.volume, startHideTimer, handleStartWithMood]);

  const handleStartOpen = useCallback(() => {
    audioRef.current?.setVolume(settings.volume);
    handleStartWithMood(() => { session.startOpen(); startHideTimer(); });
  }, [session, settings.volume, startHideTimer, handleStartWithMood]);

  const handleStop = useCallback(() => {
    if (session.state !== "idle" && session.state !== "completed") {
      addSessionRecord({
        startedAt: sessionStartWallClockRef.current,
        duration: session.sessionType,
        soundscape: settings.soundscape,
        pathway: settings.pathway,
        actualDurationMs: performance.now() - sessionStartTimeRef.current,
        completed: false,
        moodBefore,
      });
    }
    pendingRecordRef.current = null;
    session.stop();
    setShowUI(true);
    setMoodBefore(undefined);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, [session, settings.soundscape, settings.pathway, moodBefore]);

  const handleReplay = useCallback(() => {
    handleStartWithMood(() => { session.replay(); startHideTimer(); });
  }, [session, startHideTimer, handleStartWithMood]);

  const handleSettingsUpdate = useCallback(
    (update: Partial<typeof settings>) => {
      updateSettings(update);
      if (update.rhythmPreset && audioRef.current) {
        audioRef.current.setRhythm(update.rhythmPreset);
      }
      if (update.binauralEnabled !== undefined && audioRef.current) {
        audioRef.current.setBinauralEnabled(update.binauralEnabled);
      }
      if (update.pathway && audioRef.current) {
        audioRef.current.setPathway(update.pathway);
      }
      if (update.audioReactivity && audioRef.current) {
        audioRef.current.setAudioReactivity(update.audioReactivity);
      }
    },
    [updateSettings],
  );

  const handleOnboardingDismiss = useCallback(
    (pathway: Pathway) => {
      updateSettings({ pathway });
      setShowOnboarding(false);
    },
    [updateSettings],
  );

  const handleOpenHistory = useCallback(() => {
    setSettingsOpen(false);
    setHistoryOpen(true);
  }, []);

  const handleOpenStats = useCallback(() => {
    setSettingsOpen(false);
    setStatsOpen(true);
  }, []);

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(settings);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // clipboard may be unavailable
    }
  }, [settings]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const volumeBeforeMuteRef = useRef(settings.volume);

  const toggleMute = useCallback(() => {
    if (settings.volume > 0) {
      volumeBeforeMuteRef.current = settings.volume;
      updateSettings({ volume: 0 });
      audioRef.current?.setVolume(0);
    } else {
      const restored = volumeBeforeMuteRef.current || 0.7;
      updateSettings({ volume: restored });
      audioRef.current?.setVolume(restored);
    }
  }, [settings.volume, updateSettings]);

  const toggleSession = useCallback(() => {
    if (isActive) {
      handleStop();
    } else if (session.state === "completed") {
      handleReplay();
    } else {
      handleStartReset();
    }
  }, [isActive, session.state, handleStop, handleReplay, handleStartReset]);

  const toggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev);
  }, []);

  const { helpOpen, setHelpOpen } = useKeyboardShortcuts({
    onToggleSession: toggleSession,
    onToggleMute: toggleMute,
    onToggleSettings: toggleSettings,
    onToggleFullscreen: toggleFullscreen,
    isActive,
    settingsOpen,
  });

  const showVisuals = settings.experienceMode !== "audio-only";
  const rhythmHz = getBreathHz(settings.rhythmPreset);

  const effectiveHighContrast = settings.highContrast ||
    (typeof window !== "undefined" && window.matchMedia?.("(prefers-contrast: more)")?.matches);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-high-contrast",
      effectiveHighContrast ? "true" : "false",
    );
  }, [effectiveHighContrast]);

  if (showOnboarding) {
    return <Onboarding onDismiss={handleOnboardingDismiss} />;
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      onMouseMove={revealUI}
      onClick={handleContainerClick}
      onKeyDown={revealUI}
      onFocusCapture={revealUI}
      style={{ cursor: showUI ? "default" : "none" }}
    >
      <a
        href="#main-controls"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-1/2 focus:-translate-x-1/2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-full focus:bg-amber-200/20 focus:text-amber-100/90 focus:text-sm focus:tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-200/60"
      >
        Skip to controls
      </a>

      <OfflineIndicator />
      <AudioErrorBanner audioEngine={audioRef.current} />

      {showVisuals && (
        <VisualCanvas
          audioEngine={audioRef.current}
          isPlaying={isActive}
          mode={settings.soundscape}
          brightness={settings.brightness}
          visualIntensity={visualIntensity}
          rhythmHz={rhythmHz}
          motionPreference={settings.motionPreference}
          experienceMode={settings.experienceMode}
          windDownProgress={session.windDownProgress}
          pathway={settings.pathway}
          cycleShape={settings.cycleShape}
          audioReactivity={settings.audioReactivity}
        />
      )}

      {!showVisuals && (
        <div className="fixed inset-0" style={{ background: "#0f0a05" }} />
      )}

      {/* External Focus prompts */}
      <ExternalFocusPrompts
        active={isActive && settings.pathway === "external-focus"}
        visible={showUI}
      />

      {/* Rhythm announcer */}
      <RhythmAnnouncer
        enabled={settings.announceRhythm && isActive}
        breathPhase={breathPhase}
        cadence={settings.announcerCadence}
        verbosity={settings.announcerVerbosity}
      />

      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-10 flex items-start justify-between pt-4 sm:pt-8 pb-8 sm:pb-16 px-4 sm:px-8 bg-gradient-to-b from-black/40 to-transparent transition-opacity duration-1000 ${showUI ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="w-10" />
        <div className="flex flex-col items-center">
          <h1 className="text-amber-50/70 text-base sm:text-lg font-extralight tracking-[0.3em] uppercase">
            {BRAND.name}
          </h1>
          <p className="text-amber-100/55 text-xs font-light tracking-wider mt-1">
            {APP_SUBTITLE}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-amber-100/50 hover:text-amber-100/80 hover:bg-white/5 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:outline-none"
          aria-label="Toggle fullscreen"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 6V1h5M17 6V1h-5M1 12v5h5M17 12v5h-5" />
          </svg>
        </button>
      </header>

      {/* Controls */}
      <div
        id="main-controls"
        className={`transition-opacity duration-1000 ${showUI ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onPointerEnter={() => { controlsHovered.current = true; }}
        onPointerLeave={() => { controlsHovered.current = false; }}
      >
        <Controls
          sessionState={session.state}
          sessionType={session.sessionType}
          progress={session.progress}
          soundscape={settings.soundscape}
          volume={settings.volume}
          brightness={settings.brightness}
          pathway={settings.pathway}
          onStartReset={handleStartReset}
          onStartTenMinuteReset={handleStartTenMinuteReset}
          onStartOpen={handleStartOpen}
          onStop={handleStop}
          onReplay={handleReplay}
          onSoundscapeChange={handleSoundscapeChange}
          onVolumeChange={handleVolumeChange}
          onBrightnessChange={handleBrightnessChange}
          onPathwayChange={handlePathwayChange}
          onOpenSettings={() => { setSettingsOpen(true); }}
        />
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        settings={settings}
        onUpdate={handleSettingsUpdate}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenHistory={handleOpenHistory}
        onOpenStats={handleOpenStats}
        onShare={handleShare}
      />

      {/* Session history */}
      <SessionHistory isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* Usage stats */}
      <StatsPanel isOpen={statsOpen} onClose={() => setStatsOpen(false)} />

      {/* Mood check-in */}
      {moodPhase && (
        <MoodCheckIn
          phase={moodPhase}
          onSelect={moodPhase === "before" ? handleMoodBeforeSelect : handleMoodAfterSelect}
          onSkip={moodPhase === "before" ? handleMoodBeforeSkip : handleMoodAfterSkip}
        />
      )}

      {/* Keyboard help overlay */}
      <KeyboardHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Link copied toast */}
      {linkCopied && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-amber-900/80 border border-amber-200/20 text-amber-100/80 text-xs tracking-wider backdrop-blur-sm animate-fadeIn"
        >
          Link copied
        </div>
      )}

      {/* Diagnostics (dev only) */}
      <DiagnosticsOverlay
        sessionState={session.state}
        sessionDuration={session.sessionType}
        pathway={settings.pathway}
        rhythmPreset={settings.rhythmPreset}
        cycleShape={settings.cycleShape}
        motionPreference={settings.motionPreference}
        audioReactivity={settings.audioReactivity}
        audioLevel={audioLevel}
        audioContextState={audioRef.current ? "active" : "none"}
      />
    </div>
  );
}
