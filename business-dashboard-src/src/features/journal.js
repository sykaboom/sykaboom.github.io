// src/features/journal.js
// Patched: Simplified Journal table to single structure with one 내용, one 진행 상태, one 담당자
// Columns: 구분 | 내용 | 진행 상태 | 담당자 | 관리

import { manageControls, addButtons } from './_common.js';

export const title = '공동 사업 일지';

function today(){
  const t=new Date();
  const y=t.getFullYear(), m=String(t.getMonth()+1).padStart(2,'0'), d=String(t.getDate()).padStart(2,'0');
  const w=['일','월','화','수','목','금','토'][t.getDay()];
  return `${y}-${m}-${d} (${w})`;
}

export function shellHTML(){
  return `<div id="journal-editor" class="w-full min-h-[60vh] overflow-auto focus-within:outline-none"></div>${addButtons('add-journal-entry','일지 항목 추가')}`;
}

export function initialShell(){
  return `
  <table class="w-full journal-table">
    <thead class="text-slate-700">
      <tr>
        <th class="p-3 font-semibold text-left w-1/5 text-lg">구분</th>
        <th class="p-3 font-semibold text-left text-lg">내용</th>
        <th class="p-3 font-semibold text-center text-lg w-56">진행 상태</th>
        <th class="p-3 font-semibold text-center text-lg w-56">담당자</th>
        <th class="p-3 font-semibold text-center w-24">관리</th>
      </tr>
    </thead>
    <tbody class="bg-white"></tbody>
  </table>`;
}

export function defaultRows(){
  return entryTemplate();
}

function entryTemplate(){
  return `
  <tr class="journal-entry-header">
    <td class="p-3 font-semibold text-slate-600 text-lg" colspan="4" contenteditable="true">${today()}</td>
    <td class="p-3">${manageControls}</td>
  </tr>

  <tr class="journal-entry-body">
    <td class="p-3 font-medium">주요 업무 내용</td>
    <td class="p-3" contenteditable="true" placeholder="[진행한 업무 내용을 입력하세요]"></td>
    <td class="p-3 status-cell centered"></td>
    <td class="p-3 assignees-cell centered"></td>
    <td class="p-3"></td>
  </tr>

  <tr class="journal-entry-notes">
    <td class="p-3 font-medium">비고 (공유/요청)</td>
    <td class="p-3" contenteditable="true" placeholder="[@이름: 메모 / 질문은 마감일 명시]"></td>
    <td class="p-3"></td>
    <td class="p-3"></td>
    <td class="p-3"></td>
  </tr>`;
}

export function templates(){
  return { entry: entryTemplate() };
}

export function initSortable(){ /* Journal rows are not sortable for now */ }
