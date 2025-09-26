import { manageControls, addButtons, updateNumbering } from './_common.js';

export const title = '사업계획서';

export function shellHTML(){
  return `<div id="plan-editor" class="w-full min-h-[60vh] overflow-auto focus-within:outline-none"></div>${addButtons('add-plan-category','카테고리 추가')}`;
}
export function initialShell(){
  return `<table class="w-full"><thead class="text-slate-700"><tr><th class="p-3 font-semibold text-left w-1/4">구분</th><th class="p-3 font-semibold text-left">핵심 내용 및 세부 계획</th><th class="p-3 font-semibold text-center w-24">관리</th></tr></thead><tbody class="sortable-list bg-white"></tbody></table>`;
}
export function defaultRows(){
  return `
    <tr class="plan-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">1. 사업 개요</span></td><td class="p-3 text-right"><button class="add-sub-item-btn add-plan-item">+ 소항목 추가</button></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">사업명</td><td class="p-3" contenteditable="true" placeholder="[사업명을 입력하세요]"></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">사업 목표</td><td class="p-3" contenteditable="true" placeholder="[사업의 최종 목표를 입력하세요]"></td><td class="p-3">${manageControls}</td></tr>

    <tr class="plan-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">2. 시장 분석</span></td><td class="p-3 text-right"><button class="add-sub-item-btn add-plan-item">+ 소항목 추가</button></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">목표 고객</td><td class="p-3" contenteditable="true" placeholder="[주요 고객층(타겟) 정의]"></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">경쟁사 분석</td><td class="p-3" contenteditable="true" placeholder="[주요 경쟁사 및 차별점 분석]"></td><td class="p-3">${manageControls}</td></tr>

    <tr class="plan-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">3. 마케팅 및 판매 전략</span></td><td class="p-3 text-right"><button class="add-sub-item-btn add-plan-item">+ 소항목 추가</button></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">채널/전술</td><td class="p-3" contenteditable="true" placeholder="[온/오프라인 채널과 전술 계획]"></td><td class="p-3">${manageControls}</td></tr>

    <tr class="plan-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">4. 운영 계획</span></td><td class="p-3 text-right"><button class="add-sub-item-btn add-plan-item">+ 소항목 추가</button></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">운영 프로세스</td><td class="p-3" contenteditable="true" placeholder="[예약, 체크인/아웃, 정산, CS 등]"></td><td class="p-3">${manageControls}</td></tr>

    <tr class="plan-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">5. 재무 계획</span></td><td class="p-3 text-right"><button class="add-sub-item-btn add-plan-item">+ 소항목 추가</button></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">5.1 가격표 및 이용가정</td><td class="p-3" contenteditable="true" placeholder="[상품 가격, 좌석 회전율/룸 점유율, 평/주말 가중]"></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">5.2 단위경제(Unit Economics)</td><td class="p-3" contenteditable="true" placeholder="[객단가, 변동비(수수료/소모품), 기여이익]"></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">5.3 월별 현금흐름(12개월)</td><td class="p-3" contenteditable="true" placeholder="[월 매출/고정비/변동비/순현금흐름]"></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">5.4 손익분기점·민감도</td><td class="p-3" contenteditable="true" placeholder="[BEP 매출/임계 이용률, Base/Opt/Pess]"></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">5.5 초기투자(CAPEX)·회수기간</td><td class="p-3" contenteditable="true" placeholder="[초기 CAPEX, 감가, 회수기간]"></td><td class="p-3">${manageControls}</td></tr>

    <tr class="plan-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">6. 리스크·대응</span></td><td class="p-3 text-right"><button class="add-sub-item-btn add-plan-item">+ 소항목 추가</button></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">주요 리스크</td><td class="p-3" contenteditable="true" placeholder="[규제, 임대, 인허가, 인력, 초기 트래픽 등]"></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">대응 방안</td><td class="p-3" contenteditable="true" placeholder="[완화/회피/수용 전략]"></td><td class="p-3">${manageControls}</td></tr>

    <tr class="plan-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">7. 운영 규칙</span></td><td class="p-3 text-right"><button class="add-sub-item-btn add-plan-item">+ 소항목 추가</button></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">결정/변경 로그</td><td class="p-3" contenteditable="true" placeholder="[형식: 변경요청 → 승인자 → 시행일]"></td><td class="p-3">${manageControls}</td></tr>
    <tr class="draggable-item"><td class="p-3 font-medium">코멘트 규칙</td><td class="p-3" contenteditable="true" placeholder="[@이름: 메모] 형식, 질문은 마감일 포함"></td><td class="p-3">${manageControls}</td></tr>
  `;
}
export function templates(){
  return {
    planItem: `<tr class="draggable-item"><td class="p-3 font-medium" contenteditable="true" placeholder="소항목"></td><td class="p-3" contenteditable="true" placeholder="[세부 내용을 입력하세요]"></td><td class="p-3">${manageControls}</td></tr>`,
    planCategory: `<tr class="plan-category"><td class="p-3 font-bold text-slate-700"><span class="category-title" contenteditable="true">새 카테고리</span></td><td class="p-3 text-right"><button class="add-sub-item-btn add-plan-item">+ 소항목 추가</button></td><td class="p-3">${manageControls}</td></tr>`
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
