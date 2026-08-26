// ===== SISTEMA DE DEMANDAS =====
// Demandas por jornada, com localização vinculada a cidades/POIs

(function() {
    'use strict';

    const COLLECTION = 'quests';
    let quests = []; // { id, journeyKey, title, desc, giver, locationId, locationType, status }
    let questPanelOpen = false;
    let editingQuest = null;
    let poiList = []; // cached POI names

    // ===== FIRESTORE =====
    async function loadQuests() {
        if (typeof db === 'undefined') return;
        try {
            const snap = await db.collection(COLLECTION).get();
            quests = [];
            snap.forEach(doc => { const d = doc.data(); d._id = doc.id; quests.push(d); });
        } catch (e) { console.log('Demandas indisponíveis:', e.message); }
    }

    async function saveQuest(quest) {
        if (typeof db === 'undefined') return false;
        try {
            if (quest._id) {
                await db.collection(COLLECTION).doc(quest._id).set(quest);
            } else {
                const ref = await db.collection(COLLECTION).add(quest);
                quest._id = ref.id;
            }
            return true;
        } catch (e) { console.error('Erro ao salvar demanda:', e); return false; }
    }

    async function deleteQuest(id) {
        if (typeof db === 'undefined') return false;
        try { await db.collection(COLLECTION).doc(id).delete(); return true; }
        catch (e) { return false; }
    }

    async function loadPOIs() {
        if (typeof db === 'undefined') return;
        try {
            const snap = await db.collection('customPOIs').get();
            poiList = [];
            snap.forEach(doc => { const d = doc.data(); poiList.push({ id: d.id || doc.id, name: d.name }); });
        } catch (e) {}
    }

    // ===== LOCATION HELPERS =====
    function getLocationOptions() {
        let options = '<option value="">Nenhuma</option>';
        // Cities
        if (typeof cities !== 'undefined') {
            options += '<optgroup label="Cidades">';
            Object.keys(cities).forEach(id => {
                const name = cities[id].displayName || id;
                options += `<option value="city:${id}">${name}</option>`;
            });
            options += '</optgroup>';
        }
        // POIs
        if (poiList.length > 0) {
            options += '<optgroup label="Pontos de Interesse">';
            poiList.forEach(poi => {
                options += `<option value="poi:${poi.id}">${poi.name}</option>`;
            });
            options += '</optgroup>';
        }
        return options;
    }

    function getLocationName(locationType, locationId) {
        if (!locationType || !locationId) return '';
        if (locationType === 'city' && typeof cities !== 'undefined' && cities[locationId]) {
            return cities[locationId].displayName || locationId;
        }
        if (locationType === 'poi') {
            const poi = poiList.find(p => p.id === locationId);
            return poi ? poi.name : locationId;
        }
        return locationId;
    }

    function focusLocation(locationType, locationId) {
        if (!locationType || !locationId) return;
        // Set flag to reopen quest panel after info panel closes
        window._questReturnPending = true;
        if (locationType === 'city' && typeof selectCity === 'function') {
            selectCity(locationId);
        } else if (locationType === 'poi') {
            // Show POI info panel
            if (typeof svgDoc !== 'undefined' && svgDoc) {
                const group = svgDoc.getElementById(locationId);
                if (group) {
                    // Trigger click on the POI group to open its info
                    group.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }
            }
        }
    }

    function focusGiver(giverName) {
        if (!giverName) return false;
        // Try to find entity by name in the global entityMap
        if (window._entityMap) {
            const entry = window._entityMap[giverName];
            if (entry) {
                window._questReturnPending = true;
                closePanel();
                const showFns = {
                    character: typeof showCharacterInfo === 'function' ? showCharacterInfo : null,
                    ally: typeof showAllyInfo === 'function' ? showAllyInfo : null,
                    legion: typeof showLegionInfo === 'function' ? showLegionInfo : null,
                    villain: typeof showVillainInfo === 'function' ? showVillainInfo : null,
                    historical: typeof showHistoricalInfo === 'function' ? showHistoricalInfo : null,
                    city: typeof selectCity === 'function' ? selectCity : null,
                    artifact: typeof showArtifactInfo === 'function' ? showArtifactInfo : null,
                    book: typeof showBookInfo === 'function' ? showBookInfo : null,
                    landmark: typeof showLandmarkInfo === 'function' ? showLandmarkInfo : null
                };
                const fn = showFns[entry.type];
                if (fn) { fn(entry.index); return true; }
            }
        }
        return false;
    }

    // ===== UI =====
    function togglePanel() {
        const panel = document.getElementById('quest-panel');
        questPanelOpen = !questPanelOpen;
        panel.classList.toggle('quest-panel-open', questPanelOpen);
        document.getElementById('quest-btn').classList.toggle('active', questPanelOpen);
        if (questPanelOpen) renderQuestList();
    }

    function closePanel() {
        questPanelOpen = false;
        document.getElementById('quest-panel').classList.remove('quest-panel-open');
        document.getElementById('quest-btn').classList.remove('active');
    }

    function populateJourneySelect() {
        const select = document.getElementById('quest-journey-select');
        if (!select) return;
        select.innerHTML = '';
        if (typeof journeyConfigs !== 'undefined') {
            Object.keys(journeyConfigs).forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = journeyConfigs[k].displayName || k;
                select.appendChild(opt);
            });
        }
    }

    function renderQuestList() {
        const listEl = document.getElementById('quest-list');
        const select = document.getElementById('quest-journey-select');
        if (!listEl || !select) return;

        const journeyKey = select.value;
        const filtered = quests.filter(q => q.journeyKey === journeyKey);

        // Sort: active first, then completed
        filtered.sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            return 0;
        });

        if (filtered.length === 0) {
            listEl.innerHTML = '<div class="quest-empty">Nenhuma demanda nesta jornada.</div>';
            return;
        }

        let html = '';
        filtered.forEach(q => {
            const isCompleted = q.status === 'completed';
            const locName = getLocationName(q.locationType, q.locationId);
            html += `<div class="quest-card${isCompleted ? ' quest-completed' : ''}" data-id="${q._id}">
                <div class="quest-card-summary">
                    <span class="quest-card-title">${escHtml(q.title)}</span>
                    <span class="quest-card-info">
                        ${q.giver ? '<span class="quest-meta-giver" data-giver="' + escHtml(q.giver) + '">' + escHtml(q.giver) + '</span>' : ''}
                        ${q.giver && locName ? ' &bull; ' : ''}
                        ${locName ? '<span class="quest-meta-loc" data-loctype="' + (q.locationType||'') + '" data-locid="' + (q.locationId||'') + '">' + escHtml(locName) + '</span>' : ''}
                    </span>
                    ${isCompleted ? '<span class="quest-card-badge">&#10003;</span>' : ''}
                </div>
                <div class="quest-card-expand">
                    <div class="quest-card-expand-inner">
                        ${q.desc ? '<div class="quest-card-desc">' + escHtml(q.desc) + '</div>' : ''}
                        <div class="quest-card-actions">
                            ${!isCompleted ? '<button class="quest-action-btn quest-complete-btn" data-id="' + q._id + '" title="Concluir">&#10003;</button>' : ''}
                            <button class="quest-action-btn quest-edit-btn" data-id="${q._id}" title="Editar">&#9998;</button>
                            <button class="quest-action-btn quest-del-btn" data-id="${q._id}" title="Excluir">&times;</button>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        listEl.innerHTML = html;

        // Click on summary title to expand/collapse
        listEl.querySelectorAll('.quest-card-summary').forEach(summary => {
            summary.addEventListener('click', (e) => {
                // Don't expand if clicking on giver or location
                if (e.target.closest('.quest-meta-giver') || e.target.closest('.quest-meta-loc')) return;
                summary.closest('.quest-card').classList.toggle('quest-expanded');
            });
        });

        // Click on location
        listEl.querySelectorAll('.quest-meta-loc').forEach(loc => {
            loc.addEventListener('click', (e) => {
                e.stopPropagation();
                focusLocation(loc.dataset.loctype, loc.dataset.locid);
                closePanel();
            });
        });

        // Click on giver
        listEl.querySelectorAll('.quest-meta-giver').forEach(giver => {
            giver.addEventListener('click', (e) => {
                e.stopPropagation();
                focusGiver(giver.dataset.giver);
            });
        });

        // Edit button
        listEl.querySelectorAll('.quest-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const quest = quests.find(q => q._id === btn.dataset.id);
                if (quest) openEditModal(quest);
            });
        });

        // Delete button
        listEl.querySelectorAll('.quest-del-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Excluir esta demanda?')) return;
                await deleteQuest(btn.dataset.id);
                quests = quests.filter(q => q._id !== btn.dataset.id);
                renderQuestList();
            });
        });

        // Complete button
        listEl.querySelectorAll('.quest-complete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const quest = quests.find(q => q._id === btn.dataset.id);
                if (!quest) return;
                quest.status = 'completed';
                await saveQuest(quest);
                renderQuestList();
            });
        });
    }

    function openEditModal(quest) {
        editingQuest = quest || null;
        const overlay = document.getElementById('quest-modal-overlay');
        const title = document.getElementById('quest-modal-title');
        const fTitle = document.getElementById('quest-f-title');
        const fDesc = document.getElementById('quest-f-desc');
        const fGiver = document.getElementById('quest-f-giver');
        const fLocation = document.getElementById('quest-f-location');
        const fStatus = document.getElementById('quest-f-status');
        const fDelete = document.getElementById('quest-f-delete');

        title.textContent = quest ? 'Editar Demanda' : 'Nova Demanda';
        fTitle.value = quest ? quest.title || '' : '';
        fDesc.value = quest ? quest.desc || '' : '';
        fGiver.value = quest ? quest.giver || '' : '';
        fStatus.value = quest ? quest.status || 'active' : 'active';
        fDelete.style.display = quest ? 'block' : 'none';

        // Populate location select
        fLocation.innerHTML = getLocationOptions();
        if (quest && quest.locationType && quest.locationId) {
            fLocation.value = quest.locationType + ':' + quest.locationId;
        } else {
            fLocation.value = '';
        }

        overlay.classList.add('open');
    }

    function closeEditModal() {
        document.getElementById('quest-modal-overlay').classList.remove('open');
        editingQuest = null;
    }

    async function handleSave() {
        const fTitle = document.getElementById('quest-f-title').value.trim();
        const fDesc = document.getElementById('quest-f-desc').value.trim();
        const fGiver = document.getElementById('quest-f-giver').value.trim();
        const fLocationVal = document.getElementById('quest-f-location').value;
        const fStatus = document.getElementById('quest-f-status').value;

        if (!fTitle) { alert('Digite um título.'); return; }

        let locationType = '', locationId = '';
        if (fLocationVal && fLocationVal.includes(':')) {
            const parts = fLocationVal.split(':');
            locationType = parts[0];
            locationId = parts.slice(1).join(':');
        }

        const journeyKey = document.getElementById('quest-journey-select').value;

        if (editingQuest) {
            editingQuest.title = fTitle;
            editingQuest.desc = fDesc;
            editingQuest.giver = fGiver;
            editingQuest.locationType = locationType;
            editingQuest.locationId = locationId;
            editingQuest.status = fStatus;
            editingQuest.journeyKey = journeyKey;
            await saveQuest(editingQuest);
        } else {
            const newQuest = {
                journeyKey, title: fTitle, desc: fDesc, giver: fGiver,
                locationType, locationId, status: fStatus
            };
            await saveQuest(newQuest);
            quests.push(newQuest);
        }

        closeEditModal();
        renderQuestList();
    }

    async function handleDelete() {
        if (!editingQuest || !editingQuest._id) return;
        if (!confirm('Excluir esta demanda?')) return;
        await deleteQuest(editingQuest._id);
        quests = quests.filter(q => q._id !== editingQuest._id);
        closeEditModal();
        renderQuestList();
    }

    function escHtml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

    // ===== INIT =====
    let initialized = false;

    async function init() {
        if (initialized) return;
        initialized = true;
        await loadPOIs();
        await loadQuests();
        populateJourneySelect();
    }

    function setupListeners() {
        // Button toggle
        document.getElementById('quest-btn').addEventListener('click', async () => {
            if (!initialized) await init();
            togglePanel();
        });
        document.getElementById('quest-panel-close').addEventListener('click', closePanel);

        // Journey select change
        document.getElementById('quest-journey-select').addEventListener('change', renderQuestList);

        // Add quest
        document.getElementById('quest-add-btn').addEventListener('click', () => openEditModal(null));

        // Modal controls
        document.getElementById('quest-modal-close').addEventListener('click', closeEditModal);
        document.getElementById('quest-f-save').addEventListener('click', handleSave);
        document.getElementById('quest-f-delete').addEventListener('click', handleDelete);

        // Hook into info panel close to return to quest panel
        const closeBtn = document.getElementById('close-panel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (window._questReturnPending) {
                    window._questReturnPending = false;
                    setTimeout(() => togglePanel(), 200);
                }
            });
        }
        // Also on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && window._questReturnPending) {
                window._questReturnPending = false;
                setTimeout(() => togglePanel(), 200);
            }
        });
    }

    // Wire listeners immediately (elements exist in DOM from HTML)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupListeners);
    } else {
        setupListeners();
    }
})();
