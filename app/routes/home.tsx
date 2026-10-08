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
import { useSession } from "../hooks/use-session";
import { useSettings } from "../lib/settings";
import type { SoundscapeId, Pathway } from "../lib/settings";
import { getBreathHz, getShapedBreathPhase } from "../lib/regulation-clock";
import { BRAND, APP_SUBTITLE } from "../lib/constants";
import { isMobile } from "../lib/device";
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
  const breathRafRef = useRef(0);
  const sessionStartTimeRef = useRef(0);

  const handleStateChange = useCallback(
    (state: SessionState, _duration: SessionDuration) => {
      const engine = audioRef.current;
      if (!engine) return;

      if (state === "starting") {
        sessionStartTimeRef.current = performance.now();
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
      } else if (state === "completed" || state === "idle") {
        setShowUI(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      }
    },
    [settings.soundscape, settings.rhythmPreset, settings.binauralEnabled, settings.experienceMode, settings.pathway],
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
      if (isActive && audioRef.current && settings.experienceMode !== "visuals-only") {
        audioRef.current.crossfadeTo(s);
      }
    },
    [isActive, updateSettings, settings.experienceMode],
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

  const handleStartReset = useCallback(() => {
    audioRef.current?.setVolume(settings.volume);
    session.startReset();
    startHideTimer();
  }, [session, settings.volume, startHideTimer]);

  const handleStartTenMinuteReset = useCallback(() => {
    audioRef.current?.setVolume(settings.volume);
    session.startTenMinuteReset();
    startHideTimer();
  }, [session, settings.volume, startHideTimer]);

  const handleStartOpen = useCallback(() => {
    audioRef.current?.setVolume(settings.volume);
    session.startOpen();
    startHideTimer();
  }, [session, settings.volume, startHideTimer]);

  const handleStop = useCallback(() => {
    session.stop();
    setShowUI(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, [session]);

  const handleReplay = useCallback(() => {
    session.replay();
    startHideTimer();
  }, [session, startHideTimer]);

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

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const showVisuals = settings.experienceMode !== "audio-only";
  const rhythmHz = getBreathHz(settings.rhythmPreset);

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
      />

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
