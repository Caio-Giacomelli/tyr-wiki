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
let mapClickActive = false; // Flag global para modo de selecao de ponto no mapa

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
        if (mapClickActive) return; // Nao desselecionar durante selecao de ponto
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

    // Renderizar marcadores de pontos de interesse (Hellvaults)
    if (typeof mapMarkers !== 'undefined') {
        renderMapMarkers();
    }

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
    if (mapClickActive) return; // Nao interagir com cidades durante selecao de ponto
    const svgEl = svgDoc.querySelector('svg');
    const overlay = svgDoc.getElementById('dim-overlay');

    // Mostrar overlay escuro
    overlay.style.opacity = '1';

    // Desselecionar todas as cidades — mover de volta para antes do overlay
    cityIds.forEach(cid => {
        const g = svgDoc.getElementById(cid);
        if (g) {
            g.classList.remove('active', 'city-highlighted');
            g.style.filter = '';
            svgEl.insertBefore(g, overlay);
        }
    });

    // Desselecionar todos os markers
    if (typeof mapMarkers !== 'undefined') {
        mapMarkers.forEach(m => {
            const g = svgDoc.getElementById(m.id);
            if (g) {
                g.classList.remove('active');
                g.style.filter = '';
                svgEl.insertBefore(g, overlay);
            }
        });
    }

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

        // Desselecionar markers
        if (typeof mapMarkers !== 'undefined') {
            mapMarkers.forEach(m => {
                const g = svgDoc.getElementById(m.id);
                if (g) {
                    g.classList.remove('active');
                    g.style.filter = '';
                    if (overlay) svgEl.insertBefore(g, overlay);
                }
            });
        }
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
    if (city.image) html = buildPortraitHtml(city, 'cities["' + id + '"]', 'cities', id);
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

// ===== MARCADORES NO MAPA (HELLVAULTS) =====
function renderMapMarkers() {
    if (!svgDoc) return;
    const svgEl = svgDoc.querySelector('svg');
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    const defs = svgDoc.querySelector('defs') || svgDoc.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if (!svgEl.querySelector('defs')) svgEl.insertBefore(defs, svgEl.firstChild);

    mapMarkers.forEach(marker => {
        const group = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', marker.id);
        group.style.cursor = 'pointer';
        group.style.transition = 'filter 0.3s ease, transform 0.2s ease';

        const r = marker.size / 2;

        // Clip circular
        const clipId = 'clip-' + marker.id;
        const clipPath = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clipPath.setAttribute('id', clipId);
        const clipCircle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        clipCircle.setAttribute('cx', marker.x);
        clipCircle.setAttribute('cy', marker.y);
        clipCircle.setAttribute('r', r - 2);
        clipPath.appendChild(clipCircle);
        defs.appendChild(clipPath);

        // Fundo escuro
        const bg = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bg.setAttribute('cx', marker.x);
        bg.setAttribute('cy', marker.y);
        bg.setAttribute('r', r);
        bg.setAttribute('fill', '#1a1008');
        bg.setAttribute('stroke', '#8b6914');
        bg.setAttribute('stroke-width', '2.5');
        group.appendChild(bg);

        // Imagem do icone com clip circular
        const img = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', baseUrl + marker.icon);
        img.setAttribute('x', marker.x - r + 2);
        img.setAttribute('y', marker.y - r + 2);
        img.setAttribute('width', (r - 2) * 2);
        img.setAttribute('height', (r - 2) * 2);
        img.setAttribute('clip-path', 'url(#' + clipId + ')');
        img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        group.appendChild(img);

        // Hover
        group.addEventListener('mouseenter', () => {
            if (!group.classList.contains('active')) {
                group.style.filter = 'brightness(1.3) drop-shadow(0 0 4px rgba(212, 168, 67, 0.5))';
            }
        });
        group.addEventListener('mouseleave', () => {
            if (!group.classList.contains('active')) {
                group.style.filter = '';
            }
        });

        // Click
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            showMarkerInfo(marker);
        });

        svgEl.appendChild(group);
    });
}

function showMarkerInfo(marker) {
    if (!svgDoc) return;
    if (mapClickActive) return; // Nao interagir com markers durante selecao de ponto
    const svgEl = svgDoc.querySelector('svg');
    const overlay = svgDoc.getElementById('dim-overlay');

    // Mostrar overlay escuro
    if (overlay) overlay.style.opacity = '1';

    // Desselecionar cidades — mover para antes do overlay
    cityIds.forEach(cid => {
        const g = svgDoc.getElementById(cid);
        if (g) {
            g.classList.remove('active', 'city-highlighted');
            g.style.filter = '';
            if (overlay) svgEl.insertBefore(g, overlay);
        }
    });

    // Desselecionar todos os markers — mover para antes do overlay
    mapMarkers.forEach(m => {
        const g = svgDoc.getElementById(m.id);
        if (g) {
            g.classList.remove('active');
            g.style.filter = '';
            if (overlay) svgEl.insertBefore(g, overlay);
        }
    });

    // Destacar o marker clicado — mover para cima do overlay
    const group = svgDoc.getElementById(marker.id);
    if (group) {
        group.classList.add('active');
        group.style.filter = 'drop-shadow(0 0 6px rgba(212, 168, 67, 0.7))';
        svgEl.appendChild(group);
    }

    document.getElementById('city-name').textContent = marker.name;
    document.getElementById('city-region').textContent = marker.subtitle || '';

    let html = '';

    if (marker.image) {
        html += buildPortraitHtml(marker, 'mapMarkers[' + mapMarkers.indexOf(marker) + ']');
    }

    html += '<div class="info-section"><h3>Descri\u00e7\u00e3o</h3><p>' + linkifyLocations(marker.description) + '</p></div>';

    if (marker.details && marker.details.length > 0) {
        html += '<div class="info-section"><h3>Detalhes</h3><ul>' + marker.details.map(function(d) { return '<li>' + linkifyLocations(d) + '</li>'; }).join('') + '</ul></div>';
    }

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
        html += buildPortraitHtml(char, 'characters[' + index + ']', 'characters', index);
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

// Trocar arte de qualquer entidade e salvar como padrao
function switchEntityArt(entityData, altIndex, collection, docId) {
    const img = document.getElementById('char-portrait');
    if (!img) return;

    if (altIndex === -1) {
        img.src = entityData.image;
    } else {
        img.src = entityData.altImages[altIndex];
    }

    // Salvar como arte padrao
    entityData.selectedArt = altIndex;
    if (collection && docId !== undefined && typeof db !== 'undefined') {
        db.collection(collection).doc(String(docId)).set({ selectedArt: altIndex }, { merge: true }).catch(() => {});
    }

    // Atualizar botao ativo
    document.querySelectorAll('.alt-art-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === (altIndex + 1));
    });
}

// Obter a imagem atual (default) de uma entidade considerando selectedArt
function getEntityDefaultImage(entity) {
    if (!entity || !entity.image) return '';
    if (typeof entity.selectedArt === 'number' && entity.selectedArt >= 0 && entity.altImages && entity.altImages[entity.selectedArt]) {
        return entity.altImages[entity.selectedArt];
    }
    return entity.image;
}

// Helper: gera HTML do retrato com botoes de arte alternativa
// entityRef: expressao JS que referencia a entidade (ex: 'characters[0]', 'cities["Veyrinn"]')
// collection e docId: usados para salvar selectedArt no Firestore
function buildPortraitHtml(entity, entityRef, collection, docId) {
    let html = '';
    if (!entity.image) return html;

    // Usar arte selecionada como padrao
    const displayImage = getEntityDefaultImage(entity);
    const selectedArt = typeof entity.selectedArt === 'number' ? entity.selectedArt : -1;

    html += '<div class="portrait-wrapper">';
    html += '<div class="portrait-container">';
    html += '<img class="info-portrait" id="char-portrait" src="' + displayImage + '" alt="' + (entity.name || '') + '">';

    if (entity.altImages && entity.altImages.length > 0) {
        const colArg = collection ? ", '" + collection + "'" : ", null";
        const docArg = docId !== undefined ? ", '" + docId + "'" : ", null";
        html += '<div class="alt-art-buttons">';
        html += '<button class="alt-art-btn' + (selectedArt === -1 ? ' active' : '') + '" onclick="switchEntityArt(' + entityRef + ', -1' + colArg + docArg + ')">1</button>';
        for (var i = 0; i < entity.altImages.length; i++) {
            html += '<button class="alt-art-btn' + (selectedArt === i ? ' active' : '') + '" onclick="switchEntityArt(' + entityRef + ', ' + i + colArg + docArg + ')">' + (i + 2) + '</button>';
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
        html += buildPortraitHtml(member, 'legion[' + index + ']', 'legion', index);
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
        html += buildPortraitHtml(villain, 'villains[' + index + ']', 'villains', index);
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
        html += buildPortraitHtml(artifact, 'artifacts[' + index + ']', 'artifacts', index);
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
        html += buildPortraitHtml(book, 'books[' + index + ']', 'books', index);
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
    } else {
        html += `<button id="session-read-btn" onclick="openBookModalNew(${index})">Adicionar Texto Completo</button>`;
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

    // Adicionar botao de editar dentro do modal
    const modalContent = document.getElementById('session-modal-content');
    modalContent.contentEditable = 'false';

    // Remover botoes antigos se existirem
    const oldEditBtn = document.getElementById('fulltext-edit-btn');
    if (oldEditBtn) oldEditBtn.remove();
    const oldSaveBtn = document.getElementById('fulltext-save-btn');
    if (oldSaveBtn) oldSaveBtn.remove();

    const modal = document.getElementById('session-modal');
    const editBtn = document.createElement('button');
    editBtn.id = 'fulltext-edit-btn';
    editBtn.textContent = 'Editar';
    editBtn.className = 'fulltext-modal-btn';
    editBtn.addEventListener('click', () => {
        modalContent.contentEditable = 'true';
        modalContent.classList.add('editable');
        editBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        modalContent.focus();
    });

    const saveBtn = document.createElement('button');
    saveBtn.id = 'fulltext-save-btn';
    saveBtn.textContent = 'Salvar';
    saveBtn.className = 'fulltext-modal-btn fulltext-save';
    saveBtn.style.display = 'none';
    saveBtn.addEventListener('click', async () => {
        const newText = modalContent.textContent.trim();
        book.fullText = newText;
        await saveToFirestore('books', String(index), { fullText: newText });
        modalContent.contentEditable = 'false';
        modalContent.classList.remove('editable');
        saveBtn.style.display = 'none';
        editBtn.style.display = 'inline-block';
        editBtn.textContent = 'Salvo!';
        setTimeout(() => { editBtn.textContent = 'Editar'; }, 1500);
    });

    modal.appendChild(editBtn);
    modal.appendChild(saveBtn);

    document.getElementById('session-modal-overlay').classList.add('open');
}

// Abre modal para adicionar texto completo a um livro sem fullText
function openBookModalNew(index) {
    const book = books[index];
    if (!book) return;

    document.getElementById('session-modal-title').textContent = book.name;
    document.getElementById('session-modal-quote').textContent = 'Livro / Relato';
    document.getElementById('session-modal-content').textContent = '';
    document.getElementById('session-modal-content').contentEditable = 'true';
    document.getElementById('session-modal-content').classList.add('editable');
    document.getElementById('session-modal-content').setAttribute('placeholder', 'Digite o texto completo aqui...');

    const modal = document.getElementById('session-modal');
    // Remover botoes antigos
    const oldEditBtn = document.getElementById('fulltext-edit-btn');
    if (oldEditBtn) oldEditBtn.remove();
    const oldSaveBtn = document.getElementById('fulltext-save-btn');
    if (oldSaveBtn) oldSaveBtn.remove();

    const saveBtn = document.createElement('button');
    saveBtn.id = 'fulltext-save-btn';
    saveBtn.textContent = 'Salvar';
    saveBtn.className = 'fulltext-modal-btn fulltext-save';
    saveBtn.addEventListener('click', async () => {
        const newText = document.getElementById('session-modal-content').textContent.trim();
        if (!newText) { alert('Digite o texto.'); return; }
        book.fullText = newText;
        await saveToFirestore('books', String(index), { fullText: newText });
        document.getElementById('session-modal-content').contentEditable = 'false';
        document.getElementById('session-modal-content').classList.remove('editable');
        saveBtn.textContent = 'Salvo!';
        setTimeout(() => {
            document.getElementById('session-modal-overlay').classList.remove('open');
            showBookInfo(index);
        }, 1000);
    });
    modal.appendChild(saveBtn);

    document.getElementById('session-modal-overlay').classList.add('open');
    document.getElementById('session-modal-content').focus();
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
    if (npc.image) html += buildPortraitHtml(npc, 'historicalNPCs[' + index + ']', 'historicalNPCs', index);
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
    if (ally.image) html += buildPortraitHtml(ally, 'allies[' + index + ']', 'allies', index);
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

    // Personagens Históricos
    if (typeof historicalNPCs !== 'undefined') {
        historicalNPCs.forEach((npc, index) => {
            if (npc && npc.name) map[npc.name] = { type: 'historical', index: index };
        });
    }

    // Aliados
    if (typeof allies !== 'undefined') {
        allies.forEach((ally, index) => {
            if (ally && ally.name) map[ally.name] = { type: 'ally', index: index };
        });
    }

    // Marcos Históricos
    if (typeof landmarks !== 'undefined') {
        landmarks.forEach((lm, index) => {
            if (lm && lm.name) map[lm.name] = { type: 'landmark', index: index };
        });
    }

    return map;
}

let entityMap = buildEntityMap();

// Reconstruir entityMap (chamado apos salvar/adicionar entidades)
function rebuildEntityMap() {
    entityMap = buildEntityMap();
}

function linkifyLocations(text) {
    // Primeiro: processar links manuais com sintaxe [Nome]
    let result = text.replace(/\[([^\]]+)\]/g, function(match, name) {
        const entity = entityMap[name];
        if (!entity) return name; // Remove colchetes mas nao linka se nao encontrar
        const onclick = getEntityOnclick(entity);
        const cssClass = entity.type === 'location' ? 'map-link' : 'wiki-link';
        return '<a class="' + cssClass + '" href="#" onclick="' + onclick + '; return false;">' + name + '</a>';
    });

    // Segundo: linkify automatico por nome
    const names = Object.keys(entityMap).sort((a, b) => b.length - a.length);
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

            const onclick = getEntityOnclick(entity);
            const cssClass = entity.type === 'location' ? 'map-link' : 'wiki-link';

            return `<a class="${cssClass}" href="#" onclick="${onclick}; return false;">${p1}</a>`;
        });
    });

    return result;
}

// Helper: gerar onclick string para uma entidade
function getEntityOnclick(entity) {
    switch (entity.type) {
        case 'location': return "highlightLocation('" + entity.id + "')";
        case 'character': return 'showCharacterInfo(' + entity.index + ')';
        case 'legion': return 'showLegionInfo(' + entity.index + ')';
        case 'villain': return 'showVillainInfo(' + entity.index + ')';
        case 'artifact': return 'showArtifactInfo(' + entity.index + ')';
        case 'book': return 'showBookInfo(' + entity.index + ')';
        case 'historical': return 'showHistoricalInfo(' + entity.index + ')';
        case 'ally': return 'showAllyInfo(' + entity.index + ')';
        case 'landmark': return 'showLandmarkInfo(' + entity.index + ')';
        default: return '';
    }
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
    solnegro: { displayName: 'Sol Negro', stops: solNegroStopsCombined, sessions: solNegroSessionsCombined, color: '#d4a843', pathColor: '#d4a843', party: [
        { name: 'Stor', img: 'img/Stor.png', offset: -36 },
        { name: 'Elandor', img: 'img/Elandor.png', offset: 36 },
        { name: 'Azarran', img: 'img/Azarran.png', offset: 0 }
    ]},
    cicatriz: { displayName: 'Cicatrizes do Eclipse', stops: typeof journeyStopsCicatriz !== 'undefined' ? journeyStopsCicatriz : [], sessions: typeof sessionsDataCicatriz !== 'undefined' ? sessionsDataCicatriz : [], color: '#4a9cc8', pathColor: '#4a9cc8', party: [
        { name: 'Falin', img: 'img/Falin.png', offset: -30 },
        { name: 'Durgan', img: 'img/Durgan.png', offset: 30 }
    ]}
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

        // Primeiro: tentar usar indice direto (funciona para todas as jornadas salvas via editor)
        if (config.sessions[index] && config.sessions[index].content) {
            sessionId = index;
        } else if (currentJourneyKey === 'solnegro') {
            // Fallback Sol Negro: parsing do campo session
            var isT2 = stop.session.indexOf('T2') === 0;
            var stopSession = stop.session.replace(/^T\d+ - /, '');
            if (isT2) {
                var epMatch = stopSession.match(/E(\d+)/);
                if (epMatch) {
                    var t1Count = typeof sessionsData !== 'undefined' ? sessionsData.length : 0;
                    sessionId = t1Count + parseInt(epMatch[1]) - 1;
                }
            } else {
                var numMatch = stopSession.match(/(\d+)/);
                if (numMatch) sessionId = parseInt(numMatch[1]);
            }
        } else if (currentJourneyKey === 'cicatriz') {
            var epMatch2 = stop.session.match(/E(\d+)/);
            if (epMatch2) sessionId = parseInt(epMatch2[1]) - 1;
        } else {
            sessionId = index;
        }
        if (sessionId !== null && config.sessions[sessionId] && config.sessions[sessionId].content) {
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
    // Limpar estado de edicao fulltext
    const content = document.getElementById('session-modal-content');
    if (content) {
        content.contentEditable = 'false';
        content.classList.remove('editable');
    }
    const editBtn = document.getElementById('fulltext-edit-btn');
    if (editBtn) editBtn.remove();
    const saveBtn = document.getElementById('fulltext-save-btn');
    if (saveBtn) saveBtn.remove();
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

    const partyChars = config.party || [];

    const offsetStops = getOffsetStopsFor(config.stops);
    const firstStop = offsetStops[0];

    partyChars.forEach((char, i) => {
        // Buscar imagem padrao do personagem pela lista de entidades
        let charImg = char.img || '';
        const allEntities = [
            ...(typeof characters !== 'undefined' ? characters : []),
            ...(typeof legion !== 'undefined' ? legion : []),
            ...(typeof allies !== 'undefined' ? allies : []),
            ...(typeof villains !== 'undefined' ? villains : []),
            ...(typeof historicalNPCs !== 'undefined' ? historicalNPCs : [])
        ];
        const charData = allEntities.find(e => e && e.name === char.name);
        if (charData) charImg = getEntityDefaultImage(charData);
        if (!charImg) return;

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
        const imgSrc = charImg.startsWith('data:') ? charImg : baseUrl + charImg;
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imgSrc);
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
        const allPartyChars = config.party || [];
        const destStop = config.stops[thisIndex];
        const destParticipants = destStop && destStop.participants && destStop.participants.length > 0 ? destStop.participants : null;
        const spacing = 36;

        // Determinar quais membros serao visiveis na parada de destino
        const visibleInDest = [];
        allPartyChars.forEach((char, i) => {
            if (!destParticipants || destParticipants.includes(char.name)) {
                visibleInDest.push(i);
            }
        });
        const totalWidthDest = (visibleInDest.length - 1) * spacing;

        // Esconder membros que nao participam da proxima parada antes de animar
        allPartyChars.forEach((char, i) => {
            const charG = svgDoc.getElementById(`party-char-${currentJourneyKey}-${i}`);
            if (!charG) return;
            charG.style.display = visibleInDest.includes(i) ? '' : 'none';
        });

        const duration = 2000;
        const animStart = performance.now();

        function animatePartyMove(now) {
            if (!activeJourneys[currentJourneyKey]) return;
            const elapsed = now - animStart;
            const t = Math.min(elapsed / duration, 1);
            const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            const cx = prev.ox + (stop.ox - prev.ox) * eased;
            const cy = prev.oy + (stop.oy - prev.oy) * eased;

            visibleInDest.forEach((origIndex, visPos) => {
                const charG = svgDoc.getElementById(`party-char-${currentJourneyKey}-${origIndex}`);
                if (!charG) return;
                const offset = -totalWidthDest / 2 + visPos * spacing;
                charG.setAttribute('transform', `translate(${cx + offset}, ${cy - 40})`);
            });

            // Animate line opacity
            borderLine.setAttribute('opacity', String(eased * 0.9));
            line.setAttribute('opacity', String(eased * 0.9));

            if (t < 1) {
                requestAnimationFrame(animatePartyMove);
            } else {
                updatePartyVisibility(config, thisIndex);
                placeStopMarker(stop, thisIndex, stopsGroup, config);
                showJourneyStop(config.stops[thisIndex], thisIndex);
                if (journeyMode === 'auto' && currentStopIndex === thisIndex) {
                    journeyAnimation = setTimeout(() => { currentStopIndex++; advanceJourney(); }, 2500);
                }
            }
        }

        requestAnimationFrame(animatePartyMove);
    } else {
        // Primeira parada: ajustar visibilidade dos membros
        updatePartyVisibility(config, 0);
        placeStopMarker(stop, 0, stopsGroup, config);
        showJourneyStop(config.stops[0], 0);
        if (journeyMode === 'auto') {
            journeyAnimation = setTimeout(() => { currentStopIndex++; advanceJourney(); }, 2000);
        }
    }
}

// Mostrar/esconder membros da party baseado nos participantes da parada e reposicionar
function updatePartyVisibility(config, stopIndex) {
    const partyChars = config.party || [];
    const stop = config.stops[stopIndex];
    const participants = stop && stop.participants ? stop.participants : null;
    const offsetStops = getOffsetStopsFor(config.stops);
    const currentStop = offsetStops[stopIndex];
    const spacing = 36;

    // Determinar quais membros sao visiveis
    const visibleIndices = [];
    partyChars.forEach((char, i) => {
        if (!participants || participants.length === 0 || participants.includes(char.name)) {
            visibleIndices.push(i);
        }
    });

    // Calcular offsets centralizados para os visiveis
    const totalWidth = (visibleIndices.length - 1) * spacing;

    partyChars.forEach((char, i) => {
        const charG = svgDoc.getElementById(`party-char-${currentJourneyKey}-${i}`);
        if (!charG) return;

        const visiblePos = visibleIndices.indexOf(i);
        if (visiblePos < 0) {
            charG.style.display = 'none';
        } else {
            charG.style.display = '';
            const offset = -totalWidth / 2 + visiblePos * spacing;
            charG.setAttribute('transform', `translate(${currentStop.ox + offset}, ${currentStop.oy - 40})`);
        }
    });
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

// ===== MODO DEBUG - COORDENADAS =====
let debugMode = false;
let debugPoints = [];

document.getElementById('debug-btn').addEventListener('click', () => {
    debugMode = !debugMode;
    let debugPanel = document.getElementById('debug-panel');
    const debugBtn = document.getElementById('debug-btn');
    if (debugMode) {
        debugBtn.classList.add('active');
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
        debugBtn.classList.remove('active');
        if (debugPanel) debugPanel.style.display = 'none';
        if (svgDoc) {
            svgDoc.removeEventListener('click', debugClick, true);
            const svgEl = svgDoc.querySelector('svg');
            if (svgEl) {
                svgEl.querySelectorAll('.debug-marker').forEach(m => m.remove());
            }
        }
        debugPoints = [];
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


// ===== PONTOS DE INTERESSE CUSTOMIZADOS =====
(function() {
    const pinBtn = document.getElementById('pin-btn');
    const poiOverlay = document.getElementById('poi-modal-overlay');
    const poiCloseBtn = document.getElementById('poi-modal-close');
    const poiSaveBtn = document.getElementById('poi-save-btn');
    const poiIconSearchBtn = document.getElementById('poi-icon-search-btn');
    const poiIconResults = document.getElementById('poi-icon-results');
    const poiIconPreview = document.getElementById('poi-icon-preview');
    const poiIconQuery = document.getElementById('poi-icon-query');
    const poiNameInput = document.getElementById('poi-name');
    const poiDescInput = document.getElementById('poi-description');
    const poiDetailsInput = document.getElementById('poi-details');

    let pinMode = false;
    let pendingCoords = null;
    let selectedIconSvg = '';
    let selectedIconId = '';
    let selectedImage = '';
    let customPOIs = []; // carregado do Firestore
    let editingPOI = null; // POI sendo editado
    const poiDeleteBtn = document.getElementById('poi-delete-btn');
    const poiImageBtn = document.getElementById('poi-image-btn');
    const poiImageStatus = document.getElementById('poi-image-status');
    const poiImagePreview = document.getElementById('poi-image-preview');

    // Toggle modo PIN
    pinBtn.addEventListener('click', () => {
        pinMode = !pinMode;
        pinBtn.classList.toggle('active', pinMode);
        if (pinMode && svgDoc) {
            svgDoc.addEventListener('click', pinClick, true);
        } else if (svgDoc) {
            svgDoc.removeEventListener('click', pinClick, true);
        }
    });

    // Clique no mapa em modo PIN
    function pinClick(e) {
        if (!pinMode || !svgDoc) return;
        e.stopPropagation();
        e.preventDefault();

        // Verificar se clicou em um POI existente
        const target = e.target;
        let clickedPOI = null;
        for (const poi of customPOIs) {
            const group = svgDoc.getElementById(poi.id);
            if (group && group.contains(target)) {
                clickedPOI = poi;
                break;
            }
        }

        if (clickedPOI) {
            // Editar POI existente
            editingPOI = clickedPOI;
            pinMode = false;
            pinBtn.classList.remove('active');
            svgDoc.removeEventListener('click', pinClick, true);
            openPOIModal(clickedPOI);
        } else {
            // Criar novo POI
            const svgEl = svgDoc.querySelector('svg');
            const pt = svgEl.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgPt = pt.matrixTransform(svgEl.getScreenCTM().inverse());

            pendingCoords = { x: Math.round(svgPt.x), y: Math.round(svgPt.y) };
            editingPOI = null;

            // Desativar modo pin e abrir modal
            pinMode = false;
            pinBtn.classList.remove('active');
            svgDoc.removeEventListener('click', pinClick, true);
            openPOIModal(null);
        }
    }

    // Abrir/fechar modal
    function openPOIModal(existingPOI) {
        if (existingPOI) {
            poiNameInput.value = existingPOI.name || '';
            poiDescInput.value = existingPOI.description || '';
            poiDetailsInput.value = (existingPOI.details || []).join('\n');
            selectedIconSvg = existingPOI.iconSvg || '';
            selectedIconId = existingPOI.iconId || '';
            selectedImage = existingPOI.image || '';
            poiIconPreview.innerHTML = selectedIconSvg || 'Nenhum';
            if (selectedImage) {
                poiImagePreview.innerHTML = '<img src="' + selectedImage + '" alt="Preview">';
                poiImageStatus.textContent = 'Imagem atual';
            } else {
                poiImagePreview.innerHTML = '';
                poiImageStatus.textContent = 'Nenhuma';
            }
            poiDeleteBtn.style.display = 'block';
            document.querySelector('#poi-modal h2').textContent = 'Editar Ponto de Interesse';
        } else {
            poiNameInput.value = '';
            poiDescInput.value = '';
            poiDetailsInput.value = '';
            selectedIconSvg = '';
            selectedIconId = '';
            selectedImage = '';
            poiIconPreview.textContent = 'Nenhum';
            poiImagePreview.innerHTML = '';
            poiImageStatus.textContent = 'Nenhuma';
            poiDeleteBtn.style.display = 'none';
            document.querySelector('#poi-modal h2').textContent = 'Novo Ponto de Interesse';
        }
        poiIconQuery.value = '';
        poiIconResults.innerHTML = '';
        poiOverlay.classList.add('open');
    }

    function closePOIModal() {
        poiOverlay.classList.remove('open');
        pendingCoords = null;
    }

    poiCloseBtn.addEventListener('click', closePOIModal);
    poiOverlay.addEventListener('click', (e) => {
        if (e.target === poiOverlay) closePOIModal();
    });

    // Upload de imagem para o POI
    poiImageBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            poiImageStatus.textContent = 'Comprimindo...';
            try {
                const dataUrl = await compressImage(file, 600, 0.75);
                selectedImage = dataUrl;
                poiImageStatus.textContent = file.name;
                poiImagePreview.innerHTML = '<img src="' + dataUrl + '" alt="Preview">';
            } catch (err) {
                poiImageStatus.textContent = 'Erro ao carregar';
            }
        });
        input.click();
    });

    // Buscar icones na Iconify API
    poiIconSearchBtn.addEventListener('click', searchIcons);
    poiIconQuery.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchIcons();
    });

    async function searchIcons() {
        const query = poiIconQuery.value.trim();
        if (!query) return;
        poiIconResults.innerHTML = '<div style="color:#999;font-size:12px;">Buscando...</div>';

        try {
            const resp = await fetch('https://api.iconify.design/search?query=' + encodeURIComponent(query) + '&limit=48');
            const data = await resp.json();

            if (!data.icons || data.icons.length === 0) {
                poiIconResults.innerHTML = '<div style="color:#999;font-size:12px;">Nenhum icone encontrado. Tente em ingles (ex: cave, skull, dragon).</div>';
                return;
            }

            poiIconResults.innerHTML = '';
            const icons = data.icons.slice(0, 48);

            // Carregar SVGs em paralelo (batch)
            const promises = icons.map(iconName =>
                fetch('https://api.iconify.design/' + iconName + '.svg?height=24')
                    .then(r => r.text())
                    .then(svgText => ({ iconName, svgText }))
                    .catch(() => null)
            );

            const results = await Promise.all(promises);

            results.forEach(result => {
                if (!result) return;
                const option = document.createElement('div');
                option.className = 'poi-icon-option';
                option.innerHTML = result.svgText;
                option.title = result.iconName;
                option.addEventListener('click', () => {
                    document.querySelectorAll('.poi-icon-option.selected').forEach(el => el.classList.remove('selected'));
                    option.classList.add('selected');
                    selectedIconSvg = result.svgText;
                    selectedIconId = result.iconName;
                    poiIconPreview.innerHTML = result.svgText;
                });
                poiIconResults.appendChild(option);
            });

            if (poiIconResults.children.length === 0) {
                poiIconResults.innerHTML = '<div style="color:#999;font-size:12px;">Nenhum icone carregado. Tente outro termo.</div>';
            }
        } catch (err) {
            console.error('Erro na busca de icones:', err);
            poiIconResults.innerHTML = '<div style="color:#e55;font-size:12px;">Erro na busca. Tente novamente.</div>';
        }
    }

    // Salvar POI (criar ou editar)
    poiSaveBtn.addEventListener('click', async () => {
        const name = poiNameInput.value.trim();
        if (!name) { alert('Digite um nome para o ponto.'); return; }
        if (!selectedIconSvg) { alert('Selecione um icone.'); return; }

        poiSaveBtn.textContent = 'Salvando...';
        poiSaveBtn.disabled = true;

        try {
            if (editingPOI) {
                // Editar existente
                editingPOI.name = name;
                editingPOI.description = poiDescInput.value.trim();
                editingPOI.details = poiDetailsInput.value.trim().split('\n').filter(d => d.trim());
                editingPOI.iconSvg = selectedIconSvg;
                editingPOI.iconId = selectedIconId;
                editingPOI.image = selectedImage;

                await db.collection('customPOIs').doc(editingPOI.id).set(editingPOI, { merge: true });

                // Re-renderizar no mapa
                const oldGroup = svgDoc.getElementById(editingPOI.id);
                if (oldGroup) oldGroup.remove();
                renderSinglePOI(editingPOI);
            } else {
                // Criar novo
                if (!pendingCoords) { alert('Coordenadas invalidas. Tente novamente.'); return; }

                const poi = {
                    id: 'poi-' + Date.now(),
                    x: pendingCoords.x,
                    y: pendingCoords.y,
                    name: name,
                    description: poiDescInput.value.trim(),
                    details: poiDetailsInput.value.trim().split('\n').filter(d => d.trim()),
                    iconSvg: selectedIconSvg,
                    iconId: selectedIconId,
                    image: selectedImage,
                    size: 28
                };

                await db.collection('customPOIs').doc(poi.id).set(poi);
                customPOIs.push(poi);
                renderSinglePOI(poi);
            }
            closePOIModal();
        } catch (err) {
            console.error('Erro ao salvar POI:', err);
            alert('Erro ao salvar. Tente novamente.');
        }

        poiSaveBtn.textContent = 'Salvar Ponto';
        poiSaveBtn.disabled = false;
    });

    // Excluir POI
    poiDeleteBtn.addEventListener('click', async () => {
        if (!editingPOI) return;
        if (!confirm('Excluir "' + editingPOI.name + '"? Essa acao nao pode ser desfeita.')) return;

        poiDeleteBtn.textContent = 'Excluindo...';
        poiDeleteBtn.disabled = true;

        try {
            await db.collection('customPOIs').doc(editingPOI.id).delete();

            // Remover do mapa
            const group = svgDoc.getElementById(editingPOI.id);
            if (group) group.remove();

            // Remover do array local
            customPOIs = customPOIs.filter(p => p.id !== editingPOI.id);

            closePOIModal();
            deselectAll();
        } catch (err) {
            console.error('Erro ao excluir POI:', err);
            alert('Erro ao excluir. Tente novamente.');
        }

        poiDeleteBtn.textContent = 'Excluir Marcador';
        poiDeleteBtn.disabled = false;
    });

    // Renderizar um POI no mapa
    function renderSinglePOI(poi) {
        if (!svgDoc) return;
        const svgEl = svgDoc.querySelector('svg');
        const r = poi.size / 2;

        const group = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', poi.id);
        group.style.cursor = 'pointer';
        group.style.transition = 'filter 0.3s ease';

        // Fundo circular
        const bg = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bg.setAttribute('cx', poi.x);
        bg.setAttribute('cy', poi.y);
        bg.setAttribute('r', r);
        bg.setAttribute('fill', '#1a1008');
        bg.setAttribute('stroke', '#8b6914');
        bg.setAttribute('stroke-width', '2');
        group.appendChild(bg);

        // Icone SVG via foreignObject
        const fo = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        fo.setAttribute('x', poi.x - r + 4);
        fo.setAttribute('y', poi.y - r + 4);
        fo.setAttribute('width', (r - 4) * 2);
        fo.setAttribute('height', (r - 4) * 2);
        const iconDiv = document.createElement('div');
        iconDiv.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
        iconDiv.innerHTML = poi.iconSvg.replace(/width="[^"]*"/, 'width="' + ((r - 4) * 2 - 4) + '"').replace(/height="[^"]*"/, 'height="' + ((r - 4) * 2 - 4) + '"');
        // Colorir o icone
        const svgIcon = iconDiv.querySelector('svg');
        if (svgIcon) svgIcon.style.fill = '#d4a843';
        fo.appendChild(iconDiv);
        group.appendChild(fo);

        // Hover
        group.addEventListener('mouseenter', () => {
            if (!group.classList.contains('active')) {
                group.style.filter = 'brightness(1.3) drop-shadow(0 0 4px rgba(212, 168, 67, 0.5))';
            }
        });
        group.addEventListener('mouseleave', () => {
            if (!group.classList.contains('active')) {
                group.style.filter = '';
            }
        });

        // Click - mostrar info no painel
        group.addEventListener('click', (e) => {
            e.stopPropagation();
            showPOIInfo(poi);
        });

        svgEl.appendChild(group);
    }

    // Mostrar info do POI no painel lateral
    function showPOIInfo(poi) {
        if (!svgDoc) return;
        const svgEl = svgDoc.querySelector('svg');
        const overlay = svgDoc.getElementById('dim-overlay');

        if (overlay) overlay.style.opacity = '1';

        // Desselecionar cidades
        cityIds.forEach(cid => {
            const g = svgDoc.getElementById(cid);
            if (g) {
                g.classList.remove('active', 'city-highlighted');
                g.style.filter = '';
                if (overlay) svgEl.insertBefore(g, overlay);
            }
        });

        // Desselecionar markers fixos
        if (typeof mapMarkers !== 'undefined') {
            mapMarkers.forEach(m => {
                const g = svgDoc.getElementById(m.id);
                if (g) { g.classList.remove('active'); g.style.filter = ''; if (overlay) svgEl.insertBefore(g, overlay); }
            });
        }

        // Desselecionar outros POIs
        customPOIs.forEach(p => {
            const g = svgDoc.getElementById(p.id);
            if (g) { g.classList.remove('active'); g.style.filter = ''; if (overlay) svgEl.insertBefore(g, overlay); }
        });

        // Destacar este POI
        const group = svgDoc.getElementById(poi.id);
        if (group) {
            group.classList.add('active');
            group.style.filter = 'drop-shadow(0 0 6px rgba(212, 168, 67, 0.7))';
            svgEl.appendChild(group);
        }

        document.getElementById('city-name').textContent = poi.name;
        document.getElementById('city-region').textContent = 'Ponto de Interesse';

        let html = '';
        if (poi.image) {
            html += '<img class="info-portrait" src="' + poi.image + '" alt="' + poi.name + '">';
        }
        if (poi.description) {
            html += '<div class="info-section"><h3>Descri\u00e7\u00e3o</h3><p>' + linkifyLocations(poi.description) + '</p></div>';
        }
        if (poi.details && poi.details.length > 0) {
            html += '<div class="info-section"><h3>Detalhes</h3><ul>' + poi.details.map(function(d) { return '<li>' + linkifyLocations(d) + '</li>'; }).join('') + '</ul></div>';
        }

        document.getElementById('city-info').innerHTML = html;
        infoPanel.classList.add('open');
    }

    // Carregar POIs salvos do Firestore ao iniciar
    async function loadCustomPOIs() {
        if (typeof db === 'undefined') return;
        try {
            const snap = await db.collection('customPOIs').get();
            snap.forEach(doc => {
                const poi = doc.data();
                customPOIs.push(poi);
            });
            // Esperar o SVG carregar antes de renderizar
            function tryRender() {
                if (svgDoc && svgDoc.querySelector('svg')) {
                    customPOIs.forEach(poi => renderSinglePOI(poi));
                } else {
                    setTimeout(tryRender, 500);
                }
            }
            tryRender();
        } catch (err) {
            console.log('POIs customizados indisponiveis:', err.message);
        }
    }

    // Atualizar deselectAll para incluir POIs customizados
    const _origDeselectAll = deselectAll;
    deselectAll = function() {
        _origDeselectAll();
        if (svgDoc) {
            const svgEl = svgDoc.querySelector('svg');
            const overlay = svgDoc.getElementById('dim-overlay');
            customPOIs.forEach(p => {
                const g = svgDoc.getElementById(p.id);
                if (g) { g.classList.remove('active'); g.style.filter = ''; if (overlay) svgEl.insertBefore(g, overlay); }
            });
        }
    };

    loadCustomPOIs();
})();


// ===== ADICIONAR NOVAS ENTRADAS NA WIKI =====
(function() {
    const addOverlay = document.getElementById('wiki-add-overlay');
    const addModal = document.getElementById('wiki-add-modal');
    const addClose = document.getElementById('wiki-add-close');
    const addTitle = document.getElementById('wiki-add-title');
    const addForm = document.getElementById('wiki-add-form');

    // Definicoes de formulario por tipo
    const formDefs = {
        character: {
            title: 'Novo Personagem',
            collection: 'characters',
            fields: [
                { key: 'name', label: 'Nome', type: 'text' },
                { key: 'charTitle', label: 'Titulo / Classe', type: 'text' },
                { key: 'player', label: 'Controlado por', type: 'text', default: 'Maiks' },
                { key: 'description', label: 'Descricao', type: 'textarea' },
                { key: 'details', label: 'Detalhes (um por linha)', type: 'textarea' },
                { key: 'image', label: 'Imagem', type: 'image' }
            ],
            build: function(data) {
                return {
                    name: data.name,
                    title: data.charTitle || '',
                    player: data.player || 'Maiks',
                    image: data.image || null,
                    altImages: [],
                    description: data.description || '',
                    details: (data.details || '').split('\n').filter(d => d.trim())
                };
            }
        },
        historical: {
            title: 'Novo Personagem Historico',
            collection: 'historicalNPCs',
            fields: [
                { key: 'name', label: 'Nome', type: 'text' },
                { key: 'entryTitle', label: 'Titulo', type: 'text' },
                { key: 'description', label: 'Descricao', type: 'textarea' },
                { key: 'details', label: 'Detalhes (um por linha)', type: 'textarea' },
                { key: 'image', label: 'Imagem', type: 'image' }
            ],
            build: function(data) {
                return {
                    name: data.name,
                    title: data.entryTitle || '',
                    image: data.image || null,
                    description: data.description || '',
                    details: (data.details || '').split('\n').filter(d => d.trim())
                };
            }
        },
        ally: {
            title: 'Novo Aliado',
            collection: 'allies',
            fields: [
                { key: 'name', label: 'Nome', type: 'text' },
                { key: 'entryTitle', label: 'Titulo', type: 'text' },
                { key: 'description', label: 'Descricao', type: 'textarea' },
                { key: 'details', label: 'Detalhes (um por linha)', type: 'textarea' },
                { key: 'image', label: 'Imagem', type: 'image' }
            ],
            build: function(data) {
                return {
                    name: data.name,
                    title: data.entryTitle || '',
                    image: data.image || null,
                    description: data.description || '',
                    details: (data.details || '').split('\n').filter(d => d.trim())
                };
            }
        },
        legion: {
            title: 'Novo Membro da Legiao',
            collection: 'legion',
            fields: [
                { key: 'name', label: 'Nome', type: 'text' },
                { key: 'entryTitle', label: 'Titulo', type: 'text' },
                { key: 'description', label: 'Descricao', type: 'textarea' },
                { key: 'details', label: 'Detalhes (um por linha)', type: 'textarea' },
                { key: 'image', label: 'Imagem', type: 'image' }
            ],
            build: function(data) {
                return {
                    name: data.name,
                    title: data.entryTitle || '',
                    image: data.image || null,
                    description: data.description || '',
                    details: (data.details || '').split('\n').filter(d => d.trim()),
                    location: ''
                };
            }
        },
        villain: {
            title: 'Novo Vilao',
            collection: 'villains',
            fields: [
                { key: 'name', label: 'Nome', type: 'text' },
                { key: 'entryTitle', label: 'Titulo', type: 'text' },
                { key: 'description', label: 'Descricao', type: 'textarea' },
                { key: 'details', label: 'Detalhes (um por linha)', type: 'textarea' },
                { key: 'image', label: 'Imagem', type: 'image' }
            ],
            build: function(data) {
                return {
                    name: data.name,
                    title: data.entryTitle || '',
                    image: data.image || null,
                    description: data.description || '',
                    details: (data.details || '').split('\n').filter(d => d.trim()),
                    location: ''
                };
            }
        },
        artifact: {
            title: 'Novo Artefato',
            collection: 'artifacts',
            fields: [
                { key: 'name', label: 'Nome', type: 'text' },
                { key: 'description', label: 'Descricao', type: 'textarea' },
                { key: 'details', label: 'Detalhes (um por linha)', type: 'textarea' },
                { key: 'image', label: 'Imagem', type: 'image' }
            ],
            build: function(data) {
                return {
                    name: data.name,
                    image: data.image || null,
                    description: data.description || '',
                    details: (data.details || '').split('\n').filter(d => d.trim())
                };
            }
        },
        book: {
            title: 'Novo Livro / Relato',
            collection: 'books',
            fields: [
                { key: 'name', label: 'Nome', type: 'text' },
                { key: 'description', label: 'Descricao', type: 'textarea' },
                { key: 'details', label: 'Detalhes (um por linha)', type: 'textarea' },
                { key: 'fullText', label: 'Documento na Integra', type: 'fulltext' },
                { key: 'image', label: 'Imagem', type: 'image' }
            ],
            build: function(data) {
                return {
                    name: data.name,
                    image: data.image || null,
                    description: data.description || '',
                    details: (data.details || '').split('\n').filter(d => d.trim()),
                    fullText: data.fullText || ''
                };
            }
        },
        landmark: {
            title: 'Novo Marco Historico',
            collection: 'landmarks',
            fields: [
                { key: 'name', label: 'Nome', type: 'text' },
                { key: 'description', label: 'Descricao', type: 'textarea' },
                { key: 'details', label: 'Detalhes (um por linha)', type: 'textarea' }
            ],
            build: function(data) {
                return {
                    name: data.name,
                    description: data.description || '',
                    details: (data.details || '').split('\n').filter(d => d.trim())
                };
            }
        }
    };

    // Mapeamento de list IDs para tipos
    const listTypeMap = {
        'characters-list': 'character',
        'historical-list': 'historical',
        'allies-list': 'ally',
        'legion-list': 'legion',
        'villains-list': 'villain',
        'artifacts-list': 'artifact',
        'books-list': 'book',
        'landmarks-list': 'landmark'
    };

    // Mapeamento de tipo para array/funcao de display
    const typeArrayMap = {
        character: { arr: () => characters, show: showCharacterInfo, listEl: () => document.getElementById('characters-list') },
        historical: { arr: () => (typeof historicalNPCs !== 'undefined' ? historicalNPCs : []), show: showHistoricalInfo, listEl: () => document.getElementById('historical-list') },
        ally: { arr: () => (typeof allies !== 'undefined' ? allies : []), show: showAllyInfo, listEl: () => document.getElementById('allies-list') },
        legion: { arr: () => legion, show: showLegionInfo, listEl: () => document.getElementById('legion-list') },
        villain: { arr: () => villains, show: showVillainInfo, listEl: () => document.getElementById('villains-list') },
        artifact: { arr: () => (typeof artifacts !== 'undefined' ? artifacts : []), show: showArtifactInfo, listEl: () => document.getElementById('artifacts-list') },
        book: { arr: () => (typeof books !== 'undefined' ? books : []), show: showBookInfo, listEl: () => document.getElementById('books-list') },
        landmark: { arr: () => (typeof landmarks !== 'undefined' ? landmarks : []), show: showLandmarkInfo, listEl: () => document.getElementById('landmarks-list') }
    };

    // Adicionar botao "+" em cada lista
    Object.keys(listTypeMap).forEach(listId => {
        const listEl = document.getElementById(listId);
        if (!listEl) return;
        const addItem = document.createElement('div');
        addItem.className = 'wiki-add-item';
        addItem.textContent = '+ Adicionar';
        addItem.addEventListener('click', (e) => {
            e.stopPropagation();
            openAddModal(listTypeMap[listId]);
        });
        listEl.appendChild(addItem);
    });

    let currentAddType = null;
    let addImageData = '';

    function openAddModal(type) {
        const def = formDefs[type];
        if (!def) return;
        currentAddType = type;
        addImageData = '';
        addTitle.textContent = def.title;

        let html = '';
        def.fields.forEach(field => {
            html += '<label>' + field.label + '</label>';
            if (field.type === 'text') {
                html += '<input type="text" id="wiki-add-' + field.key + '" value="' + (field.default || '') + '">';
            } else if (field.type === 'textarea') {
                html += '<textarea id="wiki-add-' + field.key + '"></textarea>';
            } else if (field.type === 'fulltext') {
                html += '<textarea id="wiki-add-' + field.key + '" class="fulltext-area" placeholder="Cole o texto completo aqui..."></textarea>';
            } else if (field.type === 'image') {
                html += '<div class="poi-image-upload"><button type="button" id="wiki-add-image-btn">Escolher imagem...</button><span id="wiki-add-image-status">Nenhuma</span></div>';
                html += '<div id="wiki-add-image-preview"></div>';
            }
        });
        html += '<button class="wiki-add-save" id="wiki-add-save-btn">Salvar</button>';
        addForm.innerHTML = html;

        // Bind image button if exists
        const imgBtn = document.getElementById('wiki-add-image-btn');
        if (imgBtn) {
            imgBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    document.getElementById('wiki-add-image-status').textContent = 'Comprimindo...';
                    try {
                        addImageData = await compressImage(file, 600, 0.75);
                        document.getElementById('wiki-add-image-status').textContent = file.name;
                        document.getElementById('wiki-add-image-preview').innerHTML = '<img src="' + addImageData + '" style="max-width:100%;max-height:100px;border-radius:6px;border:1px solid #555;margin-top:6px;">';
                    } catch (err) {
                        document.getElementById('wiki-add-image-status').textContent = 'Erro';
                    }
                });
                input.click();
            });
        }

        // Bind save button
        document.getElementById('wiki-add-save-btn').addEventListener('click', saveNewEntry);

        addOverlay.classList.add('open');
    }

    async function saveNewEntry() {
        const def = formDefs[currentAddType];
        if (!def) return;

        // Coletar dados
        const data = {};
        def.fields.forEach(field => {
            if (field.type === 'image') {
                data.image = addImageData || null;
            } else {
                const el = document.getElementById('wiki-add-' + field.key);
                data[field.key] = el ? el.value : '';
            }
        });

        if (!data.name || !data.name.trim()) {
            alert('Digite um nome.');
            return;
        }

        // Verificar nome duplicado em todas as entidades
        const allNames = Object.keys(entityMap).map(n => n.toLowerCase());
        if (allNames.includes(data.name.trim().toLowerCase())) {
            alert('Ja existe uma pagina com esse nome. Escolha um nome diferente.');
            return;
        }

        const entry = def.build(data);
        const saveBtn = document.getElementById('wiki-add-save-btn');
        saveBtn.textContent = 'Salvando...';
        saveBtn.disabled = true;

        try {
            const arr = typeArrayMap[currentAddType].arr();
            const newIndex = arr.length;

            // Salvar no Firestore com ID unico (prefixo new_ para nao colidir com indexes base)
            const docId = 'new_' + Date.now();
            entry._docId = docId;
            await db.collection(def.collection).doc(docId).set(entry, { merge: true });

            // Adicionar ao array local
            arr.push(entry);

            // Adicionar item na lista do sidebar
            const listEl = typeArrayMap[currentAddType].listEl();
            const showFn = typeArrayMap[currentAddType].show;
            const item = document.createElement('div');
            item.className = 'wiki-item';
            item.textContent = entry.name;
            item.dataset.searchName = entry.name.toLowerCase();
            item.addEventListener('click', () => showFn(newIndex));

            // Inserir antes do botao "+"
            const addBtn = listEl.querySelector('.wiki-add-item');
            if (addBtn) {
                listEl.insertBefore(item, addBtn);
            } else {
                listEl.appendChild(item);
            }

            // Mostrar a pagina recem-criada com botao de edicao
            showFn(newIndex);
            showEditButton(currentAddType, newIndex, entry);

            // Atualizar entityMap com a nova entrada
            entityMap[entry.name] = { type: currentAddType, index: newIndex };

            closeAddModal();
        } catch (err) {
            console.error('Erro ao salvar entrada:', err);
            alert('Erro ao salvar. Tente novamente.');
        }

        saveBtn.textContent = 'Salvar';
        saveBtn.disabled = false;
    }

    function closeAddModal() {
        addOverlay.classList.remove('open');
        currentAddType = null;
        addImageData = '';
    }

    addClose.addEventListener('click', closeAddModal);
    addOverlay.addEventListener('click', (e) => {
        if (e.target === addOverlay) closeAddModal();
    });

    // Expor para uso externo (rebuildSidebarList)
    window.openAddModal = openAddModal;
})();


// ===== SIDEBAR DE CONFIGURAÇÕES =====
const settingsToggle = document.getElementById('settings-toggle');
const settingsSidebar = document.getElementById('settings-sidebar');

settingsToggle.addEventListener('click', () => {
    settingsToggle.classList.toggle('open');
    settingsSidebar.classList.toggle('open');
});

// Fechar sidebar ao clicar fora
document.addEventListener('click', (e) => {
    if (settingsSidebar.classList.contains('open') &&
        !settingsSidebar.contains(e.target) &&
        !settingsToggle.contains(e.target)) {
        settingsToggle.classList.remove('open');
        settingsSidebar.classList.remove('open');
    }
});

// ===== EDITOR DE JORNADAS =====
(function() {
    const journeyOverlay = document.getElementById('journey-modal-overlay');
    const journeyModalClose = document.getElementById('journey-modal-close');
    const journeyModalTitle = document.getElementById('journey-modal-title');
    const journeyNameInput = document.getElementById('journey-name');
    const journeyColorInput = document.getElementById('journey-color');
    const journeyPartyList = document.getElementById('journey-party-list');
    const journeyAddMember = document.getElementById('journey-add-member');
    const journeyStopsList = document.getElementById('journey-stops-list');
    const journeyAddStop = document.getElementById('journey-add-stop');
    const journeyReorderBtn = document.getElementById('journey-reorder-stops');
    const journeySaveBtn = document.getElementById('journey-save');
    const journeyDeleteBtn = document.getElementById('journey-delete');
    const trailEditBtn = document.getElementById('trail-edit');
    const trailNewBtn = document.getElementById('trail-new');

    // Stop edit panel elements
    const stopEditPanel = document.getElementById('stop-edit-panel');
    const stopEditClose = document.getElementById('stop-edit-close');
    const stopEditTitle = document.getElementById('stop-edit-title');
    const stopEditLocation = document.getElementById('stop-edit-location');
    const stopEditSubtitle = document.getElementById('stop-edit-subtitle');
    const stopEditDescription = document.getElementById('stop-edit-description');
    const stopEditCoordsDisplay = document.getElementById('stop-edit-coords-display');
    const stopEditRelocate = document.getElementById('stop-edit-relocate');
    const stopEditParticipants = document.getElementById('stop-edit-participants');
    const stopEditSessionTitle = document.getElementById('stop-edit-session-title');
    const stopEditSessionQuote = document.getElementById('stop-edit-session-quote');
    const stopEditSessionQuoteAuthor = document.getElementById('stop-edit-session-quoteauthor');
    const stopEditSessionContent = document.getElementById('stop-edit-session-content');
    const stopEditSave = document.getElementById('stop-edit-save');

    let editingJourneyKey = null;
    let journeyStops = [];
    let journeyParty = [];
    let addingStop = false;
    let relocatingStopIndex = -1;
    let editingStopIndex = -1; // indice da parada sendo editada no sub-modal
    let reorderMode = false;

    // Abrir modal para nova jornada
    if (trailNewBtn) trailNewBtn.addEventListener('click', () => {
        editingJourneyKey = null;
        journeyModalTitle.textContent = 'Nova Jornada';
        journeyNameInput.value = '';
        journeyColorInput.value = '#d4a843';
        journeyParty = [];
        journeyStops = [];
        journeyDeleteBtn.style.display = 'none';
        closeStopEditPanel();
        renderPartyList();
        renderStopsList();
        journeyOverlay.classList.add('open');
        // Fechar sidebar
        settingsToggle.classList.remove('open');
        settingsSidebar.classList.remove('open');
    });

    // Abrir modal para editar jornada atual
    if (trailEditBtn) trailEditBtn.addEventListener('click', () => {
        const key = currentJourneyKey;
        const config = journeyConfigs[key];
        if (!config) return;

        editingJourneyKey = key;
        journeyModalTitle.textContent = 'Editar Jornada';
        journeyNameInput.value = config.displayName || key;
        journeyColorInput.value = config.color || '#d4a843';

        // Preencher party
        journeyParty = (config.party || []).map(p => ({
            name: p.name || '',
            img: p.img || ''
        }));

        // Preencher paradas
        journeyStops = (config.stops || []).map((s, idx) => {
            // Tentar preencher sessionData a partir de config.sessions se existir
            let sessionData = s.sessionData || {};
            if (!sessionData.content && config.sessions) {
                // Buscar sessao pelo indice ou pelo match de titulo
                const matchedSession = config.sessions[idx] || null;
                if (matchedSession) {
                    sessionData = {
                        title: matchedSession.title || '',
                        quote: matchedSession.quote || '',
                        quoteAuthor: matchedSession.quoteAuthor || '',
                        content: matchedSession.content || ''
                    };
                }
            }
            // Preencher participants a partir da party se nao definido
            let participants = s.participants || [];
            if (participants.length === 0 && config.party) {
                // Por padrao, todos participam
                participants = config.party.map(p => p.name);
            }
            return {
                x: s.x,
                y: s.y,
                location: s.location || '',
                session: s.session || '',
                summary: s.summary || '',
                subtitle: s.subtitle || s.session || '',
                description: s.description || s.summary || '',
                participants: participants,
                sessionData: sessionData
            };
        });

        // Mostrar botao de excluir apenas para jornadas que nao sao as base
        journeyDeleteBtn.style.display = (key !== 'solnegro' && key !== 'cicatriz') ? 'block' : 'none';

        closeStopEditPanel();
        renderPartyList();
        renderStopsList();
        journeyOverlay.classList.add('open');
        // Fechar sidebar
        settingsToggle.classList.remove('open');
        settingsSidebar.classList.remove('open');
    });

    // Fechar modal
    function closeJourneyModal() {
        journeyOverlay.classList.remove('open');
        addingStop = false;
        relocatingStopIndex = -1;
        editingStopIndex = -1;
        mapClickActive = false;
        mapContainer.style.cursor = '';
        if (mapSvg && mapSvg.contentDocument) {
            mapSvg.contentDocument.documentElement.style.cursor = '';
        }
        // Restaurar interacoes SVG
        if (svgDoc) {
            svgDoc.querySelectorAll('[data-old-cursor]').forEach(el => {
                el.style.cursor = el.dataset.oldCursor || 'pointer';
                el.style.pointerEvents = '';
                delete el.dataset.oldCursor;
            });
        }
        closeStopEditPanel();
        if (svgDoc) svgDoc.removeEventListener('click', stopMapClick, true);
        mapContainer.removeEventListener('mouseup', stopMapClickFallback, true);
    }

    journeyModalClose.addEventListener('click', closeJourneyModal);

    // ===== PARTY LIST =====
    function renderPartyList() {
        journeyPartyList.innerHTML = '';
        journeyParty.forEach((member, i) => {
            const div = document.createElement('div');
            div.className = 'journey-party-item';

            // Preview da imagem do personagem
            const imgPreview = document.createElement('img');
            imgPreview.className = 'party-img-preview';
            const charData = findCharacterByName(member.name);
            const imgSrc = charData ? getEntityDefaultImage(charData) : member.img || '';
            imgPreview.src = imgSrc;
            imgPreview.style.display = imgSrc ? 'block' : 'none';

            // Nome (read-only, vem do personagem selecionado)
            const nameSpan = document.createElement('span');
            nameSpan.className = 'party-member-name';
            nameSpan.textContent = member.name || '(selecionar)';

            const removeBtn = document.createElement('span');
            removeBtn.className = 'party-remove';
            removeBtn.title = 'Remover';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', () => {
                journeyParty.splice(i, 1);
                renderPartyList();
            });

            div.appendChild(imgPreview);
            div.appendChild(nameSpan);
            div.appendChild(removeBtn);
            journeyPartyList.appendChild(div);
        });
    }

    // Helper: buscar personagem pelo nome em todas as listas
    function findCharacterByName(name) {
        if (!name) return null;
        const allEntities = [
            ...(typeof characters !== 'undefined' ? characters : []),
            ...(typeof legion !== 'undefined' ? legion : []),
            ...(typeof villains !== 'undefined' ? villains : []),
            ...(typeof allies !== 'undefined' ? allies : []),
            ...(typeof historicalNPCs !== 'undefined' ? historicalNPCs : [])
        ];
        return allEntities.find(e => e && e.name === name) || null;
    }

    // Adicionar membro — mostra dropdown com personagens disponiveis
    journeyAddMember.addEventListener('click', () => {
        // Apenas personagens do menu "Personagens"
        const allChars = (typeof characters !== 'undefined' ? characters : []).filter(c => c && c.name);

        // Filtrar os que ja estao na party
        const currentNames = journeyParty.map(m => m.name);
        const available = allChars.filter(c => !currentNames.includes(c.name));

        if (available.length === 0) {
            alert('Todos os personagens ja estao na party.');
            return;
        }

        // Criar dropdown temporario
        const existing = journeyPartyList.parentElement.querySelector('.party-char-picker');
        if (existing) existing.remove();

        const picker = document.createElement('div');
        picker.className = 'party-char-picker';

        available.forEach(char => {
            const option = document.createElement('div');
            option.className = 'party-char-option';

            const optImg = document.createElement('img');
            optImg.src = getEntityDefaultImage(char) || '';
            optImg.className = 'party-char-option-img';

            const optName = document.createElement('span');
            optName.textContent = char.name;

            option.appendChild(optImg);
            option.appendChild(optName);
            option.addEventListener('click', () => {
                journeyParty.push({ name: char.name });
                picker.remove();
                renderPartyList();
            });

            picker.appendChild(option);
        });

        // Inserir picker apos o botao
        journeyAddMember.parentElement.insertBefore(picker, journeyAddMember.nextSibling);
    });

    // ===== STOPS LIST (compact: number + title + edit/delete) =====
    function renderStopsList() {
        journeyStopsList.innerHTML = '';
        journeyStops.forEach((stop, i) => {
            const div = document.createElement('div');
            div.className = 'journey-stop-item';

            const num = document.createElement('span');
            num.className = 'stop-num';
            num.textContent = (i + 1);

            const title = document.createElement('span');
            title.className = 'stop-title';
            title.textContent = stop.location || '(sem nome)';

            const actions = document.createElement('span');
            actions.className = 'stop-actions';

            if (reorderMode) {
                // Modo reordenar: botoes up/down
                const upBtn = document.createElement('button');
                upBtn.className = 'stop-move-btn';
                upBtn.innerHTML = '&#9650;';
                upBtn.title = 'Mover para cima';
                upBtn.disabled = (i === 0);
                upBtn.addEventListener('click', () => {
                    const temp = journeyStops[i];
                    journeyStops[i] = journeyStops[i - 1];
                    journeyStops[i - 1] = temp;
                    renderStopsList();
                });

                const downBtn = document.createElement('button');
                downBtn.className = 'stop-move-btn';
                downBtn.innerHTML = '&#9660;';
                downBtn.title = 'Mover para baixo';
                downBtn.disabled = (i === journeyStops.length - 1);
                downBtn.addEventListener('click', () => {
                    const temp = journeyStops[i];
                    journeyStops[i] = journeyStops[i + 1];
                    journeyStops[i + 1] = temp;
                    renderStopsList();
                });

                actions.appendChild(upBtn);
                actions.appendChild(downBtn);
            } else {
                // Modo normal: botoes edit/delete
                const editBtn = document.createElement('button');
                editBtn.className = 'stop-edit-btn';
                editBtn.title = 'Editar parada';
                editBtn.innerHTML = '&#9998;';
                editBtn.addEventListener('click', () => openStopEdit(i));

                const removeBtn = document.createElement('button');
                removeBtn.className = 'stop-delete-btn';
                removeBtn.title = 'Excluir parada';
                removeBtn.innerHTML = '&times;';
                removeBtn.addEventListener('click', () => {
                    journeyStops.splice(i, 1);
                    if (editingStopIndex === i) closeStopEditPanel();
                    else if (editingStopIndex > i) editingStopIndex--;
                    renderStopsList();
                });

                actions.appendChild(editBtn);
                actions.appendChild(removeBtn);
            }

            div.appendChild(num);
            div.appendChild(title);
            div.appendChild(actions);
            journeyStopsList.appendChild(div);
        });
    }

    // Toggle reorder mode
    journeyReorderBtn.addEventListener('click', () => {
        reorderMode = !reorderMode;
        journeyReorderBtn.classList.toggle('active', reorderMode);
        closeStopEditPanel();
        renderStopsList();
    });

    // ===== STOP EDIT PANEL =====
    function openStopEdit(index) {
        editingStopIndex = index;
        const stop = journeyStops[index];
        stopEditTitle.textContent = 'Editar Parada ' + (index + 1);
        stopEditLocation.value = stop.location || '';
        stopEditSubtitle.value = stop.subtitle || stop.session || '';
        stopEditDescription.value = stop.description || stop.summary || '';
        stopEditCoordsDisplay.textContent = '(' + stop.x + ', ' + stop.y + ')';
        // Preencher campos de sessao completa
        const sess = stop.sessionData || {};
        stopEditSessionTitle.value = sess.title || '';
        stopEditSessionQuote.value = sess.quote || '';
        stopEditSessionQuoteAuthor.value = sess.quoteAuthor || '';
        stopEditSessionContent.value = sess.content || '';
        renderStopParticipants(stop);
        stopEditPanel.classList.add('open');
    }

    function closeStopEditPanel() {
        stopEditPanel.classList.remove('open');
        editingStopIndex = -1;
    }

    stopEditClose.addEventListener('click', closeStopEditPanel);

    // Renderizar selecao de participantes baseados na party atual
    function renderStopParticipants(stop) {
        stopEditParticipants.innerHTML = '';
        const participants = stop.participants || [];
        journeyParty.forEach((member) => {
            if (!member.name.trim()) return;
            const label = document.createElement('label');
            label.className = 'stop-participant-label';
            if (participants.includes(member.name)) label.classList.add('checked');

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = member.name;
            cb.checked = participants.includes(member.name);

            const checkMark = document.createElement('span');
            checkMark.className = 'check-mark';
            checkMark.textContent = '\u2714';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = member.name;

            cb.addEventListener('change', () => {
                label.classList.toggle('checked', cb.checked);
            });

            label.appendChild(cb);
            label.appendChild(checkMark);
            label.appendChild(nameSpan);
            stopEditParticipants.appendChild(label);
        });

        // Se nao houver membros na party, mostrar mensagem
        if (journeyParty.filter(m => m.name.trim()).length === 0) {
            const msg = document.createElement('span');
            msg.className = 'stop-no-party';
            msg.textContent = 'Adicione membros na party primeiro.';
            stopEditParticipants.appendChild(msg);
        }
    }

    // Reposicionar parada a partir do sub-modal
    stopEditRelocate.addEventListener('click', () => {
        if (editingStopIndex < 0) return;
        relocatingStopIndex = editingStopIndex;
        addingStop = false;
        saveStopEditToMemory();
        enterMapClickMode('Clique no mapa para reposicionar parada ' + (editingStopIndex + 1) + '...');
    });

    // Salvar edicao do stop no array em memoria
    function saveStopEditToMemory() {
        if (editingStopIndex < 0) return;
        const stop = journeyStops[editingStopIndex];
        stop.location = stopEditLocation.value.trim();
        stop.subtitle = stopEditSubtitle.value.trim();
        stop.session = stopEditSubtitle.value.trim();
        stop.description = stopEditDescription.value.trim();
        stop.summary = stopEditDescription.value.trim();

        // Sessao completa estruturada
        stop.sessionData = {
            title: stopEditSessionTitle.value.trim(),
            quote: stopEditSessionQuote.value.trim(),
            quoteAuthor: stopEditSessionQuoteAuthor.value.trim(),
            content: stopEditSessionContent.value
        };

        // Coletar participantes marcados
        const checkboxes = stopEditParticipants.querySelectorAll('input[type="checkbox"]');
        stop.participants = [];
        checkboxes.forEach(cb => {
            if (cb.checked) stop.participants.push(cb.value);
        });
    }

    // Botao confirmar do sub-modal
    stopEditSave.addEventListener('click', () => {
        saveStopEditToMemory();
        closeStopEditPanel();
        renderStopsList();
    });

    // ===== MAP CLICK MODE =====

    function enterMapClickMode(buttonText) {
        journeyAddStop.textContent = buttonText || 'Clique no mapa...';
        journeyAddStop.disabled = true;
        mapClickActive = true;
        // Esconder o overlay completamente para liberar o mapa
        journeyOverlay.classList.remove('open');
        // Cursor crosshair no mapa
        mapContainer.style.cursor = 'crosshair';
        if (mapSvg && mapSvg.contentDocument) {
            mapSvg.contentDocument.documentElement.style.cursor = 'crosshair';
        }
        // Desabilitar interacoes com cidades/markers no SVG
        if (svgDoc) {
            svgDoc.querySelectorAll('[style*="cursor: pointer"], [style*="cursor:pointer"]').forEach(el => {
                el.dataset.oldCursor = el.style.cursor;
                el.style.cursor = 'crosshair';
                el.style.pointerEvents = 'none';
            });
        }
        // Registrar no svgDoc (dentro do <object>)
        if (svgDoc) svgDoc.addEventListener('click', stopMapClick, true);
        // Tambem no container como fallback
        mapContainer.addEventListener('mouseup', stopMapClickFallback, true);
    }

    function exitMapClickMode() {
        journeyAddStop.textContent = '+ Adicionar parada (clique no mapa)';
        journeyAddStop.disabled = false;
        mapClickActive = false;
        // Restaurar o overlay
        journeyOverlay.classList.add('open');
        // Restaurar cursor
        mapContainer.style.cursor = '';
        if (mapSvg && mapSvg.contentDocument) {
            mapSvg.contentDocument.documentElement.style.cursor = '';
        }
        // Restaurar interacoes com cidades/markers no SVG
        if (svgDoc) {
            svgDoc.querySelectorAll('[data-old-cursor]').forEach(el => {
                el.style.cursor = el.dataset.oldCursor || 'pointer';
                el.style.pointerEvents = '';
                delete el.dataset.oldCursor;
            });
        }
        addingStop = false;
        relocatingStopIndex = -1;
        if (svgDoc) svgDoc.removeEventListener('click', stopMapClick, true);
        mapContainer.removeEventListener('mouseup', stopMapClickFallback, true);
    }

    // Adicionar parada via clique no mapa
    journeyAddStop.addEventListener('click', () => {
        addingStop = true;
        relocatingStopIndex = -1;
        enterMapClickMode('Clique no mapa para adicionar parada...');
    });

    // Handler principal: click dentro do svgDoc
    function stopMapClick(e) {
        if (!mapClickActive) return;
        if (!addingStop && relocatingStopIndex < 0) return;

        e.stopPropagation();
        e.preventDefault();

        processMapClick(e.clientX, e.clientY);
    }

    // Fallback: mouseup no mapContainer (caso o click nao bubble do object)
    function stopMapClickFallback(e) {
        if (!mapClickActive) return;
        if (!addingStop && relocatingStopIndex < 0) return;
        // Apenas aceitar se foi um clique simples (sem arrastar muito)
        if (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) return;

        processMapClick(e.clientX, e.clientY);
    }

    function processMapClick(clientX, clientY) {
        if (!mapClickActive) return; // Evitar dupla execucao
        mapClickActive = false; // Desativar imediatamente

        // Calcular coordenadas SVG a partir da posicao do clique
        let svgX = 0, svgY = 0;
        try {
            const svgEl = svgDoc.querySelector('svg');
            const pt = svgEl.createSVGPoint();
            pt.x = clientX;
            pt.y = clientY;
            const ctm = svgEl.getScreenCTM();
            if (ctm) {
                const svgPt = pt.matrixTransform(ctm.inverse());
                svgX = Math.round(svgPt.x);
                svgY = Math.round(svgPt.y);
            } else {
                // Fallback: calcular via bounding rect
                const rect = mapSvg.getBoundingClientRect();
                const viewBox = svgEl.viewBox.baseVal;
                svgX = Math.round(((clientX - rect.left) / rect.width) * viewBox.width);
                svgY = Math.round(((clientY - rect.top) / rect.height) * viewBox.height);
            }
        } catch (err) {
            console.warn('Erro ao calcular coordenadas SVG:', err);
            exitMapClickMode();
            return;
        }

        if (relocatingStopIndex >= 0) {
            var savedIndex = relocatingStopIndex;
            journeyStops[savedIndex].x = svgX;
            journeyStops[savedIndex].y = svgY;
            exitMapClickMode();
            renderStopsList();
            openStopEdit(savedIndex);
        } else {
            journeyStops.push({
                x: svgX,
                y: svgY,
                location: '',
                subtitle: '',
                session: '',
                description: '',
                summary: '',
                participants: [],
                sessionData: { title: '', quote: '', quoteAuthor: '', content: '' }
            });
            exitMapClickMode();
            renderStopsList();
            openStopEdit(journeyStops.length - 1);
            journeyStopsList.scrollTop = journeyStopsList.scrollHeight;
        }
    }

    // ===== SALVAR JORNADA =====
    journeySaveBtn.addEventListener('click', async () => {
        const name = journeyNameInput.value.trim();
        if (!name) { alert('Digite um nome para a jornada.'); return; }
        if (journeyStops.length === 0) { alert('Adicione pelo menos uma parada.'); return; }

        // Se o sub-modal estiver aberto, salvar dados pendentes
        if (editingStopIndex >= 0) saveStopEditToMemory();

        const party = journeyParty.filter(m => m.name && m.name.trim()).map((member, i, arr) => {
            const spacing = 36;
            const totalWidth = (arr.length - 1) * spacing;
            const offset = -totalWidth / 2 + i * spacing;
            return { name: member.name.trim(), offset: Math.round(offset) };
        });

        const key = editingJourneyKey || 'custom_' + Date.now();

        // Construir array de sessions a partir do sessionData de cada stop
        const sessions = journeyStops.map((stop, i) => {
            const sd = stop.sessionData || {};
            return {
                id: i,
                title: sd.title || '',
                quote: sd.quote || '',
                quoteAuthor: sd.quoteAuthor || '',
                content: sd.content || ''
            };
        });

        // Limpar stops para salvar (remover dados redundantes que ja estao em sessions)
        const stopsToSave = journeyStops.map(stop => ({
            x: stop.x,
            y: stop.y,
            location: stop.location || '',
            session: stop.session || stop.subtitle || '',
            summary: stop.summary || stop.description || '',
            participants: stop.participants || []
        }));

        const journeyData = {
            key: key,
            displayName: name,
            color: journeyColorInput.value,
            pathColor: journeyColorInput.value,
            party: party,
            stops: stopsToSave,
            sessions: sessions
        };

        journeySaveBtn.textContent = 'Salvando...';
        journeySaveBtn.disabled = true;

        try {
            await db.collection('journeys').doc(key).set(journeyData);
            // Atualizar config local com stops completos para uso imediato
            journeyConfigs[key] = Object.assign({}, journeyData, { stops: journeyStops });

            if (!editingJourneyKey) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = name;
                trailSeason.appendChild(option);
            } else {
                const opt = trailSeason.querySelector('option[value="' + key + '"]');
                if (opt) opt.textContent = name;
            }

            currentJourneyKey = key;
            trailSeason.value = key;
            // Re-renderizar a trilha se estiver visivel
            if (activeJourneys[key]) {
                removeTrailFor(key);
                currentStopIndex = 0;
                drawJourneyBase();
                updatePartyVisibility(journeyConfigs[key], 0);
            }
            closeJourneyModal();
        } catch (err) {
            console.error('Erro ao salvar jornada:', err);
            alert('Erro ao salvar. Tente novamente.');
        }

        journeySaveBtn.textContent = 'Salvar Jornada';
        journeySaveBtn.disabled = false;
    });

    // ===== EXCLUIR JORNADA =====
    journeyDeleteBtn.addEventListener('click', async () => {
        if (!editingJourneyKey) return;
        if (!confirm('Excluir esta jornada? Essa acao nao pode ser desfeita.')) return;

        journeyDeleteBtn.textContent = 'Excluindo...';
        journeyDeleteBtn.disabled = true;

        try {
            await db.collection('journeys').doc(editingJourneyKey).delete();
            delete journeyConfigs[editingJourneyKey];

            const opt = trailSeason.querySelector('option[value="' + editingJourneyKey + '"]');
            if (opt) opt.remove();

            currentJourneyKey = trailSeason.value;
            closeJourneyModal();
        } catch (err) {
            console.error('Erro ao excluir jornada:', err);
            alert('Erro ao excluir. Tente novamente.');
        }

        journeyDeleteBtn.textContent = 'Excluir Jornada';
        journeyDeleteBtn.disabled = false;
    });

    // ===== CARREGAR JORNADAS DO FIRESTORE =====
    async function loadCustomJourneys() {
        if (typeof db === 'undefined') return;
        try {
            const snap = await db.collection('journeys').get();
            snap.forEach(doc => {
                const data = doc.data();
                const key = data.key || doc.id;
                journeyConfigs[key] = data;

                if (!trailSeason.querySelector('option[value="' + key + '"]')) {
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = data.displayName || key;
                    trailSeason.appendChild(option);
                }
            });
        } catch (err) {
            console.log('Jornadas indisponiveis:', err.message);
        }
    }

    loadCustomJourneys();
})();
