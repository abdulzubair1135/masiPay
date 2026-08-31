// Web Audio API sound generators for kitchen and student alerts

// 1. Gentle Bell Chime for Kitchen when new order arrives
export const playOrderBellSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(587.33, now, 0.4);       // D5
    playTone(880.0, now + 0.15, 0.6); // A5
    playTone(1174.66, now + 0.3, 0.8);// D6
  } catch (err) {
    console.warn('Could not play audio bell notification:', err);
  }
};

// 2. Loud Siren / Alarm for Student when Masi clicks "इधर आओ / खाना तैयार है"
export const playFoodReadySiren = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Siren sweeps: Up & Down oscillating siren frequencies
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.6, now);

    // Sweep 1
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
    osc.frequency.linearRampToValueAtTime(600, now + 0.6);

    // Sweep 2
    osc.frequency.linearRampToValueAtTime(1200, now + 0.9);
    osc.frequency.linearRampToValueAtTime(600, now + 1.2);

    // Sweep 3
    osc.frequency.linearRampToValueAtTime(1400, now + 1.5);
    osc.frequency.linearRampToValueAtTime(800, now + 1.8);

    gain.gain.setValueAtTime(0.6, now + 1.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 2.0);

    // Mobile vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([300, 150, 300, 150, 500]);
    }
  } catch (err) {
    console.warn('Could not play food ready siren:', err);
  }
};
