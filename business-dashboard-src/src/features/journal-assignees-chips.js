// src/features/journal-assignees-chips.js
// Multi-select chips for Journal '담당자' cells.
// - Default members can be edited here (TEAM).
// - Multi-select up to MAX (default 3).
// - Click to toggle; disabled style when limit reached.
// - Stores comma-separated values in td[data-value].
// - Triggers existing autosave by dispatching 'input' on the editor.

const TEAM = ['방성윤','이용화','최우혁']; // 필요 시 수정
const MAX = 3;

function getJournalRoot(){
  return document.getElementById('journal-editor')
      || document.querySelector('#journal-editor, .journal-editor, [data-editor-key="journal"]');
}

function isAssigneesCell(td){
  if (!td || td.tagName !== 'TD') return false;
  return td.classList.contains('assignees-cell') || /assignee|담당/.test((td.className||'') + ' ' + (td.getAttribute('data-role')||''));
}

function parseList(s){
  if (!s) return [];
  return String(s).split(',').map(x=>x.trim()).filter(Boolean);
}
function serializeList(arr){
  return Array.from(new Set(arr)).join(', ');
}

function buildGroup(selected){
  const group = document.createElement('div');
  group.className = 'assignees-chip-group';
  group.setAttribute('role','group');
  group.setAttribute('aria-label','담당자');

  TEAM.forEach(name=>{
    const btn = document.createElement('button');
    btn.type='button';
    btn.className = 'status-chip'; // 기존 칩 스타일 재사용
    btn.dataset.value = name;
    btn.textContent = name;
    if (selected.includes(name)) btn.classList.add('selected');
    group.appendChild(btn);
  });

  // helper label (selected count)
  const hint = document.createElement('div');
  hint.className = 'assignees-hint';
  hint.style.fontSize = '11px';
  hint.style.color = '#94a3b8';
  hint.style.marginTop = '4px';
  hint.textContent = `${selected.length}/${MAX}`;
  group.appendChild(hint);

  return group;
}

function applySelection(group, values){
  const set = new Set(values);
  group.querySelectorAll('.status-chip').forEach(b=>{
    const on = set.has(b.dataset.value);
    b.classList.toggle('selected', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (!on && set.size >= MAX){
      // Prevent adding more when max reached
      b.classList.add('disabled');
      b.style.opacity = '0.5';
      b.style.pointerEvents = 'none';
    } else {
      b.classList.remove('disabled');
      b.style.opacity = '';
      b.style.pointerEvents = '';
    }
  });
  const hint = group.querySelector('.assignees-hint');
  if (hint) hint.textContent = `${set.size}/${MAX}`;
}

function mountChips(td){
  if (td.querySelector('.assignees-chip-group')) return;
  const editor = td.closest('#journal-editor, .journal-editor, [data-editor-key="journal"]');
  const cur = parseList(td.getAttribute('data-value'));
  td.classList.add('centered');
  td.innerHTML = '';
  const group = buildGroup(cur);
  td.appendChild(group);

  function commit(list){
    const unique = Array.from(new Set(list));
    td.setAttribute('data-value', serializeList(unique));
    td.dataset.raw = serializeList(unique);
    const evt = new Event('input', { bubbles: true });
    if (editor) editor.dispatchEvent(evt);
  }

  group.addEventListener('click', (e)=>{
    const btn = e.target.closest('.status-chip');
    if (!btn) return;
    const name = btn.dataset.value;
    let list = parseList(td.getAttribute('data-value'));
    const has = list.includes(name);
    if (has){
      list = list.filter(x => x!==name);
    } else {
      if (list.length >= MAX){
        // ignore if max; could flash hint later
        return;
      }
      list.push(name);
    }
    applySelection(group, list);
    commit(list);
  });

  // Keyboard support: Space/Enter toggles focused chip
  group.addEventListener('keydown', (e)=>{
    const chips = Array.from(group.querySelectorAll('.status-chip'));
    let i = chips.indexOf(document.activeElement);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown'){
      i = (i + 1 + chips.length) % chips.length;
      chips[i].focus(); e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
      i = (i - 1 + chips.length) % chips.length;
      chips[i].focus(); e.preventDefault();
    } else if (e.key === ' ' || e.key === 'Enter'){
      document.activeElement.click(); e.preventDefault();
    } else if (e.key === 'Escape'){
      // clear all
      applySelection(group, []); commit([]); e.preventDefault();
    }
  });

  applySelection(group, cur);
}

function enhance(){
  const root = getJournalRoot();
  if (!root) return;
  const cells = root.querySelectorAll('td, [role="cell"]');
  cells.forEach(td => { if (isAssigneesCell(td)) mountChips(td); });
}

document.addEventListener('DOMContentLoaded', enhance);
const mo = new MutationObserver(()=>enhance());
mo.observe(document.documentElement, { childList:true, subtree:true });
