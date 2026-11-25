import { connectionPath, nearestPort, portPosition } from '../routing.js';
import { isContainer } from '../shapes.js';

let linkPort;
const routeFor = edge => connectionPath(edge, model.nodes.find(node => node.id === edge.from), model.nodes.find(node => node.id === edge.to));
const nodeHit = (point, except) => [...model.nodes].reverse().find(node => !isContainer(node) && node.id !== except && point.x >= node.x && point.x <= node.x + node.w && point.y >= node.y && point.y <= node.y + node.h);

function startHandle(event, kind, edge, index) {
  event.preventDefault(); event.stopPropagation(); hideMenu(); snapshot();
  if (kind === 'edge-bend') {
    const points = routeFor(edge).points.slice(1, -1);
    edge.waypoints = structuredClone(points);
  }
  gesture = { kind, id: edge.id, index, start: position(event), original: structuredClone(edge) };
  capture(event);
}

export function decorateConnections() {
  $('#arrow path').setAttribute('fill', 'context-stroke');
  $('#arrow').setAttribute('orient', 'auto-start-reverse');
  const layer = $('#interaction-layer');
  for (const [index, group] of [...$('#edges').children].entries()) {
    const edge = model.edges[index], route = routeFor(edge);
    group.dataset.edgeId = edge.id;
    const source = model.nodes.find(node => node.id === edge.from), destination = model.nodes.find(node => node.id === edge.to);
    group.setAttribute('role', 'button'); group.setAttribute('tabindex', '0');
    group.setAttribute('aria-label', `Conexión de ${source.text.replace(/\s+/g, ' ')} a ${destination.text.replace(/\s+/g, ' ')}`);
    group.onkeydown = event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); selectOne(edge.id); render(); } };
    const line = group.querySelector('.line');
    line.style.stroke = edge.color || '#71877f'; line.style.strokeWidth = edge.width || 1.8;
    line.style.strokeDasharray = edge.dashed ? '8 5' : 'none';
    line.style.markerStart = ['start', 'both'].includes(edge.arrows) ? 'url(#arrow)' : 'none';
    line.style.markerEnd = edge.arrows === 'none' || edge.arrows === 'start' ? 'none' : 'url(#arrow)';
    const label = group.querySelector('text');
    label.style.pointerEvents = 'auto'; label.style.cursor = 'move';
    label.onpointerdown = event => startHandle(event, 'edge-label', edge);
    if (edge.id !== selected || !layer) continue;
    const handle = (point, kind, i, endpoint = false) => {
      const circle = el('circle', { cx: point.x, cy: point.y, r: (endpoint ? 6 : 5) / zoom, class: 'connector-handle editor-ui', 'data-handle': kind, 'data-handle-index': i, fill: endpoint ? '#fff' : '#8c79b7', stroke: '#8069ad', 'stroke-width': 1.4 / zoom });
      circle.append(el('title', {}, endpoint ? 'Arrastra el extremo a otra figura' : 'Arrastra para ajustar el recorrido'));
      circle.onpointerdown = event => startHandle(event, kind, edge, i);
      layer.append(circle);
    };
    route.points.slice(1, -1).forEach((point, i) => handle(point, 'edge-bend', i));
    if (!edge.waypoints?.length && route.points.length === 2) handle({ x: (route.start.x + route.end.x) / 2, y: (route.start.y + route.end.y) / 2 }, 'edge-new-bend', 0);
    handle(route.start, 'edge-endpoint', 'from', true); handle(route.end, 'edge-endpoint', 'to', true);
  }
  if (gesture?.kind === 'edge-endpoint' && gesture.point) layer?.append(el('circle', { cx: gesture.point.x, cy: gesture.point.y, r: 8 / zoom, fill: '#a895d355', stroke: '#8f77bc', class: 'editor-ui' }));
  for (const group of $('#nodes').children) {
    const node = model.nodes.find(node => node.id === group.dataset.nodeId);
    if (!node || isContainer(node)) continue;
    const sides = ['top', 'right', 'bottom', 'left'];
    [...group.querySelectorAll('.connection-port')].forEach((port, index) => {
      const original = port.onpointerdown;
      port.onpointerdown = event => { original(event); if (gesture?.kind === 'link') gesture.fromPort = sides[index]; };
    });
  }
}

export function installConnectorGestures() {
  const originalMove = $('#canvas').onpointermove, originalUp = $('#canvas').onpointerup, originalLink = makeLink;
  makeLink = function (from, to) {
    const edge = originalLink(from, to);
    if (linkPort) { edge.fromPort = linkPort.from; edge.toPort = linkPort.to; }
    return edge;
  };
  $('#canvas').onpointermove = event => {
    if (!gesture?.kind.startsWith('edge-')) { originalMove(event); return; }
    const edge = model.edges.find(item => item.id === gesture.id), point = position(event);
    if (!edge) return;
    if (gesture.kind === 'edge-bend') edge.waypoints[gesture.index] = { x: Math.round(point.x / 6) * 6, y: Math.round(point.y / 6) * 6 };
    if (gesture.kind === 'edge-new-bend') edge.waypoints = [{ x: point.x, y: point.y }];
    if (gesture.kind === 'edge-label') edge.labelOffset = { x: (gesture.original.labelOffset?.x || 0) + point.x - gesture.start.x, y: (gesture.original.labelOffset?.y || 0) + point.y - gesture.start.y };
    if (gesture.kind === 'edge-endpoint') gesture.point = point;
    draw();
  };
  $('#canvas').onpointerup = event => {
    if (gesture?.kind.startsWith('edge-')) {
      const edge = model.edges.find(item => item.id === gesture.id);
      if (gesture.kind === 'edge-endpoint') {
        const point = position(event), target = nodeHit(point);
        if (target && target.id !== edge[gesture.index === 'from' ? 'to' : 'from']) {
          edge[gesture.index] = target.id;
          edge[gesture.index === 'from' ? 'fromPort' : 'toPort'] = nearestPort(target, point);
        }
      }
      gesture = null;
      if ($('#canvas').hasPointerCapture(event.pointerId)) $('#canvas').releasePointerCapture(event.pointerId);
      render(); return;
    }
    if (gesture?.kind === 'link') {
      const point = position(event), target = nodeHit(point, gesture.from);
      linkPort = { from: gesture.fromPort, to: target ? nearestPort(target, point) : undefined };
    }
    originalUp(event); linkPort = null;
  };
}

export function connectionProperties(edge, box) {
  const field = (label, values, selectedValue, change) => {
    const wrapper = document.createElement('label'); wrapper.textContent = label;
    const select = document.createElement('select'); select.setAttribute('aria-label', label);
    values.forEach(([value, title]) => { const option = document.createElement('option'); option.value = value; option.textContent = title; option.selected = value === selectedValue; select.append(option); });
    select.onchange = () => { snapshot(); change(select.value); render(); }; wrapper.append(select); box.append(wrapper);
  };
  field('Tipo de conector', [['orthogonal', 'Ángulos rectos'], ['straight', 'Línea libre'], ['curve', 'Curva']], edge.routing || 'orthogonal', value => { edge.routing = value; });
  const ports = [['auto', 'Automático'], ['top', 'Arriba'], ['right', 'Derecha'], ['bottom', 'Abajo'], ['left', 'Izquierda']];
  for (const [key, title] of [['fromPort', 'Salida de la figura'], ['toPort', 'Entrada a la figura']]) field(title, ports, edge[key] || 'auto', value => { if (value === 'auto') delete edge[key]; else edge[key] = value; });
  field('Puntas de flecha', [['end', 'Al final'], ['both', 'En ambos extremos'], ['start', 'Al inicio'], ['none', 'Sin puntas']], edge.arrows || 'end', value => { edge.arrows = value; });
  field('Trazo', [['solid', 'Continuo'], ['dashed', 'Discontinuo']], edge.dashed ? 'dashed' : 'solid', value => { edge.dashed = value === 'dashed'; });
  const color = document.createElement('input'); color.type = 'color'; color.value = edge.color || '#71877f'; color.setAttribute('aria-label', 'Color del conector');
  color.onchange = () => { snapshot(); edge.color = color.value; render(); }; const label = document.createElement('label'); label.textContent = 'Color del conector'; label.append(color); box.append(label);
  field('Grosor', [[ '1', 'Fino'], ['2', 'Normal'], ['3', 'Grueso'], ['5', 'Destacado']], String(edge.width || 2), value => { edge.width = Number(value); });
  const actions = document.createElement('div'); actions.className = 'connector-actions';
  const button = (text, action) => { const item = document.createElement('button'); item.textContent = text; item.onclick = () => { snapshot(); action(); render(); }; actions.append(item); };
  button('Añadir punto de ajuste', () => { const path = routeFor(edge); edge.waypoints = [...(edge.waypoints || []), { x: path.x, y: path.y + 50 }]; });
  button('Quitar último punto', () => { if (edge.waypoints?.length) edge.waypoints.pop(); });
  button('Restablecer recorrido', () => { delete edge.waypoints; delete edge.labelOffset; });
  const coordinates = document.createElement('div'); coordinates.className = 'waypoint-coordinates';
  (edge.waypoints || []).forEach((point, index) => {
    const row = document.createElement('div'); row.className = 'row';
    for (const key of ['x', 'y']) {
      const label = document.createElement('label'); label.textContent = `Punto ${index + 1} ${key.toUpperCase()}`;
      const input = document.createElement('input'); input.type = 'number'; input.step = 1; input.value = Math.round(point[key]); input.setAttribute('aria-label', label.textContent);
      let editing = false;
      input.oninput = () => {
        const value = Number(input.value);
        if (!input.value || !Number.isFinite(value) || Math.abs(value) > 1e7) return;
        const currentPoint = model.edges.find(item => item.id === edge.id)?.waypoints?.[index];
        if (!currentPoint) return;
        if (!editing) { snapshot(); editing = true; }
        currentPoint[key] = value;
        draw(); persist();
      };
      input.onchange = () => { editing = false; render(); };
      label.append(input); row.append(label);
    }
    coordinates.append(row);
  });
  const help = document.createElement('p'); help.className = 'inspector-help'; help.textContent = 'Arrastra los puntos morados para cambiar el recorrido. Los extremos blancos permiten reconectar la flecha. Arrastra su etiqueta para colocarla.';
  box.append(actions, coordinates, help);
}
