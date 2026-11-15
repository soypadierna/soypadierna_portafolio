(function () {
  const cont = document.getElementById('lista-entradas');
  if (!cont || typeof entradas === 'undefined') return;
  if (!entradas.length) {
    cont.innerHTML = '<p class="vacio">Todavía no hay entradas.</p>';
    return;
  }
  const porUnidad = {};
  entradas.forEach(e => {
    const u = e.unidad || 'Otras';
    (porUnidad[u] = porUnidad[u] || []).push(e);
  });
  const unidades = Object.keys(porUnidad).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  cont.innerHTML = unidades.map(u => {
    const items = porUnidad[u].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    return `<h3 class="unidad-titulo">${u}</h3>` + items.map(e => `
      <a class="proyecto" href="entrada.html?e=${e.id}">
        <div class="proyecto-meta">${e.fecha || ''}</div>
        <div>
          <h3 class="proyecto-titulo">${e.titulo}</h3>
          <p class="proyecto-desc">${e.resumen || ''}</p>
          <div class="proyecto-stack">${(e.etiquetas || []).map(t => `<span>${t}</span>`).join('')}</div>
        </div>
        <span class="proyecto-flecha">→</span>
      </a>`).join('');
  }).join('');
})();