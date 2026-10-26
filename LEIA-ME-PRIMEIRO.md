# Giro — passagem de bastão para a outra máquina

Para o Claude desta sessão: leia este arquivo inteiro antes de agir. Quem fala é o Isaack
(time do Comercial 360). Fale português do Brasil.

## Situação

Estávamos construindo, em outra máquina (fraca), um vídeo de abertura do mascote **Giro**
(robô azul do produto Comercial 360), estilo "entrada de craque em estádio", 16:9, 25 s.
A máquina antiga não aguenta o render, então o trabalho continua aqui. Esta pasta é o que
já foi feito e pode ser aproveitado.

## O que já existe (tudo por código, determinístico)

- `ROTEIRO.md`: cenas, tempos, falas do locutor e carta do jogador.
- `scene.html`: modelo 3D procedural do Giro (three.js), estádio, linha do tempo, título e carta.
- `render.mjs`: renderiza quadro a quadro no Edge/Chrome headless e monta com ffmpeg.
  Modos: `preview | final | stills [t...] | modelo`.
- `mix.mjs`: mixa as falas com efeitos gerados por código, calcula o envelope da boca e junta o áudio.
- `tts.ps1`: vozes provisórias (Windows, voz Maria pt-BR). `check.mjs`: verificação mínima.
- `ref/folha.png`: folha de modelo do Giro (6 ângulos, 4 emoções, ícone). É a referência visual.
- `out/`: resultados da máquina antiga (preview, contact.png, comparacao.png, stills).
  Os MP4 finais não vieram no zip; é só renderizar de novo.
- `audio/provisorio/`: 4 falas provisórias, só para medir tempo.

## Como retomar aqui

1. Pré-requisitos: Node 24, Edge ou Chrome, ffmpeg.
2. ffmpeg: os scripts procuram `tools/ffmpeg/ffmpeg.exe` e `tools/ffmpeg/ffprobe.exe`.
   Baixe uma build estática oficial e coloque nesses caminhos, ou ajuste a constante
   `FF` em `render.mjs` e `mix.mjs` e o caminho em `check.mjs` para o ffmpeg do PATH.
3. `npm install` (three 0.170.0 e puppeteer-core 24.15.0; nenhum navegador é baixado).
   Se houver proxy com certificado próprio: `$env:NODE_OPTIONS='--use-system-ca'`.
4. `node render.mjs preview` e abra `out/preview.mp4` para ver se tudo funciona.
   Com GPU boa o render deve ser rápido. Se a GPU falhar: `$env:SW=1`.
5. Veja o `README.md` para o passo a passo completo.

## Pendências (em ordem)

1. **Voz real:** gerada com o VoiceStudio (debpalash/VoiceStudio) nesta máquina.
   Arquivos `locutor_01.wav` a `locutor_04.wav` em `audio/`. Falas:
   1. "Senhoras e senhores... o craque do seu comercial!"
   2. "Direto do Comercial 360... GIRO!"
   3. "Velocidade de proposta: noventa e nove. Precisão de funil: noventa e oito."
   4. "Fechamento: cem. E ele não sai do seu time."
   Estilo: locutor de estádio, grave e enérgico, pt-BR; a fala 2 é o clímax.
   Depois: `node mix.mjs 6.8 9.6 13.0 18.65` (ajuste os tempos à duração real), `node render.mjs final`
   e `node mix.mjs` de novo.
2. **Refinar o modelo do Giro** (ver `out/comparacao.png`, folha em cima e 3D embaixo):
   tronco um pouco largo, pernas curtas e finas, aba do topo simples demais (falta a ponta
   recortada), mãos simples (a folha tem luvas), ícone do peito aproximado.
3. **Título GIRO** encosta no topo da cabeça em 16:9; conferir.
4. **Carta do jogador:** num quadro "Fechamento" aparecia 34; confirmar que chega a 100.
5. **Áudio não foi ouvido por ninguém** (só medido): ouvir a mixagem e ajustar volumes.
6. Depois: a **Etapa B** — reaproveitar o modelo 3D para poses e animações com fundo
   transparente (acenando, pensando, erro, comemorando) para uso diário no app, e uma
   skill global reutilizável em `~/.claude/skills/` com este método.

## Regras

- Ponytail: stdlib e recursos nativos primeiro, zero dependência nova sem justificar, YAGNI.
- A cena é função do tempo; sem `Date.now` nem `Math.random` no render.
- Clonar apenas a voz do Isaack ou de quem autorizar; nunca ator, famoso ou personagem.
- Licença dos modelos de voz do VoiceStudio não foi conferida (app é AGPL-3.0, modelos têm
  licença própria, possível uso não comercial). Verifique antes de usar em produção.
- Não use o personagem Clawd (é da Anthropic).
- Instalar algo grande, publicar na internet ou gastar dinheiro: pergunte antes.
