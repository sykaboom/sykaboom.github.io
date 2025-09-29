// business-dashboard-src/src/services/app.js
// Step 3: offline/online 이벤트 훅 추가 (원본 기능 보존)
// - startApp 내에서 브라우저 offline/online 이벤트만 구독합니다.
// - 로컬에서는 임시 저장 안내, 온라인 복귀 시 큐 플러시 후 상태 갱신.

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
  // Firebase 초기화
  try {
    await firebase.init();
    await firebase.bootstrap();
  } catch (e) {
    console.warn('[firebase] 초기화 경고:', e);
    setStatus('error','Firebase 초기화 실패');
  }

  // 인증/에디터/핫키 등 원본 초기화
  await initAuthUI();
  await initEditors({ bindCommonHandlers, updateNumbering });
  bindTopLevelAddHandlersOnce();

  // Step3: 오프라인/온라인 이벤트 훅 (아주 얇게)
  window.addEventListener('offline', () => {
    setStatus('connecting', '오프라인 — 임시 저장 중');
  });
  window.addEventListener('online', async () => {
    try {
      setStatus('connecting', '재연결 — 동기화 중');
      await firebase.flushQueue();
      setStatus('connected', '동기화 완료');
    } catch (e) {
      console.error('[flushQueue] 실패:', e);
      setStatus('error', '동기화 오류');
    }
  });

  // 초기 상태
  setStatus('idle','로그인 필요');
}

export { updateNumbering } from './editorRow.utils.js';
