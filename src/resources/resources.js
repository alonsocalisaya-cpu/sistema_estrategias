import { getFile, listEntries, saveEntry, validateLink, MAX_FILE_SIZE } from './store.js';
import './tabs.js';

const sections = {
  documentation: { title: 'Documentación', singular: 'documentación', empty: 'La información del proyecto, en un solo lugar', hint: 'Añade guías, presentaciones, documentos de consulta o enlaces a Drive, Notion y otras fuentes.' },
  records: { title: 'Registros', singular: 'registro', empty: 'Construye la evidencia del proyecto', hint: 'Guarda actas, reportes, evidencias y los registros que se generen durante la ejecución.' },
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const sizeLabel = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const dateLabel = date => new Date(`${date}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dialog = document.getElementById('resource-dialog');
const form = document.getElementById('resource-form');
const errorMessage = document.getElementById('resource-error');
let entries = [];
let activeSection = 'documentation';
let busy = false;
let undoEntry;

function showError(error) {
  errorMessage.textContent = error?.name === 'QuotaExceededError' ? 'No hay espacio suficiente en este navegador. Prueba un archivo más pequeño o añade un enlace.' : error?.message || 'No se pudo guardar. Inténtalo nuevamente.';
}

function itemMarkup(entry) {
  const file = entry.kind === 'file';
  const badge = file ? (entry.fileName.split('.').pop() || 'ARCHIVO').slice(0, 6).toUpperCase() : 'LINK';
  const action = file
    ? `<button type="button" class="resource-action" data-download-resource="${entry.id}" aria-label="Descargar ${escape(entry.title)}">Descargar</button>`
    : `<a class="resource-action" href="${escape(entry.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${escape(entry.title)}">Abrir enlace</a>`;
  return `<article class="resource-item"><span class="resource-file-icon ${file ? '' : 'is-link'}" aria-hidden="true">${escape(badge)}</span><div class="resource-item-content"><h3>${escape(entry.title)}</h3>${entry.description ? `<p>${escape(entry.description)}</p>` : ''}<div class="resource-meta"><span>${escape(entry.area)}</span><span>${escape(dateLabel(entry.date))}</span><span>${file ? escape(sizeLabel(entry.fileSize)) : escape(new URL(entry.url).hostname)}</span></div><div class="resource-item-actions">${action}<button type="button" class="resource-remove" data-remove-resource="${entry.id}" aria-label="Quitar ${escape(entry.title)}">Quitar</button></div></div></article>`;
}

function renderSection(section) {
  const panel = document.getElementById(section);
  const query = panel.querySelector('[data-resource-search]').value.trim().toLocaleLowerCase('es');
  const type = panel.querySelector('[data-resource-type]').value;
  const area = document.getElementById('area').value;
  const all = entries.filter(entry => !entry.deletedAt && entry.section === section);
  const filtered = all.filter(entry => (area === 'all' || entry.area === 'Proyecto' || entry.area === area) && (type === 'all' || entry.kind === type) && (!query || `${entry.title} ${entry.description} ${entry.fileName || ''} ${entry.area}`.toLocaleLowerCase('es').includes(query)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  panel.querySelector('[data-resource-count]').textContent = all.length;
  panel.querySelector('[data-resource-summary]').textContent = `${filtered.length} de ${all.length} ${section === 'records' ? 'registros' : 'documentos'}`;
  panel.querySelector('[data-resource-list]').innerHTML = filtered.length ? filtered.map(itemMarkup).join('') : `<div class="resource-empty"><span aria-hidden="true">${section === 'records' ? '▤' : '▱'}</span><h3>${all.length ? 'Sin coincidencias' : sections[section].empty}</h3><p>${all.length ? 'Prueba otra búsqueda, tipo o área.' : sections[section].hint}</p>${all.length ? '' : `<button type="button" class="button secondary" data-add-resource="${section}">Añadir ${sections[section].singular}</button>`}</div>`;
}

const render = () => Object.keys(sections).forEach(renderSection);

async function load() {
  try { entries = await listEntries(); render(); }
  catch {
    document.querySelectorAll('[data-resource-list]').forEach(list => {
      list.innerHTML = '<div class="resource-empty"><h3>No se pudo abrir el almacenamiento local</h3><p>Permite el almacenamiento del navegador e inténtalo otra vez.</p><button type="button" class="button secondary" data-resource-retry>Reintentar</button></div>';
    });
  }
}

function updateSource() {
  const isFile = form.elements.source.value === 'file';
  document.getElementById('resource-file-field').hidden = !isFile;
  document.getElementById('resource-link-field').hidden = isFile;
  form.elements.file.required = isFile;
  form.elements.url.required = !isFile;
  form.elements.file.disabled = !isFile;
  form.elements.url.disabled = isFile;
}

function open(section) {
  if (busy) return;
  activeSection = section;
  form.reset();
  errorMessage.textContent = '';
  document.getElementById('resource-dialog-title').textContent = `Añadir ${sections[section].singular}`;
  form.elements.date.value = today();
  form.elements.area.value = document.getElementById('area').value === 'all' ? 'Proyecto' : document.getElementById('area').value;
  updateSource();
  dialog.showModal();
}

form.addEventListener('change', event => {
  if (event.target.name === 'source') updateSource();
  if (event.target.name === 'file') {
    const file = form.elements.file.files[0];
    if (file && !form.elements.title.value.trim()) form.elements.title.value = file.name.replace(/\.[^.]+$/, '').slice(0, 120);
    errorMessage.textContent = file?.size > MAX_FILE_SIZE ? 'El archivo supera el límite de 25 MB. Puedes añadir un enlace en su lugar.' : '';
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  errorMessage.textContent = '';
  const file = form.elements.file.files[0];
  const kind = form.elements.source.value;
  const title = form.elements.title.value.trim();
  try {
    if (!title) throw new Error('Escribe un título.');
    if (kind === 'file' && !file) throw new Error('Selecciona un archivo.');
    if (kind === 'file' && file.size > MAX_FILE_SIZE) throw new Error('El archivo supera el límite de 25 MB.');
    const entry = { id: crypto.randomUUID(), section: activeSection, kind, title, description: form.elements.description.value.trim(), area: form.elements.area.value, date: form.elements.date.value, createdAt: new Date().toISOString() };
    if (kind === 'link') entry.url = validateLink(form.elements.url.value.trim());
    else Object.assign(entry, { fileName: file.name, fileSize: file.size, fileType: file.type });
    busy = true;
    form.querySelector('[type="submit"]').disabled = true;
    form.querySelector('[type="submit"]').textContent = 'Guardando…';
    await saveEntry(entry, kind === 'file' ? file : undefined);
    entries.push(entry);
    render();
    dialog.close();
    toast(`${activeSection === 'records' ? 'Registro añadido' : 'Documentación añadida'}`);
  } catch (error) { showError(error); }
  finally { busy = false; form.querySelector('[type="submit"]').disabled = false; form.querySelector('[type="submit"]').textContent = 'Guardar'; }
});

dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
dialog.querySelector('[data-resource-close]').onclick = () => { if (!busy) dialog.close(); };

async function download(id, button) {
  const entry = entries.find(item => item.id === id && !item.deletedAt);
  if (!entry) return;
  button.disabled = true;
  try {
    const file = await getFile(id);
    if (!file) throw new Error('No se encontró el archivo guardado.');
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = entry.fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) { toast(error.message || 'No se pudo descargar el archivo.'); }
  finally { button.disabled = false; }
}

async function remove(id) {
  const entry = entries.find(item => item.id === id && !item.deletedAt);
  if (!entry) return;
  try {
    const removed = { ...entry, deletedAt: new Date().toISOString() };
    await saveEntry(removed);
    entries = entries.map(item => item.id === id ? removed : item);
    undoEntry = entry;
    render();
    const notice = document.getElementById('resource-undo');
    notice.querySelector('span').textContent = `Se quitó «${entry.title}».`;
    notice.hidden = false;
  } catch { toast('No se pudo quitar el elemento. Inténtalo nuevamente.'); }
}

document.getElementById('resource-undo-button').onclick = async () => {
  if (!undoEntry) return;
  const entry = undoEntry;
  try { await saveEntry(entry); entries = entries.map(item => item.id === entry.id ? entry : item); undoEntry = null; render(); document.getElementById('resource-undo').hidden = true; }
  catch { toast('No se pudo restaurar el elemento.'); }
};
document.getElementById('resource-dismiss-undo').onclick = () => { document.getElementById('resource-undo').hidden = true; };
document.addEventListener('click', event => {
  const add = event.target.closest('[data-add-resource]');
  if (add) open(add.dataset.addResource);
  const downloadButton = event.target.closest('[data-download-resource]');
  if (downloadButton) download(downloadButton.dataset.downloadResource, downloadButton);
  const removeButton = event.target.closest('[data-remove-resource]');
  if (removeButton) remove(removeButton.dataset.removeResource);
  if (event.target.closest('[data-resource-retry]')) load();
});
document.querySelectorAll('[data-resource-search]').forEach(input => input.oninput = () => renderSection(input.closest('.resource-panel').id));
document.querySelectorAll('[data-resource-type]').forEach(select => select.onchange = () => renderSection(select.closest('.resource-panel').id));
document.getElementById('area').addEventListener('change', render);
document.addEventListener('click', event => { if (event.target.closest('[data-person]')) render(); });
load();
