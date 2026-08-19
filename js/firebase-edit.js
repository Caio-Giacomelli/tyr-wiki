// ===== FIREBASE EDIT - EDIÇÃO COLABORATIVA DA WIKI =====

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
                editedData.features = Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim());
                editedData.details = editedData.features;
            }
        } else if (title.includes('notas')) {
            editedData.notes = paragraph ? paragraph.textContent.trim() : '';
        } else if (title.includes('ideal')) {
            editedData.ideal = paragraph ? paragraph.textContent.trim().replace(/^"|"$/g, '') : '';
        }
    });

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
