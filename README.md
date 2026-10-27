# Giro — mascote animado por código

Mascote do **Comercial 360**, um CRM para administradoras de condomínio e empresas de facilities.
Projeto pessoal de **Isaack Nyllo**.

O Giro é um robô azul com uma tela no lugar do rosto, prédios no peito e um anel orbital em volta do corpo.
Tudo é feito **por código**, sem estúdio de animação: o vídeo 3D é desenhado quadro a quadro no navegador,
o som é sintetizado na mixagem e o 2D é animado por cima de poses ilustradas.

| | |
|---|---|
| **Vídeo 3D** (32 s) | O Giro sobe do túnel em silhueta, é anunciado pelo locutor, corre com a bola, congela com uma carta de jogador e se apresenta |
| **Giro 2D no CRM** | Comportamentos dentro do sistema: boas-vindas, processando, lembretes, erro, meta batida e ócio |
| **Apresentação narrada** | A proposta do mascote em 6 capítulos, com a narração sincronizada frase a frase |

## Versões do personagem

| Pasta | O que é |
|---|---|
| `personagens/giro-v1-3d/` | Primeira versão em 3D (mãos escuras, botas) |
| `personagens/giro-v1-2d/` | Primeira versão em 2D: poses e ócio ansioso com o anel girando |
| `personagens/giro-v2-3d/` | **Versão atual** em 3D: luva branca de desenho, tênis, braços e pernas finos |
| `personagens/giro-v2-2d/` | Versão atual em 2D |

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
referencias/                folhas dos personagens e poses originais
saida/                      tudo o que é gerado (fora do git)
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

# 2D: recortar as poses de um personagem a partir das folhas de referência
node ferramentas/recortar-poses.mjs giro-v2-2d
```

As páginas (`aplicacoes/pagina-crm/index.html` e `personagens/giro-v1-2d/acoes/ocioso-ansioso.html`) abrem direto no navegador.

O logo do produto não faz parte deste repositório. Sem ele, o vídeo e a página do CRM rodam normalmente, só sem o logo.

## Como foi feito

- **3D:** modelo procedural em three.js, com contorno de desenho animado (casca invertida). A cena é uma função do tempo
  (`renderAt(t)`), renderizada quadro a quadro no Edge headless e montada com ffmpeg. Nada é sorteado na hora:
  o mesmo segundo gera sempre o mesmo quadro.
- **Versões lado a lado:** cada versão do personagem tem o próprio modelo, com as mesmas articulações.
  A mesma linha do tempo anima a v1 e a v2.
- **Roteiro amarrado nas falas:** a mixagem mede cada fala e calcula os momentos-chave (revelação, corrida, congelamento).
  Trocou uma fala, o vídeo acompanha.
- **Som:** batida, impacto, torcida e efeitos sintetizados na mixagem, sem arquivo de terceiros.
- **2D:** um script recorta as poses das folhas de referência, tira o fundo e alinha tudo; olhos, boca e anel são
  desenhados por cima, para poderem se mexer.

## Direitos

© Isaack Nyllo. Todos os direitos reservados. O código pode ser lido e estudado; o personagem Giro, as imagens,
as falas e os vídeos não podem ser reutilizados sem autorização.
