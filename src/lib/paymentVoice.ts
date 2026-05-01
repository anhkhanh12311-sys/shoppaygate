// Payment voice announcer using Web Speech API + WebAudio "ting" sound
// Vietnamese number-to-words for currency amounts.

const VOICE_SETTINGS_KEY = "paygate.voice.settings";

export interface VoiceSettings {
  enabled: boolean;
  volume: number; // 0..1
  rate: number;   // 0.5..2
  pitch: number;  // 0..2
  template: string; // contains {amount}
  playSound: boolean;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  volume: 1,
  rate: 1,
  pitch: 1,
  template: "Đã nhận {amount} đồng",
  playSound: true,
};

export const loadVoiceSettings = (): VoiceSettings => {
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
};

export const saveVoiceSettings = (s: VoiceSettings) => {
  localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(s));
};

// Vietnamese number reading (simplified, supports up to billions)
const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

const readUnder1000 = (n: number, full: boolean): string => {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts: string[] = [];
  if (h > 0 || full) {
    parts.push(`${DIGITS[h]} trăm`);
  }
  if (t > 1) {
    parts.push(`${DIGITS[t]} mươi`);
    if (u === 1) parts.push("mốt");
    else if (u === 5) parts.push("lăm");
    else if (u > 0) parts.push(DIGITS[u]);
  } else if (t === 1) {
    parts.push("mười");
    if (u === 5) parts.push("lăm");
    else if (u > 0) parts.push(DIGITS[u]);
  } else if (t === 0 && u > 0) {
    if (h > 0 || full) parts.push("lẻ");
    parts.push(DIGITS[u]);
  }
  return parts.join(" ").trim();
};

export const numberToVietnamese = (num: number): string => {
  if (num === 0) return "không";
  if (num < 0) return `âm ${numberToVietnamese(-num)}`;
  num = Math.floor(num);

  const billion = Math.floor(num / 1_000_000_000);
  const million = Math.floor((num % 1_000_000_000) / 1_000_000);
  const thousand = Math.floor((num % 1_000_000) / 1_000);
  const rest = num % 1_000;

  const parts: string[] = [];
  if (billion > 0) parts.push(`${readUnder1000(billion, false)} tỷ`);
  if (million > 0) parts.push(`${readUnder1000(million, billion > 0)} triệu`);
  if (thousand > 0) parts.push(`${readUnder1000(thousand, million > 0 || billion > 0)} nghìn`);
  if (rest > 0) parts.push(readUnder1000(rest, thousand > 0 || million > 0 || billion > 0));

  return parts.join(" ").replace(/\s+/g, " ").trim();
};

// Play a soft "ting" notification sound via WebAudio
export const playTingSound = (volume = 1) => {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const tones = [880, 1320]; // pleasant interval
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.25 * volume, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.7);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* ignore */
  }
};

const pickVietnameseVoice = (): SpeechSynthesisVoice | null => {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => /vi[-_]?VN/i.test(v.lang)) ||
    voices.find((v) => /^vi/i.test(v.lang)) ||
    null
  );
};

export const speakAmount = (amount: number, settings?: Partial<VoiceSettings>) => {
  const cfg = { ...loadVoiceSettings(), ...settings };
  if (!cfg.enabled) return;

  if (cfg.playSound) playTingSound(cfg.volume);

  if (typeof speechSynthesis === "undefined") return;
  try {
    // Cancel previous queue to avoid pile-up
    speechSynthesis.cancel();
    const text = cfg.template.replace("{amount}", numberToVietnamese(amount));
    const utter = new SpeechSynthesisUtterance(text);
    const v = pickVietnameseVoice();
    if (v) utter.voice = v;
    utter.lang = "vi-VN";
    utter.volume = cfg.volume;
    utter.rate = cfg.rate;
    utter.pitch = cfg.pitch;
    // Slight delay so the ting plays first
    setTimeout(() => speechSynthesis.speak(utter), cfg.playSound ? 350 : 0);
  } catch {
    /* ignore */
  }
};

// Force voices to load (some browsers need this kick)
export const primeVoices = () => {
  if (typeof speechSynthesis !== "undefined") {
    speechSynthesis.getVoices();
  }
};
