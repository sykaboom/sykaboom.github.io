// src/features/plan.js
// Override: Plan table with clearer category styling (Tailwind only).
// - Category rows: border-t-2 border-blue-200 bg-slate-50

import { manageControls, addButtons, updateNumbering } from './_common.js';

export const title = '사업계획서';

export function shellHTML(){
  return `<div id="plan-editor" class="w-full min-h-[60vh] overflow-auto focus-within:outline-none"></div>${addButtons('add-plan-category','카테고리 추가')}`;
}

export function initialShell(){
  return `<table class="w-full">
    <thead class="text-slate-700">
      <tr>
        <th class="p-3 font-semibold text-left w-1/5 text-lg">구분</th>
        <th class="p-3 font-semibold text-left text-lg">세부 계획</th>
        <th class="p-3 font-semibold text-left text-lg">담당자</th>
        <th class="p-3 font-semibold text-left text-lg">마감일</th>
        <th class="p-3 font-semibold text-center w-24">관리</th>
      </tr>
    </thead>
    <tbody class="bg-white"></tbody>
  </table>`;
}

export function defaultRows(){
  return `
    <tr class="plan-category border-t-2 border-blue-200 bg-slate-50">
      <td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">1단계: 준비</span></td>
      <td colspan="3" class="p-3 text-right"><button class="add-sub-item-btn add-plan-item">+ 세부 계획 추가</button></td>
      <td class="p-3">${manageControls}</td>
    </tr>
    ${templates().planItem}
  `;
}

export function templates(){
  return {
    planCategory: `
    <tr class="plan-category border-t-2 border-blue-200 bg-slate-50">
      <td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">새 카테고리</span></td>
      <td colspan="3" class="p-3 text-right"><button class="add-sub-item-btn add-plan-item">+ 세부 계획 추가</button></td>
      <td class="p-3">${manageControls}</td>
    </tr>`,
    planItem: `
    <tr class="draggable-item">
      <td class="p-3" contenteditable="true" placeholder="구분"></td>
      <td class="p-3" contenteditable="true" placeholder="세부 계획"></td>
      <td class="p-3" contenteditable="true" placeholder="담당자"></td>
      <td class="p-3" contenteditable="true" placeholder="YYYY-MM-DD"></td>
      <td class="p-3">${manageControls}</td>
    </tr>`
  };
}

export function initSortable(editor){
  const tbody = editor.querySelector('tbody');
  if (tbody && window.Sortable){
    new window.Sortable(tbody, { animation:150, handle:'.draggable-item', draggable:'.draggable-item' });
  }
  updateNumbering(editor);
}
