export const PORTS = ['top', 'right', 'bottom', 'left'];
export const ROUTING_STYLES = ['orthogonal', 'straight', 'curve'];

export function portPosition(node, side) {
  return ({ top: { x: node.x + node.w / 2, y: node.y }, right: { x: node.x + node.w, y: node.y + node.h / 2 }, bottom: { x: node.x + node.w / 2, y: node.y + node.h }, left: { x: node.x, y: node.y + node.h / 2 } })[side];
}

export function nearestPort(node, point) {
  return PORTS.reduce((best, side) => {
    const current = portPosition(node, side), previous = portPosition(node, best);
    return Math.hypot(point.x - current.x, point.y - current.y) < Math.hypot(point.x - previous.x, point.y - previous.y) ? side : best;
  }, 'top');
}

function endpoints(edge, from, to) {
  const horizontal = Math.abs(to.x - from.x) > Math.abs(to.y - from.y) * 1.25;
  const startSide = PORTS.includes(edge.fromPort) ? edge.fromPort : horizontal ? (to.x > from.x ? 'right' : 'left') : (to.y > from.y ? 'bottom' : 'top');
  const endSide = PORTS.includes(edge.toPort) ? edge.toPort : horizontal ? (to.x > from.x ? 'left' : 'right') : (to.y > from.y ? 'top' : 'bottom');
  return { start: portPosition(from, startSide), end: portPosition(to, endSide), startSide, endSide };
}

function orthogonalPoints(anchors) {
  const points = [anchors[0]];
  for (let i = 1; i < anchors.length; i++) {
    const previous = points.at(-1), next = anchors[i];
    if (previous.x !== next.x && previous.y !== next.y) points.push({ x: next.x, y: previous.y });
    points.push({ ...next });
  }
  return points.filter((point, index) => !index || point.x !== points[index - 1].x || point.y !== points[index - 1].y);
}

export function connectionPath(edge, from, to) {
  const { start, end, startSide, endSide } = endpoints(edge, from, to);
  let points;
  if (edge.waypoints?.length) points = [start, ...edge.waypoints, end];
  else if (startSide === 'bottom' && endSide === 'bottom') {
    const y = Math.max(start.y, end.y) + 50;
    points = [start, { x: start.x, y }, { x: end.x, y }, end];
  } else if (startSide === 'left' || startSide === 'right') {
    const x = (start.x + end.x) / 2;
    points = [start, { x, y: start.y }, { x, y: end.y }, end];
  } else {
    const y = (start.y + end.y) / 2;
    points = [start, { x: start.x, y }, { x: end.x, y }, end];
  }
  if (edge.routing === 'straight' && !edge.waypoints?.length) points = [start, end];
  if (edge.routing !== 'straight' && edge.routing !== 'curve') points = orthogonalPoints(points);
  let d = points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
  if (edge.routing === 'curve') {
    if (edge.waypoints?.length) {
      const [control, ...rest] = edge.waypoints;
      d = `M${start.x} ${start.y} Q${control.x} ${control.y} ${rest.length ? rest[0].x : end.x} ${rest.length ? rest[0].y : end.y}`;
      for (const point of [...rest.slice(1), ...(rest.length ? [end] : [])]) d += ` T${point.x} ${point.y}`;
    } else {
      const dx = Math.max(50, Math.abs(end.x - start.x) / 2);
      d = `M${start.x} ${start.y} C${start.x + (startSide === 'left' ? -dx : dx)} ${start.y}, ${end.x + (endSide === 'right' ? dx : -dx)} ${end.y}, ${end.x} ${end.y}`;
    }
  }
  const middle = points[Math.floor((points.length - 1) / 2)], next = points[Math.ceil((points.length - 1) / 2)];
  return { d, x: (middle.x + next.x) / 2 + (edge.labelOffset?.x || 0), y: (middle.y + next.y) / 2 - 10 + (edge.labelOffset?.y || 0), points, start, end };
}

export function diagramBounds(model, padding = 60) {
  if (!model.nodes.length) return { x: 0, y: 0, width: 800, height: 500 };
  const points = model.nodes.flatMap(node => [{ x: node.x, y: node.y }, { x: node.x + node.w, y: node.y + node.h }]);
  const nodes = new Map(model.nodes.map(node => [node.id, node]));
  for (const edge of model.edges) {
    const route = connectionPath(edge, nodes.get(edge.from), nodes.get(edge.to));
    points.push(...route.points, { x: route.x - edge.text.length * 3, y: route.y - 18 }, { x: route.x + edge.text.length * 3, y: route.y + 18 });
  }
  const x = Math.min(...points.map(point => point.x)) - padding, y = Math.min(...points.map(point => point.y)) - padding;
  return { x, y, width: Math.max(...points.map(point => point.x)) - x + padding, height: Math.max(...points.map(point => point.y)) - y + padding };
}
