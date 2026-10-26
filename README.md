# Giro — vídeo de apresentação (32 s, 16:9) e mascote 2D. Roteiro: ROTEIRO.md. Documentação: ver CLAUDE.md.
Requer Node 24, Edge ou Chrome e ffmpeg (usa `tools/ffmpeg/` se existir; senão o do PATH).

## Vídeo 3D
1. Instalar (uma vez): `npm install` (three e puppeteer-core; nenhum navegador é baixado). Rede com proxy: `$env:NODE_OPTIONS='--use-system-ca'` antes.
2. Vozes em `audio/`: `locutor_01..04.wav` e `giro_01.wav` (sem elas, usa `audio/provisorio/`).
3. `node mix.mjs`: mede as falas, calcula o roteiro (tempos e momentos-chave) e gera `out/mix.wav` e `out/envelope.json`. Tempos manuais: `node mix.mjs t1 t2 t3 t4 t5`.
4. Quadros-chave: `node render.mjs stills [t...]` (out/stills e out/contact.png). Modelo: `node render.mjs modelo`. Sprite transparente: `node render.mjs sprite`.
5. Preview: `node render.mjs preview` (854x480, 24 fps) e `node mix.mjs` → `out/preview_com_audio.mp4` (áudio MP3, toca no VS Code).
6. Final: `node render.mjs final` (1920x1080, 30 fps) e `node mix.mjs` → `out/giro_com_audio.mp4` (áudio AAC).
7. Conferência: `node check.mjs` (3 quadros-chave, resolução, 32 s e trilha de áudio).
8. Render por software, se a GPU falhar: `$env:SW=1`. Outro navegador: `$env:BROWSER="<caminho do .exe>"`.

## Mascote 2D (`giro2d/`)
1. Poses do Gemini em `ref/poses/`; `node giro2d/recortar.mjs` gera `giro2d/poses/*.png` (640x640, transparente) e `out/2d/poses.png`.
2. Ócio ansioso: abrir `giro2d/ocioso.html` no navegador.
3. Página de apresentação: `giro2d/apresentacao.html` (publicada como artefato; usa `poses/` e `marca/logo_horizontal.png`).
