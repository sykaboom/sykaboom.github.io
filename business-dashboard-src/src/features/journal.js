import { manageControls, addButtons } from './_common.js';

export const title = '공동 사업 일지';

function today(){
  const t=new Date(); const y=t.getFullYear(), m=String(t.getMonth()+1).padStart(2,'0'), d=String(t.getDate()).padStart(2,'0');
  const w=['일','월','화','수','목','금','토'][t.getDay()]; return `${y}-${m}-${d} (${w})`;
}

export function shellHTML(){
  return `<div id="journal-editor" class="w-full min-h-[60vh] overflow-auto focus-within:outline-none"></div>${addButtons('add-journal-entry','일지 항목 추가')}`;
}
export function initialShell(){
  return `<table class="w-full"><thead class="text-slate-700"><tr><th class="p-3 font-semibold text-left w-1/5 text-lg">구분</th><th class="p-3 font-semibold text-left text-lg">방성윤</th><th class="p-3 font-semibold text-left text-lg">이용화</th><th class="p-3 font-semibold text-left text-lg">최우혁</th><th class="p-3 font-semibold text-center w-24">관리</th></tr></thead><tbody class="bg-white"></tbody></table>`;
}
export function defaultRows(){
  return entryTemplate();
}
function entryTemplate(){
  return `<tr class="journal-entry-header"><td colspan="4" class="p-3 font-semibold text-slate-600 text-lg" contenteditable="true">${today()}</td><td class="p-3">${manageControls}</td></tr>
  <tr><td class="p-3 font-medium">주요 업무 내용</td><td class="p-3" contenteditable="true" placeholder="[진행한 업무 내용을 입력하세요]"></td><td class="p-3" contenteditable="true" placeholder="[진행한 업무 내용을 입력하세요]"></td><td class="p-3" contenteditable="true" placeholder="[진행한 업무 내용을 입력하세요]"></td><td class="p-3"></td></tr>
  <tr><td class="p-3 font-medium">진행 상태</td><td class="p-3" contenteditable="true" placeholder="[Planned/In Progress/Review/Blocked/Done]"></td><td class="p-3" contenteditable="true" placeholder="[Planned/In Progress/Review/Blocked/Done]"></td><td class="p-3" contenteditable="true" placeholder="[Planned/In Progress/Review/Blocked/Done]"></td><td class="p-3"></td></tr>
  <tr><td class="p-3 font-medium">비고 (공유/요청)</td><td class="p-3" contenteditable="true" placeholder="[@이름: 메모 / 질문은 마감일 명시]"></td><td class="p-3" contenteditable="true" placeholder="[@이름: 메모 / 질문은 마감일 명시]"></td><td class="p-3" contenteditable="true" placeholder="[@이름: 메모 / 질문은 마감일 명시]"></td><td class="p-3"></td></tr>`;
}
export function templates(){
  return { entry: entryTemplate() };
}
export function initSortable(){ /* not needed for journal */ }

