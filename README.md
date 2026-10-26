# Giro — mascote animado por código

Mascote do **Comercial 360**, um CRM para administradoras de condomínio e empresas de facilities.
Projeto pessoal de **Isaack Nyllo**, cedido ao produto, com uso em portfólio autorizado.

O Giro é um robô azul com uma tela no lugar do rosto, os prédios do produto no peito e um anel orbital,
como o do logo. Tudo foi feito **por código**, sem estúdio de animação: o vídeo 3D é desenhado quadro a quadro
no navegador, as vozes foram geradas por IA rodando no próprio computador e o 2D nasceu de poses geradas por IA,
recortadas e animadas por código.

| | |
|---|---|
| **Vídeo 3D** (32 s) | O Giro sobe do túnel em silhueta, é anunciado pelo locutor, corre com a bola, congela com uma carta de jogador e se apresenta |
| **Giro 2D no CRM** | Comportamentos dentro do sistema: boas-vindas, processando, lembretes, erro, meta batida e ócio |
| **Apresentação narrada** | A proposta do mascote em 6 capítulos, com narração sincronizada frase a frase |

## Versões do personagem

| Pasta | O que é |
|---|---|
| `personagens/giro-v1-3d/` | Primeira versão em 3D (mãos escuras, botas) |
| `personagens/giro-v1-2d/` | Primeira versão em 2D: poses, ócio ansioso com o anel girando |
| `personagens/giro-v2-3d/` | **Versão atual** em 3D: luva branca de desenho, tênis, braços e pernas finos |
| `personagens/giro-v2-2d/` | Versão atual em 2D (poses da folha nova) |

A v2 juntou o robô da v1 com a luva e o tênis de uma proposta alternativa (um mascote em forma de prédio).
As duas folhas estão em `referencias/folhas/`.

## Estrutura

```
personagens/<personagem>/   tudo de um personagem
  modelo/                   código do boneco 3D (three.js)
  imagens/                  folha de ângulos, sprite, comparação com a referência
  poses/  poses.json        poses 2D recortadas e a lista de onde recortar
  acoes/                    animações do personagem (ócios)
aplicacoes/                 o que usa os personagens
  video-apresentacao/       cena, render, mixagem, roteiro e falas do vídeo
  pagina-crm/               o Giro 2D numa tela de exemplo do CRM
  apresentacao-narrada/     a proposta do mascote, narrada
ferramentas/                recorte de poses (serve a qualquer personagem 2D)
referencias/                marca, folhas dos personagens e imagens geradas no Gemini
saida/                      tudo o que é gerado (não vai para o git)
```

## Como rodar

Requer Node 24, Edge ou Chrome e ffmpeg no PATH.

```bash
npm install                                            # three e puppeteer-core; nenhum navegador é baixado

# vídeo (GIRO=v1 ou v2; padrão v2) -> saida/video-apresentacao/<versão>/
node aplicacoes/video-apresentacao/mix.mjs             # mede as falas, monta o roteiro e o áudio
node aplicacoes/video-apresentacao/render.mjs preview  # 854x480
node aplicacoes/video-apresentacao/render.mjs final    # 1920x1080, 30 fps
node aplicacoes/video-apresentacao/mix.mjs             # junta o áudio no vídeo de cada versão
node aplicacoes/video-apresentacao/check.mjs           # confere resolução, duração e áudio

# modelo 3D: folha de 6 ângulos, comparação com a referência e sprite transparente
GIRO=v2 node aplicacoes/video-apresentacao/render.mjs modelo
GIRO=v2 node aplicacoes/video-apresentacao/render.mjs sprite

# 2D: recortar as poses de um personagem a partir das imagens de referência
node ferramentas/recortar-poses.mjs giro-v2-2d
```

As páginas (`aplicacoes/pagina-crm/index.html` e `personagens/giro-v1-2d/acoes/ocioso-ansioso.html`) abrem direto no navegador.

## Como foi feito

- **3D:** modelo procedural em three.js, com contorno de desenho animado (casca invertida). A cena é uma função do tempo
  (`renderAt(t)`), renderizada quadro a quadro no Edge headless e montada com ffmpeg. Sem `Math.random`: o mesmo
  segundo gera sempre o mesmo quadro.
- **Roteiro amarrado nas falas:** a mixagem mede cada fala e calcula os momentos-chave (revelação, corrida, congelamento).
  Trocou uma voz, o vídeo acompanha.
- **Som:** batida, impacto, torcida e efeitos gerados por código, sem arquivo de terceiros.
- **Vozes:** VoiceStudio local (modelo VoxCPM2): voz desenhada por descrição; as falas seguintes clonam a primeira
  para manter o mesmo timbre.
- **2D:** poses geradas no Gemini a partir de uma folha de referência; um script tira o fundo e alinha tudo;
  olhos, boca e anel são desenhados por cima para poderem se mexer.

## Créditos e licenças

- Personagem, código e vídeos: Isaack Nyllo, com imagens geradas no Gemini.
- Marca Comercial 360 em `referencias/marca/`: do produto, usada com autorização.
- Vozes: geradas com VoxCPM2 (Apache-2.0) no VoiceStudio. A liberação de uso comercial das vozes ainda não foi confirmada.
- Bibliotecas: three.js (MIT), puppeteer-core (Apache-2.0).
