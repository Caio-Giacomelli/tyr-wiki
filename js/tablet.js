// ===== TABLET EXPERIENCE MODULE =====
// Ativo em telas tablet e celular (até 1366px)
// Gerencia: navegação, wiki view, bottom-sheet, jornada tablet

(function() {
    'use strict';

    let tabletInitialized = false;
    let currentView = 'map'; // 'map' | 'wiki' | 'journey'

    function debounce(fn, ms) {
        let timer;
        return function() {
            clearTimeout(timer);
            timer = setTimeout(fn, ms);
        };
    }

    // ===== DETECÇÃO DE TABLET =====
    function isTablet() {
        const w = window.innerWidth;
        // Modo tablet/mobile só em dispositivos de toque (pointer: coarse) com largura
        // até 1366px. Notebook/desktop usam mouse (pointer: fine) e ficam sempre no modo
        // computador, mesmo em telas pequenas. Espelha a media query do CSS.
        let isTouch = true;
        if (window.matchMedia) {
            isTouch = window.matchMedia('(pointer: coarse)').matches;
        }
        return isTouch && w <= 1366;
    }

    // Se não é tablet, não inicializar (mas observar resize)
    if (!isTablet()) {
        window.addEventListener('resize', debounce(function() {
            if (isTablet() && !tabletInitialized) {
                initTablet();
            }
        }, 300));
        return;
    }

    // ===== INICIALIZAÇÃO =====
    function initTablet() {
        if (tabletInitialized) return;
        tabletInitialized = true;

        initNavigation();
        initWikiView();
        initBottomSheet();
        interceptInfoPanel();

        console.log('[Tablet] Experiência tablet inicializada');
    }

    // ===== NAVEGAÇÃO (BOTTOM NAV BAR) =====

    function initNavigation() {
        const navMap = document.getElementById('tablet-nav-map');
        const navWiki = document.getElementById('tablet-nav-wiki');
        const navSheet = document.getElementById('tablet-nav-sheet');

        if (!navMap || !navWiki) return;

        navMap.addEventListener('click', function() { switchView('map'); });
        navWiki.addEventListener('click', function() { switchView('wiki'); });
        if (navSheet) navSheet.addEventListener('click', function() { switchView('charsheet'); });
        var navSheet2 = document.getElementById('tablet-nav-sheet2');
        if (navSheet2) navSheet2.addEventListener('click', function() { switchView('charsheet2'); });

        // Modo Mestre (Revelacoes): abre o overlay, nao troca de view.
        var navMaster = document.getElementById('tablet-nav-master');
        if (navMaster) navMaster.addEventListener('click', function() {
            if (typeof window.openMasterMode === 'function') window.openMasterMode();
        });
    }

    function switchView(view) {
        currentView = view;

        // Atualizar botões
        document.querySelectorAll('.tablet-nav-btn').forEach(function(btn) {
            btn.classList.remove('active');
        });

        const wikiView = document.getElementById('tablet-wiki-view');
        const mapContainer = document.getElementById('map-container');
        const charsheetOverlay = document.getElementById('charsheet-overlay');
        // Ficha v2: fechar ao sair dela (salva pendencias antes)
        if (view !== 'charsheet2' && typeof window.closeCharsheetV2 === 'function') window.closeCharsheetV2();

        switch (view) {
            case 'map':
                document.getElementById('tablet-nav-map').classList.add('active');
                if (wikiView) wikiView.classList.remove('active');
                if (mapContainer) mapContainer.style.display = '';
                if (charsheetOverlay) charsheetOverlay.classList.remove('open');
                showMapControls(true);
                break;

            case 'wiki':
                document.getElementById('tablet-nav-wiki').classList.add('active');
                // Garantir que a lista reflete os dados atuais (Firestore, edicoes, exclusoes)
                rebuildWiki();
                if (wikiView) wikiView.classList.add('active');
                if (mapContainer) mapContainer.style.display = 'none';
                if (charsheetOverlay) charsheetOverlay.classList.remove('open');
                closeBottomSheet();
                showMapControls(false);
                break;

            case 'charsheet':
                document.getElementById('tablet-nav-sheet').classList.add('active');
                if (wikiView) wikiView.classList.remove('active');
                if (mapContainer) mapContainer.style.display = 'none';
                if (typeof openCharsheetOverlay === 'function') openCharsheetOverlay();
                closeBottomSheet();
                showMapControls(false);
                break;

            case 'charsheet2':
                document.getElementById('tablet-nav-sheet2').classList.add('active');
                if (wikiView) wikiView.classList.remove('active');
                if (mapContainer) mapContainer.style.display = 'none';
                if (charsheetOverlay) charsheetOverlay.classList.remove('open');
                if (typeof window.openCharsheetV2 === 'function') window.openCharsheetV2();
                closeBottomSheet();
                showMapControls(false);
                break;
        }
    }

    // Exposto para a Ficha v2 poder trocar de view (ex.: abrir a ficha antiga).
    window.tabletSwitchView = switchView;

    function showMapControls(show) {
        var zoomControls = document.getElementById('zoom-controls');
        var trailBtn = document.getElementById('trail-btn');
        if (zoomControls) zoomControls.style.display = show ? '' : 'none';
        if (trailBtn) trailBtn.style.display = show ? '' : 'none';
    }

    // ===== WIKI VIEW =====
    function initWikiView() {
        var content = document.getElementById('tablet-wiki-content');
        var searchInput = document.getElementById('tablet-wiki-search');
        if (!content) return;

        buildWikiSections(content);

        // Pesquisa
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                filterWikiItems(e.target.value.toLowerCase().trim());
            });
        }
    }

    // Reconstroi a lista a partir dos dados ATUAIS, preservando secoes abertas, a
    // pesquisa e a rolagem. Os arrays da wiki sao reconstruidos quando o Firestore
    // carrega (e a cada criacao/edicao/exclusao), entao a lista montada na
    // inicializacao fica desatualizada: indices trocados e paginas faltando.
    function rebuildWiki() {
        var content = document.getElementById('tablet-wiki-content');
        if (!content) return;

        var openTitles = {};
        content.querySelectorAll('.tablet-wiki-section-header.open').forEach(function(h) {
            openTitles[h.dataset.title] = true;
        });
        var scrollTop = content.scrollTop;

        buildWikiSections(content);

        var searchInput = document.getElementById('tablet-wiki-search');
        var query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        if (query) {
            filterWikiItems(query);
        } else {
            content.querySelectorAll('.tablet-wiki-section-header').forEach(function(h) {
                if (!openTitles[h.dataset.title]) return;
                h.classList.add('open');
                h.nextElementSibling.classList.add('open');
            });
        }
        content.scrollTop = scrollTop;
    }

    // Chamado por firebase-edit.js / app.js sempre que os dados da wiki mudam.
    window.rebuildTabletWiki = debounce(function() {
        if (tabletInitialized) rebuildWiki();
    }, 50);

    function buildWikiSections(container) {
        container.innerHTML = '';

        var sections = [
            { title: 'Personagens', items: getCharacterItems() },
            { title: 'Personagens Históricos', items: getHistoricalItems() },
            { title: 'Aliados', items: getAllyItems() },
            { title: 'Legião da Estrela da Manhã', items: getLegionItems() },
            { title: 'Vilões', items: getVillainItems() },
            { title: 'Locais', items: getLocationItems() },
            { title: 'Artefatos', items: getArtifactItems() },
            { title: 'Livros e Relatos', items: getBookItems() },
            { title: 'Marcos Históricos', items: getLandmarkItems() },
            { title: 'Resumo das Sessões', items: getSessionItems() }
        ];

        sections.forEach(function(section) {
            if (!section.items || section.items.length === 0) return;

            var sectionEl = document.createElement('div');
            sectionEl.className = 'tablet-wiki-section';

            var header = document.createElement('div');
            header.className = 'tablet-wiki-section-header';
            header.dataset.title = section.title;
            header.innerHTML = '<span>' + section.title + ' <small style="color:#888;font-size:12px;">(' + section.items.length + ')</small></span><span class="t-arrow">&#9654;</span>';
            header.addEventListener('click', function() {
                header.classList.toggle('open');
                var list = header.nextElementSibling;
                list.classList.toggle('open');
            });

            var list = document.createElement('div');
            list.className = 'tablet-wiki-section-list';

            var lastGroup = null;
            section.items.forEach(function(item) {
                // Sub-cabecalho (ex.: sessoes agrupadas por jornada, como no desktop)
                if (item.group && item.group !== lastGroup) {
                    lastGroup = item.group;
                    var sub = document.createElement('div');
                    sub.className = 'tablet-wiki-sub-header';
                    sub.textContent = item.group;
                    list.appendChild(sub);
                }
                var el = document.createElement('div');
                el.className = 'tablet-wiki-item';
                el.dataset.searchName = item.name.toLowerCase();
                el.dataset.type = item.type;
                el.dataset.index = item.index;

                var html = '';
                if (item.image) {
                    html += '<img class="tablet-wiki-item-thumb" src="' + item.image + '" alt="" loading="lazy">';
                }
                html += '<div class="tablet-wiki-item-name">' + item.name;
                if (item.subtitle) {
                    html += '<div class="tablet-wiki-item-subtitle">' + item.subtitle + '</div>';
                }
                html += '</div>';

                el.innerHTML = html;
                el.addEventListener('click', function() {
                    onWikiItemClick(item, el);
                });
                list.appendChild(el);
            });

            sectionEl.appendChild(header);
            sectionEl.appendChild(list);
            container.appendChild(sectionEl);
        });
    }

    // ===== ITEM DATA BUILDERS =====
    // Cada item guarda a referencia do objeto (entity) e do array (arr): o indice e
    // recalculado no clique, pois os arrays podem ser reconstruidos depois.
    function getEntityItems(arr, type, subtitleFn) {
        if (!arr) return [];
        return arr.map(function(e, i) {
            if (!e || !e.name) return null;
            return {
                name: e.name,
                subtitle: subtitleFn(e),
                image: e.image ? getEntityDefaultImageSafe(e) : null,
                type: type,
                index: i,
                entity: e,
                arr: arr
            };
        }).filter(Boolean);
    }

    function titleOf(e) { return e.title || ''; }

    function getCharacterItems() {
        return getEntityItems(typeof characters !== 'undefined' ? characters : null, 'character', titleOf);
    }

    function getHistoricalItems() {
        return getEntityItems(typeof historicalNPCs !== 'undefined' ? historicalNPCs : null, 'historical', titleOf);
    }

    function getAllyItems() {
        return getEntityItems(typeof allies !== 'undefined' ? allies : null, 'ally', titleOf);
    }

    function getLegionItems() {
        return getEntityItems(typeof legion !== 'undefined' ? legion : null, 'legion', titleOf);
    }

    function getVillainItems() {
        return getEntityItems(typeof villains !== 'undefined' ? villains : null, 'villain', function(v) {
            return (v.title || '') + (v.location ? ' — ' + v.location : '');
        });
    }

    function getLocationItems() {
        if (typeof cities === 'undefined') return [];
        return Object.keys(cities).map(function(id) {
            var c = cities[id];
            if (!c) return null;
            return {
                name: c.displayName || id,
                subtitle: c.region,
                image: c.image || null,
                type: 'location',
                index: id
            };
        }).filter(Boolean);
    }

    function getArtifactItems() {
        return getEntityItems(typeof artifacts !== 'undefined' ? artifacts : null, 'artifact', function() { return 'Artefato'; });
    }

    function getBookItems() {
        return getEntityItems(typeof books !== 'undefined' ? books : null, 'book', function() { return 'Livro / Relato'; });
    }

    function getLandmarkItems() {
        return getEntityItems(typeof landmarks !== 'undefined' ? landmarks : null, 'landmark', function() { return 'Marco Histórico'; })
            .map(function(item) { item.image = null; return item; });
    }

    // Sessoes agrupadas por jornada e em ordem natural, igual ao menu do desktop.
    function getSessionItems() {
        if (typeof wikiSessions === 'undefined') return [];
        var groups = {};
        var order = [];
        wikiSessions.forEach(function(s, i) {
            if (!s || !s.title) return;
            var key = s.journeyKey || 'outros';
            if (!groups[key]) { groups[key] = []; order.push(key); }
            groups[key].push({ session: s, index: i });
        });

        var items = [];
        order.forEach(function(key) {
            if (typeof compareSessions === 'function') {
                groups[key].sort(function(x, y) { return compareSessions(x.session, y.session); });
            }
            var config = typeof journeyConfigs !== 'undefined' ? journeyConfigs[key] : null;
            var journeyName = config && config.displayName ? config.displayName : key;
            groups[key].forEach(function(g) {
                items.push({
                    name: g.session.title,
                    subtitle: '',
                    image: null,
                    type: 'session',
                    index: g.index,
                    entity: g.session,
                    arr: wikiSessions,
                    group: journeyName
                });
            });
        });
        return items;
    }

    function getEntityDefaultImageSafe(entity) {
        if (typeof getEntityDefaultImage === 'function') {
            return getEntityDefaultImage(entity);
        }
        return entity.image || '';
    }

    // ===== WIKI ITEM CLICK =====
    function onWikiItemClick(item, clicked) {
        // Recalcular o indice pelo objeto: o array pode ter sido reconstruido desde que
        // a lista foi montada, e o indice fixo abriria a pagina errada.
        if (item.arr) {
            var liveIndex = item.arr.indexOf(item.entity);
            if (liveIndex < 0) {
                // A entrada nao existe mais (dados recarregados): atualizar a lista.
                rebuildWiki();
                return;
            }
            item.index = liveIndex;
        } else if (item.type === 'location' && (typeof cities === 'undefined' || !cities[item.index])) {
            rebuildWiki();
            return;
        }

        // Marcar ativo
        document.querySelectorAll('.tablet-wiki-item').forEach(function(el) {
            el.classList.remove('active');
        });
        if (clicked) clicked.classList.add('active');

        // Para locais, mudar para o mapa e selecionar a cidade
        if (item.type === 'location') {
            switchView('map');
            setTimeout(function() {
                if (typeof selectCity === 'function') {
                    selectCity(item.index);
                }
            }, 150);
            return;
        }

        // Para outros itens, mostrar no bottom-sheet e mudar para mapa
        var content = getItemContent(item);
        if (content) {
            switchView('map');
            setTimeout(function() {
                showBottomSheet(content.name, content.region, content.html);
            }, 100);
        }
    }

    function getItemContent(item) {
        var name = '', region = '', html = '';

        switch (item.type) {
            case 'character':
                if (typeof characters === 'undefined') return null;
                var char = characters[item.index];
                name = char.name;
                region = char.title;
                html = buildEntityHtml(char, 'characters[' + item.index + ']', 'characters', item.index);
                break;

            case 'historical':
                if (typeof historicalNPCs === 'undefined') return null;
                var npc = historicalNPCs[item.index];
                name = npc.name;
                region = npc.title;
                html = buildEntityHtml(npc, 'historicalNPCs[' + item.index + ']', 'historicalNPCs', item.index);
                break;

            case 'ally':
                if (typeof allies === 'undefined') return null;
                var ally = allies[item.index];
                name = ally.name;
                region = ally.title;
                html = buildEntityHtml(ally, 'allies[' + item.index + ']', 'allies', item.index);
                break;

            case 'legion':
                if (typeof legion === 'undefined') return null;
                var member = legion[item.index];
                name = member.name;
                region = member.title;
                html = buildEntityHtml(member, 'legion[' + item.index + ']', 'legion', item.index);
                break;

            case 'villain':
                if (typeof villains === 'undefined') return null;
                var villain = villains[item.index];
                name = villain.name;
                region = villain.location ? villain.title + ' — ' + villain.location : villain.title;
                html = buildEntityHtml(villain, 'villains[' + item.index + ']', 'villains', item.index);
                break;

            case 'location':
                if (typeof cities === 'undefined') return null;
                var city = cities[item.index];
                name = city.displayName || item.index;
                region = city.region;
                html = '';
                if (city.image) html += buildPortraitHtmlSafe(city, 'cities["' + item.index + '"]', 'cities', item.index);
                html += '<div class="info-section"><h3>Descrição</h3><p>' + linkifyWrap(city.description) + '</p></div>';
                html += '<div class="info-section"><h3>Governo</h3><p>' + (city.government || '') + '</p></div>';
                html += '<div class="info-section"><h3>Pontos de Interesse</h3><ul>' + (city.features || []).map(function(f) { return '<li>' + linkifyWrap(f) + '</li>'; }).join('') + '</ul></div>';
                html += '<div class="info-section"><h3>Notas do Mestre</h3><p>' + linkifyWrap(city.notes || '') + '</p></div>';
                break;

            case 'artifact':
                if (typeof artifacts === 'undefined') return null;
                var art = artifacts[item.index];
                name = art.name;
                region = 'Artefato';
                html = buildEntityHtml(art, 'artifacts[' + item.index + ']', 'artifacts', item.index);
                break;

            case 'book':
                if (typeof books === 'undefined') return null;
                var book = books[item.index];
                name = book.name;
                region = 'Livro / Relato';
                html = buildEntityHtml(book, 'books[' + item.index + ']', 'books', item.index);
                if (book.fullText) {
                    html += '<button class="tablet-read-full-btn" onclick="if(typeof openBookModal===\'function\')openBookModal(' + item.index + ')">Ler na Íntegra</button>';
                }
                break;

            case 'landmark':
                if (typeof landmarks === 'undefined') return null;
                var lm = landmarks[item.index];
                name = lm.name;
                region = 'Marco Histórico';
                html = '<div class="info-section"><h3>Descrição</h3><p>' + linkifyWrap(lm.description) + '</p></div>';
                html += '<div class="info-section"><h3>Detalhes</h3><ul>' + (lm.details || []).map(function(d) { return '<li>' + linkifyWrap(d) + '</li>'; }).join('') + '</ul></div>';
                break;

            case 'session':
                if (typeof wikiSessions === 'undefined') return null;
                var sess = wikiSessions[item.index];
                name = sess.title;
                region = sess.journeyKey || '';
                html = '';
                if (sess.quote) html += '<div class="session-quote">"' + sess.quote + '"' + (sess.quoteAuthor ? ' — ' + sess.quoteAuthor : '') + '</div>';
                if (sess.content) html += '<div class="info-section"><p>' + linkifyWrap(sess.content) + '</p></div>';
                if (sess.fullText) {
                    html += '<button class="tablet-read-full-btn" onclick="if(typeof showSessionPageInfo===\'function\')showSessionPageInfo(' + item.index + ')">Ver Detalhes</button>';
                }
                break;

            default:
                return null;
        }

        return { name: name, region: region, html: html };
    }

    function buildEntityHtml(entity, entityRef, collection, docId) {
        var html = '';
        var showPortrait = (typeof hasPortrait === 'function') ? hasPortrait(entity) : !!entity.image;
        if (showPortrait) {
            html += buildPortraitHtmlSafe(entity, entityRef, collection, docId);
        }
        html += '<div class="info-section"><h3>Descrição</h3><p>' + linkifyWrap(entity.description || '') + '</p></div>';
        if (entity.details && entity.details.length > 0) {
            html += '<div class="info-section"><h3>Detalhes</h3><ul>' + entity.details.map(function(d) { return '<li>' + linkifyWrap(d) + '</li>'; }).join('') + '</ul></div>';
        }
        return html;
    }

    function buildPortraitHtmlSafe(entity, entityRef, collection, docId) {
        if (typeof buildPortraitHtml === 'function') {
            return buildPortraitHtml(entity, entityRef, collection, docId);
        }
        // Fallback simples
        var img = entity.image || '';
        if (typeof getEntityDefaultImage === 'function') img = getEntityDefaultImage(entity);
        return '<div class="portrait-wrapper"><div class="portrait-container"><img class="info-portrait" src="' + img + '" alt="' + (entity.name || '') + '"></div></div>';
    }

    function linkifyWrap(text) {
        if (!text) return '';
        if (typeof linkifyLocations === 'function') return linkifyLocations(text);
        return text;
    }

    // ===== PESQUISA WIKI =====
    function filterWikiItems(query) {
        var items = document.querySelectorAll('.tablet-wiki-item');
        var sections = document.querySelectorAll('.tablet-wiki-section');

        // Sub-cabecalhos (jornadas) so aparecem fora da pesquisa
        document.querySelectorAll('.tablet-wiki-sub-header').forEach(function(sub) {
            sub.style.display = query ? 'none' : '';
        });

        if (!query) {
            items.forEach(function(item) { item.classList.remove('hidden'); });
            sections.forEach(function(sec) {
                var header = sec.querySelector('.tablet-wiki-section-header');
                var list = sec.querySelector('.tablet-wiki-section-list');
                if (header) header.classList.remove('open');
                if (list) list.classList.remove('open');
            });
            return;
        }

        items.forEach(function(item) {
            var name = item.dataset.searchName || '';
            if (name.includes(query)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });

        // Abrir seções que têm itens visíveis
        sections.forEach(function(sec) {
            var list = sec.querySelector('.tablet-wiki-section-list');
            var header = sec.querySelector('.tablet-wiki-section-header');
            if (!list) return;
            var visible = list.querySelectorAll('.tablet-wiki-item:not(.hidden)');
            if (visible.length > 0) {
                if (header) header.classList.add('open');
                list.classList.add('open');
            } else {
                if (header) header.classList.remove('open');
                list.classList.remove('open');
            }
        });
    }

    // ===== BOTTOM SHEET =====
    var sheetState = 'closed'; // 'closed' | 'peek' | 'half' | 'full'
    var sheetEl, sheetHandle, sheetBody, sheetName, sheetRegion;
    var touchStartY = 0, touchStartHeight = 0, isDraggingSheet = false;

    function initBottomSheet() {
        sheetEl = document.getElementById('tablet-bottom-sheet');
        sheetHandle = document.getElementById('tablet-sheet-handle');
        sheetBody = document.getElementById('tablet-sheet-body');
        sheetName = document.getElementById('tablet-sheet-name');
        sheetRegion = document.getElementById('tablet-sheet-region');

        if (!sheetEl || !sheetHandle) return;

        var closeBtn = document.getElementById('tablet-sheet-close');
        var expandBtn = document.getElementById('tablet-sheet-expand');

        if (closeBtn) closeBtn.addEventListener('click', closeBottomSheet);
        if (expandBtn) expandBtn.addEventListener('click', toggleSheetExpand);

        // Touch drag no handle
        sheetHandle.addEventListener('touchstart', onSheetTouchStart, { passive: true });
        document.addEventListener('touchmove', onSheetTouchMove, { passive: false });
        document.addEventListener('touchend', onSheetTouchEnd, { passive: true });

        // Click no handle para expandir/recolher
        sheetHandle.addEventListener('click', function() {
            if (sheetState === 'peek') setSheetState('half');
            else if (sheetState === 'half') setSheetState('full');
            else if (sheetState === 'full') setSheetState('half');
        });
    }

    function showBottomSheet(name, region, html, state) {
        if (!sheetEl) return;

        if (sheetName) sheetName.textContent = name;
        if (sheetRegion) sheetRegion.textContent = region;
        if (sheetBody) sheetBody.innerHTML = html;

        // Estado padrão 'half'; chamador pode pedir 'peek' (ex.: jornada) para não tapar o mapa.
        setSheetState(state || 'half');
    }

    function closeBottomSheet() {
        setSheetState('closed');
    }

    function toggleSheetExpand() {
        if (sheetState === 'full') setSheetState('half');
        else setSheetState('full');
    }

    function setSheetState(state) {
        if (!sheetEl) return;
        sheetEl.classList.remove('peek', 'half', 'full');
        if (state !== 'closed') {
            sheetEl.classList.add(state);
        }
        sheetState = state;
    }

    // Touch handling para swipe no sheet
    function onSheetTouchStart(e) {
        if (e.touches.length !== 1) return;
        isDraggingSheet = true;
        touchStartY = e.touches[0].clientY;
        touchStartHeight = sheetEl.offsetHeight;
        sheetEl.style.transition = 'none';
    }

    function onSheetTouchMove(e) {
        if (!isDraggingSheet) return;
        var deltaY = touchStartY - e.touches[0].clientY;
        var newHeight = Math.max(0, touchStartHeight + deltaY);
        var maxHeight = window.innerHeight - 60;
        newHeight = Math.min(newHeight, maxHeight);
        sheetEl.style.height = newHeight + 'px';
        e.preventDefault();
    }

    function onSheetTouchEnd() {
        if (!isDraggingSheet) return;
        isDraggingSheet = false;
        sheetEl.style.transition = '';
        sheetEl.style.height = '';

        var currentHeight = sheetEl.offsetHeight;
        var viewHeight = window.innerHeight - 60;

        // Snap para o estado mais próximo
        if (currentHeight < 80) {
            setSheetState('closed');
        } else if (currentHeight < viewHeight * 0.3) {
            setSheetState('peek');
        } else if (currentHeight < viewHeight * 0.7) {
            setSheetState('half');
        } else {
            setSheetState('full');
        }
    }

    // ===== INTERCEPTAR INFO PANEL (desktop) PARA TABLET =====
    function interceptInfoPanel() {
        // Observar quando o info-panel recebe a classe 'open' e redirecionar para o bottom-sheet
        var infoPanel = document.getElementById('info-panel');
        if (!infoPanel) return;

        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (infoPanel.classList.contains('open') && isTablet()) {
                        // Copiar conteúdo do info-panel para o bottom-sheet
                        var name = document.getElementById('city-name').textContent;
                        var region = document.getElementById('city-region').textContent;
                        var html = document.getElementById('city-info').innerHTML;

                        // Durante a jornada, abrir discreto (peek) para deixar o mapa e a
                        // animacao visiveis. O usuario arrasta o sheet para cima se quiser ler mais.
                        var sheetState = window._journeyActive ? 'peek' : 'half';
                        showBottomSheet(name, region, html, sheetState);

                        // Mudar para view mapa se não estiver
                        if (currentView !== 'map' && currentView !== 'journey') {
                            switchView('map');
                        }
                    }
                }
            });
        });

        observer.observe(infoPanel, { attributes: true });
    }

    // ===== BOTÃO "LER NA ÍNTEGRA" STYLE =====
    // Adicionar estilo inline para o botão (evita adicionar mais CSS)
    var style = document.createElement('style');
    style.textContent = '.tablet-read-full-btn { margin-top: 12px; padding: 8px 16px; font-family: "MedievalSharp", cursive; font-size: 13px; background: rgba(139, 105, 20, 0.3); border: 1px solid #8b6914; border-radius: 6px; color: #d4a843; cursor: pointer; transition: background 0.2s; display: block; } .tablet-read-full-btn:hover { background: rgba(139, 105, 20, 0.5); }';
    document.head.appendChild(style);

    // ===== INICIAR =====
    // Aguardar DOM completo e dados carregados
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initTablet, 100);
        });
    } else {
        setTimeout(initTablet, 100);
    }

    // Re-checar em resize
    window.addEventListener('resize', debounce(function() {
        if (isTablet() && !tabletInitialized) {
            initTablet();
        }
    }, 300));

})();
