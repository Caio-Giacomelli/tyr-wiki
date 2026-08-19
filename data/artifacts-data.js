// ===== DADOS DOS ARTEFATOS =====

const artifacts = [
    {
        name: "Adagas de Dentes",
        image: "img/Item - Adagas de Stor.png",
        description: "Um par de adagas forjadas a partir de dentes de criaturas derrotadas pelo grupo.",
        details: [
            "Uma das adagas foi confeccionada por Fannar, com os dentes do urso que causou o ferimento no rosto de Stor",
            "A outra adaga foi confeccionada por Stor, após matar a besta alada, um Wyrmling de gelo"
        ]
    },
    {
        name: "Albert (Colar do Escaravelho)",
        image: "img/Item - Albert.png",
        description: "Um colar com um escaravelho mágico que guia seu portador até o Hellvault mais próximo.",
        details: [
            "Ao fazer carinho, ele se desprende de seu encaixe e começa a voar na direção da entrada do Hellvault mais próximo",
            "Ele não voa além de 100 ft. do portador do colar",
            "Compreende comandos simples, mas não responde"
        ]
    },
    {
        name: "Apito dos Cães Espectrais",
        image: null,
        description: "Um apito mágico que invoca um cão de caça espectral ao ser assoprado.",
        details: [
            "Ao assoprar, um cão espectral se apresenta ao local",
            "Ele recebe comandos como um cão treinado — é necessário dar um nome ao cão antes de dar comandos",
            "Possíveis comandos: Proteger, Avisar, Dormir, Atacar e Fugir",
            "Um cão não pode receber mais que 2 comandos por uso do apito",
            "Marcius → Hellvault de Veyrinn"
        ]
    },
    {
        name: "Arco do Juramento da Vingança",
        image: "img/Item - Juramento.png",
        description: "Arco lendário confeccionado por Fannar. Possui 6 marcas representando mortes importantes. Permite jurar inimigos de morte.",
        details: [
            "Confeccionado por Fannar",
            "Possui 6 marcas: Monar, Colt, Menina da Águia, Flint, Xolo e Mellanie",
            "Ação Livre: pode jurar um inimigo de morte",
            "Vantagem contra o inimigo jurado, desvantagem contra o resto",
            "Dano 1d6 perfurante adicional contra o jurado",
            "Deve gritar: Morte rápida aos meus inimigos",
            "Só pode ter um inimigo jurado por vez (até morrer ou 7 dias)",
            "Quanto mais mata inimigos jurados, mais o arco fica forte",
            "Inimigos mortos: Kresh, Flint, Ozul"
        ]
    },
    {
        name: "Broche Rosado",
        image: null,
        description: "Uma lótus branca e dourada que permite localizar membros da Legião.",
        details: [
            "Uma lótus branca e dourada, agora desabrochada",
            "Permite localizar pessoas da Legião após promoção para Soldados (Equipe do Stor)"
        ]
    },
    {
        name: "O Flagelo",
        image: null,
        description: "A espada lendária de Borys, o Dragão de Ebe. Permanece enterrada com Rkard.",
        details: [
            "Espada de Rkard (cravada nele por Borys)",
            "Está enterrada com ele no Túmulo de Rkard"
        ]
    }
];

// ===== DADOS DOS LIVROS & RELATOS =====

const books = [
    {
        name: "Carta de Dekkar",
        image: null,
        description: "Uma carta emocionante de Dekkar para seu irmão, revelando segredos sobre os locais sagrados e a destruição de Borys.",
        details: [
            "Dekkar construiu os cinco locais sagrados e suas passagens",
            "Somente Keltis (Oronis) conhece suas localizações exatas",
            "Junto da carta, enviou cadernos, diários e manuscritos dos Reis-Feiticeiros",
            "Devem ser separados e guardados nos locais sagrados",
            "Em alguns séculos, aqueles capazes de compreender a dor do mundo haverão de utilizá-los",
            "Quando a hora correta chegar, Borys enfim poderá ser destruído"
        ],
        fullText: `Irmãozinho, Sinto profundamente a sua falta.

Ler sua última carta trouxe calor ao meu coração como há muito tempo eu não sentia. Ainda assim, a tristeza tornou a encontrar-me.

Ao contemplar o tempo futuro, compreendi que meu fim já não pode ser evitado. Esta batalha… já não me pertence.

Deixo-lhe aos cuidados de Lucy, embora eu lhe peça que não a chame assim. Ela detesta esse apelido. E cuidado com seus olhos de mármore, há astúcia neles. Astúcia bondosa, é verdade, mas ainda assim perigosa para os desatentos.

Fui eu quem construiu os cinco locais sagrados e suas passagens. Somente Keltis (Oronis) conhece suas localizações exatas. Peça a ele que lhe ensine os caminhos, pois tu é sangue de meu sangue e merece o conhecimento.

Junto desta carta, envio-lhe cadernos, diários e manuscritos pertencentes aos Reis-Feiticeiros. Separe-os e guarde-os nos locais sagrados.

Em alguns séculos, aqueles capazes de compreender a dor do mundo haverão de utilizá-los com a sabedoria necessária. Quando a hora correta chegar, Borys enfim poderá ser destruído. Até que o tempo cumpra seu contrato e volte a reuni-los, cuide de si.

Minhas memórias permanecerão escritas em nossas cartas e preservadas dentro dos locais sagrados após o meu sacrifício. Sempre que a saudade apertar teu peito, aproxime-se deles. Meu amor por ti ainda encontrará uma forma de cumprir o próprio dever. Eu te amo, meu querido irmão. Adeus.

— Dekkar`
    },
    {
        name: "Escrita Antiga",
        image: null,
        description: "Páginas de um livro em escrita antiga dos dragões. Apenas Stor e Fannar possuem conhecimento para lê-las.",
        details: [
            "Existem 2 estruturas para o vocabulário: símbolos que se conectam e símbolos separados que formam uma estrutura gramatical",
            "Como se fosse letra de mão e letra de forma",
            "Está na língua antiga dos dragões",
            "Apenas Stor e Fannar possuem o conhecimento para ler"
        ],
        fullText: `[Conteúdo em língua antiga dos dragões — apenas Stor e Fannar podem decifrá-lo]

Existem 2 estruturas para o vocabulário:
- Símbolos que se conectam
- Símbolos que estão separados, porém formam uma estrutura gramatical
  (Como se fosse letra de mão e letra de forma)

Está na língua antiga dos dragões. Apenas Stor e Fannar possuem o conhecimento para ler.`
    },
    {
        name: "Livro de Urik",
        image: null,
        description: "Relato de Hamanu de Urik, o Leão do Norte, sobre sua tarefa como Campeão e sua decisão de enfrentar Abalach-Re.",
        details: [
            "Hamanu completou sua tarefa de Campeão mas questiona a moralidade",
            "Encontrou-se com Lalali-Puy que sente a mesma dor",
            "Percebeu que a corrupção não é o caminho",
            "Pretende convencer Kalid-nay antes que ela transforme as montanhas do norte em deserto",
            "Abalach-Re jurou todos de morte",
            "Hamanu decidiu enfrentá-la em combate direto em sua última jornada como Campeão"
        ],
        fullText: `"Semanas se passaram desde o dia que terminei minha tarefa. Pergunto-me se os outros campeões também conseguirão concluir suas tarefas ao longo de suas vidas. Sinto-me um tanto infeliz, aniquilar criaturas tão preciosas por uma causa que me foi confiada começa a me trazer questionamentos, por outro lado, fico feliz de ter tomado a decisão de poupar o ovo que encontrei no ninho da grande coru…"

"…outro dia me encontrei com Lalali-Puy e pude ver com meus próprios olhos alguém que sente a mesma dor que eu sinto. Me tornar um campeão criou uma cicatriz em meu coração que eu jamais conseguirei esquecer. Consigo entender porque ela criou sua cidade, a tal Thalas'dar, sem o consentimento de Borys. Trabalhar em segredo agora é nossa única alternativa. Nos pr…"

"…portanto, percebo que a corrupção não é o caminho, dito isso, pretendo tentar convencer Kalid-nay, antes que ela termine de transformar as montanhas do norte em um deserto. Sinto que Abalach-Re trama contra nós, como um tigre que espreita antes de atac…"

"Abalach-Re nos jurou de morte. Eu, Hamanu de Urik, o Leão do Norte, irei enfrentá-la em combate direto. Que o espírito do Leão me guie em minha última jornada como Campeão."`
    },
    {
        name: "Livro dos Reis de Erëd Luin",
        image: null,
        description: "O livro sagrado dos Anões, contendo a história de Erëd Luin, a queda de Rkard e o legado do povo anão.",
        details: [
            "Registra a história do povo anão e sua queda",
            "Borys se proclamou Rei das Terras de Ferro mas os anões só aceitavam Rkard",
            "Borys conseguiu ferir mortalmente Rkard, que se sacrificou junto ao Guardião",
            "A espada O Flagelo permanece presa ao corpo de Rkard",
            "Tuk Tuk escondeu a chave do Túmulo de Rkard no coração da floresta",
            "Ninguém que tenha maldade em seu coração conseguirá encontrá-la"
        ],
        fullText: `Já fomos numerosos. Já fomos honrosos e nosso sangue era ferro e pedra. As verdes montanhas de Tyr eram nossa casa e os animais das planícies nossos aliados. O mundo era diferente, disso não tenho dúvida. Vivíamos em paz com os Homens Altos e negociávamos frequentemente com os Homens Baixos. Éramos um povo digno de ser lembrado.

Mas tudo mudou com a chegada de Borys. O Feiticeiro se proclama Rei das Terras de Ferro, mas nós aceitamos apenas um rei em Erëd Luin – Rkard.

Por diversas vezes ele tentou entrar em nosso reino e por diversas vezes ele falhou. Ninguém conta isso, mas Borys já se ajoelhou na frente de Rkard e pediu perdão e misericórdia. Essa foi uma falha de nosso rei: ser misericordioso com um Homem Pelado. Esse erro nos custou muito.

Anos depois fomos visitados por Borys de Ebe e hoje aqui estamos. O cerco dura semanas e nossos números caem abruptamente todos os dias. Ver Borys em combate é algo inesquecível. O homem é tão brutal e astuto quanto um Dragão – fazendo jus ao seu título. O Dragão de Ebe deixou sua marca permanente em nosso povo.

Borys conseguiu ferir mortalmente Rkard, último Rei de Erëd Luin e Rei dos Anões, que se sacrificou junto ao Guardião para amenizar o trauma do mundo.

A espada do Dragão, O Flagelo, ainda permanece presa ao corpo de nosso rei, como uma bandeira que mostra eternamente a vitória dos Feiticeiros sobre nós. Essa batalha nós já perdemos, disso não tenho dúvida.

Dias se passaram e nenhum sinal da Convenção das Serpentes de Fogo. Algo me diz que eles estão ocupados com outras guerras e outros Feiticeiros e esse é um momento importante para nosso povo. Mas é o nosso fim. Não podemos mais ter reis pois os Feiticeiros irão nos caçar até a extinção. Permanecer sem líderes, agora, é nossa única alternativa. Triste fim para um Nobre Povo.

Os anciões decidiram guardar esse livro na cidade de Elencor, mas eu tenho medo do conhecimento que está nesse livro. Mais do que a história dos Anões, esse livro contém a história de Tyr. Todas as Eras condensadas em grandes contos de grandes reis.

Sou tomado pelo medo do que pode acontecer com essas palavras se liberadas ao vento. Sem o conhecimento dos anciões eu fiz algo para proteger o povo. Escondi a chave para o Túmulo de Rkard no coração da floresta. Ninguém que tenha maldade em seu coração conseguirá encontrá-la.

Como assistente pessoal de Rkard, cabe a mim escrever as últimas palavras no livro sagrado dos Anões.

Triste fim para Tuk Tuk – Assistente Pessoal de Rkard, O Último dos Reis de Erëd Luin.`
    },
    {
        name: "Livro sem Título",
        image: null,
        description: "Relato final de Wyan, Rei Feiticeiro de Sedraxis, sobre a Ascensão Dracônica e a loucura que ela traz.",
        details: [
            "Descreve o ritual da Ascensão Dracônica ensinado por Borys",
            "O rito é feito durante o Sol Negro — necessita milhares de almas inocentes",
            "Sangue ancestral, poder arcano, corrupção e componentes alquímicos",
            "Wyan conversou com Tectuktitlay que já enlouqueceu",
            "Cada Homem da Peste morto trazia pesadelos mais vívidos",
            "Últimas palavras: 'Não deixem mais nenhum draconato realizar os sacrifícios'",
            "A única certeza que Borys deu foi a loucura"
        ],
        fullText: `Sim, a Ascensão Dracônica. Algo que todo draconato jamais poderia imaginar ser possível, Borys conseguiu e está disposto à nos ajudar a alcançar. Me pergunto as razões por trás de seus atos. Entendo seu objetivo com o Grande Genocídio, mas… qual a finalidade de ser tão poderoso e astuto, se ainda necessita de um aglomerado de lunáticos para colaborar com seu plano megalomaníaco?

Ele me explicou brevemente. O rito é feito durante o Sol Negro. São necessárias milhares de almas inocentes, sangue de nossos ancestrais e que o receptáculo tenha certeza da maldade que carrega dentro de seu coração. Além disso, muito poder arcano, corrupção e alguns componentes alquímicos. Não faz sentido. Porque falam sobre maldade, se nossos atos são de compaixão com nosso povo?

Conversei com Tectuktitlay. Ele cumpriu sua tarefa e vejo o quanto sua mente adoeceu. Está há um passo de cair no abismo de sua própria mente. Meu maior medo é que eu percebo a nossa semelhança, pois a cada Homem da Peste que morre pelas minhas mãos, eu consigo ouvir seus lamentos em meus pesadelos mais vividamente.

Eu já não consigo mais distinguir meus próprios pensamentos dos tormentos dos mortos. Como faço para isso acabar?? ONDE ESTÁ O QUE BORYS ME PROMETEU???

Se alguém algum dia ler esse relato, aqui vão minhas considerações: Não deixem mais nenhum draconato realizar os sacrifícios para a Ascensão Dracônica. Borys nos prometeu muita coisa, mas a única certeza que me foi dada, foi minha loucura.

Essas são as últimas palavras escritas por Wyan, Rei Feiticeiro de Sedraxis.`
    },
    {
        name: "Relato de Lalali-Puy",
        image: null,
        description: "Último relato de Lalali-Puy, o Flagelo dos Elfos, antes de renunciar ao título de Campeã e adotar o nome 'a Chuva Eterna'.",
        details: [
            "Narra a destruição de uma floresta élfica sob suas ordens",
            "As árvores não gritavam — apenas suportavam",
            "Percebeu que a natureza não destrói além do necessário para continuar vivendo",
            "Sentiu vergonha ao ver um elfo morrer tentando proteger o solo",
            "Começou a acreditar na preservação como escolha nobre",
            "Renunciou ao título de Campeã de Borys",
            "Adotou o nome: Lalali-Puy, a Chuva Eterna"
        ],
        fullText: `As árvores não gritavam. Foi isso que mais me aterrorizou.

Quando marchamos para o oeste, eu esperava resistência. Esperava que a floresta reagisse à nossa presença como os exércitos reagiam. Esperava ouvir ódio, medo ou mesmo fúria. Mas não havia nada além do vento atravessando folhas antigas e raízes profundas demais para serem vistas.

Eu destruí aldeias inteiras antes daquele dia. Vi rios secarem, vi criaturas implorarem por misericórdia e vi campeões celebrarem enquanto cidades queimavam. Nada disso me perturbou. Eu acreditava que o sofrimento era apenas o preço inevitável da ascensão. Que os fracos existiam para serem consumidos pelos fortes.

Foi isso que Borys nos ensinou, foi isso que eu ensinei aos outros. Mas naquela floresta… nada lutava contra nós.

As árvores permaneciam de pé mesmo enquanto queimavam, então eu ouvi algo. Não era uma voz e nem eram palavras, eu apenas ouvi a Dor.

A natureza não nutre ódio. Ela suporta.

E naquele momento compreendi algo terrível: nós não estávamos conquistando Tyr. Estávamos mutilando algo vivo demais para se defender de nós.

Os Elfos fugiam para proteger sementes. Sementes! Enquanto nós erguíamos impérios com sangue, eles protegiam vida pequena o suficiente para caber entre os dedos. E ainda assim… sobreviveriam a nós.

Lembro-me de observar um deles morrer ajoelhado sobre as raízes de uma árvore partida ao meio. Mesmo ferido, ele tentou cobrir a terra com as próprias mãos, como se pudesse proteger o solo do que havíamos nos tornado.

Eu deveria ter sentido desprezo, mas em vez disso… senti vergonha.

Às vezes ainda escuto os gritos daqueles que queimaram sob minhas ordens. Outras vezes, escuto algo pior: Silêncio. O silêncio das florestas que nunca voltarão.

Naquela noite ordenei que apagassem as fogueiras do acampamento. Disse aos outros que a fumaça denunciaria nossa posição. Mentira. Eu apenas não suportava mais o cheiro da madeira queimando. Desde então, algo mudou dentro de mim.

A corrupção ainda existe. Percebi que ela não abandona aqueles que a utilizam. Ela se acomoda entre pensamentos gentis e começa a justificar pequenas crueldades. Quando percebemos, já estamos defendendo monstruosidades em nome de um amanhã melhor.

Consigo senti-la percorrendo meus pensamentos como água escura infiltrando rachaduras em pedra antiga. Ela sussurra justificativas suaves. Diz que todo sofrimento possui propósito. Diz que o poder apenas pertence àqueles dispostos a carregá-lo.

E o mais terrível é que parte de mim ainda acredita nisso. Talvez seja esse o verdadeiro veneno. Não a fome por destruição… mas a capacidade de transformar mal em necessidade.

Tenho observado a floresta em silêncio desde então. Há uma violência na natureza, mas ela nunca destrói além do necessário para continuar vivendo. Lobos caçam porque sentem fome. Raízes rompem pedra porque precisam alcançar água. Até a tempestade sabe a hora de cessar.

Nós não. Nós devastamos porque podemos.

Começo a acreditar que exista algo nobre na preservação. Não como fraqueza, nem como passividade, mas como escolha. A escolha de permitir que algo continue existindo mesmo quando seria mais fácil consumir.

Não sei o que farei com esses pensamentos. Talvez eles desapareçam com o tempo. Talvez eu também desapareça. Mas pela primeira vez em muitos anos, caminhei entre árvores sem desejar dominá-las.

E isso me assustou mais do que qualquer batalha.

Este é meu último relato como Lalali-Puy, o Flagelo dos Elfos. Que esse título desapareça junto das cinzas que deixou para trás.

Renuncio ao título de campeã concedido por Borys de Ebe.

Se ainda existir algo em mim digno de permanecer, que seja lembrado não pela destruição, mas pela chuva, que faz vida renascer onde antes havia morte.

Lalali-Puy,
a Chuva Eterna.`
    }
];
