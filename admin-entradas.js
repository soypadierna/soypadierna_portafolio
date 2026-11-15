let entradasActuales = [];
let shaEntradas = null;
let indiceEntrada = null;

const ENCABEZADO_ENTRADAS = `// Este archivo lo genera admin.html (sección Entradas).
// Para agregar, editar o eliminar entradas usa ese panel.

`;

function parsearArreglo(texto, marcador) {
  const ini = texto.indexOf('[', texto.indexOf(marcador));
  const fin = texto.lastIndexOf(']');
  return Function('"use strict"; return (' + texto.slice(ini, fin + 1) + ')')();
}

function serializarEntrada(e) {
  return `  {
    id: ${JSON.stringify(e.id)},
    unidad: ${JSON.stringify(e.unidad || '')},
    fecha: ${JSON.stringify(e.fecha || '')},
    titulo: ${JSON.stringify(e.titulo || '')},
    resumen: ${JSON.stringify(e.resumen || '')},
    etiquetas: ${JSON.stringify(e.etiquetas || [])},
    proyectos: ${JSON.stringify(e.proyectos || [])},
    contenido: ${JSON.stringify(e.contenido || '')}
  }`;
}

async function cargarEntradas() {
  try {
    const actual = await githubRequest('entradas.js');
    shaEntradas = actual.sha;
    const contenido = decodeURIComponent(escape(atob(actual.content)));
    entradasActuales = parsearArreglo(contenido, 'const entradas');
  } catch (err) {
    if (/not found/i.test(err.message)) {
      entradasActuales = [];
      shaEntradas = null;
    } else {
      throw err;
    }
  }
  renderListaEntradas();
}

async function guardarEntradas(mensaje) {
  const cfg = getConfig();
  if (!cfg) throw new Error('No hay conexión guardada en este navegador/página. Guarda la conexión primero.');
  const texto = ENCABEZADO_ENTRADAS + 'const entradas = [\n' +
    entradasActuales.map(serializarEntrada).join(',\n') + '\n];\n';
  const body = {
    message: mensaje,
    content: btoa(unescape(encodeURIComponent(texto))),
    branch: cfg.branch || 'main'
  };
  if (shaEntradas) body.sha = shaEntradas;
  const res = await githubRequest('entradas.js', { method: 'PUT', body: JSON.stringify(body) });
  shaEntradas = res.content.sha;
}

// ---------- Subida de archivos y utilidades del editor ----------

async function subirArchivo(file, carpeta) {
  const cfg = getConfig();
  if (!cfg) throw new Error('No hay conexión guardada en este navegador/página. Guarda la conexión primero.');
  const partes = file.name.split('.');
  const ext = partes.pop().toLowerCase();
  const nombre = slugify(partes.join('.')) + '-' + Date.now() + '.' + ext;
  const ruta = `${carpeta}/${nombre}`;
  await githubRequest(ruta, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Subir ${carpeta}: ${nombre}`,
      content: await fileToBase64(file),
      branch: cfg.branch || 'main'
    })
  });
  return ruta;
}

function insertarEnCursor(texto) {
  const ta = document.getElementById('e-contenido');
  const ini = ta.selectionStart, fin = ta.selectionEnd;
  ta.value = ta.value.slice(0, ini) + texto + ta.value.slice(fin);
  ta.selectionStart = ta.selectionEnd = ini + texto.length;
  ta.focus();
  actualizarVistaPrevia();
}

function actualizarVistaPrevia() {
  document.getElementById('e-preview').innerHTML = renderMarkdown(document.getElementById('e-contenido').value);
}

function htmlVideo(url) {
  url = url.trim();
  let m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
  if (m) return `\n\n<div class="video"><iframe src="https://www.youtube.com/embed/${m[1]}" allowfullscreen loading="lazy"></iframe></div>\n\n`;
  m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (m) return `\n\n<div class="video"><iframe src="https://drive.google.com/file/d/${m[1]}/preview" allowfullscreen loading="lazy"></iframe></div>\n\n`;
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `\n\n<div class="video"><iframe src="https://player.vimeo.com/video/${m[1]}" allowfullscreen loading="lazy"></iframe></div>\n\n`;
  if (/\.(mp4|webm)$/i.test(url)) return `\n\n<video controls src="${url}"></video>\n\n`;
  return null;
}

// ---------- Lista y formulario ----------

function renderChecksProyectos(seleccion = []) {
  const cont = document.getElementById('e-proyectos');
  if (!proyectosActuales.length) {
    cont.innerHTML = '<p class="vacio">Aún no hay proyectos para relacionar.</p>';
    return;
  }
  cont.innerHTML = proyectosActuales.map(p => {
    const id = p.id || slugify(p.titulo);
    return `<label class="check"><input type="checkbox" value="${id}" ${seleccion.includes(id) ? 'checked' : ''}> ${p.titulo}</label>`;
  }).join('');
}

function renderListaEntradas() {
  const cont = document.getElementById('lista-entradas-admin');
  if (!entradasActuales.length) {
    cont.innerHTML = '<p class="vacio">Todavía no hay entradas.</p>';
    return;
  }
  cont.innerHTML = entradasActuales.map((en, i) => `
    <div class="item-admin">
      <div>
        <strong>${en.titulo}</strong>
        <span class="item-admin-meta">${[en.unidad, en.fecha].filter(Boolean).join(' · ')}</span>
      </div>
      <div class="item-admin-botones">
        <button type="button" data-editar-entrada="${i}">Editar</button>
        <button type="button" data-eliminar-entrada="${i}" class="btn-peligro">Eliminar</button>
      </div>
    </div>
  `).join('');
  cont.querySelectorAll('[data-editar-entrada]').forEach(b =>
    b.addEventListener('click', () => editarEntrada(Number(b.dataset.editarEntrada))));
  cont.querySelectorAll('[data-eliminar-entrada]').forEach(b =>
    b.addEventListener('click', () => eliminarEntrada(Number(b.dataset.eliminarEntrada))));
}

function editarEntrada(i) {
  const en = entradasActuales[i];
  indiceEntrada = i;
  document.getElementById('e-titulo').value = en.titulo || '';
  document.getElementById('e-unidad').value = en.unidad || '';
  document.getElementById('e-fecha').value = en.fecha || '';
  document.getElementById('e-resumen').value = en.resumen || '';
  document.getElementById('e-etiquetas').value = (en.etiquetas || []).join(', ');
  document.getElementById('e-contenido').value = en.contenido || '';
  renderChecksProyectos(en.proyectos || []);
  actualizarVistaPrevia();
  document.querySelector('#form-entrada button[type="submit"]').textContent = 'Guardar cambios';
  document.getElementById('btn-cancelar-entrada').style.display = 'inline-block';
  document.getElementById('form-entrada').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEntrada() {
  indiceEntrada = null;
  document.getElementById('form-entrada').reset();
  document.getElementById('e-fecha').value = new Date().toLocaleDateString('en-CA');
  renderChecksProyectos();
  actualizarVistaPrevia();
  document.querySelector('#form-entrada button[type="submit"]').textContent = 'Publicar entrada';
  document.getElementById('btn-cancelar-entrada').style.display = 'none';
}

async function eliminarEntrada(i) {
  const en = entradasActuales[i];
  if (!confirm(`¿Eliminar "${en.titulo}"? Las imágenes y archivos subidos se quedan en el repo.`)) return;
  entradasActuales.splice(i, 1);
  try {
    await guardarEntradas(`Eliminar entrada: ${en.titulo}`);
    mostrarMensaje('Entrada eliminada.');
    renderListaEntradas();
    if (indiceEntrada === i) cancelarEntrada();
  } catch (err) {
    mostrarMensaje('Error: ' + err.message, true);
  }
}

// ---------- Eventos ----------

document.getElementById('e-contenido').addEventListener('input', actualizarVistaPrevia);
document.getElementById('btn-cancelar-entrada').addEventListener('click', cancelarEntrada);

document.getElementById('btn-img').addEventListener('click', () => document.getElementById('e-file-img').click());
document.getElementById('e-file-img').addEventListener('change', async ev => {
  const f = ev.target.files[0];
  if (!f) return;
  mostrarMensaje('Subiendo imagen...');
  try {
    const ruta = await subirArchivo(f, 'imagenes');
    insertarEnCursor(`\n\n![Descripción de la imagen](${ruta})\n\n`);
    mostrarMensaje('Imagen subida e insertada. Cambia el texto entre corchetes por una descripción.');
  } catch (err) {
    mostrarMensaje('Error: ' + err.message, true);
  }
  ev.target.value = '';
});

document.getElementById('btn-archivo').addEventListener('click', () => document.getElementById('e-file-doc').click());
document.getElementById('e-file-doc').addEventListener('change', async ev => {
  const f = ev.target.files[0];
  if (!f) return;
  mostrarMensaje('Subiendo archivo...');
  try {
    const ruta = await subirArchivo(f, 'archivos');
    insertarEnCursor(`[${f.name}](${ruta})`);
    mostrarMensaje('Archivo subido e insertado como enlace.');
  } catch (err) {
    mostrarMensaje('Error: ' + err.message, true);
  }
  ev.target.value = '';
});

document.getElementById('btn-video').addEventListener('click', () => {
  const url = prompt('Pega el enlace del video (YouTube, Google Drive, Vimeo o .mp4):');
  if (!url) return;
  const html = htmlVideo(url);
  if (!html) {
    mostrarMensaje('Enlace de video no reconocido. Usa YouTube, Google Drive, Vimeo o un .mp4.', true);
    return;
  }
  insertarEnCursor(html);
});

document.getElementById('btn-enlace').addEventListener('click', () => {
  const url = prompt('URL del enlace:');
  if (!url) return;
  const texto = prompt('Texto que se verá:', url) || url;
  insertarEnCursor(`[${texto}](${url})`);
});

document.getElementById('form-entrada').addEventListener('submit', async e => {
  e.preventDefault();
  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;
  mostrarMensaje('Publicando entrada...');
  try {
    const editando = indiceEntrada !== null;
    const datos = {
      id: editando
        ? entradasActuales[indiceEntrada].id
        : 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      unidad: document.getElementById('e-unidad').value.trim(),
      fecha: document.getElementById('e-fecha').value,
      titulo: document.getElementById('e-titulo').value.trim(),
      resumen: document.getElementById('e-resumen').value.trim(),
      etiquetas: document.getElementById('e-etiquetas').value.split(',').map(s => s.trim()).filter(Boolean),
      proyectos: [...document.querySelectorAll('#e-proyectos input:checked')].map(i => i.value),
      contenido: document.getElementById('e-contenido').value
    };
    if (editando) entradasActuales[indiceEntrada] = datos;
    else entradasActuales.unshift(datos);
    await guardarEntradas(`${editando ? 'Editar' : 'Agregar'} entrada: ${datos.titulo}`);
    mostrarMensaje(editando ? 'Entrada actualizada.' : 'Entrada publicada.');
    cancelarEntrada();
    renderListaEntradas();
  } catch (err) {
    mostrarMensaje('Error: ' + err.message, true);
  } finally {
    boton.disabled = false;
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('e-fecha').value = new Date().toLocaleDateString('en-CA');
  const cfg = getConfig();
  if (!cfg) {
    renderChecksProyectos();
    return;
  }
  try {
    await cargarProyectos();
    await cargarEntradas();
    renderChecksProyectos();
  } catch (err) {
    mostrarMensaje('Error al cargar entradas: ' + err.message, true);
  }
});