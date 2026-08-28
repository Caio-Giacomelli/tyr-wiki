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
        // Carregar cidades (Firestore e a fonte de verdade).
        // cities e um objeto `const` por chave — mutamos no lugar.
        const citiesSnap = await db.collection('cities').get();
        if (!citiesSnap.empty) {
            // Limpar chaves atuais (preservando a referencia do objeto const)
            Object.keys(cities).forEach(k => { delete cities[k]; });
            citiesSnap.forEach(doc => {
                cities[doc.id] = doc.data();
            });
        }

        // Helper para carregar arrays.
        // FIRESTORE E A FONTE DE VERDADE: o array local e RECONSTRUIDO a partir do banco.
        // Documentos com ID numerico preenchem o array na sua posicao (preservando indices,
        // que sao a identidade usada em todo o codigo). Indices sem documento no banco
        // viram null (removidos do site). Entradas 'new_' vao no fim.
        // Os arrays sao `const` — nao podem ser reatribuidos, entao mutamos no lugar.
        async function loadCollection(collectionName, localArray) {
            const snap = await db.collection(collectionName).get();

            // Se o banco estiver vazio para esta colecao, manter os dados locais como
            // fallback (evita apagar tudo caso o Firestore falhe ou nao tenha sido migrado).
            if (snap.empty) {
                rebuildSidebarList(collectionName, localArray);
                return;
            }

            const numericDocs = {}; // index -> data
            const newDocs = [];      // entradas criadas pelo site (new_)
            let maxIndex = -1;

            snap.forEach(doc => {
                const docId = doc.id;
                if (docId.startsWith('new_')) {
                    const data = doc.data();
                    data._docId = docId;
                    newDocs.push(data);
                } else {
                    const index = parseInt(docId);
                    if (!isNaN(index)) {
                        numericDocs[index] = doc.data();
                        if (index > maxIndex) maxIndex = index;
                    }
                }
            });

            // Reconstruir o array no lugar (mantendo a mesma referencia `const`)
            localArray.length = 0;
            for (let i = 0; i <= maxIndex; i++) {
                localArray[i] = numericDocs.hasOwnProperty(i) ? numericDocs[i] : null;
            }
            newDocs.forEach(data => localArray.push(data));

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

        // Carregar sessoes da wiki (Firestore e a fonte de verdade).
        if (typeof wikiSessions !== 'undefined') {
            const sessSnap = await db.collection('wikiSessionsFS').get();
            if (!sessSnap.empty) {
                // Reconstruir no lugar (mantendo a referencia)
                wikiSessions.length = 0;
                sessSnap.forEach(doc => {
                    const data = doc.data();
                    data.id = data.id || doc.id;
                    wikiSessions.push(data);
                });
            }
            // Rebuild da lista de sessoes no sidebar
            rebuildSessionsSidebar();
        }

        console.log('Wiki carregada do Firestore');
        // Reconstruir entityMap com dados carregados do Firestore
        if (typeof rebuildEntityMap === 'function') rebuildEntityMap();
    } catch (error) {
        console.log('Usando dados locais (Firestore indisponível ou vazio):', error.message);
    }
}

// Reconstruir lista do sidebar apos carregar do Firestore
function rebuildSessionsSidebar() {
    const listEl = document.getElementById('sessions-list');
    if (!listEl || typeof wikiSessions === 'undefined') return;

    listEl.innerHTML = '';

    // Agrupar por jornada
    const sessionsByJourney = {};
    wikiSessions.forEach((session, index) => {
        if (!session || !session.title) return;
        const key = session.journeyKey || 'outros';
        if (!sessionsByJourney[key]) sessionsByJourney[key] = [];
        sessionsByJourney[key].push({ session, index });
    });

    Object.keys(sessionsByJourney).forEach(journeyKey => {
        const config = typeof journeyConfigs !== 'undefined' ? journeyConfigs[journeyKey] : null;
        const journeyName = config && config.displayName ? config.displayName : journeyKey;

        const subHeader = document.createElement('div');
        subHeader.className = 'wiki-sub-header';
        subHeader.textContent = journeyName;
        listEl.appendChild(subHeader);

        sessionsByJourney[journeyKey].forEach(({ session, index }) => {
            const item = document.createElement('div');
            item.className = 'wiki-item';
            item.textContent = session.title;
            item.dataset.searchName = session.title.toLowerCase();
            item.addEventListener('click', () => showSessionPageInfo(index));
            listEl.appendChild(item);
        });
    });

    // Recriar botao "+"
    const addBtn = document.createElement('div');
    addBtn.className = 'wiki-add-item';
    addBtn.textContent = '+ Adicionar';
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof openAddModal === 'function') openAddModal('session');
    });
    listEl.appendChild(addBtn);
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
        item.dataset.idx = index;
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

    // Atualizar entityMap com entradas novas
    const typeFromCollection = {
        characters: 'character', legion: 'legion', villains: 'villain',
        artifacts: 'artifact', books: 'book', historicalNPCs: 'historical',
        allies: 'ally', landmarks: 'landmark'
    };
    const entityType = typeFromCollection[collectionName];
    try {
        if (entityType && entityMap) {
            localArray.forEach((entry, index) => {
                if (entry && entry.name && !entityMap[entry.name]) {
                    entityMap[entry.name] = { type: entityType, index: index };
                }
            });
        }
    } catch(e) { /* entityMap pode nao estar disponivel ainda */ }
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

// ===== SINCRONIZAR TODOS OS DADOS LOCAIS COM O BANCO =====
// Grava tudo o que existe localmente (incluindo imagens e edicoes atuais em memoria)
// no Firestore, preservando os mesmos IDs que o carregamento espera. Nada e apagado
// do banco: e um envio de tudo (upsert). Serve para garantir que o banco tenha uma
// copia completa antes de removermos a dependencia dos dados locais.
async function syncAllLocalDataToFirestore(onProgress) {
    if (typeof db === 'undefined') {
        throw new Error('Banco de dados indisponivel.');
    }

    let saved = 0;
    let failed = 0;

    // Helper: grava um array. docId = indice numerico, exceto entradas com _docId (new_...)
    async function syncArray(collectionName, arr) {
        if (!Array.isArray(arr)) return;
        for (let i = 0; i < arr.length; i++) {
            const entry = arr[i];
            if (!entry || !entry.name) continue; // pular buracos/nulos
            const docId = entry._docId ? entry._docId : String(i);
            // Nao gravar o campo interno _docId dentro do documento
            const data = Object.assign({}, entry);
            delete data._docId;
            try {
                await db.collection(collectionName).doc(docId).set(data, { merge: true });
                saved++;
            } catch (e) {
                console.error('Falha ao sincronizar ' + collectionName + '/' + docId, e);
                failed++;
            }
            if (onProgress) onProgress(saved, failed);
        }
    }

    // Helper: grava um objeto (cities). docId = a chave.
    async function syncObject(collectionName, obj) {
        if (!obj || typeof obj !== 'object') return;
        for (const key of Object.keys(obj)) {
            const entry = obj[key];
            if (!entry) continue;
            const data = Object.assign({}, entry);
            delete data._docId;
            try {
                await db.collection(collectionName).doc(String(key)).set(data, { merge: true });
                saved++;
            } catch (e) {
                console.error('Falha ao sincronizar ' + collectionName + '/' + key, e);
                failed++;
            }
            if (onProgress) onProgress(saved, failed);
        }
    }

    // Cidades (objeto por chave)
    if (typeof cities !== 'undefined') await syncObject('cities', cities);

    // Colecoes em array (docId = indice)
    if (typeof characters !== 'undefined') await syncArray('characters', characters);
    if (typeof legion !== 'undefined') await syncArray('legion', legion);
    if (typeof villains !== 'undefined') await syncArray('villains', villains);
    if (typeof artifacts !== 'undefined') await syncArray('artifacts', artifacts);
    if (typeof books !== 'undefined') await syncArray('books', books);
    if (typeof historicalNPCs !== 'undefined') await syncArray('historicalNPCs', historicalNPCs);
    if (typeof allies !== 'undefined') await syncArray('allies', allies);
    if (typeof landmarks !== 'undefined') await syncArray('landmarks', landmarks);

    // Sessoes da wiki (docId = session.id)
    if (typeof wikiSessions !== 'undefined') {
        for (const session of wikiSessions) {
            if (!session || !session.id) continue;
            const data = {
                id: session.id,
                journeyKey: session.journeyKey || '',
                title: session.title || '',
                quote: session.quote || '',
                quoteAuthor: session.quoteAuthor || '',
                content: session.content || ''
            };
            try {
                await db.collection('wikiSessionsFS').doc(String(session.id)).set(data, { merge: true });
                saved++;
            } catch (e) {
                console.error('Falha ao sincronizar wikiSessionsFS/' + session.id, e);
                failed++;
            }
            if (onProgress) onProgress(saved, failed);
        }
    }

    return { saved, failed };
}

// ===== BOTAO SINCRONIZAR (aba Ferramentas) =====
(function() {
    const syncBtn = document.getElementById('sync-db-btn');
    if (!syncBtn) return;

    syncBtn.addEventListener('click', async () => {
        if (syncBtn.disabled) return;
        const confirmed = confirm(
            'Isso vai enviar TODOS os dados locais (paginas da wiki, imagens, cidades, ' +
            'sessoes) para o banco de dados, mesclando com o que ja existe la.\n\n' +
            'Nada sera apagado do banco. Deseja continuar?'
        );
        if (!confirmed) return;

        const originalText = syncBtn.textContent;
        syncBtn.disabled = true;
        syncBtn.textContent = 'Sincronizando... (0)';

        try {
            const result = await syncAllLocalDataToFirestore((saved) => {
                syncBtn.textContent = 'Sincronizando... (' + saved + ')';
            });
            if (result.failed > 0) {
                syncBtn.textContent = '\u26A0 ' + result.saved + ' ok, ' + result.failed + ' falhas';
                alert('Sincronizacao concluida com ' + result.failed + ' falha(s). ' +
                      result.saved + ' registros salvos. Veja o console para detalhes.');
            } else {
                syncBtn.textContent = '\u2713 ' + result.saved + ' salvos!';
                alert('Sincronizacao concluida! ' + result.saved + ' registros salvos no banco.');
            }
        } catch (e) {
            console.error('Erro na sincronizacao:', e);
            syncBtn.textContent = '\u2717 Erro';
            alert('Erro na sincronizacao: ' + e.message);
        }

        setTimeout(() => {
            syncBtn.textContent = originalText;
            syncBtn.disabled = false;
        }, 4000);
    });
})();

// ===== BOTÃO DE EDIÇÃO =====
const editBtn = document.getElementById('edit-btn');

function showEditButton(entityType, entityId, entityData) {
    // Se estava editando outra entidade e navegou para uma pagina diferente,
    // sair do modo de edicao para nao sobrescrever a pagina errada ao salvar.
    if (editMode && currentEditEntity) {
        const isSameEntity = currentEditEntity.type === entityType &&
                             String(currentEditEntity.id) === String(entityId);
        if (!isSameEntity) {
            exitEditMode();
        }
    }
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

    // Para sessions, substituir regiao por dropdown de jornada
    if (currentEditEntity && currentEditEntity.type === 'session') {
        const regionEl = document.getElementById('city-region');
        const currentKey = currentEditEntity.data.journeyKey || '';
        const select = document.createElement('select');
        select.id = 'session-journey-select';
        select.className = 'session-journey-dropdown';
        if (typeof journeyConfigs !== 'undefined') {
            Object.keys(journeyConfigs).forEach(function(k) {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = journeyConfigs[k].displayName || k;
                if (k === currentKey) opt.selected = true;
                select.appendChild(opt);
            });
        }
        regionEl.style.display = 'none';
        regionEl.parentNode.insertBefore(select, regionEl.nextSibling);

        // Tornar bloco de conteudo editavel como um unico bloco
        const contentBlock = panel.querySelector('.session-content-block');
        if (contentBlock) {
            contentBlock.contentEditable = 'true';
            contentBlock.classList.add('editable');
        }
    } else {
        document.getElementById('city-region').contentEditable = 'true';
        document.getElementById('city-region').classList.add('editable');
    }

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

        // Tornar botoes de arte alternativa existentes clicaveis para exclusao
        const existingAltBtns = panel.querySelectorAll('.alt-art-btn');
        existingAltBtns.forEach((btn, btnIndex) => {
            // Pular o botao "1" (imagem principal) - so permitir excluir as alternativas
            if (btnIndex === 0) return;
            btn.classList.add('deleteable');
            btn.title = 'Clique para excluir esta arte alternativa';
            btn.addEventListener('click', function handleDeleteAlt(e) {
                e.stopPropagation();
                e.preventDefault();
                const altIndex = btnIndex - 1; // indice no array altImages
                const entity = currentEditEntity;
                if (!entity || !entity.data.altImages || !entity.data.altImages[altIndex]) return;

                if (!confirm('Excluir esta arte alternativa? Essa ação não pode ser desfeita.')) return;

                // Remover do array local
                entity.data.altImages.splice(altIndex, 1);

                // Se a arte excluida era a selecionada, resetar para a original
                if (entity.data.selectedArt !== undefined) {
                    if (entity.data.selectedArt === altIndex) {
                        entity.data.selectedArt = -1;
                    } else if (entity.data.selectedArt > altIndex) {
                        entity.data.selectedArt--;
                    }
                }

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
                const saveData = { altImages: entity.data.altImages };
                if (entity.data.selectedArt !== undefined) saveData.selectedArt = entity.data.selectedArt;
                saveToFirestore(collection, String(entity.id), saveData).then(() => {
                    exitEditMode();
                    refreshEntityView(entity);
                });
            });
        });
    }

    // Botão de adicionar imagem quando a entidade não tem nenhuma (exceto sessions)
    if (currentEditEntity && currentEditEntity.type !== 'session' && !panel.querySelector('.info-portrait') && !panel.querySelector('.add-image-btn')) {
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
            if (!confirm('Remover "' + (entity.data.name || entity.data.title || entity.data.displayName || '') + '"? Essa acao nao pode ser desfeita.')) return;

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
                    case 'session': collection = 'wikiSessionsFS'; break;
                }

                if (collection) {
                    // Usar _docId se disponivel (entradas criadas pelo site), senao usar index
                    const firestoreDocId = entity.data._docId || String(entity.id);
                    await db.collection(collection).doc(firestoreDocId).delete();
                }

                // Remover do array local.
                // Para NAO desalinhar os indices (que sao a identidade usada no banco),
                // entradas com indice numerico viram null (tombstone) em vez de splice.
                const typeArrays = {
                    character: characters,
                    legion: legion,
                    villain: villains,
                    artifact: (typeof artifacts !== 'undefined' ? artifacts : []),
                    book: (typeof books !== 'undefined' ? books : []),
                    historical: (typeof historicalNPCs !== 'undefined' ? historicalNPCs : []),
                    ally: (typeof allies !== 'undefined' ? allies : []),
                    landmark: (typeof landmarks !== 'undefined' ? landmarks : []),
                    session: (typeof wikiSessions !== 'undefined' ? wikiSessions : [])
                };

                const arr = typeArrays[entity.type];
                const collectionNameForRebuild = {
                    character: 'characters', legion: 'legion', villain: 'villains',
                    artifact: 'artifacts', book: 'books', historical: 'historicalNPCs',
                    ally: 'allies', landmark: 'landmarks'
                }[entity.type];

                if (arr) {
                    if (entity.data._docId) {
                        // Entrada criada pelo site (new_): remover pelo _docId
                        const pos = arr.findIndex(e => e && e._docId === entity.data._docId);
                        if (pos !== -1) arr.splice(pos, 1);
                    } else if (typeof entity.id === 'number') {
                        // Entrada base (indice numerico): tombstone para preservar indices
                        arr[entity.id] = null;
                    } else if (entity.type === 'session') {
                        // Sessao: remover pelo id
                        const pos = arr.findIndex(s => s && s.id === entity.id);
                        if (pos !== -1) arr.splice(pos, 1);
                    }
                }

                // Reconstruir o sidebar da colecao afetada
                if (entity.type === 'session') {
                    if (typeof rebuildSessionsSidebar === 'function') rebuildSessionsSidebar();
                } else if (collectionNameForRebuild && typeof rebuildSidebarList === 'function') {
                    rebuildSidebarList(collectionNameForRebuild, arr);
                }

                // Atualizar mapa de entidades (links [Nome])
                if (typeof rebuildEntityMap === 'function') rebuildEntityMap();

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

    // Remover dropdown de jornada (sessions)
    const journeySelect = document.getElementById('session-journey-select');
    if (journeySelect) {
        const regionEl = document.getElementById('city-region');
        if (regionEl) regionEl.style.display = '';
        journeySelect.remove();
    }
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
        case 'session':
            showSessionPageInfo(entity.id);
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
    // Para entradas criadas pelo site (arrays), o documento real no banco usa o _docId
    // (ex: 'new_1787...'), NAO o indice do array. Usar o indice criaria um documento
    // duplicado ao salvar. Cidades usam a chave (string) que ja vem em entity.id.
    let docId = (entity.data && entity.data._docId) ? entity.data._docId : entity.id;

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
        case 'session':
            collection = 'wikiSessionsFS';
            editedData.title = newName;
            // Jornada vem do dropdown
            const journeySelect = document.getElementById('session-journey-select');
            if (journeySelect) {
                editedData.journeyKey = journeySelect.value;
            }
            // Conteudo da sessao vem do bloco unico
            const contentBlock = panel.querySelector('.session-content-block');
            if (contentBlock) {
                // Converter <br> e divs de volta para \n
                const rawHtml = contentBlock.innerHTML;
                editedData.content = rawHtml
                    .replace(/<div>/gi, '\n')
                    .replace(/<\/div>/gi, '')
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/<[^>]+>/g, '')
                    .trim();
            }
            // Quote e autor vem de campos separados
            const quoteTextField = panel.querySelector('.session-quote-text');
            const quoteAuthorField = panel.querySelector('.session-quote-author');
            if (quoteTextField) {
                editedData.quote = quoteTextField.textContent.trim();
            }
            if (quoteAuthorField) {
                editedData.quoteAuthor = quoteAuthorField.textContent.trim();
            }
            docId = entity.data.id || entity.data._docId || String(entity.id);
            Object.assign(wikiSessions[entity.id], editedData);
            break;
    }

    const success = await saveToFirestore(collection, docId, editedData);
    if (success) {
        // Reconstruir o mapa de entidades para links [Nome] funcionarem imediatamente
        if (typeof rebuildEntityMap === 'function') rebuildEntityMap();
        exitEditMode();
        // Refresh da view para renderizar links atualizados
        refreshEntityView(entity);
        // Reconstruir a sidebar da colecao para refletir mudanca de nome no item
        const collectionByType = {
            character: 'characters', legion: 'legion', villain: 'villains',
            artifact: 'artifacts', book: 'books', historical: 'historicalNPCs',
            ally: 'allies', landmark: 'landmarks'
        };
        if (entity.type === 'session') {
            if (typeof rebuildSessionsSidebar === 'function') rebuildSessionsSidebar();
        } else if (collectionByType[entity.type] && typeof rebuildSidebarList === 'function') {
            const arrByType = {
                character: characters, legion: legion, villain: villains,
                artifact: (typeof artifacts !== 'undefined' ? artifacts : []),
                book: (typeof books !== 'undefined' ? books : []),
                historical: (typeof historicalNPCs !== 'undefined' ? historicalNPCs : []),
                ally: (typeof allies !== 'undefined' ? allies : []),
                landmark: (typeof landmarks !== 'undefined' ? landmarks : [])
            };
            rebuildSidebarList(collectionByType[entity.type], arrByType[entity.type]);
        }
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

// ===== SEED: Salvar dados locais no Firestore (se nao existirem) =====
async function seedLocalJourneys() {
    if (typeof db === 'undefined') return;
    try {
        // Seed das sessoes da wiki (wikiSessionsFS collection)
        if (typeof wikiSessions !== 'undefined' && wikiSessions.length > 0) {
            const firstSessionDoc = await db.collection('wikiSessionsFS').doc(wikiSessions[0].id).get();
            if (!firstSessionDoc.exists) {
                // Sessoes ainda nao existem no Firestore, salvar todas
                const batch = db.batch();
                wikiSessions.forEach(s => {
                    const ref = db.collection('wikiSessionsFS').doc(s.id);
                    batch.set(ref, {
                        id: s.id,
                        journeyKey: s.journeyKey,
                        title: s.title,
                        quote: s.quote || '',
                        quoteAuthor: s.quoteAuthor || '',
                        content: s.content || ''
                    });
                });
                await batch.commit();
                console.log('Sessoes da wiki salvas no Firestore (' + wikiSessions.length + ' sessoes)');
            }
        }

        // Sol Negro: salvar jornada (sem sessions embutidos)
        const solNegroDoc = await db.collection('journeys').doc('solnegro').get();
        if (!solNegroDoc.exists) {
            await db.collection('journeys').doc('solnegro').set({
                key: 'solnegro',
                displayName: 'Sol Negro',
                color: '#d4a843',
                pathColor: '#d4a843',
                party: [
                    { name: 'Stor', offset: -36 },
                    { name: 'Elandor', offset: 36 },
                    { name: 'Azarran', offset: 0 }
                ],
                stops: solNegroStopsCombined.map((s, i) => ({
                    x: s.x, y: s.y,
                    location: s.location || '',
                    session: s.session || '',
                    summary: s.summary || '',
                    participants: [],
                    sessionRef: 'solnegro_t1_' + i
                }))
            });
            console.log('Sol Negro salvo no Firestore');
        }

        // Cicatrizes do Eclipse
        const cicatrizDoc = await db.collection('journeys').doc('cicatriz').get();
        if (!cicatrizDoc.exists) {
            const cicatrizStops = typeof journeyStopsCicatriz !== 'undefined' ? journeyStopsCicatriz : [];
            await db.collection('journeys').doc('cicatriz').set({
                key: 'cicatriz',
                displayName: 'Cicatrizes do Eclipse',
                color: '#4a9cc8',
                pathColor: '#4a9cc8',
                party: [
                    { name: 'Falin', offset: -30 },
                    { name: 'Durgan', offset: 30 }
                ],
                stops: cicatrizStops.map((s, i) => ({
                    x: s.x, y: s.y,
                    location: s.location || '',
                    session: s.session || '',
                    summary: s.summary || '',
                    participants: [],
                    sessionRef: 'cicatriz_' + i
                }))
            });
            console.log('Cicatrizes do Eclipse salvo no Firestore');
        }
    } catch (err) {
        console.log('Seed:', err.message);
    }
}

seedLocalJourneys();
