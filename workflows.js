let backlogView='list',backlogQuery='',backlogSort='priority';
const backlogStatuses = ['pending', 'progress', 'done'];
const searchKey = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
const deliveryDate = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const priorityNames={1:'Alta',2:'Media',3:'Baja'};
const priorityOf=t=>[1,2,3].includes(Number(t.priority))?Number(t.priority):t.status==='progress'?1:2;
const backlogState=s=>({pending:'Por hacer',progress:'En curso',done:'Completado'})[s];
function render(){renderLegacy();renderProject();renderBacklog();renderStrategyMap();}
function deliveryStatusControl(task) {
  return `<select class="backlog-status ${task.status}" data-change-status="${task.id}" aria-label="Estado de ${safe(task.title)}">
    ${backlogStatuses.map(value => `<option value="${value}" ${value === task.status ? 'selected' : ''}>${backlogState(value)}</option>`).join('')}
  </select>`;
}

function deliveryTable(tasks) {
  const rows = tasks.map(task => {
    const due = taskDates(task).end - DAY_MS;
    return `<tr>
      <td><button class="backlog-title" data-task="${task.id}">${safe(task.title)}</button></td>
      <td><span class="area-chip ${classes[task.area]}">${task.area}</span></td>
      <td>${deliveryStatusControl(task)}</td>
      <td><time datetime="${dateISO(due)}">${deliveryDate.format(due)}</time></td>
    </tr>`;
  });
  return `<div class="delivery-table-scroll" role="region" aria-label="Listado de entregables" tabindex="0">
    <table class="delivery-table">
      <thead><tr><th scope="col">Entregable</th><th scope="col">Área</th><th scope="col">Estado</th><th scope="col">Fecha de entrega</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  </div>`;
}

function backlogCard(task) {
  const priority = priorityOf(task);
  const owner = owners[task.area];
  const due = taskDates(task).end - DAY_MS;
  return `
    <article class="backlog-item kanban-card" draggable="true" data-card="${task.id}">
      <div class="backlog-item-top">
        <span class="area-chip ${classes[task.area]}">${task.area}</span>
        <span class="priority-badge p${priority}">Prioridad ${priorityNames[priority].toLowerCase()}</span>
      </div>
      <button class="backlog-title" data-task="${task.id}">${safe(task.title)}</button>
      <div class="backlog-item-bottom">
        <span class="owner-pill">${owner}</span>
        <time class="backlog-date" datetime="${dateISO(due)}">Entrega: ${deliveryDate.format(due)}</time>
        ${deliveryStatusControl(task)}
      </div>
    </article>`;
}

function clearBacklog() {
  backlogQuery = '';
  status = 'all';
  $('#backlog-search').value = '';
  renderBacklog();
  $('#backlog-search').focus();
}

function updateDeliveryStatus(task, nextStatus, fromSelect = false) {
  if (!task?.deliverable || task.status === nextStatus) return;
  task.status = nextStatus;
  persist();
  render();
  if (fromSelect) {
    const select = $(`[data-change-status="${task.id}"]`);
    (select || $('[data-status].selected')).focus({ preventScroll: true });
  }
  toast('Estado actualizado: ' + backlogState(task.status));
}

function renderBacklog() {
  const query = searchKey(backlogQuery.trim());
  const areaTasks = tasks.filter(task => task.deliverable && (area === 'all' || task.area === area));
  const matches = areaTasks.filter(task => searchKey(`${task.title} ${owners[task.area]} ${task.area}`).includes(query));
  const results = matches.filter(task => status === 'all' || task.status === status);
  results.sort((a, b) => {
    if (backlogSort === 'name') return a.title.localeCompare(b.title, 'es');
    if (backlogSort === 'due') return taskDates(a).end - taskDates(b).end;
    if (backlogSort === 'date') return a.start - b.start;
    return priorityOf(a) - priorityOf(b) || a.start - b.start;
  });
  document.querySelectorAll('[data-status]').forEach(button => {
    const value = button.dataset.status;
    button.classList.toggle('selected', status === value);
    button.setAttribute('aria-pressed', String(status === value));
    button.querySelector('span').textContent = value === 'all' ? matches.length : matches.filter(task => task.status === value).length;
  });
  $('#clear-backlog').hidden = !query && status === 'all';
  $('#backlog-summary').textContent = `${results.length} de ${areaTasks.length} entregables`;

  const board = backlogView === 'board';
  const list = $('#deliverable-list');
  list.classList.toggle('board-mode', board && results.length > 0);
  if (!results.length) {
    list.innerHTML = areaTasks.length
      ? '<div class="backlog-empty"><b>No hay entregables que coincidan con los filtros.</b></div>'
      : '<div class="backlog-empty"><b>Aún no hay entregables para esta selección de área.</b></div>';
    return;
  }

  list.innerHTML = board ? backlogStatuses.map(value => {
    const items = results.filter(task => task.status === value);
    return `<section class="kanban-column" data-drop-status="${value}" aria-label="${backlogState(value)}">
      <h3><i class="state-dot ${value}"></i>${backlogState(value)}<span>${items.length}</span></h3>
      <div class="kanban-items">${items.map(task => backlogCard(task)).join('') || '<div class="kanban-empty">Sin entregables</div>'}</div>
    </section>`;
  }).join('') : deliveryTable(results);

  list.querySelectorAll('[data-change-status]').forEach(select => {
    select.onchange = () => updateDeliveryStatus(tasks.find(task => String(task.id) === select.dataset.changeStatus), select.value, true);
  });
  list.querySelectorAll('[draggable="true"]').forEach(card => {
    card.ondragstart = event => {
      event.dataTransfer.setData('text/plain', card.dataset.card);
      event.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    };
    card.ondragend = () => {
      card.classList.remove('dragging');
      list.querySelector('.drop-active')?.classList.remove('drop-active');
    };
  });
  list.querySelectorAll('[data-drop-status]').forEach(column => {
    column.ondragover = event => {
      if (!list.querySelector('.dragging')) return;
      event.preventDefault();
      column.classList.add('drop-active');
    };
    column.ondragleave = event => {
      if (!column.contains(event.relatedTarget)) column.classList.remove('drop-active');
    };
    column.ondrop = event => {
      event.preventDefault();
      column.classList.remove('drop-active');
      const card = list.querySelector('.dragging');
      updateDeliveryStatus(tasks.find(task => String(task.id) === card?.dataset.card), column.dataset.dropStatus);
    };
  });
}
function showTaskBase(id){const t=tasks.find(t=>t.id===Number(id));if(!t)return;const currentPriority=priorityOf(t);$('#detail-content').innerHTML=`<div class="eyebrow">${t.deliverable?'BACKLOG DE ENTREGABLES':'ACTIVIDAD DEL PLAN'} · ORB-${String(tasks.indexOf(t)+1).padStart(3,'0')}</div><h2>${safe(t.title)}</h2><div class="detail-owner"><span class="owner-avatar ${classes[t.area]}">${owners[t.area].split(' ').map(s=>s[0]).join('')}</span><div><b>${owners[t.area]}</b><small>Responsable · ${t.area}</small></div></div><div class="form-grid"><label>Estado<select id="detail-status">${['pending','progress','done'].map(s=>`<option value="${s}" ${t.status===s?'selected':''}>${backlogState(s)}</option>`).join('')}</select></label><label>Prioridad<select id="detail-priority">${[1,2,3].map(p=>`<option value="${p}" ${currentPriority===p?'selected':''}>${priorityNames[p]}</option>`).join('')}</select></label></div><div class="detail-meta">Inicio: <b>${months[Math.floor(t.start)]} ${t.start===0?'2025':'2026'}</b><br>Duración: <b>${t.duration} mes(es)</b></div><p>Los cambios se reflejan en el backlog, el cronograma y los indicadores.</p><button class="button primary" id="save-detail">Guardar cambios</button>`;$('#detail').showModal();$('#save-detail').onclick=()=>{t.status=$('#detail-status').value;t.priority=Number($('#detail-priority').value);persist();render();$('#detail').close();toast('Actividad actualizada')};}
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('[data-backlog-view]').forEach(b=>b.onclick=()=>{backlogView=b.dataset.backlogView;document.querySelectorAll('[data-backlog-view]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});renderBacklog()});$('#backlog-search').oninput=e=>{backlogQuery=e.target.value;renderBacklog()};$('#backlog-sort').onchange=e=>{backlogSort=e.target.value;renderBacklog()};$('#add-deliverable').onclick=()=>openActivity(true);$('#clear-backlog').onclick=clearBacklog;});

const strategyPhases = [
  {
    title: 'Entender',
    question: '¿Qué problema vale la pena resolver?',
    contributions: [
      [1, 'Detecta fricciones y riesgos del proceso actual.'],
      [5, 'Delimita el problema y el alcance de la solución.'],
      [9, 'Define cómo comunicar el cambio.']
    ],
    outcome: 'Un problema priorizado y una dirección compartida.'
  },
  {
    title: 'Diseñar',
    question: '¿Cómo sabremos que la solución funciona?',
    contributions: [
      [2, 'Traduce los riesgos en criterios de aceptación.'],
      [6, 'Hace tangible la experiencia para validarla.'],
      [10, 'Identifica a quién debe servir y qué necesita.']
    ],
    outcome: 'Una propuesta validable con criterios claros y públicos definidos.'
  },
  {
    title: 'Implementar',
    question: '¿Cómo llevamos la solución al trabajo diario?',
    contributions: [
      [3, 'Documenta el proceso y facilita su adopción.'],
      [7, 'Convierte el prototipo en una solución operativa.'],
      [11, 'Comunica el lanzamiento a las audiencias relevantes.']
    ],
    outcome: 'Una solución operativa, documentada y comunicada.'
  },
  {
    title: 'Aprender',
    question: '¿Qué evidencia orienta el siguiente ciclo?',
    contributions: [
      [4, 'Recoge observaciones sobre el proceso.'],
      [8, 'Identifica problemas de uso y oportunidades de mejora.'],
      [12, 'Reúne la evidencia para evaluar el resultado.']
    ],
    outcome: 'Un balance compartido para decidir qué mantener y qué mejorar.'
  }
];


const phaseGates = [
  ['¿Prioridad', 'acordada?'],
  ['¿Diseño', 'validado?'],
  ['¿Operación', 'estable?'],
  ['¿Listo para', 'escalar?']
];
const phaseCorrections = ['Revisar alcance', 'Ajustar propuesta', 'Corregir incidencias', 'Revisar evidencias'];

function diagramLabel(lines, x, y, className) {
  return `<text class="${className}" x="${x}" y="${y}" text-anchor="middle">${lines.map((line, index) =>
    `<tspan x="${x}" dy="${index ? 16 : 0}">${safe(line)}</tspan>`).join('')}</text>`;
}

function renderStrategyMap() {
  const selectedAreas = areas.filter(team => area === 'all' || area === team);
  const columns = [206, 508, 810, 1112];
  const laneTop = 151;
  const laneHeight = 100;
  const laneBottom = laneTop + selectedAreas.length * laneHeight;
  const lastCenter = laneBottom - laneHeight / 2;
  const correctionY = laneBottom + 51;
  const width = 1500;

  const stages = strategyPhases.map((phase, index) => {
    const x = columns[index];
    const gate = x + 208;
    const nextX = columns[index + 1];
    const exit = gate + 52;
    const outcome = phase.outcome;
    return `<g class="diagram-stage">
      <rect x="${x - 12}" y="22" width="${index === 3 ? 270 : 290}" height="56" rx="8"/>
      <text x="${x + 4}" y="45">${phase.title}</text>
      <text class="diagram-question" x="${x + 4}" y="64">${safe(phase.question)}</text>
    </g>
    <path class="diagram-arrow" d="M ${x + 166} 111 H ${gate - 55}"/>
    <path class="diagram-decision" d="M ${gate} 82 l 53 29 -53 29 -53 -29 Z"><title>${safe(outcome)}</title></path>
    ${diagramLabel(phaseGates[index], gate, 108, 'diagram-decision-text')}
    <path class="diagram-arrow" d="M ${exit + 1} 111 H ${nextX ? nextX - 18 : 1400}"/>
    <text x="${exit + 8}" y="102" class="diagram-note">Sí</text>
    <path class="diagram-return diagram-return-out" d="M ${gate} 140 V ${correctionY} H ${x + 103}"/>
    <text x="${gate + 7}" y="147" class="diagram-note">No</text>
    <rect class="diagram-correction" x="${x - 37}" y="${correctionY - 17}" width="140" height="34" rx="6"/>
    ${diagramLabel([phaseCorrections[index]], x + 33, correctionY + 4, 'diagram-note')}
    <path class="diagram-return" d="M ${x - 37} ${correctionY} H ${x - 47} V 111 H ${x - 17}"/>
    <path class="diagram-wire diagram-bus" d="M ${x - 16} 111 V ${lastCenter} M ${x + 166} 111 V ${lastCenter}"/>`;
  }).join('');

  const lanes = selectedAreas.map((team, index) => {
    const y = laneTop + index * laneHeight;
    const center = y + laneHeight / 2;
    const teamIndex = areas.indexOf(team);
    const nodes = strategyPhases.map((phase, phaseIndex) => {
      const [id, description] = phase.contributions[teamIndex];
      const task = tasks.find(item => item.id === id);
      if (!task) return '';
      const x = columns[phaseIndex];
      const lines = task.title.match(/.{1,19}(?:s|$)|S+/g) || [task.title];
      const title = lines.slice(0, 2).map(line => line.trim());
      return `<path class="diagram-arrow" d="M ${x - 16} ${center} H ${x - 2}"/>
      <path class="diagram-wire" d="M ${x + 148} ${center} H ${x + 166}"/>
      <g class="diagram-task" data-task="${task.id}" role="button" tabindex="0" aria-label="${safe(task.title)}">
        <title>${safe(task.title)}. ${description}</title>
        <rect x="${x}" y="${center - 32}" width="148" height="64" rx="7"/>
        ${diagramLabel(title, x + 74, center - (title.length > 1 ? 11 : 3), 'diagram-task-title')}
        ${diagramLabel([label(task.status)], x + 74, center + 22, 'diagram-task-status')}
      </g>`;
    }).join('');
    return `<g class="diagram-lane ${classes[team]}">
      <rect class="diagram-lane-bg" x="12" y="${y + 3}" width="1475" height="94" rx="9"/>
      <rect class="diagram-lane-tag" x="25" y="${center - 19}" width="107" height="38" rx="7"/>
      ${diagramLabel([team], 78, center + 5, 'diagram-lane-label')}
      ${nodes}
    </g>`;
  }).join('');

  $('#diagram-outcomes').innerHTML = strategyPhases.map((phase, index) => `<li><strong>${phase.title}</strong><span>${phase.outcome}</span><small>Si requiere cambios: ${phaseCorrections[index].toLowerCase()}.</small></li>`).join('');
  $('#strategy-map-phases').innerHTML = `<svg class="strategic-flow-svg" viewBox="0 0 ${width} ${laneBottom + 84}" role="group" aria-label="Proceso de ejecución con tres áreas, cuatro fases y rutas de revisión">
    <defs>
      <marker id="strategy-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#52617a"/></marker>
      <marker id="strategy-return" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#7051ad"/></marker>
    </defs>
    ${lanes}
    ${stages}
    <rect class="diagram-terminal" x="25" y="93" width="106" height="36" rx="18"/>
    ${diagramLabel(['Inicio'], 78, 116, 'diagram-terminal-text')}
    <path class="diagram-arrow" d="M 131 111 H 188"/>
    <rect class="diagram-terminal diagram-end" x="1401" y="93" width="86" height="36" rx="18"/>
    ${diagramLabel(['Escalar'], 1444, 116, 'diagram-terminal-text')}
  </svg>`;
}

document.querySelector('#strategy-map-phases').addEventListener('keydown', event => {
  const node = event.target.closest('.diagram-task');
  if (!node || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  showTask(node.dataset.task);
});

document.querySelectorAll('[data-diagram-size]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelector('#strategy-map-phases').classList.toggle('diagram-fit', button.dataset.diagramSize === 'fit');
    document.querySelectorAll('[data-diagram-size]').forEach(option => {
      option.classList.toggle('selected', option === button);
      option.setAttribute('aria-pressed', String(option === button));
    });
  });
});
