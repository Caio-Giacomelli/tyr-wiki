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
        ],
        fullText: `Irmaozinho, Sinto profundamente a sua falta.

Ler sua ultima carta trouxe calor ao meu coracao como ha muito tempo eu nao sentia. Ainda assim, a tristeza tornou a encontrar-me.

Ao contemplar o tempo futuro, compreendi que meu fim ja nao pode ser evitado. Esta batalha... ja nao me pertence.

Deixo-lhe aos cuidados de Lucy, embora eu lhe peca que nao a chame assim. Ela detesta esse apelido. E cuidado com seus olhos de marmore, ha astucia neles. Astucia bondosa, e verdade, mas ainda assim perigosa para os desatentos.

Fui eu quem construiu os cinco locais sagrados e suas passagens. Somente Keltis (Oronis) conhece suas localizacoes exatas. Peca a ele que lhe ensine os caminhos, pois tu e sangue de meu sangue e merece o conhecimento.

Junto desta carta, envio-lhe cadernos, diarios e manuscritos pertencentes aos Reis-Feiticeiros. Separe-os e guarde-os nos locais sagrados.

Em alguns seculos, aqueles capazes de compreender a dor do mundo haverao de utiliza-los com a sabedoria necessaria. Quando a hora correta chegar, Borys enfim podera ser destruido. Ate que o tempo cumpra seu contrato e volte a reuni-los, cuide de si.

Minhas memorias permanecerao escritas em nossas cartas e preservadas dentro dos locais sagrados apos o meu sacrificio. Sempre que a saudade apertar teu peito, aproxime-se deles. Meu amor por ti ainda encontrara uma forma de cumprir o proprio dever. Eu te amo, meu querido irmao. Adeus.

— Dekkar`
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
        ],
        fullText: `[Conteudo em lingua antiga dos dragoes — apenas Stor e Fannar podem decifra-lo]

Existem 2 estruturas para o vocabulario:
- Simbolos que se conectam
- Simbolos que estao separados, porem formam uma estrutura gramatical
  (Como se fosse letra de mao e letra de forma)

Esta na lingua antiga dos dragoes. Apenas Stor e Fannar possuem o conhecimento para ler.`
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
        ],
        fullText: `"Semanas se passaram desde o dia que terminei minha tarefa. Pergunto-me se os outros campeoes tambem conseguirao concluir suas tarefas ao longo de suas vidas. Sinto-me um tanto infeliz, aniquilar criaturas tao preciosas por uma causa que me foi confiada comeca a me trazer questionamentos, por outro lado, fico feliz de ter tomado a decisao de poupar o ovo que encontrei no ninho da grande coru..."

"...outro dia me encontrei com Lalali-Puy e pude ver com meus proprios olhos alguem que sente a mesma dor que eu sinto. Me tornar um campeao criou uma cicatriz em meu coracao que eu jamais conseguirei esquecer. Consigo entender porque ela criou sua cidade, a tal Thalas'dar, sem o consentimento de Borys. Trabalhar em segredo agora e nossa unica alternativa. Nos pr..."

"...portanto, percebo que a corrupcao nao e o caminho, dito isso, pretendo tentar convencer Kalid-nay, antes que ela termine de transformar as montanhas do norte em um deserto. Sinto que Abalach-Re trama contra nos, como um tigre que espreita antes de atac..."

"Abalach-Re nos jurou de morte. Eu, Hamanu de Urik, o Leao do Norte, irei enfrenta-la em combate direto. Que o espirito do Leao me guie em minha ultima jornada como Campeao."`
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
        ],
        fullText: `Ja fomos numerosos. Ja fomos honrosos e nosso sangue era ferro e pedra. As verdes montanhas de Tyr eram nossa casa e os animais das planicies nossos aliados. O mundo era diferente, disso nao tenho duvida. Viviamos em paz com os Homens Altos e negociavamos frequentemente com os Homens Baixos. Eramos um povo digno de ser lembrado.

Mas tudo mudou com a chegada de Borys. O Feiticeiro se proclama Rei das Terras de Ferro, mas nos aceitamos apenas um rei em Ered Luin — Rkard.

Por diversas vezes ele tentou entrar em nosso reino e por diversas vezes ele falhou. Ninguem conta isso, mas Borys ja se ajoelhou na frente de Rkard e pediu perdao e misericordia. Essa foi uma falha de nosso rei: ser misericordioso com um Homem Pelado. Esse erro nos custou muito.

Anos depois fomos visitados por Borys de Ebe e hoje aqui estamos. O cerco dura semanas e nossos numeros caem abruptamente todos os dias. Ver Borys em combate e algo inesquecivel. O homem e tao brutal e astuto quanto um Dragao — fazendo jus ao seu titulo. O Dragao de Ebe deixou sua marca permanente em nosso povo.

Borys conseguiu ferir mortalmente Rkard, ultimo Rei de Ered Luin e Rei dos Anoes, que se sacrificou junto ao Guardiao para amenizar o trauma do mundo.

A espada do Dragao, O Flagelo, ainda permanece presa ao corpo de nosso rei, como uma bandeira que mostra eternamente a vitoria dos Feiticeiros sobre nos. Essa batalha nos ja perdemos, disso nao tenho duvida.

Dias se passaram e nenhum sinal da Convencao das Serpentes de Fogo. Algo me diz que eles estao ocupados com outras guerras e outros Feiticeiros e esse e um momento importante para nosso povo. Mas e o nosso fim. Nao podemos mais ter reis pois os Feiticeiros irao nos cacar ate a extincao. Permanecer sem lideres, agora, e nossa unica alternativa. Triste fim para um Nobre Povo.

Os ancioes decidiram guardar esse livro na cidade de Elencor, mas eu tenho medo do conhecimento que esta nesse livro. Mais do que a historia dos Anoes, esse livro contem a historia de Tyr. Todas as Eras condensadas em grandes contos de grandes reis.

Sou tomado pelo medo do que pode acontecer com essas palavras se liberadas ao vento. Sem o conhecimento dos ancioes eu fiz algo para proteger o povo. Escondi a chave para o Tumulo de Rkard no coracao da floresta. Ninguem que tenha maldade em seu coracao conseguira encontra-la.

Como assistente pessoal de Rkard, cabe a mim escrever as ultimas palavras no livro sagrado dos Anoes.

Triste fim para Tuk Tuk — Assistente Pessoal de Rkard, O Ultimo dos Reis de Ered Luin.`
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
        ],
        fullText: `Sim, a Ascensao Draconica. Algo que todo draconato jamais poderia imaginar ser possivel, Borys conseguiu e esta disposto a nos ajudar a alcancar. Me pergunto as razoes por tras de seus atos. Entendo seu objetivo com o Grande Genocidio, mas... qual a finalidade de ser tao poderoso e astuto, se ainda necessita de um aglomerado de lunaticos para colaborar com seu plano megalomaniaco?

Ele me explicou brevemente. O rito e feito durante o Sol Negro. Sao necessarias milhares de almas inocentes, sangue de nossos ancestrais e que o receptaculo tenha certeza da maldade que carrega dentro de seu coracao. Alem disso, muito poder arcano, corrupcao e alguns componentes alquimicos. Nao faz sentido. Porque falam sobre maldade, se nossos atos sao de compaixao com nosso povo?

Conversei com Tectuktitlay. Ele cumpriu sua tarefa e vejo o quanto sua mente adoeceu. Esta ha um passo de cair no abismo de sua propria mente. Meu maior medo e que eu percebo a nossa semelhanca, pois a cada Homem da Peste que morre pelas minhas maos, eu consigo ouvir seus lamentos em meus pesadelos mais vividamente.

Eu ja nao consigo mais distinguir meus proprios pensamentos dos tormentos dos mortos. Como faco para isso acabar?? ONDE ESTA O QUE BORYS ME PROMETEU???

Se alguem algum dia ler esse relato, aqui vao minhas consideracoes: Nao deixem mais nenhum draconato realizar os sacrificios para a Ascensao Draconica. Borys nos prometeu muita coisa, mas a unica certeza que me foi dada, foi minha loucura.

Essas sao as ultimas palavras escritas por Wyan, Rei Feiticeiro de Sedraxis.`
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
        ],
        fullText: `As arvores nao gritavam. Foi isso que mais me aterrorizou.

Quando marchamos para o oeste, eu esperava resistencia. Esperava que a floresta reagisse a nossa presenca como os exercitos reagiam. Esperava ouvir odio, medo ou mesmo furia. Mas nao havia nada alem do vento atravessando folhas antigas e raizes profundas demais para serem vistas.

Eu destrui aldeias inteiras antes daquele dia. Vi rios secarem, vi criaturas implorarem por misericordia e vi campeoes celebrarem enquanto cidades queimavam. Nada disso me perturbou. Eu acreditava que o sofrimento era apenas o preco inevitavel da ascensao. Que os fracos existiam para serem consumidos pelos fortes.

Foi isso que Borys nos ensinou, foi isso que eu ensinei aos outros. Mas naquela floresta... nada lutava contra nos.

As arvores permaneciam de pe mesmo enquanto queimavam, entao eu ouvi algo. Nao era uma voz e nem eram palavras, eu apenas ouvi a Dor.

A natureza nao nutre odio. Ela suporta.

E naquele momento compreendi algo terrivel: nos nao estavamos conquistando Tyr. Estavamos mutilando algo vivo demais para se defender de nos.

Os Elfos fugiam para proteger sementes. Sementes! Enquanto nos erguiamos imperios com sangue, eles protegiam vida pequena o suficiente para caber entre os dedos. E ainda assim... sobreviveriam a nos.

Lembro-me de observar um deles morrer ajoelhado sobre as raizes de uma arvore partida ao meio. Mesmo ferido, ele tentou cobrir a terra com as proprias maos, como se pudesse proteger o solo do que haviamos nos tornado.

Eu deveria ter sentido desprezo, mas em vez disso... senti vergonha.

As vezes ainda escuto os gritos daqueles que queimaram sob minhas ordens. Outras vezes, escuto algo pior: Silencio. O silencio das florestas que nunca voltarao.

Naquela noite ordenei que apagassem as fogueiras do acampamento. Disse aos outros que a fumaca denunciaria nossa posicao. Mentira. Eu apenas nao suportava mais o cheiro da madeira queimando. Desde entao, algo mudou dentro de mim.

A corrupcao ainda existe. Percebi que ela nao abandona aqueles que a utilizam. Ela se acomoda entre pensamentos gentis e comeca a justificar pequenas crueldades. Quando percebemos, ja estamos defendendo monstruosidades em nome de um amanha melhor.

Consigo senti-la percorrendo meus pensamentos como agua escura infiltrando rachaduras em pedra antiga. Ela sussurra justificativas suaves. Diz que todo sofrimento possui proposito. Diz que o poder apenas pertence aqueles dispostos a carrega-lo.

E o mais terrivel e que parte de mim ainda acredita nisso. Talvez seja esse o verdadeiro veneno. Nao a fome por destruicao... mas a capacidade de transformar mal em necessidade.

Tenho observado a floresta em silencio desde entao. Ha uma violencia na natureza, mas ela nunca destroi alem do necessario para continuar vivendo. Lobos cacam porque sentem fome. Raizes rompem pedra porque precisam alcancar agua. Ate a tempestade sabe a hora de cessar.

Nos nao. Nos devastamos porque podemos.

Comeco a acreditar que exista algo nobre na preservacao. Nao como fraqueza, nem como passividade, mas como escolha. A escolha de permitir que algo continue existindo mesmo quando seria mais facil consumir.

Nao sei o que farei com esses pensamentos. Talvez eles desaparecam com o tempo. Talvez eu tambem desapareca. Mas pela primeira vez em muitos anos, caminhei entre arvores sem desejar domina-las.

E isso me assustou mais do que qualquer batalha.

Este e meu ultimo relato como Lalali-Puy, o Flagelo dos Elfos. Que esse titulo desapareca junto das cinzas que deixou para tras.

Renuncio ao titulo de campea concedido por Borys de Ebe.

Se ainda existir algo em mim digno de permanecer, que seja lembrado nao pela destruicao, mas pela chuva, que faz vida renascer onde antes havia morte.

Lalali-Puy,
a Chuva Eterna.`
    }
];
