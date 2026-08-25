// ===== FICHA DE PERSONAGEM D&D 5e (2014) =====
// Compact layout com submenus colapsáveis, categorias de habilidade, inventário detalhado

(function() {
    'use strict';

    const COLLECTION = 'charsheets';
    let currentSheet = null;
    let sheetEditMode = false;
    let sheetAuthenticated = false;

    // ===== DATA MODEL =====
    function emptySheet() {
        return {
            id: '', password: '',
            // Header
            name: '', race: '', class: '', subclass: '', level: 1,
            background: '', alignment: '', xp: 0, image: '',
            // Attributes
            str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
            // Combat
            armorClass: 10, initiative: 0, speed: '9m',
            hpMax: 10, hpCurrent: 10, hpTemp: 0,
            hitDice: '1d10', hitDiceRemaining: 1,
            proficiencyBonus: 2,
            // Saving throws (proficiency + value override)
            saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
            saveProficiencies: [],
            // Skills (value overrides)
            skills: {},
            // Languages & Proficiencies
            languages: '', proficienciesText: '',
            // Abilities by category
            classFeatures: [], // { name, desc }
            abilitiesAction: [], // { name, cost, range, duration, desc }
            abilitiesBonus: [],
            abilitiesReaction: [],
            abilitiesPassive: [], // features that are always on
            // Psionic / Special
            specialMechanics: [], // { name, desc }
            // Attacks
            attacks: [], // { name, bonus, damage, desc }
            // Inventory
            equipment: [], // { name, bonus, damage, desc, charges }
            currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
            // Spellcasting
            spellSlots: {}, // { 1: { max, used }, 2: { max, used } }
            spellcastingAbility: '', spellSaveDC: 0, spellAttackBonus: 0,
            // Personality
            personalityTraits: '', ideals: '', bonds: '', flaws: '',
            // Roleplay
            roleplayNotes: [], // strings
            // Bonus/Misc
            bonusMechanics: [], // { name, desc }
            notes: ''
        };
    }

    const SKILLS_LIST = [
        { key: 'acrobatics', name: 'Acrobacia', ability: 'dex' },
        { key: 'animalHandling', name: 'Lidar com Animais', ability: 'wis' },
        { key: 'arcana', name: 'Arcanismo', ability: 'int' },
        { key: 'athletics', name: 'Atletismo', ability: 'str' },
        { key: 'deception', name: 'Blefar', ability: 'cha' },
        { key: 'history', name: 'História', ability: 'int' },
        { key: 'insight', name: 'Intuição', ability: 'wis' },
        { key: 'intimidation', name: 'Intimidação', ability: 'cha' },
        { key: 'investigation', name: 'Investigação', ability: 'int' },
        { key: 'medicine', name: 'Medicina', ability: 'wis' },
        { key: 'nature', name: 'Natureza', ability: 'int' },
        { key: 'perception', name: 'Percepção', ability: 'wis' },
        { key: 'performance', name: 'Atuação', ability: 'cha' },
        { key: 'persuasion', name: 'Persuasão', ability: 'cha' },
        { key: 'religion', name: 'Religião', ability: 'int' },
        { key: 'sleightOfHand', name: 'Prestidigitação', ability: 'dex' },
        { key: 'stealth', name: 'Furtividade', ability: 'dex' },
        { key: 'survival', name: 'Sobrevivência', ability: 'wis' }
    ];

    const ABILITY_NAMES = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };
    const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    function getMod(score) { return Math.floor((score - 10) / 2); }
    function modStr(val) { return val >= 0 ? '+' + val : String(val); }
    function escHtml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
    function escAttr(s) { return escHtml(s); }

    // ===== FIRESTORE =====
    async function saveSheet(sheet) {
        if (typeof db === 'undefined') return false;
        try { await db.collection(COLLECTION).doc(sheet.id).set(sheet); return true; }
        catch(e) { console.error('Erro ao salvar ficha:', e); return false; }
    }
    async function loadSheet(id) {
        if (typeof db === 'undefined') return null;
        try { const d = await db.collection(COLLECTION).doc(id).get(); return d.exists ? d.data() : null; }
        catch(e) { return null; }
    }
    async function deleteSheet(id) {
        if (typeof db === 'undefined') return false;
        try { await db.collection(COLLECTION).doc(id).delete(); return true; }
        catch(e) { return false; }
    }

    function hashPassword(pw) {
        let h = 0;
        for (let i = 0; i < pw.length; i++) { h = ((h << 5) - h) + pw.charCodeAt(i); h = h & h; }
        return 'h_' + Math.abs(h).toString(36);
    }

    // ===== UI: OVERLAY =====
    function openCharsheetOverlay() {
        const ov = document.getElementById('charsheet-overlay');
        if (ov) ov.classList.add('open');
        if (!sheetAuthenticated) showLoginScreen();
        else renderSheetView();
    }
    function closeCharsheetOverlay() {
        const ov = document.getElementById('charsheet-overlay');
        if (ov) ov.classList.remove('open');
        currentSheet = null; sheetAuthenticated = false; sheetEditMode = false;
    }

    // ===== LOGIN =====
    function showLoginScreen() {
        const c = document.getElementById('charsheet-container');
        c.innerHTML = `
            <div class="cs-login">
                <h2 class="cs-login-title">Ficha de Personagem</h2>
                <p class="cs-login-subtitle">D&D 5e</p>
                <div class="cs-login-form">
                    <label>ID da Ficha</label>
                    <input type="text" id="cs-login-id" placeholder="ex: stor, elandor...">
                    <label>Senha</label>
                    <input type="password" id="cs-login-pw" placeholder="Senha...">
                    <div class="cs-login-actions">
                        <button id="cs-login-btn" class="cs-btn cs-btn-primary">Entrar</button>
                        <button id="cs-create-btn" class="cs-btn cs-btn-secondary">Criar Nova</button>
                    </div>
                    <p id="cs-login-error" class="cs-error"></p>
                </div>
            </div>`;
        document.getElementById('cs-login-btn').addEventListener('click', handleLogin);
        document.getElementById('cs-create-btn').addEventListener('click', handleCreate);
        document.getElementById('cs-login-pw').addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
    }

    async function handleLogin() {
        const id = document.getElementById('cs-login-id').value.trim().toLowerCase().replace(/\s+/g, '-');
        const pw = document.getElementById('cs-login-pw').value;
        const err = document.getElementById('cs-login-error');
        if (!id || !pw) { err.textContent = 'Preencha ID e senha.'; return; }
        err.textContent = 'Carregando...';
        const sheet = await loadSheet(id);
        if (!sheet) { err.textContent = 'Ficha nao encontrada.'; return; }
        if (sheet.password !== hashPassword(pw)) { err.textContent = 'Senha incorreta.'; return; }
        currentSheet = sheet; sheetAuthenticated = true; sheetEditMode = false;
        renderSheetView();
    }

    async function handleCreate() {
        const id = document.getElementById('cs-login-id').value.trim().toLowerCase().replace(/\s+/g, '-');
        const pw = document.getElementById('cs-login-pw').value;
        const err = document.getElementById('cs-login-error');
        if (!id || !pw) { err.textContent = 'Preencha ID e senha.'; return; }
        if (pw.length < 3) { err.textContent = 'Senha minimo 3 caracteres.'; return; }
        err.textContent = 'Verificando...';
        const existing = await loadSheet(id);
        if (existing) { err.textContent = 'Ja existe ficha com esse ID.'; return; }
        const sheet = emptySheet();
        sheet.id = id; sheet.password = hashPassword(pw);
        sheet.name = id.charAt(0).toUpperCase() + id.slice(1);
        const ok = await saveSheet(sheet);
        if (!ok) { err.textContent = 'Erro ao criar.'; return; }
        currentSheet = sheet; sheetAuthenticated = true; sheetEditMode = true;
        renderEditView();
    }

    // ===== COLLAPSIBLE SECTION HELPER =====
    function collapseHtml(title, content, open) {
        return `<div class="cs-collapse${open ? ' cs-open' : ''}">
            <div class="cs-collapse-header" onclick="this.parentElement.classList.toggle('cs-open')">
                <span>${title}</span><span class="cs-collapse-arrow">&#9654;</span>
            </div>
            <div class="cs-collapse-body"><div class="cs-collapse-inner">${content}</div></div>
        </div>`;
    }

    // ===== SHEET VIEW =====
    function renderSheetView() {
        const c = document.getElementById('charsheet-container');
        if (!c || !currentSheet) return;
        const s = currentSheet;

        let html = `
        <div class="cs-sheet">
            <div class="cs-sheet-toolbar">
                <button id="cs-back-btn" class="cs-toolbar-btn">&#8592;</button>
                <span class="cs-toolbar-title">${escHtml(s.name)}</span>
                <div class="cs-toolbar-right">
                    <button id="cs-combat-toggle" class="cs-toolbar-btn cs-combat-btn" title="Modo Combate">&#9876;</button>
                    <button id="cs-edit-btn" class="cs-toolbar-btn">&#9998;</button>
                </div>
            </div>

            <!-- Header compacto -->
            <div class="cs-header">
                ${s.image ? '<img class="cs-portrait" src="' + escAttr(s.image) + '">' : ''}
                <div class="cs-header-info">
                    <div class="cs-char-name">${escHtml(s.name)}</div>
                    <div class="cs-char-meta">${escHtml(s.race)} &bull; ${escHtml(s.class)}${s.subclass ? ' (' + escHtml(s.subclass) + ')' : ''} ${s.level}</div>
                    <div class="cs-char-meta2">${escHtml(s.background)} &bull; ${escHtml(s.alignment)}</div>
                </div>
            </div>

            <!-- Combat Stats -->
            <div class="cs-combat-row">
                <div class="cs-stat-pill cs-hp"><span class="cs-stat-val" id="cs-hp-display">${s.hpCurrent}/${s.hpMax}</span><span class="cs-stat-lbl">PV</span></div>
                <div class="cs-stat-pill"><span class="cs-stat-val">${s.armorClass}</span><span class="cs-stat-lbl">CA</span></div>
                <div class="cs-stat-pill"><span class="cs-stat-val">${modStr(s.initiative)}</span><span class="cs-stat-lbl">Inic</span></div>
                <div class="cs-stat-pill"><span class="cs-stat-val">${escHtml(s.speed)}</span><span class="cs-stat-lbl">Desl</span></div>
                <div class="cs-stat-pill"><span class="cs-stat-val">+${s.proficiencyBonus}</span><span class="cs-stat-lbl">Prof</span></div>
            </div>

            <!-- Combat Mode Panel (hidden by default) -->
            <div class="cs-combat-panel" id="cs-combat-panel">
                <div class="cs-cm-inner">
                    <div class="cs-cm-hp-row">
                        <button class="cs-cm-hp-btn cs-cm-dmg" data-action="hp-down5">5</button>
                        <button class="cs-cm-hp-btn cs-cm-dmg" data-action="hp-down">1</button>
                        <div class="cs-cm-hp-center">
                            <div class="cs-cm-hp-label">Vida</div>
                            <div class="cs-cm-hp-val" id="cs-cm-hp">${s.hpCurrent}<small>/${s.hpMax}</small></div>
                        </div>
                        <button class="cs-cm-hp-btn cs-cm-heal" data-action="hp-up">1</button>
                        <button class="cs-cm-hp-btn cs-cm-heal" data-action="hp-up5">5</button>
                    </div>
                    ${renderCombatSlots(s)}
                </div>
            </div>

            <!-- Spell Slots inline -->
            ${renderSpellSlotsCompact(s)}

            <!-- Attributes row -->
            <div class="cs-abilities-row">
                ${ABILITIES.map(ab => {
                    const sc = s[ab];
                    const saveVal = s.saves && s.saves[ab] !== undefined ? s.saves[ab] : (getMod(sc) + ((s.saveProficiencies||[]).includes(ab) ? s.proficiencyBonus : 0));
                    return `<div class="cs-ability-box">
                        <div class="cs-ab-name">${ABILITY_NAMES[ab]}</div>
                        <div class="cs-ab-score">${sc}</div>
                        <div class="cs-ab-save">${modStr(saveVal)}</div>
                    </div>`;
                }).join('')}
            </div>`;

        // Skills (collapsible)
        let skillsHtml = '<div class="cs-skills-grid">';
        SKILLS_LIST.forEach(sk => {
            const val = s.skills && s.skills[sk.key] !== undefined ? s.skills[sk.key] : getMod(s[sk.ability]);
            const isProf = Math.abs(val) > Math.abs(getMod(s[sk.ability]));
            skillsHtml += `<div class="cs-skill-row${isProf ? ' cs-prof' : ''}"><span class="cs-skill-val">${modStr(val)}</span><span class="cs-skill-name">${sk.name}</span></div>`;
        });
        skillsHtml += '</div>';
        html += collapseHtml('Perícias', skillsHtml, false);

        // Attacks (always visible)
        if (s.attacks && s.attacks.length > 0) {
            let atkHtml = '<div class="cs-attacks-list">';
            s.attacks.forEach(a => {
                atkHtml += `<div class="cs-atk-card">
                    <div class="cs-atk-top"><span class="cs-atk-name">${escHtml(a.name)}</span><span class="cs-atk-bonus">${escHtml(a.bonus)}</span><span class="cs-atk-dmg">${escHtml(a.damage)}</span></div>
                    ${a.desc ? '<div class="cs-atk-desc">' + escHtml(a.desc) + '</div>' : ''}
                </div>`;
            });
            atkHtml += '</div>';
            html += collapseHtml('Ataques', atkHtml, true);
        }

        // Abilities by category with tabs
        html += renderAbilitiesTabs(s);

        // Class Features & Passives
        if ((s.classFeatures && s.classFeatures.length) || (s.abilitiesPassive && s.abilitiesPassive.length)) {
            let featHtml = '';
            (s.classFeatures || []).concat(s.abilitiesPassive || []).forEach(f => {
                featHtml += `<div class="cs-feat-card"><div class="cs-feat-name">${escHtml(f.name)}</div><div class="cs-feat-desc">${escHtml(f.desc)}</div></div>`;
            });
            html += collapseHtml('Traços de Classe & Passivos', featHtml, false);
        }

        // Special Mechanics
        if (s.specialMechanics && s.specialMechanics.length) {
            let specHtml = '';
            s.specialMechanics.forEach(m => {
                specHtml += `<div class="cs-feat-card cs-special"><div class="cs-feat-name">${escHtml(m.name)}</div><div class="cs-feat-desc">${escHtml(m.desc)}</div></div>`;
            });
            html += collapseHtml('Poderes Especiais', specHtml, false);
        }

        // Inventory (collapsible)
        html += renderInventory(s);

        // Bonus Mechanics
        if (s.bonusMechanics && s.bonusMechanics.length) {
            let bonusHtml = '';
            s.bonusMechanics.forEach(b => {
                bonusHtml += `<div class="cs-feat-card"><div class="cs-feat-name">${escHtml(b.name)}</div><div class="cs-feat-desc">${escHtml(b.desc)}</div></div>`;
            });
            html += collapseHtml('Bônus & Mecânicas', bonusHtml, false);
        }

        // Roleplay
        if (s.roleplayNotes && s.roleplayNotes.length) {
            let rpHtml = '<ul class="cs-rp-list">';
            s.roleplayNotes.forEach(n => { rpHtml += '<li>' + escHtml(n) + '</li>'; });
            rpHtml += '</ul>';
            html += collapseHtml('Roleplay & Aprendizados', rpHtml, false);
        }

        // Languages & Proficiencies
        if (s.languages || s.proficienciesText) {
            let lpHtml = '';
            if (s.languages) lpHtml += '<p><strong>Idiomas:</strong> ' + escHtml(s.languages) + '</p>';
            if (s.proficienciesText) lpHtml += '<p><strong>Proficiências:</strong> ' + escHtml(s.proficienciesText) + '</p>';
            html += collapseHtml('Idiomas & Proficiências', lpHtml, false);
        }

        // Notes
        if (s.notes) {
            html += collapseHtml('Notas', '<div class="cs-notes-block">' + escHtml(s.notes) + '</div>', false);
        }

        html += '</div>'; // .cs-sheet
        c.innerHTML = html;

        document.getElementById('cs-back-btn').addEventListener('click', closeCharsheetOverlay);
        document.getElementById('cs-edit-btn').addEventListener('click', () => { sheetEditMode = true; renderEditView(); });

        // Combat mode toggle
        const combatToggle = document.getElementById('cs-combat-toggle');
        const combatPanel = document.getElementById('cs-combat-panel');
        combatToggle.addEventListener('click', () => {
            combatToggle.classList.toggle('cs-active');
            combatPanel.classList.toggle('cs-cm-open');
        });

        // Combat mode actions
        combatPanel.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const s = currentSheet;

            if (action === 'hp-down') s.hpCurrent = Math.max(0, s.hpCurrent - 1);
            else if (action === 'hp-down5') s.hpCurrent = Math.max(0, s.hpCurrent - 5);
            else if (action === 'hp-up') s.hpCurrent = Math.min(s.hpMax, s.hpCurrent + 1);
            else if (action === 'hp-up5') s.hpCurrent = Math.min(s.hpMax, s.hpCurrent + 5);
            else if (action.startsWith('slot-use-')) {
                const lvl = action.replace('slot-use-', '');
                if (s.spellSlots[lvl] && (s.spellSlots[lvl].used || 0) < s.spellSlots[lvl].max) {
                    s.spellSlots[lvl].used = (s.spellSlots[lvl].used || 0) + 1;
                }
            } else if (action.startsWith('slot-restore-')) {
                const lvl = action.replace('slot-restore-', '');
                if (s.spellSlots[lvl] && (s.spellSlots[lvl].used || 0) > 0) {
                    s.spellSlots[lvl].used = (s.spellSlots[lvl].used || 0) - 1;
                }
            } else if (action === 'slot-rest') {
                Object.keys(s.spellSlots).forEach(lvl => { if (s.spellSlots[lvl]) s.spellSlots[lvl].used = 0; });
                s.hpCurrent = s.hpMax;
            }

            // Update display
            document.getElementById('cs-cm-hp').innerHTML = s.hpCurrent + '<small>/' + s.hpMax + '</small>';
            document.getElementById('cs-hp-display').textContent = s.hpCurrent + '/' + s.hpMax;
            // Update slots display
            const slotsContainer = document.getElementById('cs-cm-slots');
            if (slotsContainer) slotsContainer.innerHTML = renderCombatSlotsInner(s);
            const slotsRow = document.querySelector('.cs-slots-row');
            if (slotsRow) slotsRow.outerHTML = renderSpellSlotsCompact(s);

            // Auto-save
            await saveSheet(s);
        });
    }

    function renderSpellSlotsCompact(s) {
        const slots = s.spellSlots || {};
        const hasSlots = Object.keys(slots).some(k => slots[k] && slots[k].max > 0);
        if (!hasSlots) return '';
        let html = '<div class="cs-slots-row">';
        for (let lvl = 1; lvl <= 9; lvl++) {
            const sl = slots[lvl];
            if (!sl || !sl.max) continue;
            const remaining = sl.max - (sl.used || 0);
            html += `<div class="cs-slot-pill"><span class="cs-slot-lvl">${lvl}\u00BA</span><span class="cs-slot-val">${remaining}/${sl.max}</span></div>`;
        }
        html += '</div>';
        return html;
    }

    function renderCombatSlots(s) {
        const slots = s.spellSlots || {};
        const hasSlots = Object.keys(slots).some(k => slots[k] && slots[k].max > 0);
        if (!hasSlots) return '';
        return `<div class="cs-cm-slots" id="cs-cm-slots">${renderCombatSlotsInner(s)}</div>
                <button class="cs-cm-rest-btn" data-action="slot-rest">Descanso Longo</button>`;
    }

    function renderCombatSlotsInner(s) {
        const slots = s.spellSlots || {};
        let html = '';
        for (let lvl = 1; lvl <= 9; lvl++) {
            const sl = slots[lvl];
            if (!sl || !sl.max) continue;
            const used = sl.used || 0;
            const remaining = sl.max - used;
            html += `<div class="cs-cm-slot-row">
                <button class="cs-cm-slot-btn cs-cm-dmg" data-action="slot-use-${lvl}">&minus;</button>
                <span class="cs-cm-slot-pill"><span class="cs-cm-slot-lvl">${lvl}\u00BA</span><span class="cs-cm-slot-val">${remaining}/${sl.max}</span></span>
                <button class="cs-cm-slot-btn cs-cm-heal" data-action="slot-restore-${lvl}">+</button>
            </div>`;
        }
        return html;
    }

    function renderAbilitiesTabs(s) {
        const cats = [
            { key: 'action', label: 'Ação', items: s.abilitiesAction || [] },
            { key: 'bonus', label: 'Bônus', items: s.abilitiesBonus || [] },
            { key: 'reaction', label: 'Reação', items: s.abilitiesReaction || [] }
        ];
        const hasAny = cats.some(c => c.items.length > 0);
        if (!hasAny) return '';

        let tabsHtml = '<div class="cs-tabs-header">';
        cats.forEach((cat, i) => {
            if (cat.items.length === 0) return;
            tabsHtml += `<button class="cs-tab-btn${i === 0 ? ' cs-tab-active' : ''}" data-tab="${cat.key}">${cat.label} (${cat.items.length})</button>`;
        });
        tabsHtml += '</div>';

        let panelsHtml = '';
        cats.forEach((cat, i) => {
            if (cat.items.length === 0) return;
            panelsHtml += `<div class="cs-tab-panel${i === 0 ? ' cs-tab-visible' : ''}" data-tab="${cat.key}">`;
            cat.items.forEach(ab => {
                panelsHtml += `<div class="cs-ability-card">
                    <div class="cs-ability-header" onclick="this.parentElement.classList.toggle('cs-ab-open')">
                        <span class="cs-ability-name">${escHtml(ab.name)}</span>
                        ${ab.cost ? '<span class="cs-ability-cost">' + escHtml(ab.cost) + '</span>' : ''}
                    </div>
                    <div class="cs-ability-body"><div>
                        ${ab.range ? '<div class="cs-ab-meta"><b>Alcance:</b> ' + escHtml(ab.range) + '</div>' : ''}
                        ${ab.duration ? '<div class="cs-ab-meta"><b>Duração:</b> ' + escHtml(ab.duration) + '</div>' : ''}
                        <div class="cs-ab-desc">${escHtml(ab.desc)}</div>
                    </div></div>
                </div>`;
            });
            panelsHtml += '</div>';
        });

        return collapseHtml('Habilidades & Magias', '<div class="cs-tabs">' + tabsHtml + panelsHtml + '</div>', true);
    }

    function renderInventory(s) {
        const currency = s.currency || {};
        const items = s.equipment || [];
        let html = '<div class="cs-inv">';

        // Currency row
        const coins = [];
        if (currency.pp) coins.push(currency.pp + ' PL');
        if (currency.gp) coins.push(currency.gp + ' PO');
        if (currency.ep) coins.push(currency.ep + ' PE');
        if (currency.sp) coins.push(currency.sp + ' PP');
        if (currency.cp) coins.push(currency.cp + ' PC');
        if (coins.length) html += '<div class="cs-coins">' + coins.map(c => '<span class="cs-coin">' + c + '</span>').join('') + '</div>';

        // Items
        if (items.length) {
            html += '<div class="cs-inv-list">';
            items.forEach(item => {
                html += `<div class="cs-inv-item" onclick="this.classList.toggle('cs-inv-open')">
                    <div class="cs-inv-item-header">
                        <span class="cs-inv-name">${escHtml(item.name)}</span>
                        ${item.bonus ? '<span class="cs-inv-bonus">' + escHtml(item.bonus) + '</span>' : ''}
                        ${item.damage ? '<span class="cs-inv-dmg">' + escHtml(item.damage) + '</span>' : ''}
                        ${item.charges ? '<span class="cs-inv-charges">' + escHtml(item.charges) + '</span>' : ''}
                    </div>
                    ${item.desc ? '<div class="cs-inv-desc"><span>' + escHtml(item.desc) + '</span></div>' : ''}
                </div>`;
            });
            html += '</div>';
        }
        html += '</div>';
        return collapseHtml('Inventário & Equipamento', html, false);
    }

    // ===== EDIT VIEW =====
    function renderEditView() {
        const c = document.getElementById('charsheet-container');
        if (!c || !currentSheet) return;
        const s = currentSheet;

        c.innerHTML = `
        <div class="cs-sheet cs-editing">
            <div class="cs-sheet-toolbar">
                <button id="cs-cancel-btn" class="cs-toolbar-btn">&#8592;</button>
                <span class="cs-toolbar-title">Editando</span>
                <div class="cs-toolbar-right">
                    <button id="cs-save-btn" class="cs-toolbar-btn cs-save">&#10003;</button>
                </div>
            </div>
            <div class="cs-edit-scroll">
                ${editSection('Básico', `
                    <div class="cs-eg2">
                        <div class="cs-field"><label>Nome</label><input id="cs-e-name" value="${escAttr(s.name)}"></div>
                        <div class="cs-field"><label>Classe</label><input id="cs-e-class" value="${escAttr(s.class)}"></div>
                        <div class="cs-field"><label>Subclasse</label><input id="cs-e-subclass" value="${escAttr(s.subclass)}"></div>
                        <div class="cs-field"><label>Nível</label><input type="number" id="cs-e-level" value="${s.level}" min="1" max="20"></div>
                        <div class="cs-field"><label>Raça</label><input id="cs-e-race" value="${escAttr(s.race)}"></div>
                        <div class="cs-field"><label>Antecedente</label><input id="cs-e-bg" value="${escAttr(s.background)}"></div>
                        <div class="cs-field"><label>Alinhamento</label><input id="cs-e-align" value="${escAttr(s.alignment)}"></div>
                        <div class="cs-field"><label>Imagem (URL)</label><input id="cs-e-image" value="${escAttr(s.image)}"></div>
                    </div>
                `)}
                ${editSection('Atributos', `
                    <div class="cs-eg6">
                        ${ABILITIES.map(ab => `<div class="cs-field cs-fc"><label>${ABILITY_NAMES[ab]}</label><input type="number" id="cs-e-${ab}" value="${s[ab]}" class="cs-ism"></div>`).join('')}
                    </div>
                `)}
                ${editSection('Combate', `
                    <div class="cs-eg2">
                        <div class="cs-field"><label>CA</label><input type="number" id="cs-e-ac" value="${s.armorClass}"></div>
                        <div class="cs-field"><label>Iniciativa</label><input type="number" id="cs-e-init" value="${s.initiative}"></div>
                        <div class="cs-field"><label>Deslocamento</label><input id="cs-e-speed" value="${escAttr(s.speed)}"></div>
                        <div class="cs-field"><label>Prof. Bônus</label><input type="number" id="cs-e-prof" value="${s.proficiencyBonus}"></div>
                        <div class="cs-field"><label>PV Max</label><input type="number" id="cs-e-hpmax" value="${s.hpMax}"></div>
                        <div class="cs-field"><label>PV Atual</label><input type="number" id="cs-e-hpcur" value="${s.hpCurrent}"></div>
                        <div class="cs-field"><label>PV Temp</label><input type="number" id="cs-e-hptmp" value="${s.hpTemp}"></div>
                        <div class="cs-field"><label>Dados de Vida</label><input id="cs-e-hd" value="${escAttr(s.hitDice)}"></div>
                    </div>
                `)}
                ${editSection('Testes de Resistência (valor final)', `
                    <div class="cs-eg6">
                        ${ABILITIES.map(ab => `<div class="cs-field cs-fc"><label>${ABILITY_NAMES[ab]}</label><input type="number" id="cs-e-sv-${ab}" value="${s.saves ? s.saves[ab] || 0 : 0}" class="cs-ism"></div>`).join('')}
                    </div>
                `)}
                ${editSection('Perícias (valor final)', `
                    <div class="cs-skills-edit">
                        ${SKILLS_LIST.map(sk => `<div class="cs-sk-edit"><label>${sk.name}</label><input type="number" id="cs-e-sk-${sk.key}" value="${s.skills && s.skills[sk.key] !== undefined ? s.skills[sk.key] : getMod(s[sk.ability])}" class="cs-ism"></div>`).join('')}
                    </div>
                `)}
                ${editSection('Ataques', renderListEditor('attacks', s.attacks || [], ['name', 'bonus', 'damage', 'desc'], ['Nome', 'Bônus', 'Dano', 'Descrição']))}
                ${editSection('Habilidades - Ação', renderListEditor('abAction', s.abilitiesAction || [], ['name', 'cost', 'range', 'duration', 'desc'], ['Nome', 'Custo', 'Alcance', 'Duração', 'Descrição']))}
                ${editSection('Habilidades - Bônus', renderListEditor('abBonus', s.abilitiesBonus || [], ['name', 'cost', 'range', 'duration', 'desc'], ['Nome', 'Custo', 'Alcance', 'Duração', 'Descrição']))}
                ${editSection('Habilidades - Reação', renderListEditor('abReaction', s.abilitiesReaction || [], ['name', 'cost', 'range', 'duration', 'desc'], ['Nome', 'Custo', 'Alcance', 'Duração', 'Descrição']))}
                ${editSection('Traços de Classe & Passivos', renderListEditor('classFeatures', (s.classFeatures || []).concat(s.abilitiesPassive || []), ['name', 'desc'], ['Nome', 'Descrição']))}
                ${editSection('Poderes Especiais', renderListEditor('special', s.specialMechanics || [], ['name', 'desc'], ['Nome', 'Descrição']))}
                ${editSection('Inventário', renderListEditor('equip', s.equipment || [], ['name', 'bonus', 'damage', 'desc', 'charges'], ['Nome', 'Bônus', 'Dano', 'Descrição', 'Cargas']))}
                ${editSection('Moedas', `
                    <div class="cs-eg5">
                        <div class="cs-field cs-fc"><label>PC</label><input type="number" id="cs-e-cp" value="${(s.currency||{}).cp||0}" class="cs-ism"></div>
                        <div class="cs-field cs-fc"><label>PP</label><input type="number" id="cs-e-sp" value="${(s.currency||{}).sp||0}" class="cs-ism"></div>
                        <div class="cs-field cs-fc"><label>PE</label><input type="number" id="cs-e-ep" value="${(s.currency||{}).ep||0}" class="cs-ism"></div>
                        <div class="cs-field cs-fc"><label>PO</label><input type="number" id="cs-e-gp" value="${(s.currency||{}).gp||0}" class="cs-ism"></div>
                        <div class="cs-field cs-fc"><label>PL</label><input type="number" id="cs-e-pp" value="${(s.currency||{}).pp||0}" class="cs-ism"></div>
                    </div>
                `)}
                ${editSection('Spell Slots', renderSpellSlotsEditor(s))}
                ${editSection('Idiomas & Proficiências', `
                    <div class="cs-field"><label>Idiomas</label><input id="cs-e-langs" value="${escAttr(s.languages)}"></div>
                    <div class="cs-field"><label>Proficiências</label><textarea id="cs-e-proftext" class="cs-ta-sm">${escHtml(s.proficienciesText)}</textarea></div>
                `)}
                ${editSection('Bônus & Mecânicas', renderListEditor('bonus', s.bonusMechanics || [], ['name', 'desc'], ['Nome', 'Descrição']))}
                ${editSection('Roleplay (um por linha)', `<textarea id="cs-e-rp" class="cs-ta">${(s.roleplayNotes || []).join('\n')}</textarea>`)}
                ${editSection('Notas', `<textarea id="cs-e-notes" class="cs-ta">${escHtml(s.notes)}</textarea>`)}
                <div class="cs-edit-section cs-danger-zone"><button id="cs-delete-btn" class="cs-btn cs-btn-danger">Excluir Ficha</button></div>
            </div>
        </div>`;

        document.getElementById('cs-cancel-btn').addEventListener('click', () => { sheetEditMode = false; renderSheetView(); });
        document.getElementById('cs-save-btn').addEventListener('click', handleSave);
        document.getElementById('cs-delete-btn').addEventListener('click', handleDelete);

        // Wire up add-row buttons
        c.querySelectorAll('.cs-add-row-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const listId = btn.dataset.list;
                const fields = btn.dataset.fields.split(',');
                const container = c.querySelector(`.cs-list-editor[data-list="${listId}"]`);
                if (container) container.insertAdjacentHTML('beforeend', buildEditorRow(listId, fields, {}));
            });
        });

        // Wire up remove buttons (delegation)
        c.addEventListener('click', (e) => {
            if (e.target.classList.contains('cs-row-remove')) {
                e.target.closest('.cs-editor-row').remove();
            }
        });
    }

    // ===== LIST EDITOR HELPER =====
    function renderListEditor(listId, items, fields, labels) {
        let html = `<div class="cs-list-editor" data-list="${listId}">`;
        items.forEach(item => { html += buildEditorRow(listId, fields, item, labels); });
        html += '</div>';
        html += `<button class="cs-add-row-btn" data-list="${listId}" data-fields="${fields.join(',')}">+ Adicionar</button>`;
        return html;
    }

    function buildEditorRow(listId, fields, item, labels) {
        let html = '<div class="cs-editor-row">';
        fields.forEach((f, i) => {
            const val = item[f] || '';
            const lbl = labels ? labels[i] : f;
            if (f === 'desc') {
                html += `<div class="cs-field cs-field-full"><label>${lbl}</label><textarea class="cs-ta-sm cs-row-field" data-field="${f}" placeholder="${lbl}...">${escHtml(val)}</textarea></div>`;
            } else {
                html += `<div class="cs-field"><label>${lbl}</label><input class="cs-row-field" data-field="${f}" value="${escAttr(val)}" placeholder="${lbl}..."></div>`;
            }
        });
        html += '<button class="cs-row-remove" title="Remover">&times;</button>';
        html += '</div>';
        return html;
    }

    function renderSpellSlotsEditor(s) {
        const slots = s.spellSlots || {};
        let html = '<div class="cs-slots-editor">';
        for (let lvl = 1; lvl <= 9; lvl++) {
            const sl = slots[lvl] || { max: 0, used: 0 };
            html += `<div class="cs-slot-edit-row">
                <span class="cs-slot-edit-lvl">${lvl}\u00BA</span>
                <div class="cs-field"><label>Max</label><input type="number" class="cs-ism cs-slot-max" data-lvl="${lvl}" value="${sl.max}" min="0" max="9"></div>
                <div class="cs-field"><label>Usados</label><input type="number" class="cs-ism cs-slot-used" data-lvl="${lvl}" value="${sl.used || 0}" min="0" max="9"></div>
            </div>`;
        }
        html += '</div>';
        return html;
    }

    function collectListEditor(container) {
        const rows = container.querySelectorAll('.cs-editor-row');
        const items = [];
        rows.forEach(row => {
            const item = {};
            let hasValue = false;
            row.querySelectorAll('.cs-row-field').forEach(input => {
                const val = (input.tagName === 'TEXTAREA' ? input.value : input.value).trim();
                item[input.dataset.field] = val;
                if (val) hasValue = true;
            });
            if (hasValue) items.push(item);
        });
        return items;
    }

    function editSection(title, content) {
        return `<div class="cs-edit-section"><div class="cs-es-title">${title}</div>${content}</div>`;
    }

    async function handleSave() {
        const s = currentSheet;
        const c = document.getElementById('charsheet-container');

        s.name = document.getElementById('cs-e-name').value.trim();
        s.class = document.getElementById('cs-e-class').value.trim();
        s.subclass = document.getElementById('cs-e-subclass').value.trim();
        s.level = parseInt(document.getElementById('cs-e-level').value) || 1;
        s.race = document.getElementById('cs-e-race').value.trim();
        s.background = document.getElementById('cs-e-bg').value.trim();
        s.alignment = document.getElementById('cs-e-align').value.trim();
        s.image = document.getElementById('cs-e-image').value.trim();

        ABILITIES.forEach(ab => { s[ab] = parseInt(document.getElementById('cs-e-' + ab).value) || 10; });

        s.armorClass = parseInt(document.getElementById('cs-e-ac').value) || 10;
        s.initiative = parseInt(document.getElementById('cs-e-init').value) || 0;
        s.speed = document.getElementById('cs-e-speed').value.trim();
        s.proficiencyBonus = parseInt(document.getElementById('cs-e-prof').value) || 2;
        s.hpMax = parseInt(document.getElementById('cs-e-hpmax').value) || 1;
        s.hpCurrent = parseInt(document.getElementById('cs-e-hpcur').value) || 0;
        s.hpTemp = parseInt(document.getElementById('cs-e-hptmp').value) || 0;
        s.hitDice = document.getElementById('cs-e-hd').value.trim();

        s.saves = {};
        ABILITIES.forEach(ab => { s.saves[ab] = parseInt(document.getElementById('cs-e-sv-' + ab).value) || 0; });

        s.skills = {};
        SKILLS_LIST.forEach(sk => { s.skills[sk.key] = parseInt(document.getElementById('cs-e-sk-' + sk.key).value) || 0; });

        // Collect list editors
        s.attacks = collectListEditor(c.querySelector('.cs-list-editor[data-list="attacks"]'));
        s.abilitiesAction = collectListEditor(c.querySelector('.cs-list-editor[data-list="abAction"]'));
        s.abilitiesBonus = collectListEditor(c.querySelector('.cs-list-editor[data-list="abBonus"]'));
        s.abilitiesReaction = collectListEditor(c.querySelector('.cs-list-editor[data-list="abReaction"]'));
        s.classFeatures = collectListEditor(c.querySelector('.cs-list-editor[data-list="classFeatures"]'));
        s.abilitiesPassive = [];
        s.specialMechanics = collectListEditor(c.querySelector('.cs-list-editor[data-list="special"]'));
        s.equipment = collectListEditor(c.querySelector('.cs-list-editor[data-list="equip"]'));
        s.bonusMechanics = collectListEditor(c.querySelector('.cs-list-editor[data-list="bonus"]'));

        s.currency = { cp: parseInt(document.getElementById('cs-e-cp').value)||0, sp: parseInt(document.getElementById('cs-e-sp').value)||0, ep: parseInt(document.getElementById('cs-e-ep').value)||0, gp: parseInt(document.getElementById('cs-e-gp').value)||0, pp: parseInt(document.getElementById('cs-e-pp').value)||0 };

        // Spell Slots
        s.spellSlots = {};
        c.querySelectorAll('.cs-slot-max').forEach(input => {
            const lvl = input.dataset.lvl;
            const max = parseInt(input.value) || 0;
            const usedInput = c.querySelector('.cs-slot-used[data-lvl="' + lvl + '"]');
            const used = usedInput ? (parseInt(usedInput.value) || 0) : 0;
            if (max > 0) s.spellSlots[lvl] = { max, used };
        });

        s.languages = document.getElementById('cs-e-langs').value.trim();
        s.proficienciesText = document.getElementById('cs-e-proftext').value.trim();
        s.roleplayNotes = document.getElementById('cs-e-rp').value.split('\n').map(l => l.trim()).filter(l => l);
        s.notes = document.getElementById('cs-e-notes').value.trim();

        const btn = document.getElementById('cs-save-btn');
        btn.textContent = '...';
        const ok = await saveSheet(s);
        if (ok) { sheetEditMode = false; renderSheetView(); }
        else { btn.textContent = '!'; setTimeout(() => { btn.textContent = '✓'; }, 1500); }
    }

    async function handleDelete() {
        if (!confirm('Excluir ficha permanentemente?')) return;
        await deleteSheet(currentSheet.id);
        closeCharsheetOverlay();
    }

    // ===== TAB SWITCHING (event delegation) =====
    document.addEventListener('click', function(e) {
        if (!e.target.classList.contains('cs-tab-btn')) return;
        const tabs = e.target.closest('.cs-tabs');
        if (!tabs) return;
        const key = e.target.dataset.tab;
        tabs.querySelectorAll('.cs-tab-btn').forEach(b => b.classList.remove('cs-tab-active'));
        tabs.querySelectorAll('.cs-tab-panel').forEach(p => p.classList.remove('cs-tab-visible'));
        e.target.classList.add('cs-tab-active');
        const panel = tabs.querySelector('.cs-tab-panel[data-tab="' + key + '"]');
        if (panel) panel.classList.add('cs-tab-visible');
    });

    // ===== EXPOSE =====
    window.openCharsheetOverlay = openCharsheetOverlay;
    window.closeCharsheetOverlay = closeCharsheetOverlay;
})();
