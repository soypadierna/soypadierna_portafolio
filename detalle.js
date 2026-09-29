function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const params = new URLSearchParams(window.location.search);
const slugBuscado = params.get('p');
const proyecto = proyectos.find(p => (p.id || slugify(p.titulo)) === slugBuscado);
const cont = document.getElementById('detalle');

if (!proyecto) {
  cont.innerHTML = '<p class="vacio">No se encontró ese proyecto. <a href="index.html#proyectos">Volver</a></p>';
} else {
  document.title = proyecto.titulo + ' — Portafolio';
  cont.innerHTML = `
    <p class="detalle-meta">${[proyecto.curso, proyecto.semestre].filter(Boolean).join(' · ')}</p>
    <h1 class="detalle-titulo">${proyecto.titulo}</h1>
    ${proyecto.imagen ? `<img class="detalle-img" src="${proyecto.imagen}" alt="">` : ''}
    <p class="detalle-desc">${proyecto.descripcion || ''}</p>
    <div class="proyecto-stack">${(proyecto.stack || []).map(t => `<span>${t}</span>`).join('')}</div>
    ${proyecto.enlace ? `<a class="detalle-enlace" href="${proyecto.enlace}" target="_blank" rel="noopener">Ver proyecto →</a>` : ''}
  `;
}