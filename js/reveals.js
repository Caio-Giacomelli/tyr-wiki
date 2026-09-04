// ===== MODO MESTRE (REVELACOES) =====
// O mestre publica um nome/titulo + imagem (+ descricao opcional). Todos que estao
// com o site aberto veem um banner ao vivo (via onSnapshot) quando o mestre adiciona.
// Ao abrir o site NAO popa nada sozinho; a lista pode ser consultada pelo historico.
//
// Colecao Firestore: 'reveals' -> { title, description, image, createdAt }
// Imagens sao data URLs base64 comprimidas com compressImage (padrao do projeto).
//
// Entradas de UI:
// - Criar revelacao: menu Configuracoes (#master-create-btn), so desktop.
// - Visualizar: olhinho (#master-btn, desktop) e nav mobile (#tablet-nav-master)
//   abrem o historico. Banner ao vivo aparece para todos.

(function() {
    'use strict';

    const COLLECTION = 'reveals';
    // Chave no localStorage para lembrar a ultima revelacao ja vista por este navegador.
    const SEEN_KEY = 'solnegro_last_reveal_seen';

    let reveals = [];          // lista completa em memoria (mais recente primeiro)
    let selectedImage = null;  // data URL da imagem escolhida no modal de publicacao
    let publishing = false;
    let unsubscribe = null;    // funcao para cancelar o listener onSnapshot
    let firstSnapshot = true;  // controla o comportamento na primeira carga

    // ===== ELEMENTOS =====
    const el = {};
    function cacheEls() {
        el.masterBtn = document.getElementById('master-btn');
        el.navMaster = document.getElementById('tablet-nav-master');
        el.createBtn = document.getElementById('master-create-btn');

        el.banner = document.getElementById('master-banner');
        el.bannerClose = document.getElementById('master-banner-close');
        el.bannerImage = document.getElementById('master-banner-image');
        el.bannerTitle = document.getElementById('master-banner-title');
        el.bannerDesc = document.getElementById('master-banner-desc');
        el.bannerTime = document.getElementById('master-banner-time');

        el.modalOverlay = document.getElementById('master-modal-overlay');
        el.modalClose = document.getElementById('master-modal-close');
        el.fTitle = document.getElementById('master-f-title');
        el.fDesc = document.getElementById('master-f-desc');
        el.imageBtn = document.getElementById('master-image-btn');
        el.imageStatus = document.getElementById('master-image-status');
        el.imagePreview = document.getElementById('master-image-preview');
        el.publishBtn = document.getElementById('master-f-publish');
        el.historyLink = document.getElementById('master-f-history');

        el.historyOverlay = document.getElementById('master-history-overlay');
        el.historyClose = document.getElementById('master-history-close');
        el.historyList = document.getElementById('master-history-list');
    }

    // ===== UTIL =====
    function getSeenId() {
        try { return localStorage.getItem(SEEN_KEY) || ''; } catch (e) { return ''; }
    }
    function setSeenId(id) {
        try { if (id) localStorage.setItem(SEEN_KEY, id); } catch (e) {}
    }

    // Converte o campo createdAt (Firestore Timestamp) num numero comparavel (ms).
    function revealMillis(r) {
        if (r && r.createdAt && typeof r.createdAt.toMillis === 'function') {
            return r.createdAt.toMillis();
        }
        if (r && typeof r._localTs === 'number') return r._localTs;
        return 0;
    }

    function formatTime(r) {
        var ms = revealMillis(r);
        if (!ms) return '';
        try {
            var d = new Date(ms);
            return d.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) { return ''; }
    }

    // Escapa texto para injecao segura em HTML.
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ===== FIRESTORE (tempo real) =====
    function startListener() {
        if (typeof db === 'undefined') {
            console.log('Revelacoes indisponiveis: Firestore nao carregado.');
            return;
        }
        try {
            unsubscribe = db.collection(COLLECTION)
                .orderBy('createdAt', 'desc')
                .limit(20) // so as ultimas 20 revelacoes, para nao ficar pesado
                .onSnapshot(handleSnapshot, function(err) {
                    console.log('Erro no listener de revelacoes:', err.message);
                });
        } catch (e) {
            console.log('Nao foi possivel iniciar o listener de revelacoes:', e.message);
        }
    }

    function handleSnapshot(snap) {
        reveals = [];
        snap.forEach(function(doc) {
            var d = doc.data();
            d._id = doc.id;
            reveals.push(d);
        });

        // Se o historico estiver aberto, mantem atualizado ao vivo.
        if (el.historyOverlay && el.historyOverlay.classList.contains('open')) {
            renderHistory();
        }

        var latest = reveals[0];
        if (!latest) { updateNewIndicator(false); return; }

        var seen = getSeenId();

        if (firstSnapshot) {
            firstSnapshot = false;
            // Ao abrir o site: nunca popa sozinho. So define a baseline (ultima ja
            // existente marcada como vista) para nao mostrar revelacoes antigas depois.
            setSeenId(latest._id);
            updateNewIndicator(false);
            return;
        }

        // Depois da primeira carga: revelacao nova (id diferente da ultima vista)
        // popa ao vivo para quem esta com o site aberto.
        if (latest._id !== seen) {
            showBanner(latest);
        }
    }

    async function publishReveal(data) {
        if (typeof db === 'undefined') return false;
        try {
            var payload = {
                title: data.title || '',
                description: data.description || '',
                image: data.image || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection(COLLECTION).add(payload);
            return true;
        } catch (e) {
            console.error('Erro ao publicar revelacao:', e);
            return false;
        }
    }

    async function deleteReveal(id) {
        if (typeof db === 'undefined' || !id) return false;
        try { await db.collection(COLLECTION).doc(id).delete(); return true; }
        catch (e) { console.error('Erro ao excluir revelacao:', e); return false; }
    }

    // ===== BANNER =====
    function showBanner(reveal) {
        if (!el.banner || !reveal) return;

        if (el.bannerImage) {
            el.bannerImage.innerHTML = reveal.image
                ? '<img src="' + reveal.image + '" alt="' + esc(reveal.title) + '">'
                : '';
        }
        if (el.bannerTitle) el.bannerTitle.textContent = reveal.title || 'Revelacao';
        if (el.bannerDesc) {
            el.bannerDesc.textContent = reveal.description || '';
            el.bannerDesc.style.display = reveal.description ? '' : 'none';
        }
        if (el.bannerTime) el.bannerTime.textContent = formatTime(reveal);

        el.banner.classList.add('open');

        // Marca como visto para nao reaparecer ao recarregar.
        setSeenId(reveal._id);
        updateNewIndicator(false);
    }

    function closeBanner() {
        if (el.banner) el.banner.classList.remove('open');
    }

    // Indicador visual de "revelacao nova" nos botoes (desktop e mobile).
    function updateNewIndicator(hasNew) {
        if (el.masterBtn) el.masterBtn.classList.toggle('has-new', !!hasNew);
        if (el.navMaster) el.navMaster.classList.toggle('has-new', !!hasNew);
    }

    // ===== MODAL DE PUBLICACAO =====
    function openModal() {
        if (!el.modalOverlay) return;
        el.modalOverlay.classList.add('open');
    }
    function closeModal() {
        if (el.modalOverlay) el.modalOverlay.classList.remove('open');
    }
    function resetModal() {
        selectedImage = null;
        if (el.fTitle) el.fTitle.value = '';
        if (el.fDesc) el.fDesc.value = '';
        if (el.imageStatus) el.imageStatus.textContent = 'Nenhuma';
        if (el.imagePreview) el.imagePreview.innerHTML = '';
    }

    function pickImage() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.addEventListener('change', async function(e) {
            var file = e.target.files[0];
            if (!file) return;
            if (el.imageStatus) el.imageStatus.textContent = 'Comprimindo...';
            try {
                // Mesma compressao usada no resto do site (evita estourar o limite do Firestore).
                var dataUrl = await compressImage(file, 600, 0.75);
                selectedImage = dataUrl;
                if (el.imageStatus) el.imageStatus.textContent = file.name;
                if (el.imagePreview) el.imagePreview.innerHTML = '<img src="' + dataUrl + '" alt="Preview">';
            } catch (err) {
                if (el.imageStatus) el.imageStatus.textContent = 'Erro ao carregar';
            }
        });
        input.click();
    }

    async function handlePublish() {
        if (publishing) return;
        var title = (el.fTitle && el.fTitle.value.trim()) || '';
        if (!title && !selectedImage) {
            alert('Adicione ao menos um nome ou uma imagem para revelar.');
            return;
        }

        publishing = true;
        if (el.publishBtn) {
            el.publishBtn.disabled = true;
            el.publishBtn.textContent = 'Revelando...';
        }

        var ok = await publishReveal({
            title: title,
            description: (el.fDesc && el.fDesc.value.trim()) || '',
            image: selectedImage || ''
        });

        publishing = false;
        if (el.publishBtn) {
            el.publishBtn.disabled = false;
            el.publishBtn.textContent = 'Revelar a todos';
        }

        if (ok) {
            resetModal();
            closeModal();
            // O onSnapshot recebe a nova revelacao e mostra o banner automaticamente.
        } else {
            alert('Nao foi possivel publicar a revelacao. Verifique a conexao.');
        }
    }

    // ===== HISTORICO =====
    function openHistory() {
        if (!el.historyOverlay) return;
        renderHistory();
        el.historyOverlay.classList.add('open');
    }
    function closeHistory() {
        if (el.historyOverlay) el.historyOverlay.classList.remove('open');
    }

    function renderHistory() {
        if (!el.historyList) return;
        if (!reveals.length) {
            el.historyList.innerHTML = '<div class="master-history-empty">Nenhuma revelação ainda.</div>';
            return;
        }
        el.historyList.innerHTML = '';
        reveals.forEach(function(r) {
            var item = document.createElement('div');
            item.className = 'master-history-item';

            var thumb = r.image
                ? '<img class="master-history-thumb" src="' + r.image + '" alt="" loading="lazy">'
                : '<div class="master-history-thumb"></div>';

            item.innerHTML =
                thumb +
                '<div class="master-history-info">' +
                    '<div class="master-history-item-title">' + esc(r.title || 'Revelacao') + '</div>' +
                    (r.description ? '<div class="master-history-item-desc">' + esc(r.description) + '</div>' : '') +
                    '<div class="master-history-item-time">' + esc(formatTime(r)) + '</div>' +
                '</div>' +
                '<button class="master-history-del" title="Excluir">&times;</button>';

            // Clique no item reabre o banner daquela revelacao.
            item.addEventListener('click', function() {
                closeHistory();
                showBanner(r);
            });

            // Botao de excluir (nao propaga o clique do item).
            var delBtn = item.querySelector('.master-history-del');
            if (delBtn) {
                delBtn.addEventListener('click', async function(ev) {
                    ev.stopPropagation();
                    if (!confirm('Excluir esta revelacao para todos?')) return;
                    await deleteReveal(r._id);
                    // onSnapshot atualiza a lista automaticamente.
                });
            }

            el.historyList.appendChild(item);
        });
    }

    // ===== PONTOS DE ENTRADA =====
    // Criar revelacao: so pelo menu Configuracoes (desktop). Fecha a sidebar antes.
    function openCreate() {
        var toggle = document.getElementById('settings-toggle');
        var sidebar = document.getElementById('settings-sidebar');
        if (toggle) toggle.classList.remove('open');
        if (sidebar) sidebar.classList.remove('open');
        openModal();
    }
    // Visualizar: olhinho (desktop) e nav mobile so abrem o historico.
    // Expor para a navegacao mobile (tablet.js) e outros usos.
    window.openMasterMode = openHistory;
    window.openRevealHistory = openHistory;

    // ===== LISTENERS =====
    function setupListeners() {
        cacheEls();

        // Olhinho: apenas visualizar (historico).
        if (el.masterBtn) el.masterBtn.addEventListener('click', openHistory);
        // Configuracoes: criar revelacao (desktop).
        if (el.createBtn) el.createBtn.addEventListener('click', openCreate);

        if (el.bannerClose) el.bannerClose.addEventListener('click', closeBanner);
        // Clicar no fundo escuro fecha o banner.
        if (el.banner) el.banner.addEventListener('click', function(e) {
            if (e.target === el.banner) closeBanner();
        });

        if (el.modalClose) el.modalClose.addEventListener('click', closeModal);
        if (el.modalOverlay) el.modalOverlay.addEventListener('click', function(e) {
            if (e.target === el.modalOverlay) closeModal();
        });
        if (el.imageBtn) el.imageBtn.addEventListener('click', pickImage);
        if (el.publishBtn) el.publishBtn.addEventListener('click', handlePublish);
        if (el.historyLink) el.historyLink.addEventListener('click', function() {
            closeModal();
            openHistory();
        });

        if (el.historyClose) el.historyClose.addEventListener('click', closeHistory);
        if (el.historyOverlay) el.historyOverlay.addEventListener('click', function(e) {
            if (e.target === el.historyOverlay) closeHistory();
        });

        // Escape fecha o overlay aberto (banner > modal > historico).
        document.addEventListener('keydown', function(e) {
            if (e.key !== 'Escape') return;
            if (el.banner && el.banner.classList.contains('open')) { closeBanner(); return; }
            if (el.historyOverlay && el.historyOverlay.classList.contains('open')) { closeHistory(); return; }
            if (el.modalOverlay && el.modalOverlay.classList.contains('open')) { closeModal(); }
        });

        // Inicia o listener em tempo real assim que o site carrega.
        startListener();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupListeners);
    } else {
        setupListeners();
    }
})();
