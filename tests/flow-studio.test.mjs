import assert from 'node:assert/strict';
import { createStrategyModel, validateModel, connectionPath } from '../src/flow-studio/model.js';
import { SHAPES, shapeParts } from '../src/flow-studio/shapes.js';
import { diagramBounds } from '../src/flow-studio/routing.js';
import { contains } from '../src/flow-studio/editor/containers.js';

const activities = [
  { id: 1, title: 'Diagnóstico', area: 'Calidad', start: 0, deliverable: false },
  { id: 2, title: 'Manual', area: 'Calidad', start: 1, deliverable: true },
  { id: 3, title: 'Prototipo', area: 'Digital', start: 1, deliverable: true },
];
const diagram = createStrategyModel(activities, ['Calidad', 'Digital']);
assert.equal(diagram.nodes.filter(node => node.taskId).length, 3);
assert.equal(diagram.nodes.find(node => node.id === 'task-2').type, 'document');
for (const gate of diagram.nodes.filter(node => node.type === 'decision')) {
  const edges = diagram.edges.filter(edge => edge.from === gate.id);
  assert.equal(edges.length, 2);
  assert(edges.some(edge => edge.text === 'Sí'));
  assert(edges.some(edge => edge.text.startsWith('No')));
}
const copy = () => structuredClone(diagram);
let invalid = copy(); invalid.nodes[1].id = invalid.nodes[0].id; assert.throws(() => validateModel(invalid));
invalid = copy(); invalid.edges[0].to = 'missing'; assert.throws(() => validateModel(invalid));
invalid = copy(); invalid.nodes[0].color = 'url(https://example.com)'; assert.throws(() => validateModel(invalid));
invalid = copy(); invalid.edges[0].fromPort = 'toString'; assert.throws(() => validateModel(invalid));
invalid = copy(); invalid.nodes[0].x = Infinity; assert.throws(() => validateModel(invalid));
for (const edge of diagram.edges) {
  const route = connectionPath(edge, diagram.nodes.find(node => node.id === edge.from), diagram.nodes.find(node => node.id === edge.to));
  assert(!/NaN|Infinity|undefined/.test(route.d));
}
assert.doesNotThrow(() => validateModel({ title: 'Vacío', nodes: [], edges: [] }));
assert.equal(Object.keys(SHAPES).length, 17);
for (const [type, { size }] of Object.entries(SHAPES)) {
  assert(shapeParts(type, ...size).length > 0);
  assert(!/NaN|Infinity|undefined/.test(JSON.stringify(shapeParts(type, ...size))));
  const single = { title: type, nodes: [{ id: type, type, text: type, x: 0, y: 0, w: size[0], h: size[1], color: '#ffffff' }], edges: [] };
  assert.doesNotThrow(() => validateModel(single));
}
const editable = copy();
const edge = editable.edges[0];
Object.assign(edge, { routing: 'orthogonal', waypoints: [{ x: 220, y: 900 }, { x: 300, y: 950 }], color: '#8877aa', width: 3, arrows: 'both', dashed: true, labelOffset: { x: 12, y: 20 } });
assert.doesNotThrow(() => validateModel(editable));
const from = editable.nodes.find(node => node.id === edge.from), to = editable.nodes.find(node => node.id === edge.to);
const routed = connectionPath(edge, from, to);
for (let i = 1; i < routed.points.length; i++) assert(routed.points[i].x === routed.points[i - 1].x || routed.points[i].y === routed.points[i - 1].y);
edge.routing = 'curve'; assert(connectionPath(edge, from, to).d.includes('Q'));
edge.routing = 'straight'; assert(connectionPath(edge, from, to).d.includes('L'));
const bounds = diagramBounds(editable); assert(bounds.y + bounds.height > 950);
invalid = copy(); invalid.edges[0].waypoints = [{ x: NaN, y: 0 }]; assert.throws(() => validateModel(invalid));
invalid = copy(); invalid.edges[0].width = 100; assert.throws(() => validateModel(invalid));
invalid = copy(); invalid.edges[0].routing = 'script'; assert.throws(() => validateModel(invalid));
const lane = { type: 'laneHorizontal', x: 0, y: 0, w: 500, h: 200 };
assert(contains(lane, { type: 'process', x: 100, y: 50, w: 100, h: 50 }));
assert(!contains(lane, { type: 'process', x: 800, y: 50, w: 100, h: 50 }));
assert(!contains(lane, { type: 'section', x: 100, y: 50, w: 100, h: 50 }));
console.log('Flujo Studio: plantilla, decisiones Sí/No, documentos, conexiones y validación de modelos verificados.');
console.log('Ampliación: 17 figuras, carriles, rutas manuales, curvas, estilos, límites de exportación y pertenencia a áreas verificados.');
