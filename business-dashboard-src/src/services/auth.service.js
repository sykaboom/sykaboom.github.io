// business-dashboard-src/src/services/auth.service.js
// 인증 전담 모듈: 로그인/로그아웃 버튼 바인딩, onAuth 상태 반영(UI 토글)

import { firebase } from './firebase.js';
import { setStatus } from '../ui/status.js';

/**
 * 로그인/로그아웃 버튼을 바인딩하고, 인증 상태 변화에 따라 UI를 토글한다.
 * - 자동 로그인 없음: 사용자가 버튼을 눌러서만 로그인
 * - onAuth 상태에 맞춰 whoami, status-dot, 버튼 숨김/표시 업데이트
 * - 외부에서 firebase.init/bootstrap은 먼저 수행되어야 한다.
 *
 * 반환값: 초기 onAuth 콜백 1회가 끝나면 resolve되는 Promise<void>
 */
export function initAuthUI() {
  // 필수 DOM 엘리먼트
  const loginBtn  = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const whoami    = document.getElementById('whoami');

  // 버튼 이벤트
  loginBtn?.addEventListener('click', () => firebase.login());
  logoutBtn?.addEventListener('click', () => firebase.logout());

  // 초기 UI 상태
  if (whoami) whoami.textContent = '';
  loginBtn?.classList.remove('hidden');
  logoutBtn?.classList.add('hidden');
  setStatus('idle', '로그인 필요');

  // 최초 onAuth 수신을 기다렸다가 resolve
  return new Promise((resolve) => {
    let first = true;
    firebase.onAuth((user) => {
      if (user) {
        const name = user.displayName || user.email || '로그인됨';
        if (whoami) whoami.textContent = name;
        loginBtn?.classList.add('hidden');
        logoutBtn?.classList.remove('hidden');
        setStatus('online', '온라인');
      } else {
        if (whoami) whoami.textContent = '';
        loginBtn?.classList.remove('hidden');
        logoutBtn?.classList.add('hidden');
        setStatus('idle', '로그인 필요');
      }
      if (first) { first = false; resolve(); }
    });
  });
}
