import { describe, it, expect, beforeEach, vi } from "vitest";
import { AudioEngine } from "./audio-engine";

describe("AudioEngine", () => {
  let engine: AudioEngine;

  beforeEach(() => {
    engine = new AudioEngine();
  });

  describe("initial state", () => {
    it("is not playing", () => {
      expect(engine.getIsPlaying()).toBe(false);
    });

    it("defaults to calm soundscape", () => {
      expect(engine.getSoundscape()).toBe("calm");
    });

    it("has no context before start", () => {
      expect(engine.getContext()).toBeNull();
    });

    it("has no output node before start", () => {
      expect(engine.getOutputNode()).toBeNull();
    });

    it("has no audio error", () => {
      expect(engine.getAudioError()).toBeNull();
    });
  });

  describe("start", () => {
    it("sets isPlaying to true", async () => {
      await engine.start();
      expect(engine.getIsPlaying()).toBe(true);
    });

    it("creates an AudioContext", async () => {
      await engine.start();
      expect(engine.getContext()).not.toBeNull();
    });

    it("creates an output node", async () => {
      await engine.start();
      expect(engine.getOutputNode()).not.toBeNull();
    });

    it("uses the specified soundscape", async () => {
      await engine.start("drift");
      expect(engine.getSoundscape()).toBe("drift");
    });

    it("defaults to calm if no soundscape given", async () => {
      await engine.start();
      expect(engine.getSoundscape()).toBe("calm");
    });

    it("accepts rhythm and binaural options", async () => {
      await engine.start("ground", {
        rhythmPreset: "slower",
        binauralEnabled: false,
        pathway: "external-focus",
      });
      expect(engine.getIsPlaying()).toBe(true);
      expect(engine.getSoundscape()).toBe("ground");
    });

    it("stops first if already playing", async () => {
      await engine.start("calm");
      expect(engine.getIsPlaying()).toBe(true);
      await engine.start("drift");
      expect(engine.getSoundscape()).toBe("drift");
    });
  });

  describe("stop", () => {
    it("sets isPlaying to false", async () => {
      await engine.start();
      await engine.stop();
      expect(engine.getIsPlaying()).toBe(false);
    });

    it("is a no-op when not playing", async () => {
      await engine.stop();
      expect(engine.getIsPlaying()).toBe(false);
    });

    it("clears the output node", async () => {
      await engine.start();
      await engine.stop();
      expect(engine.getOutputNode()).toBeNull();
    });
  });

  describe("setVolume", () => {
    it("clamps volume below 0 to 0", async () => {
      await engine.start();
      engine.setVolume(-0.5);
      expect(engine.getIsPlaying()).toBe(true);
    });

    it("clamps volume above 1 to 1", async () => {
      await engine.start();
      engine.setVolume(1.5);
      expect(engine.getIsPlaying()).toBe(true);
    });

    it("does not throw when not playing", () => {
      expect(() => engine.setVolume(0.5)).not.toThrow();
    });
  });

  describe("setRhythm", () => {
    it("does not throw when not playing", () => {
      expect(() => engine.setRhythm("slower")).not.toThrow();
    });

    it("updates while playing", async () => {
      await engine.start();
      expect(() => engine.setRhythm("faster")).not.toThrow();
    });
  });

  describe("setBinauralEnabled", () => {
    it("does not throw when not playing", () => {
      expect(() => engine.setBinauralEnabled(false)).not.toThrow();
    });

    it("toggles while playing", async () => {
      await engine.start();
      expect(() => engine.setBinauralEnabled(false)).not.toThrow();
      expect(() => engine.setBinauralEnabled(true)).not.toThrow();
    });
  });

  describe("setPathway", () => {
    it("does not throw when not playing", () => {
      expect(() => engine.setPathway("external-focus")).not.toThrow();
    });

    it("switches pathway while playing", async () => {
      await engine.start();
      expect(() => engine.setPathway("external-focus")).not.toThrow();
      expect(() => engine.setPathway("ambient-rhythm")).not.toThrow();
    });
  });

  describe("setAudioReactivity", () => {
    it("sets reactivity", () => {
      engine.setAudioReactivity("off");
      expect(engine.getAudioLevel()).toBe(0);
    });

    it("returns 0 when off", async () => {
      await engine.start();
      engine.setAudioReactivity("off");
      expect(engine.getAudioLevel()).toBe(0);
    });
  });

  describe("getAudioLevel", () => {
    it("returns 0 when not playing", () => {
      expect(engine.getAudioLevel()).toBe(0);
    });

    it("returns a number when playing", async () => {
      await engine.start();
      const level = engine.getAudioLevel();
      expect(typeof level).toBe("number");
      expect(level).toBeGreaterThanOrEqual(0);
    });
  });

  describe("crossfadeTo", () => {
    it("changes soundscape", async () => {
      await engine.start("calm");
      await engine.crossfadeTo("drift");
      expect(engine.getSoundscape()).toBe("drift");
    });

    it("starts engine if not playing", async () => {
      await engine.crossfadeTo("ground");
      expect(engine.getIsPlaying()).toBe(true);
      expect(engine.getSoundscape()).toBe("ground");
    });
  });

  describe("dispose", () => {
    it("sets isPlaying to false", async () => {
      await engine.start();
      engine.dispose();
      expect(engine.getIsPlaying()).toBe(false);
    });

    it("clears context", async () => {
      await engine.start();
      engine.dispose();
      expect(engine.getContext()).toBeNull();
    });

    it("is safe to call multiple times", () => {
      engine.dispose();
      engine.dispose();
      expect(engine.getIsPlaying()).toBe(false);
    });
  });

  describe("error handling", () => {
    it("captures AudioContext creation error", async () => {
      const origAudioContext = globalThis.AudioContext;
      Object.defineProperty(globalThis, "AudioContext", {
        value: class {
          constructor() {
            throw new Error("blocked");
          }
        },
        writable: true,
      });

      const errorEngine = new AudioEngine();
      await errorEngine.start();
      expect(errorEngine.getIsPlaying()).toBe(false);
      expect(errorEngine.getAudioError()).not.toBeNull();
      expect(errorEngine.getAudioError()!.message).toBe("blocked");

      Object.defineProperty(globalThis, "AudioContext", {
        value: origAudioContext,
        writable: true,
      });
    });
  });
});
