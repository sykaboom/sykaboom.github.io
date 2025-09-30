// src/features/journal-status-chips.js
// Journal status -> chip UI (3 on top, 2 below), centered.
// Simplified: only attaches to td.status-cell, not placeholder text.

const STATUS = ['Planned','In Progress','Review','Blocked','Done'];

function getJournalRoot(){
  return document.getElementById('journal-editor')
      || document.querySelector('#journal-editor, .journal-editor, [data-editor-key="journal"]');
}

function isStatusCell(td){
  return td && td.tagName === 'TD' && td.classList.contains('status-cell');
}

function normalize(val){
  const s = String(val || '').trim().toLowerCase();
  return STATUS.find(x => x.toLowerCase() === s) || '';
}

function currentFromCell(td){
  const dv = td.getAttribute('data-value');
  if (dv) return normalize(dv);
  const raw = td.textContent || '';
  return normalize(raw);
}

function buildGroup(cur){
  const group = document.createElement('div');
  group.className = 'status-chip-group';
  group.setAttribute('role','group');
  group.setAttribute('aria-label','진행 상태');

  const rowTop = document.createElement('div');
  rowTop.className = 'status-chip-row top';
  const rowBottom = document.createElement('div');
  rowBottom.className = 'status-chip-row bottom';

  STATUS.forEach((label, idx)=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'status-chip';
    btn.textContent = label;
    btn.dataset.value = label;
    if (label === cur) btn.classList.add('selected');
    btn.tabIndex = 0;
    (idx < 3 ? rowTop : rowBottom).appendChild(btn);
  });

  group.appendChild(rowTop);
  group.appendChild(rowBottom);
  return group;
}

function applySelection(group, value){
  group.querySelectorAll('.status-chip').forEach(b=>{
    const on = b.dataset.value === value && value !== '';
    b.classList.toggle('selected', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

function mountChips(td){
  if (td.querySelector('.status-chip-group')) return;
  const editor = td.closest('#journal-editor, .journal-editor, [data-editor-key="journal"]');
  const cur = currentFromCell(td);
  td.classList.add('status-cell','centered');
  td.innerHTML = '';
  const group = buildGroup(cur);
  td.appendChild(group);

  function commit(val){
    const v = normalize(val);
    if (v) {
      td.setAttribute('data-value', v);
      td.dataset.raw = v;
    } else {
      td.removeAttribute('data-value');
      td.dataset.raw = '';
    }
    const evt = new Event('input', { bubbles: true });
    if (editor) editor.dispatchEvent(evt);
  }

  group.addEventListener('click', (e)=>{
    const btn = e.target.closest('.status-chip');
    if (!btn) return;
    const current = td.getAttribute('data-value') || '';
    const next = (btn.dataset.value === current) ? '' : btn.dataset.value;
    applySelection(group, next);
    commit(next);
  });

  group.addEventListener('keydown', (e)=>{
    const chips = Array.from(group.querySelectorAll('.status-chip'));
    const curVal = td.getAttribute('data-value') || '';
    let idx = chips.findIndex(c => c.dataset.value === curVal);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown'){
      idx = (idx + 1 + chips.length) % chips.length;
      chips[idx].click(); chips[idx].focus(); e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
      idx = (idx - 1 + chips.length) % chips.length;
      chips[idx].click(); chips[idx].focus(); e.preventDefault();
    } else if (e.key === 'Escape'){
      applySelection(group, ''); commit(''); e.preventDefault();
    }
  });
}

function enhance(){
  const root = getJournalRoot();
  if (!root) return;
  const cells = root.querySelectorAll('td.status-cell');
  cells.forEach(td => { if (isStatusCell(td)) mountChips(td); });
}

document.addEventListener('DOMContentLoaded', enhance);
const mo = new MutationObserver(()=>enhance());
mo.observe(document.documentElement, { childList:true, subtree:true });
