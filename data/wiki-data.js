// ===== DADOS DA WIKI - CAMPANHA RPG =====

// IDs dos grupos de cidades no SVG
const cityIds = [
    "Sedraxis",
    "Ered-Luin",
    "Arenvaalis",
    "Ilha_Arenvaalis",
    "Thalas_x27_Dar",
    "Ur-Draxa",
    "Veyrinn",
    "Myreendale",
    "Elencor_Forest",
    "Hamerhold",
    "Orvengrad"
];

// ===== DADOS DAS CIDADES =====
const cities = {
    "Sedraxis": {
        region: "Norte - Próximo às Iron Wastes",
        description: "Cidade do antigo Rei Feiticeiro Wyan, que enlouqueceu após aniquilar os Homens da Peste. Wyan sofria com pesadelos de uma consciência pesada e morreu pouco tempo depois. A cidade carrega as marcas sombrias de seu reinado.",
        population: "Desconhecida",
        government: "Rei Feiticeiro Wyan (morto)",
        features: [
            "Domínio do antigo Rei Feiticeiro Wyan",
            "Fronteira com as Iron Wastes",
            "Estátua do Guardião (espada e fogo)"
        ],
        notes: "Wyan foi um dos Campeões de Borys. Após dilacerar os Homens da Peste, sua mente adoeceu. Ele morreu, mas seu legado de loucura e destruição permanece na cidade."
    },
    "Ered-Luin": {
        displayName: "Erëd Luin",
        region: "Centro-Norte - Montanhas",
        description: "A cidade destruída dos Anões. Outrora um povo próspero que negociava com os Homens Baixos e vivia em paz com os Homens Altos. Hoje jaz em ruínas, com seu tesouro legado ameaçado.",
        population: "Ruínas (poucos habitantes)",
        government: "Não há governo atual (cidade destruída)",
        features: [
            "O Coração da Montanha (tesouro legado anão)",
            "Ponto de acesso ao Plano Elemental do Fogo",
            "Mencionada no Livro dos Reis de Erëd Luin",
            "Estátua do Guardião (espada e fogo)"
        ],
        notes: "Dregoth, o Rei Morto, está tentando roubar o Coração da Montanha. A cidade possui um portal para o Plano Elemental do Fogo."
    },
    "Arenvaalis": {
        region: "Nordeste - Costa",
        description: "Uma das 3 grandes cidades de Tyr, governada pela temível Abalach-Re, a Senhora das Tempestades. Tiranos draconatos mantêm o poder herdado dos dragões que um dia governaram estas terras.",
        population: "Grande cidade",
        government: "Rei Feiticeira Abalach-Re",
        features: [
            "Governada por tiranos draconatos",
            "Escravidão legalizada",
            "Hellvault de Arenvaalis",
            "Estátua do Guardião (espada e fogo)"
        ],
        notes: "Abalach-Re é a Senhora das Tempestades, dizimou os Caçadores de Água e Sal. Jurou Hamanu de morte. Pretende devorar o mundo todo. Inscrito no pilar do Hellvault: 'Nas areias do tempo, sua consciência se esvaiu'."
    },
    "Thalas_x27_Dar": {
        displayName: "Thalas'dar",
        region: "Oeste - Costa",
        description: "Vilarejo costeiro de onde Stor saiu em busca de seu passado quando completou 15 anos. Localizada na costa oeste de Tyr, próxima à floresta de Elencor.",
        population: "Vilarejo",
        government: "Desconhecido",
        features: [
            "Vilarejo de origem de Stor",
            "Próxima à Floresta de Elencor",
            "Costa oeste de Tyr"
        ],
        notes: "Fannar criou Stor nas proximidades. Quando Stor completou 15 anos, saiu em busca deste vilarejo."
    },
    "Ur-Draxa": {
        region: "Centro-Leste",
        description: "Uma das 3 grandes cidades de Tyr, governada por Dregoth, o Rei Morto e Primeiro Campeão de Borys. Tiranos draconatos mantêm o poder herdado dos dragões ancestrais.",
        population: "Grande cidade",
        government: "Rei Feiticeiro Dregoth, o Rei Morto",
        features: [
            "Domínio do Primeiro Campeão de Borys",
            "Governada por tiranos draconatos",
            "Escravidão legalizada",
            "Estátua do Guardião (espada e fogo)"
        ],
        notes: "Dregoth foi o Primeiro Campeão, responsável por eliminar os Homens Lagartos. Agora tenta roubar o Coração da Montanha de Erëd Luin."
    },
    "Veyrinn": {
        region: "Sudeste - Costa",
        description: "Uma bela cidade em camadas, lar de Oronis e da poderosa família Maralen. Seu palácio principal está fortemente ligado à natureza. Governada pelo Sexto Campeão, que abandonou a corrupção.",
        population: "Grande cidade",
        government: "Rei Feiticeiro Oronis (Sexto Campeão / Líder da Legião)",
        features: [
            "Primeiro nível: as Docas",
            "Segundo nível: os Mercadores",
            "Terceiro nível: Negociadores e Burocratas (sede da Família Maralen)",
            "Palácio de Oronis (ligado à Natureza)",
            "Catedral de Veyrinn (estilo Notre Dame, múltiplos deuses)",
            "Hellvault de Veyrinn (corpo de dragão com Corrupção selada)",
            "Ponte Oeste",
            "Estátua do Guardião (espada e fogo)"
        ],
        notes: "Oronis é o Sexto Campeão de Borys, mas abandonou a Ascensão Dracônica cedo e levou séculos para se curar da Corrupção. Ele é um dos líderes da Legião da Estrela da Manhã. A cidade é protegida pela Preservação. No Hellvault está inscrito: 'Seu corpo, submerso em sua própria Hubris'."
    },
    "Myreendale": {
        displayName: "Myrrendale",
        region: "Sul - Farmlands",
        description: "Uma cidade próspera com um grande porto em construção para fomentar o comércio. Foi palco do Cerco de Myrrendale, onde a Legião da Estrela da Manhã defendeu a cidade contra a Ascensão Dracônica de Ozul.",
        population: "Cidade próspera",
        government: "Desconhecido",
        features: [
            "Grande porto em construção",
            "Estábulo do Seu Zé",
            "Estátua do Guardião (espada e fogo)",
            "Presença da Companhia Maralen",
            "Teatro com representações do Guardião"
        ],
        notes: "O Cerco de Myrrendale foi uma batalha épica onde a Legião impediu a Ascensão Dracônica. Abalach-Re (dragão púrpura) lutou nos mares, ferindo gravemente Fannar. Xolo morreu afogado. A cidade serviu de rota para Elencor e Veyrinn."
    },
    "Hamerhold": {
        displayName: "Hammerhold",
        region: "Sul - Interior",
        description: "Uma das 3 grandes cidades de Tyr, governada por Salaak'nir, o Cobiçoso. Uma cidade pobre e opressora, com olhos em todos os lugares. Governada por tiranos draconatos que herdaram o poder dos dragões.",
        population: "Grande cidade",
        government: "Rei Feiticeiro Salaak'nir, o Cobiçoso",
        features: [
            "Rede de espionagem de Salaak'nir",
            "Estalagem do Martelo",
            "Escravidão legalizada",
            "Governada por tiranos draconatos",
            "Ozul é um nobre local",
            "Estátua do Guardião (espada e fogo)"
        ],
        notes: "Salaak'nir é o espião máximo, com olhos em todos os continentes. Seu braço direito é Lyari, uma mulher de vermelho. Aprisionou Sorte e Lysara após o Cerco de Myrrendale. Ozul, um draconato nobre daqui, realizou experimentos em criaturas vivas para a Ascensão Dracônica."
    },
    "Orvengrad": {
        region: "Sudoeste - Costa",
        description: "Cidade nas costas sudoeste de Tyr. Pouco se sabe sobre seus governantes atuais, mas a presença da Companhia Maralen sugere atividade comercial significativa.",
        population: "Desconhecida",
        government: "Desconhecido",
        features: [
            "Presença da Companhia Maralen",
            "Costa sudoeste de Tyr",
            "Estátua do Guardião (espada e fogo)"
        ],
        notes: "A Companhia Maralen está presente em todas as cidades de Tyr, fornecendo logística e comércio eficientes."
    },
    "Ilha_Arenvaalis": {
        displayName: "Ilha de Arenvaalis",
        region: "Nordeste - Arquipélago",
        description: "A ilha isolada ao nordeste do continente de Tyr, onde se ergue a cidade de Arenvaalis. Suas águas traiçoeiras e ventos tempestuosos — domínio de Abalach-Re — tornam a navegação perigosa para quem não conhece as rotas.",
        population: "Além da cidade, poucos assentamentos costeiros",
        government: "Sob domínio de Abalach-Re",
        features: [
            "Águas traiçoeiras controladas pela Senhora das Tempestades",
            "Rotas marítimas perigosas",
            "Isolamento natural como defesa",
            "Costa rochosa e falésias"
        ],
        notes: "A posição geográfica isolada da ilha torna Arenvaalis difícil de invadir. Abalach-Re usa as tempestades para controlar quem se aproxima."
    },
    "Elencor_Forest": {
        displayName: "Floresta de Elencor",
        region: "Centro-Oeste",
        description: "Uma vasta floresta antiga que domina o centro-oeste de Tyr. Densa e misteriosa, Elencor é lar de criaturas ancestrais e serve como rota entre diversas cidades do continente.",
        population: "Criaturas selvagens e possivelmente druidas",
        government: "Sem governo — território selvagem",
        features: [
            "Floresta ancestral e densa",
            "Rota entre Myrrendale, Thalas'dar e outras cidades",
            "Criaturas perigosas habitam seu interior",
            "Fonte de recursos naturais",
            "Possível conexão com a Preservação de Oronis"
        ],
        notes: "A Legião utilizou Elencor como rota após o Cerco de Myrrendale. A floresta é vasta o suficiente para esconder exércitos inteiros. Poucos se aventuram em seu coração."
    }
};

// ===== PERSONAGENS JOGÁVEIS =====
const characters = [
    {
        name: "Stor",
        title: "Caçador Humano",
        image: "img/Stor.png",
        description: "Órfão criado na floresta de Elencor pelo elfo Fannar. Um caçador habilidoso e rastreador nato, com profundo respeito pela natureza. Carrega cicatrizes de uma infância brutal e a determinação de descobrir o destino de seu mentor.",
        details: [
            "Idade: 17 anos",
            "Nasceu na vila de Rivorhall — foi expulso aos 8 anos por ser órfão",
            "Sobreviveu 2 anos sozinho na floresta até ser salvo por Fannar",
            "Fannar forjou adagas dos dentes do urso que quase o matou",
            "Aprendeu a caçar, sobreviver, usar arco e falar élfico com Fannar",
            "Possui um apito que imita sons de pássaros",
            "Arma lendária: Arco do Juramento da Vingança",
            "Jurou seu nome à Morte",
            "Seu pai se chama Mathias (revelado pela Morte)",
            "Olhos verdes escuros, 1 olho negro pela marca da Morte",
            "Cicatriz profunda no rosto (urso)"
        ],
        ideal: "A natureza é dura, mas justa. O equilíbrio deve ser respeitado.",
        location: "Floresta de Elencor / Rivorhall"
    },
    {
        name: "Elandor Aranel",
        title: "Druida Élfico da Preservação",
        image: "img/Elandor.png",
        description: "Um druida com capacidades de cura, muito ligado à floresta. Escolhido pela Preservação para manter o equilíbrio do mundo. Se espelha em seu guardião Tharion, o Tigre Branco.",
        details: [
            "Druida — subclasse: Druida da Preservação",
            "Forma selvagem: Tigre Branco (primeira transformação no navio)",
            "Já se transformou em lobo, esquilo e vaca",
            "Possuía uma grande amiga, Lyari, que lhe deu uma flauta quebrada",
            "Sua mãe era herbalista",
            "Tharion deu um sermão antes de sua tribo ser dizimada",
            "Escolhido pela Preservação: 'Você é o escolhido para manter a preservação'",
            "Relíquia: Escudo do Protetor da Floresta",
            "Responsável por purificar os Vórtices no Cerco de Myrrendale",
            "Companheiro imaginário: Epaminondas (esquilo — real?)",
            "Jurou seu nome à Morte"
        ],
        ideal: "Ser aquilo que Tharion acreditou que eu seria.",
        location: "Floresta de Elencor"
    },
    {
        name: "Flint",
        title: "Humano Fazendeiro (Morto)",
        image: "img/Flint.png",
        description: "Um homem gentil que carregava a enxada de seu pai como herança. Veio de uma cidade que não existe neste plano — Hearthglowhollow. Descobriu que não possui alma. Foi corrompido por Ozul e morreu no Cerco de Myrrendale.",
        details: [
            "Veio de Hearthglowhollow — cidade que não existe no plano físico",
            "Criado por uma família de magos",
            "Não possui alma — criado artificialmente por um mago ambicioso",
            "Procurado pelo mago que o criou",
            "Parte de uma profecia dos Maralen: 'um homem que não era homem'",
            "Foi torturado por Vex durante 12 dias",
            "Corrompido por Ozul, vestiu armadura vermelha com o símbolo de Ozul",
            "Enfrentou o grupo no Cerco de Myrrendale",
            "Morreu após o fechamento do último Vórtice de Sangue",
            "Enterrado em Myrrendale pelo grupo"
        ],
        ideal: "Ajudar os mais necessitados (ensinamento de sua mãe).",
        location: "Myrrendale (enterrado)"
    },
    {
        name: "Azarran",
        title: "Draconato Bárbaro — Arauto da Morte",
        image: "img/Azarran.png",
        description: "Um Draconato bárbaro que se juntou ao grupo durante o Cerco de Myrrendale. Seu pai Cael é chefe da guarda de Ur-Draxa. Recebeu uma segunda chance da Morte e se tornou seu Arauto.",
        details: [
            "Draconato Bárbaro",
            "Pai: Cael, Draconato Vermelho, chefe da guarda de Ur-Draxa",
            "Companheiro da Menina da Águia",
            "Juntou-se ao grupo na Sessão 6 (Cerco de Myrrendale)",
            "Falhou uma vez — a Morte lhe mostrou uma visão onde todos morriam",
            "Recebeu segunda chance e fogo negro da Morte",
            "Tornou-se o Arauto da Morte (Sessão 8)",
            "Morte deu uma lamparina a ele (T02E01)",
            "Jurou seu nome à Morte",
            "Troveu um livro do Hellvault de Urik"
        ],
        ideal: "Desconhecido",
        location: "Ur-Draxa (origem)"
    }
];

// ===== LEGIÃO DA ESTRELA DA MANHÃ =====
const legion = [
    {
        name: "Oronis",
        title: "Rei Feiticeiro de Veyrinn — Líder da Legião",
        image: "img/NPC - Oronis.png",
        description: "Conhecido antigamente como Keltis, O Sanguinário. Sexto Campeão de Borys que abandonou a Ascensão Dracônica. Líder da Legião da Estrela da Manhã.",
        details: [
            "Pretende impedir a Convenção das Serpentes de Fogo de trazer Borys de volta",
            "Casca de Avangion — foi criado pela corrupção e a transformou",
            "Encontrado pelo grupo no castelo de Veyrinn ao fim da Temporada 1",
            "Ajudou a curar Fannar da corrupção de Abalach-Re"
        ],
        location: "Veyrinn"
    },
    {
        name: "Fannar",
        title: "Elfo Andarilho — Mentor de Stor",
        image: "img/NPC - Fannar.png",
        description: "Mestre e pai adotivo de Stor. Elfo banido de Thalas'dar. Possui conhecimento da língua antiga dos dragões. Morou na floresta para proteger o Hellvault.",
        details: [
            "Salvou Stor aos 10 anos de um urso",
            "Forjou as Adagas de Dentes para Stor",
            "Possui um corvo chamado Kasar",
            "Morava na floresta para proteger o Hellvault",
            "Perguntou a Oronis como reverter a Ascensão — resposta: a Preservação",
            "Ferido gravemente na batalha contra Abalach-Re no Cerco de Myrrendale",
            "T02: na cama, sendo curado por Oronis e Elandor"
        ],
        location: "Floresta de Elencor / Veyrinn"
    },
    {
        name: "Mellanie Maralen",
        title: "Comandante da Família Maralen",
        image: "img/NPC - Melany.png",
        description: "Comandante da família Maralen e membro da Legião. Tinha relação familiar com Colt. Coordenou a defesa no Cerco de Myrrendale.",
        details: [
            "Revelou que Flint não possui alma",
            "Guardava a profecia: 'um homem que não era homem'",
            "Morreu durante o Cerco de Myrrendale"
        ],
        location: "Veyrinn / Myrrendale"
    },
    {
        name: "Xolo",
        title: "Bardo — Capitão do Navio",
        image: "img/NPC - Xolo.png",
        description: "Bardo elegante e poderoso. Capitão do navio que levou o grupo a Veyrinn. Convocou relâmpagos para defender o navio dos homens-peixe.",
        details: [
            "Dono do barco com canhões e mercadorias",
            "Levou o grupo junto com Casper e Gadwick para Veyrinn",
            "Morreu afogado no Cerco de Myrrendale"
        ],
        location: "Alto Mar"
    },
    {
        name: "Galerion",
        title: "Anão — Membro da Legião",
        image: "img/NPC - Galerion.png",
        description: "Anão membro da Legião. Ensinou Elandor sobre a Corrupção e a Preservação. Enfurecido pelo genocídio do povo anão.",
        details: [
            "Explicou a Elandor que a criatura da visão era a Corrupção",
            "Bravo com a queda de Rkard, último rei de Erëd Luin",
            "Apareceu como visão no Hellvault",
            "Entregou pergaminho de Fannar ao grupo após o Cerco"
        ],
        location: "Veyrinn"
    },
    {
        name: "Gadwick",
        title: "Guerreiro — Vive por Batalhas",
        image: "img/NPC - Gadwick.png",
        description: "Guerreiro que vive pelo ardor da batalha. Grande relação com Casper. Conhece bem a guarda de Veyrinn. Acompanhou o grupo em missões.",
        details: [
            "Encontrado lutando sozinho contra um urso corrompido na caverna",
            "Relação quase familiar com Casper",
            "Frase: 'O ARDOR DA BATALHA'",
            "Algo aconteceu que o impediu de acompanhar o grupo a Elencor",
            "Orin abençoou sua espada"
        ],
        location: "Veyrinn / Myrrendale"
    },
    {
        name: "Casper",
        title: "Mercador Simpático",
        image: "img/NPC - Casper.png",
        description: "Mercador que encontramos ferido na estrada após ser atacado por um urso corrompido. Levou o grupo de barco até Veyrinn no navio de Xolo.",
        details: [
            "Reconheceu o selo da carta de Colt como sendo dos Maralen",
            "Relação de amizade/familiar com Gadwick",
            "Hospedado na taverna dos Bucky"
        ],
        location: "Myrrendale / Veyrinn"
    },
    {
        name: "Atlas",
        title: "Treinador de Azarran",
        image: "img/NPC - Atlas.png",
        description: "Treinou Azarran. Ficou responsável por vigiar Flint após sua crise. Não se sabe o que aconteceu entre ele e Flint.",
        details: [
            "Treinou Azarran",
            "Ficou vigiando Flint a pedido de Mellanie",
            "Destino desconhecido após a corrupção de Flint"
        ],
        location: "Veyrinn"
    },
    {
        name: "Menina da Águia",
        title: "Tiefling — Cavaleira da Águia",
        image: "img/NPC - Menina da Águia.png",
        description: "Garota Tiefling que montava uma águia gigante. Deu presentes ao grupo. Morreu salvando Stor e Azarran do mago Vex no Cerco de Myrrendale.",
        details: [
            "Deu a Stor uma caixa dos sonhos de metal",
            "Levou o grupo de águia até Myrrendale na Sessão 6",
            "Morreu junto com sua águia salvando o grupo de Vex",
            "Caixão com brasão 'S' de família nobre",
            "Irmão: Klaus, que lutou pela Legião",
            "O apito de Stor está enterrado com ela"
        ],
        location: "Myrrendale"
    },
    {
        name: "Breena",
        title: "A Gata Maga",
        image: "img/NPC - Breena.png",
        description: "Maga que curou os feridos durante o Cerco de Myrrendale. Auxiliou o grupo nas tendas da Legião.",
        details: [
            "Estava numa tenda da Legião curando necessitados",
            "Auxiliou o grupo durante o Cerco"
        ],
        location: "Myrrendale"
    },
    {
        name: "Fleur",
        title: "Membro Misterioso da Legião",
        image: "img/NPC - Ser Misterioso.png",
        description: "Membro da Legião que não deveria ter sido visto pelo grupo. Treinou Stor a pedido de Fannar.",
        details: [
            "Treinou Stor a pedido de Fannar",
            "O grupo não deveria ter visto este ser"
        ],
        location: "Desconhecido"
    },
    {
        name: "Falidian",
        title: "Curandeiro de Mellanie",
        image: null,
        description: "Curandeiro a serviço de Mellanie. Encontrado curando feridos em frente à Catedral de Myrrendale durante o Cerco, mesmo tendo perdido um braço.",
        details: [
            "Perdeu um braço no Cerco mas continuou curando",
            "Encontrado em frente à Catedral de Myrrendale"
        ],
        location: "Myrrendale"
    },
    {
        name: "Kellan",
        title: "Membro da Legião",
        image: "img/NPC - Kellar.png",
        description: "Membro da Legião que auxiliou na batalha do Cerco de Myrrendale.",
        details: [
            "Auxiliou na batalha do Cerco de Myrrendale"
        ],
        location: "Myrrendale"
    },
    {
        name: "Klaus",
        title: "Irmão da Menina da Águia",
        image: "img/NPC - Klaus.png",
        description: "Irmão da Menina da Águia. Lutou pela Legião. Conversou com Stor no enterro de sua irmã.",
        details: [
            "Estava no enterro da Menina da Águia (T02E01)",
            "Conversou com Stor"
        ],
        location: "Myrrendale"
    },
    {
        name: "Orin",
        title: "Druida Curandeiro",
        image: null,
        description: "Druida encontrado na taverna dos Bucky. Atende necessitados todo fim de tarde. Examinou Elandor e abençoou a espada de Gadwick.",
        details: [
            "Disse que Elandor está bem, apesar das visões",
            "Abençoou a espada de Gadwick",
            "Atende na taverna dos Bucky todo fim de tarde"
        ],
        location: "Myrrendale"
    }
];

// ===== VILÕES =====
const villains = [
    {
        name: "Abalach-Re",
        title: "Rei Feiticeira de Arenvaalis",
        image: null,
        description: "A Senhora das Tempestades. Jurou Hamanu de morte — provavelmente a última batalha que Hamanu realizou. Dizimou os Caçadores de Água e Sal.",
        details: [
            "Estava na batalha do Cerco de Myrrendale",
            "Provavelmente era o dragão púrpura lutando no Mar",
            "Pretende devorar o mundo todo",
            "Derrotou Xolo e feriu gravemente Fannar no Cerco de Myrrendale"
        ],
        location: "Arenvaalis"
    },
    {
        name: "Borys",
        title: "Rei das Terras de Ferro",
        image: null,
        description: "O Dragão de Ebe. Criou a Corrupção. Seus Campeões executaram o extermínio das raças antigas.",
        details: [
            "Criador da Corrupção",
            "Ordenou a eliminação das raças antigas através de seus Campeões"
        ],
        location: "Iron Wastes"
    },
    {
        name: "Dregoth",
        title: "O Rei Morto",
        image: null,
        description: "Primeiro Campeão de Borys, responsável por eliminar os Homens Lagartos. Governa Ur-Draxa.",
        details: [
            "Primeiro Campeão de Borys",
            "Eliminou os Homens Lagartos",
            "Tenta roubar o Coração da Montanha de Erëd Luin",
            "Governa Ur-Draxa"
        ],
        location: "Ur-Draxa"
    },
    {
        name: "Salaak'nir",
        title: "Rei Feiticeiro de Hammerhold",
        image: "img/NPC - Salaak'nir.png",
        description: "O Cobiçoso. Espião máximo, tem olhos em todos os continentes. Comanda uma rede de espionagem.",
        details: [
            "Aprisionou Sorte e Lysara após o Cerco de Myrrendale",
            "Possui um braço direito: Lyari, uma mulher de vermelho",
            "Rede de espionagem em todos os continentes"
        ],
        location: "Hammerhold"
    },
    {
        name: "Ozul",
        title: "Nobre Draconato de Hammerhold",
        image: null,
        description: "Draconato que contratou o grupo para matar um urso anormal. Nobre de Hammerhold realizando rituais de Ascensão Dracônica.",
        details: [
            "Criou o urso responsável pela morte de Colt",
            "Responsável pelo desequilíbrio da floresta",
            "Realizava testes de rituais em criaturas vivas para acender o poder dracônico",
            "Desejava assassinar Fannar pelo conhecimento da língua antiga",
            "Símbolo da organização: mão com adaga no meio",
            "Sucumbiu à loucura — tornou-se dragão subdesenvolvido",
            "Diz que os Draconatos anteriores sucumbiram à loucura após a Ascensão, mas se achava diferente"
        ],
        location: "Hammerhold / Myrrendale"
    },
    {
        name: "Wyan",
        title: "Rei Feiticeiro de Sedraxis",
        image: null,
        description: "Ficou louco após aniquilar os Homens da Peste. Morreu pouco tempo depois.",
        details: [
            "Conversou com Tectuktitlay sobre suas tarefas",
            "Enlouqueceu após cumprir sua missão",
            "Morreu após a escrita do Livro sem Título"
        ],
        location: "Sedraxis"
    },
    {
        name: "Tithian",
        title: "Capitão da Guarda de Ozul",
        image: "img/NPC - Tithian.png",
        description: "Capitão da guarda de Ozul. Filho perdido de O Exilado.",
        details: [
            "Enfrentado pela equipe de Sorte no Cerco de Myrrendale",
            "Lutou dentro do Portal da Corrupção",
            "A base ficava abaixo do Castelo de Ozul"
        ],
        location: "Myrrendale"
    },
    {
        name: "Vex",
        title: "O Mago de Areia",
        image: "img/NPC - Vex.png",
        description: "Lacaio de Ozul que defendia um Vórtice de Sangue no Cerco de Myrrendale.",
        details: [
            "Derrotado pelo grupo no Cerco de Myrrendale",
            "Torturou Flint por 12 dias",
            "Ozul não entendia os motivos de Vex e sabia que estava cercado por idiotas"
        ],
        location: "Myrrendale"
    },
    {
        name: "Kresh",
        title: "Kobold do Urso",
        image: "img/NPC - Kresh.png",
        description: "O Kobold que intermediou a contratação para matar o Urso que matou Colt.",
        details: [
            "Um dos 3 lacaios de Ozul",
            "Protegia o Vórtice de Sangue em Myrrendale",
            "Derrotado — empurrado para o Vórtice"
        ],
        location: "Myrrendale"
    },
    {
        name: "Ukta",
        title: "Último Aprendiz do Errante da Tempestade",
        image: "img/NPC - Ukta.png",
        description: "Orc Ronin, destruído por Fälin e Durgan.",
        details: [
            "Último aprendiz do Errante da Tempestade",
            "Destruído em combate"
        ],
        location: "Desconhecido"
    },
    {
        name: "Astarius",
        title: "Kobold Velho",
        image: "img/NPC - Astarius.png",
        description: "Estava no castelo de Ozul. Foi pacífico com o grupo.",
        details: [
            "Encontrado no castelo de Ozul",
            "Não sabemos muito sobre ele"
        ],
        location: "Castelo de Ozul"
    },
    {
        name: "Tectuktitlay",
        title: "Campeão de Borys",
        image: null,
        description: "Possuía tarefas de Borys. Cumpriu-as conforme o Livro sem Título. Ficou louco.",
        details: [
            "Cumpriu suas tarefas para Borys",
            "Enlouqueceu após completá-las",
            "Mencionado no Livro sem Título"
        ],
        location: "Desconhecido"
    }
];

// ===== PARADAS DA JORNADA =====
const journeyStops = [
    {
        x: 700, y: 750,
        location: "Floresta de Elencor",
        session: "Sessão 0",
        summary: "Stor e Elandor se conhecem na floresta. Stor confunde Elandor com uma caça. Eles se unem e encontram Flint na estrada. O grupo é formado junto com Colt."
    },
    {
        x: 750, y: 1080,
        location: "Elenrejo",
        session: "Sessão 0",
        summary: "O grupo é contratado por Ozul para matar um urso corrompido. Colt morre na batalha. No funeral, encontram uma carta com o selo 'M' que pertence a alguém importante para Colt, em Veyrinn."
    },
    {
        x: 880, y: 1100,
        location: "Estrada para Myrrendale",
        session: "Sessão 1",
        summary: "Na estrada, encontram Casper ferido e uma carroça destruída. Stor lidera a busca por sobreviventes, encontram Gadwick lutando contra um urso corrompido numa caverna. Elandor tem sua primeira visão da Corrupção."
    },
    {
        x: 1040, y: 1130,
        location: "Myrrendale",
        session: "Sessão 1-2",
        summary: "Chegam à cidade portuária. Veem as grandes plantações e o porto em construção. Encontram a menina da águia na taverna. Casper revela que o selo da carta é dos Maralen. Partem de navio com Xolo rumo a Veyrinn."
    },
    {
        x: 1200, y: 1300,
        location: "Alto Mar",
        session: "Sessão 2-3",
        summary: "Durante a viagem de 3 dias, uma horda de homens-peixe ataca o navio. Elandor se transforma num tigre branco pela primeira vez. Xolo convoca relâmpagos para limpar os invasores."
    },
    {
        x: 1590, y: 1210,
        location: "Veyrinn",
        session: "Sessão 3-4",
        summary: "Entregam a notícia da morte de Colt a Mellanie Maralen. Descobrem que Flint é procurado e não possui alma. O conselho revela os planos de Ozul. Elandor encontra a Preservação e recebe nova subclasse. Derrotam criaturas corrompidas e magos de areia."
    },
    {
        x: 1200, y: 1300,
        location: "Viagem de volta",
        session: "Sessão 4-5",
        summary: "Mellanie envia o grupo para encontrar o Hellvault nas ruínas próximas a Hammerhold. Partem de navio de volta a Myrrendale."
    },
    {
        x: 1040, y: 1130,
        location: "Myrrendale",
        session: "Sessão 5",
        summary: "Festival do Guardião em Myrrendale. O Guardião é representado de forma diferente. Stor e Elandor visitam mercadores, descobrem que Gadwick não pode acompanhá-los. Partem do estábulo do Seu Zé rumo a Elencor."
    },
    {
        x: 700, y: 750,
        location: "Floresta de Elencor",
        session: "Sessão 5",
        summary: "Encontram a casa de Stor. Epaminondas os guia até Galaeth, uma coruja colossal que os leva à cidade perdida. Descobrem o Hellvault e as relíquias (Arco do Juramento e Escudo do Protetor). Leem o Livro sem Título de Wyan e o Livro dos Reis de Erëd Luin. Visitam o Coração da Floresta e recebem a chave do Túmulo de Rkard."
    },
    {
        x: 1040, y: 1130,
        location: "Myrrendale (Cerco)",
        session: "Sessão 6-7",
        summary: "Azarran se junta ao grupo. O Sol Negro eclipsa os céus. Três vórtices de sangue drenam a cidade. O grupo destrói os vórtices um a um. Flint, possuído por Ozul, é derrotado e morre. Entram no portal da catedral, juram seus nomes à Morte e enfrentam Ozul em sua forma de Dragão Negro. Vencem com a ajuda de Epaminondas."
    },
    {
        x: 1590, y: 1210,
        location: "Veyrinn",
        session: "Sessão 7 (Final)",
        summary: "Retornam via portal. Descobrem que Xolo e Mellanie morreram na batalha. Recebem mensagem de Fannar sobre Abalach-Re. Sobem ao castelo e encontram Oronis, o Redimido, que os aguardava. Fim da Temporada 1."
    }
];

// ===== MAPEAMENTO DE LOCAIS PARA SVG IDs =====
const locationNameToSvgId = {
    "Sedraxis": "Sedraxis",
    "Erëd Luin": "Ered-Luin",
    "Ered Luin": "Ered-Luin",
    "Erëd": "Ered-Luin",
    "Arenvaalis": "Arenvaalis",
    "Thalas'dar": "Thalas_x27_Dar",
    "Ur-Draxa": "Ur-Draxa",
    "Veyrinn": "Veyrinn",
    "Myrrendale": "Myreendale",
    "Hammerhold": "Hamerhold",
    "Orvengrad": "Orvengrad",
    "Elencor": "Elencor_Forest",
    "Floresta de Elencor": "Elencor_Forest",
    "Ilha de Arenvaalis": "Ilha_Arenvaalis",
};
