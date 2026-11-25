import { SHAPES, isContainer } from '../shapes.js';
import { validateModel } from '../model.js';
import { diagramBounds } from '../routing.js';
import { installPalette } from './palette.js';
import { decorateContainers, assignContainers, addAreaLanes, installContainerMovement, contains } from './containers.js';
import { decorateConnections, installConnectorGestures, connectionProperties } from './connectors.js';

check = validateModel;
installPalette();
installContainerMovement();
installConnectorGestures();

const picker = document.createElement('select'); picker.id = 'element-picker'; picker.setAttribute('aria-label', 'Seleccionar elemento del diagrama');
document.querySelector('.inspector h2').after(picker);
picker.onchange = () => { selectOne(picker.value || null); render(); };
let pickerSignature = '';
function updatePicker() {
  const signature = JSON.stringify([model.nodes.map(node => [node.id, node.text]), model.edges.map(edge => [edge.id, edge.from, edge.to, edge.text])]);
  if (signature !== pickerSignature) {
    pickerSignature = signature; picker.replaceChildren();
    const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Seleccionar elemento…'; picker.append(placeholder);
    for (const [name, items] of [['Figuras y áreas', model.nodes], ['Conexiones', model.edges]]) {
      const group = document.createElement('optgroup'); group.label = name;
      for (const item of items) {
        const option = document.createElement('option'); option.value = item.id;
        option.textContent = item.type ? item.text.replace(/\s+/g, ' ') : `${model.nodes.find(node => node.id === item.from)?.text.replace(/\s+/g, ' ')} / ${model.nodes.find(node => node.id === item.to)?.text.replace(/\s+/g, ' ')}${item.text ? ` (${item.text})` : ''}`;
        group.append(option);
      }
      picker.append(group);
    }
  }
  picker.value = selected || '';
}

const baseDraw = draw;
draw = function () {
  model.nodes.sort((a, b) => Number(isContainer(b)) - Number(isContainer(a)));
  let background = $('#containers');
  if (!background) { background = el('g', { id: 'containers' }); $('#viewport').insertBefore(background, $('#edges')); }
  background.replaceChildren();
  baseDraw();
  decorateContainers();
  decorateConnections();
  for (const group of $('#nodes').children) {
    const node = model.nodes.find(node => node.id === group.dataset.nodeId);
    group.setAttribute('role', 'button'); group.setAttribute('tabindex', '0'); group.setAttribute('aria-label', node.text.replace(/\s+/g, ' '));
    group.onkeydown = event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); selectOne(node.id); render(); } };
  }
  [...$('#nodes').children].filter(group => isContainer(model.nodes.find(node => node.id === group.dataset.nodeId))).forEach(group => background.append(group));
  updatePicker();
};

const baseProperties = properties;
properties = function () {
  baseProperties();
  const item = current();
  if (!item) return;
  if (!item.type) {
    connectionProperties(item, $('#properties'));
    const removeButton = $('#properties .danger');
    if (removeButton) $('#properties').append(removeButton);
  }
  else {
    const label = document.createElement('label'); label.textContent = 'Tipo de figura';
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Tipo de figura');
    for (const [type, info] of Object.entries(SHAPES)) {
      const option = document.createElement('option'); option.value = type; option.textContent = info.name; option.selected = item.type === type; select.append(option);
    }
    select.onchange = () => { snapshot(); item.type = select.value; render(); };
    label.append(select); $('#properties').prepend(label);
    if (isContainer(item)) {
      const help = document.createElement('p'); help.className = 'inspector-help'; help.textContent = 'Mueve el carril desde su fondo o encabezado. Sus actividades se desplazan juntas. Puedes cambiar el nombre, el tamaño y el color.'; $('#properties').append(help);
    }
  }
};

const baseHit = hitNode;
hitNode = function (point, except) {
  if (!except) return baseHit(point, except);
  return [...model.nodes].reverse().find(node => !isContainer(node) && node.id !== except && point.x >= node.x - 8 && point.x <= node.x + node.w + 8 && point.y >= node.y - 8 && point.y <= node.y + node.h + 8);
};

const baseMove = $('#canvas').onpointermove, baseUp = $('#canvas').onpointerup;
$('#canvas').onpointermove = event => {
  baseMove(event);
  if (gesture?.kind !== 'move' || !gesture.movingEdges?.length) return;
  const first = gesture.originals[0], currentNode = model.nodes.find(node => node.id === first.id);
  for (const original of gesture.movingEdges) {
    const edge = model.edges.find(edge => edge.id === original.id);
    edge.waypoints = original.points.map(point => ({ x: point.x + currentNode.x - first.x, y: point.y + currentNode.y - first.y }));
  }
  draw();
};
$('#canvas').onpointerup = event => {
  if (gesture?.kind === 'move') assignContainers();
  baseUp(event);
};

remove = function () {
  const ids = selectionIds(); if (!ids.length) return;
  snapshot();
  model.nodes = model.nodes.filter(node => !ids.includes(node.id));
  model.edges = model.edges.filter(edge => !ids.includes(edge.id) && !ids.includes(edge.from) && !ids.includes(edge.to));
  for (const node of model.nodes) if (ids.includes(node.containerId)) delete node.containerId;
  selectOne(null); render();
};

const baseDuplicate = duplicate;
duplicate = function () {
  const ids = new Set(selectionIds());
  for (const container of model.nodes.filter(node => ids.has(node.id) && isContainer(node))) {
    for (const child of model.nodes.filter(node => contains(container, node))) ids.add(child.id);
  }
  groupSelection = ids;
  baseDuplicate();
  assignContainers(); render();
};

const areasButton = document.createElement('button');
areasButton.id = 'create-area-lanes'; areasButton.textContent = 'Separar por áreas'; areasButton.title = 'Crear carriles para Calidad, Digital y Marketing a partir de las actividades existentes'; areasButton.onclick = addAreaLanes;
document.querySelector('nav>div:last-child').prepend(areasButton);
document.querySelector('.tip').innerHTML = '<b>Conectores a tu medida</b><p>Selecciona una flecha. Arrastra sus puntos morados para cambiar la ruta y los extremos blancos para reconectarla. En Propiedades puedes añadir puntos y elegir el tipo de línea.</p>';
$('#dialog p:nth-of-type(1)').textContent = 'Añade figuras y carriles desde la biblioteca. Los carriles separan áreas y se mueven junto con las actividades contenidas.';
$('#dialog p:nth-of-type(2)').textContent = 'Selecciona una flecha y arrastra sus puntos morados para ajustar su recorrido. Arrastra un extremo blanco a otra figura para reconectarla. En Propiedades puedes elegir ángulos rectos, línea libre o curva, puntas, color y grosor.';
$('#dialog p:nth-of-type(3)').textContent = 'Puedes mover la etiqueta de una conexión arrastrándola. Doble clic edita texto; Mayús + clic selecciona varias figuras. Espacio + arrastrar mueve el lienzo y Ctrl + rueda cambia el zoom. Deshacer y Rehacer conservan figuras, carriles y conectores.';
$('#modehint').textContent = 'Conectores: puntos morados · Extremos: reconectar · Espacio: mover lienzo';

const baseValidate = $('#validate').onclick;
$('#validate').onclick = () => {
  const containers = model.nodes.filter(isContainer);
  model.nodes = model.nodes.filter(node => !isContainer(node));
  try { baseValidate(); } finally { model.nodes = [...containers, ...model.nodes]; }
};

fit = function () {
  const bounds = diagramBounds(model), rect = $('#canvas').getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;
  zoom = Math.max(.05, Math.min(1.2, (rect.width - 40) / bounds.width, (rect.height - 40) / bounds.height));
  pan = { x: (rect.width - bounds.width * zoom) / 2 - bounds.x * zoom, y: (rect.height - bounds.height * zoom) / 2 - bounds.y * zoom };
  draw();
};
$('#fit').onclick = fit;
$('#export').onclick = () => {
  if (!model.nodes.length) return toast('Añade una figura antes de exportar.');
  const svg = $('#canvas').cloneNode(true), bounds = diagramBounds(model);
  svg.querySelector('#paper')?.remove();
  svg.querySelector('#viewport').removeAttribute('transform');
  svg.querySelectorAll('.editor-ui,.hit').forEach(node => node.remove());
  svg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  svg.setAttribute('width', bounds.width); svg.setAttribute('height', bounds.height);
  svg.prepend(el('style', {}, '.node text{font:13px Segoe UI,sans-serif;fill:#365245}.edge .line{fill:none;marker-end:url(#arrow)}.edge text{font:11px Segoe UI,sans-serif;fill:#365245;paint-order:stroke;stroke:white;stroke-width:5}'));
  download(new XMLSerializer().serializeToString(svg), 'image/svg+xml', 'svg');
  toast('SVG exportado con carriles, estilos y recorrido de los conectores.');
};

render();
