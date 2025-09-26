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
    <tr class="roadmap-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">1단계: 준비</span></td><td colspan="6" class="p-3 text-right"><button class="add-sub-item-btn add-roadmap-item">+ 과업 추가</button></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3" contenteditable="true">D-90</td><td class="p-3" contenteditable="true" placeholder="시장 조사 및 사업계획 구체화"></td><td class="p-3" contenteditable="true" placeholder="팀 전체"></td><td class="p-3" contenteditable="true" placeholder="Planned"></td><td class="p-3" contenteditable="true" placeholder="P1"></td><td class="p-3" contenteditable="true" placeholder="YYYY-MM-DD"></td><td class="p-3" contenteditable="true" placeholder="의존 과업/선행 조건"></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3" contenteditable="true">D-75</td><td class="p-3" contenteditable="true" placeholder="입지 선정 및 임대 계약"></td><td class="p-3" contenteditable="true" placeholder="방성윤"></td><td class="p-3" contenteditable="true" placeholder="Planned"></td><td class="p-3" contenteditable="true" placeholder="P0"></td><td class="p-3" contenteditable="true" placeholder="YYYY-MM-DD"></td><td class="p-3" contenteditable="true" placeholder="시장 조사 완료"></td><td class="p-3">${manageControls}</td></tr>
    <tr class="roadmap-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">2단계: 실행</span></td><td colspan="6" class="p-3 text-right"><button class="add-sub-item-btn add-roadmap-item">+ 과업 추가</button></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3" contenteditable="true">D-60</td><td class="p-3" contenteditable="true" placeholder="인테리어 공사 및 시설 구축"></td><td class="p-3" contenteditable="true" placeholder="이용화"></td><td class="p-3" contenteditable="true" placeholder="Planned"></td><td class="p-3" contenteditable="true" placeholder="P1"></td><td class="p-3" contenteditable="true" placeholder="YYYY-MM-DD"></td><td class="p-3" contenteditable="true" placeholder="임대 계약 체결"></td><td class="p-3">${manageControls}</td></tr>
    <tr class="roadmap-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">3단계: 런칭</span></td><td colspan="6" class="p-3 text-right"><button class="add-sub-item-btn add-roadmap-item">+ 과업 추가</button></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3" contenteditable="true">D-30</td><td class="p-3" contenteditable="true" placeholder="마케팅/홍보 시작"></td><td class="p-3" contenteditable="true" placeholder="최우혁"></td><td class="p-3" contenteditable="true" placeholder="Planned"></td><td class="p-3" contenteditable="true" placeholder="P2"></td><td class="p-3" contenteditable="true" placeholder="YYYY-MM-DD"></td><td class="p-3" contenteditable="true" placeholder="브랜딩/채널 확보"></td><td class="p-3">${manageControls}</td></tr>
  `;
}
export function templates(){
  return {
    roadmapItem: `<tr class="draggable-item"><td class="p-3" contenteditable="true" placeholder="일정"></td><td class="p-3" contenteditable="true" placeholder="신규 과업"></td><td class="p-3" contenteditable="true" placeholder="담당자"></td><td class="p-3" contenteditable="true" placeholder="상태"></td><td class="p-3" contenteditable="true" placeholder="P0/P1/P2"></td><td class="p-3" contenteditable="true" placeholder="YYYY-MM-DD"></td><td class="p-3" contenteditable="true" placeholder="의존성"></td><td class="p-3">${manageControls}</td></tr>`,
    roadmapCategory: `<tr class="roadmap-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">새 단계</span></td><td colspan="6" class="p-3 text-right"><button class="add-sub-item-btn add-roadmap-item">+ 과업 추가</button></td><td class="p-3">${manageControls}</td></tr>`
  };
}
export function initSortable(editor){
  const tbody = editor.querySelector('tbody.sortable-list');
  if (tbody && window.Sortable){
    new window.Sortable(tbody, { animation:150, handle:'.draggable-item', draggable:'.draggable-item',
      onEnd: ()=>{} });
  }
}
export { updateNumbering };
