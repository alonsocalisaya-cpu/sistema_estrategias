export function selectResourceTab(section, focus = false) {
  if (!['documentation', 'records'].includes(section)) return;
  for (const id of ['documentation', 'records']) {
    document.getElementById(id).hidden = id !== section;
  }
  document.querySelectorAll('[data-resource-tab]').forEach(button => {
    const selected = button.dataset.resourceTab === section;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });
}

document.querySelectorAll('[data-resource-tab]').forEach(button => {
  button.addEventListener('click', () => selectResourceTab(button.dataset.resourceTab));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === 'Home' ? 'documentation' : event.key === 'End' ? 'records' : button.dataset.resourceTab === 'documentation' ? 'records' : 'documentation';
    selectResourceTab(target, true);
  });
});

document.addEventListener('resources:select-tab', event => selectResourceTab(event.detail));
