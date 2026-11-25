import { SHAPES } from './shapes.js';
import { PORTS, ROUTING_STYLES } from './routing.js';
export { connectionPath } from './routing.js';
export const STORAGE_KEY = 'orbita-flow-studio-v1';
export const SHAPE_TYPES = Object.keys(SHAPES);

export function validateModel(model) {
  if (!model || typeof model.title !== 'string' || !Array.isArray(model.nodes) || !Array.isArray(model.edges) || model.nodes.length > 3000 || model.edges.length > 6000) throw new Error('Formato de flujograma no válido.');
  const ids = new Set();
  for (const node of model.nodes) {
    if (typeof node.id !== 'string' || ids.has(node.id) || !SHAPE_TYPES.includes(node.type) || typeof node.text !== 'string' || ![node.x, node.y, node.w, node.h].every(Number.isFinite) || node.w < 40 || node.h < 30 || node.w > 2000 || node.h > 2000 || !/^#[0-9a-f]{6}$/i.test(node.color)) throw new Error('El flujograma contiene una figura no válida.');
    ids.add(node.id);
  }
  const edgeIds = new Set();
  for (const edge of model.edges) {
    if (typeof edge.id !== 'string' || edgeIds.has(edge.id) || !ids.has(edge.from) || !ids.has(edge.to) || typeof edge.text !== 'string') throw new Error('El flujograma contiene una conexión no válida.');
    if ([edge.fromPort, edge.toPort].some(port => port !== undefined && !PORTS.includes(port))) throw new Error('Punto de conexión no válido.');
    if (edge.routing !== undefined && !ROUTING_STYLES.includes(edge.routing)) throw new Error('Tipo de conector no válido.');
    if (edge.waypoints !== undefined && (!Array.isArray(edge.waypoints) || edge.waypoints.length > 100 || edge.waypoints.some(point => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.x) > 1e7 || Math.abs(point.y) > 1e7))) throw new Error('Puntos de ajuste no válidos.');
    if (edge.color !== undefined && !/^#[0-9a-f]{6}$/i.test(edge.color)) throw new Error('Color de conector no válido.');
    if (edge.width !== undefined && (!Number.isFinite(edge.width) || edge.width < .5 || edge.width > 12)) throw new Error('Grosor de conector no válido.');
    if (edge.arrows !== undefined && !['start', 'end', 'both', 'none'].includes(edge.arrows)) throw new Error('Punta de conector no válida.');
    if (edge.labelOffset !== undefined && (!Number.isFinite(edge.labelOffset.x) || !Number.isFinite(edge.labelOffset.y))) throw new Error('Posición de etiqueta no válida.');
    edgeIds.add(edge.id);
  }
  return model;
}

export function createStrategyModel(activities, teams) {
  const colors = ['#e5f0e5', '#eee8fa', '#fff2d8'];
  const nodes = [], edges = [];
  const grouped = teams.map(team => activities.filter(task => task.area === team).sort((a, b) => a.start - b.start));
  const columns = Math.max(1, ...grouped.map(list => list.length));
  const decisionX = 210 + columns * 250;
  const middle = 120 + (teams.length - 1) * 130;
  nodes.push({ id: 'start', type: 'start', text: 'Inicio', x: 20, y: middle - 25, w: 130, h: 50, color: '#e5f0e5' });
  nodes.push({ id: 'end', type: 'start', text: 'Fin', x: decisionX + 275, y: middle - 25, w: 130, h: 50, color: '#e5f0e5' });
  grouped.forEach((list, teamIndex) => {
    const center = 120 + teamIndex * 260;
    let previous = 'start';
    list.forEach((task, index) => {
      const id = `task-${task.id}`;
      nodes.push({ id, taskId: task.id, type: task.deliverable ? 'document' : 'process', text: `${teams[teamIndex]}\n${task.title}`, x: 210 + index * 250, y: center - 39, w: 210, h: 78, color: colors[teamIndex % colors.length] });
      edges.push({ id: `sequence-${id}`, from: previous, to: id, text: '' });
      previous = id;
    });
    const gate = `gate-${teamIndex}`;
    nodes.push({ id: gate, type: 'decision', text: '¿Resultado\nvalidado?', x: decisionX, y: center - 55, w: 180, h: 110, color: '#fff2d8' });
    edges.push({ id: `review-${teamIndex}`, from: previous, to: gate, text: '' });
    edges.push({ id: `approved-${teamIndex}`, from: gate, to: 'end', text: 'Sí' });
    if (previous !== 'start') edges.push({ id: `changes-${teamIndex}`, from: gate, to: previous, fromPort: 'bottom', toPort: 'bottom', text: 'No · ajustar' });
  });
  return validateModel({ title: 'Ejecución estratégica del proyecto', nodes, edges });
}

