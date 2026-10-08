export function playWindDownChime(audioContext: AudioContext, destination?: AudioNode): void {
  const now = audioContext.currentTime;
  const dest = destination ?? audioContext.destination;

  const freqs = [660, 880, 1100];
  for (let i = 0; i < freqs.length; i++) {
    const osc = audioContext.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freqs[i];

    const gain = audioContext.createGain();
    const onset = now + i * 0.3;
    gain.gain.setValueAtTime(0, onset);
    gain.gain.linearRampToValueAtTime(0.04, onset + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, onset + 1.5);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(onset);
    osc.stop(onset + 1.6);
  }
}
