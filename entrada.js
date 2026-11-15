function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const idBuscado = new URLSearchParams(window.location.search).get('e');
const entrada = entradas.find(e => e.id === idBuscado);
const cont = document.getElementById('detalle');

if (!entrada) {
  cont.innerHTML = '<p class="vacio">No se encontró esa entrada. <a href="index.html#entradas">Volver</a></p>';
} else {
  document.title = entrada.titulo + ' — Portafolio';
  const lista = (typeof proyectos !== 'undefined') ? proyectos : [];
  const relacionados = lista.filter(p => (entrada.proyectos || []).includes(p.id || slugify(p.titulo)));
  cont.innerHTML = `
    <p class="detalle-meta">${[entrada.unidad, entrada.fecha].filter(Boolean).join(' · ')}</p>
    <h1 class="detalle-titulo">${entrada.titulo}</h1>
    <div class="proyecto-stack" style="margin-bottom:24px">${(entrada.etiquetas || []).map(t => `<span>${t}</span>`).join('')}</div>
    <div class="contenido-md">${renderMarkdown(entrada.contenido)}</div>
    ${relacionados.length ? `<h2 class="rel-titulo">Proyectos relacionados</h2>
      <div class="rel-lista">${relacionados.map(p => `<a href="proyecto.html?p=${p.id || slugify(p.titulo)}">${p.titulo}</a>`).join('')}</div>` : ''}
  `;
  cont.querySelectorAll('.contenido-md a[href^="http"]').forEach(a => {
    a.target = '_blank';
    a.rel = 'noopener';
  });
}