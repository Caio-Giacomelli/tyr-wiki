// ===== FICHA D&D 5e — v2 =====
// Visualizacao alternativa da ficha, pensada para tablet e celular durante a sessao.
// Usa os MESMOS dados da ficha original (colecao 'charsheets' no Firestore), entao as
// duas versoes convivem: o que muda numa aparece na outra.
//
// Estrutura:
//   Topo fixo (identidade + descansos + editar)
//   Vitais (PV com dano/cura/temp, CA, iniciativa, deslocamento, prof., inspiracao, magia)
//   Estados de batalha (chips liga/desliga)
//   Lateral: atributos, testes de resistencia, sentidos passivos
//   Abas: Acoes | Magias | Pericias | Inventario | Tracos | Notas | Extras
// O modo edicao reaproveita as mesmas abas (+ "Geral") com formularios.

(function() {
    'use strict';

    const COLLECTION = 'charsheets';
    const REMEMBER_KEY = 'cs2-remember';

    // ===== ESTADO =====
    let S = null;              // ficha carregada
    let editMode = false;
    let editDirty = false;     // houve alteracao no formulario de edicao
    let combatOpen = false;    // painel do modo combate aberto (lembrado no aparelho)
    try { combatOpen = localStorage.getItem('cs2-combat') === '1'; } catch (e) { /* sem storage */ }
    let tab = 'acoes';         // aba ativa (visualizacao)
    let editTab = 'geral';     // aba ativa (edicao)
    let actFilter = 'all';     // filtro da aba Acoes
    let spellQuery = '';       // busca da aba Magias
    const openSet = new Set(); // cards expandidos (preservados entre renders)
    let saveTimer = null;
    let editRegistry = {};     // editores de lista: key -> { schema, orig }
    let regCounter = 0;
    let root = null, overlay = null;

    // ===== CONSTANTES =====
    const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const AB_SHORT = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };
    const AB_FULL = { str: 'Força', dex: 'Destreza', con: 'Constituição', int: 'Inteligência', wis: 'Sabedoria', cha: 'Carisma' };
    const SKILLS = [
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
    const SKILLS_SORTED = SKILLS.slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    const TABS = [
        { k: 'acoes', l: 'Ações', i: '⚔' },
        { k: 'magias', l: 'Magias', i: '✦' },
        { k: 'pericias', l: 'Perícias', i: '◎' },
        { k: 'inventario', l: 'Inventário', i: '⚱' },
        { k: 'tracos', l: 'Traços', i: '❖' },
        { k: 'notas', l: 'Notas', i: '✎' },
        { k: 'extras', l: 'Extras', i: '♞' }
    ];
    const EDIT_TABS = [{ k: 'geral', l: 'Geral', i: '☰' }].concat(TABS);

    const ABILITY_CATS = [
        { key: 'abilitiesAction', cat: 'action', label: 'Ação' },
        { key: 'abilitiesBonus', cat: 'bonus', label: 'Ação Bônus' },
        { key: 'abilitiesReaction', cat: 'reaction', label: 'Reação' }
    ];

    // Campos dos editores de lista (modo edicao)
    const AB_OPTS = ABILITIES.map(ab => [ab, AB_SHORT[ab]]);
    const LIST_FIELDS = {
        attacks: [
            { f: 'name', l: 'Nome' },
            { f: 'damage', l: 'Dano', ph: 'ex: 1d8+4 cortante' },
            { f: 'ability', l: 'Atributo do ataque', type: 'select', opts: [['', 'Bônus manual (texto)']].concat(AB_OPTS) },
            { f: 'useProf', l: 'Soma proficiência', type: 'check' },
            { f: 'atkExtra', l: 'Bônus extra', type: 'int', ph: '0' },
            { f: 'bonus', l: 'Bônus manual', ph: 'ex: +7' },
            { f: 'desc', l: 'Descrição', type: 'textarea', full: true }
        ],
        spell: [
            { f: 'name', l: 'Nome' },
            { f: 'cost', l: 'Custo / Círculo', ph: 'ex: Truque, 1º, 2º' },
            { f: 'usesRoll', l: 'Usa rolagem', type: 'select', opts: [['', 'Nenhuma'], ['dc', 'CD (resistência do alvo)'], ['attack', 'Ataque de magia']] },
            { f: 'saveAbility', l: 'Resistência do alvo', type: 'select', opts: [['', '—']].concat(AB_OPTS) },
            { f: 'castingTime', l: 'Tempo de conjuração', ph: 'ex: 1 ação' },
            { f: 'components', l: 'Componentes', ph: 'V, S, M' },
            { f: 'range', l: 'Alcance', ph: 'ex: 18 m' },
            { f: 'duration', l: 'Duração', ph: 'ex: Instantânea' },
            { f: 'desc', l: 'Descrição', type: 'textarea', full: true },
            { f: 'link', l: 'Link (saber mais)', ph: 'https://...', full: true }
        ],
        named: [
            { f: 'name', l: 'Nome' },
            { f: 'desc', l: 'Descrição', type: 'textarea', full: true }
        ],
        equip: [
            { f: 'name', l: 'Nome' },
            { f: 'bonus', l: 'Bônus', ph: 'ex: +1' },
            { f: 'damage', l: 'Dano', ph: 'ex: 1d6' },
            { f: 'charges', l: 'Cargas', ph: 'ex: 3/3 (vira contador)' },
            { f: 'desc', l: 'Descrição', type: 'textarea', full: true }
        ],
        mods: [
            { f: 'name', l: 'Nome' },
            { f: 'value', l: 'Valor', ph: 'ex: +1d4' },
            { f: 'note', l: 'Observação' }
        ],
        notes: [
            { f: 'name', l: 'Nome' },
            { f: 'note', l: 'Efeito' }
        ]
    };

    // ===== MODELO =====
    function emptySheet() {
        return {
            id: '', password: '',
            name: '', race: '', class: '', subclass: '', level: 1,
            background: '', alignment: '', xp: 0, image: '',
            str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
            armorClass: 10, initiative: 0, speed: '9m',
            hpMax: 10, hpCurrent: 10, hpTemp: 0,
            hitDice: '1d10', hitDiceRemaining: 1,
            proficiencyBonus: 2, profAuto: true,
            saves: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
            saveProficiencies: [],
            skills: {},
            languages: '', proficienciesText: '',
            classFeatures: [], abilitiesAction: [], abilitiesBonus: [], abilitiesReaction: [], abilitiesPassive: [],
            specialMechanics: [], attacks: [], equipment: [],
            currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
            spellSlots: {}, spellcastingAbility: '', spellSaveDC: 0, spellAttackBonus: 0, spellAuto: true,
            personalityTraits: '', ideals: '', bonds: '', flaws: '',
            roleplayNotes: [], contos: [], companions: [], bonusMechanics: [],
            activeModifiers: [], activeAbilities: [], activeDebuffs: [],
            notes: '',
            // Campos novos da v2 (ignorados pela v1, preservados por ela)
            inspiration: 0,
            deathSaves: { s: 0, f: 0 }
        };
    }
    function emptyCompanion() {
        return {
            name: '', type: '', image: '',
            armorClass: 10, hpMax: 10, hpCurrent: 10, speed: '30 ft.',
            str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
            saves: '', skills: '', damageImmunities: '', conditionImmunities: '',
            senses: '', languages: '', proficiencyBonus: 0,
            traits: [], actions: [], reactions: [], notes: ''
        };
    }
    // Completa campos ausentes sem sobrescrever o que ja existe.
    function normalize(s) {
        const base = emptySheet();
        Object.keys(base).forEach(k => { if (s[k] === undefined || s[k] === null) s[k] = base[k]; });
        if (!s.currency || typeof s.currency !== 'object') s.currency = base.currency;
        if (!s.deathSaves || typeof s.deathSaves !== 'object') s.deathSaves = { s: 0, f: 0 };
        if (!s.spellSlots || typeof s.spellSlots !== 'object') s.spellSlots = {};
        ['hpMax', 'hpCurrent', 'hpTemp', 'level', 'armorClass', 'initiative', 'inspiration'].forEach(k => { s[k] = parseInt(s[k]) || 0; });
        if (s.hpMax < 1) s.hpMax = 1;
        if (s.level < 1) s.level = 1;
        const hd = parseHitDice(s);
        if (s.hitDiceRemaining === undefined || s.hitDiceRemaining === null || isNaN(parseInt(s.hitDiceRemaining))) s.hitDiceRemaining = hd.total;
        s.hitDiceRemaining = parseInt(s.hitDiceRemaining);
        (s.companions || []).forEach(c => {
            const b = emptyCompanion();
            Object.keys(b).forEach(k => { if (c[k] === undefined || c[k] === null) c[k] = b[k]; });
        });
        return s;
    }

    // ===== CALCULOS =====
    function getMod(score) { return Math.floor(((parseInt(score) || 10) - 10) / 2); }
    function modStr(v) { v = parseInt(v) || 0; return v >= 0 ? '+' + v : '−' + Math.abs(v); }
    function profBonus(s) {
        if (s.profAuto === false) return parseInt(s.proficiencyBonus) || 2;
        return 2 + Math.floor(((parseInt(s.level) || 1) - 1) / 4);
    }
    function spellAbility(s) { return ABILITIES.includes(s.spellcastingAbility) ? s.spellcastingAbility : ''; }
    function spellDC(s) {
        if (s.spellAuto === false) return parseInt(s.spellSaveDC) || 0;
        const ab = spellAbility(s);
        return ab ? 8 + profBonus(s) + getMod(s[ab]) : (parseInt(s.spellSaveDC) || 0);
    }
    function spellAtk(s) {
        if (s.spellAuto === false) return parseInt(s.spellAttackBonus) || 0;
        const ab = spellAbility(s);
        return ab ? profBonus(s) + getMod(s[ab]) : (parseInt(s.spellAttackBonus) || 0);
    }
    function isCaster(s) {
        return !!spellAbility(s) || !!parseInt(s.spellSaveDC) || !!parseInt(s.spellAttackBonus) || hasSlots(s);
    }
    function hasSlots(s) { return Object.keys(s.spellSlots || {}).some(k => s.spellSlots[k] && s.spellSlots[k].max > 0); }
    function attackBonusText(s, a) {
        if (a.ability && ABILITIES.includes(a.ability)) {
            let t = getMod(s[a.ability]);
            if (a.useProf) t += profBonus(s);
            t += parseInt(a.atkExtra) || 0;
            return modStr(t);
        }
        return a.bonus || '';
    }
    function saveValue(s, ab) {
        if (s.saves && s.saves[ab] !== undefined && s.saves[ab] !== null && s.saves[ab] !== '') return parseInt(s.saves[ab]) || 0;
        return getMod(s[ab]) + ((s.saveProficiencies || []).includes(ab) ? profBonus(s) : 0);
    }
    function saveIsProf(s, ab) {
        if ((s.saveProficiencies || []).includes(ab)) return true;
        return saveValue(s, ab) >= getMod(s[ab]) + profBonus(s);
    }
    function skillValue(s, sk) {
        if (s.skills && s.skills[sk.key] !== undefined && s.skills[sk.key] !== null && s.skills[sk.key] !== '') return parseInt(s.skills[sk.key]) || 0;
        return getMod(s[sk.ability]);
    }
    // 0 = sem prof., 1 = proficiente, 2 = especialista (deduzido do valor final)
    function skillProfLevel(s, sk) {
        const v = skillValue(s, sk), m = getMod(s[sk.ability]), pb = profBonus(s);
        if (v >= m + 2 * pb) return 2;
        if (v >= m + pb) return 1;
        return 0;
    }
    function passive(s, key) {
        const sk = SKILLS.find(x => x.key === key);
        return 10 + skillValue(s, sk);
    }
    function parseHitDice(s) {
        const m = String(s.hitDice || '').match(/(\d+)\s*d\s*(\d+)/i);
        if (m) return { total: parseInt(m[1]) || 1, die: parseInt(m[2]) || 8 };
        const d = String(s.hitDice || '').match(/d\s*(\d+)/i);
        return { total: parseInt(s.level) || 1, die: d ? parseInt(d[1]) : 8 };
    }
    // Circulo da magia a partir do campo livre "cost": Truque = 0, "1º"/"nível 1" = 1...
    function spellLevel(ab) {
        const c = String(ab.cost || '').toLowerCase().trim();
        if (!c) return null;
        if (/truque|cantrip|à vontade|a vontade/.test(c)) return 0;
        let m = c.match(/n[ií]vel\s*(\d)/) || c.match(/(\d)\s*(?:º|°|ª|o\b|nível|nivel|lvl|slot|espa|c[ií]rculo)/) || c.match(/^(\d)$/);
        if (!m) return null;
        const n = parseInt(m[1]);
        return n >= 0 && n <= 9 ? n : null;
    }
    // Cargas "3/5" viram contador; outro texto fica como texto livre.
    function parseCharges(txt) {
        const m = String(txt || '').match(/^\s*(\d+)\s*\/\s*(\d+)\s*(.*)$/);
        return m ? { cur: parseInt(m[1]), max: parseInt(m[2]), rest: m[3] } : null;
    }

    function esc(s) {
        return (s === undefined || s === null) ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function toRoman(num) {
        const v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const r = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
        let out = '';
        for (let i = 0; i < v.length; i++) while (num >= v[i]) { out += r[i]; num -= v[i]; }
        return out;
    }
    function isTouchTablet() {
        return window.matchMedia && window.matchMedia('(max-width: 1366px) and (pointer: coarse)').matches;
    }

    // ===== FIRESTORE =====
    async function saveSheet(sheet) {
        if (typeof db === 'undefined') return false;
        try { await db.collection(COLLECTION).doc(sheet.id).set(sheet); return true; }
        catch (e) { console.error('[Ficha v2] Erro ao salvar:', e); return false; }
    }
    async function loadSheet(id) {
        if (typeof db === 'undefined') return null;
        try { const d = await db.collection(COLLECTION).doc(id).get(); return d.exists ? d.data() : null; }
        catch (e) { return null; }
    }
    async function deleteSheet(id) {
        if (typeof db === 'undefined') return false;
        try { await db.collection(COLLECTION).doc(id).delete(); return true; }
        catch (e) { return false; }
    }
    function hashPassword(pw) {
        let h = 0;
        for (let i = 0; i < pw.length; i++) { h = ((h << 5) - h) + pw.charCodeAt(i); h = h & h; }
        return 'h_' + Math.abs(h).toString(36);
    }
    function getRemembered() {
        try { return JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null'); } catch (e) { return null; }
    }
    function setRemembered(v) {
        try { if (v) localStorage.setItem(REMEMBER_KEY, JSON.stringify(v)); else localStorage.removeItem(REMEMBER_KEY); } catch (e) { /* sem storage */ }
    }

    // Salvamento automatico com atraso: varios toques seguidos (ex.: PV) viram uma gravacao.
    function queueSave() {
        setSaveState('pending');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(doSave, 600);
    }
    async function doSave() {
        clearTimeout(saveTimer); saveTimer = null;
        if (!S) return true;
        setSaveState('saving');
        const ok = await saveSheet(S);
        setSaveState(ok ? 'saved' : 'error');
        return ok;
    }
    async function flushSave() { if (saveTimer) return doSave(); return true; }
    function setSaveState(st) {
        const el = root && root.querySelector('#cs2-save-ind');
        if (!el) return;
        const txt = { pending: '•', saving: 'Salvando…', saved: 'Salvo', error: 'Erro ao salvar' }[st] || '';
        el.textContent = txt;
        el.dataset.state = st;
    }

    // ===== OVERLAY =====
    function ensureOverlay() {
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.id = 'cs2-overlay';
        overlay.innerHTML = '<div id="cs2-root"></div>';
        document.body.appendChild(overlay);
        root = overlay.querySelector('#cs2-root');
        wireRoot();
    }
    async function openOverlay() {
        ensureOverlay();
        overlay.classList.add('open');
        document.body.classList.add('cs2-open');
        if (S) {
            // Recarregar para pegar alteracoes feitas em outro aparelho / na v1.
            renderLoading();
            const fresh = await loadSheet(S.id);
            if (fresh) S = normalize(fresh);
            editMode = false;
            render();
            return;
        }
        const rem = getRemembered();
        if (rem && rem.id) {
            renderLoading();
            const sheet = await loadSheet(rem.id);
            if (sheet && sheet.password === rem.h) {
                S = normalize(sheet);
                render();
                return;
            }
            setRemembered(null);
        }
        renderLogin();
    }
    async function closeOverlay() {
        await flushSave();
        if (overlay) overlay.classList.remove('open');
        document.body.classList.remove('cs2-open');
        closeModal();
    }
    function renderLoading() {
        root.innerHTML = '<div class="cs2-loading"><div class="cs2-spinner"></div><p>Abrindo a ficha…</p></div>';
    }

    // ===== LOGIN =====
    function renderLogin(msg) {
        S = null; editMode = false;
        root.innerHTML = `
        <div class="cs2-login">
            <div class="cs2-login-card">
                <button class="cs2-icon-btn cs2-login-close cs2-desktop-only" data-act="close" aria-label="Fechar">✕</button>
                <div class="cs2-login-emblem">⚔</div>
                <h2>Ficha de Personagem</h2>
                <p class="cs2-login-sub">D&amp;D 5e · versão 2</p>
                <label for="cs2-l-id">ID da ficha</label>
                <input id="cs2-l-id" autocomplete="username" autocapitalize="none" placeholder="ex: stor, elandor...">
                <label for="cs2-l-pw">Senha</label>
                <input id="cs2-l-pw" type="password" autocomplete="current-password" placeholder="Senha...">
                <label class="cs2-check"><input type="checkbox" id="cs2-l-rem" checked> Manter conectado neste aparelho</label>
                <div class="cs2-login-actions">
                    <button class="cs2-btn cs2-btn-primary" data-act="login">Entrar</button>
                    <button class="cs2-btn" data-act="create">Criar nova</button>
                </div>
                <p class="cs2-login-err" id="cs2-l-err">${esc(msg || '')}</p>
            </div>
        </div>`;
        const pw = root.querySelector('#cs2-l-pw');
        pw.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
    }
    function loginFields() {
        const id = root.querySelector('#cs2-l-id').value.trim().toLowerCase().replace(/\s+/g, '-');
        const pw = root.querySelector('#cs2-l-pw').value;
        const rem = root.querySelector('#cs2-l-rem').checked;
        const err = root.querySelector('#cs2-l-err');
        return { id, pw, rem, err };
    }
    async function handleLogin() {
        const { id, pw, rem, err } = loginFields();
        if (!id || !pw) { err.textContent = 'Preencha ID e senha.'; return; }
        err.textContent = 'Carregando…';
        const sheet = await loadSheet(id);
        if (!sheet) { err.textContent = 'Ficha não encontrada.'; return; }
        if (sheet.password !== hashPassword(pw)) { err.textContent = 'Senha incorreta.'; return; }
        S = normalize(sheet);
        setRemembered(rem ? { id: S.id, h: S.password } : null);
        editMode = false; tab = 'acoes';
        render();
    }
    async function handleCreate() {
        const { id, pw, rem, err } = loginFields();
        if (!id || !pw) { err.textContent = 'Preencha ID e senha.'; return; }
        if (pw.length < 3) { err.textContent = 'A senha precisa de pelo menos 3 caracteres.'; return; }
        err.textContent = 'Verificando…';
        if (await loadSheet(id)) { err.textContent = 'Já existe uma ficha com esse ID.'; return; }
        const sheet = emptySheet();
        sheet.id = id; sheet.password = hashPassword(pw);
        sheet.name = id.charAt(0).toUpperCase() + id.slice(1);
        if (!await saveSheet(sheet)) { err.textContent = 'Erro ao criar a ficha.'; return; }
        S = normalize(sheet);
        setRemembered(rem ? { id: S.id, h: S.password } : null);
        enterEdit();
    }

    // ===== RENDER PRINCIPAL =====
    function render() {
        if (!S) { renderLogin(); return; }
        const scroller = overlay;
        const scrollTop = scroller ? scroller.scrollTop : 0;
        editRegistry = {}; regCounter = 0;
        root.innerHTML = editMode ? renderEdit() : renderView();
        if (scroller) scroller.scrollTop = scrollTop;
        if (!editMode) applySpellFilter();
    }

    function renderView() {
        return `<div class="cs2" data-mode="view">
            ${renderTop()}
            <div class="cs2-scroll">
                ${renderStrip()}
                ${combatOpen ? renderCombat() : ''}
                <div class="cs2-body">
                    ${renderSide()}
                    <main class="cs2-main">
                        <nav class="cs2-tabs" role="tablist">${TABS.map(t => tabBtn(t, tab)).join('')}</nav>
                        <div class="cs2-panels">
                            ${panel('acoes', renderActions())}
                            ${panel('magias', renderSpells())}
                            ${panel('pericias', renderSkills())}
                            ${panel('inventario', renderInventory())}
                            ${panel('tracos', renderTraits())}
                            ${panel('notas', renderNotes())}
                            ${panel('extras', renderExtras())}
                        </div>
                    </main>
                </div>
            </div>
        </div>`;
    }
    function tabBtn(t, active) {
        let count = '';
        if (!editMode) {
            const n = tabCount(t.k);
            if (n) count = `<span class="cs2-tab-n">${n}</span>`;
        }
        return `<button class="cs2-tab${t.k === active ? ' active' : ''}" role="tab" data-tab="${t.k}"><span class="cs2-tab-i">${t.i}</span><span class="cs2-tab-l">${t.l}</span>${count}</button>`;
    }
    function tabCount(k) {
        if (k === 'extras') return (S.companions || []).length;
        return 0;
    }
    function panel(k, html) {
        const active = (editMode ? editTab : tab) === k;
        return `<section class="cs2-panel${active ? ' active' : ''}" data-panel="${k}" role="tabpanel">${html}</section>`;
    }

    // ----- Topo -----
    function portraitHtml(img, name, cls) {
        return img
            ? `<img class="${cls}" src="${esc(img)}" alt="">`
            : `<div class="${cls} cs2-portrait-empty">${esc((name || '?').charAt(0).toUpperCase())}</div>`;
    }
    function renderTop() {
        const s = S;
        const cls = [s.class, s.subclass ? '(' + s.subclass + ')' : ''].filter(Boolean).join(' ');
        const meta = [s.race, cls, 'Nível ' + s.level].filter(Boolean).map(esc).join(' · ');
        const meta2 = [s.background, s.alignment, s.xp ? Number(s.xp).toLocaleString('pt-BR') + ' XP' : ''].filter(Boolean).map(esc).join(' · ');
        const actions = editMode
            ? `<button class="cs2-btn" data-act="edit-cancel">Cancelar</button>
               <button class="cs2-btn cs2-btn-primary" data-act="edit-save">✓ Salvar</button>`
            : `<button class="cs2-btn cs2-btn-combat${combatOpen ? ' on' : ''}" data-act="combat" title="Modo combate" aria-pressed="${combatOpen}"><span class="cs2-bi">⚔</span><span class="cs2-bl">Combate</span></button>
               <button class="cs2-btn" data-act="rest" title="Descansar"><span class="cs2-bi">☾</span><span class="cs2-bl">Descansar</span></button>
               <button class="cs2-btn" data-act="edit" title="Editar ficha"><span class="cs2-bi">✎</span><span class="cs2-bl">Editar</span></button>
               <button class="cs2-icon-btn" data-act="menu" title="Mais opções" aria-label="Mais opções">⋮</button>
               <button class="cs2-icon-btn cs2-desktop-only" data-act="close" title="Fechar" aria-label="Fechar">✕</button>`;
        return `<header class="cs2-top">
            <div class="cs2-id">
                ${portraitHtml(s.image, s.name, 'cs2-portrait')}
                <div class="cs2-id-text">
                    <div class="cs2-name">${esc(editMode ? 'Editando: ' + s.name : s.name)}</div>
                    <div class="cs2-meta">${meta}</div>
                    ${meta2 ? `<div class="cs2-meta2">${meta2}</div>` : ''}
                </div>
            </div>
            <div class="cs2-top-actions">
                <span class="cs2-save-ind" id="cs2-save-ind"></span>
                ${actions}
            </div>
        </header>`;
    }

    // ----- Faixa de resumo (sempre visivel) -----
    function hpState(s) {
        const pct = Math.round(s.hpCurrent / s.hpMax * 100);
        return s.hpCurrent <= 0 ? 'down' : pct <= 25 ? 'crit' : pct <= 50 ? 'low' : 'ok';
    }
    function hpBar(s, cls) {
        const pct = Math.max(0, Math.min(100, Math.round(s.hpCurrent / s.hpMax * 100)));
        const tmpPct = Math.max(0, Math.min(100 - pct, Math.round((s.hpTemp || 0) / s.hpMax * 100)));
        return `<div class="cs2-hp-bar${cls ? ' ' + cls : ''}"><i style="width:${pct}%"></i><b style="width:${tmpPct}%"></b></div>`;
    }
    function renderStrip() {
        const s = S;
        const cells = [
            `<div class="cs2-st cs2-st-hp" data-state="${hpState(s)}">
                <span class="cs2-st-l">Vida</span>
                <span class="cs2-st-v">${s.hpCurrent}<small>/${s.hpMax}</small>${s.hpTemp > 0 ? `<em>+${s.hpTemp}</em>` : ''}</span>
                ${hpBar(s, 'small')}
            </div>`,
            stripCell('CA', s.armorClass, 'cs2-st-ac'),
            stripCell('Iniciativa', modStr(s.initiative)),
            stripCell('Deslocamento', esc(s.speed || '—'), 'cs2-st-speed'),
            stripCell('Proficiência', modStr(profBonus(s))),
            stripCell('Inspiração', s.inspiration > 0 ? '★' + (s.inspiration > 1 ? '<small>×' + s.inspiration + '</small>' : '') : '<span class="cs2-st-none">—</span>', s.inspiration > 0 ? 'cs2-st-insp on' : 'cs2-st-insp')
        ];
        if (isCaster(s)) cells.push(stripCell('Magia <small>CD · Atq</small>', `${spellDC(s) || '—'}<span class="cs2-st-dot">·</span>${modStr(spellAtk(s))}`, 'cs2-st-magic'));
        // Efeitos ligados aparecem discretos mesmo com o modo combate fechado
        const active = [].concat(
            (s.activeModifiers || []).filter(x => x.active).map(x => esc(x.name) + (x.value ? ' ' + esc(x.value) : '')),
            (s.activeAbilities || []).filter(x => x.active).map(x => esc(x.name)),
            (s.activeDebuffs || []).filter(x => x.active).map(x => '<span class="deb">' + esc(x.name) + '</span>')
        );
        return `<section class="cs2-strip">${cells.join('')}</section>
            ${!combatOpen && (active.length || s.hpCurrent <= 0) ? `<div class="cs2-active-line">
                ${s.hpCurrent <= 0 ? '<span class="deb">Caído — abra o modo combate para os testes contra a morte</span>' : ''}
                ${active.length ? '<span class="cs2-active-l">Em efeito:</span> ' + active.join('<span class="cs2-st-dot">·</span>') : ''}
            </div>` : ''}`;
    }
    function tile(label, value, title, kind) {
        return `<div class="cs2-tile${kind ? ' cs2-tile-' + kind : ''}"${title ? ` title="${esc(title)}"` : ''}>
            <span class="cs2-tile-l">${label}</span><span class="cs2-tile-v">${value}</span>
        </div>`;
    }
    function stripCell(label, value, cls) {
        return `<div class="cs2-st${cls ? ' ' + cls : ''}"><span class="cs2-st-l">${label}</span><span class="cs2-st-v">${value}</span></div>`;
    }

    // ----- Modo combate (escondido atras do botao do topo) -----
    function renderCombat() {
        const s = S;
        const hd = parseHitDice(s);
        const ds = s.deathSaves || { s: 0, f: 0 };
        const deathHtml = s.hpCurrent <= 0 ? `
            <div class="cs2-death">
                <div class="cs2-death-row"><span>Sucessos</span>${[0, 1, 2].map(i => `<button class="cs2-death-pip ok${i < ds.s ? ' on' : ''}" data-act="death" data-kind="s" data-i="${i}" aria-label="Sucesso ${i + 1}"></button>`).join('')}</div>
                <div class="cs2-death-row"><span>Falhas</span>${[0, 1, 2].map(i => `<button class="cs2-death-pip fail${i < ds.f ? ' on' : ''}" data-act="death" data-kind="f" data-i="${i}" aria-label="Falha ${i + 1}"></button>`).join('')}</div>
                ${ds.s >= 3 ? '<div class="cs2-death-msg ok">Estabilizado</div>' : ds.f >= 3 ? '<div class="cs2-death-msg fail">Morto</div>' : '<div class="cs2-death-msg">Testes contra a morte</div>'}
            </div>` : '';
        const slots = slotRows(s);
        return `<section class="cs2-combat">
            <div class="cs2-combat-h">
                <h2>⚔ Modo Combate</h2>
                <button class="cs2-btn cs2-btn-sm" data-act="combat">Recolher</button>
            </div>
            <div class="cs2-combat-grid">
                <div class="cs2-hp" data-state="${hpState(s)}">
                    <div class="cs2-hp-head">
                        <span class="cs2-hp-title">Pontos de Vida</span>
                        <span class="cs2-hd" title="Dados de vida restantes">Dados de vida ${s.hitDiceRemaining}/${hd.total} · d${hd.die}</span>
                    </div>
                    <div class="cs2-hp-main">
                        <button class="cs2-hp-step" data-act="hp" data-v="-1" aria-label="Perder 1 PV">−</button>
                        <div class="cs2-hp-nums">
                            <span class="cs2-hp-cur">${s.hpCurrent}</span><span class="cs2-hp-sep">/</span><span class="cs2-hp-max">${s.hpMax}</span>
                            ${s.hpTemp > 0 ? `<span class="cs2-hp-tmp">+${s.hpTemp} temporários</span>` : ''}
                        </div>
                        <button class="cs2-hp-step" data-act="hp" data-v="1" aria-label="Recuperar 1 PV">+</button>
                    </div>
                    ${hpBar(s)}
                    <div class="cs2-hp-input">
                        <button class="cs2-hp-btn dmg" data-act="dmg">Dano</button>
                        <input type="number" inputmode="numeric" min="0" id="cs2-hp-amt" placeholder="0" aria-label="Quantidade">
                        <button class="cs2-hp-btn heal" data-act="heal">Curar</button>
                        <button class="cs2-hp-btn tmp" data-act="temp" title="Definir PV temporários">Temp.</button>
                    </div>
                    ${deathHtml}
                </div>
                <div class="cs2-combat-side">
                    <div class="cs2-combat-row">
                        <span class="cs2-combat-l">Inspiração heroica</span>
                        <div class="cs2-insp">
                            <button class="cs2-mini" data-act="insp" data-v="-1" aria-label="Menos inspiração">−</button>
                            <span class="cs2-insp-v${s.inspiration > 0 ? ' on' : ''}">${s.inspiration > 0 ? '★' + (s.inspiration > 1 ? ' ×' + s.inspiration : '') : '☆'}</span>
                            <button class="cs2-mini" data-act="insp" data-v="1" aria-label="Mais inspiração">+</button>
                        </div>
                    </div>
                    ${slots ? `<div class="cs2-combat-block"><div class="cs2-combat-l">Espaços de magia <small>toque para gastar / recuperar</small></div>${slots}</div>` : ''}
                    ${renderStates()}
                </div>
            </div>
        </section>`;
    }
    function slotRows(s) {
        if (!hasSlots(s)) return '';
        let html = '';
        for (let l = 1; l <= 9; l++) {
            const sl = s.spellSlots[l];
            if (!sl || !sl.max) continue;
            const used = Math.min(sl.used || 0, sl.max);
            const rem = sl.max - used;
            html += `<div class="cs2-slot-row">
                <span class="cs2-slot-l">${l}º</span>
                <div class="cs2-pips">${Array.from({ length: sl.max }, (_, i) => `<button class="cs2-pip${i < rem ? ' on' : ''}" data-act="slot" data-lvl="${l}" data-i="${i}" aria-label="Espaço ${l}º ${i + 1}"></button>`).join('')}</div>
                <span class="cs2-slot-c">${rem}/${sl.max}</span>
            </div>`;
        }
        return html;
    }

    // ----- Estados de batalha -----
    function renderStates() {
        const groups = [
            { key: 'mod', arr: S.activeModifiers || [], label: 'Modificadores', cls: 'mod' },
            { key: 'abl', arr: S.activeAbilities || [], label: 'Habilidades', cls: 'abl' },
            { key: 'deb', arr: S.activeDebuffs || [], label: 'Condições', cls: 'deb' }
        ].filter(g => g.arr.length);
        if (!groups.length) return '';
        return `<section class="cs2-states"><div class="cs2-combat-l">Estados de batalha <small>toque para ligar / desligar</small></div>
            ${groups.map(g => `<div class="cs2-states-g">
                <span class="cs2-states-l">${g.label}</span>
                <div class="cs2-chips">${g.arr.map((it, i) => `<button class="cs2-chip ${g.cls}${it.active ? ' on' : ''}" data-act="state" data-g="${g.key}" data-i="${i}" aria-pressed="${it.active ? 'true' : 'false'}">
                    <span class="cs2-chip-n">${esc(it.name)}${it.value ? ` <b>${esc(it.value)}</b>` : ''}</span>
                    ${it.note ? `<span class="cs2-chip-note">${esc(it.note)}</span>` : ''}
                </button>`).join('')}</div>
            </div>`).join('')}
        </section>`;
    }

    // ----- Lateral -----
    function renderSide() {
        const s = S;
        return `<aside class="cs2-side">
            <div class="cs2-abils">
                ${ABILITIES.map(ab => `<div class="cs2-abil" title="${AB_FULL[ab]}">
                    <span class="cs2-abil-l">${AB_SHORT[ab]}</span>
                    <span class="cs2-abil-m">${modStr(getMod(s[ab]))}</span>
                    <span class="cs2-abil-s">${parseInt(s[ab]) || 10}</span>
                </div>`).join('')}
            </div>
            <div class="cs2-card">
                <div class="cs2-card-t">Testes de Resistência</div>
                <div class="cs2-saves">
                    ${ABILITIES.map(ab => `<div class="cs2-save${saveIsProf(s, ab) ? ' prof' : ''}">
                        <i class="cs2-dot"></i><span class="cs2-save-l">${AB_SHORT[ab]}</span><span class="cs2-save-v">${modStr(saveValue(s, ab))}</span>
                    </div>`).join('')}
                </div>
            </div>
            <div class="cs2-card">
                <div class="cs2-card-t">Sentidos Passivos</div>
                <div class="cs2-passives">
                    <div class="cs2-passive"><b>${passive(s, 'perception')}</b><span>Percepção</span></div>
                    <div class="cs2-passive"><b>${passive(s, 'investigation')}</b><span>Investigação</span></div>
                    <div class="cs2-passive"><b>${passive(s, 'insight')}</b><span>Intuição</span></div>
                </div>
            </div>
        </aside>`;
    }

    // ----- Aba: Acoes -----
    function renderActions() {
        const s = S;
        const atks = s.attacks || [];
        const cats = ABILITY_CATS.map(c => ({ ...c, items: s[c.key] || [] }));
        const any = atks.length || cats.some(c => c.items.length);
        if (!any) return emptyState('Nenhum ataque ou habilidade cadastrado.', 'Toque em Editar → Ações para adicionar.');
        const filters = [['all', 'Todos'], ['attack', 'Ataques', atks.length]].concat(cats.map(c => [c.cat, c.label, c.items.length]))
            .filter(f => f[0] === 'all' || f[2]);
        let html = `<div class="cs2-filters" data-filters>${filters.map(f => `<button class="cs2-filter${actFilter === f[0] ? ' active' : ''}" data-filter="${f[0]}">${f[1]}${f[2] ? ` <small>${f[2]}</small>` : ''}</button>`).join('')}</div>`;
        html += `<div class="cs2-act-list" data-active-filter="${actFilter}">`;
        if (atks.length) {
            html += `<div class="cs2-sec" data-cat="attack"><h3 class="cs2-sec-t">Ataques</h3>
                <div class="cs2-atk-head"><span>Ataque</span><span>Acerto</span><span>Dano</span></div>
                ${atks.map((a, i) => attackRow(a, i)).join('')}</div>`;
        }
        cats.forEach(c => {
            if (!c.items.length) return;
            html += `<div class="cs2-sec" data-cat="${c.cat}"><h3 class="cs2-sec-t">${c.label}</h3>
                ${c.items.map((ab, i) => abilityCard(ab, 'ab-' + c.cat + '-' + i)).join('')}</div>`;
        });
        html += '</div>';
        return html;
    }
    function attackRow(a, i) {
        const id = 'atk-' + i;
        const bonus = attackBonusText(S, a);
        const open = openSet.has(id);
        return `<div class="cs2-atk${open ? ' open' : ''}${a.desc ? ' has-more' : ''}" data-id="${id}">
            <div class="cs2-atk-main"${a.desc ? ' data-toggle' : ''}>
                <div class="cs2-atk-name">${esc(a.name || 'Ataque')}${a.desc ? `<small>${esc(firstLine(a.desc))}</small>` : ''}</div>
                <div class="cs2-pill hit">${esc(bonus || '—')}</div>
                <div class="cs2-pill dmg">${esc(a.damage || '—')}</div>
            </div>
            ${a.desc ? `<div class="cs2-more"><div class="cs2-desc">${esc(a.desc)}</div></div>` : ''}
        </div>`;
    }
    function firstLine(t) {
        const l = String(t || '').split('\n')[0];
        return l.length > 70 ? l.slice(0, 68) + '…' : l;
    }
    function abilityCard(ab, id) {
        const open = openSet.has(id);
        const lvl = spellLevel(ab);
        let roll = '';
        if (ab.usesRoll === 'dc') {
            const sv = ABILITIES.includes(ab.saveAbility) ? AB_SHORT[ab.saveAbility] + ' ' : '';
            roll = `<span class="cs2-badge roll">${sv}CD ${spellDC(S) || '—'}</span>`;
        } else if (ab.usesRoll === 'attack') {
            roll = `<span class="cs2-badge roll">${modStr(spellAtk(S))} atq</span>`;
        }
        const cost = ab.cost ? `<span class="cs2-badge cost">${esc(ab.cost)}</span>` : '';
        const meta = [['Conjuração', ab.castingTime], ['Alcance', ab.range], ['Componentes', ab.components], ['Duração', ab.duration]]
            .filter(m => m[1]).map(m => `<div><span>${m[0]}</span><b>${esc(m[1])}</b></div>`).join('');
        return `<div class="cs2-ab${open ? ' open' : ''}" data-id="${id}" data-name="${esc(String(ab.name || '').toLowerCase())}">
            <button class="cs2-ab-head" data-toggle>
                <span class="cs2-ab-name">${esc(ab.name || 'Sem nome')}</span>
                <span class="cs2-ab-badges">${roll}${cost}</span>
                <span class="cs2-chev">▸</span>
            </button>
            <div class="cs2-more">
                ${meta ? `<div class="cs2-ab-meta">${meta}</div>` : ''}
                ${ab.desc ? `<div class="cs2-desc">${esc(ab.desc)}</div>` : ''}
                ${lvl ? castButtons(lvl) : ''}
                ${ab.link ? `<a class="cs2-link" href="${esc(ab.link)}" target="_blank" rel="noopener">Saber mais ↗</a>` : ''}
            </div>
        </div>`;
    }
    // Botoes para gastar um espaco de magia do circulo da magia (ou maior, se quiser elevar).
    function castButtons(lvl) {
        const slots = S.spellSlots || {};
        const opts = [];
        for (let l = lvl; l <= 9; l++) {
            const sl = slots[l];
            if (!sl || !sl.max) continue;
            const rem = sl.max - (sl.used || 0);
            opts.push(`<button class="cs2-cast" data-act="cast" data-lvl="${l}"${rem <= 0 ? ' disabled' : ''}>${l}º <small>${rem}/${sl.max}</small></button>`);
        }
        if (!opts.length) return '';
        return `<div class="cs2-cast-row"><span>Gastar espaço:</span>${opts.join('')}</div>`;
    }
    function emptyState(title, hint) {
        return `<div class="cs2-empty"><p>${esc(title)}</p>${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
    }

    // ----- Aba: Magias -----
    function renderSpells() {
        const s = S;
        let html = '';
        if (isCaster(s)) {
            const ab = spellAbility(s);
            html += `<div class="cs2-spell-head">
                <div><b>${ab ? AB_SHORT[ab] : '—'}</b><span>Atributo</span></div>
                <div><b>${ab ? modStr(getMod(s[ab])) : '—'}</b><span>Modificador</span></div>
                <div><b>${modStr(spellAtk(s))}</b><span>Ataque</span></div>
                <div><b>${spellDC(s) || '—'}</b><span>CD</span></div>
            </div>`;
        }
        if (hasSlots(s)) {
            html += `<div class="cs2-card cs2-slots"><div class="cs2-card-t">Espaços de Magia <small>toque para gastar / recuperar</small></div>${slotRows(s)}</div>`;
        }
        // Magias = habilidades com circulo (campo Custo) ou que usam CD/ataque.
        const groups = {};
        ABILITY_CATS.forEach(c => (s[c.key] || []).forEach((ab, i) => {
            const lvl = spellLevel(ab);
            if (lvl === null && !ab.usesRoll) return;
            const g = lvl === null ? 'x' : lvl;
            (groups[g] = groups[g] || []).push({ ab, id: 'sp-' + c.cat + '-' + i, cat: c.label });
        }));
        const keys = Object.keys(groups).sort((a, b) => (a === 'x' ? 99 : +a) - (b === 'x' ? 99 : +b));
        if (!keys.length) {
            html += emptyState('Nenhuma magia identificada.', 'Preencha o campo "Custo / Círculo" (ex: Truque, 1º) ou "Usa rolagem" nas habilidades para listá-las aqui.');
            return html;
        }
        html += `<div class="cs2-search"><input type="search" id="cs2-spell-q" placeholder="Buscar magia…" value="${esc(spellQuery)}" aria-label="Buscar magia"></div>`;
        keys.forEach(k => {
            const label = k === 'x' ? 'Outras' : k === '0' ? 'Truques' : k + 'º Círculo';
            const sl = k !== 'x' && k !== '0' ? (s.spellSlots || {})[k] : null;
            const slotInfo = sl && sl.max ? `<small>${sl.max - (sl.used || 0)}/${sl.max} espaços</small>` : '';
            html += `<div class="cs2-sec cs2-spell-sec"><h3 class="cs2-sec-t">${label} ${slotInfo}</h3>
                ${groups[k].map(x => abilityCard(x.ab, x.id).replace('<span class="cs2-ab-badges">', `<span class="cs2-ab-badges"><span class="cs2-badge cat">${esc(x.cat)}</span>`)).join('')}
            </div>`;
        });
        return html;
    }
    function applySpellFilter() {
        const q = spellQuery.trim().toLowerCase();
        root.querySelectorAll('.cs2-spell-sec').forEach(sec => {
            let vis = 0;
            sec.querySelectorAll('.cs2-ab').forEach(card => {
                const show = !q || (card.dataset.name || '').includes(q);
                card.style.display = show ? '' : 'none';
                if (show) vis++;
            });
            sec.style.display = vis ? '' : 'none';
        });
    }

    // ----- Aba: Pericias -----
    function renderSkills() {
        const s = S;
        let html = `<div class="cs2-skills">
            ${SKILLS_SORTED.map(sk => {
                const lv = skillProfLevel(s, sk);
                return `<div class="cs2-skill${lv === 1 ? ' prof' : lv === 2 ? ' exp' : ''}">
                    <i class="cs2-dot"></i><span class="cs2-skill-ab">${AB_SHORT[sk.ability]}</span>
                    <span class="cs2-skill-n">${sk.name}</span><span class="cs2-skill-v">${modStr(skillValue(s, sk))}</span>
                </div>`;
            }).join('')}
        </div>
        <div class="cs2-legend"><span><i class="cs2-dot prof"></i>Proficiente</span><span><i class="cs2-dot exp"></i>Especialista</span></div>`;
        if (s.languages || s.proficienciesText) {
            html += `<div class="cs2-card">
                ${s.languages ? `<div class="cs2-kv"><span>Idiomas</span><p>${esc(s.languages)}</p></div>` : ''}
                ${s.proficienciesText ? `<div class="cs2-kv"><span>Proficiências</span><p>${esc(s.proficienciesText)}</p></div>` : ''}
            </div>`;
        }
        return html;
    }

    // ----- Aba: Inventario -----
    function renderInventory() {
        const s = S;
        const cur = s.currency || {};
        const coins = [['pp', 'PL', 'Platina'], ['gp', 'PO', 'Ouro'], ['ep', 'PE', 'Electro'], ['sp', 'PP', 'Prata'], ['cp', 'PC', 'Cobre']];
        let html = `<div class="cs2-coins">${coins.map(c => `<label class="cs2-coin ${c[0]}" title="${c[2]}">
            <span class="cs2-coin-i">${c[1]}</span>
            <input type="number" inputmode="numeric" min="0" data-coin="${c[0]}" value="${parseInt(cur[c[0]]) || 0}" aria-label="${c[2]}">
        </label>`).join('')}</div>`;
        const items = s.equipment || [];
        if (!items.length) return html + emptyState('Inventário vazio.', 'Toque em Editar → Inventário para adicionar itens.');
        html += `<div class="cs2-inv">${items.map((it, i) => {
            const id = 'inv-' + i;
            const ch = parseCharges(it.charges);
            const open = openSet.has(id);
            const charges = ch
                ? `<div class="cs2-charges">
                        <button class="cs2-mini" data-act="charge" data-i="${i}" data-v="-1" aria-label="Gastar carga">−</button>
                        <span class="cs2-charge-pips">${ch.max <= 10 ? Array.from({ length: ch.max }, (_, k) => `<i class="${k < ch.cur ? 'on' : ''}"></i>`).join('') : ''}<b>${ch.cur}/${ch.max}</b></span>
                        <button class="cs2-mini" data-act="charge" data-i="${i}" data-v="1" aria-label="Recuperar carga">+</button>
                        ${ch.rest ? `<small>${esc(ch.rest)}</small>` : ''}
                   </div>`
                : (it.charges ? `<span class="cs2-badge cost">${esc(it.charges)}</span>` : '');
            return `<div class="cs2-item${open ? ' open' : ''}" data-id="${id}">
                <div class="cs2-item-head"${it.desc ? ' data-toggle' : ''}>
                    <span class="cs2-item-n">${esc(it.name || 'Item')}</span>
                    <span class="cs2-ab-badges">${it.bonus ? `<span class="cs2-badge hit">${esc(it.bonus)}</span>` : ''}${it.damage ? `<span class="cs2-badge dmg">${esc(it.damage)}</span>` : ''}</span>
                    ${it.desc ? '<span class="cs2-chev">▸</span>' : ''}
                </div>
                ${charges}
                ${it.desc ? `<div class="cs2-more"><div class="cs2-desc">${esc(it.desc)}</div></div>` : ''}
            </div>`;
        }).join('')}</div>`;
        return html;
    }

    // ----- Aba: Tracos -----
    function renderTraits() {
        const s = S;
        const lists = [
            { t: 'Traços de Classe & Passivos', items: (s.classFeatures || []).concat(s.abilitiesPassive || []), k: 'cf' },
            { t: 'Poderes Especiais', items: s.specialMechanics || [], k: 'sp', cls: 'special' },
            { t: 'Bônus & Mecânicas', items: s.bonusMechanics || [], k: 'bm' }
        ].filter(l => l.items.length);
        if (!lists.length) return emptyState('Nenhum traço cadastrado.', 'Toque em Editar → Traços para adicionar.');
        return lists.map(l => `<div class="cs2-sec"><h3 class="cs2-sec-t">${l.t}</h3>
            ${l.items.map((f, i) => featCard(f, 'ft-' + l.k + '-' + i, l.cls)).join('')}
        </div>`).join('');
    }
    function featCard(f, id, cls) {
        const open = openSet.has(id);
        return `<div class="cs2-feat${open ? ' open' : ''}${cls ? ' ' + cls : ''}" data-id="${id}" data-toggle>
            <div class="cs2-feat-n">${esc(f.name || 'Sem nome')}<span class="cs2-chev">▸</span></div>
            ${f.desc ? `<div class="cs2-feat-d">${esc(f.desc)}</div>` : ''}
        </div>`;
    }

    // ----- Aba: Notas -----
    function renderNotes() {
        const s = S;
        const persona = [['Traços de Personalidade', s.personalityTraits], ['Ideais', s.ideals], ['Vínculos', s.bonds], ['Defeitos', s.flaws]].filter(p => p[1]);
        const contos = s.contos || [];
        return `<div class="cs2-card">
            <div class="cs2-card-t">Anotações da sessão <small>salvam sozinhas</small></div>
            <textarea class="cs2-notes" id="cs2-notes-live" placeholder="Anote nomes, pistas, combinados…">${esc(s.notes)}</textarea>
        </div>
        ${persona.length ? `<div class="cs2-card">${persona.map(p => `<div class="cs2-kv"><span>${p[0]}</span><p>${esc(p[1])}</p></div>`).join('')}</div>` : ''}
        <div class="cs2-sec">
            <h3 class="cs2-sec-t">Contos <small>${contos.length}</small><button class="cs2-btn cs2-btn-sm" data-act="conto-new">+ Novo conto</button></h3>
            ${contos.length ? `<div class="cs2-contos">${contos.map((c, i) => `<button class="cs2-conto" data-act="conto-read" data-i="${i}">
                <span class="cs2-conto-num">${toRoman(i + 1)}</span>
                <span class="cs2-conto-t">${esc(c.title || 'Sem título')}</span>
                <span class="cs2-conto-d">${esc(c.date || '')}</span>
            </button>`).join('')}</div>` : emptyState('Nenhum conto escrito ainda.', 'Escreva contos sobre seu personagem para ganhar inspiração heroica.')}
        </div>`;
    }

    // ----- Aba: Extras (companheiros) -----
    function renderExtras() {
        const comps = S.companions || [];
        if (!comps.length) return emptyState('Nenhuma ficha extra.', 'Companheiros, montarias e invocações: toque em Editar → Extras para adicionar.');
        return comps.map((c, ci) => {
            const pct = Math.max(0, Math.min(100, Math.round((c.hpCurrent || 0) / (c.hpMax || 1) * 100)));
            const info = [['Saves', c.saves], ['Perícias', c.skills], ['Imunidade a dano', c.damageImmunities], ['Imunidade a condição', c.conditionImmunities], ['Sentidos', c.senses], ['Idiomas', c.languages]].filter(x => x[1]);
            const lists = [['Traços', c.traits], ['Ações', c.actions], ['Reações', c.reactions]].filter(x => x[1] && x[1].length);
            return `<div class="cs2-comp">
                <div class="cs2-comp-head">
                    ${portraitHtml(c.image, c.name, 'cs2-comp-img')}
                    <div><div class="cs2-comp-n">${esc(c.name || 'Ficha extra')}</div><div class="cs2-meta">${esc(c.type)}</div></div>
                </div>
                <div class="cs2-comp-vitals">
                    <div class="cs2-comp-hp">
                        <span class="cs2-tile-l">PV</span>
                        <div class="cs2-comp-hp-row">
                            <button class="cs2-mini" data-act="comp-hp" data-c="${ci}" data-v="-5">−5</button>
                            <button class="cs2-mini" data-act="comp-hp" data-c="${ci}" data-v="-1">−</button>
                            <b>${c.hpCurrent}<small>/${c.hpMax}</small></b>
                            <button class="cs2-mini" data-act="comp-hp" data-c="${ci}" data-v="1">+</button>
                            <button class="cs2-mini" data-act="comp-hp" data-c="${ci}" data-v="5">+5</button>
                        </div>
                        <div class="cs2-hp-bar small"><i style="width:${pct}%"></i></div>
                    </div>
                    ${tile('CA', c.armorClass, '', 'shield')}
                    ${tile('Desloc.', esc(c.speed || '—'), '', 'speed')}
                    ${c.proficiencyBonus ? tile('Prof.', modStr(c.proficiencyBonus), '', '') : ''}
                </div>
                <div class="cs2-abils mini">${ABILITIES.map(ab => `<div class="cs2-abil"><span class="cs2-abil-l">${AB_SHORT[ab]}</span><span class="cs2-abil-m">${modStr(getMod(c[ab]))}</span><span class="cs2-abil-s">${parseInt(c[ab]) || 10}</span></div>`).join('')}</div>
                ${info.length ? `<div class="cs2-comp-info">${info.map(x => `<div><span>${x[0]}</span>${esc(x[1])}</div>`).join('')}</div>` : ''}
                ${lists.map(([t, arr]) => `<div class="cs2-sec"><h3 class="cs2-sec-t">${t}</h3>${arr.map((f, i) => featCard(f, 'cp-' + ci + '-' + t + '-' + i)).join('')}</div>`).join('')}
                ${c.notes ? `<div class="cs2-kv"><span>Notas</span><p>${esc(c.notes)}</p></div>` : ''}
            </div>`;
        }).join('');
    }

    // ===== MODO EDICAO =====
    function enterEdit() {
        flushSave();
        editMode = true;
        editDirty = false;
        editTab = 'geral';
        overlay.scrollTop = 0;
        render();
    }

    function renderEdit() {
        return `<div class="cs2" data-mode="edit">
            ${renderTop()}
            <div class="cs2-scroll">
                <main class="cs2-main cs2-main-edit">
                    <nav class="cs2-tabs" role="tablist">${EDIT_TABS.map(t => tabBtn(t, editTab)).join('')}</nav>
                    <div class="cs2-panels">
                        ${panel('geral', editGeneral())}
                        ${panel('acoes', editActions())}
                        ${panel('magias', editSpells())}
                        ${panel('pericias', editSkills())}
                        ${panel('inventario', editInventory())}
                        ${panel('tracos', editTraits())}
                        ${panel('notas', editNotes())}
                        ${panel('extras', editExtras())}
                    </div>
                </main>
                <div class="cs2-edit-foot">
                    <button class="cs2-btn" data-act="edit-cancel">Cancelar</button>
                    <button class="cs2-btn cs2-btn-primary" data-act="edit-save">✓ Salvar ficha</button>
                </div>
            </div>
        </div>`;
    }

    // Helpers de formulario. `ka` = atributo da chave (data-k na ficha, data-ck nos companheiros).
    function fld(label, inner, cls) { return `<div class="cs2-f${cls ? ' ' + cls : ''}"><label>${label}</label>${inner}</div>`; }
    function inp(k, val, t, extra, ka) {
        ka = ka || 'data-k';
        const num = t === 'int';
        return `<input ${ka}="${k}" data-t="${t || 'str'}" value="${esc(val)}"${num ? ' type="number" inputmode="numeric"' : ''}${extra ? ' ' + extra : ''}>`;
    }
    function txt(k, val, rows, ka, ph) {
        return `<textarea ${ka || 'data-k'}="${k}" data-t="str" rows="${rows || 4}"${ph ? ` placeholder="${esc(ph)}"` : ''}>${esc(val)}</textarea>`;
    }
    function sel(k, val, opts, ka) {
        return `<select ${ka || 'data-k'}="${k}" data-t="str">${opts.map(o => `<option value="${o[0]}"${String(val) === String(o[0]) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
    }
    function chk(k, val, label, ka) {
        return `<label class="cs2-check"><input type="checkbox" ${ka || 'data-k'}="${k}" data-t="bool"${val ? ' checked' : ''}> ${label}</label>`;
    }
    function box(title, content, hint) {
        return `<div class="cs2-ebox"><div class="cs2-ebox-t">${title}</div>${hint ? `<p class="cs2-hint">${hint}</p>` : ''}${content}</div>`;
    }
    function imgUpload(hiddenAttr, val) {
        return `<div class="cs2-imgup">
            ${val ? `<img class="cs2-imgup-prev" src="${esc(val)}" alt="">` : '<div class="cs2-imgup-prev cs2-portrait-empty">?</div>'}
            <label class="cs2-btn cs2-btn-sm">Escolher imagem<input type="file" accept="image/*" data-img hidden></label>
            ${val ? '<button type="button" class="cs2-btn cs2-btn-sm" data-act="img-clear">Remover</button>' : ''}
            <input type="hidden" ${hiddenAttr} data-t="str" value="${esc(val)}">
        </div>`;
    }

    function editGeneral() {
        const s = S;
        const hd = parseHitDice(s);
        return box('Identidade', `<div class="cs2-grid">
                ${fld('Nome', inp('name', s.name))}
                ${fld('Raça', inp('race', s.race))}
                ${fld('Classe', inp('class', s.class))}
                ${fld('Subclasse', inp('subclass', s.subclass))}
                ${fld('Nível', inp('level', s.level, 'int', 'min="1" max="20" data-recalc'))}
                ${fld('XP', inp('xp', s.xp, 'int', 'min="0"'))}
                ${fld('Antecedente', inp('background', s.background))}
                ${fld('Alinhamento', inp('alignment', s.alignment))}
                ${fld('Retrato', imgUpload('data-k="image"', s.image), 'full')}
            </div>`)
            + box('Combate', `<div class="cs2-grid">
                ${fld('Classe de Armadura', inp('armorClass', s.armorClass, 'int'))}
                ${fld('Iniciativa', inp('initiative', s.initiative, 'int'))}
                ${fld('Deslocamento', inp('speed', s.speed))}
                ${fld('PV máximo', inp('hpMax', s.hpMax, 'int', 'min="1"'))}
                ${fld('PV atual', inp('hpCurrent', s.hpCurrent, 'int', 'min="0"'))}
                ${fld('PV temporário', inp('hpTemp', s.hpTemp, 'int', 'min="0"'))}
                ${fld('Dados de vida', inp('hitDice', s.hitDice, 'str', 'placeholder="ex: 5d8"'))}
                ${fld('Dados de vida restantes', inp('hitDiceRemaining', s.hitDiceRemaining, 'int', 'min="0" max="' + hd.total + '"'))}
            </div>`)
            + box('Proficiência', `<div class="cs2-grid">
                ${fld('', chk('profAuto', s.profAuto !== false, 'Calcular pelo nível'), 'full')}
                ${fld('Bônus de proficiência (manual)', inp('proficiencyBonus', s.proficiencyBonus, 'int', 'data-recalc'))}
            </div>`)
            + box('Atributos', `<div class="cs2-grid six">
                ${ABILITIES.map(ab => fld(AB_FULL[ab], inp(ab, s[ab], 'int', 'min="1" max="30" data-recalc class="cs2-big"'), 'center')).join('')}
            </div>`)
            + box('Testes de Resistência', `<div class="cs2-grid six">
                ${ABILITIES.map(ab => fld(AB_SHORT[ab], `
                    <label class="cs2-check small"><input type="checkbox" data-saveprof="${ab}"${saveIsProf(s, ab) ? ' checked' : ''}> Prof.</label>
                    ${inp('saves.' + ab, saveValue(s, ab), 'int', 'class="cs2-big"')}`, 'center')).join('')}
            </div>`, 'Marcar "Prof." preenche o valor com modificador + proficiência. Você pode ajustar o número à mão.')
            + `<div class="cs2-ebox cs2-danger"><div class="cs2-ebox-t">Zona de perigo</div><button class="cs2-btn cs2-btn-danger" data-act="delete-sheet">Excluir ficha permanentemente</button></div>`;
    }

    function editActions() {
        const s = S;
        return box('Ataques', listEditor('attacks', 'attacks', s.attacks || [], 'Adicionar ataque'),
                'Escolha um atributo para o acerto ser calculado sozinho (atributo + proficiência + extra). Sem atributo, vale o "Bônus manual".')
            + ABILITY_CATS.map(c => box('Habilidades — ' + c.label, listEditor(c.key, 'spell', s[c.key] || [], 'Adicionar'),
                c.cat === 'action' ? 'Magias com "Custo / Círculo" (Truque, 1º…) aparecem também na aba Magias, com botão para gastar o espaço.' : '')).join('')
            + box('Estados de batalha — Modificadores', listEditor('activeModifiers', 'mods', s.activeModifiers || [], 'Adicionar'), 'Aparecem como botões liga/desliga no topo da ficha (ex: Abençoado +1d4).')
            + box('Estados de batalha — Habilidades', listEditor('activeAbilities', 'notes', s.activeAbilities || [], 'Adicionar'))
            + box('Estados de batalha — Condições', listEditor('activeDebuffs', 'notes', s.activeDebuffs || [], 'Adicionar'));
    }

    function editSpells() {
        const s = S;
        let slots = '<div class="cs2-slot-edit">';
        for (let l = 1; l <= 9; l++) {
            const sl = (s.spellSlots || {})[l] || { max: 0, used: 0 };
            slots += `<div class="cs2-slot-edit-row"><b>${l}º</b>
                ${fld('Total', `<input type="number" inputmode="numeric" min="0" max="9" data-slot-max="${l}" value="${parseInt(sl.max) || 0}">`)}
                ${fld('Usados', `<input type="number" inputmode="numeric" min="0" max="9" data-slot-used="${l}" value="${parseInt(sl.used) || 0}">`)}
            </div>`;
        }
        slots += '</div>';
        return box('Conjuração', `<div class="cs2-grid">
                ${fld('Atributo de conjuração', sel('spellcastingAbility', spellAbility(s), [['', '— nenhum —']].concat(ABILITIES.map(ab => [ab, AB_FULL[ab]]))))}
                ${fld('', chk('spellAuto', s.spellAuto !== false, 'CD e ataque automáticos'), 'full')}
                ${fld('CD de magia (manual)', inp('spellSaveDC', s.spellSaveDC, 'int'))}
                ${fld('Ataque de magia (manual)', inp('spellAttackBonus', s.spellAttackBonus, 'int'))}
            </div>`)
            + box('Espaços de magia', slots)
            + `<p class="cs2-hint center">As magias em si ficam na aba <b>Ações</b> (Ação / Ação Bônus / Reação).</p>`;
    }

    function editSkills() {
        const s = S;
        return box('Perícias', `<div class="cs2-skill-edit">
                ${SKILLS_SORTED.map(sk => {
                    const lv = skillProfLevel(s, sk);
                    return `<div class="cs2-skill-edit-row">
                        <span class="cs2-skill-ab">${AB_SHORT[sk.ability]}</span>
                        <span class="cs2-skill-n">${sk.name}</span>
                        <select data-skillprof="${sk.key}" data-ab="${sk.ability}" aria-label="Proficiência em ${sk.name}">
                            <option value="0"${lv === 0 ? ' selected' : ''}>—</option>
                            <option value="1"${lv === 1 ? ' selected' : ''}>Prof.</option>
                            <option value="2"${lv === 2 ? ' selected' : ''}>Espec.</option>
                        </select>
                        ${inp('skills.' + sk.key, skillValue(s, sk), 'int', 'aria-label="Valor de ' + sk.name + '"')}
                    </div>`;
                }).join('')}
            </div>`, 'Escolher Prof./Espec. recalcula o valor (modificador + proficiência). O número final pode ser ajustado à mão.')
            + box('Idiomas & Proficiências', `<div class="cs2-grid">
                ${fld('Idiomas', inp('languages', s.languages), 'full')}
                ${fld('Proficiências (armas, armaduras, ferramentas)', txt('proficienciesText', s.proficienciesText, 3), 'full')}
            </div>`);
    }

    function editInventory() {
        const s = S, c = s.currency || {};
        return box('Moedas', `<div class="cs2-grid five">
                ${[['pp', 'PL'], ['gp', 'PO'], ['ep', 'PE'], ['sp', 'PP'], ['cp', 'PC']].map(x => fld(x[1], inp('currency.' + x[0], parseInt(c[x[0]]) || 0, 'int', 'min="0"'), 'center')).join('')}
            </div>`)
            + box('Itens', listEditor('equipment', 'equip', s.equipment || [], 'Adicionar item'), 'Cargas no formato "3/5" viram um contador com − e + na ficha.');
    }

    function editTraits() {
        const s = S;
        return box('Traços de Classe & Passivos', listEditor('classFeatures', 'named', (s.classFeatures || []).concat(s.abilitiesPassive || []), 'Adicionar traço'))
            + box('Poderes Especiais', listEditor('specialMechanics', 'named', s.specialMechanics || [], 'Adicionar poder'))
            + box('Bônus & Mecânicas', listEditor('bonusMechanics', 'named', s.bonusMechanics || [], 'Adicionar'));
    }

    function editNotes() {
        const s = S;
        return box('Notas', txt('notes', s.notes, 8))
            + box('Personalidade', `<div class="cs2-grid">
                ${fld('Traços de personalidade', txt('personalityTraits', s.personalityTraits, 3), 'full')}
                ${fld('Ideais', txt('ideals', s.ideals, 2), 'full')}
                ${fld('Vínculos', txt('bonds', s.bonds, 2), 'full')}
                ${fld('Defeitos', txt('flaws', s.flaws, 2), 'full')}
            </div>`)
            + `<p class="cs2-hint center">Os contos são escritos e editados direto na aba Notas, fora do modo edição.</p>`;
    }

    function editExtras() {
        const comps = S.companions || [];
        editRegistry.__comps = comps.map(c => JSON.parse(JSON.stringify(c)));
        return `<div class="cs2-comp-edits">${comps.map((c, i) => compEditBlock(c, i)).join('')}</div>
            <button class="cs2-add big" data-act="comp-add">+ Nova ficha extra</button>`;
    }
    function compEditBlock(c, origIdx) {
        const K = 'data-ck';
        return `<div class="cs2-ebox cs2-comp-edit" data-orig="${origIdx}">
            <div class="cs2-ebox-t">${esc(c.name || 'Nova ficha extra')}<button class="cs2-icon-btn danger" data-act="comp-remove" title="Remover ficha extra" aria-label="Remover ficha extra">✕</button></div>
            <div class="cs2-grid">
                ${fld('Nome', inp('name', c.name, 'str', '', K))}
                ${fld('Tipo', inp('type', c.type, 'str', 'placeholder="ex: Construto médio"', K))}
                ${fld('Retrato', imgUpload(K + '="image"', c.image), 'full')}
                ${fld('CA', inp('armorClass', c.armorClass, 'int', '', K))}
                ${fld('PV máximo', inp('hpMax', c.hpMax, 'int', 'min="1"', K))}
                ${fld('PV atual', inp('hpCurrent', c.hpCurrent, 'int', 'min="0"', K))}
                ${fld('Deslocamento', inp('speed', c.speed, 'str', '', K))}
                ${fld('Bônus de prof.', inp('proficiencyBonus', c.proficiencyBonus, 'int', '', K))}
            </div>
            <div class="cs2-grid six">${ABILITIES.map(ab => fld(AB_SHORT[ab], inp(ab, c[ab], 'int', 'class="cs2-big"', K), 'center')).join('')}</div>
            <div class="cs2-grid">
                ${fld('Saves', inp('saves', c.saves, 'str', '', K))}
                ${fld('Perícias', inp('skills', c.skills, 'str', '', K))}
                ${fld('Imunidade a dano', inp('damageImmunities', c.damageImmunities, 'str', '', K))}
                ${fld('Imunidade a condição', inp('conditionImmunities', c.conditionImmunities, 'str', '', K))}
                ${fld('Sentidos', inp('senses', c.senses, 'str', '', K))}
                ${fld('Idiomas', inp('languages', c.languages, 'str', '', K))}
            </div>
            <div class="cs2-sub-t">Traços</div>${listEditor('traits', 'named', c.traits || [], 'Adicionar traço')}
            <div class="cs2-sub-t">Ações</div>${listEditor('actions', 'named', c.actions || [], 'Adicionar ação')}
            <div class="cs2-sub-t">Reações</div>${listEditor('reactions', 'named', c.reactions || [], 'Adicionar reação')}
            ${fld('Notas', txt('notes', c.notes, 3, K), 'full')}
        </div>`;
    }

    // ----- Editor de listas generico -----
    function listEditor(target, schema, items, addLabel) {
        const key = 'L' + (++regCounter);
        editRegistry[key] = { schema, orig: items.map(x => Object.assign({}, x)) };
        return `<div class="cs2-list" data-list="${key}" data-target="${target}">
            ${items.map((it, i) => listRow(schema, it, i, false)).join('')}
        </div>
        <button class="cs2-add" data-add="${key}">+ ${esc(addLabel || 'Adicionar')}</button>`;
    }
    function listRow(schema, it, origIdx, open) {
        const fields = LIST_FIELDS[schema];
        return `<div class="cs2-row${open ? ' open' : ''}" data-orig="${origIdx === null ? '' : origIdx}">
            <div class="cs2-row-head">
                <button type="button" class="cs2-row-title" data-act="row-toggle"><span class="cs2-chev">▸</span><span class="cs2-row-name">${esc(it.name || 'Novo')}</span></button>
                <button type="button" class="cs2-icon-btn sm" data-act="row-up" title="Mover para cima" aria-label="Mover para cima">↑</button>
                <button type="button" class="cs2-icon-btn sm" data-act="row-down" title="Mover para baixo" aria-label="Mover para baixo">↓</button>
                <button type="button" class="cs2-icon-btn sm danger" data-act="row-remove" title="Remover" aria-label="Remover">✕</button>
            </div>
            <div class="cs2-row-body"><div class="cs2-grid">
                ${fields.map(fd => {
                    const v = it[fd.f];
                    let inner;
                    if (fd.type === 'textarea') inner = `<textarea data-f="${fd.f}" rows="4" placeholder="${esc(fd.ph || '')}">${esc(v)}</textarea>`;
                    else if (fd.type === 'select') inner = `<select data-f="${fd.f}">${fd.opts.map(o => `<option value="${o[0]}"${String(v || '') === String(o[0]) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
                    else if (fd.type === 'check') return fld('', `<label class="cs2-check"><input type="checkbox" data-f="${fd.f}"${v ? ' checked' : ''}> ${fd.l}</label>`);
                    else if (fd.type === 'int') inner = `<input type="number" inputmode="numeric" data-f="${fd.f}" value="${v === undefined || v === null || v === '' ? '' : esc(v)}" placeholder="${esc(fd.ph || '')}">`;
                    else inner = `<input data-f="${fd.f}" value="${esc(v)}" placeholder="${esc(fd.ph || '')}">`;
                    return fld(fd.l, inner, fd.full ? 'full' : '');
                }).join('')}
            </div></div>
        </div>`;
    }
    function collectList(container) {
        const reg = editRegistry[container.dataset.list];
        if (!reg) return [];
        const fields = LIST_FIELDS[reg.schema];
        const out = [];
        Array.from(container.children).forEach(row => {
            if (!row.classList.contains('cs2-row')) return;
            const o = row.dataset.orig !== '' && reg.orig[+row.dataset.orig] ? Object.assign({}, reg.orig[+row.dataset.orig]) : {};
            let has = false;
            fields.forEach(fd => {
                const el = row.querySelector('[data-f="' + fd.f + '"]');
                if (!el) return;
                if (fd.type === 'check') { o[fd.f] = el.checked; return; }
                const v = el.value.trim();
                if (fd.type === 'int') o[fd.f] = v ? (parseInt(v) || 0) : 0;
                else o[fd.f] = v;
                if (v) has = true;
            });
            if (has) out.push(o);
        });
        return out;
    }

    // ----- Coleta e gravacao da edicao -----
    function readVal(el) {
        const t = el.dataset.t;
        if (t === 'bool') return el.checked;
        if (t === 'int') { const v = el.value.trim(); return v === '' ? null : (parseInt(v) || 0); }
        return el.value.trim();
    }
    function setPath(obj, path, val) {
        const parts = path.split('.');
        let o = obj;
        for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
        o[parts[parts.length - 1]] = val;
    }
    function collectEdit() {
        const s = JSON.parse(JSON.stringify(S)); // trabalha numa copia: cancelar nao deixa rastro
        root.querySelectorAll('[data-k]').forEach(el => {
            let v = readVal(el);
            if (v === null) v = 0;
            setPath(s, el.dataset.k, v);
        });
        ABILITIES.forEach(ab => { s[ab] = Math.max(1, parseInt(s[ab]) || 10); });
        s.level = Math.min(20, Math.max(1, parseInt(s.level) || 1));
        s.hpMax = Math.max(1, parseInt(s.hpMax) || 1);
        s.hpCurrent = Math.max(0, Math.min(s.hpMax, parseInt(s.hpCurrent) || 0));
        s.saveProficiencies = Array.from(root.querySelectorAll('[data-saveprof]')).filter(c => c.checked).map(c => c.dataset.saveprof);

        root.querySelectorAll('.cs2-list').forEach(list => {
            if (list.closest('.cs2-comp-edit')) return;
            s[list.dataset.target] = collectList(list);
        });
        s.abilitiesPassive = []; // unificados em classFeatures (igual a v1)

        s.spellSlots = {};
        root.querySelectorAll('[data-slot-max]').forEach(inpEl => {
            const l = inpEl.dataset.slotMax;
            const max = Math.max(0, parseInt(inpEl.value) || 0);
            const usedEl = root.querySelector('[data-slot-used="' + l + '"]');
            const used = Math.max(0, Math.min(max, parseInt(usedEl && usedEl.value) || 0));
            if (max > 0) s.spellSlots[l] = { max, used };
        });

        const origComps = editRegistry.__comps || [];
        s.companions = Array.from(root.querySelectorAll('.cs2-comp-edit')).map(block => {
            const c = block.dataset.orig !== '' && origComps[+block.dataset.orig] ? JSON.parse(JSON.stringify(origComps[+block.dataset.orig])) : emptyCompanion();
            block.querySelectorAll('[data-ck]').forEach(el => {
                let v = readVal(el);
                if (v === null) v = 0;
                c[el.dataset.ck] = v;
            });
            block.querySelectorAll('.cs2-list').forEach(list => { c[list.dataset.target] = collectList(list); });
            ABILITIES.forEach(ab => { c[ab] = parseInt(c[ab]) || 10; });
            c.hpMax = Math.max(1, parseInt(c.hpMax) || 1);
            c.hpCurrent = Math.max(0, Math.min(c.hpMax, parseInt(c.hpCurrent) || 0));
            if (!c.name) c.name = 'Ficha extra';
            return c;
        });
        const hd = parseHitDice(s);
        s.hitDiceRemaining = Math.max(0, Math.min(hd.total, parseInt(s.hitDiceRemaining) || 0));
        return normalize(s);
    }
    async function saveEdit(btn) {
        const s = collectEdit();
        root.querySelectorAll('[data-act="edit-save"]').forEach(b => { b.disabled = true; b.textContent = 'Salvando…'; });
        const ok = await saveSheet(s);
        if (!ok) {
            root.querySelectorAll('[data-act="edit-save"]').forEach(b => { b.disabled = false; b.textContent = '✓ Salvar'; });
            alert('Não foi possível salvar. Verifique a conexão e tente de novo.');
            return;
        }
        S = s;
        editMode = false;
        overlay.scrollTop = 0;
        render();
        setSaveState('saved');
    }
    // PB atual segundo os campos do formulario (para recalcular saves/pericias).
    function editPB() {
        const lvlEl = root.querySelector('[data-k="level"]');
        const autoEl = root.querySelector('[data-k="profAuto"]');
        const manEl = root.querySelector('[data-k="proficiencyBonus"]');
        if (autoEl && !autoEl.checked) return parseInt(manEl && manEl.value) || 2;
        return 2 + Math.floor(((parseInt(lvlEl && lvlEl.value) || S.level) - 1) / 4);
    }
    function editScore(ab) {
        const el = root.querySelector('[data-k="' + ab + '"]');
        return parseInt(el && el.value) || S[ab];
    }

    // ===== ACOES DA SESSAO =====
    function applyHP(delta) {
        const s = S;
        if (delta < 0) {
            let dmg = -delta;
            if (s.hpTemp > 0) { const a = Math.min(s.hpTemp, dmg); s.hpTemp -= a; dmg -= a; }
            s.hpCurrent = Math.max(0, s.hpCurrent - dmg);
        } else if (delta > 0) {
            if (s.hpCurrent <= 0) s.deathSaves = { s: 0, f: 0 };
            s.hpCurrent = Math.min(s.hpMax, s.hpCurrent + delta);
        }
        queueSave(); render();
    }
    function amount() {
        const el = root.querySelector('#cs2-hp-amt');
        const v = Math.max(0, parseInt(el && el.value) || 0);
        if (!v && el) { el.focus(); el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); }
        return v;
    }

    function handleAction(act, el) {
        const s = S;
        switch (act) {
            case 'close': closeOverlay(); break;
            case 'login': handleLogin(); break;
            case 'create': handleCreate(); break;
            case 'edit': enterEdit(); break;
            case 'edit-cancel':
                if (!editDirty || confirm('Descartar as alterações?')) { editMode = false; render(); }
                break;
            case 'edit-save': saveEdit(el); break;
            case 'menu': openMenu(); break;
            case 'hp': applyHP(parseInt(el.dataset.v)); break;
            case 'dmg': { const v = amount(); if (v) applyHP(-v); break; }
            case 'heal': { const v = amount(); if (v) applyHP(v); break; }
            case 'temp': {
                const elA = root.querySelector('#cs2-hp-amt');
                s.hpTemp = Math.max(0, parseInt(elA && elA.value) || 0);
                queueSave(); render(); break;
            }
            case 'death': {
                const k = el.dataset.kind, i = parseInt(el.dataset.i);
                s.deathSaves = s.deathSaves || { s: 0, f: 0 };
                s.deathSaves[k] = s.deathSaves[k] === i + 1 ? i : i + 1;
                queueSave(); render(); break;
            }
            case 'insp':
                s.inspiration = Math.max(0, (parseInt(s.inspiration) || 0) + parseInt(el.dataset.v));
                queueSave(); render(); break;
            case 'state': {
                const arr = { mod: s.activeModifiers, abl: s.activeAbilities, deb: s.activeDebuffs }[el.dataset.g] || [];
                const it = arr[parseInt(el.dataset.i)];
                if (it) { it.active = !it.active; queueSave(); render(); }
                break;
            }
            case 'slot': {
                const sl = s.spellSlots[el.dataset.lvl];
                if (!sl) break;
                const rem = sl.max - (sl.used || 0);
                if (parseInt(el.dataset.i) < rem) sl.used = Math.min(sl.max, (sl.used || 0) + 1);
                else sl.used = Math.max(0, (sl.used || 0) - 1);
                queueSave(); render(); break;
            }
            case 'cast': {
                const sl = s.spellSlots[el.dataset.lvl];
                if (sl && (sl.used || 0) < sl.max) { sl.used = (sl.used || 0) + 1; queueSave(); render(); toast('Espaço de ' + el.dataset.lvl + 'º gasto'); }
                break;
            }
            case 'charge': {
                const it = (s.equipment || [])[parseInt(el.dataset.i)];
                const ch = it && parseCharges(it.charges);
                if (!ch) break;
                ch.cur = Math.max(0, Math.min(ch.max, ch.cur + parseInt(el.dataset.v)));
                it.charges = ch.cur + '/' + ch.max + (ch.rest ? ' ' + ch.rest : '');
                queueSave(); render(); break;
            }
            case 'comp-hp': {
                const c = (s.companions || [])[parseInt(el.dataset.c)];
                if (!c) break;
                c.hpCurrent = Math.max(0, Math.min(c.hpMax, (parseInt(c.hpCurrent) || 0) + parseInt(el.dataset.v)));
                queueSave(); render(); break;
            }
            case 'combat':
                combatOpen = !combatOpen;
                try { localStorage.setItem('cs2-combat', combatOpen ? '1' : '0'); } catch (e) { /* sem storage */ }
                render();
                if (combatOpen) overlay.scrollTo({ top: 0, behavior: 'smooth' });
                break;
            case 'rest': openRestChooser(); break;
            case 'short-rest': openShortRest(); break;
            case 'long-rest': openLongRest(); break;
            case 'conto-new': openContoEditor(-1); break;
            case 'conto-read': openContoReader(parseInt(el.dataset.i)); break;
            case 'delete-sheet': handleDelete(); break;
            // ----- edicao -----
            case 'row-toggle': el.closest('.cs2-row').classList.toggle('open'); break;
        }
        if (/^(row-up|row-down|row-remove|comp-add|comp-remove|img-clear)$/.test(act)) editDirty = true;
        switch (act) {
            case 'row-up': { const r = el.closest('.cs2-row'); if (r.previousElementSibling) r.parentNode.insertBefore(r, r.previousElementSibling); break; }
            case 'row-down': { const r = el.closest('.cs2-row'); if (r.nextElementSibling) r.parentNode.insertBefore(r.nextElementSibling, r); break; }
            case 'row-remove': {
                const r = el.closest('.cs2-row');
                const name = r.querySelector('.cs2-row-name').textContent;
                if (confirm('Remover "' + name + '"?')) r.remove();
                break;
            }
            case 'comp-add': {
                const wrap = root.querySelector('.cs2-comp-edits');
                const c = emptyCompanion(); c.name = 'Nova ficha extra';
                wrap.insertAdjacentHTML('beforeend', compEditBlock(c, ''));
                wrap.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
                break;
            }
            case 'comp-remove':
                if (confirm('Remover esta ficha extra? (só é apagada ao salvar)')) el.closest('.cs2-comp-edit').remove();
                break;
            case 'img-clear': {
                const up = el.closest('.cs2-imgup');
                up.querySelector('input[type="hidden"]').value = '';
                const prev = up.querySelector('.cs2-imgup-prev');
                prev.outerHTML = '<div class="cs2-imgup-prev cs2-portrait-empty">?</div>';
                el.remove();
                break;
            }
        }
    }

    function wireRoot() {
        root.addEventListener('click', e => {
            const actEl = e.target.closest('[data-act]');
            if (actEl && root.contains(actEl)) {
                if (actEl.disabled) return;
                e.preventDefault();
                handleAction(actEl.dataset.act, actEl);
                return;
            }
            const addEl = e.target.closest('[data-add]');
            if (addEl) {
                const key = addEl.dataset.add;
                const list = root.querySelector('.cs2-list[data-list="' + key + '"]');
                const reg = editRegistry[key];
                if (list && reg) {
                    list.insertAdjacentHTML('beforeend', listRow(reg.schema, {}, null, true));
                    editDirty = true;
                    const first = list.lastElementChild.querySelector('input, textarea');
                    if (first) first.focus();
                }
                return;
            }
            const tabEl = e.target.closest('[data-tab]');
            if (tabEl) {
                const k = tabEl.dataset.tab;
                if (editMode) editTab = k; else tab = k;
                root.querySelectorAll('.cs2-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === k));
                root.querySelectorAll('.cs2-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === k));
                tabEl.scrollIntoView({ block: 'nearest', inline: 'center' });
                // Levar a barra de abas para o topo se ela estiver longe (conteudo da aba fora da tela)
                // ou se ja estivermos rolados abaixo do inicio da aba.
                const bar = root.querySelector('.cs2-tabs');
                const top = root.querySelector('.cs2-top');
                const main = root.querySelector('.cs2-main');
                if (bar && main) {
                    const topH = top ? top.offsetHeight : 0;
                    const mainTop = main.getBoundingClientRect().top;
                    if (mainTop > overlay.clientHeight * 0.4 || mainTop < topH) {
                        overlay.scrollTo({ top: overlay.scrollTop + mainTop - topH - 4, behavior: 'smooth' });
                    }
                }
                return;
            }
            const filterEl = e.target.closest('[data-filter]');
            if (filterEl) {
                actFilter = filterEl.dataset.filter;
                root.querySelectorAll('.cs2-filter').forEach(b => b.classList.toggle('active', b === filterEl));
                const list = root.querySelector('.cs2-act-list');
                if (list) list.dataset.activeFilter = actFilter;
                return;
            }
            const tog = e.target.closest('[data-toggle]');
            if (tog) {
                if (e.target.closest('a')) return;
                const card = tog.closest('[data-id]');
                if (!card) return;
                card.classList.toggle('open');
                if (card.classList.contains('open')) openSet.add(card.dataset.id); else openSet.delete(card.dataset.id);
            }
        });

        root.addEventListener('input', e => {
            const t = e.target;
            if (editMode) editDirty = true;
            if (t.id === 'cs2-spell-q') { spellQuery = t.value; applySpellFilter(); return; }
            if (t.id === 'cs2-notes-live') { S.notes = t.value; queueSave(); return; }
            if (t.matches('[data-f="name"]')) {
                const row = t.closest('.cs2-row');
                if (row) row.querySelector('.cs2-row-name').textContent = t.value || 'Novo';
            }
            if (t.matches('[data-ck="name"]')) {
                const b = t.closest('.cs2-comp-edit');
                if (b) b.querySelector('.cs2-ebox-t').firstChild.textContent = t.value || 'Ficha extra';
            }
        });

        root.addEventListener('change', async e => {
            const t = e.target;
            if (editMode) editDirty = true;
            if (t.matches('[data-coin]')) {
                S.currency = S.currency || {};
                S.currency[t.dataset.coin] = Math.max(0, parseInt(t.value) || 0);
                t.value = S.currency[t.dataset.coin];
                queueSave();
                return;
            }
            if (t.matches('[data-saveprof]')) {
                const ab = t.dataset.saveprof;
                const v = root.querySelector('[data-k="saves.' + ab + '"]');
                if (v) v.value = getMod(editScore(ab)) + (t.checked ? editPB() : 0);
                return;
            }
            if (t.matches('[data-skillprof]')) {
                const v = root.querySelector('[data-k="skills.' + t.dataset.skillprof + '"]');
                if (v) v.value = getMod(editScore(t.dataset.ab)) + parseInt(t.value) * editPB();
                return;
            }
            if (t.matches('[data-img]')) {
                const file = t.files && t.files[0];
                if (!file) return;
                const up = t.closest('.cs2-imgup');
                const data = await compressImage(file, 256, 0.7);
                if (!data) { alert('Não foi possível ler a imagem.'); return; }
                up.querySelector('input[type="hidden"]').value = data;
                const prev = up.querySelector('.cs2-imgup-prev');
                prev.outerHTML = `<img class="cs2-imgup-prev" src="${data}" alt="">`;
                return;
            }
            if (t.matches('[data-recalc]')) {
                // Mudou atributo / nivel / prof: atualizar saves e pericias marcados como proficientes.
                const pb = editPB();
                root.querySelectorAll('[data-saveprof]').forEach(c => {
                    const v = root.querySelector('[data-k="saves.' + c.dataset.saveprof + '"]');
                    if (v) v.value = getMod(editScore(c.dataset.saveprof)) + (c.checked ? pb : 0);
                });
                root.querySelectorAll('[data-skillprof]').forEach(sl => {
                    const v = root.querySelector('[data-k="skills.' + sl.dataset.skillprof + '"]');
                    if (v) v.value = getMod(editScore(sl.dataset.ab)) + parseInt(sl.value) * pb;
                });
            }
        });

        root.addEventListener('keydown', e => {
            if (e.target.id === 'cs2-hp-amt' && e.key === 'Enter') { e.preventDefault(); handleAction('dmg', e.target); }
        });
    }

    // ===== MODAIS =====
    let modalEl = null;
    function openModal(html, cls) {
        closeModal();
        modalEl = document.createElement('div');
        modalEl.className = 'cs2-modal-bg';
        modalEl.innerHTML = `<div class="cs2-modal${cls ? ' ' + cls : ''}" role="dialog" aria-modal="true">${html}</div>`;
        modalEl.addEventListener('click', e => { if (e.target === modalEl || e.target.closest('[data-modal-close]')) closeModal(); });
        overlay.appendChild(modalEl);
        return modalEl.querySelector('.cs2-modal');
    }
    function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }
    function toast(msg) {
        if (!overlay) return;
        const t = document.createElement('div');
        t.className = 'cs2-toast';
        t.textContent = msg;
        overlay.appendChild(t);
        setTimeout(() => t.classList.add('out'), 1600);
        setTimeout(() => t.remove(), 2000);
    }

    function openMenu() {
        const m = openModal(`
            <div class="cs2-modal-h"><h3>Opções</h3><button class="cs2-icon-btn" data-modal-close aria-label="Fechar">✕</button></div>
            <div class="cs2-menu">
                <button class="cs2-btn" data-m="reload">⟳ Recarregar ficha do servidor</button>
                <button class="cs2-btn" data-m="v1">Abrir na ficha antiga (v1)</button>
                <button class="cs2-btn" data-m="logout">⇄ Trocar de ficha / sair</button>
            </div>`, 'small');
        m.addEventListener('click', async e => {
            const b = e.target.closest('[data-m]');
            if (!b) return;
            closeModal();
            if (b.dataset.m === 'reload') {
                await flushSave();
                renderLoading();
                const fresh = await loadSheet(S.id);
                if (fresh) S = normalize(fresh);
                render();
            } else if (b.dataset.m === 'v1') {
                await closeOverlay();
                if (isTouchTablet() && typeof window.tabletSwitchView === 'function') window.tabletSwitchView('charsheet');
                else if (typeof window.openCharsheetOverlay === 'function') window.openCharsheetOverlay();
            } else if (b.dataset.m === 'logout') {
                await flushSave();
                setRemembered(null);
                renderLogin();
            }
        });
    }

    function openRestChooser() {
        const m = openModal(`
            <div class="cs2-modal-h"><h3>Descansar</h3><button class="cs2-icon-btn" data-modal-close aria-label="Fechar">✕</button></div>
            <div class="cs2-rest-choice">
                <button class="cs2-rest-opt" data-r="short"><b>☾ Descanso curto</b><span>Gastar dados de vida para recuperar PV</span></button>
                <button class="cs2-rest-opt" data-r="long"><b>☀ Descanso longo</b><span>PV, espaços de magia e dados de vida</span></button>
            </div>`, 'small');
        m.addEventListener('click', e => {
            const b = e.target.closest('[data-r]');
            if (!b) return;
            if (b.dataset.r === 'short') openShortRest(); else openLongRest();
        });
    }

    function openShortRest() {
        const s = S;
        const hd = parseHitDice(s);
        const conMod = getMod(s.con);
        const m = openModal(`
            <div class="cs2-modal-h"><h3>☾ Descanso curto</h3><button class="cs2-icon-btn" data-modal-close aria-label="Fechar">✕</button></div>
            <p class="cs2-hint">Gaste dados de vida para recuperar PV: role <b>1d${hd.die} ${modStr(conMod)}</b> (CON) por dado e informe o total.</p>
            <div class="cs2-rest-hd"><span>Dados de vida</span><b id="cs2-sr-hd">${s.hitDiceRemaining}/${hd.total}</b><span>PV</span><b id="cs2-sr-hp">${s.hpCurrent}/${s.hpMax}</b></div>
            <div class="cs2-rest-row">
                <input type="number" inputmode="numeric" min="0" id="cs2-sr-amt" placeholder="PV rolados">
                <button class="cs2-btn cs2-btn-primary" id="cs2-sr-spend">Gastar 1 dado e curar</button>
            </div>
            ${hasSlots(s) ? `<label class="cs2-check"><input type="checkbox" id="cs2-sr-slots"> Recuperar espaços de magia (Magia de Pacto)</label>` : ''}
            <div class="cs2-modal-f"><button class="cs2-btn cs2-btn-primary" id="cs2-sr-done">Concluir descanso</button></div>`);
        const upd = () => {
            m.querySelector('#cs2-sr-hd').textContent = s.hitDiceRemaining + '/' + hd.total;
            m.querySelector('#cs2-sr-hp').textContent = s.hpCurrent + '/' + s.hpMax;
            m.querySelector('#cs2-sr-spend').disabled = s.hitDiceRemaining <= 0;
        };
        upd();
        m.querySelector('#cs2-sr-spend').addEventListener('click', () => {
            const a = m.querySelector('#cs2-sr-amt');
            const v = Math.max(0, parseInt(a.value) || 0);
            if (s.hitDiceRemaining <= 0) return;
            s.hitDiceRemaining -= 1;
            if (s.hpCurrent <= 0 && v > 0) s.deathSaves = { s: 0, f: 0 };
            s.hpCurrent = Math.min(s.hpMax, s.hpCurrent + v);
            a.value = '';
            upd(); queueSave();
        });
        m.querySelector('#cs2-sr-done').addEventListener('click', () => {
            const cb = m.querySelector('#cs2-sr-slots');
            if (cb && cb.checked) Object.keys(s.spellSlots).forEach(l => { if (s.spellSlots[l]) s.spellSlots[l].used = 0; });
            closeModal(); queueSave(); render();
            toast('Descanso curto concluído');
        });
    }

    function openLongRest() {
        const s = S;
        const hd = parseHitDice(s);
        const regain = Math.max(1, Math.floor(hd.total / 2));
        const m = openModal(`
            <div class="cs2-modal-h"><h3>☀ Descanso longo</h3><button class="cs2-icon-btn" data-modal-close aria-label="Fechar">✕</button></div>
            <ul class="cs2-rest-list">
                <li>PV voltam ao máximo (${s.hpMax}) e PV temporários zeram</li>
                ${hasSlots(s) ? '<li>Todos os espaços de magia são recuperados</li>' : ''}
                <li>Recupera até ${regain} dado(s) de vida (${s.hitDiceRemaining} → ${Math.min(hd.total, s.hitDiceRemaining + regain)})</li>
                <li>Testes contra a morte são zerados</li>
            </ul>
            <p class="cs2-hint">Cargas de itens e estados de batalha não mudam — ajuste-os se necessário.</p>
            <div class="cs2-modal-f">
                <button class="cs2-btn" data-modal-close>Cancelar</button>
                <button class="cs2-btn cs2-btn-primary" id="cs2-lr-go">Descansar</button>
            </div>`, 'small');
        m.querySelector('#cs2-lr-go').addEventListener('click', () => {
            s.hpCurrent = s.hpMax; s.hpTemp = 0;
            Object.keys(s.spellSlots || {}).forEach(l => { if (s.spellSlots[l]) s.spellSlots[l].used = 0; });
            s.hitDiceRemaining = Math.min(hd.total, s.hitDiceRemaining + regain);
            s.deathSaves = { s: 0, f: 0 };
            closeModal(); queueSave(); render();
            toast('Descanso longo concluído');
        });
    }

    async function handleDelete() {
        if (!confirm('Excluir a ficha "' + S.name + '" permanentemente? Isso apaga também na ficha antiga.')) return;
        if (!confirm('Tem certeza? Não dá para desfazer.')) return;
        const ok = await deleteSheet(S.id);
        if (!ok) { alert('Não foi possível excluir.'); return; }
        setRemembered(null);
        renderLogin('Ficha excluída.');
    }

    // ----- Contos -----
    function openContoReader(idx) {
        const contos = S.contos || [];
        const c = contos[idx];
        if (!c) return;
        const m = openModal(`
            <div class="cs2-modal-h"><span class="cs2-muted">${idx + 1} / ${contos.length}</span>
                <div><button class="cs2-icon-btn" data-c="edit" title="Editar" aria-label="Editar">✎</button>
                <button class="cs2-icon-btn danger" data-c="del" title="Excluir" aria-label="Excluir">🗑</button>
                <button class="cs2-icon-btn" data-modal-close aria-label="Fechar">✕</button></div>
            </div>
            <article class="cs2-book">
                <div class="cs2-book-orn">❦</div>
                <h2>${esc(c.title || 'Sem título')}</h2>
                <div class="cs2-book-date">${esc(c.date || '')}</div>
                <div class="cs2-book-text">${esc(c.text || '')}</div>
                <div class="cs2-book-orn">❦</div>
            </article>
            <div class="cs2-modal-f">
                ${idx > 0 ? '<button class="cs2-btn" data-c="prev">◂ Anterior</button>' : '<span></span>'}
                ${idx < contos.length - 1 ? '<button class="cs2-btn" data-c="next">Próximo ▸</button>' : '<span></span>'}
            </div>`, 'book');
        m.addEventListener('click', async e => {
            const b = e.target.closest('[data-c]');
            if (!b) return;
            const a = b.dataset.c;
            if (a === 'prev') openContoReader(idx - 1);
            else if (a === 'next') openContoReader(idx + 1);
            else if (a === 'edit') openContoEditor(idx);
            else if (a === 'del') {
                if (!confirm('Excluir este conto?')) return;
                S.contos.splice(idx, 1);
                closeModal(); await doSave(); render();
            }
        });
    }
    function openContoEditor(idx) {
        const isNew = idx < 0;
        const c = isNew ? { title: '', text: '', date: new Date().toLocaleDateString('pt-BR') } : Object.assign({}, S.contos[idx]);
        const m = openModal(`
            <div class="cs2-modal-h"><h3>${isNew ? 'Novo conto' : 'Editar conto'}</h3><button class="cs2-icon-btn" data-modal-close aria-label="Fechar">✕</button></div>
            <div class="cs2-grid">
                ${fld('Título', `<input id="cs2-ct-title" value="${esc(c.title)}" placeholder="O título do conto…">`)}
                ${fld('Data', `<input id="cs2-ct-date" value="${esc(c.date)}">`)}
                ${fld('Conto', `<textarea id="cs2-ct-text" rows="12" placeholder="Escreva a história do seu personagem…">${esc(c.text)}</textarea>`, 'full')}
            </div>
            <div class="cs2-modal-f">
                <button class="cs2-btn" data-modal-close>Cancelar</button>
                <button class="cs2-btn cs2-btn-primary" id="cs2-ct-save">Salvar conto</button>
            </div>`, 'book');
        m.querySelector('#cs2-ct-save').addEventListener('click', async () => {
            const entry = {
                title: m.querySelector('#cs2-ct-title').value.trim(),
                date: m.querySelector('#cs2-ct-date').value.trim(),
                text: m.querySelector('#cs2-ct-text').value.trim()
            };
            if (!entry.title && !entry.text) { alert('Escreva um título ou o texto do conto.'); return; }
            S.contos = S.contos || [];
            if (isNew) S.contos.push(entry); else S.contos[idx] = entry;
            const ok = await doSave();
            if (!ok) { alert('Não foi possível salvar o conto.'); return; }
            render();
            openContoReader(isNew ? S.contos.length - 1 : idx);
        });
    }

    // ===== IMAGEM =====
    function compressImage(file, maxSize, quality) {
        return new Promise(resolve => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                let w = img.width, h = img.height;
                if (w > h) { if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; } }
                else if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
            img.src = url;
        });
    }

    // ===== INICIALIZACAO =====
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || !overlay || !overlay.classList.contains('open')) return;
        if (modalEl) closeModal();
    });
    // Garante que mudancas pendentes sejam gravadas se a pagina for fechada/escondida.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });

    function wireMenuButton() {
        const btn = document.getElementById('charsheet2-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const st = document.getElementById('settings-toggle');
            const sb = document.getElementById('settings-sidebar');
            if (st) st.classList.remove('open');
            if (sb) sb.classList.remove('open');
            openOverlay();
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireMenuButton);
    else wireMenuButton();

    window.openCharsheetV2 = openOverlay;
    window.closeCharsheetV2 = closeOverlay;
})();
