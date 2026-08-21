// ===== FIREBASE EDIT - EDIÇÃO COLABORATIVA DA WIKI =====

// Comprimir imagem usando canvas (maxWidth em px, quality 0-1)
function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = function(e) {
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Redimensionar mantendo proporcao
                if (width > maxWidth) {
                    height = Math.round(height * (maxWidth / width));
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Exportar como JPEG comprimido
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

let editMode = false;
let currentEditEntity = null; // { type, id/index, data }

// ===== CARREGAR DADOS DO FIRESTORE (sobrescreve dados locais se existirem) =====
async function loadFromFirestore() {
    try {
        // Carregar cidades
        const citiesSnap = await db.collection('cities').get();
        citiesSnap.forEach(doc => {
            if (cities[doc.id]) {
                Object.assign(cities[doc.id], doc.data());
            }
        });

        // Helper para carregar arrays
        async function loadCollection(collectionName, localArray) {
            const snap = await db.collection(collectionName).get();
            snap.forEach(doc => {
                const docId = doc.id;
                // Entradas novas criadas pelo site usam prefixo 'new_'
                if (docId.startsWith('new_')) {
                    // Verificar se ja existe no array (por nome)
                    const data = doc.data();
                    data._docId = docId;
                    const existing = localArray.find(e => e && e.name === data.name);
                    if (!existing) {
                        localArray.push(data);
                    }
                } else {
                    const index = parseInt(docId);
                    if (!isNaN(index) && localArray[index]) {
                        // So sobrescrever se o nome bate (protecao contra docs corrompidos)
                        const docData = doc.data();
                        if (!docData.name || docData.name === localArray[index].name) {
                            Object.assign(localArray[index], docData);
                        } else {
                            // Doc corrompido — deletar silenciosamente
                            db.collection(collectionName).doc(docId).delete().catch(() => {});
                        }
                    }
                }
            });
            // Rebuild sidebar list for this collection
            rebuildSidebarList(collectionName, localArray);
        }

        await loadCollection('characters', characters);
        await loadCollection('legion', legion);
        await loadCollection('villains', villains);
        if (typeof artifacts !== 'undefined') await loadCollection('artifacts', artifacts);
        if (typeof books !== 'undefined') await loadCollection('books', books);
        if (typeof historicalNPCs !== 'undefined') await loadCollection('historicalNPCs', historicalNPCs);
        if (typeof allies !== 'undefined') await loadCollection('allies', allies);
        if (typeof landmarks !== 'undefined') await loadCollection('landmarks', landmarks);

        console.log('Wiki carregada do Firestore');
    } catch (error) {
        console.log('Usando dados locais (Firestore indisponível ou vazio):', error.message);
    }
}

// Reconstruir lista do sidebar apos carregar do Firestore
function rebuildSidebarList(collectionName, localArray) {
    const listMap = {
        characters: { listId: 'characters-list', showFn: showCharacterInfo },
        legion: { listId: 'legion-list', showFn: showLegionInfo },
        villains: { listId: 'villains-list', showFn: showVillainInfo },
        artifacts: { listId: 'artifacts-list', showFn: showArtifactInfo },
        books: { listId: 'books-list', showFn: showBookInfo },
        historicalNPCs: { listId: 'historical-list', showFn: showHistoricalInfo },
        allies: { listId: 'allies-list', showFn: showAllyInfo },
        landmarks: { listId: 'landmarks-list', showFn: showLandmarkInfo }
    };
    const config = listMap[collectionName];
    if (!config) return;

    const listEl = document.getElementById(config.listId);
    if (!listEl) return;

    // Preservar botao "+ Adicionar" se existir
    const addBtn = listEl.querySelector('.wiki-add-item');

    // Limpar lista
    listEl.innerHTML = '';

    // Reconstruir items
    localArray.forEach((entry, index) => {
        if (!entry || !entry.name) return;
        const item = document.createElement('div');
        item.className = 'wiki-item';
        item.textContent = entry.name;
        item.dataset.searchName = entry.name.toLowerCase();
        item.addEventListener('click', () => config.showFn(index));
        listEl.appendChild(item);
    });

    // Re-adicionar botao "+"
    if (addBtn) {
        listEl.appendChild(addBtn);
    } else {
        const newAddBtn = document.createElement('div');
        newAddBtn.className = 'wiki-add-item';
        newAddBtn.textContent = '+ Adicionar';
        newAddBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Tipo baseado no listId
            const typeMap = {
                'characters-list': 'character',
                'legion-list': 'legion',
                'villains-list': 'villain',
                'artifacts-list': 'artifact',
                'books-list': 'book',
                'historical-list': 'historical',
                'allies-list': 'ally',
                'landmarks-list': 'landmark'
            };
            if (typeof openAddModal === 'function') openAddModal(typeMap[config.listId]);
        });
        listEl.appendChild(newAddBtn);
    }
}

// ===== SALVAR ENTIDADE NO FIRESTORE =====
async function saveToFirestore(collection, docId, data) {
    try {
        await db.collection(collection).doc(String(docId)).set(data, { merge: true });
        console.log(`Salvo: ${collection}/${docId}`);
        return true;
    } catch (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar. Tente novamente.');
        return false;
    }
}

// ===== BOTÃO DE EDIÇÃO =====
const editBtn = document.getElementById('edit-btn');

function showEditButton(entityType, entityId, entityData) {
    currentEditEntity = { type: entityType, id: entityId, data: entityData };
    if (editBtn) editBtn.style.display = 'flex';
}

function hideEditButton() {
    currentEditEntity = null;
    if (editBtn) editBtn.style.display = 'none';
    exitEditMode();
}

// ===== MODO DE EDIÇÃO =====
function enterEditMode() {
    if (!currentEditEntity) return;
    editMode = true;
    const panel = document.getElementById('info-panel');
    panel.classList.add('editing');
    editBtn.textContent = '✓';
    editBtn.classList.add('saving');

    // Tornar campos editáveis
    const editableFields = panel.querySelectorAll('.info-section p, .info-section li');
    editableFields.forEach(el => {
        el.contentEditable = 'true';
        el.classList.add('editable');
    });

    // Nome e região editáveis
    document.getElementById('city-name').contentEditable = 'true';
    document.getElementById('city-name').classList.add('editable');
    document.getElementById('city-region').contentEditable = 'true';
    document.getElementById('city-region').classList.add('editable');

    // Legenda do jogador editável
    const caption = panel.querySelector('.portrait-caption');
    if (caption) {
        caption.contentEditable = 'true';
        caption.classList.add('editable');
    }

    // Botão de adicionar arte alternativa (qualquer entidade com imagem)
    if (currentEditEntity && panel.querySelector('.info-portrait')) {
        const portrait = panel.querySelector('.info-portrait');
        const portraitParent = portrait.parentElement;

        if (!panel.querySelector('.add-alt-art-btn')) {
            const addArtBtn = document.createElement('button');
            addArtBtn.className = 'add-alt-art-btn';
            addArtBtn.textContent = '+';
            addArtBtn.title = 'Adicionar arte alternativa';
            addArtBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    addArtBtn.textContent = '...';
                    addArtBtn.disabled = true;
                    try {
                        const entity = currentEditEntity;
                        const dataUrl = await compressImage(file, 600, 0.75);

                        // Atualizar dados locais
                        if (!entity.data.altImages) entity.data.altImages = [];
                        entity.data.altImages.push(dataUrl);

                        // Determinar collection
                        let collection = '';
                        switch (entity.type) {
                            case 'character': collection = 'characters'; break;
                            case 'legion': collection = 'legion'; break;
                            case 'villain': collection = 'villains'; break;
                            case 'artifact': collection = 'artifacts'; break;
                            case 'book': collection = 'books'; break;
                            case 'historical': collection = 'historicalNPCs'; break;
                            case 'ally': collection = 'allies'; break;
                            case 'landmark': collection = 'landmarks'; break;
                            case 'city': collection = 'cities'; break;
                        }

                        // Salvar no Firestore
                        await saveToFirestore(collection, String(entity.id), { altImages: entity.data.altImages });

                        // Recarregar a view
                        addArtBtn.textContent = '+';
                        addArtBtn.disabled = false;
                        exitEditMode();
                        refreshEntityView(entity);
                    } catch (err) {
                        console.error('Erro ao adicionar arte:', err);
                        alert('Erro ao adicionar arte. Tente novamente.');
                        addArtBtn.textContent = '+';
                        addArtBtn.disabled = false;
                    }
                });
                input.click();
            });

            // Inserir o botão dentro do alt-art-buttons ou criar o container
            let altBtns = portraitParent.querySelector('.alt-art-buttons');
            if (!altBtns) {
                // Se não tem portrait-container, criar estrutura
                if (!portraitParent.classList.contains('portrait-container')) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'portrait-container';
                    portrait.parentNode.insertBefore(wrapper, portrait);
                    wrapper.appendChild(portrait);
                    altBtns = document.createElement('div');
                    altBtns.className = 'alt-art-buttons';
                    wrapper.appendChild(altBtns);
                } else {
                    altBtns = document.createElement('div');
                    altBtns.className = 'alt-art-buttons';
                    portraitParent.appendChild(altBtns);
                }
            }
            altBtns.appendChild(addArtBtn);
        }
    }

    // Botão de adicionar imagem quando a entidade não tem nenhuma
    if (currentEditEntity && !panel.querySelector('.info-portrait') && !panel.querySelector('.add-image-btn')) {
        const cityInfo = document.getElementById('city-info');
        const addImageBtn = document.createElement('button');
        addImageBtn.className = 'add-image-btn';
        addImageBtn.textContent = '+ Adicionar imagem';
        addImageBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                addImageBtn.textContent = 'Enviando...';
                addImageBtn.disabled = true;
                try {
                    const dataUrl = await compressImage(file, 600, 0.75);
                    const entity = currentEditEntity;

                    // Atualizar dados locais
                    entity.data.image = dataUrl;

                    // Determinar collection
                    let collection = '';
                    switch (entity.type) {
                        case 'character': collection = 'characters'; break;
                        case 'legion': collection = 'legion'; break;
                        case 'villain': collection = 'villains'; break;
                        case 'artifact': collection = 'artifacts'; break;
                        case 'book': collection = 'books'; break;
                        case 'historical': collection = 'historicalNPCs'; break;
                        case 'ally': collection = 'allies'; break;
                        case 'landmark': collection = 'landmarks'; break;
                        case 'city': collection = 'cities'; break;
                    }

                    // Salvar no Firestore
                    await saveToFirestore(collection, String(entity.id), { image: dataUrl });

                    // Recarregar a view
                    exitEditMode();
                    refreshEntityView(entity);
                } catch (err) {
                    console.error('Erro ao adicionar imagem:', err);
                    alert('Erro ao adicionar imagem. Tente novamente.');
                    addImageBtn.textContent = '+ Adicionar imagem';
                    addImageBtn.disabled = false;
                }
            });
            input.click();
        });
        cityInfo.insertBefore(addImageBtn, cityInfo.firstChild);
    }

    // Botão de adicionar detalhe e botões de remover em cada item
    const detailLists = panel.querySelectorAll('.info-section ul');
    detailLists.forEach(ul => {
        // Adicionar botão de remover em cada li existente
        Array.from(ul.querySelectorAll('li')).forEach(li => {
            if (!li.querySelector('.remove-detail-btn')) {
                const removeBtn = document.createElement('span');
                removeBtn.className = 'remove-detail-btn';
                removeBtn.textContent = '\u00d7';
                removeBtn.title = 'Remover detalhe';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    li.remove();
                });
                li.appendChild(removeBtn);
            }
        });

        if (!ul.parentElement.querySelector('.add-detail-btn')) {
            const addBtn = document.createElement('button');
            addBtn.className = 'add-detail-btn';
            addBtn.textContent = '+ Adicionar detalhe';
            addBtn.addEventListener('click', () => {
                const newLi = document.createElement('li');
                newLi.contentEditable = 'true';
                newLi.classList.add('editable');
                newLi.textContent = 'Novo detalhe...';
                // Adicionar botão de remover no novo item
                const removeBtn = document.createElement('span');
                removeBtn.className = 'remove-detail-btn';
                removeBtn.textContent = '\u00d7';
                removeBtn.title = 'Remover detalhe';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    newLi.remove();
                });
                newLi.appendChild(removeBtn);
                ul.appendChild(newLi);
                // Selecionar o texto (sem o botão)
                const range = document.createRange();
                range.setStart(newLi.firstChild, 0);
                range.setEnd(newLi.firstChild, newLi.firstChild.length);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            });
            ul.parentElement.appendChild(addBtn);
        }
    });

    // Botão de remover página (no final do conteúdo)
    if (currentEditEntity && currentEditEntity.type !== 'city' && !panel.querySelector('.delete-page-btn')) {
        const cityInfo = document.getElementById('city-info');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-page-btn';
        deleteBtn.textContent = 'Remover Pagina';
        deleteBtn.addEventListener('click', async () => {
            const entity = currentEditEntity;
            if (!confirm('Remover "' + (entity.data.name || entity.data.displayName || '') + '"? Essa acao nao pode ser desfeita.')) return;

            deleteBtn.textContent = 'Removendo...';
            deleteBtn.disabled = true;

            try {
                let collection = '';
                switch (entity.type) {
                    case 'character': collection = 'characters'; break;
                    case 'legion': collection = 'legion'; break;
                    case 'villain': collection = 'villains'; break;
                    case 'artifact': collection = 'artifacts'; break;
                    case 'book': collection = 'books'; break;
                    case 'historical': collection = 'historicalNPCs'; break;
                    case 'ally': collection = 'allies'; break;
                    case 'landmark': collection = 'landmarks'; break;
                }

                if (collection) {
                    // Usar _docId se disponivel (entradas criadas pelo site), senao usar index
                    const firestoreDocId = entity.data._docId || String(entity.id);
                    await db.collection(collection).doc(firestoreDocId).delete();
                }

                // Remover do array local
                const typeArrays = {
                    character: characters,
                    legion: legion,
                    villain: villains,
                    artifact: (typeof artifacts !== 'undefined' ? artifacts : []),
                    book: (typeof books !== 'undefined' ? books : []),
                    historical: (typeof historicalNPCs !== 'undefined' ? historicalNPCs : []),
                    ally: (typeof allies !== 'undefined' ? allies : []),
                    landmark: (typeof landmarks !== 'undefined' ? landmarks : [])
                };

                const arr = typeArrays[entity.type];
                if (arr && typeof entity.id === 'number') {
                    arr.splice(entity.id, 1);
                }

                // Remover item do sidebar e recarregar a lista
                const listIds = {
                    character: 'characters-list',
                    legion: 'legion-list',
                    villain: 'villains-list',
                    artifact: 'artifacts-list',
                    book: 'books-list',
                    historical: 'historical-list',
                    ally: 'allies-list',
                    landmark: 'landmarks-list'
                };
                const listEl = document.getElementById(listIds[entity.type]);
                if (listEl) {
                    const items = listEl.querySelectorAll('.wiki-item');
                    if (items[entity.id]) items[entity.id].remove();
                }

                exitEditMode();
                hideEditButton();
                infoPanel.classList.remove('open');
            } catch (err) {
                console.error('Erro ao remover:', err);
                alert('Erro ao remover. Tente novamente.');
                deleteBtn.textContent = 'Remover Pagina';
                deleteBtn.disabled = false;
            }
        });
        cityInfo.appendChild(deleteBtn);
    }
}

function exitEditMode() {
    editMode = false;
    const panel = document.getElementById('info-panel');
    panel.classList.remove('editing');
    if (editBtn) {
        editBtn.textContent = '✎';
        editBtn.classList.remove('saving');
    }

    // Remover editável
    const editableFields = panel.querySelectorAll('[contenteditable]');
    editableFields.forEach(el => {
        el.contentEditable = 'false';
        el.classList.remove('editable');
    });

    // Remover botões de adicionar/remover detalhe e arte
    panel.querySelectorAll('.add-detail-btn').forEach(btn => btn.remove());
    panel.querySelectorAll('.remove-detail-btn').forEach(btn => btn.remove());
    panel.querySelectorAll('.add-alt-art-btn').forEach(btn => btn.remove());
    panel.querySelectorAll('.add-image-btn').forEach(btn => btn.remove());
    panel.querySelectorAll('.delete-page-btn').forEach(btn => btn.remove());
}

// Recarregar a view de uma entidade apos alteracoes de imagem
function refreshEntityView(entity) {
    switch (entity.type) {
        case 'character':
            showCharacterInfo(entity.id);
            showEditButton('character', entity.id, characters[entity.id]);
            break;
        case 'legion':
            showLegionInfo(entity.id);
            showEditButton('legion', entity.id, legion[entity.id]);
            break;
        case 'villain':
            showVillainInfo(entity.id);
            showEditButton('villain', entity.id, villains[entity.id]);
            break;
        case 'artifact':
            showArtifactInfo(entity.id);
            showEditButton('artifact', entity.id, artifacts[entity.id]);
            break;
        case 'book':
            showBookInfo(entity.id);
            showEditButton('book', entity.id, books[entity.id]);
            break;
        case 'historical':
            showHistoricalInfo(entity.id);
            showEditButton('historical', entity.id, historicalNPCs[entity.id]);
            break;
        case 'ally':
            showAllyInfo(entity.id);
            showEditButton('ally', entity.id, allies[entity.id]);
            break;
        case 'landmark':
            showLandmarkInfo(entity.id);
            showEditButton('landmark', entity.id, landmarks[entity.id]);
            break;
        case 'city':
            showCityInfo(entity.id);
            break;
    }
}

async function saveEdits() {
    if (!currentEditEntity) return;

    const entity = currentEditEntity;
    const panel = document.getElementById('info-panel');

    // Coletar dados editados
    const newName = document.getElementById('city-name').textContent.trim();
    const newRegion = document.getElementById('city-region').textContent.trim();

    const sections = panel.querySelectorAll('.info-section');
    const editedData = {};

    sections.forEach(section => {
        const heading = section.querySelector('h3');
        if (!heading) return;
        const title = heading.textContent.trim().toLowerCase();

        const paragraph = section.querySelector('p');
        const list = section.querySelector('ul');

        if (title.includes('descri')) {
            editedData.description = paragraph ? paragraph.textContent.trim() : '';
        } else if (title.includes('popula')) {
            editedData.population = paragraph ? paragraph.textContent.trim() : '';
        } else if (title.includes('governo')) {
            editedData.government = paragraph ? paragraph.textContent.trim() : '';
        } else if (title.includes('pontos') || title.includes('detalhe')) {
            if (list) {
                editedData.features = Array.from(list.querySelectorAll('li')).map(li => {
                    // Remover o texto do botão de remover antes de salvar
                    const clone = li.cloneNode(true);
                    const removeBtn = clone.querySelector('.remove-detail-btn');
                    if (removeBtn) removeBtn.remove();
                    return clone.textContent.trim();
                }).filter(t => t && t !== 'Novo detalhe...');
                editedData.details = editedData.features;
            }
        } else if (title.includes('notas')) {
            editedData.notes = paragraph ? paragraph.textContent.trim() : '';
        }
    });

    // Coletar player da legenda (se existir)
    const caption = panel.querySelector('.portrait-caption');
    if (caption) {
        const captionText = caption.textContent.trim();
        const playerMatch = captionText.match(/controlado por:\s*(.+)/i);
        if (playerMatch) {
            editedData.player = playerMatch[1].trim();
        }
    }

    // Determinar collection e atualizar dados locais
    let collection = '';
    let docId = entity.id;

    switch (entity.type) {
        case 'city':
            collection = 'cities';
            if (newRegion) editedData.region = newRegion;
            if (newName) editedData.displayName = newName;
            Object.assign(cities[entity.id], editedData);
            break;
        case 'character':
            collection = 'characters';
            editedData.name = newName;
            editedData.title = newRegion;
            if (editedData.features) {
                editedData.details = editedData.features;
                delete editedData.features;
            }
            Object.assign(characters[entity.id], editedData);
            break;
        case 'legion':
            collection = 'legion';
            editedData.name = newName;
            editedData.title = newRegion;
            if (editedData.features) {
                editedData.details = editedData.features;
                delete editedData.features;
            }
            Object.assign(legion[entity.id], editedData);
            break;
        case 'villain':
            collection = 'villains';
            editedData.name = newName;
            editedData.title = newRegion;
            if (editedData.features) {
                editedData.details = editedData.features;
                delete editedData.features;
            }
            Object.assign(villains[entity.id], editedData);
            break;
        case 'artifact':
            collection = 'artifacts';
            editedData.name = newName;
            if (editedData.features) {
                editedData.details = editedData.features;
                delete editedData.features;
            }
            Object.assign(artifacts[entity.id], editedData);
            break;
        case 'book':
            collection = 'books';
            editedData.name = newName;
            if (editedData.features) {
                editedData.details = editedData.features;
                delete editedData.features;
            }
            Object.assign(books[entity.id], editedData);
            break;
        case 'historical':
            collection = 'historicalNPCs';
            editedData.name = newName;
            editedData.title = newRegion;
            if (editedData.features) {
                editedData.details = editedData.features;
                delete editedData.features;
            }
            Object.assign(historicalNPCs[entity.id], editedData);
            break;
        case 'ally':
            collection = 'allies';
            editedData.name = newName;
            editedData.title = newRegion;
            if (editedData.features) {
                editedData.details = editedData.features;
                delete editedData.features;
            }
            Object.assign(allies[entity.id], editedData);
            break;
        case 'landmark':
            collection = 'landmarks';
            editedData.name = newName;
            if (editedData.features) {
                editedData.details = editedData.features;
                delete editedData.features;
            }
            Object.assign(landmarks[entity.id], editedData);
            break;
    }

    const success = await saveToFirestore(collection, docId, editedData);
    if (success) {
        exitEditMode();
        // Feedback visual
        editBtn.textContent = '✓';
        setTimeout(() => { editBtn.textContent = '✎'; }, 1500);
    }
}

// Event listener do botão editar/salvar
if (editBtn) {
    editBtn.addEventListener('click', () => {
        if (editMode) {
            saveEdits();
        } else {
            enterEditMode();
        }
    });
}

// ===== INTERCEPTAR EXIBIÇÃO DE ENTIDADES PARA MOSTRAR BOTÃO =====

// Sobrescrever showCityInfo para incluir botão de edição
const _originalShowCityInfo = showCityInfo;
showCityInfo = function(id) {
    _originalShowCityInfo(id);
    showEditButton('city', id, cities[id]);
};

const _originalShowCharacterInfo = showCharacterInfo;
showCharacterInfo = function(index) {
    _originalShowCharacterInfo(index);
    showEditButton('character', index, characters[index]);
};

const _originalShowLegionInfo = showLegionInfo;
showLegionInfo = function(index) {
    _originalShowLegionInfo(index);
    showEditButton('legion', index, legion[index]);
};

const _originalShowVillainInfo = showVillainInfo;
showVillainInfo = function(index) {
    _originalShowVillainInfo(index);
    showEditButton('villain', index, villains[index]);
};

const _originalShowArtifactInfo = showArtifactInfo;
showArtifactInfo = function(index) {
    _originalShowArtifactInfo(index);
    showEditButton('artifact', index, artifacts[index]);
};

const _originalShowBookInfo = showBookInfo;
showBookInfo = function(index) {
    _originalShowBookInfo(index);
    showEditButton('book', index, books[index]);
};

const _originalShowHistoricalInfo = showHistoricalInfo;
showHistoricalInfo = function(index) {
    _originalShowHistoricalInfo(index);
    showEditButton('historical', index, historicalNPCs[index]);
};

const _originalShowAllyInfo = showAllyInfo;
showAllyInfo = function(index) {
    _originalShowAllyInfo(index);
    showEditButton('ally', index, allies[index]);
};

const _originalShowLandmarkInfo = showLandmarkInfo;
showLandmarkInfo = function(index) {
    _originalShowLandmarkInfo(index);
    showEditButton('landmark', index, landmarks[index]);
};

// Esconder botão quando fecha painel
const _originalDeselectAll = deselectAll;
deselectAll = function() {
    _originalDeselectAll();
    hideEditButton();
};

// ===== CARREGAR DADOS AO INICIAR =====
loadFromFirestore();
