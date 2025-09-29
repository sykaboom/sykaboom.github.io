// business-dashboard-src/src/services/app.js
// Step 4: 충돌 감지 배너 연동 (원본 기능 보존)
// - subscribe를 통해 문서를 볼 때 firebase가 lastSeen 타임스탬프를 기억합니다.
// - 저장 시 firebase.save가 서버의 lastUpdated와 비교해 충돌을 감지하고 배너를 띄웁니다.

import { initAuthUI } from './auth.service.js';
import { initEditors } from './editor.service.js';
import { bindCommonHandlers, bindTopLevelAddHandlersOnce } from './uiHandlers.js';
import { updateNumbering } from './editorRow.utils.js';
import { firebase } from './firebase.js';

// 상태 표시 함수 (Step1)
export function setStatus(kind, text) {
  const dot  = document.getElementById('status-dot');
  const desc = document.getElementById('status-text');
  if (desc) desc.textContent = text || '';
  if (!dot) return;
  const map = {
    idle: 'bg-slate-300',
    connecting: 'bg-amber-500',
    connected: 'bg-emerald-500',
    error: 'bg-rose-500'
  };
  dot.className = 'w-3 h-3 rounded-full ' + (map[kind] || map.idle);
}

export async function startApp() {
  try {
    await firebase.init();
    await firebase.bootstrap();
  } catch (e) {
    console.warn('[firebase] 초기화 경고:', e);
    setStatus('error','Firebase 초기화 실패');
  }

  await initAuthUI();
  await initEditors({ bindCommonHandlers, updateNumbering });
  bindTopLevelAddHandlersOnce();

  // 초기 상태
  setStatus('idle','로그인 필요');
}

export { updateNumbering } from './editorRow.utils.js';
