export const SHAPES = {
  start: { name: 'Inicio / Fin', group: 'Básicas', size: [170, 58] },
  process: { name: 'Proceso', group: 'Básicas', size: [190, 70] },
  decision: { name: 'Decisión', group: 'Básicas', size: [190, 116] },
  subprocess: { name: 'Subproceso', group: 'Básicas', size: [200, 76] },
  preparation: { name: 'Preparación', group: 'Básicas', size: [190, 76] },
  manual: { name: 'Operación manual', group: 'Básicas', size: [190, 76] },
  delay: { name: 'Espera', group: 'Básicas', size: [160, 76] },
  connector: { name: 'Conector circular', group: 'Básicas', size: [76, 76] },
  offpage: { name: 'Conector fuera de página', group: 'Básicas', size: [110, 100] },
  input: { name: 'Entrada / Salida', group: 'Datos y documentos', size: [200, 76] },
  document: { name: 'Documento', group: 'Datos y documentos', size: [200, 84] },
  multidocument: { name: 'Varios documentos', group: 'Datos y documentos', size: [200, 96] },
  database: { name: 'Base de datos', group: 'Datos y documentos', size: [170, 96] },
  note: { name: 'Anotación', group: 'Datos y documentos', size: [220, 100] },
  laneHorizontal: { name: 'Carril horizontal', group: 'Áreas y secciones', size: [1100, 230] },
  laneVertical: { name: 'Carril vertical', group: 'Áreas y secciones', size: [330, 740] },
  section: { name: 'Sección / Contenedor', group: 'Áreas y secciones', size: [800, 420] },
};
export const isContainer = node => ['laneHorizontal', 'laneVertical', 'section'].includes(node?.type);

export function shapeParts(type, w, h) {
  const rect = attributes => ({ tag: 'rect', attributes: { width: w, height: h, rx: 5, ...attributes } });
  const path = d => ({ tag: 'path', attributes: { d } });
  const polygon = points => ({ tag: 'polygon', attributes: { points } });
  switch (type) {
    case 'decision': return [polygon(`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`)];
    case 'document': return [path(`M0 0H${w}V${h - 12}Q${w * .75} ${h - 25} ${w / 2} ${h - 12}T0 ${h - 12}Z`)];
    case 'multidocument': return [path(`M16 0H${w}V${h - 26}H16Z`), path(`M8 8H${w - 8}V${h - 18}H8Z`), path(`M0 16H${w - 16}V${h - 12}Q${w * .7} ${h - 25} ${w / 2} ${h - 12}T0 ${h - 12}Z`)];
    case 'database': return [path(`M0 12C0 -4 ${w} -4 ${w} 12V${h - 12}C${w} ${h + 4} 0 ${h + 4} 0 ${h - 12}ZM0 12C0 28 ${w} 28 ${w} 12`)];
    case 'subprocess': return [rect(), { ...path(`M14 0V${h}M${w - 14} 0V${h}`), attributes: { d: `M14 0V${h}M${w - 14} 0V${h}`, fill: 'none' } }];
    case 'input': return [polygon(`20,0 ${w},0 ${w - 20},${h} 0,${h}`)];
    case 'preparation': return [polygon(`20,0 ${w - 20},0 ${w},${h / 2} ${w - 20},${h} 20,${h} 0,${h / 2}`)];
    case 'manual': return [polygon(`0,0 ${w},0 ${w - 25},${h} 25,${h}`)];
    case 'delay': return [path(`M0 0H${w - h / 2}A${h / 2} ${h / 2} 0 0 1 ${w - h / 2} ${h}H0Z`)];
    case 'connector': return [{ tag: 'ellipse', attributes: { cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2 } }];
    case 'offpage': return [polygon(`0,0 ${w},0 ${w},${h * .7} ${w / 2},${h} 0,${h * .7}`)];
    case 'note': return [rect({ stroke: 'none' }), { tag: 'path', attributes: { d: `M18 0H0V${h}H18`, fill: 'none' } }];
    case 'start': return [rect({ rx: h / 2 })];
    case 'laneHorizontal': return [rect({ rx: 2 })];
    case 'laneVertical': return [rect({ rx: 2 })];
    case 'section': return [rect({ rx: 8, 'stroke-dasharray': '8 5' })];
    default: return [rect()];
  }
}
