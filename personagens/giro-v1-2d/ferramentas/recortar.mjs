// Recorta as poses do Giro 2D geradas no Gemini, tira o fundo branco e a sombra do chao e alinha todas.
//   node personagens/giro-v1-2d/ferramentas/recortar.mjs -> ../poses/<nome>.png (640x640, transparente) + saida/giro-v1-2d/poses.png (conferencia)
// Fundo = pixels claros e sem cor ligados a borda do recorte (o branco do peito fica, porque esta cercado de contorno).
// Alinhamento: pe no mesmo y, centro das botas no mesmo x, mesma altura do topo da crista ate o pe.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const IMG = process.env.POSES_DIR ?? path.join(ROOT, 'referencias/geradas-gemini');   // as imagens do Gemini
const POSES = [   // [nome, imagem, x, y, largura, altura]
  ['neutro', 'giro-v1_poses-a.png', 0, 0, 341, 505], ['acenando', 'giro-v1_poses-a.png', 341, 0, 341, 505],
  ['preocupado', 'giro-v1_poses-a.png', 341, 505, 341, 519], ['olhos-fechados', 'giro-v1_poses-a.png', 682, 505, 342, 519],
  ['pensando', 'giro-v1_poses-b.png', 0, 0, 341, 339], ['comemorando', 'giro-v1_poses-b.png', 341, 0, 341, 339], ['falando', 'giro-v1_poses-b.png', 682, 0, 342, 339],
  ['neutro-sem-anel', 'giro-v1_poses-sem-anel.png', 0, 0, 341, 470],   // corpo sem o anel: o anel e desenhado por codigo e gira
];
const SIZE = 640, FOOT_Y = 612, BODY_H = 430;   // quadro final; pe em FOOT_Y; altura crista->pe = BODY_H

const exe = [process.env.BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => p && fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: exe, headless: true });
const page = await browser.newPage();
const out = path.join(ROOT, 'personagens/giro-v1-2d/poses'); fs.mkdirSync(out, { recursive: true });

for (const [name, file, x, y, w, h] of POSES) {
  const src = 'data:image/png;base64,' + fs.readFileSync(path.join(IMG, file)).toString('base64');
  const png = await page.evaluate(async (src, x, y, w, h, SIZE, FOOT_Y, BODY_H) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = new OffscreenCanvas(w, h), g = c.getContext('2d'); g.drawImage(img, -x, -y);
    const d = g.getImageData(0, 0, w, h), p = d.data;
    const isBg = i => {   // branco em qualquer lugar; a sombra do chao (~190-200, mais escura) so na faixa de baixo
      const r = p[i], gg = p[i + 1], b = p[i + 2], mn = Math.min(r, gg, b), sat = Math.max(r, gg, b) - mn;
      return (mn > 240 && sat < 15) || ((i / 4 / w | 0) > 0.78 * h && mn > 175 && sat < 45);   // fundo ~255; painel do peito ~220
    };
    // flood fill a partir da borda
    const bg = new Uint8Array(w * h), st = [];
    for (let i = 0; i < w; i++) st.push(i, (h - 1) * w + i);
    for (let j = 0; j < h; j++) st.push(j * w, j * w + w - 1);
    // bolsoes de fundo presos dentro do desenho (miolo do anel, entre braco e corpo, furo da engrenagem):
    // regioes de branco quase puro (> 240) com 15 px ou mais tambem viram ponto de partida. O branco do Giro e mais escuro (~220).
    const pure = k => { const i = k * 4, mn = Math.min(p[i], p[i + 1], p[i + 2]); return mn > 240 && Math.max(p[i], p[i + 1], p[i + 2]) - mn < 15; };
    const seen = new Uint8Array(w * h);
    for (let k0 = 0; k0 < w * h; k0++) {
      if (seen[k0] || !pure(k0)) continue;
      const comp = [], q = [k0]; seen[k0] = 1;
      while (q.length) { const k = q.pop(); comp.push(k); const xx = k % w, yy = (k / w) | 0;
        for (const nk of [xx > 0 && k - 1, xx < w - 1 && k + 1, yy > 0 && k - w, yy < h - 1 && k + w]) if (nk !== false && !seen[nk] && pure(nk)) { seen[nk] = 1; q.push(nk); } }
      if (comp.length < 15) continue;
      // so bolsao "largo": o filete branco que contorna o anel (2-4 px) faz parte do desenho e fica
      const inC = new Set(comp);
      const core = comp.filter(k => [-2, 2, -2 * w, 2 * w].every(o => inC.has(k + o))).length;
      if (core >= 5) st.push(...comp);
    }
    while (st.length) { const k = st.pop(); if (bg[k] || !isBg(k * 4)) continue; bg[k] = 1; const xx = k % w, yy = (k / w) | 0;
      if (xx > 0) st.push(k - 1); if (xx < w - 1) st.push(k + 1); if (yy > 0) st.push(k - w); if (yy < h - 1) st.push(k + w); }
    for (let k = 0; k < w * h; k++) {
      if (bg[k]) { p[k * 4 + 3] = 0; continue; }
      const xx = k % w, yy = (k / w) | 0, edge = (xx > 0 && bg[k - 1]) || (xx < w - 1 && bg[k + 1]) || (yy > 0 && bg[k - w]) || (yy < h - 1 && bg[k + w]);
      if (!edge) continue;   // franja: tira o branco misturado no contorno
      const i = k * 4, a = Math.min(1, (255 - Math.min(p[i], p[i + 1], p[i + 2])) / 160);
      if (a < 1) { for (let c2 = 0; c2 < 3; c2++) p[i + c2] = Math.max(0, Math.min(255, (p[i + c2] - 255 * (1 - a)) / Math.max(a, 0.05))); p[i + 3] = 255 * a; }
    }
    // apaga pedacos soltos pequenos (sobras da pose vizinha); o balao "!" e a engrenagem sao maiores e ficam
    const lab = new Int32Array(w * h).fill(-1);
    for (let k0 = 0; k0 < w * h; k0++) {
      if (lab[k0] >= 0 || p[k0 * 4 + 3] < 40) continue;
      const comp = [], q = [k0]; lab[k0] = k0;
      while (q.length) { const k = q.pop(); comp.push(k); const xx = k % w, yy = (k / w) | 0;
        for (const nk of [xx > 0 && k - 1, xx < w - 1 && k + 1, yy > 0 && k - w, yy < h - 1 && k + w]) if (nk !== false && lab[nk] < 0 && p[nk * 4 + 3] >= 40) { lab[nk] = k0; q.push(nk); } }
      if (comp.length < 700) for (const k of comp) p[k * 4 + 3] = 0;
    }
    g.putImageData(d, 0, 0);
    // medidas: pe (ultima linha opaca), centro das botas (15% de baixo), topo da crista (faixa central)
    const op = (xx, yy) => p[(yy * w + xx) * 4 + 3] > 128;
    let foot = 0; for (let yy = h - 1; yy >= 0 && !foot; yy--) for (let xx = 0; xx < w; xx++) if (op(xx, yy)) { foot = yy; break; }
    let sx = 0, n = 0; for (let yy = foot - Math.round(0.15 * BODY_H); yy <= foot; yy++) for (let xx = 0; xx < w; xx++) if (op(xx, yy)) { sx += xx; n++; }
    const cx = sx / n; let top = foot;
    for (let yy = 0; yy < foot && top === foot; yy++) for (let xx = Math.round(cx - 22); xx <= cx + 22; xx++) if (op(xx, yy)) { top = yy; break; }
    const s = BODY_H / (foot - top);
    const o = new OffscreenCanvas(SIZE, SIZE), og = o.getContext('2d'); og.imageSmoothingQuality = 'high';
    og.drawImage(c, SIZE / 2 - cx * s, FOOT_Y - foot * s, w * s, h * s);
    const blob = await o.convertToBlob({ type: 'image/png' }), buf = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { b64: btoa(bin), scale: s.toFixed(2) };
  }, src, x, y, w, h, SIZE, FOOT_Y, BODY_H);
  fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(png.b64, 'base64'));
  console.log(`${name}.png  escala ${png.scale}`);
}
await browser.close();

// folha de conferencia sobre fundo escuro (mostra franja branca, se sobrar)
const FF = [path.join(ROOT, 'tools/ffmpeg/ffmpeg.exe')].find(fs.existsSync) ?? 'ffmpeg';
const ins = POSES.flatMap(([n]) => ['-i', path.join(out, n + '.png')]);
const chain = POSES.map((_, i) => `[${i}:v]`).join('') + `hstack=inputs=${POSES.length}[s];color=c=0x1b2a55:s=${SIZE * POSES.length}x${SIZE}[bg];[bg][s]overlay,scale=1800:-1`;
fs.mkdirSync(path.join(ROOT, 'saida/giro-v1-2d'), { recursive: true });
const r = spawnSync(FF, ['-y', '-v', 'error', ...ins, '-filter_complex', chain, '-frames:v', '1', path.join(ROOT, 'saida/giro-v1-2d/poses.png')], { stdio: 'inherit' });
console.log(r.status ? 'ERRO na folha de conferencia' : 'ok: personagens/giro-v1-2d/poses/*.png + saida/giro-v1-2d/poses.png');
