// ==========================================================
// LÓGICA DO PAINEL DE CONTROLE (DASHBOARD)
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {

    // 1. SISTEMA DE TROCA DE ABAS SPA (SEM RECARREGAR)
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabViews = document.querySelectorAll('.tab-view');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');

            navButtons.forEach(b => b.classList.remove('active'));
            tabViews.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const targetView = document.getElementById(targetId);
            if (targetView) targetView.classList.add('active');
        });
    });

    // 2. PAINEL DE REGISTROS DE PONTO & TAREFAS
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const inputLogin = document.getElementById('inputLogin');
    const inputSenha = document.getElementById('inputSenha');
    const motivosGrid = document.getElementById('motivosGrid');
    const loggedNickElem = document.getElementById('loggedNick');

    const listaMotivos = [
        'Ação Administrativa',
        'Construção em geral',
        'Decoração em Geral',
        'Programar os Wireds',
        'Testar Wireds',
        'Pequenas Decorações',
        'Testar Decorações'
    ];

    let motivoSelecionado = null;

    function carregarMotivos() {
        if (!motivosGrid) return;
        motivosGrid.innerHTML = '';
        motivoSelecionado = null;

        listaMotivos.forEach((motivo) => {
            const card = document.createElement('div');
            card.className = 'motivo-card';
            card.innerText = motivo;

            card.addEventListener('click', () => {
                document.querySelectorAll('.motivo-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                motivoSelecionado = motivo;
            });

            motivosGrid.appendChild(card);
        });
    }

    carregarMotivos();

    const logsContainer = document.getElementById('logsContainer');
    if (logsContainer) {
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    // Inicializações de carregamento ao abrir a página
    carregarLogsDoSupabase();
    carregarMotivosDinamicos();
    carregarAdminPainelExtra();

    if (typeof atualizarSidebarMembros === 'function') {
        atualizarSidebarMembros();
    }
    if (typeof carregarFuncoesUsuario === 'function') {
        carregarFuncoesUsuario();
    }

    // Garante que os campos começam limpos e mascarados ao carregar a página
    if (inputLogin) inputLogin.value = '';
    if (inputSenha) {
        inputSenha.value = '';
        inputSenha.type = 'password'; 
    }

    // Eventos de Login e Logout unificados
    if (btnLogin && btnLogout) {
        btnLogin.addEventListener('click', async () => {
            await carregarCredenciaisNaTela();
            dispararAcao('LOGIN');
        });
        btnLogout.addEventListener('click', () => dispararAcao('LOGOUT'));
    }

// ==========================================================================
// LÓGICA DA ABA DE EVENTOS (VISUALIZAÇÃO, ADMIN E MINI-PRINTS)
// ==========================================================================

// Variáveis de controle
let arrayPrintsAtuais = [];
let indexPrintAtual = 0;
let visualizadorAberto = false;
let idEventoAtual = null;

// Referências do DOM
const mainLayout = document.querySelector('.sketch-layout');
const fullViewerImg = document.getElementById('fullViewerImg');
const btnCloseViewer = document.getElementById('btnCloseViewer');
const btnPrevPrint = document.getElementById('btnPrevPrint');
const btnNextPrint = document.getElementById('btnNextPrint');
const printCounter = document.getElementById('printCounter');
const eventFullViewer = document.getElementById('eventFullViewer');
const eventsGallery = document.getElementById('eventsGallery');

const inputsEvento = [
    document.getElementById('eventTitleInput'),
    document.getElementById('eventDescInput'),
    document.getElementById('eventPartInput'),
    document.getElementById('eventWinInput')
];
const btnAddPrint = document.getElementById('btnAddPrint');
const eventSubmitRow = document.getElementById('eventSubmitRow');

// =========================================================
// FUNÇÕES DO VISUALIZADOR DE IMAGENS
// =========================================================

function abrirVisualizador() {
    if (arrayPrintsAtuais.length === 0) return;
    
    eventsGallery.style.display = 'none';
    eventFullViewer.style.display = 'flex';
    visualizadorAberto = true;
    
    // NOVO: Adiciona a classe que joga as tabelas pras bordas
    const container = document.querySelector('.dashboard-container');
    if(container) container.classList.add('layout-expandido');
    
    atualizarImagemVisualizador();
}

function fecharVisualizador() {
    // Tira o modo tela cheia caso o cara feche pelo X enquanto dava zoom
    eventFullViewer.classList.remove('img-fullscreen');
    
    // Remove a classe que jogava as tabelas pras bordas
    const container = document.querySelector('.dashboard-container');
    if(container) container.classList.remove('layout-expandido');

    // Remove aquele 'focus-mode' antigo que você tinha
    if(mainLayout) mainLayout.classList.remove('focus-mode'); 

    eventFullViewer.style.display = 'none';
    eventsGallery.style.display = 'grid'; 
    visualizadorAberto = false;
}

function atualizarImagemVisualizador() {
    if (arrayPrintsAtuais.length > 0) {
        fullViewerImg.src = arrayPrintsAtuais[indexPrintAtual];
        printCounter.innerText = `${indexPrintAtual + 1} / ${arrayPrintsAtuais.length}`;
    }
}

// =========================================================
// 1. ABRIR E NAVEGAR NO EVENTO (CARREGANDO DO SUPABASE)
// =========================================================

async function carregarEventosDoSupabase() {
    const eventsGallery = document.getElementById('eventsGallery');
    if (!eventsGallery) return;

    try {
        // Puxa os eventos do banco, ordenando do mais novo pro mais antigo
        const { data: eventos, error } = await supabaseClient
            .from('eventos')
            .select('*')
            .order('id', { ascending: false }); 

        if (error) throw error;

        // Apaga o conteúdo estático que estava no HTML
        eventsGallery.innerHTML = ''; 

        if (!eventos || eventos.length === 0) {
            eventsGallery.innerHTML = '<p style="color:#a0a5c0; padding:20px; text-align:center; width:100%;">Nenhum evento criado.</p>';
            return;
        }

        // Cria os cards interativos para cada evento do banco
        eventos.forEach(evento => {
            const card = document.createElement('div');
            card.className = 'event-card';
            
            const prints = evento.prints || [];
            const imagemCapa = prints.length > 0 ? prints[0] : 'https://via.placeholder.com/150/120e29/ffffff?text=Sem+Foto';

            card.innerHTML = `
                <div style="width: 100%; height: 90px; border-radius: 4px; overflow: hidden; margin-bottom: 5px;">
                    <img src="${imagemCapa}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <span style="color: #fff; font-size: 0.85rem; font-weight: bold; text-align: center; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${evento.titulo}</span>
            `;

            // Quando clicar no card, abre as infos na lateral
            card.addEventListener('click', () => {
                idEventoAtual = evento.id; 
                document.getElementById('eventTitleInput').value = evento.titulo || '';
                document.getElementById('eventDescInput').value = evento.descricao || '';
                document.getElementById('eventPartInput').value = evento.participantes || '';
                document.getElementById('eventWinInput').value = evento.ganhadores || '';
                
                arrayPrintsAtuais = [...prints];
                indexPrintAtual = 0;
                renderizarMiniPrints();
                abrirVisualizador();
            });

            eventsGallery.appendChild(card);
        });

        // Simula um clique no primeiro evento para abrir ele automaticamente na tela
        const primeiroCard = eventsGallery.querySelector('.event-card');
        if (primeiroCard) primeiroCard.click();

    } catch (error) {
        console.error("Erro ao puxar eventos:", error);
    }
}
// =========================================================
// 2. EXPANDIR / REDUZIR O CENTRO (CLIQUE NA IMAGEM E BOTÃO X)
// =========================================================

if (fullViewerImg) {
    fullViewerImg.addEventListener('click', () => {
        // Ao invés do método antigo, agora ele ativa o modo Tela Cheia do CSS novo
        if (eventFullViewer) {
            eventFullViewer.classList.toggle('img-fullscreen');
        }
    });
}

if (btnCloseViewer) {
    btnCloseViewer.addEventListener('click', fecharVisualizador);
}

// =========================================================
// 3. GERENCIAR MINI-PRINTS (COM BOTÃO DE REMOVER)
// =========================================================

function renderizarMiniPrints() {
    const printsRow = document.getElementById('printsRow');
    
    // Remove as antigas antes de recriar para não duplicar
    document.querySelectorAll('.mini-print-wrapper').forEach(el => el.remove());

    const isEditando = !document.getElementById('eventTitleInput').disabled;

    arrayPrintsAtuais.forEach((url, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'mini-print-wrapper';

        const img = document.createElement('img');
        img.src = url;
        img.style.width = '45px'; 
        img.style.height = '45px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-remove-print';
        removeBtn.innerText = '✕';
        
        // Se o painel NÃO estiver em modo edição, esconde os botões de remover as fotos
        if (!isEditando) {
            removeBtn.style.display = 'none';
        }

        // Lógica de Remover a Imagem da Array!
        removeBtn.onclick = function() {
            arrayPrintsAtuais.splice(index, 1); // Tira da memória
            renderizarMiniPrints(); // Recria a lista
            
            if (visualizadorAberto) {
                // Ajusta o índice se apagarmos a última foto
                if (indexPrintAtual >= arrayPrintsAtuais.length) {
                    indexPrintAtual = Math.max(0, arrayPrintsAtuais.length - 1);
                }
                
                if (arrayPrintsAtuais.length > 0) {
                    atualizarImagemVisualizador();
                } else {
                    fecharVisualizador(); // Se apagar todas, fecha o modo central
                }
            }
        };

        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        
        // Adiciona a imagem criada ANTES do botão "+"
        printsRow.insertBefore(wrapper, btnAddPrint);
    });
}

// =========================================================
// 4. LÓGICA DE EDIÇÃO DO ADMIN (HABILITAR/DESABILITAR CAMPOS) E SALVAR NO SUPABASE
// =========================================================

const btnAdminEditEvent = document.getElementById('btnAdminEditEvent');
const btnAdminNewEvent = document.getElementById('btnAdminNewEvent');
const btnCancelEvent = document.getElementById('btnCancelEvent');
const btnConfirmEvent = document.getElementById('btnConfirmEvent'); // Pegando o botão Confirmar

function alterarModoEdicao(limpar, ativado) {
    inputsEvento.forEach(input => {
        input.disabled = !ativado;
        if (limpar) input.value = '';
    });
    
    if (limpar) {
        arrayPrintsAtuais = [];
        idEventoAtual = null; // Reseta o ID porque é um Novo Evento
        fecharVisualizador();
    }

    btnAddPrint.style.display = ativado ? 'inline-block' : 'none';
    eventSubmitRow.style.display = ativado ? 'flex' : 'none';
    
    renderizarMiniPrints();
}

if (btnAdminEditEvent) {
    btnAdminEditEvent.addEventListener('click', () => alterarModoEdicao(false, true)); // Edita o atual
}

if (btnAdminNewEvent) {
    btnAdminNewEvent.addEventListener('click', () => alterarModoEdicao(true, true)); // Zera tudo pra criar novo
}

if (btnCancelEvent) {
    btnCancelEvent.addEventListener('click', () => {
        alterarModoEdicao(false, false); // Cancela a edição e volta pro modo leitura
    });
}

// 🚀 AQUI É ONDE A MÁGICA DO SUPABASE ACONTECE NO BOTÃO CONFIRMAR
if (btnConfirmEvent) {
    btnConfirmEvent.addEventListener('click', async (e) => {
        e.preventDefault();

        // Pega os textos das caixas de input
        const titulo = inputsEvento[0].value.trim();
        const descricao = inputsEvento[1].value.trim();
        const participantes = inputsEvento[2].value.trim();
        const ganhadores = inputsEvento[3].value.trim();

        // Proteção: não deixar salvar sem título
        if (!titulo) {
            alert("⚠️ Por favor, preencha o título do evento!");
            return;
        }

        // Deixa o botão carregando para não clicarem duas vezes
        const textoOriginalBotao = btnConfirmEvent.innerText;
        btnConfirmEvent.innerText = "Salvando...";
        btnConfirmEvent.disabled = true;

        // Monta o pacote de dados para enviar ao banco
        const pacoteDeDados = {
            titulo: titulo,
            descricao: descricao,
            participantes: participantes,
            ganhadores: ganhadores,
            prints: arrayPrintsAtuais // Envia o array de imagens como JSON
        };

        try {
            if (idEventoAtual) {
                // SE TEM ID: Atualiza um evento que já existe (Botão Editar)
                const { error } = await supabaseClient
                    .from('eventos')
                    .update(pacoteDeDados)
                    .eq('id', idEventoAtual);

                if (error) throw error;
                alert("✅ Evento editado com sucesso!");
            } else {
                // SE NÃO TEM ID: Cria um evento novinho do zero (Botão Novo)
                const { error } = await supabaseClient
                    .from('eventos')
                    .insert([pacoteDeDados]);

                if (error) throw error;
                alert("✅ Novo evento criado com sucesso!");
            }

            // Após salvar, limpa o formulário e atualiza a tela
            alterarModoEdicao(false, false);
            // Após salvar, limpa o formulário e atualiza a galeria SEM mudar de aba
            alterarModoEdicao(false, false);
            carregarEventosDoSupabase(); // Trocou o reload por isso!

        } catch (err) {
            console.error("Erro no Supabase:", err);
            alert("❌ Erro ao salvar no banco: " + err.message);
        } finally {
            // Volta o botão ao normal
            btnConfirmEvent.innerText = textoOriginalBotao;
            btnConfirmEvent.disabled = false;
        }
    });
}

// =========================================================
// 5. MODAL DE ADICIONAR IMAGEM URL
// =========================================================
const imageModal = document.getElementById('imageModal');
const btnModalOk = document.getElementById('btnModalOk');
const btnModalCancel = document.getElementById('btnModalCancel');
const modalImageUrl = document.getElementById('modalImageUrl');

if (btnAddPrint) btnAddPrint.addEventListener('click', () => imageModal.style.display = 'flex');

if (btnModalCancel) {
    btnModalCancel.addEventListener('click', () => {
        imageModal.style.display = 'none';
        modalImageUrl.value = '';
    });
}

if (btnModalOk) {
    btnModalOk.addEventListener('click', () => {
        const url = modalImageUrl.value.trim();
        if (url) {
            arrayPrintsAtuais.push(url);
            renderizarMiniPrints();
            
            // Se for a primeira imagem posta, abre o visualizador automático
            if (arrayPrintsAtuais.length === 1 && !visualizadorAberto) {
                indexPrintAtual = 0;
                abrirVisualizador();
            } else if (visualizadorAberto) {
                atualizarImagemVisualizador();
            }
        }
        imageModal.style.display = 'none';
        modalImageUrl.value = '';
    });
}

});

// ==========================================================
// FUNÇÕES GLOBAIS DO DASHBOARD
// ==========================================================
function manterAtivo10s(elemento) {
    elemento.classList.add('ativo-neon');
    setTimeout(() => {
        elemento.classList.remove('ativo-neon');
    }, 10000);
}

function abrirTutorial(nomeFuncao) {
    const tituloEl = document.getElementById('titulo-tutorial');
    const conteudoEl = document.getElementById('conteudo-tutorial');

    if (tituloEl && conteudoEl) {
        tituloEl.innerText = `TUTORIAL: ${nomeFuncao.toUpperCase()}`;
        conteudoEl.innerHTML = `
            <div style="text-align: center; padding: 25px 10px;">
                <p style="color: #d51be2; font-weight: 700; font-size: 0.85rem; margin-bottom: 10px; text-shadow: 0 0 8px rgba(213,27,226,0.5);">
                    🛠️ EM DESENVOLVIMENTO
                </p>
                <p class="placeholder-dev" style="margin-top: 0;">
                    O tutorial explicativo para <strong>${nomeFuncao}</strong> será cadastrado futuramente pelo Administrador.
                </p>
            </div>
        `;
    }
}

// ==========================================================
// FUNÇÕES DO PAINEL ADMIN E AÇÕES SUPABASE
// ==========================================================
async function dispararAcao(tipo) {
    const motivoSelecionado = document.querySelector('.motivo-card.selected');
    if (!motivoSelecionado && tipo === 'LOGIN') {
        alert('⚠️ Selecione um MOTIVO antes de clicar em LOGIN ou LOGOUT!');
        return;
    }

    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const btn = tipo === 'LOGIN' ? btnLogin : btnLogout;
    if (!btn || btn.classList.contains('loading')) return;

    const inputLogin = document.getElementById('inputLogin');
    const inputSenha = document.getElementById('inputSenha');
    const loggedNickElem = document.getElementById('loggedNick');

    if (tipo === 'LOGOUT') {
        if (inputLogin) inputLogin.value = '';
        if (inputSenha) {
            inputSenha.value = '';
            inputSenha.type = 'password'; 
        }
    }

    btn.classList.add('loading');

    const nick = loggedNickElem ? loggedNickElem.innerText : 'Crebes';
    const motivoAtual = motivoSelecionado ? motivoSelecionado.innerText : 'Geral';

    // Ajustado para usar nick_habbo para bater com a tabela profiles
    const { error } = await supabaseClient
        .from('ponto_logs')
        .insert([
            { tipo: tipo, nick_habbo: nick, motivo: motivoAtual }
        ]);

    setTimeout(() => {
        btn.classList.remove('loading');

        if (error) {
            alert('❌ Erro ao salvar registro no banco de dados: ' + error.message);
            return;
        }

        carregarLogsDoSupabase();
    }, 1200);
}

async function carregarCredenciaisNaTela() {
    const inputLogin = document.getElementById('inputLogin');
    const inputSenha = document.getElementById('inputSenha');
    if (!inputLogin || !inputSenha) return;

    if (typeof supabaseClient === 'undefined') return;

    const { data } = await supabaseClient
        .from('credenciais_construtor')
        .select('*')
        .limit(1)
        .single();

    if (data) {
        inputLogin.value = data.login;
        inputSenha.value = data.senha;
        inputSenha.type = 'text';
    }
}

async function carregarMembrosAdmin() {
    const tbody = document.getElementById('adminMembrosTable');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="padding: 15px; text-align: center; color: #a0a5c0;">Carregando membros...</td></tr>';

    try {
        const { data: membros, error } = await supabaseClient
            .from('profiles')
            .select('id, nick_habbo, email, cargo, status')
            .order('nick_habbo', { ascending: true });

        if (error) throw error;

        tbody.innerHTML = '';

        if (!membros || membros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 15px; text-align: center; color: #a0a5c0;">Nenhum membro encontrado.</td></tr>';
            return;
        }

        membros.forEach(membro => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #322853';

            const cargosPossiveis = ['Admin', 'Lider', 'Vice-Lider', 'Secretario', 'Analista'];
            let optionsCargos = '';
            cargosPossiveis.forEach(c => {
                optionsCargos += `<option value="${c}" ${membro.cargo === c ? 'selected' : ''}>${c}</option>`;
            });

            const statusBadge = membro.status === 'liberado' 
                ? '<span style="color: #4ade80; font-weight: 600;">liberado</span>' 
                : '<span style="color: #facc15; font-weight: 600;">pendente</span>';

            const btnAcaoText = membro.status === 'liberado' ? 'Bloquear' : 'Liberar';
            const btnAcaoClass = membro.status === 'liberado' ? 'background: #ef4444;' : 'background: #22c55e;';

            tr.innerHTML = `
                <td style="padding: 10px;">
                    <input type="text" class="input-nick-edit" data-id="${membro.id}" value="${membro.nick_habbo || ''}" style="background: #1e1b4b; color: #fff; border: 1px solid #322853; padding: 5px; border-radius: 4px; width: 100%;">
                </td>
                <td style="padding: 10px; color: #a0a5c0;">${membro.email || 'Não informado'}</td>
                <td style="padding: 10px;">
                    <select class="select-cargo" data-id="${membro.id}" style="background: #1e1b4b; color: #fff; border: 1px solid #322853; padding: 5px; border-radius: 4px;">
                        ${optionsCargos}
                    </select>
                </td>
                <td style="padding: 10px;">${statusBadge}</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn-acao-status" data-id="${membro.id}" data-status="${membro.status}" style="${btnAcaoClass} color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                        ${btnAcaoText}
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        document.querySelectorAll('.input-nick-edit').forEach(input => {
            input.addEventListener('change', async (e) => {
                const userId = e.target.getAttribute('data-id');
                const novoNick = e.target.value.trim();

                const { error: updateError } = await supabaseClient
                    .from('profiles')
                    .update({ nick_habbo: novoNick })
                    .eq('id', userId);

                if (updateError) {
                    alert('Erro ao atualizar nick: ' + updateError.message);
                } else {
                    e.target.style.borderColor = '#4ade80';
                    setTimeout(() => e.target.style.borderColor = '#322853', 1500);
                    atualizarSidebarMembros();
                }
            });
        });

        document.querySelectorAll('.select-cargo').forEach(select => {
            select.addEventListener('change', async (e) => {
                const userId = e.target.getAttribute('data-id');
                const novoCargo = e.target.value;

                const { error: updateError } = await supabaseClient
                    .from('profiles')
                    .update({ cargo: novoCargo })
                    .eq('id', userId);

                if (updateError) {
                    alert('Erro ao alterar cargo: ' + updateError.message);
                } else {
                    e.target.style.borderColor = '#4ade80';
                    setTimeout(() => e.target.style.borderColor = '#322853', 1500);
                    atualizarSidebarMembros();
                }
            });
        });

        document.querySelectorAll('.btn-acao-status').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = e.target.getAttribute('data-id');
                const statusAtual = e.target.getAttribute('data-status');
                const novoStatus = statusAtual === 'liberado' ? 'pendente' : 'liberado';

                const { error: statusError } = await supabaseClient
                    .from('profiles')
                    .update({ status: novoStatus })
                    .eq('id', userId);

                if (statusError) {
                    alert('Erro ao alterar status: ' + statusError.message);
                } else {
                    carregarMembrosAdmin();
                    atualizarSidebarMembros();
                }
            });
        });

        atualizarSidebarMembros();

    } catch (err) {
        console.error("Erro ao carregar membros no painel admin:", err);
    }
}

async function atualizarSidebarMembros() {
    try {
        const { data: membros, error } = await supabaseClient
            .from('profiles')
            .select('nick_habbo, cargo, status')
            .eq('status', 'liberado')
            .in('cargo', ['Lider', 'Vice-Lider', 'Secretario', 'Analista'])
            .order('nick_habbo', { ascending: true });

        if (error) throw error;

        const cargosVisiveis = ['Lider', 'Vice-Lider', 'Secretario', 'Analista'];
        cargosVisiveis.forEach(c => {
            const container = document.getElementById(`sidebar-${c}`);
            if (container) container.innerHTML = '';
        });

        membros.forEach(membro => {
            const container = document.getElementById(`sidebar-${membro.cargo}`);
            if (container) {
                const tag = document.createElement('div');
                tag.className = 'member-tag';
                tag.innerText = membro.nick_habbo;
                container.appendChild(tag);
            }
        });

    } catch (err) {
        console.error("Erro ao atualizar sidebar de membros:", err);
    }
}

async function carregarFuncoesAdmin() {
    const container = document.getElementById('adminFuncoesContainer');
    if (!container) return;

    container.innerHTML = '<p style="color: #a0a5c0; font-size: 0.9rem;">Carregando funções...</p>';

    try {
        const { data: funcoes, error } = await supabaseClient
            .from('funcoes')
            .select('*');

        if (error) {
            container.innerHTML = '<p style="color: #ff6b6b; font-size: 0.9rem;">Erro ao carregar as funções do banco de dados.</p>';
            return;
        }

        if (!funcoes || funcoes.length === 0) {
            container.innerHTML = '<p style="color: #a0a5c0; font-size: 0.9rem;">Nenhuma função cadastrada no momento.</p>';
            return;
        }

        container.innerHTML = '';
        funcoes.forEach(func => {
            const card = document.createElement('div');
            card.style.cssText = 'background: #1a153b; padding: 15px; border-radius: 8px; border: 1px solid #322853; display: flex; flex-direction: column; gap: 10px;';
            
            card.innerHTML = `
                <strong style="color: #fff; font-size: 0.95rem;">${func.titulo || 'Função'}</strong>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="link_${func.id}" value="${func.link || ''}" placeholder="Link de acesso..." style="flex: 1; background: #120e29; border: 1px solid #322853; color: #fff; padding: 8px; border-radius: 4px; font-size: 0.85rem;">
                </div>
                <textarea id="tutorial_${func.id}" placeholder="Escreva o tutorial da função..." style="background: #120e29; border: 1px solid #322853; color: #fff; padding: 8px; border-radius: 4px; font-size: 0.85rem; height: 70px; resize: vertical;">${func.tutorial || ''}</textarea>
                <button onclick="salvarFuncaoAdmin('${func.id}')" style="align-self: flex-end; background: #e91e63; color: #fff; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 600;">Salvar Alterações</button>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error("Erro inesperado ao carregar funções:", err);
    }
}

async function salvarFuncaoAdmin(id) {
    const linkInput = document.getElementById(`link_${id}`);
    const tutorialInput = document.getElementById(`tutorial_${id}`);

    if (!linkInput || !tutorialInput) return;

    const { error } = await supabaseClient
        .from('funcoes')
        .update({
            link: linkInput.value,
            tutorial: tutorialInput.value
        })
        .eq('id', id);

    if (error) {
        alert('❌ Erro ao salvar alterações: ' + error.message);
    } else {
        alert('✅ Função atualizada com sucesso!');
    }
}

async function carregarMotivosDinamicos() {
    const containerAdmin = document.getElementById('listaMotivosAdminContainer');
    
    const { data: motivos, error } = await supabaseClient.from('motivos').select('*');
    if (error) return;

    if (containerAdmin) {
        containerAdmin.innerHTML = '';
        motivos.forEach(m => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #120e29; padding: 6px 10px; border-radius: 4px;';
            row.innerHTML = `
                <span style="color: #fff; font-size: 0.85rem;">${m.nome}</span>
                <button onclick="removerMotivoAdmin('${m.id}')" style="background: #ff4757; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">Remover</button>
            `;
            containerAdmin.appendChild(row);
        });
    }
}

async function adicionarMotivoAdmin() {
    const input = document.getElementById('novoMotivoInput');
    if (!input || !input.value.trim()) return alert('Digite o nome do motivo.');

    const { error } = await supabaseClient.from('motivos').insert([{ nome: input.value.trim() }]);
    if (error) {
        alert('Erro ao adicionar motivo.');
    } else {
        input.value = '';
        carregarMotivosDinamicos();
        alert('Motivo adicionado com sucesso!');
    }
}

async function removerMotivoAdmin(id) {
    if (!confirm('Deseja realmente remover este motivo?')) return;
    const { error } = await supabaseClient.from('motivos').delete().eq('id', id);
    if (!error) carregarMotivosDinamicos();
}

async function limparTodosRegistrosAdmin() {
    if (!confirm('⚠️ Tem certeza que deseja apagar TODOS os registros? Esta ação vai zerar o histórico completamente!')) return;

    const { error } = await supabaseClient.from('ponto_logs').delete().neq('id', 0);
    
    if (error) {
        alert('Erro ao limpar registros: ' + error.message);
    } else {
        alert('✅ Todos os registros foram zerados com sucesso!');
        location.reload();
    }
}

async function carregarAdminPainelExtra() {
    const inputLogin = document.getElementById('adminLoginConta');
    const inputSenha = document.getElementById('adminSenhaConta');
    if (!inputLogin || !inputSenha) return;

    const { data } = await supabaseClient.from('credenciais_construtor').select('*').limit(1).single();
    if (data) {
        inputLogin.value = data.login;
        inputSenha.value = data.senha;
    }
}

async function salvarCredenciaisConta() {
    const loginVal = document.getElementById('adminLoginConta').value;
    const senhaVal = document.getElementById('adminSenhaConta').value;

    const { data } = await supabaseClient.from('credenciais_construtor').select('id').limit(1).single();
    
    if (data) {
        const { error } = await supabaseClient.from('credenciais_construtor').update({ login: loginVal, senha: senhaVal }).eq('id', data.id);
        if (error) alert('Erro ao atualizar credenciais.');
        else alert('✅ Credenciais da conta atualizadas com sucesso!');
    }
}

async function carregarLogsDoSupabase() {
    const logsContainer = document.getElementById('logsContainer');
    if (!logsContainer) return;
    logsContainer.innerHTML = '';

    const { data: logs, error } = await supabaseClient
        .from('ponto_logs')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Erro ao carregar logs:', error);
        return;
    }

    if (logs && logs.length > 0) {
        logs.forEach(log => {
            // Suporta tanto nick_habbo quanto nick para compatibilidade total
            const nickUsado = log.nick_habbo || log.nick || log.usuario || 'Desconhecido';
            renderizarLinhaLog(log.tipo, nickUsado, log.created_at || log.data_hora, log.motivo);
        });
    }
    
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

function renderizarLinhaLog(tipo, nick, dataHoraStr, motivo) {
    const logsContainer = document.getElementById('logsContainer');
    if (!logsContainer) return;

    const novaLinha = document.createElement('div');
    novaLinha.className = 'log-line';

    const tagClass = tipo === 'LOGIN' ? 'tag-login' : 'tag-logout';

    let formatoDataHora = dataHoraStr;
    if (dataHoraStr && (dataHoraStr.includes('-') || dataHoraStr.includes('T'))) {
        const d = new Date(dataHoraStr);
        const dataStr = d.toLocaleDateString('pt-BR');
        const horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        formatoDataHora = `${dataStr} ${horaStr}`;
    }

    novaLinha.innerHTML = `<span class="${tagClass}">${tipo}</span> | <strong class="log-nick">${nick}</strong> | ${formatoDataHora} / <span class="log-label-blue">MOTIVO:</span> <span class="log-text-white">${motivo}</span>`;
    logsContainer.appendChild(novaLinha);
}
