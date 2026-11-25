import { STORAGE_KEY, createStrategyModel, validateModel } from './model.js';
import { renderPreview } from './preview.js';

const container = document.getElementById('flow-studio-preview');
const dialog = document.getElementById('flow-studio-dialog');
const frame = document.getElementById('flow-studio-frame');
let saved = null, seed = null, fit = false;
try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) saved = validateModel(JSON.parse(stored)); }
catch { toast('No se pudo leer el diagrama guardado. Puedes importar una copia desde Flujo Studio.'); }

function render() {
  if (!saved && !seed) return;
  const model = saved || seed;
  renderPreview(container, model, fit);
  document.getElementById('flow-studio-summary').textContent = `${model.nodes.length} figuras · ${model.edges.length} conexiones · ${saved ? 'Diagrama guardado' : 'Plantilla inicial editable'}`;
}

document.addEventListener('flow:context', event => {
  seed = createStrategyModel(event.detail.tasks, event.detail.areas);
  render();
});
document.dispatchEvent(new Event('flow:request-context'));

document.getElementById('flow-studio-edit').onclick = () => {
  dialog.showModal();
  if (!frame.getAttribute('src')) frame.src = 'src/flow-studio/editor/index.html';
  else frame.contentWindow.postMessage({ type: 'orbita-flow:fit' }, location.origin);
};
document.getElementById('flow-studio-close').onclick = () => dialog.close();
dialog.addEventListener('close', () => { document.getElementById('flow-studio-edit').focus(); });

window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === 'orbita-flow:download') {
    const { data, mime, extension, title } = event.data;
    if (!['svg', 'json'].includes(extension) || !['image/svg+xml', 'application/json'].includes(mime) || typeof data !== 'string' || data.length > 20000000) return;
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${String(title || 'flujograma').replace(/[^a-zA-Z0-9áéíóúñ -]/g, '').slice(0, 120) || 'flujograma'}.${extension}`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  if (event.data?.type === 'orbita-flow:ready') frame.contentWindow.postMessage({ type: 'orbita-flow:initialize', model: saved || seed }, location.origin);
  if (event.data?.type === 'orbita-flow:changed') {
    try { saved = validateModel(event.data.model); render(); }
    catch { toast('El editor devolvió un diagrama no válido.'); }
  }
});

document.querySelectorAll('[data-flow-preview-size]').forEach(button => button.onclick = () => {
  fit = button.dataset.flowPreviewSize === 'fit';
  document.querySelectorAll('[data-flow-preview-size]').forEach(option => {
    const selected = button === option;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-pressed', String(selected));
  });
  render();
});
