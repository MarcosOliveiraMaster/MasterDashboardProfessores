// Configuração do Supabase
const supabaseUrl = 'https://jfdcddxcfkrhgiozfxmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZGNkZHhjZmtyaGdpb3pmeG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTgxODgsImV4cCI6MjA3NDQ3NDE4OH0.BFnQDb6GdvbXvgQq3mB0Bt2u2551-QR4QT1RT6ZXfAE';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Variáveis globais
let dadosTabela = null;
let colunasDisponiveis = [];
let colunasSelecionadas = [];
let dadosAlterados = new Map();

// Variáveis para redimensionamento de colunas - MELHORADO
let isResizing = false;
let currentColumn = null;
let startX = 0;
let startWidth = 0;

// Colunas que não devem ser exibidas
const colunasOcultas = ['id'];

// Variáveis configuráveis
let tituloPrincipal = "Área 01";
let subtitulo = "Ester Calazans: Administradora geral";

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("tituloPrincipal").innerText = tituloPrincipal;
    document.getElementById("subtitulo").innerText = subtitulo;
    
    inicializarApp();
});

function inicializarApp() {
    // Seções e botões
    const secoes = {
        1: document.getElementById("secao1"),
        2: document.getElementById("secao2"),
        3: document.getElementById("secao3")
    };

    const botoes = {
        1: document.getElementById("btn1"),
        2: document.getElementById("btn2"),
        3: document.getElementById("btn3")
    };

    let secaoAtual = 1;

    // Carregar preferências salvas
    carregarPreferencias();

    // Event Listeners para navegação
    document.getElementById("btnSec1").addEventListener("click", () => trocarSecao(1));
    document.getElementById("btnSec2").addEventListener("click", () => trocarSecao(2));
    document.getElementById("btnSec3").addEventListener("click", () => trocarSecao(3));

    // Dropdown toggle
    document.getElementById('dropdownToggle').addEventListener('click', function(e) {
        e.stopPropagation();
        const dropdown = document.getElementById('dropdownMenu');
        dropdown.classList.toggle('hidden');
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', function() {
        document.getElementById('dropdownMenu').classList.add('hidden');
    });

    // Prevenir fechamento ao clicar dentro do dropdown
    document.getElementById('dropdownMenu').addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Event Listener para o botão de salvar (Botão 1) - CORRIGIDO
    document.getElementById("btn1").addEventListener("click", salvarAlteracoes);

    // Inicializar botões
    atualizarBotoes();

    // Carregar dados inicialmente se a seção 1 estiver visível
    if (secaoAtual === 1) {
        carregarDadosSupabase();
    }

    function trocarSecao(id) {
        Object.values(secoes).forEach(sec => sec.classList.add("hidden"));
        secoes[id].classList.remove("hidden");

        secaoAtual = id;
        atualizarBotoes();

        // Carregar dados quando a seção 1 for aberta
        if (id === 1 && !dadosTabela) {
            carregarDadosSupabase();
        }
    }

    function atualizarBotoes() {
        Object.values(botoes).forEach(b => {
            b.style.opacity = "1";
            b.style.pointerEvents = "auto";
        });
    }
}

// Função para carregar dados do Supabase
async function carregarDadosSupabase() {
    try {
        showLoadingState();
        
        const { data, error } = await supabase
            .from('candidatoSelecao')
            .select('*');

        if (error) throw error;
        
        if (data && data.length > 0) {
            dadosTabela = data;
            colunasDisponiveis = Object.keys(data[0]);
            
            // Filtrar colunas ocultas
            colunasDisponiveis = colunasDisponiveis.filter(col => !colunasOcultas.includes(col));
            
            // Se não há colunas selecionadas (primeira vez), seleciona todas
            if (colunasSelecionadas.length === 0) {
                colunasSelecionadas = [...colunasDisponiveis];
            }
            
            criarDropdownColunas();
            criarTabela(data);
        } else {
            document.querySelector('#tabela-dados tbody').innerHTML = 
                '<tr><td colspan="100%" class="px-6 py-4 text-center text-gray-500">Nenhum dado encontrado</td></tr>';
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        document.querySelector('#tabela-dados tbody').innerHTML = 
            '<tr><td colspan="100%" class="px-6 py-4 text-center text-red-500">Erro ao carregar dados</td></tr>';
    }
}

// Função para mostrar estado de carregamento
function showLoadingState() {
    const tbody = document.querySelector('#tabela-dados tbody');
    tbody.innerHTML = '<tr><td colspan="100%" class="px-6 py-4 text-center text-gray-500">Carregando dados...</td></tr>';
}

// Função para criar o dropdown de colunas
function criarDropdownColunas() {
    const columnsList = document.getElementById('columnsList');
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
        input.className = 'coluna-checkbox rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50';

        const span = document.createElement('span');
        span.className = 'ml-2 truncate';
        span.textContent = coluna;

        label.appendChild(input);
        label.appendChild(span);
        div.appendChild(label);
        columnsList.appendChild(div);
    });

    // Atualizar o checkbox "Todas as colunas"
    atualizarCheckboxTodas();

    // Configurar eventos dos checkboxes
    configurarEventosCheckboxes();
}

// Configurar eventos para os checkboxes
function configurarEventosCheckboxes() {
    // Evento para "Todas as colunas"
    const selectAllCheckbox = document.getElementById('selectAllColumns');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.coluna-checkbox');
            const isChecked = this.checked;
            
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            
            colunasSelecionadas = isChecked ? [...colunasDisponiveis] : [];
            salvarPreferencias();
            atualizarTabela();
        });
    }

    // Eventos para checkboxes individuais
    document.querySelectorAll('.coluna-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                if (!colunasSelecionadas.includes(this.value)) {
                    colunasSelecionadas.push(this.value);
                }
            } else {
                const index = colunasSelecionadas.indexOf(this.value);
                if (index > -1) {
                    colunasSelecionadas.splice(index, 1);
                }
            }
            
            // Atualizar o checkbox "Todas as colunas"
            atualizarCheckboxTodas();
            salvarPreferencias();
            atualizarTabela();
        });
    });
}

// Atualizar estado do checkbox "Todas as colunas"
function atualizarCheckboxTodas() {
    const checkTodas = document.getElementById('selectAllColumns');
    if (!checkTodas) return;

    const checkboxes = document.querySelectorAll('.coluna-checkbox');
    const todosMarcados = Array.from(checkboxes).every(checkbox => checkbox.checked);
    const algumMarcado = Array.from(checkboxes).some(checkbox => checkbox.checked);
    
    checkTodas.checked = todosMarcados;
    checkTodas.indeterminate = algumMarcado && !todosMarcados;
}

// Função para criar/atualizar a tabela
function criarTabela(dados) {
    const tabela = document.getElementById('tabela-dados');
    const thead = tabela.querySelector('thead tr');
    const tbody = tabela.querySelector('tbody');

    // Limpar conteúdo existente
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Criar cabeçalho com colunas selecionadas (excluindo colunas ocultas)
    const colunasParaExibir = colunasSelecionadas.filter(col => !colunasOcultas.includes(col));
    
    colunasParaExibir.forEach(coluna => {
        const th = document.createElement('th');
        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative';
        th.textContent = coluna;
        
        // Adicionar handle para redimensionamento - MELHORADO
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.addEventListener('mousedown', (e) => iniciarRedimensionamento(e, th));
        th.appendChild(resizeHandle);
        
        thead.appendChild(th);
    });

    // Criar linhas com dados das colunas selecionadas (excluindo colunas ocultas)
    if (dados.length > 0) {
        dados.forEach((item, index) => {
            const tr = document.createElement('tr');
            // Adicionar ID da linha para referência (usando o ID real do banco)
            if (item.id) {
                tr.dataset.rowId = item.id;
            } else {
                tr.dataset.index = index;
            }
            
            colunasParaExibir.forEach(coluna => {
                const td = document.createElement('td');
                td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 celula-editavel';
                td.textContent = item[coluna] || '';
                td.dataset.field = coluna;
                
                // Tornar célula editável
                td.addEventListener('click', (e) => {
                    if (e.target === td) {
                        iniciarEdicaoCelula(td);
                    }
                });
                
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    } else {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = colunasParaExibir.length;
        td.className = 'px-6 py-4 text-center text-gray-500';
        td.textContent = 'Nenhum dado disponível';
        tr.appendChild(td);
        tbody.appendChild(tr);
    }
    
    // Adicionar event listeners para redimensionamento - MELHORADO
    document.addEventListener('mousemove', redimensionarColuna);
    document.addEventListener('mouseup', pararRedimensionamento);
}

// Funções para redimensionamento de colunas - MELHORADO
function iniciarRedimensionamento(e, coluna) {
    isResizing = true;
    currentColumn = coluna;
    startX = e.pageX;
    startWidth = coluna.offsetWidth;
    
    // Adicionar classes para feedback visual
    document.body.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    coluna.style.userSelect = 'none';
    coluna.querySelector('.resize-handle').classList.add('active');
    
    e.preventDefault();
    e.stopPropagation();
}

function redimensionarColuna(e) {
    if (!isResizing || !currentColumn) return;
    
    const largura = startWidth + (e.pageX - startX);
    
    // Largura mínima muito reduzida para mais liberdade
    if (largura > 30) {
        currentColumn.style.width = `${largura}px`;
        
        // Aplicar a mesma largura a todas as células da coluna
        const indiceColuna = Array.from(currentColumn.parentNode.children).indexOf(currentColumn);
        const todasCelulas = document.querySelectorAll(`#tabela-dados td:nth-child(${indiceColuna + 1})`);
        todasCelulas.forEach(celula => {
            celula.style.width = `${largura}px`;
            celula.style.minWidth = `${largura}px`;
        });
    }
}

function pararRedimensionamento() {
    if (!isResizing) return;
    
    isResizing = false;
    if (currentColumn) {
        currentColumn.style.userSelect = '';
        currentColumn.querySelector('.resize-handle').classList.remove('active');
    }
    currentColumn = null;
    document.body.classList.remove('resizing');
    document.body.style.cursor = '';
}

// Funções para edição de células
function iniciarEdicaoCelula(celula) {
    // Verificar se já está editando
    if (celula.classList.contains('celula-editando')) return;
    
    const valorOriginal = celula.textContent;
    
    // Adicionar classe de edição
    celula.classList.add('celula-editando');
    
    // Criar input para edição
    const input = document.createElement('input');
    input.type = 'text';
    input.value = valorOriginal;
    input.className = 'w-full p-1 border-none bg-transparent focus:outline-none';
    
    // Limpar célula e adicionar input
    celula.textContent = '';
    celula.appendChild(input);
    input.focus();
    input.select();
    
    // Eventos do input
    input.addEventListener('blur', () => finalizarEdicao(celula, input, valorOriginal));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
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
    
    // Remover input e restaurar célula
    celula.removeChild(input);
    celula.textContent = novoValor;
    celula.classList.remove('celula-editando');
    
    // Verificar se houve alteração
    if (novoValor !== valorOriginal) {
        // Armazenar alteração - CORRIGIDO: usando rowId
        if (!dadosAlterados.has(idRegistro)) {
            dadosAlterados.set(idRegistro, { id: idRegistro });
        }
        dadosAlterados.get(idRegistro)[campo] = novoValor;
        
        // Destacar botão de salvar
        document.getElementById('btn1').classList.add('btn-salvar-alterado');
        
        // Destacar célula alterada temporariamente
        celula.style.backgroundColor = '#fef3c7';
        setTimeout(() => {
            celula.style.backgroundColor = '';
        }, 2000);
    }
}

// Função para salvar alterações no banco de dados - CORRIGIDA
async function salvarAlteracoes() {
    if (dadosAlterados.size === 0) {
        alert('Nenhuma alteração para salvar.');
        return;
    }
    
    try {
        // Mostrar indicador de salvamento
        const btnSalvar = document.getElementById('btn1');
        const textoOriginal = btnSalvar.textContent;
        btnSalvar.textContent = 'Salvando...';
        btnSalvar.disabled = true;
        
        // Converter Map para array
        const alteracoesArray = Array.from(dadosAlterados.values());
        
        console.log('Dados a serem salvos:', alteracoesArray);
        
        // Processar cada registro alterado
        for (let alteracao of alteracoesArray) {
            const { id, ...camposAlterados } = alteracao;
            
            console.log(`Atualizando registro ${id}:`, camposAlterados);
            
            const { error } = await supabase
                .from('candidatoSelecao')
                .update(camposAlterados)
                .eq('id', id);
            
            if (error) {
                console.error('Erro ao atualizar registro:', error);
                throw error;
            }
        }
        
        // Limpar alterações após salvar
        dadosAlterados.clear();
        
        // Restaurar botão
        btnSalvar.textContent = textoOriginal;
        btnSalvar.disabled = false;
        btnSalvar.classList.remove('btn-salvar-alterado');
        
        alert('Alterações salvas com sucesso!');
        
        // Recarregar dados para garantir sincronização
        carregarDadosSupabase();
        
    } catch (error) {
        console.error('Erro ao salvar alterações:', error);
        alert('Erro ao salvar alterações: ' + error.message);
        
        // Restaurar botão em caso de erro
        const btnSalvar = document.getElementById('btn1');
        btnSalvar.textContent = 'Salvar';
        btnSalvar.disabled = false;
    }
}

// Atualizar tabela com colunas selecionadas
function atualizarTabela() {
    if (dadosTabela) {
        criarTabela(dadosTabela);
    }
}

// Salvar e carregar preferências usando localStorage
function salvarPreferencias() {
    localStorage.setItem('colunasSelecionadas', JSON.stringify(colunasSelecionadas));
}

function carregarPreferencias() {
    const salvas = localStorage.getItem('colunasSelecionadas');
    if (salvas) {
        colunasSelecionadas = JSON.parse(salvas);
    }
}