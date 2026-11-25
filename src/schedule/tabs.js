function setScheduleTab(tab, focus = false) {
  const showDeliverables = tab === 'deliverables';
  document.getElementById('schedule-calendar').hidden = showDeliverables;
  document.getElementById('deliverables').hidden = !showDeliverables;
  document.querySelectorAll('[data-schedule-tab]').forEach(button => {
    const selected = button.dataset.scheduleTab === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });
  if (!showDeliverables) renderProject();
}

document.querySelectorAll('[data-schedule-tab]').forEach(button => {
  button.addEventListener('click', () => setScheduleTab(button.dataset.scheduleTab));
  button.addEventListener('keydown', event => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const target = event.key === 'Home' ? 'calendar' : event.key === 'End' ? 'deliverables' : button.dataset.scheduleTab === 'calendar' ? 'deliverables' : 'calendar';
    setScheduleTab(target, true);
  });
});
