import { ComicScript } from './types.ts';

export const initialScript: ComicScript = {
  id: "gotham-chovendo-99",
  title: "A Sombra sob a Chuva de Gotham",
  author: "Roteirista Sênior",
  treatment: "1º Tratamento",
  description: "Um exemplo completo demonstrando a estrutura de HQs em três colunas simultâneas.",
  createdAt: "2026-05-31T15:46:17Z",
  updatedAt: "2026-05-31T15:46:17Z",
  pages: [
    {
      id: "page-1",
      number: 1,
      panels: [
        {
          id: "panel-1-1",
          number: 1,
          action: "Plano aberto vertical. Um arranha-céu gótico clássico se projeta contra as nuvens densas de tempestade. Raios cortam o céu ao fundo, revelando a silhueta clássica do herói pousado sobre a gárgula de pedra ornada.",
          dialogues: "BATMAN\n(sussurrando)\n Gotham pensa que me consome...\n\nBATMAN\n(pausa)\nMas eles esquecem quem cavou estes alicerces.",
          captions: "LEGENDA:\nGotham City. Meia-noite.\n\nEFEITO SONORO:\nKRA-KAAAK! (Raio distante)"
        },
        {
          id: "panel-1-2",
          number: 2,
          action: "Plano médio fechado. Detalhe nas luvas pretas de Batman agarrando a garra do monstro de pedra. Pequenas rachaduras surgem no concreto devido à erosão e à força aplicada pelo herói.",
          dialogues: "BATMAN\n(em pensamento)\nAlgo está diferente hoje à noite. O cheiro de ozônio e pólvora no ar.",
          captions: "EFEITO SONORO:\nCrrrk... Crrrk... (Pedra se deteriorando)"
        },
        {
          id: "panel-1-3",
          number: 3,
          action: "Plano contra-plongée (visto de baixo). Batman se lança no vazio. Sua capa negra se expande como as asas gigantescas de um morcego pré-histórico, cobrindo as luzes de neon embaçadas da avenida principal.",
          dialogues: "",
          captions: "EFEITO SONORO:\nFLAP-FLAP-FLAP-VUUUUSH! (O som rítmico do tecido cortando o ar tempestuoso)"
        }
      ]
    },
    {
      id: "page-2",
      number: 2,
      panels: [
        {
          id: "panel-2-1",
          number: 1,
          action: "Plano detalhe subterrâneo. A água escorre pelas grades pluviais do bueiro escorregadio. Um cabo de aço com gancho de fibra de carbono se prende firmemente ao cano principal.",
          dialogues: "ALFRED\n(comunicador estático)\nSenhor, os sensores térmicos detectaram movimentos na ala oeste dos esgotos secundários.",
          captions: "LEGENDA:\nTrês minutos depois...\n\nEFEITO SONORO:\nCLANG! (Gancho magnético se fixando com força)"
        },
        {
          id: "panel-2-2",
          number: 2,
          action: "Plano médio. Batman aterrissa com perfeição tática sobre a passarela escura e úmida. O reflexo dos seus olhos brancos brilha intensamente na viseira térmica.",
          dialogues: "BATMAN\nEntrando no perímetro, Alfred. Mantenha os canais táticos livres.\n\nALFRED\n(comunicador)\nEntendido, patrão Bruce. Fique atento ao medidor de densidade de gás.",
          captions: "EFEITO SONORO:\nPLOP... PLOP... (Gotejar constante do esgoto ecoando na imensidão subterrânea)"
        }
      ]
    }
  ]
};
