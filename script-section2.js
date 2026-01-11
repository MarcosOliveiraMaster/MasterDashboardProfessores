// script-section2.js
// Versão corrigida — Com inicialização do Supabase

// INICIALIZAÇÃO DO SUPABASE (ADICIONADA)
const supabaseUrl = 'https://jfdcddxcfkrhgiozfxmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZGNkZHhjZmtyaGdpb3pmeG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTgxODgsImV4cCI6MjA3NDQ3NDE4OH0.BFnQDb6GdvbXvgQq3mB0Bt2u2551-QR4QT1RT6ZXfAE';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

(() => {
  const TABLE_NAME = 'candidatoSelecao';
  const GRID_WRAPPER_ID = 'grid-perfis-wrapper';
  const GRID_ID = 'grid-perfis';
  const PANEL_WRAPPER_ID = 'panel-ficha-wrapper';
  const PANEL_FIELDS_ID = 'perfil-campos';
  const TITLE_ID = 'perfil-nome-titulo';
  const BTN_SALVAR_ID = 'perfil-salvar';
  const BTN_VOLTA_ID = 'perfil-voltar';
  const IMG_FOLDER = 'img/pasta.png';

  let registros = [];
  let selecionado = null;
  let chavePrimaria = null; // nome do campo ID real detectado
  let selecionadoId = null; // valor do ID selecionado

  const el = (id) => document.getElementById(id);
  const safe = (v) => (v == null ? '' : String(v));

  // ------------------- LAYOUT -------------------
  function prepararLayout() {
    const grid = el(GRID_WRAPPER_ID);
    const painel = el(PANEL_WRAPPER_ID);
    if (!grid || !painel) return;

    [grid, painel].forEach((sec) => {
      sec.style.position = 'absolute';
      sec.style.top = '0';
      sec.style.left = '0';
      sec.style.width = '100%';
      sec.style.height = '100%';
      sec.style.minHeight = '100%';
      sec.style.overflowY = 'auto';
      sec.style.transition = 'opacity 0.3s ease-in-out';
    });

    grid.style.display = 'flex';
    grid.style.flexDirection = 'column';
    painel.style.display = 'none';
  }

  function mostrarGrid() {
    el(PANEL_WRAPPER_ID).style.display = 'none';
    el(GRID_WRAPPER_ID).style.display = 'flex';
  }

  function mostrarPainel() {
    el(GRID_WRAPPER_ID).style.display = 'none';
    const painel = el(PANEL_WRAPPER_ID);
    painel.style.display = 'flex';
    painel.style.flexDirection = 'column';
  }

  // ------------------- GRID -------------------
  function criarCard(item) {
    const card = document.createElement('div');
    card.className =
      'flex flex-col items-center justify-center bg-white p-6 rounded-xl shadow hover:shadow-lg cursor-pointer transition-all border border-gray-100';
    card.style.minHeight = '160px';
    card.style.width = '100%';

    // detecta campo de id e salva
    const idKey = chavePrimaria || detectarCampoId(item);
    const idValor = item[idKey];
    card.dataset.id = idValor;

    const img = document.createElement('img');
    img.src = IMG_FOLDER;
    img.alt = 'Pasta';
    img.className = 'w-20 h-20 object-contain mb-2';
    img.onerror = () => {
      img.remove();
      const fallback = document.createElement('div');
      fallback.textContent = '📁';
      fallback.style.fontSize = '48px';
      fallback.className = 'mb-2';
      card.prepend(fallback);
    };

    const nome = document.createElement('p');
    nome.className =
      'text-center text-sm font-medium text-gray-700 truncate w-full';
    nome.textContent =
      safe(item.nome) || safe(item.Nome) || 'Sem nome';

    card.appendChild(img);
    card.appendChild(nome);

    card.addEventListener('click', () => {
      selecionado = item;
      selecionadoId = idValor;
      chavePrimaria = idKey;
      console.log('📌 Card clicado:', { idKey, idValor, item });
      abrirPainel(item);
    });

    return card;
  }

  function renderGrid() {
    const grid = el(GRID_ID);
    if (!grid) return;
    grid.innerHTML = '';

    if (registros.length === 0) {
      grid.innerHTML =
        '<div class="col-span-4 text-center text-gray-500 py-8">Nenhum registro encontrado</div>';
      return;
    }

    registros.forEach((r) => grid.appendChild(criarCard(r)));
  }

  // ------------------- PAINEL -------------------
  function abrirPainel(item) {
    mostrarPainel();

    const titulo = el(TITLE_ID);
    if (titulo)
      titulo.textContent =
        safe(item.nome) || safe(item.Nome) || 'Perfil';

    const container = el(PANEL_FIELDS_ID);
    container.innerHTML = '';

    const keys = Object.keys(item).filter((k) => k !== chavePrimaria);

    keys.forEach((chave) => {
      const val = safe(item[chave]);
      const div = document.createElement('div');
      div.className = 'flex flex-col gap-1';

      const label = document.createElement('label');
      label.textContent = chave;
      label.className = 'text-xs text-gray-600';

      const input =
        val.length > 80 || val.includes('\n')
          ? document.createElement('textarea')
          : document.createElement('input');

      input.value = val;
      input.dataset.field = chave;
      input.className =
        'w-full border border-gray-300 rounded-md p-2 text-sm';

      div.appendChild(label);
      div.appendChild(input);
      container.appendChild(div);
    });
  }

  // ------------------- UPDATE -------------------
  async function salvarAlteracoes() {
    if (!selecionado || !selecionadoId || !chavePrimaria) {
      alert('Nenhum registro selecionado corretamente.');
      console.error('⛔ Falha ao salvar: ID não definido.', {
        selecionado,
        selecionadoId,
        chavePrimaria,
      });
      return;
    }

    const container = el(PANEL_FIELDS_ID);
    const inputs = Array.from(container.querySelectorAll('input, textarea'));

    const dadosAtualizados = {};
    inputs.forEach((i) => {
      if (i.dataset.field) {
        dadosAtualizados[i.dataset.field] = i.value;
      }
    });

    console.log('🔹 Tentando atualizar:', {
      tabela: TABLE_NAME,
      campoId: chavePrimaria,
      id: selecionadoId,
      payload: dadosAtualizados,
    });

    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(dadosAtualizados)
        .eq(chavePrimaria, selecionadoId)
        .select();

      if (error) {
        console.error('❌ Erro Supabase:', error);
        alert('Erro Supabase: ' + error.message);
        return;
      }

      if (!data || data.length === 0) {
        alert(
          `⚠️ Nenhum registro atualizado. Verifique se ${chavePrimaria}=${selecionadoId} existe na tabela.`
        );
        return;
      }

      console.log('✅ Update bem-sucedido:', data);
      alert('Alterações salvas com sucesso.');
      mostrarGrid();
      // Recarrega os dados atualizados do Supabase
      carregarRegistros();
    } catch (err) {
      console.error('Erro inesperado:', err);
      alert('Erro ao salvar: ' + err.message);
    }
  }

  // ------------------- SUPABASE -------------------
  async function carregarRegistros() {
    try {
      const { data, error } = await supabase.from(TABLE_NAME).select('*');
      if (error) throw error;
      registros = data || [];

      // detecta automaticamente o nome do campo de ID
      if (registros.length > 0) {
        chavePrimaria = detectarCampoId(registros[0]);
        console.log('🧭 Campo de ID detectado:', chavePrimaria);
      }

      renderGrid();
    } catch (err) {
      console.error('Erro ao carregar registros:', err);
    }
  }

  // ------------------- FUNÇÃO DE DETECÇÃO DE ID -------------------
  function detectarCampoId(obj) {
    if (!obj) return 'id';
    const chaves = Object.keys(obj);
    const possiveis = ['id', 'ID', 'uuid', 'Uuid', 'codigo', 'codigo_id', 'id_professor'];
    const match = chaves.find((k) =>
      possiveis.includes(k.trim().toLowerCase())
    );
    return match || 'id';
  }

  // ------------------- INIT -------------------
  function init() {
    prepararLayout();
    carregarRegistros();

    const btnVoltar = el(BTN_VOLTA_ID);
    if (btnVoltar) btnVoltar.onclick = mostrarGrid;

    const btnSalvar = el(BTN_SALVAR_ID);
    if (btnSalvar) btnSalvar.onclick = salvarAlteracoes;

    mostrarGrid();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();