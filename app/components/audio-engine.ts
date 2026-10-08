import type { SoundscapeId, Pathway, AudioReactivity } from "../lib/settings";
import type { RhythmPresetId } from "../lib/regulation-clock";
import { RHYTHM_PRESETS, getBreathHz } from "../lib/regulation-clock";
import { SOUNDSCAPE_DESCRIPTIONS, MASTER_SWELL_DEPTH } from "../lib/constants";

export type AudioMode = SoundscapeId;

interface SoundscapeConfig {
  carrierFreq: number;
  binauralOffset: number;
  droneFreqs: number[];
  padFreqs: number[];
  noiseGain: number;
  filterBrightness: number;
  reverbWet: number;
  label: string;
  description: string;
}

export const SOUNDSCAPES: Record<SoundscapeId, SoundscapeConfig> = {
  calm: {
    carrierFreq: 580,
    binauralOffset: 4,
    droneFreqs: [580, 870, 1160],
    padFreqs: [580, 597, 1160, 1195],
    noiseGain: 0.021,
    filterBrightness: 2200,
    reverbWet: 0.30,
    label: "Calm",
    description: SOUNDSCAPE_DESCRIPTIONS.calm,
  },
  ground: {
    carrierFreq: 520,
    binauralOffset: 7.83,
    droneFreqs: [520, 780, 1040],
    padFreqs: [520, 536, 1040, 1072],
    noiseGain: 0.028,
    filterBrightness: 1800,
    reverbWet: 0.25,
    label: "Ground",
    description: SOUNDSCAPE_DESCRIPTIONS.ground,
  },
  drift: {
    carrierFreq: 660,
    binauralOffset: 2.5,
    droneFreqs: [660, 990, 1320],
    padFreqs: [660, 680, 1320, 1360],
    noiseGain: 0.0175,
    filterBrightness: 2400,
    reverbWet: 0.40,
    label: "Drift",
    description: SOUNDSCAPE_DESCRIPTIONS.drift,
  },
};


interface SoundscapeBus {
  gainNode: GainNode;
  oscillators: OscillatorNode[];
  nodes: AudioNode[];
  binauralGainL: GainNode | null;
  binauralGainR: GainNode | null;
  lfoOscillators: OscillatorNode[];
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterHighpass: BiquadFilterNode | null = null;
  private masterLowpass: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private timeDomainData: Float32Array = new Float32Array(0);
  private smoothedLevel = 0;

  private currentBus: SoundscapeBus | null = null;
  private crossfadeBus: SoundscapeBus | null = null;
  private crossfadeTimer: ReturnType<typeof setTimeout> | null = null;

  private isPlaying = false;
  private currentSoundscape: SoundscapeId = "calm";
  private volumeLevel = 0.7;
  private rhythmPreset: RhythmPresetId = "steady";
  private binauralEnabled = true;
  private pathway: Pathway = "ambient-rhythm";
  private audioReactivity: AudioReactivity = "on";
  private breathLfoGainNode: GainNode | null = null;

  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;

  private audioError: Error | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      try {
        this.ctx = new AudioContext();
        this.audioError = null;
      } catch (e) {
        this.audioError = e instanceof Error ? e : new Error("AudioContext unavailable");
        throw this.audioError;
      }
    }
    return this.ctx;
  }

  getAudioError(): Error | null {
    return this.audioError;
  }

  private buildMasterChain(): void {
    const ctx = this.ensureContext();

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;

    this.masterHighpass = ctx.createBiquadFilter();
    this.masterHighpass.type = "highpass";
    this.masterHighpass.frequency.value = 100;
    this.masterHighpass.Q.value = 0.7;

    this.masterLowpass = ctx.createBiquadFilter();
    this.masterLowpass.type = "lowpass";
    this.masterLowpass.frequency.value = 4000;
    this.masterLowpass.Q.value = 0.7;

    // Output protection: conservative limiter
    // threshold -24dB, knee 30dB, ratio 12:1 — catches peaks without squashing dynamics
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.timeDomainData = new Float32Array(this.analyser.fftSize);

    // Build reverb
    const reverbWet = SOUNDSCAPES[this.currentSoundscape].reverbWet;
    this.buildReverb(ctx, reverbWet);

    // Chain: masterGain → highpass → lowpass → compressor → [dry/wet split]
    this.masterGain.connect(this.masterHighpass);
    this.masterHighpass.connect(this.masterLowpass);
    this.masterLowpass.connect(this.compressor);
    this.compressor.connect(this.analyser);

    if (this.dryGain && this.wetGain) {
      this.compressor.connect(this.dryGain);
      this.compressor.connect(this.wetGain);
    }
  }

  private buildReverb(ctx: AudioContext, reverbWet: number): void {
    const length = Math.floor(ctx.sampleRate * 0.8);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2.5);
        data[i] = (Math.random() * 2 - 1) * decay;
        if (i > 0) {
          data[i] = data[i] * 0.6 + data[i - 1] * 0.4;
        }
      }
    }

    this.convolver = ctx.createConvolver();
    this.convolver.buffer = impulse;

    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1 - reverbWet;
    this.dryGain.connect(ctx.destination);

    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = reverbWet;
    this.wetGain.connect(this.convolver);
    this.convolver.connect(ctx.destination);
  }

  private createSoundscapeBus(soundscape: SoundscapeId): SoundscapeBus {
    const ctx = this.ensureContext();
    const config = SOUNDSCAPES[soundscape];
    const hz = getBreathHz(this.rhythmPreset);

    const busGain = ctx.createGain();
    busGain.gain.value = 0;
    if (this.masterGain) {
      busGain.connect(this.masterGain);
    }

    const oscillators: OscillatorNode[] = [];
    const nodes: AudioNode[] = [];
    const lfoOscillators: OscillatorNode[] = [];
    let binauralGainL: GainNode | null = null;
    let binauralGainR: GainNode | null = null;

    // Binaural beat pair
    const merger = ctx.createChannelMerger(2);
    binauralGainL = ctx.createGain();
    binauralGainR = ctx.createGain();
    const binauralLevel = this.binauralEnabled ? 0.06 : 0;
    binauralGainL.gain.value = binauralLevel;
    binauralGainR.gain.value = binauralLevel;

    const oscL = ctx.createOscillator();
    oscL.type = "sine";
    oscL.frequency.value = config.carrierFreq;
    oscL.connect(binauralGainL);
    binauralGainL.connect(merger, 0, 0);

    const oscR = ctx.createOscillator();
    oscR.type = "sine";
    oscR.frequency.value = config.carrierFreq + config.binauralOffset;
    oscR.connect(binauralGainR);
    binauralGainR.connect(merger, 0, 1);

    merger.connect(busGain);
    oscL.start();
    oscR.start();
    oscillators.push(oscL, oscR);
    nodes.push(binauralGainL, binauralGainR, merger);

    // Drone layers
    for (const freq of config.droneFreqs) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.value = freq + 1.2;

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = 0.5;

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = hz;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.02;

      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.05;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = freq * 3;
      filter.Q.value = 0.7;

      lfo.connect(lfoGain);
      lfoGain.connect(droneGain.gain);

      osc.connect(filter);
      osc2.connect(osc2Gain);
      osc2Gain.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(busGain);

      osc.start();
      osc2.start();
      lfo.start();
      oscillators.push(osc, osc2);
      lfoOscillators.push(lfo);
      nodes.push(osc2Gain, lfoGain, droneGain, filter);
    }

    // Warm pad
    for (let i = 0; i < config.padFreqs.length; i += 2) {
      const f1 = config.padFreqs[i];
      const f2 = config.padFreqs[i + 1];
      if (f2 === undefined) break;

      const osc1 = ctx.createOscillator();
      osc1.type = "triangle";
      osc1.frequency.value = f1;

      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.value = f2;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = config.filterBrightness;
      filter.Q.value = 0.7;

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = hz;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.012;

      const padGain = ctx.createGain();
      padGain.gain.value = 0.045;

      lfo.connect(lfoGain);
      lfoGain.connect(padGain.gain);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(padGain);
      padGain.connect(busGain);

      osc1.start();
      osc2.start();
      lfo.start();
      oscillators.push(osc1, osc2);
      lfoOscillators.push(lfo);
      nodes.push(filter, lfoGain, padGain);
    }

    // Filtered noise
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = "lowpass";
    bp.frequency.value = 1200;
    bp.Q.value = 0.6;

    const noiseLfo = ctx.createOscillator();
    noiseLfo.type = "sine";
    noiseLfo.frequency.value = hz;

    const noiseLfoGain = ctx.createGain();
    noiseLfoGain.gain.value = 60;

    noiseLfo.connect(noiseLfoGain);
    noiseLfoGain.connect(bp.frequency);

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = config.noiseGain;

    noise.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(busGain);

    noise.start();
    noiseLfo.start();
    lfoOscillators.push(noiseLfo);
    nodes.push(noise as unknown as AudioNode, bp, noiseLfoGain, noiseGain);

    // Master breathing LFO
    const breathLfo = ctx.createOscillator();
    breathLfo.type = "sine";
    breathLfo.frequency.value = hz;

    const targetGain = this.volumeLevel * 0.5;
    const breathLfoGain = ctx.createGain();
    const swellDepth = this.pathway === "external-focus" ? 0 : MASTER_SWELL_DEPTH;
    breathLfoGain.gain.value = targetGain * swellDepth;
    this.breathLfoGainNode = breathLfoGain;

    breathLfo.connect(breathLfoGain);
    breathLfoGain.connect(busGain.gain);

    breathLfo.start();
    lfoOscillators.push(breathLfo);
    nodes.push(breathLfoGain);

    return {
      gainNode: busGain,
      oscillators,
      nodes,
      binauralGainL,
      binauralGainR,
      lfoOscillators,
    };
  }

  private disposeBus(bus: SoundscapeBus): void {
    for (const osc of bus.oscillators) {
      try { osc.stop(); } catch {}
    }
    for (const osc of bus.lfoOscillators) {
      try { osc.stop(); } catch {}
    }
    for (const node of bus.nodes) {
      try { node.disconnect(); } catch {}
    }
    try { bus.gainNode.disconnect(); } catch {}
  }

  async start(
    soundscape: SoundscapeId = "calm",
    options?: { rhythmPreset?: RhythmPresetId; binauralEnabled?: boolean; pathway?: Pathway },
  ): Promise<void> {
    if (this.isPlaying) {
      await this.stop();
    }

    this.currentSoundscape = soundscape;
    if (options?.rhythmPreset) this.rhythmPreset = options.rhythmPreset;
    if (options?.binauralEnabled !== undefined) this.binauralEnabled = options.binauralEnabled;
    if (options?.pathway) this.pathway = options.pathway;

    let ctx: AudioContext;
    try {
      ctx = this.ensureContext();
    } catch {
      return;
    }

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return;
      }
    }

    this.buildMasterChain();

    this.currentBus = this.createSoundscapeBus(soundscape);

    const targetGain = this.volumeLevel * 0.5;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(
        targetGain,
        ctx.currentTime + 5,
      );
    }

    this.currentBus.gainNode.gain.setValueAtTime(1, ctx.currentTime);

    this.isPlaying = true;
  }

  async crossfadeTo(newSoundscape: SoundscapeId): Promise<void> {
    if (!this.isPlaying || !this.ctx || !this.masterGain) {
      return this.start(newSoundscape);
    }

    if (this.crossfadeTimer) {
      clearTimeout(this.crossfadeTimer);
      if (this.crossfadeBus) {
        this.disposeBus(this.crossfadeBus);
        this.crossfadeBus = null;
      }
    }

    this.currentSoundscape = newSoundscape;
    const ctx = this.ctx;
    const oldBus = this.currentBus;

    // Update reverb wet/dry for new soundscape
    const config = SOUNDSCAPES[newSoundscape];
    if (this.dryGain) {
      this.dryGain.gain.setValueAtTime(1 - config.reverbWet, ctx.currentTime);
    }
    if (this.wetGain) {
      this.wetGain.gain.setValueAtTime(config.reverbWet, ctx.currentTime);
    }

    const newBus = this.createSoundscapeBus(newSoundscape);
    this.crossfadeBus = newBus;

    // Crossfade: old bus fades out, new bus fades in
    if (oldBus) {
      oldBus.gainNode.gain.setValueAtTime(1, ctx.currentTime);
      oldBus.gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4);
    }

    newBus.gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    newBus.gainNode.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 5);

    this.crossfadeTimer = setTimeout(() => {
      if (oldBus) {
        this.disposeBus(oldBus);
      }
      this.currentBus = newBus;
      this.crossfadeBus = null;
      this.crossfadeTimer = null;
    }, 5200);
  }

  setVolume(level: number): void {
    this.volumeLevel = Math.max(0, Math.min(1, level));
    if (this.ctx && this.masterGain) {
      const target = this.volumeLevel * 0.5;
      if (target < 0.001) {
        this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      } else {
        this.masterGain.gain.exponentialRampToValueAtTime(target, this.ctx.currentTime + 0.3);
      }
    }
  }

  setRhythm(preset: RhythmPresetId): void {
    this.rhythmPreset = preset;
    const hz = getBreathHz(preset);
    const buses = [this.currentBus, this.crossfadeBus].filter(Boolean) as SoundscapeBus[];
    for (const bus of buses) {
      for (const lfo of bus.lfoOscillators) {
        lfo.frequency.setValueAtTime(hz, this.ctx?.currentTime ?? 0);
      }
    }
  }

  setBinauralEnabled(enabled: boolean): void {
    this.binauralEnabled = enabled;
    const targetLevel = enabled ? 0.06 : 0;
    const buses = [this.currentBus, this.crossfadeBus].filter(Boolean) as SoundscapeBus[];
    for (const bus of buses) {
      if (bus.binauralGainL && this.ctx) {
        if (targetLevel < 0.001) {
          bus.binauralGainL.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
          bus.binauralGainR!.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        } else {
          bus.binauralGainL.gain.exponentialRampToValueAtTime(targetLevel, this.ctx.currentTime + 0.5);
          bus.binauralGainR!.gain.exponentialRampToValueAtTime(targetLevel, this.ctx.currentTime + 0.5);
        }
      }
    }
  }

  setPathway(pathway: Pathway): void {
    this.pathway = pathway;
    if (!this.ctx || !this.breathLfoGainNode) return;
    const targetGain = this.volumeLevel * 0.5;
    const swellDepth = pathway === "external-focus" ? 0 : MASTER_SWELL_DEPTH;
    const targetValue = targetGain * swellDepth;
    if (targetValue < 0.001) {
      this.breathLfoGainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
    } else {
      this.breathLfoGainNode.gain.exponentialRampToValueAtTime(targetValue, this.ctx.currentTime + 2);
    }
  }

  setAudioReactivity(reactivity: AudioReactivity): void {
    this.audioReactivity = reactivity;
  }

  getAudioLevel(): number {
    if (this.audioReactivity === "off") return 0;
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.timeDomainData);
    let sumSquares = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const sample = this.timeDomainData[i];
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / this.timeDomainData.length);
    const normalized = Math.min(1, rms * 4);
    this.smoothedLevel = this.smoothedLevel * 0.8 + normalized * 0.2;
    if (this.audioReactivity === "reduced") return this.smoothedLevel * 0.3;
    return this.smoothedLevel;
  }

  async stop(): Promise<void> {
    if (!this.ctx || !this.isPlaying) return;

    if (this.crossfadeTimer) {
      clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }

    if (this.masterGain) {
      this.masterGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 4);
    }

    await new Promise((resolve) => setTimeout(resolve, 4200));

    if (this.currentBus) {
      this.disposeBus(this.currentBus);
      this.currentBus = null;
    }
    if (this.crossfadeBus) {
      this.disposeBus(this.crossfadeBus);
      this.crossfadeBus = null;
    }

    // Disconnect master chain
    for (const node of [this.masterGain, this.masterHighpass, this.masterLowpass, this.compressor, this.analyser, this.dryGain, this.wetGain, this.convolver]) {
      try { node?.disconnect(); } catch {}
    }

    this.masterGain = null;
    this.masterHighpass = null;
    this.masterLowpass = null;
    this.compressor = null;
    this.analyser = null;
    this.dryGain = null;
    this.wetGain = null;
    this.convolver = null;
    this.smoothedLevel = 0;
    this.breathLfoGainNode = null;
    this.isPlaying = false;

    // Suspend, don't close — reuse the context
    try {
      await this.ctx.suspend();
    } catch {}
  }

  dispose(): void {
    if (this.crossfadeTimer) {
      clearTimeout(this.crossfadeTimer);
    }
    if (this.currentBus) this.disposeBus(this.currentBus);
    if (this.crossfadeBus) this.disposeBus(this.crossfadeBus);
    try { this.ctx?.close(); } catch {}
    this.ctx = null;
    this.isPlaying = false;
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getMode(): SoundscapeId {
    return this.currentSoundscape;
  }

  getSoundscape(): SoundscapeId {
    return this.currentSoundscape;
  }
}
