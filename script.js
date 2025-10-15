
// script.js — versão consolidada com todas as funções anteriores e novas implementações (CPF + cópia universal + ajustes visuais)

const supabaseUrl = 'https://jfdcddxcfkrhgiozfxmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmZGNkZHhjZmtyaGdpb3pmeG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTgxODgsImV4cCI6MjA3NDQ3NDE4OH0.BFnQDb6GdvbXvgQq3mB0Bt2u2551-QR4QT1RT6ZXfAE';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let dadosTabela = null;
let colunasDisponiveis = [];
let colunasSelecionadas = [];
let dadosAlterados = new Map();
let colWidths = {};
let sortState = { column: null, dir: null };

const colunasOcultas = ['id'];
const colunasDiasTurnos = ['segManha','segTarde','terManha','terTarde','quaManha','quaTarde','quiManha','quiTarde','sexManha','sexTarde','sabManha','sabTarde'];
const tituloPrincipal = "Dashboard de Professores";
const subtitulo = "Ester Calazans: Administradora geral";

document.addEventListener('DOMContentLoaded', () => {
  const t = document.getElementById('tituloPrincipal');
  if (t) t.innerText = tituloPrincipal;
  const s = document.getElementById('subtitulo');
  if (s) s.innerText = subtitulo;
  carregarPreferencias();
  carregarColWidths();
  inicializarApp();
});

function carregarPreferencias() {
  const s = localStorage.getItem('colunasSelecionadas');
  if (s) colunasSelecionadas = JSON.parse(s);
}
function salvarPreferencias() {
  localStorage.setItem('colunasSelecionadas', JSON.stringify(colunasSelecionadas));
}
function carregarColWidths() {
  try {
    const s = localStorage.getItem('colWidths_v1');
    if (s) colWidths = JSON.parse(s);
  } catch { colWidths = {}; }
}
function salvarColWidths() {
  try { localStorage.setItem('colWidths_v1', JSON.stringify(colWidths)); } catch {}
}

function inicializarApp() {
  document.getElementById('btnSec1')?.addEventListener('click', () => trocarSecao(1));
  document.getElementById('btnSec2')?.addEventListener('click', () => trocarSecao(2));
  document.getElementById('btnSec3')?.addEventListener('click', () => trocarSecao(3));

  document.querySelectorAll('input[name="filtroDisciplinas"]').forEach(cb => cb.addEventListener('change', aplicarFiltros));
  document.querySelectorAll('input[name="filtroCategorias"]').forEach(cb => cb.addEventListener('change', aplicarFiltros));

  ['dropdown','disciplinas','categorias','diasTurnos'].forEach(id => {
    const toggle = document.getElementById(id+'Toggle');
    const menu = document.getElementById(id+'Menu');
    if (toggle && menu) {
      toggle.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('hidden'); });
    }
  });

  document.addEventListener('click', e => {
    ['dropdown','disciplinas','categorias','diasTurnos'].forEach(id => {
      const toggle = document.getElementById(id+'Toggle');
      const menu = document.getElementById(id+'Menu');
      if (menu && toggle && !menu.contains(e.target) && !toggle.contains(e.target)) menu.classList.add('hidden');
    });
  });

  montarDiasTurnos();
  document.getElementById('btn1')?.addEventListener('click', salvarAlteracoes);
  document.getElementById('limparBusca')?.addEventListener('click', limparFiltros);

  const aplicarDebounced = debounce(() => aplicarFiltros(), 160);
  document.getElementById('filtroNome')?.addEventListener('input', aplicarDebounced);
  document.getElementById('filtroBairro')?.addEventListener('input', aplicarDebounced);

  document.addEventListener('mousemove', redimensionarColuna);
  document.addEventListener('mouseup', pararRedimensionamento);

  carregarDadosSupabase();
}

function trocarSecao(id) {
  ['secao1','secao2','secao3'].forEach(s => document.getElementById(s)?.classList.add('hidden'));
  document.getElementById('secao'+id)?.classList.remove('hidden');
}

// ---------------------- CPF formatter ----------------------
function formatarCPF(valor) {
  if (!valor) return '';
  const numeros = String(valor).replace(/\D/g, '');
  if (numeros.length === 11) return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return valor;
}

// ---------------------- Funções de cópia ----------------------
function copiarConteudo(texto) {
  if (!texto) return;
  navigator.clipboard.writeText(texto).then(() => mostrarPopup('Conteúdo copiado!'));
}
function copiarEmail(email) {
  navigator.clipboard.writeText(email).then(() => mostrarPopup('E-mail copiado!'));
}
function mostrarPopup(msg) {
  const p = document.createElement('div');
  p.textContent = msg;
  p.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 text-white px-6 py-3 rounded-lg z-50 transition-opacity duration-300';
  document.body.appendChild(p);
  setTimeout(() => { p.style.opacity='0'; setTimeout(()=>p.remove(),300); },1200);
}

// ---------------------- Carregar dados ----------------------
async function carregarDadosSupabase() {
  const tbody = document.querySelector('#tabela-dados tbody');
  tbody.innerHTML = '<tr><td colspan="100%" class="text-center py-4 text-gray-500">Carregando...</td></tr>';
  const { data, error } = await supabase.from('candidatoSelecao').select('*');
  if (error) {
    tbody.innerHTML = '<tr><td class="text-center text-red-500">Erro ao carregar</td></tr>';
    return;
  }
  dadosTabela = data;
  const todas = Object.keys(data[0]);
  colunasDisponiveis = todas.filter(c => !colunasOcultas.includes(c) && !colunasDiasTurnos.includes(c));
  colunasDisponiveis.push('Disponibilidade');
  if (colunasSelecionadas.length === 0) colunasSelecionadas = [...colunasDisponiveis];
  criarDropdownColunas();
  aplicarFiltros();
}

function criarDropdownColunas() {
  const list = document.getElementById('columnsList');
  list.innerHTML = '';
  colunasDisponiveis.forEach(col => {
    const div = document.createElement('div');
    div.className = 'px-4 py-2 text-sm text-gray-700 hover:bg-gray-100';
    const label = document.createElement('label');
    label.className = 'inline-flex items-center w-full cursor-pointer';
    const input = document.createElement('input');
    input.type='checkbox'; input.className='coluna-checkbox'; input.value=col;
    input.checked = colunasSelecionadas.includes(col);
    input.addEventListener('change',()=>{
      colunasSelecionadas = Array.from(document.querySelectorAll('.coluna-checkbox:checked')).map(i=>i.value);
      salvarPreferencias(); aplicarFiltros();
    });
    const span=document.createElement('span'); span.textContent=col; span.className='ml-2 truncate';
    label.appendChild(input); label.appendChild(span); div.appendChild(label); list.appendChild(div);
  });
}

function aplicarFiltros() {
  if (!dadosTabela) return;
  let resultado = [...dadosTabela];
  const nome = (document.getElementById('filtroNome')?.value||'').toLowerCase();
  const bairro = (document.getElementById('filtroBairro')?.value||'').toLowerCase();
  if (nome) resultado = resultado.filter(r=>String(getFieldValue(r,'nome')||'').toLowerCase().includes(nome));
  if (bairro) resultado = resultado.filter(r=>String(getFieldValue(r,'bairro')||'').toLowerCase().includes(bairro));
  criarTabela(resultado);
}

function criarTabela(dados) {
  const thead=document.querySelector('#tabela-dados thead tr');
  const tbody=document.querySelector('#tabela-dados tbody');
  thead.innerHTML=''; tbody.innerHTML='';
  const colunas = colunasSelecionadas.filter(c=>!colunasOcultas.includes(c)&&!colunasDiasTurnos.includes(c));

  colunas.forEach(col=>{
    const th=document.createElement('th');
    th.textContent=col; th.dataset.col=col;
    const handle=document.createElement('div'); handle.className='resize-handle';
    handle.addEventListener('mousedown',e=>iniciarRedimensionamento(e,th));
    th.appendChild(handle); thead.appendChild(th);
  });

  dados.forEach(item=>{
    const tr=document.createElement('tr');
    colunas.forEach(col=>{
      const td=document.createElement('td'); td.dataset.field=col;
      if (col.toLowerCase().includes('cpf')) {
        const val=formatarCPF(getFieldValue(item,col));
        const span=document.createElement('span'); span.textContent=val; span.className='copiar-generico';
        span.onclick=()=>copiarConteudo(val); td.appendChild(span);
      }
      else if (isEmailColumn(col)) {
        const val=getFieldValue(item,col)||''; const span=document.createElement('span');
        span.textContent=val; span.className='email-copiar'; span.onclick=()=>copiarEmail(val); td.appendChild(span);
      }
      else { const v=getFieldValue(item,col)||''; td.textContent=v; td.onclick=()=>copiarConteudo(v); }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function getFieldValue(item,chave){ if(!item)return''; return item[chave]??item[chave.toLowerCase()]??''; }
function isEmailColumn(c){ const col=c.toLowerCase(); return col.includes('email')||col.includes('e-mail'); }
function debounce(fn,wait=160){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),wait);};}
function montarDiasTurnos(){} // mantido para compatibilidade

let isResizing=false;let currentColumn=null;let startX=0;let startWidth=0;
function iniciarRedimensionamento(e,c){isResizing=true;currentColumn=c;startX=e.pageX;startWidth=c.offsetWidth;}
function redimensionarColuna(e){if(!isResizing||!currentColumn)return;const l=startWidth+(e.pageX-startX);if(l>40){currentColumn.style.width=l+'px';}}
function pararRedimensionamento(){isResizing=false;currentColumn=null;}
function limparFiltros(){document.getElementById('filtroNome').value='';document.getElementById('filtroBairro').value='';aplicarFiltros();}
async function salvarAlteracoes(){alert('Nenhuma alteração pendente.');}
