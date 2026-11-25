import { isContainer } from '../shapes.js';

export function contains(container, node) {
  const x = node.x + node.w / 2, y = node.y + node.h / 2;
  return !isContainer(node) && x >= container.x && x <= container.x + container.w && y >= container.y && y <= container.y + container.h;
}

export function decorateContainers() {
  for (const node of model.nodes.filter(isContainer)) {
    const group = [...document.querySelectorAll('#nodes > .node')].find(item => item.dataset.nodeId === node.id);
    if (!group) continue;
    group.classList.add('container-node');
    const figure = group.querySelector('.shape');
    figure.setAttribute('fill-opacity', '.22');
    const text = group.querySelector('text');
    text.replaceChildren();
    text.textContent = node.text;
    text.setAttribute('x', node.type === 'laneHorizontal' ? 52 : 16);
    text.setAttribute('y', node.type === 'laneHorizontal' ? node.h / 2 : 26);
    text.setAttribute('text-anchor', node.type === 'laneHorizontal' ? 'middle' : 'start');
    text.style.font = '600 14px Segoe UI,sans-serif';
    if (node.type === 'laneHorizontal') text.setAttribute('transform', `rotate(-90 52 ${node.h / 2})`);
    if (node.type === 'laneHorizontal' || node.type === 'laneVertical') {
      const line = node.type === 'laneHorizontal' ? `M104 0V${node.h}` : `M0 42H${node.w}`;
      group.insertBefore(el('path', { d: line, fill: 'none', stroke: '#9cb4a5', 'stroke-width': 1 }), text);
    }
    group.querySelectorAll('.connection-port').forEach(port => port.remove());
  }
}

export function assignContainers() {
  const containers = model.nodes.filter(isContainer);
  for (const node of model.nodes.filter(node => !isContainer(node))) {
    const container = containers.find(container => contains(container, node));
    if (container) node.containerId = container.id;
    else delete node.containerId;
  }
}

export function addAreaLanes() {
  const teams = ['Calidad', 'Digital', 'Marketing'];
  snapshot();
  let added = 0;
  teams.forEach((team, index) => {
    if (model.nodes.some(node => isContainer(node) && node.text === team)) return;
    const children = model.nodes.filter(node => !isContainer(node) && (node.area === team || node.text.split('\n')[0] === team));
    if (!children.length) return;
    const left = Math.min(...children.map(node => node.x)) - 130;
    const top = Math.min(...children.map(node => node.y)) - 35;
    const right = Math.max(...children.map(node => node.x + node.w)) + 35;
    const bottom = Math.max(...children.map(node => node.y + node.h)) + 35;
    const lane = { id: uid(), type: 'laneHorizontal', text: team, x: left, y: top, w: right - left, h: bottom - top, color: ['#d9eee5', '#e5dcf5', '#f9e9c8'][index] };
    model.nodes.unshift(lane);
    children.forEach(node => { node.containerId = lane.id; });
    added++;
  });
  selectOne(null);
  render();
  fit();
  toast(added ? `${added} carriles creados. Al mover un carril se mueven sus actividades.` : 'No hay áreas nuevas para separar. Puedes añadir carriles desde Formas.');
}

export function installContainerMovement() {
  const originalDown = nodeDown;
  nodeDown = function (event, node) {
    originalDown(event, node);
    if (gesture?.kind !== 'move') return;
    const selectedContainers = gesture.originals.filter(isContainer);
    if (selectedContainers.length) {
      const ids = new Set(gesture.originals.map(item => item.id));
      for (const child of model.nodes) if (selectedContainers.some(container => contains(container, child)) && !ids.has(child.id)) gesture.originals.push({ ...child });
    }
    const moving = new Set(gesture.originals.map(item => item.id));
    gesture.movingEdges = model.edges.filter(edge => moving.has(edge.from) && moving.has(edge.to) && edge.waypoints?.length).map(edge => ({ id: edge.id, points: structuredClone(edge.waypoints) }));
  };
}
