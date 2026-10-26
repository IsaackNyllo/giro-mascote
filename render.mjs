// Renderiza scene.html quadro a quadro no Edge/Chrome headless e monta com ffmpeg.
//   node render.mjs preview            -> out/preview.mp4   (854x480, 24 fps)
//   node render.mjs final              -> out/giro.mp4      (1920x1080, 30 fps)
//   node render.mjs stills [t ...]     -> out/stills/*.png + out/contact.png
//   node render.mjs modelo             -> out/modelo.png (6 angulos) + out/comparacao.png (folha x 3D)
//   node render.mjs sprite             -> out/giro_acenando.png (fundo transparente)
// SW=1 forca render por software (SwiftShader). BROWSER=<exe> escolhe o navegador.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const FF = [path.join(ROOT, 'tools/ffmpeg/ffmpeg.exe')].find(fs.existsSync) ?? 'ffmpeg'; // senao, o do PATH
const DUR = 32;
const BROWSERS = [process.env.BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
const SW_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

const [mode = 'preview', ...rest] = process.argv.slice(2);
const out = (...p) => path.join(ROOT, 'out', ...p);
fs.mkdirSync(out('stills'), { recursive: true });

// servidor estatico minimo (modulos ES nao carregam via file://)
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}/scene.html`;

async function open(w, h, query = '') {
  const exe = BROWSERS.find(p => fs.existsSync(p));
  if (!exe) throw new Error('Edge/Chrome nao encontrado; defina BROWSER=<caminho do exe>');
  for (const sw of process.env.SW ? [true] : [false, true]) {
    const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--hide-scrollbars', '--mute-audio', ...(sw ? SW_ARGS : ['--enable-gpu', '--ignore-gpu-blocklist'])] });
    try {
      const page = await browser.newPage();
      page.on('pageerror', e => console.error('pagina:', e.message));
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await page.goto(base + query, { waitUntil: 'load' });
      await page.waitForFunction('window.ready', { timeout: 30000 });
      const info = await page.evaluate('window.ready');
      console.log(`navegador: ${path.basename(exe)} | WebGL: ${info.gpu} | envelope de audio: ${info.envelope ? 'out/envelope.json' : 'sintetico'}`);
      return { browser, page };
    } catch (e) {
      await browser.close();
      if (sw) throw e;
      console.warn('GPU falhou, tentando SwiftShader:', e.message);
    }
  }
}

const shot = (page, type = 'jpeg') => page.screenshot(type === 'jpeg' ? { type, quality: 95, optimizeForSpeed: true } : { type });
const ff = (args) => { const r = spawnSync(FF, ['-y', '-v', 'error', ...args], { stdio: 'inherit' }); if (r.status) throw new Error('ffmpeg falhou'); };

if (mode === 'preview' || mode === 'final') {
  const [w, h, fps, file] = mode === 'final' ? [1920, 1080, 30, 'giro.mp4'] : [854, 480, 24, 'preview.mp4'];
  const { browser, page } = await open(w, h);
  const enc = spawn(FF, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', fps, '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', mode === 'final' ? 'slow' : 'veryfast', '-crf', mode === 'final' ? 16 : 22, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out(file)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise(r => enc.on('close', r));
  const N = DUR * fps, t0 = performance.now();
  for (let f = 0; f < N; f++) {
    await page.evaluate(t => window.renderAt(t), f / fps);
    if (!enc.stdin.write(await shot(page))) await new Promise(r => enc.stdin.once('drain', r));
    if (f % fps === 0) process.stdout.write(`\r${mode}: ${f}/${N} quadros (${((performance.now() - t0) / 1000).toFixed(0)} s)`);
  }
  enc.stdin.end(); const code = await done; await browser.close();
  console.log(`\n${code ? 'ERRO no ffmpeg' : 'ok'}: out/${file}`);
} else if (mode === 'stills') {
  const times = rest.length ? rest.map(Number) : [1.5, 3.8, 5.6, 7.4, 10.3, 12.9, 16.8, 19.0, 22.5];
  const { browser, page } = await open(1920, 1080);
  fs.readdirSync(out('stills')).forEach(f => fs.unlinkSync(out('stills', f)));
  for (const [i, t] of times.entries()) {
    await page.evaluate(t => window.renderAt(t), t);
    fs.writeFileSync(out('stills', `s${String(i).padStart(2, '0')}.png`), await shot(page, 'png'));
  }
  await browser.close();
  const cols = Math.ceil(Math.sqrt(times.length)), rows = Math.ceil(times.length / cols);
  ff(['-i', out('stills', 's%02d.png'), '-vf', `scale=640:-1,tile=${cols}x${rows}:padding=4`, '-frames:v', 1, '-update', 1, out('contact.png')]);
  console.log(`tempos: ${times.join(', ')} s\nok: ${times.length} PNGs em out/stills + out/contact.png`);
} else if (mode === 'modelo') {
  // mesma ordem da folha: Frente, 3/4 Esq, Perfil Esq, Costas, Perfil Dir, 3/4 Dir
  const { browser, page } = await open(600, 800, '?modelo');
  const views = [0, -40, -90, 180, 90, 40];
  for (const [i, y] of views.entries()) {
    await page.evaluate(y => window.renderModel(y), y);
    fs.writeFileSync(out(`m${i}.png`), await shot(page, 'png'));
  }
  await page.evaluate(() => window.renderModel(0, 1));
  fs.writeFileSync(out('m_acenando.png'), await shot(page, 'png'));
  await browser.close();
  const ins = views.flatMap((_, i) => ['-i', out(`m${i}.png`)]);
  ff([...ins, '-filter_complex', `${views.map((_, i) => `[${i}:v]`).join('')}hstack=inputs=${views.length},scale=1024:-1`, '-frames:v', 1, '-update', 1, out('modelo.png')]);
  ff(['-i', path.join(ROOT, 'ref/folha.png'), '-i', out('modelo.png'), '-filter_complex', '[0:v]crop=1024:330:0:40[a];[a][1:v]vstack', '-frames:v', 1, '-update', 1, out('comparacao.png')]);
  views.forEach((_, i) => fs.unlinkSync(out(`m${i}.png`)));
  console.log('ok: out/modelo.png, out/m_acenando.png, out/comparacao.png');
} else if (mode === 'sprite') {
  const { browser, page } = await open(1200, 1600, '?modelo');
  const clip = await page.evaluate(() => window.renderSprite());
  fs.writeFileSync(out('giro_acenando.png'), await page.screenshot({ type: 'png', omitBackground: true, clip }));
  await browser.close();
  console.log(`ok: out/giro_acenando.png (${clip.width}x${clip.height}, fundo transparente)`);
} else console.log('modos: preview | final | stills [t...] | modelo | sprite');
server.close();
