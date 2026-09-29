function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const lista = document.getElementById('lista-proyectos');
const filtrosEl = document.getElementById('filtros');
let filtroActivo = null;

function tagsUnicos() {
  const set = new Set();
  proyectos.forEach(p => (p.stack || []).forEach(t => set.add(t)));
  return [...set];
}

function renderFiltros() {
  const tags = tagsUnicos();
  if (tags.length <= 1) return;
  filtrosEl.innerHTML = tags.map(t =>
    `<button class="filtro-chip" data-tag="${t}">${t}</button>`
  ).join('');
  filtrosEl.querySelectorAll('.filtro-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      filtroActivo = (filtroActivo === tag) ? null : tag;
      renderFiltros();
      renderLista();
    });
    if (btn.dataset.tag === filtroActivo) btn.classList.add('activo');
  });
}

function renderLista() {
  const items = filtroActivo
    ? proyectos.filter(p => (p.stack || []).includes(filtroActivo))
    : proyectos;

  if (!items.length) {
    lista.innerHTML = '<p class="vacio">No hay proyectos con ese filtro.</p>';
    return;
  }

  lista.innerHTML = items.map(p => `
    <a class="proyecto" href="proyecto.html?p=${p.id || slugify(p.titulo)}">
      <div class="proyecto-meta">${[p.curso, p.semestre].filter(Boolean).join('<br>')}</div>
      <div>
        ${p.imagen ? `<img class="proyecto-img" src="${p.imagen}" alt="">` : ''}
        <h3 class="proyecto-titulo">${p.titulo}</h3>
        <p class="proyecto-desc">${p.descripcion || ''}</p>
        <div class="proyecto-stack">
          ${(p.stack || []).map(t => `<span>${t}</span>`).join('')}
        </div>
      </div>
      <span class="proyecto-flecha">→</span>
    </a>
  `).join('');
}

renderFiltros();
renderLista();