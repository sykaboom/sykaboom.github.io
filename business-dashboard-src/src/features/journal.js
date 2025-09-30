// src/features/journal.js
// Card UI for Journal: one entry = one card (no table).
// Structure: Header(date + manage), Body(left: content/notes, right: status chips + assignees chips).

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
  return `<div class="space-y-6"></div>`;
}

export function defaultRows(){
  return entryTemplate();
}

function entryTemplate(){
  return `
  <div class="journal-card bg-white rounded-lg shadow-md mb-6 p-4 md:p-6" data-entry="journal">
    <div class="flex items-start justify-between mb-4">
      <div class="font-bold text-lg text-slate-900" contenteditable="true">${today()}</div>
      <div class="flex items-center gap-2">${manageControls}</div>
    </div>
    <div class="grid md:grid-cols-2 gap-4">
      <div class="space-y-4">
        <div>
          <div class="text-xs font-semibold text-slate-500 mb-1">주요 업무 내용</div>
          <div class="p-3 bg-slate-50 rounded min-h-[72px]" contenteditable="true" placeholder="[진행한 업무 내용을 입력하세요]"></div>
        </div>
        <div>
          <div class="text-xs font-semibold text-slate-500 mb-1">비고 (공유/요청)</div>
          <div class="p-3 bg-slate-50 rounded min-h-[56px]" contenteditable="true" placeholder="[@이름: 메모 / 질문은 마감일 명시]"></div>
        </div>
      </div>
      <div class="space-y-6">
        <div>
          <div class="text-xs font-semibold text-slate-500 mb-2">진행 상태</div>
          <div class="status-cell centered"></div>
        </div>
        <div>
          <div class="text-xs font-semibold text-slate-500 mb-2">담당자</div>
          <div class="assignees-cell centered"></div>
        </div>
      </div>
    </div>
  </div>`;
}

export function templates(){
  return { entry: entryTemplate() };
}

export function initSortable(){ /* cards are not sortable for now */ }
