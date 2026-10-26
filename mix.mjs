// Mixagem: locutor_01..04.wav + giro_01.wav (fala do Giro) + efeitos gerados por codigo.
//   node mix.mjs                    -> tempos calculados a partir da duracao de cada fala (roteiro abaixo)
//   node mix.mjs t1 t2 t3 t4 t5     -> tempos manuais (segundos)
// Roteiro: fala 1 enquanto a silhueta sobe do tunel; fala 2 termina em "GIRO!" (revelacao); o Giro corre e
// faz pedaladas; congela de lado e a carta aparece (fala 3 e o inicio da fala 4); descongela, pose final; fala do Giro.
// Os momentos-chave (ev) vao em out/envelope.json; a cena le de la, entao som e imagem nao se desencontram.
// Vozes: audio/<nome>.wav se existir; senao audio/provisorio/<nome>.wav (tts.ps1).
// Saidas: out/mix.wav, out/envelope.json e, se o video ja existir, out/giro_com_audio.mp4 e out/preview_com_audio.mp4.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FF = [path.join(ROOT, 'tools/ffmpeg/ffmpeg.exe')].find(fs.existsSync) ?? 'ffmpeg'; // senao, o do PATH
const SR = 48000, DUR = 32, FPS = 30, N = SR * DUR, TAU = Math.PI * 2;
const NAMES = ['locutor_01', 'locutor_02', 'locutor_03', 'locutor_04', 'giro_01'];
const ff = (args, input) => {
  const r = spawnSync(FF, ['-y', '-v', 'error', ...args], { input, maxBuffer: 1 << 30 });
  if (r.status) throw new Error('ffmpeg: ' + r.stderr);
  return r.stdout;
};
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

// ---- voz: carrega tudo primeiro (a duracao define o roteiro) ----
const clips = NAMES.map(n => {
  const file = [path.join(ROOT, 'audio', n + '.wav'), path.join(ROOT, 'audio/provisorio', n + '.wav')].find(fs.existsSync);
  if (!file) { console.warn(`falta ${n}.wav (coloque o WAV em audio/)`); return { file, s: new Float32Array(0), dur: 0 }; }
  const raw = ff(['-i', file, '-f', 'f32le', '-ac', '1', '-ar', SR, '-']);
  const s = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
  let end = s.length; while (end > 0 && Math.abs(s[end - 1]) < 0.01) end--;    // ignora silencio final
  return { file, s: s.subarray(0, end), dur: +(end / SR).toFixed(2) };
});
const durs = clips.map(c => c.dur);

// momentos-chave do roteiro (segundos)
const starts = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [];
starts[0] ??= 3.0;                                   // silhueta comeca a subir do tunel
starts[1] ??= Math.max(8.3, starts[0] + durs[0] + 0.3);
const reveal = starts[1] + durs[1] * 0.78;            // "GIRO!": holofotes focam, cores aparecem
const run0 = reveal + 0.25, side0 = run0 + 4.0;       // corre de frente 2,4 s, pedaladas 1,6 s, depois corre de lado
const f0 = side0 + 0.65;                              // congela no meio da corrida de lado
starts[2] ??= f0 + 0.2;                               // atributos
starts[3] ??= starts[2] + durs[2] + 0.25;             // "Fechamento: cem. E ele nao sai do seu time."
const f1 = starts[3] + durs[3] * 0.45;                // descongela depois de "Fechamento: cem"
starts[4] ??= f1 + 1.9;                               // fala do Giro, ja na pose final
const ev = { reveal, run0, side0, f0, f1 };
for (const k in ev) ev[k] = +ev[k].toFixed(3);

const voice = new Float32Array(N);
clips.forEach((c, i) => {
  const o = Math.round(starts[i] * SR);
  for (let k = 0; k < c.s.length && o + k < N; k++) voice[o + k] += c.s[k];
  if (c.file) console.log(`${path.relative(ROOT, c.file)} em ${starts[i].toFixed(2)}s (fala ${durs[i]}s)`);
});
const lastEnd = Math.max(...starts.map((s, i) => s + durs[i]));
console.log(`revelacao ${ev.reveal}s | congela ${ev.f0}-${ev.f1}s | ultima fala termina ${lastEnd.toFixed(2)}s de ${DUR}s`);
if (lastEnd > DUR - 0.8) console.warn('aviso: a ultima fala termina perto do fim; aumente DUR');

// ---- efeitos (deterministicos, seed fixa) ----
const sfx = new Float32Array(N), rnd = mulberry32(360);
function kick(t0, amp, len = 0.6) {
  let ph = 0;
  for (let k = 0, o = Math.round(t0 * SR); k < len * SR && o + k < N; k++) {
    const t = k / SR; ph += TAU * (38 + 90 * Math.exp(-t * 28)) / SR;
    sfx[o + k] += Math.sin(ph) * Math.exp(-t * 7) * amp;
  }
}
function noiseBurst(t0, amp, len, decay) {
  let lp = 0;
  for (let k = 0, o = Math.round(t0 * SR); k < len * SR && o + k < N; k++) { lp += 0.08 * (rnd() * 2 - 1 - lp); sfx[o + k] += lp * amp * Math.exp(-k / SR * decay); }
}
for (const b of [0, 1, 2]) { kick(b, 0.7); kick(b + 0.27, 0.45); }          // batida grave (coracao) antes do locutor
for (let b = starts[0]; b < DUR - 1; b += 0.5) if (b < f0 || b > f1) kick(b, 0.16 + 0.12 * ss(f1, f1 + 1, b), 0.35); // pulso (para no congelamento)
kick(reveal, 1.0, 1.6); noiseBurst(reveal, 2.2, 1.4, 3.5);                     // impacto da revelacao
{ // "power up": varredura subindo ate a revelacao + "ding"
  let ph = 0; const a = Math.round((reveal - 2.6) * SR), b = Math.round(reveal * SR);
  for (let i = a; i < b; i++) {
    const u = (i - a) / (b - a), f = 80 * Math.pow(12, u) * (1 + 0.02 * Math.sin(TAU * 7 * u * 3.6));
    ph += TAU * f / SR;
    sfx[i] += (Math.sin(ph) + 0.4 * Math.sin(2 * ph) + 0.2 * Math.sin(3 * ph)) * 0.12 * ss(0, 0.2, u) * (1 - ss(0.97, 1, u));
  }
  for (let k = 0; k < 1.5 * SR && b + k < N; k++) sfx[b + k] += Math.sin(TAU * 1320 * k / SR) * 0.12 * Math.exp(-k / SR * 4);
}
for (let i = 0; i < 260; i++) {                                                // estalos das faiscas do anel
  const o = Math.round((reveal + 0.1 + 3.0 * Math.sqrt(rnd())) * SR), amp = 0.05 + rnd() * 0.08;
  for (let k = 0; k < 240 && o + k < N; k++) sfx[o + k] += (rnd() * 2 - 1) * amp * Math.exp(-k / 40);
}
kick(f0, 0.9, 1.0); noiseBurst(f0, 1.4, 0.5, 9);                               // "pum" do congelamento
kick(f1, 0.6, 0.6); noiseBurst(f1, 0.9, 0.4, 8);                               // descongela

const CROWD = 0.5; // ganho da torcida; abaixe se chiar
{ // torcida: ruido filtrado (passa-faixa por dois passa-baixas); explode na revelacao e no final; abafada no congelamento
  let l1 = 0, l2 = 0;
  const talk = t => Math.max(...starts.map((s, i) => ss(s - 0.2, s + 0.3, t) * (1 - ss(s + durs[i], s + durs[i] + 0.5, t))));
  for (let i = 0; i < N; i++) {
    const t = i / SR, n = rnd() * 2 - 1;
    const freeze = ss(f0, f0 + 0.15, t) * (1 - ss(f1, f1 + 0.3, t));
    const bright = (0.025 + 0.04 * ss(f1, f1 + 1, t)) * (1 - 0.6 * freeze);
    l1 += bright * (n - l1); l2 += 0.02 * (l1 - l2);
    const level = 0.5 + 0.9 * ss(reveal, reveal + 0.8, t) + 0.75 * ss(f1, f1 + 1, t);
    const swell = 1 + 0.25 * Math.sin(TAU * 0.23 * t) + 0.15 * Math.sin(TAU * 0.61 * t + 1);
    const duck = 1 - 0.8 * talk(t);                                            // -80% enquanto alguem fala
    sfx[i] += (l1 - l2) * level * swell * CROWD * duck * (1 - 0.5 * freeze);
  }
}

// ---- envelope da boca por quadro (RMS da voz, normalizado) ----
const env = [];
for (let f = 0; f < DUR * FPS; f++) {
  let s = 0; const a = Math.round(f * SR / FPS), b = Math.round((f + 1) * SR / FPS);
  for (let i = a; i < b; i++) s += voice[i] * voice[i];
  env.push(Math.sqrt(s / (b - a)));
}
const peak = Math.max(...env) || 1;
let prev = 0;
const envOut = env.map(v => { const x = Math.min(1, Math.sqrt(v / peak) * 1.15); prev = x > prev ? x : prev * 0.55 + x * 0.45; return +(prev < 0.08 ? 0 : prev).toFixed(3); });
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out/envelope.json'), JSON.stringify({ fps: FPS, dur: DUR, starts: starts.map(s => +s.toFixed(3)), durs, ev, env: envOut }));

// ---- mistura: torcida/efeitos abaixam sob a voz; limitador suave ----
const mix = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const e = envOut[Math.min(envOut.length - 1, Math.floor(i / SR * FPS))];
  mix[i] = Math.tanh(voice[i] * 1.6 + sfx[i] * (1 - 0.6 * e));
}
const wav = path.join(ROOT, 'out/mix.wav');
ff(['-f', 'f32le', '-ar', SR, '-ac', 1, '-i', '-', '-c:a', 'pcm_s16le', wav], Buffer.from(mix.buffer));
console.log('ok: out/mix.wav, out/envelope.json');
for (const v of ['giro', 'preview']) {
  const mp4 = path.join(ROOT, `out/${v}.mp4`);
  if (!fs.existsSync(mp4)) continue;
  const audio = v === 'preview' ? ['libmp3lame', '-b:a', '192k'] : ['aac', '-b:a', '192k'];   // preview em MP3: o player do VS Code nao toca AAC
  ff(['-i', mp4, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', ...audio, '-shortest', path.join(ROOT, `out/${v}_com_audio.mp4`)]);
  console.log(`ok: out/${v}_com_audio.mp4`);
}
