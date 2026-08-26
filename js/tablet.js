// ===== TABLET EXPERIENCE MODULE =====
// Ativo apenas em telas tablet (600px - 1024px)
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
        return w >= 600 && w <= 1366;
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
        }
    }

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
            header.innerHTML = '<span>' + section.title + ' <small style="color:#888;font-size:12px;">(' + section.items.length + ')</small></span><span class="t-arrow">&#9654;</span>';
            header.addEventListener('click', function() {
                header.classList.toggle('open');
                var list = header.nextElementSibling;
                list.classList.toggle('open');
            });

            var list = document.createElement('div');
            list.className = 'tablet-wiki-section-list';

            section.items.forEach(function(item) {
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
                    onWikiItemClick(item);
                });
                list.appendChild(el);
            });

            sectionEl.appendChild(header);
            sectionEl.appendChild(list);
            container.appendChild(sectionEl);
        });
    }

    // ===== ITEM DATA BUILDERS =====
    function getCharacterItems() {
        if (typeof characters === 'undefined') return [];
        return characters.map(function(c, i) {
            return {
                name: c.name,
                subtitle: c.title,
                image: c.image ? getEntityDefaultImageSafe(c) : null,
                type: 'character',
                index: i
            };
        });
    }

    function getHistoricalItems() {
        if (typeof historicalNPCs === 'undefined') return [];
        return historicalNPCs.map(function(n, i) {
            return {
                name: n.name,
                subtitle: n.title,
                image: n.image ? getEntityDefaultImageSafe(n) : null,
                type: 'historical',
                index: i
            };
        });
    }

    function getAllyItems() {
        if (typeof allies === 'undefined') return [];
        return allies.map(function(a, i) {
            return {
                name: a.name,
                subtitle: a.title,
                image: a.image ? getEntityDefaultImageSafe(a) : null,
                type: 'ally',
                index: i
            };
        });
    }

    function getLegionItems() {
        if (typeof legion === 'undefined') return [];
        return legion.map(function(m, i) {
            return {
                name: m.name,
                subtitle: m.title,
                image: m.image ? getEntityDefaultImageSafe(m) : null,
                type: 'legion',
                index: i
            };
        });
    }

    function getVillainItems() {
        if (typeof villains === 'undefined') return [];
        return villains.map(function(v, i) {
            return {
                name: v.name,
                subtitle: v.title + (v.location ? ' — ' + v.location : ''),
                image: v.image ? getEntityDefaultImageSafe(v) : null,
                type: 'villain',
                index: i
            };
        });
    }

    function getLocationItems() {
        if (typeof cities === 'undefined') return [];
        return Object.keys(cities).map(function(id) {
            var c = cities[id];
            return {
                name: c.displayName || id,
                subtitle: c.region,
                image: c.image || null,
                type: 'location',
                index: id
            };
        });
    }

    function getArtifactItems() {
        if (typeof artifacts === 'undefined') return [];
        return artifacts.map(function(a, i) {
            return {
                name: a.name,
                subtitle: 'Artefato',
                image: a.image ? getEntityDefaultImageSafe(a) : null,
                type: 'artifact',
                index: i
            };
        });
    }

    function getBookItems() {
        if (typeof books === 'undefined') return [];
        return books.map(function(b, i) {
            return {
                name: b.name,
                subtitle: 'Livro / Relato',
                image: b.image ? getEntityDefaultImageSafe(b) : null,
                type: 'book',
                index: i
            };
        });
    }

    function getLandmarkItems() {
        if (typeof landmarks === 'undefined') return [];
        return landmarks.map(function(l, i) {
            return {
                name: l.name,
                subtitle: 'Marco Histórico',
                image: null,
                type: 'landmark',
                index: i
            };
        });
    }

    function getSessionItems() {
        if (typeof wikiSessions === 'undefined') return [];
        return wikiSessions.map(function(s, i) {
            return {
                name: s.title,
                subtitle: s.journeyKey || '',
                image: null,
                type: 'session',
                index: i
            };
        });
    }

    function getEntityDefaultImageSafe(entity) {
        if (typeof getEntityDefaultImage === 'function') {
            return getEntityDefaultImage(entity);
        }
        return entity.image || '';
    }

    // ===== WIKI ITEM CLICK =====
    function onWikiItemClick(item) {
        // Marcar ativo
        document.querySelectorAll('.tablet-wiki-item').forEach(function(el) {
            el.classList.remove('active');
        });
        var clicked = document.querySelector('.tablet-wiki-item[data-type="' + item.type + '"][data-index="' + item.index + '"]');
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
                region = villain.title + ' — ' + villain.location;
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
        if (entity.image) {
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

    function showBottomSheet(name, region, html) {
        if (!sheetEl) return;

        if (sheetName) sheetName.textContent = name;
        if (sheetRegion) sheetRegion.textContent = region;
        if (sheetBody) sheetBody.innerHTML = html;

        // Abrir no estado half por padrão
        setSheetState('half');
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
                        showBottomSheet(name, region, html);

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
