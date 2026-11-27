/**
 * Sound for the vertical shorts (scripts/shorts-video.cjs):
 *   - English voice-over: Google Cloud TTS or Azure Speech when their keys exist, else OpenAI
 *     (gpt-4o-mini-tts, fallback tts-1-hd) with OPENAI_API_KEY (a GitHub secret: voices are made in CI);
 *   - background music synthesized here note by note: no third-party track, no rights to manage.
 * Everything is 16-bit mono PCM at 24 kHz (the WAV format the OpenAI API returns), mixed later by ffmpeg.
 *
 * No post-processing of the voice (no silence removal, no time-stretch): on the sister project that is
 * what chopped word endings. Pace comes from the provider's rate setting and from short sentences.
 */
const fs = require("fs");

const SR = 24000;
// gpt-4o-mini-tts has no speed setting: the pace comes from these instructions. The first batch read too slowly
// (owner feedback 2026-11-27), hence the explicit fast tempo; the render log prints words per minute to check it.
const VOICE_INSTRUCTIONS =
  "Native American English tech creator narrating a fast-paced YouTube Short. Speak FAST: a quick, punchy " +
  "tempo of about 190 words per minute, energetic and confident, with only tiny pauses at full stops and none " +
  "inside sentences. Never drawl or stretch words. Crisp articulation, upbeat, no theatrical emphasis. " +
  "Read letter-spaced acronyms letter by letter, quickly.";

function parseWav(buf) {
  let off = 12;
  let rate = SR;
  let channels = 1;
  let bits = 16;
  let data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    let size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") {
      channels = buf.readUInt16LE(off + 10);
      rate = buf.readUInt32LE(off + 12);
      bits = buf.readUInt16LE(off + 22);
    }
    if (id === "data") {
      // A streamed response sometimes announces a fake size (0xFFFFFFFF): take the rest of the file.
      if (size === 0xffffffff || off + 8 + size > buf.length) size = buf.length - off - 8;
      data = buf.subarray(off + 8, off + 8 + size);
      break;
    }
    off += 8 + size + (size % 2);
  }
  if (!data || bits !== 16) throw new Error(`unexpected WAV (${bits} bits)`);
  const frames = Math.floor(data.length / (2 * channels));
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < channels; c++) s += data.readInt16LE((i * channels + c) * 2);
    samples[i] = s / channels / 32768;
  }
  return { samples, rate };
}

function resample(x, from) {
  if (from === SR) return x;
  const n = Math.floor((x.length * SR) / from);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = (i * from) / SR;
    const j = Math.floor(p);
    const f = p - j;
    out[i] = (x[j] ?? 0) * (1 - f) + (x[j + 1] ?? x[j] ?? 0) * f;
  }
  return out;
}

// Trims leading and trailing silence only (generous margins): a scene lasts as long as its sentence.
function trim(x) {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const thr = Math.max(0.003, peak * 0.02);
  let a = 0;
  let b = x.length - 1;
  while (a < b && Math.abs(x[a]) < thr) a++;
  while (b > a && Math.abs(x[b]) < thr) b--;
  return x.subarray(Math.max(0, a - Math.round(SR * 0.12)), Math.min(x.length, b + Math.round(SR * 0.25)));
}

const toInt16 = (x) => Int16Array.from(x, (v) => Math.max(-32767, Math.min(32767, Math.round(v * 32767))));

const clip = (buf) => {
  const w = parseWav(buf);
  const pcm = toInt16(trim(resample(w.samples, w.rate)));
  return { pcm, seconds: pcm.length / SR };
};

/** Google Cloud Text-to-Speech (secret GOOGLE_TTS_API_KEY, voice GOOGLE_TTS_VOICE). */
async function googleTts(text) {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "en-US", name: process.env.GOOGLE_TTS_VOICE || "en-US-Neural2-J" },
      audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: SR, speakingRate: 1.15 },
    }),
  });
  if (!res.ok) {
    console.warn(`TTS Google: ${res.status} ${(await res.text()).slice(0, 160)}`);
    return null;
  }
  return clip(Buffer.from((await res.json()).audioContent, "base64"));
}

/** Azure Speech (secrets AZURE_SPEECH_KEY + AZURE_SPEECH_REGION, voice AZURE_SPEECH_VOICE). */
async function azureTts(text) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) return null;
  const xml = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
    },
    body: `<speak version="1.0" xml:lang="en-US"><voice name="${process.env.AZURE_SPEECH_VOICE || "en-US-AndrewNeural"}"><prosody rate="+15%">${xml}</prosody></voice></speak>`,
  });
  if (!res.ok) {
    console.warn(`TTS Azure: ${res.status} ${(await res.text()).slice(0, 160)}`);
    return null;
  }
  return clip(Buffer.from(await res.arrayBuffer()));
}

async function openaiTts(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const tries = [
    { model: "gpt-4o-mini-tts", voice: process.env.OPENAI_TTS_VOICE || "ash", instructions: VOICE_INSTRUCTIONS },
    { model: "tts-1-hd", voice: "onyx", speed: 1.15 },
  ];
  for (const t of tries) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ ...t, input: text, response_format: "wav" }),
      });
      if (res.ok) return clip(Buffer.from(await res.arrayBuffer()));
      console.warn(`TTS ${t.model}: ${res.status} ${(await res.text()).slice(0, 160)}`);
      if (res.status < 500 && res.status !== 429) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  return null;
}

async function tts(text) {
  for (const f of [googleTts, azureTts, openaiTts]) {
    try {
      const c = await f(text);
      if (c) return c;
    } catch (e) {
      console.warn(`TTS: ${String(e).slice(0, 160)}`);
    }
  }
  return null;
}

// ─── Background music ──────────────────────────────────────────────────────
// 116 bpm, i–VI–III–VII in A minor (one bar per chord): soft pad, plucked bass, arpeggio, light beat.
const CHORDS = [
  { bass: 55.0, tones: [220.0, 261.63, 329.63] }, // A minor
  { bass: 87.31, tones: [174.61, 220.0, 261.63] }, // F
  { bass: 65.41, tones: [196.0, 261.63, 329.63] }, // C
  { bass: 98.0, tones: [196.0, 246.94, 293.66] }, // G
];

function music(seconds, seed = 7) {
  const n = Math.ceil(seconds * SR);
  const out = new Float32Array(n);
  const beat = 60 / 116;
  const bar = beat * 4;
  let rnd = seed >>> 0;
  const noise = () => ((rnd = (rnd * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const TAU = Math.PI * 2;
  let prevNoise = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const bi = Math.floor(t / bar);
    const ch = CHORDS[bi % CHORDS.length];
    const tb = t - bi * bar;
    // Pad: soft attack and release before the next bar (no click on chord change).
    const padEnv = Math.min(1, tb / 0.35) * Math.min(1, (bar - tb) / 0.25) * 0.8;
    let pad = 0;
    for (const f of ch.tones) pad += Math.sin(TAU * f * t) + 0.6 * Math.sin(TAU * f * 1.004 * t) + 0.15 * Math.sin(TAU * 2 * f * t);
    let s = pad * padEnv * 0.045;
    // Plucked bass on beats 1 and 3.
    const tBeat = tb % (beat * 2);
    s += Math.sin(TAU * ch.bass * 2 * t) * Math.exp(-tBeat * 4) * 0.22;
    // Sixteenth-note arpeggio, one octave up: the "tech" pulse.
    const six = beat / 4;
    const k = Math.floor(tb / six);
    const te = tb - k * six;
    const fa = ch.tones[[0, 1, 2, 1][k % 4]] * 2;
    s += (Math.sin(TAU * fa * t) + 0.25 * Math.sin(TAU * 2 * fa * t)) * Math.exp(-te * 14) * 0.055;
    // Kick on 1 and 3, light clap on 2 and 4, hi-hat on the off-beats.
    const tk = tb % (beat * 2);
    if (tk < 0.2) s += Math.sin(TAU * (45 + 75 * Math.exp(-tk * 30)) * tk) * Math.exp(-tk * 22) * 0.35;
    const nz = noise();
    const hp = nz - prevNoise;
    prevNoise = nz;
    const tc = (tb + beat) % (beat * 2);
    if (tc < 0.15) s += hp * Math.exp(-tc * 35) * 0.05;
    const e8 = beat / 2;
    const te8 = tb % e8;
    if (te8 < 0.05 && Math.floor(tb / e8) % 2 === 1) s += hp * Math.exp(-te8 * 120) * 0.035;
    out[i] = s;
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? 0.8 / peak : 1;
  const fadeIn = SR * 0.4;
  const fadeOut = SR * 1.4;
  for (let i = 0; i < n; i++) {
    const f = Math.min(1, i / fadeIn, (n - i) / fadeOut);
    out[i] *= g * Math.max(0, f);
  }
  return toInt16(out);
}

/** Short countdown tick (for the quiz timer), mixed into the voice track. */
function tick(freq = 1100) {
  const n = Math.round(SR * 0.09);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * freq * i) / SR) * Math.exp(-i / (SR * 0.018)) * 0.5;
  return toInt16(out);
}

/** Two-note chime (quiz answer reveal). */
function chime() {
  const n = Math.round(SR * 0.7);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const a = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 6);
    const b = t > 0.12 ? Math.sin(2 * Math.PI * 1318.5 * (t - 0.12)) * Math.exp(-(t - 0.12) * 5) : 0;
    out[i] = (a + b) * 0.28;
  }
  return toInt16(out);
}

function writeWav(file, pcm) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length * 2, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length * 2, 40);
  fs.writeFileSync(file, Buffer.concat([h, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)]));
}

module.exports = { SR, tts, music, tick, chime, writeWav };
