import { connectionPath } from './model.js';
import { shapeParts, isContainer } from './shapes.js';
import { diagramBounds } from './routing.js';

const NS = 'http://www.w3.org/2000/svg';
function element(tag, attributes = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function shape(node) {
  const parts = shapeParts(node.type, node.w, node.h).map(part => element(part.tag, part.attributes));
  if (parts.length === 1) return parts[0];
  const group = element('g'); group.append(...parts); return group;
}

function wrap(text, length) {
  return text.split('\n').flatMap(line => {
    const lines = [''];
    for (const word of line.split(' ')) {
      if (lines.at(-1) && `${lines.at(-1)} ${word}`.length > length) lines.push(word);
      else lines[lines.length - 1] = `${lines.at(-1)} ${word}`.trim();
    }
    return lines;
  });
}

export function renderPreview(container, model, fit = false) {
  container.replaceChildren();
  if (!model.nodes.length) {
    const empty = document.createElement('p');
    empty.className = 'studio-empty';
    empty.textContent = 'El lienzo está vacío. Abre Flujo Studio para añadir figuras.';
    container.append(empty);
    return;
  }
  const { x, y, width, height } = diagramBounds(model);
  const svg = element('svg', { viewBox: `${x} ${y} ${width} ${height}`, role: 'img', 'aria-label': model.title, class: 'studio-preview-svg', width: fit ? '100%' : Math.max(800, width * .8) });
  const marker = element('marker', { id: 'studio-preview-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
  marker.append(element('path', { d: 'M0 0L10 5L0 10Z', fill: 'context-stroke' }));
  const defs = element('defs');
  defs.append(marker);
  svg.append(defs);
  for (const node of model.nodes.filter(isContainer)) {
    const group = element('g', { transform: `translate(${node.x} ${node.y})`, class: 'studio-preview-container' });
    const figure = shape(node); figure.setAttribute('fill', node.color); figure.setAttribute('fill-opacity', '.22'); figure.setAttribute('stroke', '#a7b4c1'); group.append(figure);
    const horizontal = node.type === 'laneHorizontal';
    if (horizontal || node.type === 'laneVertical') group.append(element('path', { d: horizontal ? `M104 0V${node.h}` : `M0 42H${node.w}`, fill: 'none', stroke: '#a7b4c1' }));
    group.append(element('text', { x: horizontal ? 52 : 16, y: horizontal ? node.h / 2 : 26, 'text-anchor': horizontal ? 'middle' : 'start', ...(horizontal ? { transform: `rotate(-90 52 ${node.h / 2})` } : {}), class: 'studio-preview-label' }, node.text));
    svg.append(group);
  }
  const nodes = new Map(model.nodes.map(node => [node.id, node]));
  for (const edge of model.edges) {
    const route = connectionPath(edge, nodes.get(edge.from), nodes.get(edge.to));
    const line = element('path', { d: route.d, class: 'studio-preview-edge' });
    line.style.stroke = edge.color || '#7d8d9a'; line.style.strokeWidth = edge.width || 1.7; line.style.strokeDasharray = edge.dashed ? '8 5' : 'none';
    line.style.markerStart = ['start', 'both'].includes(edge.arrows) ? 'url(#studio-preview-arrow)' : 'none';
    line.style.markerEnd = edge.arrows === 'none' || edge.arrows === 'start' ? 'none' : 'url(#studio-preview-arrow)';
    svg.append(line);
    svg.append(element('text', { x: route.x, y: route.y, class: 'studio-preview-edge-label' }, edge.text));
  }
  for (const node of model.nodes.filter(node => !isContainer(node))) {
    const group = element('g', { transform: `translate(${node.x} ${node.y})`, class: 'studio-preview-node' });
    group.append(element('title', {}, node.text));
    const figure = shape(node);
    figure.setAttribute('fill', node.color);
    figure.setAttribute('class', 'studio-preview-shape');
    group.append(figure);
    const lines = wrap(node.text, Math.max(8, Math.floor(node.w / (node.type === 'decision' ? 12 : 8))));
    const text = element('text', { x: node.w / 2, y: node.h / 2 - (lines.length - 1) * 9 + 4, 'text-anchor': 'middle', class: 'studio-preview-label' });
    lines.forEach((line, index) => text.append(element('tspan', { x: node.w / 2, dy: index ? 18 : 0 }, line)));
    group.append(text);
    svg.append(group);
  }
  container.append(svg);
}
