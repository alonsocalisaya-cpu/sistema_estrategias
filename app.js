const initial=[
{id:1,title:'Diagnóstico integral',area:'Calidad',start:0,duration:1,status:'done',deliverable:true},
{id:2,title:'Protocolos internos',area:'Calidad',start:1,duration:2,status:'progress',deliverable:true},
{id:3,title:'Documentación',area:'Calidad',start:3,duration:2,status:'pending',deliverable:false},
{id:4,title:'Feedback de calidad',area:'Calidad',start:5,duration:1,status:'pending',deliverable:false},
{id:5,title:'Diseño de solución',area:'Digital',start:1,duration:1,status:'done',deliverable:true},
{id:6,title:'Prototipo funcional',area:'Digital',start:2,duration:1.5,status:'progress',deliverable:true},
{id:7,title:'Desarrollo',area:'Digital',start:3.5,duration:1.5,status:'pending',deliverable:false},
{id:8,title:'Feedback y soporte',area:'Digital',start:5,duration:2.5,status:'pending',deliverable:true},
{id:9,title:'Identidad de marca',area:'Marketing',start:1,duration:1,status:'done',deliverable:true},
{id:10,title:'Perfiles y audiencias',area:'Marketing',start:2,duration:1,status:'progress',deliverable:true},
{id:11,title:'Campañas digitales',area:'Marketing',start:3,duration:2,status:'pending',deliverable:true},
{id:12,title:'Informe de resultados',area:'Marketing',start:6,duration:1,status:'pending',deliverable:false}];
let tasks;try{tasks=JSON.parse(localStorage.getItem('orbita-tasks-v1'))||initial}catch{tasks=initial}
tasks.forEach(t=>{if(![1,2,3].includes(Number(t.priority)))t.priority=t.status==='progress'?1:2});
const areas=['Calidad','Digital','Marketing'], classes={Calidad:'quality',Digital:'digital',Marketing:'marketing'}, owners={Calidad:'María Rojas',Digital:'Diego López',Marketing:'Carla Vega'},months=['Dic','Ene','Feb','Mar','Abr','May','Jun','Jul'];
let area='all',status='all',view='overview',sortAscending=false;const taskProgress=t=>t.status==='done'?100:t.status==='progress'?50:0;const $=s=>document.querySelector(s);const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const label=s=>({done:'Completado',progress:'En curso',pending:'Pendiente'}[s]);
function persist(){localStorage.setItem('orbita-tasks-v1',JSON.stringify(tasks))}function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000)}
function laneLayout(list){const ends=[-1,-1],positions={};list.slice().sort((a,b)=>a.start-b.start).forEach((t,i)=>{let row=i%2;if(ends[row]>t.start){row=ends.findIndex(end=>end<=t.start);if(row<0)row=ends.length}ends[row]=t.start+t.duration;positions[t.id]=row});return {positions,height:Math.max(106,ends.length*38+27)}}
function renderSummary() {
  const filtered = tasks.filter(task => area === 'all' || task.area === area);
  const deliveries = filtered.filter(task => task.deliverable);
  const progress = Math.round(filtered.reduce((sum, task) => sum + taskProgress(task), 0) / (filtered.length || 1));
  $('#side-progress').textContent = progress + '%';
  $('.mini-track span').style.width = progress + '%';
  $('#nav-count').textContent = deliveries.length;
  $('#delivery-count').textContent = deliveries.length;
}
function setView(v) {
  view = v;
  const panelId = v === 'deliverables' ? 'timeline' : ['documentation', 'records'].includes(v) ? 'resource-hub' : v;
  $('.dashboard').classList.toggle('focused', v !== 'overview');
  document.querySelectorAll('.dashboard > .panel').forEach(panel => panel.classList.toggle('visible', panel.id === panelId));
  document.querySelectorAll('[data-nav]').forEach(button => button.classList.toggle('active', button.dataset.nav === v));
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('selected', button.dataset.view === v));
  $('.breadcrumb b').textContent = ({ overview: 'Vista general', timeline: 'Cronograma', deliverables: 'Entregables', flow: 'Flujograma', team: 'Equipo', documentation: 'Documentación', records: 'Registros' })[v];
  if (v === 'timeline' || v === 'deliverables') setScheduleTab(v === 'deliverables' ? 'deliverables' : 'calendar');
  else renderProject();
  if (v === 'documentation' || v === 'records') document.dispatchEvent(new CustomEvent('resources:select-tab', { detail: v }));
  if (v !== 'overview') document.getElementById(panelId).scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.querySelectorAll('[data-nav],[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.nav||b.dataset.view));$('#area').onchange=e=>{area=e.target.value;render()};document.querySelectorAll('[data-status]').forEach(button => button.onclick = () => { status = button.dataset.status; renderBacklog(); });
document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));function openActivity(delivery = false) {
  const form = $('#activity-form');
  form.reset();
  if (area !== 'all') form.elements.area.value = area;
  $('#activity-title').textContent = delivery ? 'Nuevo entregable' : 'Nueva actividad';
  $('#create-activity').textContent = delivery ? 'Crear entregable' : 'Crear actividad';
  $('#activity-deliverable').hidden = delivery;
  $('#activity-dialog').showModal();
}
$('#new').onclick=()=>openActivity();$('#activity-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const title=f.get('title').trim();if(!title){toast('Escribe un nombre.');return}const start=Number(f.get('start')),duration=Number(f.get('duration'));if(start+duration>8){toast('La actividad debe terminar como máximo en julio.');return}tasks.push({id:Date.now(),title,area:f.get('area'),status:f.get('status'),start,duration,priority:Number(f.get('priority')),deliverable:f.has('deliverable')});persist();render();$('#activity-dialog').close();e.target.reset();toast(f.has('deliverable')?'Entregable creado':'Actividad creada en el plan')};
$('#export').onclick=()=>{const rows=[['Actividad','Área','Responsable','Inicio','Duración (meses)','Estado','Entregable'],...tasks.filter(t=>area==='all'||t.area===area).map(t=>[t.title,t.area,owners[t.area],months[Math.floor(t.start)],t.duration,label(t.status),t.deliverable?'Sí':'No'])];const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download='orbita-plan-estrategico.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Plan exportado')};$('#notification').onclick=()=>toast('Datos de ejemplo · Los cambios se guardan en este navegador.');render();

const sidebarToggle = $('#sidebar-toggle');
const compactScreen = window.matchMedia('(max-width: 1050px)');
let sidebarPreference = localStorage.getItem('orbita-sidebar');

function updateSidebar() {
  const collapsed = sidebarPreference === null ? compactScreen.matches : sidebarPreference === 'collapsed';
  const action = collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral';
  document.body.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
  sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
  sidebarToggle.setAttribute('aria-label', action);
  sidebarToggle.title = action;
  renderProject();

}

sidebarToggle.addEventListener('click', () => {
  sidebarPreference = document.body.dataset.sidebar === 'collapsed' ? 'expanded' : 'collapsed';
  localStorage.setItem('orbita-sidebar', sidebarPreference);
  updateSidebar();
});

compactScreen.addEventListener('change', updateSidebar);
updateSidebar();
