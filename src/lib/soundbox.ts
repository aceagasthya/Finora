/**
 * Synthesizes the authentic Indian UPI Soundbox notification sound
 * using the browser Web Audio API + SpeechSynthesis.
 */
export function playUpiChime(amountInr?: number, merchantName?: string) {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic frequency sequence (chime)
    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.12 }, // C5
      { freq: 659.25, time: 0.12, dur: 0.12 }, // E5
      { freq: 783.99, time: 0.24, dur: 0.15 }, // G5
      { freq: 1046.50, time: 0.38, dur: 0.35 }, // C6 (crisp bell finish)
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.001, now + time);
      gain.gain.exponentialRampToValueAtTime(0.3, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });

    // Optional voice prompt after 0.5 seconds
    if (amountInr && 'speechSynthesis' in window) {
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(
            `Finora: ₹${amountInr} received successfully on UPI.`
          );
          utterance.rate = 1.05;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          // ignore speech synthesis errors
        }
      }, 550);
    }
  } catch (err) {
    console.error('Audio chime error:', err);
  }
}
