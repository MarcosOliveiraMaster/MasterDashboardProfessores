// script.js — versão completa e corrigida (cole sobre o seu arquivo atual)

// ---------------- SUPABASE ----------------
const supabaseUrl = 'https://jfdcddxcfkrhgiozfxmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZGNkZHhjZmtyaGdpb3pmeG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTgxODgsImV4cCI6MjA3NDQ3NDE4OH0.BFnQDb6GdvbXvgQq3mB0Bt2u2551-QR4QT1RT6ZXfAE';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ---------------- GLOBAIS ----------------
let dadosTabela = null;
let colunasDisponiveis = [];
let colunasSelecionadas = [];
let dadosAlterados = new Map();
let colWidths = {}; // persistidas
let sortState = { column: null, dir: null }; // dir: 'asc' | 'desc'

const colunasOcultas = ['id'];
const tituloPrincipal = "Dashboard de Professores";
const subtitulo = "Ester Calazans: Administradora geral";

// ---------------- UTIL ----------------
function debounce(fn, wait = 160) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function carregarColWidths() {
  try {
    const s = localStorage.getItem('colWidths_v1');
    if (s) colWidths = JSON.parse(s);
  } catch (e) { colWidths = {}; }
}
function salvarColWidths() {
  try { localStorage.setItem('colWidths_v1', JSON.stringify(colWidths)); } catch (e) {}
}

function salvarPreferencias() { localStorage.setItem('colunasSelecionadas', JSON.stringify(colunasSelecionadas)); }
function carregarPreferencias() { const s = localStorage.getItem('colunasSelecionadas'); if (s) colunasSelecionadas = JSON.parse(s); }

// ---------------- INICIALIZAÇÃO ----------------
document.addEventListener('DOMContentLoaded', () => {
  const t = document.getElementById('tituloPrincipal');
  if (t) t.innerText = tituloPrincipal;
  const s = document.getElementById('subtitulo');
  if (s) s.innerText = subtitulo;
  carregarPreferencias();
  carregarColWidths();
  inicializarApp();
});

function inicializarApp() {
  // seções
  document.getElementById('btnSec1')?.addEventListener('click', () => trocarSecao(1));
  document.getElementById('btnSec2')?.addEventListener('click', () => trocarSecao(2));
  document.getElementById('btnSec3')?.addEventListener('click', () => trocarSecao(3));

  // listener nas checkboxes de categorias (caso estejam estáticas no HTML)
  document.querySelectorAll('input[name="filtroCategorias"]').forEach(cb => {
    cb.addEventListener('change', () => aplicarFiltros());
  });

  // dropdowns toggles
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
  document.getElementById('diasTurnosToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('diasTurnosMenu')?.classList.toggle('hidden');
  });

  // fechar menus clicando fora
  document.addEventListener('click', (e) => {
    const menus = [
      { btn: 'dropdownToggle', menu: 'dropdownMenu' },
      { btn: 'disciplinasToggle', menu: 'disciplinasMenu' },
      { btn: 'categoriasToggle', menu: 'categoriasMenu' },
      { btn: 'diasTurnosToggle', menu: 'diasTurnosMenu' }
    ];
    menus.forEach(({btn, menu}) => {
      const b = document.getElementById(btn);
      const m = document.getElementById(menu);
      if (!m || !b) return;
      if (!m.classList.contains('hidden') && !m.contains(e.target) && !b.contains(e.target)) {
        m.classList.add('hidden');
      }
    });
  });

  // montar dias/turnos
  montarDiasTurnos();

  // botões principais
  document.getElementById('btn1')?.addEventListener('click', salvarAlteracoes);
  document.getElementById('limparBusca')?.addEventListener('click', limparFiltros);

  // filtros texto
  const inputNome = document.getElementById('filtroNome');
  const inputBairro = document.getElementById('filtroBairro');
  const aplicarDebounced = debounce(() => aplicarFiltros(), 160);
  inputNome?.addEventListener('input', aplicarDebounced);
  inputBairro?.addEventListener('input', aplicarDebounced);

  // redimensionamento global
  document.addEventListener('mousemove', redimensionarColuna);
  document.addEventListener('mouseup', pararRedimensionamento);

  // carregar dados
  carregarDadosSupabase();
}

function trocarSecao(id) {
  ['secao1','secao2','secao3'].forEach(s => document.getElementById(s)?.classList.add('hidden'));
  document.getElementById(`secao${id}`)?.classList.remove('hidden');
}

// ---------------- CARREGAR DADOS ----------------
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
      aplicarFiltros();
    } else {
      dadosTabela = [];
      const tbody = document.querySelector('#tabela-dados tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="100%" class="px-6 py-4 text-center text-gray-500">Nenhum dado encontrado</td></tr>';
    }
  } catch (err) {
    console.error('Erro carregar dados:', err);
    const tbody = document.querySelector('#tabela-dados tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="100%" class="px-6 py-4 text-center text-red-500">Erro ao carregar dados</td></tr>';
  }
}
function showLoadingState() {
  const tbody = document.querySelector('#tabela-dados tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="100%" class="px-6 py-4 text-center text-gray-500">Carregando dados...</td></tr>';
}

// ---------------- DROPDOWN COLUNAS ----------------
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
    input.className = 'coluna-checkbox rounded border-gray-300 text-orange-600 shadow-sm';
    input.value = coluna;
    input.checked = colunasSelecionadas.includes(coluna);

    input.addEventListener('change', () => {
      colunasSelecionadas = Array.from(document.querySelectorAll('.coluna-checkbox:checked')).map(i => i.value);
      // atualizar selectAll se existir
      const selectAll = document.getElementById('selectAllColumns');
      if (selectAll) {
        selectAll.checked = colunasSelecionadas.length === colunasDisponiveis.length;
        selectAll.indeterminate = colunasSelecionadas.length > 0 && colunasSelecionadas.length < colunasDisponiveis.length;
      }
      salvarPreferencias();
      aplicarFiltros();
    });

    const span = document.createElement('span');
    span.className = 'ml-2 truncate';
    span.textContent = coluna;

    label.appendChild(input);
    label.appendChild(span);
    div.appendChild(label);
    columnsList.appendChild(div);
  });

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
}

// ---------------- TABELA (renderização) ----------------
function criarTabela(dados) {
  const tabela = document.getElementById('tabela-dados');
  if (!tabela) return;
  const thead = tabela.querySelector('thead tr');
  const tbody = tabela.querySelector('tbody');

  thead.innerHTML = '';
  tbody.innerHTML = '';

  const colunasParaExibir = colunasSelecionadas.filter(col => !colunasOcultas.includes(col));

  // Cabeçalho com resize handle e sort
  colunasParaExibir.forEach(coluna => {
    const th = document.createElement('th');
    th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative';
    th.dataset.col = coluna;

    if (isDateColumnName(coluna)) {
      const btn = document.createElement('button');
      btn.className = 'text-left w-full flex items-center justify-between gap-2';
      const span = document.createElement('span');
      span.textContent = coluna;
      const icon = document.createElement('span');
      icon.className = 'sort-icon';
      icon.innerHTML = getSortIconMarkup(sortState.column === coluna ? sortState.dir : null);
      btn.appendChild(span);
      btn.appendChild(icon);
      btn.addEventListener('click', (e) => { e.stopPropagation(); toggleSort(coluna); });
      th.appendChild(btn);
    } else {
      th.textContent = coluna;
      th.addEventListener('click', () => toggleSort(coluna));
    }

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.right = '0';
    resizeHandle.style.top = '0';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.width = '6px';
    resizeHandle.style.cursor = 'col-resize';
    resizeHandle.addEventListener('mousedown', (e) => iniciarRedimensionamento(e, th));
    th.appendChild(resizeHandle);

    if (colWidths && colWidths[coluna]) {
      th.style.width = colWidths[coluna] + 'px';
      th.style.minWidth = '40px';
    }

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
        td.dataset.field = coluna;

        if (isDateColumnName(coluna)) {
          const raw = getFieldValue(item, coluna);
          td.textContent = formatDateForDisplay(raw);
        } else {
          const v = getFieldValue(item, coluna);
          td.textContent = (v !== undefined && v !== null) ? String(v) : '';
        }

        td.addEventListener('click', (e) => {
          if (e.target === td) iniciarEdicaoCelula(td);
        });

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    // Aplicar larguras das th nas td (coerência)
    const ths = Array.from(tabela.querySelectorAll('thead th'));
    ths.forEach((th, i) => {
      const w = th.offsetWidth;
      document.querySelectorAll(`#tabela-dados td:nth-child(${i+1})`).forEach(td => {
        if (th.style.width) {
          td.style.width = th.style.width;
        } else {
          td.style.width = 'auto';
        }
        td.style.wordBreak = 'break-word';
        td.style.whiteSpace = 'normal';
      });
    });
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

// MOBILE: Toggle menu sanduíche
(function() {
  const btn = document.getElementById('menuToggle');
    const nav = document.getElementById('mobileNav');
      if (!btn || !nav) return;

        btn.addEventListener('click', () => {
            const opened = btn.classList.toggle('active');
                nav.classList.toggle('hidden', !opened);
                    btn.setAttribute('aria-expanded', opened ? 'true' : 'false');
                        nav.setAttribute('aria-hidden', opened ? 'false' : 'true');
                          });

                            // navegação por seção via mobile
                              nav.querySelectorAll('.nav-section-btn').forEach(b => {
                                  b.addEventListener('click', (e) => {
                                        const target = e.currentTarget.dataset.target;
                                              if (target && window.formApp) {
                                                      // fecha menu e vai para seção
                                                              btn.classList.remove('active');
                                                                      nav.classList.add('hidden');
                                                                              btn.setAttribute('aria-expanded','false');
                                                                                      nav.setAttribute('aria-hidden','true');
                                                                                              window.formApp.showSection(Number(target.replace('section','')));
                                                                                                    }
                                                                                                        });
                                                                                                          });

                                                                                                            // Fecha o menu ao tocar fora (melhora UX)
                                                                                                              document.addEventListener('click', (e) => {
                                                                                                                  if (!nav.contains(e.target) && !btn.contains(e.target)) {
                                                                                                                        nav.classList.add('hidden');
                                                                                                                              btn.classList.remove('active');
                                                                                                                                    btn.setAttribute('aria-expanded','false');
                                                                                                                                          nav.setAttribute('aria-hidden','true');
                                                                                                                                              }
                                                                                                                                                });
                                                                                                                                                })();

                                                                                                                                                // FILTROS: limpar filtros e view lists
                                                                                                                                                (function(){
                                                                                                                                                  const limpar = document.getElementById('btnLimparFiltros');
                                                                                                                                                    const view = document.getElementById('btnViewLists');
                                                                                                                                                      if (limpar) {
                                                                                                                                                          limpar.addEventListener('click', () => {
                                                                                                                                                                // zera inputs/selects dentro de #filtrosContainer
                                                                                                                                                                      const container = document.getElementById('filtrosContainer');
                                                                                                                                                                            if (!container) return;
                                                                                                                                                                                  container.querySelectorAll('input, select').forEach(i => {
                                                                                                                                                                                          if (i.type === 'checkbox' || i.type === 'radio') i.checked = false;
                                                                                                                                                                                                  else i.value = '';
                                                                                                                                                                                                        });
                                                                                                                                                                                                              // opcional: disparar atualização/filtragem
                                                                                                                                                                                                                    const evt = new Event('filtersCleared');
                                                                                                                                                                                                                          container.dispatchEvent(evt);
                                                                                                                                                                                                                              });
                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                  if (view) {
                                                                                                                                                                                                                                      view.addEventListener('click', () => {
                                                                                                                                                                                                                                            // Toggle visualização das listas — você decide: abrir modal, slide, ou simples toggle de classe
                                                                                                                                                                                                                                                  document.body.classList.toggle('show-lists');
                                                                                                                                                                                                                                                        // opcional: emitir evento
                                                                                                                                                                                                                                                              document.dispatchEvent(new Event('toggleViewLists'));
                                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                    })();

// ---------------- REDIMENSIONAMENTO ----------------
let isResizing = false;
let currentColumn = null;
let startX = 0;
let startWidth = 0;

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
    const colName = currentColumn.dataset.col;
    if (colName) {
      colWidths[colName] = Math.round(largura);
      salvarColWidths();
    }
    const indiceCol = Array.from(currentColumn.parentNode.children).indexOf(currentColumn);
    const todasCelulas = document.querySelectorAll(`#tabela-dados td:nth-child(${indiceCol + 1})`);
    todasCelulas.forEach(celula => {
      celula.style.width = `${largura}px`;
      celula.style.whiteSpace = 'normal';
      celula.style.wordBreak = 'break-word';
      celula.style.overflow = '';
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

// ---------------- EDIÇÃO INLINE ----------------
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

  // limpar input
  celula.removeChild(input);
  celula.textContent = novoValor;
  celula.classList.remove('celula-editando');

  if (novoValor !== valorOriginal) {
    if (!dadosAlterados.has(idRegistro)) dadosAlterados.set(idRegistro, { id: idRegistro });
    dadosAlterados.get(idRegistro)[campo] = novoValor;

    // Atualiza dadosTabela local
    if (dadosTabela) {
      const idx = dadosTabela.findIndex(d => String(d.id) === String(idRegistro));
      if (idx > -1) dadosTabela[idx][campo] = novoValor;
    }

    const btnSalvar = document.getElementById('btn1');
    if (btnSalvar) btnSalvar.classList.add('btn-salvar-alterado');
    if (btnSalvar) btnSalvar.textContent = 'Salvar*';
    celula.style.backgroundColor = '#fef3c7';
    setTimeout(() => celula.style.backgroundColor = '', 1400);
  }
}

// ---------------- SALVAR ALTERAÇÕES ----------------
async function salvarAlteracoes() {
  if (dadosAlterados.size === 0) {
    alert('Nenhuma alteração para salvar.');
    return;
  }
  try {
    const btnSalvar = document.getElementById('btn1');
    const textoOrig = btnSalvar ? btnSalvar.textContent : 'Salvar';
    if (btnSalvar) { btnSalvar.textContent = 'Salvando...'; btnSalvar.disabled = true; }

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
    if (btnSalvar) { btnSalvar.classList.remove('btn-salvar-alterado'); btnSalvar.textContent = textoOrig; btnSalvar.disabled = false; }
    alert('Alterações salvas com sucesso!');
    carregarDadosSupabase();
  } catch (err) {
    console.error('Erro salvar:', err);
    alert('Erro ao salvar alterações: ' + (err.message || JSON.stringify(err)));
    const btnSalvar = document.getElementById('btn1');
    if (btnSalvar) { btnSalvar.textContent = 'Salvar'; btnSalvar.disabled = false; }
  }
}

// ---------------- FILTROS ----------------
function aplicarFiltros() {
  if (!dadosTabela) return;
  let resultado = [...dadosTabela];

  const nomeValor = (document.getElementById('filtroNome')?.value || '').trim().toLowerCase();
  const bairroValor = (document.getElementById('filtroBairro')?.value || '').trim().toLowerCase();

  if (nomeValor) {
    resultado = resultado.filter(item => {
      // checar possíveis campos de nome
      const campo = String(getFieldValue(item, 'nome') || getFieldValue(item, 'Nome') || getFieldValue(item, 'nomeCompleto') || getFieldValue(item, 'NomeCompleto') || '').toLowerCase();
      return campo.includes(nomeValor);
    });
  }

  if (bairroValor) {
    resultado = resultado.filter(item => {
      const campo = String(getFieldValue(item, 'bairros') || getFieldValue(item, 'bairro') || '').toLowerCase();
      return campo.includes(bairroValor);
    });
  }

  // turnos/dias
  const turnosSelecionados = Array.from(document.querySelectorAll('input[name="turnos"]:checked')).map(i => i.value);
  if (turnosSelecionados.length > 0) {
    resultado = resultado.filter(item => {
      return turnosSelecionados.some(chave => {
        const v = getFieldValue(item, chave);
        return isTruthyValue(v);
      });
    });
  }

  // disciplinas (AND)
  const disciplinasSelecionadas = Array.from(document.querySelectorAll('input[name="filtroDisciplinas"]:checked')).map(i => normalizeStr(i.value));
  if (disciplinasSelecionadas.length > 0) {
    resultado = resultado.filter(item => {
      const raw = getFieldValue(item, 'disciplinas') || getFieldValue(item, 'Disciplinas') || getFieldValue(item, 'disciplina') || getFieldValue(item, 'disciplinas_list') || '';
      let lista = [];
      if (Array.isArray(raw)) lista = raw.map(x => normalizeStr(String(x)));
      else if (typeof raw === 'string') lista = raw.split(/[,;|]/).map(s => normalizeStr(s)).filter(Boolean);
      else lista = [normalizeStr(String(raw))];
      return disciplinasSelecionadas.every(d => lista.includes(d));
    });
  }

  // CATEGORIAS: procurar "sim" explicitamente nas colunas selecionadas
  const categoriasSelecionadas = Array.from(document.querySelectorAll('input[name="filtroCategorias"]:checked')).map(i => i.value);
  if (categoriasSelecionadas.length > 0) {
    resultado = resultado.filter(item => {
      return categoriasSelecionadas.some(coluna => {
        // coluna é esperada como 'expTdics' ou 'expAulas' ou 'expNeuro'
        const v = getFieldValue(item, coluna);
        return valueIsSim(v);
      });
    });
  }

  // Ordenação se houver sortState
  if (sortState.column) {
    resultado.sort((a, b) => {
      const av = getFieldValue(a, sortState.column);
      const bv = getFieldValue(b, sortState.column);
      if (isDateColumnName(sortState.column)) {
        const da = parseDateToMs(av);
        const db = parseDateToMs(bv);
        return sortState.dir === 'asc' ? (da - db) : (db - da);
      }
      const sa = (av === undefined || av === null) ? '' : String(av).toLowerCase();
      const sb = (bv === undefined || bv === null) ? '' : String(bv).toLowerCase();
      if (sa < sb) return sortState.dir === 'asc' ? -1 : 1;
      if (sa > sb) return sortState.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  criarTabela(resultado);
}

// ----------------- getFieldValue robusto -----------------
function getFieldValue(item, chave) {
  if (!item || !chave) return undefined;
  // Prefer exact key
  if (Object.prototype.hasOwnProperty.call(item, chave)) return item[chave];
  // variations
  const attempts = [
    chave,
    chave.charAt(0).toLowerCase() + chave.slice(1),
    chave.charAt(0).toUpperCase() + chave.slice(1),
    chave.toLowerCase(),
    chave.replace(/[A-Z]/g, m => '_' + m.toLowerCase()).toLowerCase(),
    chave.replace(/[^a-zA-Z0-9]/g, '')
  ];
  for (const k of attempts) if (Object.prototype.hasOwnProperty.call(item, k)) return item[k];
  // normalized exact match
  const targetNorm = String(chave).toLowerCase().replace(/[^a-z0-9]/g, '');
  const keys = Object.keys(item);
  for (const k of keys) {
    const kn = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (kn === targetNorm) return item[k];
  }
  // contains
  for (const k of keys) {
    const kn = String(k).toLowerCase();
    if (kn.includes(String(chave).toLowerCase())) return item[k];
  }
  return undefined;
}

// ----------------- Helpers de verificação -----------------
function isTruthyValue(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v === true;
  if (typeof v === 'number') return v === 1;
  if (Array.isArray(v)) return v.some(x => isTruthyValue(x));
  const s = String(v).toLowerCase().trim();
  if (!s) return false;
  if (['true','1','on','yes','sim','s'].includes(s)) return true;
  const tokens = s.split(/[,;|\/\s]+/).map(t => t.trim()).filter(Boolean);
  if (tokens.some(t => ['true','1','on','yes','sim','s'].includes(t))) return true;
  if (/\b(sim)\b/.test(s)) return true;
  return false;
}
function checkTruthy(v) { return isTruthyValue(v); }

function valueIsSim(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v === true;
  if (typeof v === 'number') return v === 1;
  if (Array.isArray(v)) return v.some(x => valueIsSim(x));
  const s = String(v).toLowerCase().trim();
  if (!s) return false;
  const synonyms = ['sim','s','true','1','on','yes'];
  if (synonyms.includes(s)) return true;
  const tokens = s.split(/[,;|\/\s]+/).map(t => t.trim()).filter(Boolean);
  if (tokens.some(t => synonyms.includes(t))) return true;
  if (/\b(sim)\b/.test(s)) return true;
  return false;
}

// ----------------- limpar filtros -----------------
function limparFiltros() {
  ['filtroNome','filtroBairro'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.querySelectorAll('input[name="filtroDisciplinas"]').forEach(i => i.checked = false);
  document.querySelectorAll('input[name="filtroCategorias"]').forEach(i => i.checked = false);
  // limpar dias/turnos
  document.querySelectorAll('#diasTurnosContainer input[type="checkbox"]').forEach(i => i.checked = false);
  document.querySelectorAll('.subturnos').forEach(el => el.classList.add('hidden'));
  aplicarFiltros();
}

// ----------------- Utils -----------------
function normalizeStr(s) {
  return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function isDateColumnName(name) {
  if (!name) return false;
  const k = name.toLowerCase();
  return k.includes('data') || k.includes('cadastro') || k.includes('data_cadastro') || k.includes('datacadastro');
}
function formatDateForDisplay(raw) {
  if (!raw) return '';
  const ms = parseDateToMs(raw);
  if (!ms) return String(raw);
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const weekday = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()];
  return `${dd}/${mm}/${yyyy} - ${weekday}`;
}
function parseDateToMs(raw) {
  if (!raw) return null;
  if (typeof raw === 'number') return raw;
  if (!isNaN(Number(raw))) return Number(raw);
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.getTime();
}

// ----------------- Ordenação -----------------
function toggleSort(coluna) {
  if (sortState.column !== coluna) {
    sortState.column = coluna;
    sortState.dir = 'asc';
  } else {
    if (sortState.dir === 'asc') sortState.dir = 'desc';
    else if (sortState.dir === 'desc') { sortState.column = null; sortState.dir = null; }
    else sortState.dir = 'asc';
  }
  aplicarFiltros();
}
function getSortIconMarkup(dir) {
  if (!dir) {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5 5 5M7 13l5 5 5-5" /></svg>`;
  }
  if (dir === 'asc') {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>`;
}

// ----------------- Dias e Turnos UI -----------------
function montarDiasTurnos() {
  const diasTurnosContainer = document.getElementById('diasTurnosContainer');
  if (!diasTurnosContainer) return;
  diasTurnosContainer.innerHTML = '';
  const dias = [
    { name: 'Segunda', key: 'seg' },
    { name: 'Terça', key: 'ter' },
    { name: 'Quarta', key: 'qua' },
    { name: 'Quinta', key: 'qui' },
    { name: 'Sexta', key: 'sex' },
    { name: 'Sábado', key: 'sab' },
  ];
  dias.forEach(d => {
    const divDia = document.createElement('div');
    divDia.className = 'dia-checkbox';
    const inputDia = document.createElement('input');
    inputDia.type = 'checkbox';
    inputDia.id = `chk_${d.key}`;
    inputDia.value = d.key;
    const labelDia = document.createElement('label');
    labelDia.htmlFor = inputDia.id;
    labelDia.textContent = d.name;
    divDia.appendChild(inputDia);
    divDia.appendChild(labelDia);
    diasTurnosContainer.appendChild(divDia);

    const subDiv = document.createElement('div');
    subDiv.className = 'subturnos hidden';
    subDiv.id = `sub_${d.key}`;
    const manhaId = `turno_${d.key}Manha`;
    const tardeId = `turno_${d.key}Tarde`;
    subDiv.innerHTML = `
      <label><input type="checkbox" name="turnos" id="${manhaId}" value="${d.key}Manha"> Manhã</label>
      <label><input type="checkbox" name="turnos" id="${tardeId}" value="${d.key}Tarde"> Tarde</label>
    `;
    diasTurnosContainer.appendChild(subDiv);

    inputDia.addEventListener('change', () => {
      if (inputDia.checked) subDiv.classList.remove('hidden');
      else { subDiv.classList.add('hidden'); subDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false); }
      aplicarFiltros();
    });

    subDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', ()   => {
        if (cb.checked && !inputDia.checked) {
          inputDia.checked = true;
          subDiv.classList.remove('hidden');
        }
        aplicarFiltros();
      });
    });
  });
}
