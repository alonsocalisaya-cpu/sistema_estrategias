let backlogView='list',backlogQuery='',backlogSort='priority';
const backlogStatuses = ['pending', 'progress', 'done'];
const searchKey = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
const deliveryDate = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const priorityNames={1:'Alta',2:'Media',3:'Baja'};
const priorityOf=t=>[1,2,3].includes(Number(t.priority))?Number(t.priority):t.status==='progress'?1:2;
const backlogState=s=>({pending:'Por hacer',progress:'En curso',done:'Completado'})[s];
function render(){renderSummary();renderProject();renderBacklog();updateFlowContext();}
function deliveryStatusControl(task) {
  return `<select class="backlog-status ${task.status}" data-change-status="${task.id}" aria-label="Estado de ${safe(task.title)}">
    ${backlogStatuses.map(value => `<option value="${value}" ${value === task.status ? 'selected' : ''}>${backlogState(value)}</option>`).join('')}
  </select>`;
}

function deliveryTable(tasks) {
  const rows = tasks.map(task => {
    const due = taskDates(task).end - DAY_MS;
    return `<tr>
      <td><span class="backlog-title">${safe(task.title)}</span></td>
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
      <span class="backlog-title">${safe(task.title)}</span>
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

function updateFlowContext() {
  document.dispatchEvent(new CustomEvent('flow:context', { detail: { tasks, areas } }));
}
document.addEventListener('flow:request-context', updateFlowContext);
