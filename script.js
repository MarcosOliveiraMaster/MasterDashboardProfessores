// Supabase (credenciais suas)
const supabaseUrl = 'https://jfdcddxcfkrhgiozfxmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZGNkZHhjZmtyaGdpb3pmeG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTgxODgsImV4cCI6MjA3NDQ3NDE4OH0.BFnQDb6GdvbXvgQq3mB0Bt2u2551-QR4QT1RT6ZXfAE';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// globals
let dadosTabela = null;
let colunasDisponiveis = [];
let colunasSelecionadas = [];
let dadosAlterados = new Map();

// resizing
let isResizing = false;
let currentColumn = null;
let startX = 0;
let startWidth = 0;

const colunasOcultas = ['id'];
const tituloPrincipal = "Área 01";
const subtitulo = "Ester Calazans: Administradora geral";

// Debounce
function debounce(fn, wait = 160) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

// Reset larguras inline (antes de montar)
function resetarLargurasColunas() {
    const tabela = document.getElementById('tabela-dados');
    if (!tabela) return;
    tabela.style.tableLayout = 'auto'; // garante cálculo natural
    tabela.querySelectorAll('thead th').forEach(th => {
        th.style.width = '';
        th.style.minWidth = '';
        th.style.whiteSpace = '';
    });
    tabela.querySelectorAll('tbody td').forEach(td => {
        td.style.width = '';
        td.style.minWidth = '';
        td.style.whiteSpace = '';
    });
}

// Ao final da montagem, medir larguras "naturais" e aplicar
async function ajustarLargurasNaturais() {
    const tabela = document.getElementById('tabela-dados');
    if (!tabela) return;

    // Se o browser suportar, aguarda as fontes carregarem para medidas corretas
    try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
    } catch (e) {
        // ignore se não suportado
    }

    // Garante que o layout calcule naturalmente para medição
    tabela.style.tableLayout = 'auto';

    const thead = tabela.querySelector('thead');
    const tbody = tabela.querySelector('tbody');
    const ths = Array.from(thead.querySelectorAll('th'));
    if (ths.length === 0) return;

    // Tornar temporariamente sem quebras para medir largura real necessária
    ths.forEach(th => th.style.whiteSpace = 'nowrap');

    // Para performance, limite o número de linhas que você vai medir.
    // Ajuste maxRows se quiser cobrir toda a tabela.
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const maxRows = 100; // seguro para tabelas grandes
    const sampleRows = rows.slice(0, maxRows);

    // Também torne as células da amostra sem quebra para medir corretamente
    sampleRows.forEach(r => {
        r.querySelectorAll('td').forEach(td => td.style.whiteSpace = 'nowrap');
    });

    // Calcular largura necessária por coluna (header + amostra de células)
    const colCount = ths.length;
    const maxWidths = new Array(colCount).fill(0);

    ths.forEach((th, i) => {
        const w = th.scrollWidth + 12; // folga visual
        maxWidths[i] = Math.max(maxWidths[i], w);
    });

    sampleRows.forEach(row => {
        const cells = Array.from(row.children);
        cells.forEach((td, i) => {
            const w = td.scrollWidth + 12;
            if (w > (maxWidths[i] || 0)) maxWidths[i] = w;
        });
    });

    // Aplicar larguras calculadas (limites para evitar colunas absurdas)
    for (let i = 0; i < colCount; i++) {
        const th = ths[i];
        const widthPx = Math.min(Math.max(Math.round(maxWidths[i]), 60), 1400); // entre 60 e 1400px
        th.style.width = widthPx + 'px';
        // opcional: manter minWidth se quiser evitar colapsos
        th.style.minWidth = widthPx + 'px';
        // aplicar nas células da coluna
        const cells = document.querySelectorAll(`#tabela-dados td:nth-child(${i + 1})`);
        cells.forEach(td => {
            td.style.width = widthPx + 'px';
            td.style.minWidth = widthPx + 'px';
            // após aplicar largura inicial, permita wrap ao reduzir mais tarde
            td.style.whiteSpace = 'normal';
        });
        // manter header sem wrap (melhora legibilidade dos títulos)
        th.style.whiteSpace = 'nowrap';
    }

    // Após aplicar, estabiliza o layout para evitar relayouts (mas ainda permitimos alterações via JS)
    tabela.style.tableLayout = 'fixed';
}

// Inicialização única
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("tituloPrincipal").innerText = tituloPrincipal;
    document.getElementById("subtitulo").innerText = subtitulo;
    carregarPreferencias();
    inicializarApp();
});

function inicializarApp() {
    // Navegação seções
    document.getElementById('btnSec1')?.addEventListener('click', () => trocarSecao(1));
    document.getElementById('btnSec2')?.addEventListener('click', () => trocarSecao(2));
    document.getElementById('btnSec3')?.addEventListener('click', () => trocarSecao(3));

    // Dropdowns e toggles
    document.getElementById('dropdownToggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('dropdownMenu')?.classList.toggle('hidden');
    });
    document.getElementById('disciplinasToggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('disciplinasMenu')?.classList.toggle('hidden');
    });
    document.getElementById('categoriasToggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('categoriasMenu')?.classList.toggle('hidden');
    });

    // fechar ao clicar fora
    document.addEventListener('click', () => {
        document.getElementById('dropdownMenu')?.classList.add('hidden');
        document.getElementById('disciplinasMenu')?.classList.add('hidden');
        document.getElementById('categoriasMenu')?.classList.add('hidden');
    });

    // Botões
    document.getElementById('btn1')?.addEventListener('click', salvarAlteracoes);
    document.getElementById('limparBusca')?.addEventListener('click', limparFiltros);

    // Filtros dinâmicos
    const inputNome = document.getElementById('filtroNome');
    const inputBairro = document.getElementById('filtroBairro');
    const selectTurno = document.getElementById('filtroTurno');
    const aplicarDebounced = debounce(() => aplicarFiltros(), 160);

    inputNome?.addEventListener('input', aplicarDebounced);
    inputBairro?.addEventListener('input', aplicarDebounced);
    selectTurno?.addEventListener('change', aplicarDebounced);

    // listeners globais de redimensionamento (adicionados apenas uma vez)
    document.addEventListener('mousemove', redimensionarColuna);
    document.addEventListener('mouseup', pararRedimensionamento);

    // Carregar dados
    carregarDadosSupabase();
}

function trocarSecao(id) {
    ['secao1','secao2','secao3'].forEach(s => document.getElementById(s)?.classList.add('hidden'));
    document.getElementById(`secao${id}`)?.classList.remove('hidden');
}

// Carregar dados do Supabase
async function carregarDadosSupabase() {
    try {
        showLoadingState();
        const { data, error } = await supabase.from('candidatoSelecao').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
            dadosTabela = data;
            colunasDisponiveis = Object.keys(data[0]).filter(c => !colunasOcultas.includes(c));
            if (colunasSelecionadas.length === 0) colunasSelecionadas = [...colunasDisponiveis];
            criarDropdownColunas();
            aplicarFiltros(); // renderiza tabela com filtros (vazio => tudo)
        } else {
            dadosTabela = [];
            document.querySelector('#tabela-dados tbody').innerHTML = '<tr><td colspan="100%" class="px-6 py-4 text-center text-gray-500">Nenhum dado encontrado</td></tr>';
        }
    } catch (err) {
        console.error('Erro carregar dados:', err);
        document.querySelector('#tabela-dados tbody').innerHTML = '<tr><td colspan="100%" class="px-6 py-4 text-center text-red-500">Erro ao carregar dados</td></tr>';
    }
}

function showLoadingState() {
    const tbody = document.querySelector('#tabela-dados tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="100%" class="px-6 py-4 text-center text-gray-500">Carregando dados...</td></tr>';
}

// Dropdown de colunas
function criarDropdownColunas() {
    const columnsList = document.getElementById('columnsList');
    if (!columnsList) return;
    columnsList.innerHTML = '';

    colunasDisponiveis.forEach(coluna => {
        const div = document.createElement('div');
        div.className = 'px-4 py-2 text-sm text-gray-700 hover:bg-gray-100';
        const label = document.createElement('label');
        label.className = 'inline-flex items-center w-full cursor-pointer';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = colunasSelecionadas.includes(coluna);
        input.value = coluna;
        input.className = 'coluna-checkbox rounded border-gray-300 text-orange-600 shadow-sm';
        const span = document.createElement('span');
        span.className = 'ml-2 truncate';
        span.textContent = coluna;
        label.appendChild(input);
        label.appendChild(span);
        div.appendChild(label);
        columnsList.appendChild(div);
    });

    // selectAll
    const selectAll = document.getElementById('selectAllColumns');
    if (selectAll) {
        selectAll.checked = colunasSelecionadas.length === colunasDisponiveis.length;
        selectAll.indeterminate = colunasSelecionadas.length > 0 && colunasSelecionadas.length < colunasDisponiveis.length;
        selectAll.onchange = () => {
            colunasSelecionadas = selectAll.checked ? [...colunasDisponiveis] : [];
            document.querySelectorAll('.coluna-checkbox').forEach(cb => cb.checked = selectAll.checked);
            salvarPreferencias();
            aplicarFiltros();
        };
    }

    // listeners individuais
    document.querySelectorAll('.coluna-checkbox').forEach(cb => {
        cb.onchange = () => {
            colunasSelecionadas = Array.from(document.querySelectorAll('.coluna-checkbox:checked')).map(i => i.value);
            const selectAllEl = document.getElementById('selectAllColumns');
            if (selectAllEl) {
                selectAllEl.checked = colunasSelecionadas.length === colunasDisponiveis.length;
                selectAllEl.indeterminate = colunasSelecionadas.length > 0 && colunasSelecionadas.length < colunasDisponiveis.length;
            }
            salvarPreferencias();
            aplicarFiltros();
        };
    });
}

// Criar tabela e, em seguida, ajustar larguras naturais
function criarTabela(dados) {
    const tabela = document.getElementById('tabela-dados');
    if (!tabela) return;
    const thead = tabela.querySelector('thead tr');
    const tbody = tabela.querySelector('tbody');

    // Reset larguras inline antes de montar para garantir medição natural
    resetarLargurasColunas();

    thead.innerHTML = '';
    tbody.innerHTML = '';

    const colunasParaExibir = colunasSelecionadas.filter(col => !colunasOcultas.includes(col));

    // Cabeçalho
    colunasParaExibir.forEach(coluna => {
        const th = document.createElement('th');
        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative';
        th.textContent = coluna;
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.addEventListener('mousedown', (e) => iniciarRedimensionamento(e, th));
        th.appendChild(resizeHandle);
        thead.appendChild(th);
    });

    // Linhas
    if (dados && dados.length > 0) {
        dados.forEach((item, idx) => {
            const tr = document.createElement('tr');
            if (item.id !== undefined && item.id !== null) tr.dataset.rowId = item.id;
            else tr.dataset.index = idx;

            colunasParaExibir.forEach(coluna => {
                const td = document.createElement('td');
                td.className = 'px-6 py-4 text-sm text-gray-900 celula-editavel';
                td.textContent = (item[coluna] !== undefined && item[coluna] !== null) ? String(item[coluna]) : '';
                td.dataset.field = coluna;
                td.addEventListener('click', (e) => {
                    if (e.target === td) iniciarEdicaoCelula(td);
                });
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        // Pequeno timeout para garantir que o browser tenha pintado e nos dê medidas corretas
        // (valor pequeno e seguro)
        setTimeout(() => ajustarLargurasNaturais(), 20);
    } else {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = colunasParaExibir.length || 1;
        td.className = 'px-6 py-4 text-center text-gray-500';
        td.textContent = 'Nenhum dado disponível';
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
}

// Redimensionamento
function iniciarRedimensionamento(e, coluna) {
    isResizing = true;
    currentColumn = coluna;
    startX = e.pageX;
    startWidth = coluna.offsetWidth;
    document.body.classList.add('resizing');
    coluna.style.userSelect = 'none';
    const handle = coluna.querySelector('.resize-handle');
    if (handle) handle.classList.add('active');
    e.preventDefault(); e.stopPropagation();
}

function redimensionarColuna(e) {
    if (!isResizing || !currentColumn) return;
    const largura = startWidth + (e.pageX - startX);
    if (largura > 40) {
        currentColumn.style.width = `${largura}px`;
        const indiceCol = Array.from(currentColumn.parentNode.children).indexOf(currentColumn);
        const todasCelulas = document.querySelectorAll(`#tabela-dados td:nth-child(${indiceCol + 1})`);
        todasCelulas.forEach(celula => {
            celula.style.width = `${largura}px`;
            celula.style.minWidth = `${largura}px`;
            celula.style.whiteSpace = 'normal';
        });
    }
}

function pararRedimensionamento() {
    if (!isResizing) return;
    isResizing = false;
    if (currentColumn) {
        currentColumn.style.userSelect = '';
        const handle = currentColumn.querySelector('.resize-handle');
        if (handle) handle.classList.remove('active');
    }
    currentColumn = null;
    document.body.classList.remove('resizing');
}

// Edição inline
function iniciarEdicaoCelula(celula) {
    if (celula.classList.contains('celula-editando')) return;
    const valorOriginal = celula.textContent;
    celula.classList.add('celula-editando');

    const input = document.createElement('input');
    input.type = 'text';
    input.value = valorOriginal;
    input.className = 'w-full p-1 border-none bg-transparent focus:outline-none';

    celula.textContent = '';
    celula.appendChild(input);
    input.focus();
    input.select();

    input.addEventListener('blur', () => finalizarEdicao(celula, input, valorOriginal));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') {
            celula.textContent = valorOriginal;
            celula.classList.remove('celula-editando');
        }
    });
}

function finalizarEdicao(celula, input, valorOriginal) {
    const novoValor = input.value.trim();
    const linha = celula.parentNode;
    const idRegistro = linha.dataset.rowId || linha.dataset.index;
    const campo = celula.dataset.field;

    celula.removeChild(input);
    celula.textContent = novoValor;
    celula.classList.remove('celula-editando');

    if (novoValor !== valorOriginal) {
        if (!dadosAlterados.has(idRegistro)) dadosAlterados.set(idRegistro, { id: idRegistro });
        dadosAlterados.get(idRegistro)[campo] = novoValor;

        // Atualiza dadosTabela local para refletir filtro/UI
        if (dadosTabela) {
            const idx = dadosTabela.findIndex(d => String(d.id) === String(idRegistro));
            if (idx > -1) dadosTabela[idx][campo] = novoValor;
        }

        document.getElementById('btn1')?.classList.add('btn-salvar-alterado');
        celula.style.backgroundColor = '#fef3c7';
        setTimeout(() => celula.style.backgroundColor = '', 1400);
    }
}

// Salvar alterações (um update por linha, em paralelo)
async function salvarAlteracoes() {
    if (dadosAlterados.size === 0) {
        alert('Nenhuma alteração para salvar.');
        return;
    }
    try {
        const btnSalvar = document.getElementById('btn1');
        const textoOrig = btnSalvar.textContent;
        btnSalvar.textContent = 'Salvando...';
        btnSalvar.disabled = true;

        const alteracoes = Array.from(dadosAlterados.values());
        const promessas = alteracoes.map(al => {
            const { id, ...campos } = al;
            const idNum = isNaN(Number(id)) ? id : Number(id);
            return supabase.from('candidatoSelecao').update(campos).eq('id', idNum);
        });

        const resultados = await Promise.all(promessas);
        const erros = resultados.filter(r => r.error).map(r => r.error);
        if (erros.length > 0) throw erros[0];

        dadosAlterados.clear();
        btnSalvar.classList.remove('btn-salvar-alterado');
        btnSalvar.textContent = textoOrig;
        btnSalvar.disabled = false;
        alert('Alterações salvas com sucesso!');
        // Recarrega para garantir consistência
        carregarDadosSupabase();
    } catch (err) {
        console.error('Erro salvar:', err);
        alert('Erro ao salvar alterações: ' + (err.message || JSON.stringify(err)));
        const btnSalvar = document.getElementById('btn1');
        if (btnSalvar) { btnSalvar.textContent = 'Salvar'; btnSalvar.disabled = false; }
    }
}

// FILTROS
function aplicarFiltros() {
    if (!dadosTabela) return;
    let resultado = [...dadosTabela];

    const nomeValor = (document.getElementById('filtroNome')?.value || '').trim().toLowerCase();
    const bairroValor = (document.getElementById('filtroBairro')?.value || '').trim().toLowerCase();
    const turnoValor = document.getElementById('filtroTurno')?.value || '';
    const disciplinasSelecionadas = Array.from(document.querySelectorAll('input[name="filtroDisciplinas"]:checked')).map(i => i.value.toLowerCase());
    const categoriasSelecionadas = Array.from(document.querySelectorAll('input[name="filtroCategorias"]:checked')).map(i => i.value);

    if (nomeValor) {
        resultado = resultado.filter(item => {
            const campo = String(item.nome || item.Nome || item.NOME || '').toLowerCase();
            return campo.includes(nomeValor);
        });
    }

    if (bairroValor) {
        resultado = resultado.filter(item => {
            const campo = String(item.bairros || item.bairro || item.Bairros || '').toLowerCase();
            return campo.includes(bairroValor);
        });
    }

    if (turnoValor) {
        const chave = turnoValor === 'Tarde' ? 'tarde' : 'manha';
        resultado = resultado.filter(item => {
            return Object.keys(item).some(k => {
                if (typeof k !== 'string') return false;
                if (k.toLowerCase().includes(chave)) {
                    const v = item[k];
                    return checkTruthy(v);
                }
                return false;
            });
        });
    }

    if (disciplinasSelecionadas.length > 0) {
        resultado = resultado.filter(item => {
            const raw = item.disciplinas || item.Disciplinas || item.disciplina || '';
            let lista = [];
            if (Array.isArray(raw)) lista = raw.map(x => String(x).toLowerCase());
            else if (typeof raw === 'string') lista = raw.split(/[,;|]/).map(s => s.trim().toLowerCase()).filter(Boolean);
            else lista = [String(raw).toLowerCase()];
            return disciplinasSelecionadas.some(d => lista.includes(d));
        });
    }

    if (categoriasSelecionadas.length > 0) {
        resultado = resultado.filter(item => {
            return categoriasSelecionadas.some(cat => {
                if (cat === 'TDICS') {
                    const v = item.expTDCS ?? item.expTdcs ?? item.expTDCS;
                    return checkTruthy(v);
                }
                if (cat === 'Neuro') {
                    const v = item.expNEURO ?? item.expNeuro ?? item.expNEURO;
                    return checkTruthy(v);
                }
                if (cat === 'AulasParticulares') {
                    const v = item.ExpAulas ?? item.expAulas ?? item.expaulas;
                    return checkTruthy(v);
                }
                return false;
            });
        });
    }

    criarTabela(resultado);
}

function checkTruthy(v) {
    if (v === undefined || v === null) return false;
    if (v === true) return true;
    if (typeof v === 'string' && ['true','1','on','yes'].includes(v.toLowerCase())) return true;
    if (!isNaN(Number(v)) && Number(v) === 1) return true;
    return false;
}

function limparFiltros() {
    ['filtroNome','filtroBairro','filtroTurno'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.querySelectorAll('input[name="filtroDisciplinas"]').forEach(i => i.checked = false);
    document.querySelectorAll('input[name="filtroCategorias"]').forEach(i => i.checked = false);
    aplicarFiltros();
}

// Preferências localStorage
function salvarPreferencias() { localStorage.setItem('colunasSelecionadas', JSON.stringify(colunasSelecionadas)); }
function carregarPreferencias() { const s = localStorage.getItem('colunasSelecionadas'); if (s) colunasSelecionadas = JSON.parse(s); }
