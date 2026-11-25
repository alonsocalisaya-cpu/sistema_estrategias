import { SHAPES, isContainer, shapeParts } from '../shapes.js';

export function makeGeometry(type, width, height) {
  const parts = shapeParts(type, width, height).map(part => el(part.tag, part.attributes));
  if (parts.length === 1) return parts[0];
  const group = el('g');
  group.append(...parts);
  return group;
}

export function installPalette() {
  geometry = makeGeometry;
  add = function (type, point) {
    if (!SHAPES[type]) return;
    snapshot();
    const [w, h] = SHAPES[type].size;
    const rect = $('#canvas').getBoundingClientRect();
    const node = { id: uid(), type, text: SHAPES[type].name, x: point?.x ?? (rect.width / 2 - pan.x) / zoom - w / 2, y: point?.y ?? (rect.height / 2 - pan.y) / zoom - h / 2, w, h, color: isContainer({ type }) ? '#e7eff9' : type === 'decision' ? '#fff2d8' : '#ffffff' };
    if (isContainer(node)) model.nodes.unshift(node); else model.nodes.push(node);
    selectOne(node.id);
    setMode('select');
    render();
  };
  const search = document.createElement('input');
  search.type = 'search'; search.placeholder = 'Buscar figuras…'; search.setAttribute('aria-label', 'Buscar figuras'); search.className = 'shape-search';
  $('#shapes').before(search);
  const build = () => {
    $('#shapes').replaceChildren();
    let category;
    for (const [type, info] of Object.entries(SHAPES)) {
      if (!info.name.toLocaleLowerCase('es').includes(search.value.toLocaleLowerCase('es'))) continue;
      if (category !== info.group) { category = info.group; const title = document.createElement('h3'); title.className = 'shape-category'; title.textContent = category; $('#shapes').append(title); }
      const button = document.createElement('button');
      button.className = 'shape-item'; button.draggable = true; button.dataset.shapeType = type; button.title = info.name;
      const svg = el('svg', { viewBox: '-2 -2 66 46', 'aria-hidden': 'true' });
      const shape = makeGeometry(type, 60, 40); shape.setAttribute('fill', '#f0eef8'); shape.setAttribute('stroke', '#9990b0'); svg.append(shape);
      const label = document.createElement('span'); label.textContent = info.name;
      button.append(svg, label); button.onclick = () => add(type); button.ondragstart = event => event.dataTransfer.setData('text/plain', type);
      $('#shapes').append(button);
    }
  };
  search.oninput = build;
  build();
}
