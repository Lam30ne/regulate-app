import "@testing-library/jest-dom/vitest";

class MockOscillatorNode {
  frequency = { value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} };
  type: OscillatorType = "sine";
  connect() { return this; }
  disconnect() {}
  start() {}
  stop() {}
  addEventListener() {}
  removeEventListener() {}
}

class MockGainNode {
  gain = { value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} };
  connect() { return this; }
  disconnect() {}
}

class MockBiquadFilterNode {
  frequency = { value: 0, setValueAtTime: () => {} };
  Q = { value: 0, setValueAtTime: () => {} };
  type: BiquadFilterType = "lowpass";
  connect() { return this; }
  disconnect() {}
}

class MockDynamicsCompressorNode {
  threshold = { value: -24 };
  knee = { value: 30 };
  ratio = { value: 12 };
  attack = { value: 0.003 };
  release = { value: 0.25 };
  connect() { return this; }
  disconnect() {}
}

class MockAnalyserNode {
  fftSize = 256;
  frequencyBinCount = 128;
  smoothingTimeConstant = 0.8;
  getFloatTimeDomainData() {}
  getByteFrequencyData() {}
  connect() { return this; }
  disconnect() {}
}

class MockChannelMergerNode {
  connect() { return this; }
  disconnect() {}
}

class MockConvolverNode {
  buffer: AudioBuffer | null = null;
  connect() { return this; }
  disconnect() {}
}

class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
  }
  getChannelData() { return new Float32Array(this.length); }
}

class MockAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  sampleRate = 44100;
  destination = { connect() {}, disconnect() {} };

  createOscillator() { return new MockOscillatorNode(); }
  createGain() { return new MockGainNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }
  createDynamicsCompressor() { return new MockDynamicsCompressorNode(); }
  createAnalyser() { return new MockAnalyserNode(); }
  createChannelMerger() { return new MockChannelMergerNode(); }
  createConvolver() { return new MockConvolverNode(); }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate });
  }
  createBufferSource() {
    return {
      buffer: null as AudioBuffer | null,
      loop: false,
      connect() { return this; },
      disconnect() {},
      start() {},
      stop() {},
    };
  }

  async resume() { this.state = "running"; }
  async suspend() { this.state = "suspended"; }
  async close() { this.state = "closed"; }
}

Object.defineProperty(globalThis, "AudioContext", { value: MockAudioContext, writable: true });
Object.defineProperty(globalThis, "AudioBuffer", { value: MockAudioBuffer, writable: true });
