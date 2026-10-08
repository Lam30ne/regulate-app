import { useState, useEffect } from "react";
import type { AudioEngine } from "./audio-engine";

export function AudioErrorBanner({ audioEngine }: { audioEngine: AudioEngine | null }) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!audioEngine) return;
    const id = setInterval(() => {
      setError(audioEngine.getAudioError());
    }, 1000);
    return () => clearInterval(id);
  }, [audioEngine]);

  if (!error) return null;

  return (
    <div
      role="alert"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm px-4 py-3 rounded-xl bg-amber-900/80 border border-amber-200/20 text-amber-100/80 text-xs font-light tracking-wider text-center"
    >
      Audio is unavailable in this browser. Visuals will continue without sound.
    </div>
  );
}
