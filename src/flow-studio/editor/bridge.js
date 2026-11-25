import { connectionPath } from '../model.js';
import './advanced.js';

// The editor runs in its own document so its shortcuts and selectors never affect the dashboard.
route = function (edge) {
  const from = model.nodes.find(node => node.id === edge.from);
  const to = model.nodes.find(node => node.id === edge.to);
  const path = connectionPath(edge, from, to);
  return { d: path.d, lx: path.x, ly: path.y };
};
const basePersist = persist;
persist = function () {
  basePersist();
  window.parent.postMessage({ type: 'orbita-flow:changed', model }, location.origin);
};
download = function (data, mime, extension) {
  window.parent.postMessage({ type: 'orbita-flow:download', data, mime, extension, title: model.title }, location.origin);
};
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== window.parent) return;
  if (event.data?.type === 'orbita-flow:initialize') {
    try {
      check(event.data.model);
      model = structuredClone(event.data.model);
      selected = null;
      groupSelection.clear();
      source = null;
      history = [];
      future = [];
      render();
      fit();
    } catch (error) { toast('No se pudo cargar el diagrama: ' + error.message); }
  }
  if (event.data?.type === 'orbita-flow:fit') requestAnimationFrame(fit);
});
new ResizeObserver(() => requestAnimationFrame(fit)).observe(document.querySelector('.workspace'));
window.parent.postMessage({ type: 'orbita-flow:ready' }, location.origin);
