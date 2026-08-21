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

        // Carregar personagens
        const charsSnap = await db.collection('characters').get();
        charsSnap.forEach(doc => {
            const index = parseInt(doc.id);
            if (!isNaN(index) && characters[index]) {
                Object.assign(characters[index], doc.data());
            }
        });

        // Carregar legião
        const legionSnap = await db.collection('legion').get();
        legionSnap.forEach(doc => {
            const index = parseInt(doc.id);
            if (!isNaN(index) && legion[index]) {
                Object.assign(legion[index], doc.data());
            }
        });

        // Carregar vilões
        const villainsSnap = await db.collection('villains').get();
        villainsSnap.forEach(doc => {
            const index = parseInt(doc.id);
            if (!isNaN(index) && villains[index]) {
                Object.assign(villains[index], doc.data());
            }
        });

        console.log('Wiki carregada do Firestore');
    } catch (error) {
        console.log('Usando dados locais (Firestore indisponível ou vazio):', error.message);
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

    // Botão de adicionar arte alternativa (só para personagens)
    if (currentEditEntity && currentEditEntity.type === 'character') {
        const portraitContainer = panel.querySelector('.portrait-container');
        if (portraitContainer && !panel.querySelector('.add-alt-art-btn')) {
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
                        const char = currentEditEntity.data;

                        // Comprimir imagem via canvas
                        const dataUrl = await compressImage(file, 600, 0.75);

                        // Atualizar dados locais
                        if (!char.altImages) char.altImages = [];
                        char.altImages.push(dataUrl);

                        // Salvar no Firestore
                        await saveToFirestore('characters', String(currentEditEntity.id), { altImages: char.altImages });

                        // Recarregar a view do personagem
                        addArtBtn.textContent = '+';
                        addArtBtn.disabled = false;
                        exitEditMode();
                        showCharacterInfo(currentEditEntity.id);
                        showEditButton('character', currentEditEntity.id, characters[currentEditEntity.id]);
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
            let altBtns = portraitContainer.querySelector('.alt-art-buttons');
            if (!altBtns) {
                altBtns = document.createElement('div');
                altBtns.className = 'alt-art-buttons';
                portraitContainer.appendChild(altBtns);
            }
            altBtns.appendChild(addArtBtn);
        }
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
