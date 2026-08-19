// ===== DADOS DOS ARTEFATOS =====

const artifacts = [
    {
        name: "Adagas de Dentes",
        image: "img/Item - Adagas de Stor.png",
        description: "Um par de adagas forjadas a partir de dentes de criaturas derrotadas pelo grupo.",
        details: [
            "Uma das adagas foi confeccionada por Fannar, com os dentes do urso que causou o ferimento no rosto de Stor",
            "A outra adaga foi confeccionada por Stor, apos matar a besta alada, um Wyrmling de gelo"
        ]
    },
    {
        name: "Albert (Colar do Escaravelho)",
        image: "img/Item - Albert.png",
        description: "Um colar com um escaravelho magico que guia seu portador ate o Hellvault mais proximo.",
        details: [
            "Ao fazer carinho, ele se desprende de seu encaixe e comeca a voar na direcao da entrada do Hellvault mais proximo",
            "Ele nao voa alem de 100 ft. do portador do colar",
            "Compreende comandos simples, mas nao responde"
        ]
    },
    {
        name: "Apito dos Caes Espectrais",
        image: null,
        description: "Um apito magico que invoca um cao de caca espectral ao ser assoprado.",
        details: [
            "Ao assoprar, um cao espectral se apresenta ao local",
            "Ele recebe comandos como um cao treinado — e necessario dar um nome ao cao antes de dar comandos",
            "Possiveis comandos: Proteger, Avisar, Dormir, Atacar e Fugir",
            "Um cao nao pode receber mais que 2 comandos por uso do apito",
            "Marcius — Hellvault de Veyrinn"
        ]
    },
    {
        name: "Arco do Juramento da Vinganca",
        image: "img/Item - Juramento.png",
        description: "Arco lendario confeccionado por Fannar. Possui 6 marcas representando mortes importantes. Permite jurar inimigos de morte.",
        details: [
            "Confeccionado por Fannar",
            "Possui 6 marcas: Monar, Colt, Menina da Aguia, Flint, Xolo e Mellanie",
            "Acao Livre: pode jurar um inimigo de morte",
            "Vantagem contra o inimigo jurado, desvantagem contra o resto",
            "Dano 1d6 perfurante adicional contra o jurado",
            "Deve gritar: Morte rapida aos meus inimigos",
            "So pode ter um inimigo jurado por vez (ate morrer ou 7 dias)",
            "Quanto mais mata inimigos jurados, mais o arco fica forte",
            "Inimigos mortos: Kresh, Flint, Ozul"
        ]
    },
    {
        name: "Broche Rosado",
        image: null,
        description: "Uma lotus branca e dourada que permite localizar membros da Legiao.",
        details: [
            "Uma lotus branca e dourada, agora desabrochada",
            "Permite localizar pessoas da Legiao apos promocao para Soldados (Equipe do Stor)"
        ]
    },
    {
        name: "O Flagelo",
        image: null,
        description: "A espada lendaria de Borys, o Dragao de Ebe. Permanece enterrada com Rkard.",
        details: [
            "Espada de Rkard (cravada nele por Borys)",
            "Esta enterrada com ele no Tumulo de Rkard"
        ]
    }
];

// ===== DADOS DOS LIVROS & RELATOS =====

const books = [
    {
        name: "Carta de Dekkar",
        image: null,
        description: "Uma carta emocionante de Dekkar para seu irmao, revelando segredos sobre os locais sagrados e a destruicao de Borys.",
        details: [
            "Dekkar construiu os cinco locais sagrados e suas passagens",
            "Somente Keltis (Oronis) conhece suas localizacoes exatas",
            "Junto da carta, enviou cadernos, diarios e manuscritos dos Reis-Feiticeiros",
            "Devem ser separados e guardados nos locais sagrados",
            "Em alguns seculos, aqueles capazes de compreender a dor do mundo haverao de utiliza-los",
            "Quando a hora correta chegar, Borys enfim podera ser destruido"
        ]
    },
    {
        name: "Escrita Antiga",
        image: null,
        description: "Paginas de um livro em escrita antiga dos dragoes. Apenas Stor e Fannar possuem conhecimento para le-las.",
        details: [
            "Existem 2 estruturas para o vocabulario: simbolos que se conectam e simbolos separados que formam estrutura gramatical",
            "Como se fosse letra de mao e letra de forma",
            "Esta na lingua antiga dos dragoes",
            "Apenas Stor e Fannar possuem o conhecimento para ler"
        ]
    },
    {
        name: "Livro de Urik",
        image: null,
        description: "Relato de Hamanu de Urik, o Leao do Norte, sobre sua tarefa como Campeao e sua decisao de enfrentar Abalach-Re.",
        details: [
            "Hamanu completou sua tarefa de Campeao mas questiona a moralidade",
            "Encontrou-se com Lalali-Puy que sente a mesma dor",
            "Percebeu que a corrupcao nao e o caminho",
            "Pretende convencer Kalid-nay antes que ela transforme as montanhas do norte em deserto",
            "Abalach-Re jurou todos de morte",
            "Hamanu decidiu enfrenta-la em combate direto em sua ultima jornada como Campeao"
        ]
    },
    {
        name: "Livro dos Reis de Ered Luin",
        image: null,
        description: "O livro sagrado dos Anoes, contendo a historia de Ered Luin, a queda de Rkard e o legado do povo anao.",
        details: [
            "Registra a historia do povo anao e sua queda",
            "Borys se proclamou Rei das Terras de Ferro mas os anoes so aceitavam Rkard",
            "Borys conseguiu ferir mortalmente Rkard, que se sacrificou junto ao Guardiao",
            "A espada O Flagelo permanece presa ao corpo de Rkard",
            "Tuk Tuk escondeu a chave do Tumulo de Rkard no coracao da floresta",
            "Ninguem com maldade no coracao conseguira encontra-la"
        ]
    },
    {
        name: "Livro sem Titulo",
        image: null,
        description: "Relato final de Wyan, Rei Feiticeiro de Sedraxis, sobre a Ascensao Draconica e a loucura que ela traz.",
        details: [
            "Descreve o ritual da Ascensao Draconica ensinado por Borys",
            "O rito e feito durante o Sol Negro — necessita milhares de almas inocentes",
            "Sangue ancestral, poder arcano, corrupcao e componentes alquimicos",
            "Wyan conversou com Tectuktitlay que ja enlouqueceu",
            "Cada Homem da Peste morto trazia pesadelos mais vividos",
            "Ultimas palavras: 'Nao deixem mais nenhum draconato realizar os sacrificios'",
            "A unica certeza que Borys deu foi a loucura"
        ]
    },
    {
        name: "Relato de Lalali-Puy",
        image: null,
        description: "Ultimo relato de Lalali-Puy, o Flagelo dos Elfos, antes de renunciar ao titulo de Campea e adotar o nome 'a Chuva Eterna'.",
        details: [
            "Narra a destruicao de uma floresta elfica sob suas ordens",
            "As arvores nao gritavam — apenas suportavam",
            "Percebeu que a natureza nao destroi alem do necessario para continuar vivendo",
            "Sentiu vergonha ao ver um elfo morrer tentando proteger o solo",
            "Comecou a acreditar na preservacao como escolha nobre",
            "Renunciou ao titulo de Campea de Borys",
            "Adotou o nome: Lalali-Puy, a Chuva Eterna"
        ]
    }
];
