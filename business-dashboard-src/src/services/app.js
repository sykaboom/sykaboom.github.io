// business-dashboard-src/src/services/app.js
// Hotfix: ensure Firebase is initialized BEFORE initAuthUI()
// This prevents 'onAuthStateChanged' of undefined errors.

import { initAuthUI } from './auth.service.js';
import { initEditors } from './editor.service.js';
import { bindCommonHandlers, bindTopLevelAddHandlersOnce } from './uiHandlers.js';
import { updateNumbering } from './editorRow.utils.js';
import { firebase } from './firebase.js';

export async function startApp() {
  // 0) Firebase 초기화 먼저
  try {
    await firebase.init();
    await firebase.bootstrap();
  } catch (e) {
    console.warn('[firebase] 초기화 경고:', e);
  }

  // 1) 인증 UI 준비(로그인/로그아웃, onAuth 반영)
  await initAuthUI();

  // 2) 에디터 초기화 및 Firestore 구독
  await initEditors({ bindCommonHandlers, updateNumbering });

  // 3) 전역 추가 버튼 바인딩
  bindTopLevelAddHandlersOnce();
}

export { updateNumbering } from './editorRow.utils.js';
