// src/features/journal-status-chips.js
// Journal 'status/progress' cells -> button-segment (chip) UI
// - Five fixed states: Planned, In Progress, Review, Blocked, Done
// - No free typing. Click/keyboard to choose.
// - On change, dispatch 'input' on the editor to trigger existing autosave.

const STATUS = ['Planned','In Progress','Review','Blocked','Done'];

function getJournalRoot(){
  return document.getElementById('journal-editor')
      || document.querySelector('#journal-editor, .journal-editor, [data-editor-key="journal"]');
}

function isStatusCell(td){
  if (!td || td.tagName !== 'TD') return false;
  const cls = (td.className || '').toLowerCase();
  const role = (td.getAttribute('data-role') || '').toLowerCase();
  const hint = (td.getAttribute('placeholder') || '').toLowerCase();
  return /status|progress/.test(cls + ' ' + role)
      || /\bplanned\b|\bin progress\b|\breview\b|\bblocked\b|\bdone\b/.test(hint);
}

function normalize(val){
  const s = String(val || '').trim().toLowerCase();
  return STATUS.find(x => x.toLowerCase() === s) || '';
}

function currentFromCell(td){
  // prefer data-value, then text
  const dv = td.getAttribute('data-value');
  if (dv) return normalize(dv);
  const raw = td.textContent || '';
  return normalize(raw);
}

function buildChips(cur){
  const group = document.createElement('div');
  group.className = 'status-chip-group';
  group.setAttribute('role','group');
  group.setAttribute('aria-label','진행 상태');

  STATUS.forEach((label, i)=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'status-chip';
    btn.textContent = label;
    btn.dataset.value = label;
    if (label === cur) btn.classList.add('selected');
    btn.tabIndex = 0;
    group.appendChild(btn);
  });
  return group;
}

function applySelection(group, value){
  group.querySelectorAll('.status-chip').forEach(b=>{
    b.classList.toggle('selected', b.dataset.value === value);
  });
}

function mountChips(td){
  if (td.querySelector('.status-chip-group')) return; // already mounted
  const editor = td.closest('#journal-editor, .journal-editor, [data-editor-key="journal"]');
  const cur = currentFromCell(td);
  td.classList.add('status-cell');
  td.innerHTML = ''; // clear free text
  const group = buildChips(cur);
  td.appendChild(group);

  function commit(val){
    const v = normalize(val);
    td.setAttribute('data-value', v);
    // also keep plain text shadow for copy/export (hidden via CSS if needed)
    td.dataset.raw = v;
    // trigger autosave via synthetic input on editor root
    const evt = new Event('input', { bubbles: true });
    if (editor) editor.dispatchEvent(evt);
  }

  group.addEventListener('click', (e)=>{
    const btn = e.target.closest('.status-chip');
    if (!btn) return;
    const val = btn.dataset.value;
    applySelection(group, val);
    commit(val);
  });

  // Keyboard: arrow left/right to move selection
  group.addEventListener('keydown', (e)=>{
    const chips = Array.from(group.querySelectorAll('.status-chip'));
    const idx = chips.findIndex(c => c.classList.contains('selected'));
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown'){
      const next = chips[(Math.max(0, idx) + 1) % chips.length];
      next.click(); next.focus(); e.preventDefault();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
      const prev = chips[(idx > 0 ? idx : chips.length) - 1];
      prev.click(); prev.focus(); e.preventDefault();
    }
  });
}

function enhance(){
  const root = getJournalRoot();
  if (!root) return;
  const cells = root.querySelectorAll('td, [role="cell"]');
  cells.forEach(td => { if (isStatusCell(td)) mountChips(td); });
}

// Run once + observe mutations to catch re-renders
document.addEventListener('DOMContentLoaded', enhance);
const mo = new MutationObserver(()=>enhance());
mo.observe(document.documentElement, { childList:true, subtree:true });
