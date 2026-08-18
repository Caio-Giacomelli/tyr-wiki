// ===== VARIÁVEIS GLOBAIS =====
const mapContainer = document.getElementById('map-container');
const mapWrapper = document.getElementById('map-wrapper');
const mapSvg = document.getElementById('map-svg');
const infoPanel = document.getElementById('info-panel');
const instructions = document.getElementById('instructions');

let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let startX, startY;
let lastTranslateX, lastTranslateY;
let svgDoc = null;

// ===== INICIALIZAR SVG =====
function initSvg() {
    svgDoc = mapSvg.contentDocument;
    if (!svgDoc) return;

    // Configurar cada cidade como clicável
    cityIds.forEach(id => {
        const group = svgDoc.getElementById(id);
        if (group) {
            group.style.cursor = 'pointer';
            group.style.transition = 'filter 0.3s ease';

            group.addEventListener('mouseenter', () => {
                if (!group.classList.contains('active')) {
                    group.style.filter = 'brightness(1.15)';
                }
            });

            group.addEventListener('mouseleave', () => {
                if (!group.classList.contains('active')) {
                    group.style.filter = '';
                }
            });

            group.addEventListener('click', (e) => {
                e.stopPropagation();
                selectCity(id);
            });
        }
    });

    // Clique no fundo para desselecionar
    svgDoc.addEventListener('click', (e) => {
        let isCity = false;
        cityIds.forEach(id => {
            const group = svgDoc.getElementById(id);
            if (group && group.contains(e.target)) {
                isCity = true;
            }
        });
        if (!isCity) {
            deselectAll();
        }
    });

    // Injetar estilos no SVG
    const style = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
        .city-dimmed {
            opacity: 0.3;
            transition: opacity 0.4s ease;
        }
        .city-highlighted {
            opacity: 1;
            filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.5));
            transition: opacity 0.4s ease, filter 0.4s ease;
        }
        .city-normal {
            transition: opacity 0.4s ease;
        }
    `;
    svgDoc.querySelector('svg').appendChild(style);

    // Criar overlay escuro
    const svgEl = svgDoc.querySelector('svg');
    const overlay = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    overlay.setAttribute('id', 'dim-overlay');
    overlay.setAttribute('width', '100%');
    overlay.setAttribute('height', '100%');
    overlay.setAttribute('fill', 'rgba(0, 0, 0, 0.55)');
    overlay.setAttribute('pointer-events', 'none');
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.4s ease';
    svgEl.appendChild(overlay);

    // Propagar scroll/wheel do SVG para o zoom do mapa
    svgDoc.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = mapContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const prevScale = scale;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        scale = Math.min(Math.max(scale * delta, 0.5), 4);

        translateX = mouseX - (mouseX - translateX) * (scale / prevScale);
        translateY = mouseY - (mouseY - translateY) * (scale / prevScale);

        updateTransform();
    }, { passive: false });

    fitMapToScreen();
}

// Registrar o load event E verificar se já carregou
mapSvg.addEventListener('load', initSvg);
// Se o SVG já estava em cache e carregou antes do script
if (mapSvg.contentDocument && mapSvg.contentDocument.querySelector('svg')) {
    initSvg();
}

// ===== SELEÇÃO DE CIDADES =====
function selectCity(id) {
    const svgEl = svgDoc.querySelector('svg');
    const overlay = svgDoc.getElementById('dim-overlay');

    // Mostrar overlay escuro
    overlay.style.opacity = '1';

    // Desselecionar todos — mover de volta para antes do overlay
    cityIds.forEach(cid => {
        const g = svgDoc.getElementById(cid);
        if (g) {
            g.classList.remove('active', 'city-highlighted');
            g.style.filter = '';
            svgEl.insertBefore(g, overlay);
        }
    });

    // Mover a cidade selecionada para cima do overlay
    const group = svgDoc.getElementById(id);
    if (group) {
        group.classList.add('active', 'city-highlighted');
        svgEl.appendChild(group);
    }

    // Mostrar informações
    showCityInfo(id);
}

function deselectAll() {
    if (svgDoc) {
        const svgEl = svgDoc.querySelector('svg');
        const overlay = svgDoc.getElementById('dim-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
        }

        cityIds.forEach(id => {
            const g = svgDoc.getElementById(id);
            if (g) {
                g.classList.remove('active', 'city-highlighted');
                g.style.filter = '';
                if (overlay) {
                    svgEl.insertBefore(g, overlay);
                }
            }
        });
    }
    infoPanel.classList.remove('open');
}

function showCityInfo(id) {
    const city = cities[id];
    if (!city) return;

    const name = city.displayName || id;
    document.getElementById('city-name').textContent = name;
    document.getElementById('city-region').textContent = city.region;

    let html = `
        <div class="info-section">
            <h3>Descrição</h3>
            <p>${linkifyLocations(city.description)}</p>
        </div>
        <div class="info-section">
            <h3>População</h3>
            <p>${city.population}</p>
        </div>
        <div class="info-section">
            <h3>Governo</h3>
            <p>${city.government}</p>
        </div>
        <div class="info-section">
            <h3>Pontos de Interesse</h3>
            <ul>
                ${city.features.map(f => `<li>${linkifyLocations(f)}</li>`).join('')}
            </ul>
        </div>
        <div class="info-section">
            <h3>Notas do Mestre</h3>
            <p>${linkifyLocations(city.notes)}</p>
        </div>
    `;

    document.getElementById('city-info').innerHTML = html;
    infoPanel.classList.add('open');
}

// Fechar painel
document.getElementById('close-panel').addEventListener('click', () => {
    deselectAll();
});

// ===== PAN (ARRASTAR MAPA) =====
mapContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    lastTranslateX = translateX;
    lastTranslateY = translateY;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    translateX = lastTranslateX + (e.clientX - startX);
    translateY = lastTranslateY + (e.clientY - startY);
    updateTransform();
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// ===== ZOOM =====
mapContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = mapContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const prevScale = scale;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.min(Math.max(scale * delta, 0.5), 4);

    translateX = mouseX - (mouseX - translateX) * (scale / prevScale);
    translateY = mouseY - (mouseY - translateY) * (scale / prevScale);

    updateTransform();
});

document.getElementById('zoom-in').addEventListener('click', () => {
    const prevScale = scale;
    scale = Math.min(scale * 1.2, 4);
    const centerX = mapContainer.clientWidth / 2;
    const centerY = mapContainer.clientHeight / 2;
    translateX = centerX - (centerX - translateX) * (scale / prevScale);
    translateY = centerY - (centerY - translateY) * (scale / prevScale);
    updateTransform();
});

document.getElementById('zoom-out').addEventListener('click', () => {
    const prevScale = scale;
    scale = Math.max(scale * 0.8, 0.5);
    const centerX = mapContainer.clientWidth / 2;
    const centerY = mapContainer.clientHeight / 2;
    translateX = centerX - (centerX - translateX) * (scale / prevScale);
    translateY = centerY - (centerY - translateY) * (scale / prevScale);
    updateTransform();
});

document.getElementById('zoom-reset').addEventListener('click', () => {
    fitMapToScreen();
});

function updateTransform() {
    mapWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function fitMapToScreen() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
}

// ===== TOUCH SUPPORT =====
let lastTouchDist = 0;
mapContainer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        lastTranslateX = translateX;
        lastTranslateY = translateY;
    } else if (e.touches.length === 2) {
        isDragging = false;
        lastTouchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }
});

mapContainer.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
        translateX = lastTranslateX + (e.touches[0].clientX - startX);
        translateY = lastTranslateY + (e.touches[0].clientY - startY);
        updateTransform();
    } else if (e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const prevScale = scale;
        scale = Math.min(Math.max(scale * (dist / lastTouchDist), 0.5), 4);
        lastTouchDist = dist;

        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        translateX = centerX - (centerX - translateX) * (scale / prevScale);
        translateY = centerY - (centerY - translateY) * (scale / prevScale);
        updateTransform();
    }
}, { passive: false });

mapContainer.addEventListener('touchend', () => {
    isDragging = false;
});

// Tecla Escape fecha o painel
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        deselectAll();
    }
});

// Esconder instrução após 5 segundos
setTimeout(() => {
    instructions.style.opacity = '0';
    setTimeout(() => instructions.remove(), 2000);
}, 5000);

// ===== WIKI - PERSONAGENS =====
const charactersList = document.getElementById('characters-list');
characters.forEach((char, index) => {
    const item = document.createElement('div');
    item.className = 'wiki-item';
    item.textContent = char.name;
    item.dataset.searchName = char.name.toLowerCase();
    item.addEventListener('click', () => showCharacterInfo(index));
    charactersList.appendChild(item);
});

function showCharacterInfo(index) {
    const char = characters[index];

    document.querySelectorAll('.wiki-item').forEach(i => i.classList.remove('active'));
    charactersList.children[index].classList.add('active');

    // Desselecionar cidades
    if (svgDoc) {
        const svgEl = svgDoc.querySelector('svg');
        const overlay = svgDoc.getElementById('dim-overlay');
        if (overlay) overlay.style.opacity = '0';
        cityIds.forEach(id => {
            const g = svgDoc.getElementById(id);
            if (g) {
                g.classList.remove('active', 'city-highlighted');
                g.style.filter = '';
                if (overlay) svgEl.insertBefore(g, overlay);
            }
        });
    }

    document.getElementById('city-name').textContent = char.name;
    document.getElementById('city-region').textContent = char.title;

    let html = '';

    if (char.image) {
        html += `<img class="info-portrait" src="${char.image}" alt="${char.name}">`;
    }

    html += `
        <div class="info-section">
            <h3>Descrição</h3>
            <p>${linkifyLocations(char.description)}</p>
        </div>
        <div class="info-section">
            <h3>Detalhes</h3>
            <ul>
                ${char.details.map(d => `<li>${linkifyLocations(d)}</li>`).join('')}
            </ul>
        </div>
        <div class="info-section">
            <h3>Ideal</h3>
            <p><em>"${char.ideal}"</em></p>
        </div>
    `;

    document.getElementById('city-info').innerHTML = html;
    infoPanel.classList.add('open');
}

// ===== WIKI - LEGIÃO =====
const legionList = document.getElementById('legion-list');
legion.forEach((member, index) => {
    const item = document.createElement('div');
    item.className = 'wiki-item';
    item.textContent = member.name;
    item.dataset.searchName = member.name.toLowerCase();
    item.addEventListener('click', () => showLegionInfo(index));
    legionList.appendChild(item);
});

function showLegionInfo(index) {
    const member = legion[index];

    document.querySelectorAll('.wiki-item').forEach(i => i.classList.remove('active'));
    legionList.children[index].classList.add('active');

    if (svgDoc) {
        const svgEl = svgDoc.querySelector('svg');
        const overlay = svgDoc.getElementById('dim-overlay');
        if (overlay) overlay.style.opacity = '0';
        cityIds.forEach(id => {
            const g = svgDoc.getElementById(id);
            if (g) {
                g.classList.remove('active', 'city-highlighted');
                g.style.filter = '';
                if (overlay) svgEl.insertBefore(g, overlay);
            }
        });
    }

    document.getElementById('city-name').textContent = member.name;
    document.getElementById('city-region').textContent = member.title;

    let html = '';

    if (member.image) {
        html += `<img class="info-portrait" src="${member.image}" alt="${member.name}">`;
    }

    html += `
        <div class="info-section">
            <h3>Descrição</h3>
            <p>${linkifyLocations(member.description)}</p>
        </div>
        <div class="info-section">
            <h3>Detalhes</h3>
            <ul>
                ${member.details.map(d => `<li>${linkifyLocations(d)}</li>`).join('')}
            </ul>
        </div>
    `;

    document.getElementById('city-info').innerHTML = html;
    infoPanel.classList.add('open');
}

// ===== WIKI - VILÕES =====
const villainsList = document.getElementById('villains-list');
villains.forEach((villain, index) => {
    const item = document.createElement('div');
    item.className = 'wiki-item';
    item.textContent = villain.name;
    item.dataset.searchName = villain.name.toLowerCase();
    item.addEventListener('click', () => showVillainInfo(index));
    villainsList.appendChild(item);
});

function showVillainInfo(index) {
    const villain = villains[index];

    // Marcar item ativo
    document.querySelectorAll('.wiki-item').forEach(i => i.classList.remove('active'));
    villainsList.children[index].classList.add('active');

    // Desselecionar cidades
    if (svgDoc) {
        const svgEl = svgDoc.querySelector('svg');
        const overlay = svgDoc.getElementById('dim-overlay');
        if (overlay) overlay.style.opacity = '0';
        cityIds.forEach(id => {
            const g = svgDoc.getElementById(id);
            if (g) {
                g.classList.remove('active', 'city-highlighted');
                g.style.filter = '';
                if (overlay) svgEl.insertBefore(g, overlay);
            }
        });
    }

    document.getElementById('city-name').textContent = villain.name;
    document.getElementById('city-region').textContent = villain.title + ' — ' + villain.location;

    let html = '';

    if (villain.image) {
        html += `<img class="info-portrait" src="${villain.image}" alt="${villain.name}">`;
    }

    const desc = linkifyLocations(villain.description);
    const details = villain.details.map(d => linkifyLocations(d));

    html += `
        <div class="info-section">
            <h3>Descrição</h3>
            <p>${desc}</p>
        </div>
        <div class="info-section">
            <h3>Detalhes</h3>
            <ul>
                ${details.map(d => `<li>${d}</li>`).join('')}
            </ul>
        </div>
    `;

    document.getElementById('city-info').innerHTML = html;
    infoPanel.classList.add('open');
}

// ===== TOGGLE SEÇÕES WIKI =====
function toggleWikiSection(header) {
    header.classList.toggle('open');
    const list = header.nextElementSibling;
    list.classList.toggle('open');
}

// ===== LINKIFY LOCAIS E PERSONAGENS =====

// Construir mapeamento de nomes de entidades para ações
function buildEntityMap() {
    const map = {};

    // Locais
    Object.keys(locationNameToSvgId).forEach(name => {
        map[name] = { type: 'location', id: locationNameToSvgId[name] };
    });

    // Personagens
    characters.forEach((char, index) => {
        map[char.name] = { type: 'character', index: index };
        // Adicionar primeiro nome também se tiver sobrenome
        const firstName = char.name.split(' ')[0];
        if (firstName !== char.name && firstName.length > 3) {
            if (!map[firstName]) map[firstName] = { type: 'character', index: index };
        }
    });

    // Legião
    legion.forEach((member, index) => {
        map[member.name] = { type: 'legion', index: index };
        const firstName = member.name.split(' ')[0];
        if (firstName !== member.name && firstName.length > 3) {
            if (!map[firstName]) map[firstName] = { type: 'legion', index: index };
        }
    });

    // Vilões
    villains.forEach((villain, index) => {
        map[villain.name] = { type: 'villain', index: index };
        const firstName = villain.name.split(' ')[0];
        if (firstName !== villain.name && firstName.length > 3) {
            if (!map[firstName]) map[villain.name] = { type: 'villain', index: index };
        }
    });

    return map;
}

const entityMap = buildEntityMap();

function linkifyLocations(text) {
    const names = Object.keys(entityMap).sort((a, b) => b.length - a.length);
    let result = text;
    const alreadyLinked = new Set();

    names.forEach(name => {
        const entity = entityMap[name];
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(${escapedName})\\b`, 'g');

        result = result.replace(regex, (match, p1, offset) => {
            // Verificar se estamos dentro de uma tag HTML
            const before = result.substring(0, offset);
            const lastOpen = before.lastIndexOf('<');
            const lastClose = before.lastIndexOf('>');
            if (lastOpen > lastClose) return match;

            // Evitar linkar a mesma entidade múltiplas vezes no mesmo texto
            const key = `${entity.type}-${entity.index || entity.id}`;
            if (alreadyLinked.has(key + '-' + offset)) return match;

            let onclick = '';
            let cssClass = 'map-link';

            switch (entity.type) {
                case 'location':
                    onclick = `highlightLocation('${entity.id}')`;
                    break;
                case 'character':
                    onclick = `showCharacterInfo(${entity.index})`;
                    cssClass = 'wiki-link';
                    break;
                case 'legion':
                    onclick = `showLegionInfo(${entity.index})`;
                    cssClass = 'wiki-link';
                    break;
                case 'villain':
                    onclick = `showVillainInfo(${entity.index})`;
                    cssClass = 'wiki-link';
                    break;
            }

            return `<a class="${cssClass}" href="#" onclick="${onclick}; return false;">${p1}</a>`;
        });
    });

    return result;
}

function highlightLocation(svgId) {
    if (!svgDoc) return;
    selectCity(svgId);
}

// ===== PESQUISA WIKI =====
const wikiSearch = document.getElementById('wiki-search');
if (wikiSearch) {
    wikiSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const allItems = document.querySelectorAll('.wiki-item');

        if (!query) {
            allItems.forEach(item => item.classList.remove('hidden'));
            return;
        }

        allItems.forEach(item => {
            const name = item.dataset.searchName || item.textContent.toLowerCase();
            if (name.includes(query)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });

        // Abrir seções que têm itens visíveis
        document.querySelectorAll('.wiki-section').forEach(section => {
            const list = section.querySelector('.wiki-section-list');
            const header = section.querySelector('.wiki-section-header');
            const visibleItems = list ? list.querySelectorAll('.wiki-item:not(.hidden)') : [];
            if (visibleItems.length > 0 && query) {
                if (!list.classList.contains('open')) {
                    list.classList.add('open');
                    header.classList.add('open');
                }
            }
        });
    });
}

// ===== RESIZE =====
window.addEventListener('resize', fitMapToScreen);

// ===== TRILHA / JORNADA =====
let trailVisible = false;
let trailGroup = null;
let journeyAnimation = null;
let journeyMode = null;
let currentStopIndex = 0;
const trailBtn = document.getElementById('trail-btn');
const trailControls = document.getElementById('trail-controls');
const trailAutoBtn = document.getElementById('trail-auto');
const trailStepBtn = document.getElementById('trail-step');
const trailNextBtn = document.getElementById('trail-next');

// Calcular offsets para paradas no mesmo local
function getOffsetStops() {
    const counts = {};
    return journeyStops.map((stop, i) => {
        const key = `${Math.round(stop.x / 50)}_${Math.round(stop.y / 50)}`;
        counts[key] = (counts[key] || 0);
        const visit = counts[key];
        counts[key]++;
        const angle = visit * 1.2;
        const dist = visit * 18;
        return {
            ...stop,
            ox: stop.x + Math.cos(angle) * dist,
            oy: stop.y + Math.sin(angle) * dist
        };
    });
}

const offsetStops = getOffsetStops();

trailBtn.addEventListener('click', () => {
    trailVisible = !trailVisible;
    trailBtn.classList.toggle('active', trailVisible);

    const sidebar = document.getElementById('wiki-sidebar');

    if (trailVisible) {
        trailBtn.textContent = 'Esconder Jornada';
        trailControls.style.display = 'flex';
        if (sidebar) sidebar.classList.add('trail-active');
    } else {
        trailBtn.textContent = 'Mostrar Jornada';
        trailControls.style.display = 'none';
        trailNextBtn.style.display = 'none';
        if (sidebar) sidebar.classList.remove('trail-active');
        stopJourney();
        removeTrail();
    }
});

trailAutoBtn.addEventListener('click', () => {
    journeyMode = 'auto';
    trailAutoBtn.classList.add('active');
    trailStepBtn.classList.remove('active');
    trailNextBtn.style.display = 'none';
    startJourney();
});

trailStepBtn.addEventListener('click', () => {
    journeyMode = 'step';
    trailStepBtn.classList.add('active');
    trailAutoBtn.classList.remove('active');
    trailNextBtn.style.display = 'inline-block';
    startJourney();
});

trailNextBtn.addEventListener('click', () => {
    currentStopIndex++;
    advanceJourney();
});

function showJourneyStop(stop, index) {
    document.getElementById('city-name').textContent = stop.location;
    document.getElementById('city-region').textContent = stop.session;

    let html = `
        <div class="info-section">
            <h3>Parada ${index + 1} de ${journeyStops.length}</h3>
            <p>${linkifyLocations(stop.summary)}</p>
        </div>
    `;

    document.getElementById('city-info').innerHTML = html;
    infoPanel.classList.add('open');
}

function startJourney() {
    removeTrail();
    currentStopIndex = 0;
    drawJourneyBase();
    advanceJourney();
}

function stopJourney() {
    if (journeyAnimation) {
        clearTimeout(journeyAnimation);
        journeyAnimation = null;
    }
    journeyMode = null;
    trailAutoBtn.classList.remove('active');
    trailStepBtn.classList.remove('active');
}

function drawJourneyBase() {
    if (!svgDoc) return;
    const svgEl = svgDoc.querySelector('svg');

    trailGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    trailGroup.setAttribute('id', 'journey-trail');

    const linesGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    linesGroup.setAttribute('id', 'journey-lines');
    trailGroup.appendChild(linesGroup);

    const stopsGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    stopsGroup.setAttribute('id', 'journey-stops-group');
    trailGroup.appendChild(stopsGroup);

    const partyGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    partyGroup.setAttribute('id', 'journey-party');
    trailGroup.appendChild(partyGroup);

    // Criar ícones dos personagens
    const defs = svgDoc.querySelector('defs') || svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!svgEl.querySelector('defs')) {
        svgEl.insertBefore(defs, svgEl.firstChild);
    }

    const chars = [
        { name: 'Stor', img: 'img/Stor.png', offset: -36 },
        { name: 'Elandor', img: 'img/Elandor.png', offset: 36 },
        { name: 'Flint', img: 'img/Flint.png', offset: 0, leavesAtStop: 5 },
        { name: 'Azarran', img: 'img/Azarran.png', offset: 0, joinsAtStop: 9 }
    ];

    chars.forEach((char, i) => {
        const clipId = `party-clip-${i}`;
        const clipPath = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', clipId);
        const clipCircle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        clipCircle.setAttribute('cx', '0');
        clipCircle.setAttribute('cy', '0');
        clipCircle.setAttribute('r', '30');
        clipPath.appendChild(clipCircle);
        defs.appendChild(clipPath);

        const charG = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
        charG.setAttribute('id', `party-char-${i}`);

        const border = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        border.setAttribute('cx', '0');
        border.setAttribute('cy', '0');
        border.setAttribute('r', '32');
        border.setAttribute('fill', '#111');
        border.setAttribute('stroke', 'rgba(212, 168, 67, 0.95)');
        border.setAttribute('stroke-width', '2.5');
        charG.appendChild(border);

        const img = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', char.img);
        img.setAttribute('x', '-30');
        img.setAttribute('y', '-30');
        img.setAttribute('width', '60');
        img.setAttribute('height', '60');
        img.setAttribute('clip-path', `url(#${clipId})`);
        img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        charG.appendChild(img);

        // Posicionar no primeiro stop
        const firstStop = offsetStops[0];
        charG.setAttribute('transform', `translate(${firstStop.ox + char.offset}, ${firstStop.oy - 45})`);

        // Esconder personagens que entram depois
        if (char.joinsAtStop) {
            charG.style.opacity = '0';
        }

        partyGroup.appendChild(charG);
    });

    svgEl.appendChild(trailGroup);
}

function advanceJourney() {
    if (!svgDoc || !trailGroup) return;
    if (currentStopIndex >= offsetStops.length) {
        stopJourney();
        return;
    }

    const thisIndex = currentStopIndex;
    const stop = offsetStops[thisIndex];
    const linesGroup = svgDoc.getElementById('journey-lines');
    const stopsGroup = svgDoc.getElementById('journey-stops-group');
    const partyGroup = svgDoc.getElementById('journey-party');

    if (thisIndex > 0) {
        const prev = offsetStops[thisIndex - 1];
        const line = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', prev.ox);
        line.setAttribute('y1', prev.oy);
        line.setAttribute('x2', stop.ox);
        line.setAttribute('y2', stop.oy);
        line.setAttribute('stroke', '#111');
        line.setAttribute('stroke-width', '3.5');
        line.setAttribute('stroke-dasharray', '12 7');
        line.setAttribute('stroke-linecap', 'round');
        line.style.opacity = '0';
        line.style.transition = 'opacity 0.5s ease';
        linesGroup.appendChild(line);

        const chars = [
            svgDoc.getElementById('party-char-0'),
            svgDoc.getElementById('party-char-1'),
            svgDoc.getElementById('party-char-2'),
            svgDoc.getElementById('party-char-3')
        ];

        const duration = 2500;
        const startTime = performance.now();

        function animateParty(now) {
            if (!trailGroup) return;

            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            const cx = prev.ox + (stop.ox - prev.ox) * eased;
            const cy = prev.oy + (stop.oy - prev.oy) * eased;

            if (chars[0]) chars[0].setAttribute('transform', `translate(${cx - 36}, ${cy - 45})`);
            if (chars[1]) chars[1].setAttribute('transform', `translate(${cx + 36}, ${cy - 45})`);
            if (chars[2] && chars[2].style.opacity !== '0') chars[2].setAttribute('transform', `translate(${cx}, ${cy - 45})`);
            if (chars[3] && chars[3].style.opacity !== '0') chars[3].setAttribute('transform', `translate(${cx}, ${cy - 45})`);

            line.style.opacity = String(eased);

            if (t < 1) {
                requestAnimationFrame(animateParty);
            } else {
                placeStop(stop, thisIndex, stopsGroup);
                showJourneyStop(journeyStops[thisIndex], thisIndex);

                if (thisIndex >= 5 && chars[2]) {
                    chars[2].style.opacity = '0';
                    chars[2].style.transition = 'opacity 1s ease';
                }

                if (thisIndex >= 9 && chars[3]) {
                    chars[3].style.opacity = '1';
                    chars[3].style.transition = 'opacity 1s ease';
                    chars[3].setAttribute('transform', `translate(${cx}, ${cy - 45})`);
                }

                if (journeyMode === 'auto' && currentStopIndex === thisIndex) {
                    journeyAnimation = setTimeout(() => {
                        currentStopIndex++;
                        advanceJourney();
                    }, 3000);
                }
            }
        }

        requestAnimationFrame(animateParty);
    } else {
        placeStop(stop, 0, stopsGroup);
        showJourneyStop(journeyStops[0], 0);

        if (journeyMode === 'auto') {
            journeyAnimation = setTimeout(() => {
                currentStopIndex++;
                advanceJourney();
            }, 2000);
        }
    }
}

function placeStop(stop, index, stopsGroup) {
    const stopG = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    stopG.style.cursor = 'pointer';

    const circle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', stop.ox);
    circle.setAttribute('cy', stop.oy);
    circle.setAttribute('r', '12');
    circle.setAttribute('fill', '#111');
    circle.setAttribute('stroke', 'rgba(212, 168, 67, 0.95)');
    circle.setAttribute('stroke-width', '2.5');

    const numText = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
    numText.setAttribute('x', stop.ox);
    numText.setAttribute('y', stop.oy + 5);
    numText.setAttribute('text-anchor', 'middle');
    numText.setAttribute('font-family', 'serif');
    numText.setAttribute('font-size', '12');
    numText.setAttribute('font-weight', 'bold');
    numText.setAttribute('fill', '#d4a843');
    numText.textContent = index + 1;

    stopG.appendChild(circle);
    stopG.appendChild(numText);

    stopG.addEventListener('click', (e) => {
        e.stopPropagation();
        showJourneyStop(journeyStops[index], index);
    });

    stopG.addEventListener('mouseenter', () => {
        circle.setAttribute('r', '14');
    });
    stopG.addEventListener('mouseleave', () => {
        circle.setAttribute('r', '12');
    });

    stopG.style.opacity = '0';
    stopG.style.transition = 'opacity 0.4s ease';
    stopsGroup.appendChild(stopG);
    requestAnimationFrame(() => { stopG.style.opacity = '1'; });
}

function removeTrail() {
    if (journeyAnimation) {
        clearTimeout(journeyAnimation);
        journeyAnimation = null;
    }
    if (trailGroup && trailGroup.parentNode) {
        trailGroup.parentNode.removeChild(trailGroup);
        trailGroup = null;
    }
    if (svgDoc) {
        const defs = svgDoc.querySelector('defs');
        if (defs) {
            const clips = defs.querySelectorAll('[id^="party-clip-"]');
            clips.forEach(c => c.remove());
        }
    }
}
