const CONFIG_KEY = 'portafolio_github_config';
let proyectosActuales = [];
let shaActual = null;
let indiceEditando = null;

function getConfig() {
  const raw = localStorage.getItem(CONFIG_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveConfig(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'proyecto';
}

function mostrarMensaje(texto, esError = false) {
  const el = document.getElementById('mensaje');
  el.textContent = texto;
  el.style.color = esError ? '#C1352A' : '#14120F';
}

async function githubRequest(path, options = {}) {
  const cfg = getConfig();
  if (!cfg) throw new Error('Primero guarda la conexión con tu repo.');
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${cfg.token}`,
      'Accept': 'application/vnd.github+json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Error ${res.status} en ${path}`);
  }
  return res.json();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function subirImagen(file, nombreBase) {
  const cfg = getConfig();
  const ext = file.name.split('.').pop();
  const ruta = `imagenes/${nombreBase}-${Date.now()}.${ext}`;
  const contenido = await fileToBase64(file);
  await githubRequest(ruta, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Agregar imagen: ${nombreBase}`,
      content: contenido,
      branch: cfg.branch || 'main'
    })
  });
  return ruta;
}

// ---------- Parseo y escritura de projects.js ----------

const ENCABEZADO = `// Este archivo lo genera admin.html. Para agregar, editar o
// eliminar proyectos usa ese panel en vez de editar esto a mano.

`;

function serializarProyecto(p) {
  return `  {
    curso: ${JSON.stringify(p.curso || '')},
    semestre: ${JSON.stringify(p.semestre || '')},
    titulo: ${JSON.stringify(p.titulo || '')},
    descripcion: ${JSON.stringify(p.descripcion || '')},
    stack: ${JSON.stringify(p.stack || [])},
    enlace: ${JSON.stringify(p.enlace || '')},
    imagen: ${JSON.stringify(p.imagen || '')}
  }`;
}

function serializarArchivo(lista) {
  return ENCABEZADO + 'const proyectos = [\n' + lista.map(serializarProyecto).join(',\n') + '\n];\n';
}

function parsearProyectos(contenido) {
  const inicioArr = contenido.indexOf('[', contenido.indexOf('const proyectos'));
  const finArr = contenido.lastIndexOf(']');
  const literal = contenido.slice(inicioArr, finArr + 1);
  return Function('"use strict"; return (' + literal + ')')();
}

async function cargarProyectos() {
  const actual = await githubRequest('projects.js');
  shaActual = actual.sha;
  const contenido = decodeURIComponent(escape(atob(actual.content)));
  proyectosActuales = parsearProyectos(contenido);
  renderListaAdmin();
}

async function guardarProyectos(mensaje) {
  const cfg = getConfig();
  const contenido = serializarArchivo(proyectosActuales);
  const contenidoBase64 = btoa(unescape(encodeURIComponent(contenido)));
  const resultado = await githubRequest('projects.js', {
    method: 'PUT',
    body: JSON.stringify({
      message: mensaje,
      content: contenidoBase64,
      sha: shaActual,
      branch: cfg.branch || 'main'
    })
  });
  shaActual = resultado.content.sha;
}

// ---------- Lista en el panel ----------

function renderListaAdmin() {
  const cont = document.getElementById('lista-admin');
  if (!proyectosActuales.length) {
    cont.innerHTML = '<p class="vacio">Todavía no hay proyectos.</p>';
    return;
  }
  cont.innerHTML = proyectosActuales.map((p, i) => `
    <div class="item-admin">
      <div>
        <strong>${p.titulo}</strong>
        <span class="item-admin-meta">${[p.curso, p.semestre].filter(Boolean).join(' · ')}</span>
      </div>
      <div class="item-admin-botones">
        <button type="button" data-editar="${i}">Editar</button>
        <button type="button" data-eliminar="${i}" class="btn-peligro">Eliminar</button>
      </div>
    </div>
  `).join('');

  cont.querySelectorAll('[data-editar]').forEach(btn => {
    btn.addEventListener('click', () => cargarEnFormulario(Number(btn.dataset.editar)));
  });
  cont.querySelectorAll('[data-eliminar]').forEach(btn => {
    btn.addEventListener('click', () => eliminarProyecto(Number(btn.dataset.eliminar)));
  });
}

function cargarEnFormulario(indice) {
  const p = proyectosActuales[indice];
  indiceEditando = indice;
  document.getElementById('p-titulo').value = p.titulo || '';
  document.getElementById('p-curso').value = p.curso || '';
  document.getElementById('p-semestre').value = p.semestre || '';
  document.getElementById('p-descripcion').value = p.descripcion || '';
  document.getElementById('p-stack').value = (p.stack || []).join(', ');
  document.getElementById('p-enlace').value = p.enlace || '';
  document.getElementById('p-imagen').value = '';
  document.getElementById('form-proyecto').querySelector('button[type="submit"]').textContent = 'Guardar cambios';
  document.getElementById('btn-cancelar').style.display = 'inline-block';
  document.getElementById('form-proyecto').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicion() {
  indiceEditando = null;
  document.getElementById('form-proyecto').reset();
  document.getElementById('form-proyecto').querySelector('button[type="submit"]').textContent = 'Publicar proyecto';
  document.getElementById('btn-cancelar').style.display = 'none';
}

async function eliminarProyecto(indice) {
  const p = proyectosActuales[indice];
  if (!confirm(`¿Eliminar "${p.titulo}"? Esto no borra la imagen del repo, solo la entrada.`)) return;
  proyectosActuales.splice(indice, 1);
  try {
    await guardarProyectos(`Eliminar proyecto: ${p.titulo}`);
    mostrarMensaje('Proyecto eliminado.');
    renderListaAdmin();
    if (indiceEditando === indice) cancelarEdicion();
  } catch (err) {
    mostrarMensaje('Error: ' + err.message, true);
  }
}

// ---------- Formularios ----------

document.getElementById('form-config').addEventListener('submit', async e => {
  e.preventDefault();
  saveConfig({
    owner: document.getElementById('cfg-owner').value.trim(),
    repo: document.getElementById('cfg-repo').value.trim(),
    branch: document.getElementById('cfg-branch').value.trim() || 'main',
    token: document.getElementById('cfg-token').value.trim()
  });
  mostrarMensaje('Conexión guardada. Cargando proyectos...');
  try {
    await cargarProyectos();
    mostrarMensaje('Listo.');
  } catch (err) {
    mostrarMensaje('Error: ' + err.message, true);
  }
});

document.getElementById('btn-cancelar').addEventListener('click', cancelarEdicion);

document.getElementById('form-proyecto').addEventListener('submit', async e => {
  e.preventDefault();
  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;
  mostrarMensaje('Publicando...');
  try {
    const titulo = document.getElementById('p-titulo').value.trim();
    const archivoImagen = document.getElementById('p-imagen').files[0];
    let rutaImagen = indiceEditando !== null ? (proyectosActuales[indiceEditando].imagen || '') : '';
    if (archivoImagen) {
      rutaImagen = await subirImagen(archivoImagen, slugify(titulo));
    }
    const datos = {
      curso: document.getElementById('p-curso').value.trim(),
      semestre: document.getElementById('p-semestre').value.trim(),
      titulo,
      descripcion: document.getElementById('p-descripcion').value.trim(),
      stack: document.getElementById('p-stack').value.split(',').map(s => s.trim()).filter(Boolean),
      enlace: document.getElementById('p-enlace').value.trim(),
      imagen: rutaImagen
    };

    if (indiceEditando !== null) {
      proyectosActuales[indiceEditando] = datos;
      await guardarProyectos(`Editar proyecto: ${datos.titulo}`);
      mostrarMensaje('Proyecto actualizado.');
    } else {
      proyectosActuales.unshift(datos);
      await guardarProyectos(`Agregar proyecto: ${datos.titulo}`);
      mostrarMensaje('Proyecto publicado.');
    }
    cancelarEdicion();
    renderListaAdmin();
  } catch (err) {
    mostrarMensaje('Error: ' + err.message, true);
  } finally {
    boton.disabled = false;
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  const cfg = getConfig();
  if (!cfg) return;
  document.getElementById('cfg-owner').value = cfg.owner || '';
  document.getElementById('cfg-repo').value = cfg.repo || '';
  document.getElementById('cfg-branch').value = cfg.branch || 'main';
  document.getElementById('cfg-token').value = cfg.token || '';
  try {
    await cargarProyectos();
  } catch (err) {
    mostrarMensaje('Error al cargar: ' + err.message, true);
  }
});