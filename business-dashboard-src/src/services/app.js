// business-dashboard-src/src/services/app.js
// 얇은 엔트리 오케스트레이터
// - 인증 UI 초기화 → 에디터 초기화(구독/자동저장) → 전역 추가 버튼 바인딩
// - 기존 startApp() 시그니처를 유지해 src/main.js와의 호환을 보장

import { initAuthUI } from './auth.service.js';
import { initEditors } from './editor.service.js';
import { bindCommonHandlers, bindTopLevelAddHandlersOnce } from './uiHandlers.js';
import { updateNumbering } from './editorRow.utils.js';

export async function startApp() {
  // 1) 인증 UI 준비(로그인/로그아웃, onAuth 반영)
  await initAuthUI();

  // 2) 에디터 초기화 및 Firestore 구독
  await initEditors({ bindCommonHandlers, updateNumbering });

  // 3) 화면 상단 "추가" 류 전역 버튼(일지/카테고리/단계) 바인딩(한 번만)
  bindTopLevelAddHandlersOnce();
}

// 선택적으로 필요하면 유틸 재노출(기존 외부 코드 호환용)
export { updateNumbering } from './editorRow.utils.js';
