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

    let html = '';
    if (city.image) html = buildPortraitHtml(city, 'cities["' + id + '"]');
    html += `
        <div class="info-section">
            <h3>Descrição</h3>
            <p>${linkifyLocations(city.description)}</p>
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
        html += buildPortraitHtml(char, 'characters[' + index + ']');
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
    `;

    document.getElementById('city-info').innerHTML = html;
    infoPanel.classList.add('open');
}

// Trocar arte de qualquer entidade
function switchEntityArt(entityData, altIndex) {
    const img = document.getElementById('char-portrait');
    if (!img) return;

    if (altIndex === -1) {
        img.src = entityData.image;
    } else {
        img.src = entityData.altImages[altIndex];
    }

    // Atualizar botao ativo
    document.querySelectorAll('.alt-art-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === (altIndex + 1));
    });
}

// Helper: gera HTML do retrato com botoes de arte alternativa
// entityRef: expressao JS que referencia a entidade (ex: 'characters[0]', 'cities["Veyrinn"]')
function buildPortraitHtml(entity, entityRef) {
    let html = '';
    if (!entity.image) return html;

    html += '<div class="portrait-wrapper">';
    html += '<div class="portrait-container">';
    html += '<img class="info-portrait" id="char-portrait" src="' + entity.image + '" alt="' + (entity.name || '') + '">';

    if (entity.altImages && entity.altImages.length > 0) {
        html += '<div class="alt-art-buttons">';
        html += '<button class="alt-art-btn active" onclick="switchEntityArt(' + entityRef + ', -1)">1</button>';
        for (var i = 0; i < entity.altImages.length; i++) {
            html += '<button class="alt-art-btn" onclick="switchEntityArt(' + entityRef + ', ' + i + ')">' + (i + 2) + '</button>';
        }
        html += '</div>';
    }

    html += '</div>';

    if (entity.player) {
        html += '<p class="portrait-caption" contenteditable="false">Personagem controlado por: ' + entity.player + '</p>';
    }

    html += '</div>';
    return html;
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
        html += buildPortraitHtml(member, 'legion[' + index + ']');
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
        html += buildPortraitHtml(villain, 'villains[' + index + ']');
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

// ===== WIKI - ARTEFATOS =====
const artifactsList = document.getElementById('artifacts-list');
if (artifactsList && typeof artifacts !== 'undefined') {
    artifacts.forEach((artifact, index) => {
        const item = document.createElement('div');
        item.className = 'wiki-item';
        item.textContent = artifact.name;
        item.dataset.searchName = artifact.name.toLowerCase();
        item.addEventListener('click', () => showArtifactInfo(index));
        artifactsList.appendChild(item);
    });
}

function showArtifactInfo(index) {
    const artifact = artifacts[index];

    document.querySelectorAll('.wiki-item').forEach(i => i.classList.remove('active'));
    if (artifactsList) artifactsList.children[index].classList.add('active');

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

    document.getElementById('city-name').textContent = artifact.name;
    document.getElementById('city-region').textContent = 'Artefato';

    let html = '';

    if (artifact.image) {
        html += buildPortraitHtml(artifact, 'artifacts[' + index + ']');
    }

    html += `
        <div class="info-section">
            <h3>Descrição</h3>
            <p>${linkifyLocations(artifact.description)}</p>
        </div>
        <div class="info-section">
            <h3>Detalhes</h3>
            <ul>
                ${artifact.details.map(d => `<li>${linkifyLocations(d)}</li>`).join('')}
            </ul>
        </div>
    `;

    document.getElementById('city-info').innerHTML = html;
    infoPanel.classList.add('open');
}

// ===== WIKI - LIVROS & RELATOS =====
const booksList = document.getElementById('books-list');
if (booksList && typeof books !== 'undefined') {
    books.forEach((book, index) => {
        const item = document.createElement('div');
        item.className = 'wiki-item';
        item.textContent = book.name;
        item.dataset.searchName = book.name.toLowerCase();
        item.addEventListener('click', () => showBookInfo(index));
        booksList.appendChild(item);
    });
}

function showBookInfo(index) {
    const book = books[index];

    document.querySelectorAll('.wiki-item').forEach(i => i.classList.remove('active'));
    if (booksList) booksList.children[index].classList.add('active');

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

    document.getElementById('city-name').textContent = book.name;
    document.getElementById('city-region').textContent = 'Livro / Relato';

    let html = '';

    if (book.image) {
        html += buildPortraitHtml(book, 'books[' + index + ']');
    }

    html += `
        <div class="info-section">
            <h3>Descrição</h3>
            <p>${linkifyLocations(book.description)}</p>
        </div>
        <div class="info-section">
            <h3>Detalhes</h3>
            <ul>
                ${book.details.map(d => `<li>${linkifyLocations(d)}</li>`).join('')}
            </ul>
        </div>
    `;

    if (book.fullText) {
        html += `<button id="session-read-btn" onclick="openBookModal(${index})">Ler na Integra</button>`;
    }

    document.getElementById('city-info').innerHTML = html;
    infoPanel.classList.add('open');
}

// Abre modal com texto completo do livro/relato
function openBookModal(index) {
    const book = books[index];
    if (!book || !book.fullText) return;

    document.getElementById('session-modal-title').textContent = book.name;
    document.getElementById('session-modal-quote').textContent = 'Livro / Relato';
    document.getElementById('session-modal-content').textContent = book.fullText;

    document.getElementById('session-modal-overlay').classList.add('open');
}

// ===== WIKI - MARCOS HISTÓRICOS =====
const landmarksList = document.getElementById('landmarks-list');
if (landmarksList && typeof landmarks !== 'undefined') {
    landmarks.forEach((landmark, index) => {
        const item = document.createElement('div');
        item.className = 'wiki-item';
        item.textContent = landmark.name;
        item.dataset.searchName = landmark.name.toLowerCase();
        item.addEventListener('click', () => showLandmarkInfo(index));
        landmarksList.appendChild(item);
    });
}

function showLandmarkInfo(index) {
    const landmark = landmarks[index];
    document.querySelectorAll('.wiki-item').forEach(i => i.classList.remove('active'));
    if (landmarksList) landmarksList.children[index].classList.add('active');

    if (svgDoc) {
        const svgEl = svgDoc.querySelector('svg');
        const overlay = svgDoc.getElementById('dim-overlay');
        if (overlay) overlay.style.opacity = '0';
        cityIds.forEach(id => {
            const g = svgDoc.getElementById(id);
            if (g) { g.classList.remove('active', 'city-highlighted'); g.style.filter = ''; if (overlay) svgEl.insertBefore(g, overlay); }
        });
    }

    document.getElementById('city-name').textContent = landmark.name;
    document.getElementById('city-region').textContent = 'Marco Histórico';

    let html = `
        <div class="info-section">
            <h3>Descrição</h3>
            <p>${linkifyLocations(landmark.description)}</p>
        </div>
        <div class="info-section">
            <h3>Detalhes</h3>
            <ul>
                ${landmark.details.map(d => `<li>${linkifyLocations(d)}</li>`).join('')}
            </ul>
        </div>
    `;
    document.getElementById('city-info').innerHTML = html;
    infoPanel.classList.add('open');
}

// ===== WIKI - PERSONAGENS HISTÓRICOS =====
const historicalList = document.getElementById('historical-list');
if (historicalList && typeof historicalNPCs !== 'undefined') {
    historicalNPCs.forEach((npc, index) => {
        const item = document.createElement('div');
        item.className = 'wiki-item';
        item.textContent = npc.name;
        item.dataset.searchName = npc.name.toLowerCase();
        item.addEventListener('click', () => showHistoricalInfo(index));
        historicalList.appendChild(item);
    });
}

function showHistoricalInfo(index) {
    const npc = historicalNPCs[index];
    document.querySelectorAll('.wiki-item').forEach(i => i.classList.remove('active'));
    if (historicalList) historicalList.children[index].classList.add('active');

    if (svgDoc) {
        const svgEl = svgDoc.querySelector('svg');
        const overlay = svgDoc.getElementById('dim-overlay');
        if (overlay) overlay.style.opacity = '0';
        cityIds.forEach(id => {
            const g = svgDoc.getElementById(id);
            if (g) { g.classList.remove('active', 'city-highlighted'); g.style.filter = ''; if (overlay) svgEl.insertBefore(g, overlay); }
        });
    }

    document.getElementById('city-name').textContent = npc.name;
    document.getElementById('city-region').textContent = npc.title;

    let html = '';
    if (npc.image) html += buildPortraitHtml(npc, 'historicalNPCs[' + index + ']');
    html += `
        <div class="info-section">
            <h3>Descrição</h3>
            <p>${linkifyLocations(npc.description)}</p>
        </div>
        <div class="info-section">
            <h3>Detalhes</h3>
            <ul>
                ${npc.details.map(d => `<li>${linkifyLocations(d)}</li>`).join('')}
            </ul>
        </div>
    `;
    document.getElementById('city-info').innerHTML = html;
    infoPanel.classList.add('open');
}

// ===== WIKI - ALIADOS =====
const alliesList = document.getElementById('allies-list');
if (alliesList && typeof allies !== 'undefined') {
    allies.forEach((ally, index) => {
        const item = document.createElement('div');
        item.className = 'wiki-item';
        item.textContent = ally.name;
        item.dataset.searchName = ally.name.toLowerCase();
        item.addEventListener('click', () => showAllyInfo(index));
        alliesList.appendChild(item);
    });
}

function showAllyInfo(index) {
    const ally = allies[index];
    document.querySelectorAll('.wiki-item').forEach(i => i.classList.remove('active'));
    if (alliesList) alliesList.children[index].classList.add('active');

    if (svgDoc) {
        const svgEl = svgDoc.querySelector('svg');
        const overlay = svgDoc.getElementById('dim-overlay');
        if (overlay) overlay.style.opacity = '0';
        cityIds.forEach(id => {
            const g = svgDoc.getElementById(id);
            if (g) { g.classList.remove('active', 'city-highlighted'); g.style.filter = ''; if (overlay) svgEl.insertBefore(g, overlay); }
        });
    }

    document.getElementById('city-name').textContent = ally.name;
    document.getElementById('city-region').textContent = ally.title;

    let html = '';
    if (ally.image) html += buildPortraitHtml(ally, 'allies[' + index + ']');
    html += `
        <div class="info-section">
            <h3>Descrição</h3>
            <p>${linkifyLocations(ally.description)}</p>
        </div>
        <div class="info-section">
            <h3>Detalhes</h3>
            <ul>
                ${ally.details.map(d => `<li>${linkifyLocations(d)}</li>`).join('')}
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

    // Artefatos
    if (typeof artifacts !== 'undefined') {
        artifacts.forEach((artifact, index) => {
            map[artifact.name] = { type: 'artifact', index: index };
        });
    }

    // Livros & Relatos
    if (typeof books !== 'undefined') {
        books.forEach((book, index) => {
            map[book.name] = { type: 'book', index: index };
        });
    }

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
                case 'artifact':
                    onclick = `showArtifactInfo(${entity.index})`;
                    cssClass = 'wiki-link';
                    break;
                case 'book':
                    onclick = `showBookInfo(${entity.index})`;
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
            // Retrair todos os menus ao limpar a pesquisa
            document.querySelectorAll('.wiki-section').forEach(section => {
                const list = section.querySelector('.wiki-section-list');
                const header = section.querySelector('.wiki-section-header');
                if (list) list.classList.remove('open');
                if (header) header.classList.remove('open');
            });
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
let activeJourneys = {}; // tracks visible journey groups by key
let journeyAnimation = null;
let journeyMode = null;
let currentStopIndex = 0;
let currentJourneyKey = 'solnegro';
const trailBtn = document.getElementById('trail-btn');
const trailControls = document.getElementById('trail-controls');
const trailAutoBtn = document.getElementById('trail-auto');
const trailStepBtn = document.getElementById('trail-step');
const trailNextBtn = document.getElementById('trail-next');
const trailSeason = document.getElementById('trail-season');

// Combinar Sol Negro T1 + T2 numa unica jornada
const solNegroStopsCombined = journeyStops.map(function(s) {
    return Object.assign({}, s, { session: "T1 - " + s.session });
}).concat(
    (typeof journeyStopsSolNegro2 !== 'undefined' ? journeyStopsSolNegro2 : []).map(function(s) {
        return Object.assign({}, s, { session: "T2 - " + s.session });
    })
);

const solNegroSessionsCombined = (typeof sessionsData !== 'undefined' ? sessionsData : []).map(function(s) {
    return Object.assign({}, s, { title: "[T1] " + s.title });
}).concat(
    (typeof sessionsDataSolNegro2 !== 'undefined' ? sessionsDataSolNegro2 : []).map(function(s, i) {
        return Object.assign({}, s, { id: sessionsData.length + i, title: "[T2] " + s.title });
    })
);

const journeyConfigs = {
    solnegro: { stops: solNegroStopsCombined, sessions: solNegroSessionsCombined, color: '#d4a843', pathColor: '#d4a843' },
    cicatriz: { stops: typeof journeyStopsCicatriz !== 'undefined' ? journeyStopsCicatriz : [], sessions: typeof sessionsDataCicatriz !== 'undefined' ? sessionsDataCicatriz : [], color: '#4a9cc8', pathColor: '#4a9cc8' }
};

function getOffsetStopsFor(stops) {
    const counts = {};
    return stops.map((stop) => {
        const key = `${Math.round(stop.x / 50)}_${Math.round(stop.y / 50)}`;
        counts[key] = (counts[key] || 0);
        const visit = counts[key];
        counts[key]++;
        const angle = visit * 1.2;
        const dist = visit * 18;
        return { ...stop, ox: stop.x + Math.cos(angle) * dist, oy: stop.y + Math.sin(angle) * dist };
    });
}

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
        removeAllTrails();
    }
});

// Handle campaign change
if (trailSeason) {
    trailSeason.addEventListener('change', () => {
        currentJourneyKey = trailSeason.value;
    });
}

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
    const config = journeyConfigs[currentJourneyKey];
    document.getElementById('city-name').textContent = stop.location;
    document.getElementById('city-region').textContent = stop.session;

    // Find session button
    let sessionBtn = '';
    if (config.sessions && config.sessions.length > 0) {
        var sessionId = null;
        if (currentJourneyKey === 'solnegro') {
            // For Sol Negro, use stop index to determine which session range
            var isT2 = stop.session.indexOf('T2') === 0;
            var stopSession = stop.session.replace(/^T\d+ - /, '');
            if (isT2) {
                // T2 sessions: S02E01->0, S02E02->1, S02E03->2 + offset
                var epMatch = stopSession.match(/E(\d+)/);
                if (epMatch) {
                    var t1Count = typeof sessionsData !== 'undefined' ? sessionsData.length : 0;
                    sessionId = t1Count + parseInt(epMatch[1]) - 1;
                }
            } else {
                // T1 sessions: "Sessao X" -> X
                var numMatch = stopSession.match(/(\d+)/);
                if (numMatch) sessionId = parseInt(numMatch[1]);
            }
        } else {
            // Cicatrizes: S01E01->0, S01E02->1, S01E03->2
            var epMatch2 = stop.session.match(/E(\d+)/);
            if (epMatch2) sessionId = parseInt(epMatch2[1]) - 1;
        }
        if (sessionId !== null && config.sessions[sessionId]) {
            sessionBtn = '<button id="session-read-btn" onclick="openSessionModalFor(\'' + currentJourneyKey + '\', ' + sessionId + ')">Ler Sess\u00e3o Completa</button>';
        }
    }

    var html = '<div class="info-section"><h3>Parada ' + (index + 1) + ' de ' + config.stops.length + '</h3><p>' + linkifyLocations(stop.summary) + '</p>' + sessionBtn + '</div>';
    document.getElementById('city-info').innerHTML = html;
    infoPanel.classList.add('open');
}

// ===== MODAL DE SESSÃO =====
function openSessionModal(sessionId) {
    const session = sessionsData[sessionId];
    if (!session) return;

    document.getElementById('session-modal-title').textContent = session.title;
    const quoteText = session.quote + (session.quoteAuthor ? ' — ' + session.quoteAuthor : '');
    document.getElementById('session-modal-quote').textContent = quoteText;
    document.getElementById('session-modal-content').textContent = session.content;

    document.getElementById('session-modal-overlay').classList.add('open');
}

function openSessionModalFor(journeyKey, sessionId) {
    const config = journeyConfigs[journeyKey];
    const session = config.sessions[sessionId];
    if (!session) return;
    document.getElementById('session-modal-title').textContent = session.title;
    const quoteText = session.quote + (session.quoteAuthor ? ' — ' + session.quoteAuthor : '');
    document.getElementById('session-modal-quote').textContent = quoteText;
    document.getElementById('session-modal-content').textContent = session.content;
    document.getElementById('session-modal-overlay').classList.add('open');
}

function closeSessionModal() {
    document.getElementById('session-modal-overlay').classList.remove('open');
}

// Fechar modal
document.getElementById('session-modal-close').addEventListener('click', closeSessionModal);
document.getElementById('session-modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('session-modal-overlay')) {
        closeSessionModal();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('session-modal-overlay').classList.contains('open')) {
        closeSessionModal();
    }
});

function startJourney() {
    // Remove only the current journey's trail if replaying
    if (activeJourneys[currentJourneyKey]) {
        removeTrailFor(currentJourneyKey);
    }
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

function removeAllTrails() {
    Object.keys(activeJourneys).forEach(key => removeTrailFor(key));
}

function removeTrailFor(key) {
    if (journeyAnimation) { clearTimeout(journeyAnimation); journeyAnimation = null; }
    const group = activeJourneys[key];
    if (group && group.parentNode) group.parentNode.removeChild(group);
    delete activeJourneys[key];
    // Clean clip paths
    if (svgDoc) {
        const defs = svgDoc.querySelector('defs');
        if (defs) {
            const clips = defs.querySelectorAll(`[id^="party-clip-${key}"]`);
            clips.forEach(c => c.remove());
        }
    }
}

function drawJourneyBase() {
    if (!svgDoc) return;
    const svgEl = svgDoc.querySelector('svg');
    const config = journeyConfigs[currentJourneyKey];
    if (!config || !config.stops || config.stops.length === 0) return;

    const trailGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    trailGroup.setAttribute('id', `journey-trail-${currentJourneyKey}`);

    const linesGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    linesGroup.setAttribute('id', `journey-lines-${currentJourneyKey}`);
    trailGroup.appendChild(linesGroup);

    const stopsGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    stopsGroup.setAttribute('id', `journey-stops-${currentJourneyKey}`);
    trailGroup.appendChild(stopsGroup);

    // Party character icons
    const partyGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    partyGroup.setAttribute('id', `journey-party-${currentJourneyKey}`);
    trailGroup.appendChild(partyGroup);

    const defs = svgDoc.querySelector('defs') || svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!svgEl.querySelector('defs')) svgEl.insertBefore(defs, svgEl.firstChild);

    const partyChars = currentJourneyKey === 'solnegro'
        ? [
            { name: 'Stor', img: 'img/Stor.png', offset: -36 },
            { name: 'Elandor', img: 'img/Elandor.png', offset: 36 },
            { name: 'Azarran', img: 'img/Azarran.png', offset: 0 }
        ]
        : [
            { name: 'Falin', img: 'img/Falin.png', offset: -30 },
            { name: 'Durgan', img: 'img/Durgan.png', offset: 30 }
        ];

    const offsetStops = getOffsetStopsFor(config.stops);
    const firstStop = offsetStops[0];

    partyChars.forEach((char, i) => {
        if (!char.img) return;
        const clipId = `party-clip-${currentJourneyKey}-${i}`;
        const clipPath = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', clipId);
        const clipCircle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        clipCircle.setAttribute('cx', '0'); clipCircle.setAttribute('cy', '0'); clipCircle.setAttribute('r', '25');
        clipPath.appendChild(clipCircle);
        defs.appendChild(clipPath);

        const charG = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
        charG.setAttribute('id', `party-char-${currentJourneyKey}-${i}`);

        const border = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        border.setAttribute('cx', '0'); border.setAttribute('cy', '0'); border.setAttribute('r', '27');
        border.setAttribute('fill', '#111');
        border.setAttribute('stroke', config.color);
        border.setAttribute('stroke-width', '2');
        charG.appendChild(border);

        const img = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'image');
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', baseUrl + char.img);
        img.setAttribute('x', '-25'); img.setAttribute('y', '-25');
        img.setAttribute('width', '50'); img.setAttribute('height', '50');
        img.setAttribute('clip-path', `url(#${clipId})`);
        img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        charG.appendChild(img);

        charG.setAttribute('transform', `translate(${firstStop.ox + char.offset}, ${firstStop.oy - 40})`);
        partyGroup.appendChild(charG);
    });

    svgEl.appendChild(trailGroup);
    activeJourneys[currentJourneyKey] = trailGroup;
}

function advanceJourney() {
    if (!svgDoc) return;
    const config = journeyConfigs[currentJourneyKey];
    const offsetStops = getOffsetStopsFor(config.stops);
    const trailGroup = activeJourneys[currentJourneyKey];
    if (!trailGroup) return;
    if (currentStopIndex >= offsetStops.length) { stopJourney(); return; }

    const thisIndex = currentStopIndex;
    const stop = offsetStops[thisIndex];
    const linesGroup = svgDoc.getElementById(`journey-lines-${currentJourneyKey}`);
    const stopsGroup = svgDoc.getElementById(`journey-stops-${currentJourneyKey}`);

    if (thisIndex > 0) {
        const prev = offsetStops[thisIndex - 1];

        // Border line (colored, thicker) - drawn first
        const borderLine = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
        borderLine.setAttribute('x1', prev.ox); borderLine.setAttribute('y1', prev.oy);
        borderLine.setAttribute('x2', stop.ox); borderLine.setAttribute('y2', stop.oy);
        borderLine.setAttribute('stroke', config.pathColor);
        borderLine.setAttribute('stroke-width', '5');
        borderLine.setAttribute('stroke-dasharray', '12 7');
        borderLine.setAttribute('stroke-linecap', 'round');
        borderLine.setAttribute('opacity', '0');
        linesGroup.appendChild(borderLine);

        // Inner line (black, thinner) - drawn on top
        const line = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', prev.ox); line.setAttribute('y1', prev.oy);
        line.setAttribute('x2', stop.ox); line.setAttribute('y2', stop.oy);
        line.setAttribute('stroke', '#111');
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('stroke-dasharray', '12 7');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('opacity', '0');
        linesGroup.appendChild(line);

        // Animate party icons along the path
        const partyChars = currentJourneyKey === 'solnegro'
            ? [{ offset: -36 }, { offset: 36 }, { offset: 0 }]
            : [{ offset: -30 }, { offset: 30 }];
        const duration = 2000;
        const animStart = performance.now();

        function animatePartyMove(now) {
            if (!activeJourneys[currentJourneyKey]) return;
            const elapsed = now - animStart;
            const t = Math.min(elapsed / duration, 1);
            const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            const cx = prev.ox + (stop.ox - prev.ox) * eased;
            const cy = prev.oy + (stop.oy - prev.oy) * eased;

            partyChars.forEach((char, i) => {
                const charG = svgDoc.getElementById(`party-char-${currentJourneyKey}-${i}`);
                if (charG) charG.setAttribute('transform', `translate(${cx + char.offset}, ${cy - 40})`);
            });

            // Animate line opacity
            borderLine.setAttribute('opacity', String(eased * 0.9));
            line.setAttribute('opacity', String(eased * 0.9));

            if (t < 1) {
                requestAnimationFrame(animatePartyMove);
            } else {
                placeStopMarker(stop, thisIndex, stopsGroup, config);
                showJourneyStop(config.stops[thisIndex], thisIndex);
                if (journeyMode === 'auto' && currentStopIndex === thisIndex) {
                    journeyAnimation = setTimeout(() => { currentStopIndex++; advanceJourney(); }, 2500);
                }
            }
        }

        requestAnimationFrame(animatePartyMove);
    } else {
        placeStopMarker(stop, 0, stopsGroup, config);
        showJourneyStop(config.stops[0], 0);
        if (journeyMode === 'auto') {
            journeyAnimation = setTimeout(() => { currentStopIndex++; advanceJourney(); }, 2000);
        }
    }
}

function placeStopMarker(stop, index, stopsGroup, config) {
    const stopG = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
    stopG.style.cursor = 'pointer';

    const circle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', stop.ox); circle.setAttribute('cy', stop.oy);
    circle.setAttribute('r', '12');
    circle.setAttribute('fill', '#111');
    circle.setAttribute('stroke', config.color);
    circle.setAttribute('stroke-width', '2.5');

    const numText = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
    numText.setAttribute('x', stop.ox); numText.setAttribute('y', stop.oy + 5);
    numText.setAttribute('text-anchor', 'middle');
    numText.setAttribute('font-family', 'serif');
    numText.setAttribute('font-size', '12');
    numText.setAttribute('font-weight', 'bold');
    numText.setAttribute('fill', config.color);
    numText.textContent = index + 1;

    stopG.appendChild(circle);
    stopG.appendChild(numText);

    const currentKey = currentJourneyKey;
    stopG.addEventListener('click', (e) => {
        e.stopPropagation();
        const cfg = journeyConfigs[currentKey];
        showJourneyStop(cfg.stops[index], index);
    });

    stopG.addEventListener('mouseenter', () => circle.setAttribute('r', '14'));
    stopG.addEventListener('mouseleave', () => circle.setAttribute('r', '12'));

    stopG.style.opacity = '0';
    stopG.style.transition = 'opacity 0.4s ease';
    stopsGroup.appendChild(stopG);
    requestAnimationFrame(() => { stopG.style.opacity = '1'; });
}

// ===== MODO DEBUG - COORDENADAS (Ctrl+Shift+D) =====
let debugMode = false;
let debugPoints = [];

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'Q' || e.key === 'q' || e.code === 'KeyQ')) {
        e.preventDefault();
        debugMode = !debugMode;
        let debugPanel = document.getElementById('debug-panel');
        if (debugMode) {
            if (!debugPanel) {
                debugPanel = document.createElement('div');
                debugPanel.id = 'debug-panel';
                debugPanel.style.cssText = 'position:fixed;top:15px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#4ae04a;font-family:monospace;font-size:14px;padding:15px 20px;border-radius:8px;border:2px solid #4ae04a;z-index:9999;text-align:center;';
                debugPanel.innerHTML = '<div style="color:#fff;margin-bottom:5px;font-weight:bold;">MODO DEBUG ATIVO</div><div>Clique no mapa para pegar coordenadas</div><div id="debug-coords" style="margin-top:8px;"></div><div id="debug-log" style="margin-top:8px;font-size:12px;max-height:200px;overflow-y:auto;text-align:left;"></div>';
                document.body.appendChild(debugPanel);
            }
            debugPanel.style.display = 'block';
            debugPoints = [];
            if (svgDoc) {
                svgDoc.addEventListener('click', debugClick, true);
            }
        } else {
            if (debugPanel) debugPanel.style.display = 'none';
            if (svgDoc) {
                svgDoc.removeEventListener('click', debugClick, true);
                // Remover marcadores do mapa
                const svgEl = svgDoc.querySelector('svg');
                if (svgEl) {
                    svgEl.querySelectorAll('.debug-marker').forEach(m => m.remove());
                }
            }
            debugPoints = [];
        }
    }
});

function debugClick(e) {
    if (!debugMode || !svgDoc) return;
    e.stopPropagation();
    e.preventDefault();

    const svgEl = svgDoc.querySelector('svg');
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse());

    const x = Math.round(svgPt.x);
    const y = Math.round(svgPt.y);

    debugPoints.push({ x, y });

    const coordsEl = document.getElementById('debug-coords');
    coordsEl.innerHTML = `<span style="color:#ff0;">Último: x: ${x}, y: ${y}</span>`;

    const logEl = document.getElementById('debug-log');
    logEl.innerHTML = debugPoints.map((p, i) => `${i + 1}. x: ${p.x}, y: ${p.y}`).join('<br>');

    // Copiar para clipboard
    const copyText = debugPoints.map((p, i) =>
        `    {\n        x: ${p.x}, y: ${p.y},\n        location: "Ponto ${i + 1}",\n        session: "",\n        summary: ""\n    }`
    ).join(',\n');
    navigator.clipboard.writeText(copyText).catch(() => {});

    // Marcar no SVG
    const circle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', '10');
    circle.setAttribute('fill', 'rgba(74, 224, 74, 0.7)');
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('class', 'debug-marker');
    svgEl.appendChild(circle);

    const text = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y + 4);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('fill', '#000');
    text.setAttribute('class', 'debug-marker');
    text.textContent = debugPoints.length;
    svgEl.appendChild(text);
}


// ===== SELETOR DE FONTE/IDIOMA =====
const langToggle = document.getElementById('lang-toggle');
const langMenu = document.getElementById('lang-menu');
const fontDragao = document.getElementById('font-dragao');
let isDragaoFont = false;

// Remove acentos, ç, e números de um texto, deixa tudo uppercase
function removeDiacritics(text) {
    return text
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // remove acentos
        .replace(/[ÇÇ]/g, 'C')           // ç → C
        .replace(/[0-9]/g, '');            // remove números
}

// Aplica remoção de acentos em todos os nós de texto visíveis
function stripAccentsFromDOM() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.parentElement && (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE')) continue;
        const original = node.textContent;
        const stripped = removeDiacritics(original);
        if (original !== stripped) {
            if (!node._originalText) node._originalText = original;
            node.textContent = stripped;
        }
    }
}

// Restaura os textos originais
function restoreAccentsInDOM() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
        if (node._originalText) {
            node.textContent = node._originalText;
            delete node._originalText;
        }
    });
}

// Observer para aplicar strip em conteúdo dinâmico quando fonte Dragao está ativa
let stripTimeout = null;
const dragaoObserver = new MutationObserver((mutations) => {
    if (!isDragaoFont) return;
    // Verificar se a mutation é de childList (novo conteúdo adicionado), não characterData
    const hasNewContent = mutations.some(m => m.type === 'childList' && m.addedNodes.length > 0);
    if (!hasNewContent) return;
    // Debounce para evitar loops
    if (stripTimeout) clearTimeout(stripTimeout);
    stripTimeout = setTimeout(() => {
        dragaoObserver.disconnect();
        stripAccentsFromDOM();
        dragaoObserver.observe(document.body, { childList: true, subtree: true });
    }, 50);
});
dragaoObserver.observe(document.body, { childList: true, subtree: true });

if (langToggle && langMenu) {
    langToggle.addEventListener('click', () => {
        if (isDragaoFont) {
            // Voltar para fonte normal
            document.body.classList.remove('font-dragao');
            restoreAccentsInDOM();
            isDragaoFont = false;
            langToggle.classList.remove('active');
            langMenu.classList.remove('open');
            langToggle.textContent = 'PT-BR';
        } else {
            // Abrir/fechar menu
            langMenu.classList.toggle('open');
            langToggle.classList.toggle('active');
        }
    });

    if (fontDragao) {
        fontDragao.addEventListener('click', () => {
            document.body.classList.add('font-dragao');
            stripAccentsFromDOM();
            isDragaoFont = true;
            langMenu.classList.remove('open');
            langToggle.textContent = 'DRA-GAO';
            langToggle.classList.add('active');
        });
    }

    // Fechar menu ao clicar fora
    document.addEventListener('click', (e) => {
        if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) {
            langMenu.classList.remove('open');
            if (!isDragaoFont) langToggle.classList.remove('active');
        }
    });
}


// ===== PLAYER DE MUSICA =====
(function() {
    const musicBtn = document.getElementById('music-btn');
    const musicTimer = document.getElementById('music-timer');
    const audio = new Audio('assets/songs/boa noite meu consagrado - Geovanna Lorena (youtube).mp3');
    audio.loop = true;

    let isPlaying = false;
    let totalSeconds = 0;
    let timerInterval = null;
    let lastSaveTime = 0;

    // Formatar segundos em H:MM:SS
    function formatTime(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    // Carregar tempo total do Firestore
    function loadMusicTime() {
        if (typeof db === 'undefined') return;
        db.collection('stats').doc('music').get().then(function(doc) {
            if (doc.exists && doc.data().totalSeconds) {
                totalSeconds = doc.data().totalSeconds;
                musicTimer.textContent = formatTime(totalSeconds);
                musicTimer.style.display = 'block';
            } else {
                musicTimer.style.display = 'block';
                musicTimer.textContent = formatTime(0);
            }
        }).catch(function() {
            musicTimer.style.display = 'block';
            musicTimer.textContent = formatTime(0);
        });
    }

    // Salvar tempo no Firestore (a cada 10 segundos para nao onerar)
    function saveMusicTime() {
        if (typeof db === 'undefined') return;
        db.collection('stats').doc('music').set({ totalSeconds: totalSeconds }, { merge: true }).catch(function() {});
    }

    // Toggle play/pause
    musicBtn.addEventListener('click', function() {
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            musicBtn.classList.remove('playing');
            clearInterval(timerInterval);
            timerInterval = null;
            saveMusicTime();
        } else {
            audio.play();
            isPlaying = true;
            musicBtn.classList.add('playing');
            timerInterval = setInterval(function() {
                totalSeconds++;
                musicTimer.textContent = formatTime(totalSeconds);
                // Salvar a cada 10 segundos
                if (totalSeconds - lastSaveTime >= 10) {
                    lastSaveTime = totalSeconds;
                    saveMusicTime();
                }
            }, 1000);
        }
    });

    // Salvar ao sair da pagina
    window.addEventListener('beforeunload', function() {
        if (isPlaying) {
            saveMusicTime();
        }
    });

    // Carregar tempo ao iniciar
    loadMusicTime();
})();
