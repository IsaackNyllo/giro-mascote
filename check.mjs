// Verificacao minima: renderiza 3 quadros-chave e confere duracao/resolucao do video final.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const p = (...a) => path.join(ROOT, ...a);
execFileSync(process.execPath, [p('render.mjs'), 'stills', '2', '10', '16'], { stdio: 'inherit' });
for (const f of ['s00.png', 's01.png', 's02.png']) assert.ok(fs.statSync(p('out/stills', f)).size > 100_000, `${f} vazio/pequeno demais`);

const probe = (f, sel) => execFileSync([p('tools/ffmpeg/ffprobe.exe')].find(fs.existsSync) ?? 'ffprobe', ['-v', 'error', ...sel, '-of', 'csv=p=0', p('out', f)]).toString().trim();
const [w, h] = probe('giro.mp4', ['-select_streams', 'v:0', '-show_entries', 'stream=width,height']).split(',').map(Number);
const dur = Number(probe('giro.mp4', ['-show_entries', 'format=duration']));
assert.deepEqual([w, h], [1920, 1080], 'resolucao');
assert.ok(Math.abs(dur - 32) < 0.1, `duracao ${dur}`);
if (fs.existsSync(p('out/giro_com_audio.mp4'))) assert.equal(probe('giro_com_audio.mp4', ['-select_streams', 'a', '-show_entries', 'stream=codec_type']), 'audio');
console.log(`OK: 3 quadros-chave, giro.mp4 ${w}x${h} ${dur}s`);
