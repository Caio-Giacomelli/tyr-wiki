// ===== MARCOS HISTÓRICOS =====

const landmarks = [
    {
        name: "Ascensão Dracônica",
        description: "O ritual que Ozul tentou realizar em Myrrendale, descrito no Livro sem Título.",
        details: [
            "Rito realizado durante o Sol Negro",
            "Necessárias milhares de almas de inocentes",
            "Sangue de nossos ancestrais e que o receptáculo tenha certeza da maldade que carrega em seu coração",
            "Além de poder arcano, corrupção e componentes alquímicos",
            "Mencionada no Livro sem Título"
        ]
    },
    {
        name: "Convenção das Serpentes de Fogo",
        description: "Uma organização cujo objetivo é trazer Borys de volta para este plano.",
        details: [
            "Objetivo: trazer Borys de volta para este plano",
            "Urulok é uma Serpente de Fogo (?)",
            "Urulok significa Serpente de Fogo",
            "Oronis pretende impedi-los"
        ]
    }
];

// ===== PERSONAGENS HISTÓRICOS =====

const historicalNPCs = [
    {
        name: "Guardião (Dekkar Iluvathar)",
        title: "Fundador da Legião",
        image: null,
        description: "O herói que derrotou o último dragão tirano e libertou a Morte. Cada cidade possui uma estátua dele com uma espada em uma mão e fogo na outra.",
        details: [
            "Cada cidade possui uma estátua um pouco diferente, mas sempre com espada e fogo",
            "Nome verdadeiro: Dekkar Iluvathar",
            "Libertou a Morte",
            "Fundou a Legião da Estrela da Manhã",
            "Derrotou o último dragão tirano (Borys), criando os 5 Hellvaults junto com Rkard"
        ]
    },
    {
        name: "Hamanu",
        title: "O Leão do Norte — Campeão de Borys",
        image: null,
        description: "Campeão de Borys que escreveu o Livro de Urik. Concluiu sua tarefa mas questionou a moralidade. Enfrentou Abalach-Re em sua última jornada.",
        details: [
            "Escreveu o Livro de Urik",
            "Concluiu sua tarefa como Campeão de Borys",
            "Guardou um ovo de um ninho de uma grande coruja",
            "Decidiu enfrentar Abalach-Re em combate direto em sua última jornada"
        ]
    },
    {
        name: "Kalid-nay",
        title: "Campeã de Borys",
        image: null,
        description: "Mencionada no Livro de Urik. Hamanu tentou convencê-la de que a corrupção não era o caminho.",
        details: [
            "Mencionada no Livro de Urik",
            "Hamanu tentou convencê-la antes que ela transformasse as montanhas do norte em desertos"
        ]
    },
    {
        name: "Lalali-Puy",
        title: "A Chuva Eterna — Ex-Campeã de Borys",
        image: null,
        description: "Também conhecida como Flagelo dos Elfos. Criou a cidade de Thalas'dar. Renunciou ao cargo de Campeã após perceber a crueldade de seus atos.",
        details: [
            "Criou a cidade de Thalas'dar sem o consentimento de Borys",
            "Epaminondas é seu filho",
            "Após dizimar povos, renunciou o cargo de Campeã de Borys",
            "Também conhecida como Flagelo dos Elfos",
            "Adotou o nome: a Chuva Eterna"
        ]
    },
    {
        name: "Lucy",
        title: "Olhos de Mármore",
        image: null,
        description: "Mencionada na Carta de Dekkar. Possui olhos de mármore com astúcia bondosa.",
        details: [
            "Mencionada na Carta de Dekkar como guardiã do irmão de Dekkar",
            "Detesta ser chamada de Lucy",
            "Possui olhos de mármore — há astúcia neles, bondosa mas perigosa para os desatentos"
        ]
    },
    {
        name: "Morte",
        title: "A Entidade de Morte",
        image: "img/NPC - Morte.png",
        description: "A entidade de Morte. Os Dragões existiam antes dela. Possui pouca empatia entre os vivos, mas quer honrar àquele que a ajudou.",
        details: [
            "Os Dragões existiam antes desta Morte existir",
            "Possui pouca empatia e vontade entre os vivos",
            "Quer honrar àquele que a ajudou um dia (o Guardião)",
            "Foi libertada pelo Guardião (Dekkar)",
            "Ofereceu um pacto ao grupo: espalhar sua missão de interromper o plano dos dragões",
            "Pediu que Stor enviasse um abraço para o irmão daquele que a libertou"
        ]
    },
    {
        name: "Rkard",
        title: "Último Rei de Erëd Luin",
        image: null,
        description: "Último Rei dos Anões. Foi misericordioso com Borys após sua primeira invasão falha. Se sacrificou junto ao Guardião para conter Borys.",
        details: [
            "Último Rei de Erëd Luin",
            "Foi misericordioso com Borys após ele ter falhado sua primeira invasão",
            "Em uma segunda batalha, ele e o Guardião se aprisionaram para conter Borys",
            "Está preso no Hellvault — Epaminondas o descobriu",
            "Possui medo de ser libertado, pois isso significaria que o que está preso lá também seria libertado"
        ]
    },
    {
        name: "Tuk Tuk",
        title: "Braço Direito de Rkard",
        image: null,
        description: "Assistente pessoal de Rkard. Escondeu a chave do Túmulo de Rkard no Coração da Floresta.",
        details: [
            "Braço direito e assistente pessoal de Rkard",
            "Escondeu a chave no Coração da Floresta",
            "Resgatamos a chave de Tuk Tuk na Sessão 6, que abre o túmulo de Rkard"
        ]
    }
];

// ===== ALIADOS =====

const allies = [
    {
        name: "Colt",
        title: "Cavaleiro Humano (Morto)",
        image: "img/NPC - Colt.png",
        description: "Amigo que o grupo encontrou em sua jornada. Morreu para um urso modificado contratado por Ozul.",
        details: [
            "Morreu para um urso modificado — contratados por Ozul para matá-lo",
            "Encontramos uma carta em seus pertences assinada pela família Maralen",
            "Poderia ter feito parte dos comércios da família Maralen, mas escolheu outra vida"
        ]
    },
    {
        name: "Epaminondas",
        title: "Esquilo Misterioso — Filho de Lalali-Puy",
        image: "img/NPC - Epaminondas.png",
        description: "Esquilo de imaginação de Elandor que se revelou real. Filho perdido de Lalali-Puy. Auxiliou o grupo em momentos críticos.",
        details: [
            "Esquilo de imaginação de Elandor",
            "Stor conseguiu se comunicar com ele através de Telepatia",
            "Se materializou na Floresta de Elencor",
            "Auxiliou a encontrar Galaeth e o Coração da Floresta",
            "Filho perdido de Lalali-Puy",
            "Auxiliou na batalha do Cerco de Myrrendale — trouxe 2 adagas",
            "Procurou por anos Rkard em um ambiente de Sol Negro com planícies vermelhas"
        ]
    },
    {
        name: "Galaeth",
        title: "A Última das Grandes Bestas",
        image: "img/NPC - Galaeth.png",
        description: "Uma coruja colossal, a última de sua raça. Possui ódio por Hamanu de Urik que genocidou sua espécie.",
        details: [
            "A última das Grandes Bestas",
            "Possui ódio por Hamanu de Urik, o Leão do Norte",
            "Pediu para nos vingarmos se encontrarmos algum descendente de Hamanu",
            "Ocorreu um grande genocídio que aniquilou sua raça",
            "Deu carona até a Cidade Perdida na Sessão 6",
            "Conversava com Fannar sobre Stor durante visões do Hellvault"
        ]
    },
    {
        name: "Hector",
        title: "Companheiro de Gadwick",
        image: null,
        description: "Companheiro de Gadwick e Casper. Morto em batalha contra o Urso Escamado.",
        details: [
            "Companheiro de Gadwick e Casper",
            "Morto em batalha contra o Urso Escamado"
        ]
    },
    {
        name: "Lyari",
        title: "Feiticeira Escarlate",
        image: "img/NPC - Lyari.png",
        description: "Foi capturada quando ainda era amiga de Elandor para ser escrava. Agora encontrada junto com Salaak'nir.",
        details: [
            "Foi capturada quando ainda era amiga de Elandor para ser escrava",
            "Agora encontrada em conjunto com Salaak'nir",
            "Deu uma flauta quebrada a Elandor"
        ]
    },
    {
        name: "Monar (Pet)",
        title: "Filha de Stor",
        image: "img/NPC - Monar.png",
        description: "Filha de Stor, nasceu do Ovo Gigante que foi dado para ele por Epaminondas.",
        details: [
            "Nasceu do Ovo Gigante dado por Epaminondas a Stor"
        ]
    },
    {
        name: "Monar",
        title: "Primeira Marca do Arco",
        image: null,
        description: "Uma menina humana que apareceu no acampamento de Stor e Fannar quando Stor tinha 14 anos. Morreu envenenada por Escorpiões da Noite.",
        details: [
            "A primeira marcação do Arco do Juramento de Stor",
            "Apareceu perdida no acampamento de Stor e Fannar",
            "Stor ensinou muito do que Fannar havia lhe ensinado sobre sobrevivência",
            "Morreu envenenada por filhotes de Escorpião da Noite em uma caverna",
            "Stor não sabia como curar o veneno a tempo"
        ]
    },
    {
        name: "Nymira",
        title: "Criança Tiefling",
        image: null,
        description: "Criança Tiefling magicamente poderosa que acompanha Durgan.",
        details: [
            "Acompanha Durgan",
            "Criança magicamente poderosa"
        ]
    }
];
