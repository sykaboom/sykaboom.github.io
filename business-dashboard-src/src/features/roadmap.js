// src/features/roadmap.js
// Override: Roadmap table with clearer category styling and badge rendering for 상태/우선순위.
// - Tailwind only (no new CSS).
// - Category rows: border-t-2 border-blue-200 bg-slate-50
// - Status/Priority cells render as color badges (contenteditable UX: edit raw -> blur => badge).

import { manageControls, addButtons, updateNumbering } from './_common.js';

export const title = '사업 추진 로드맵';

export function shellHTML(){
  return `<div id="roadmap-editor" class="w-full min-h-[60vh] overflow-auto focus-within:outline-none"></div>${addButtons('add-roadmap-category','단계 추가')}`;
}

export function initialShell(){
  return `<div class="roadmap-scroll"><table class="w-full roadmap-table">
    <colgroup>
      <col style="width:12ch"><col><col style="width:14ch"><col style="width:16ch"><col style="width:10ch"><col style="width:16ch"><col style="width:18ch"><col style="width:8ch">
    </colgroup>
    <thead class="text-slate-700"><tr>
      <th class="p-3 font-semibold text-left">단계 (일정)</th>
      <th class="p-3 font-semibold text-left">주요 과업</th>
      <th class="p-3 font-semibold text-left">담당자</th>
      <th class="p-3 font-semibold text-left">진행 상태</th>
      <th class="p-3 font-semibold text-left">우선순위</th>
      <th class="p-3 font-semibold text-left">마감일</th>
      <th class="p-3 font-semibold text-left">의존성</th>
      <th class="p-3 font-semibold text-center">관리</th>
    </tr></thead>
    <tbody class="sortable-list bg-white"></tbody>
  </table></div>`;
}

export function defaultRows(){
  return `
    <tr class="roadmap-category border-t-2 border-blue-200 bg-slate-50">
      <td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">1단계: 준비</span></td>
      <td colspan="6" class="p-3 text-right"><button class="add-sub-item-btn add-roadmap-item">+ 과업 추가</button></td>
      <td class="p-3">${manageControls}</td>
    </tr>
    ${templates().roadmapItem}
  `;
}

export function templates(){
  return {
    roadmapCategory: `
    <tr class="roadmap-category border-t-2 border-blue-200 bg-slate-50">
      <td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">새 단계</span></td>
      <td colspan="6" class="p-3 text-right"><button class="add-sub-item-btn add-roadmap-item">+ 과업 추가</button></td>
      <td class="p-3">${manageControls}</td>
    </tr>`,
    roadmapItem: `
    <tr class="draggable-item">
      <td class="p-3" contenteditable="true" placeholder="일정 (예: D-30)"></td>
      <td class="p-3" contenteditable="true" placeholder="신규 과업"></td>
      <td class="p-3" contenteditable="true" placeholder="담당자"></td>
      <td class="p-3 status-badge-cell" contenteditable="true" placeholder="Planned / In Progress / Review / Blocked / Done"></td>
      <td class="p-3 priority-badge-cell" contenteditable="true" placeholder="P0 / P1 / P2"></td>
      <td class="p-3" contenteditable="true" placeholder="YYYY-MM-DD"></td>
      <td class="p-3" contenteditable="true" placeholder="의존성"></td>
      <td class="p-3">${manageControls}</td>
    </tr>`
  };
}

// ----- Badge rendering (Tailwind only) -----
function badgeForStatus(text){
  const t = (text||'').trim().toLowerCase();
  if (!t) return '';
  if (t === 'in progress') return `<span class="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">In Progress</span>`;
  if (t === 'review')      return `<span class="inline-block px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Review</span>`;
  if (t === 'blocked')     return `<span class="inline-block px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">Blocked</span>`;
  if (t === 'done')        return `<span class="inline-block px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Done</span>`;
  return `<span class="inline-block px-2 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-medium">Planned</span>`;
}
function badgeForPriority(text){
  const t = (text||'').trim().toUpperCase();
  if (!t) return '';
  if (t === 'P0') return `<span class="inline-block px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">P0</span>`;
  if (t === 'P1') return `<span class="inline-block px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">P1</span>`;
  if (t === 'P2') return `<span class="inline-block px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">P2</span>`;
  return `<span class="inline-block px-2 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">${t}</span>`;
}

function renderBadges(root){
  // Convert text -> badge on blur; keep editable on focus.
  const statusCells = root.querySelectorAll('.status-badge-cell');
  const prioCells   = root.querySelectorAll('.priority-badge-cell');

  statusCells.forEach(td=>{
    td.removeEventListener('focus', td._onFocusStatus || (()=>{}));
    td.removeEventListener('blur',  td._onBlurStatus  || (()=>{}));

    td._onFocusStatus = ()=>{
      // restore raw text for editing
      const raw = td.getAttribute('data-raw');
      if (raw) td.textContent = raw;
    };
    td._onBlurStatus = ()=>{
      const raw = (td.textContent||'').trim();
      td.setAttribute('data-raw', raw);
      td.innerHTML = badgeForStatus(raw);
    };

    td.addEventListener('focus', td._onFocusStatus);
    td.addEventListener('blur',  td._onBlurStatus);

    // initial render if not empty
    if ((td.textContent||'').trim()) td._onBlurStatus();
  });

  prioCells.forEach(td=>{
    td.removeEventListener('focus', td._onFocusPrio || (()=>{}));
    td.removeEventListener('blur',  td._onBlurPrio  || (()=>{}));

    td._onFocusPrio = ()=>{
      const raw = td.getAttribute('data-raw');
      if (raw) td.textContent = raw;
    };
    td._onBlurPrio = ()=>{
      const raw = (td.textContent||'').trim();
      td.setAttribute('data-raw', raw);
      td.innerHTML = badgeForPriority(raw);
    };

    td.addEventListener('focus', td._onFocusPrio);
    td.addEventListener('blur',  td._onBlurPrio);

    if ((td.textContent||'').trim()) td._onBlurPrio();
  });
}

// Called by app.js on every DOM mutation (input/click) if wired.
// Our app.js may call feature.onChange() after mutations; use it if available.
export function onChange(){
  const editor = document.getElementById('roadmap-editor');
  if (!editor) return;
  renderBadges(editor);
}

// For initial subscribe render
export function initSortable(editor){
  const tbody = editor.querySelector('.sortable-list');
  if (tbody && window.Sortable){
    new window.Sortable(tbody, { animation:150, handle:'.draggable-item', draggable:'.draggable-item' });
  }
  renderBadges(editor);
}
