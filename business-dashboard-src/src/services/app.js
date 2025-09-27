// src/services/app.js
// - 초기 자동 로그인 없음
// - 리디렉션 복귀 결과만 처리하여 세션을 복원
// - 버튼 클릭 시에만 로그인 시작
// - 로그인 상태에 따라 UI 토글

import { firebase } from './firebase.js';

// 상태 표시 도우미
function setStatus(kind, text) {
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
  dot.className = 'inline-block w-2.5 h-2.5 rounded-full ' + (map[kind] || map.idle);
}

// 사용자 친화 에러 메시지
function humanizeAuthError(e) {
  const msg = String(e?.code || e?.message || e);
  if (msg.includes('unauthorized-domain'))
    return '허용되지 않은 도메인입니다. Firebase Authentication > 설정 > 허용된 도메인에 현재 사이트를 추가하세요.';
  if (msg.includes('popup-blocked'))
    return '브라우저가 팝업을 차단했습니다. 주소창의 팝업 차단을 해제한 뒤 다시 시도하세요.';
  if (msg.includes('popup-closed'))
    return '로그인 팝업이 닫혔습니다. 다시 시도하세요.';
  if (msg.includes('network'))
    return '네트워크 오류입니다. 인터넷 연결을 확인하세요.';
  return '로그인에 실패했습니다.';
}

// 로그인/로그아웃 버튼 이벤트 연결
function bindAuthButtons() {
  document.getElementById('login-btn')?.addEventListener('click', async () => {
    setStatus('connecting', '로그인 중…');
    try {
      await firebase.login();
      // signInWithPopup 성공 시 onAuthStateChanged에서 후속 처리
    } catch (e) {
      console.error('[AUTH] login failed:', e);
      setStatus('error', '인증 실패');
      alert(humanizeAuthError(e));
    }
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
      await firebase.logout();
      // onAuthStateChanged에서 UI가 원복됩니다.
    } catch (e) {
      console.error('[AUTH] logout failed:', e);
      alert('로그아웃 중 문제가 발생했습니다.');
    }
  });
}

// 로그인 상태에 따른 UI 토글
function toggleAuthUI(user) {
  const loginBtn  = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const whoami    = document.getElementById('whoami');
  const appRoot   = document.getElementById('app-root');
  const guestHint = document.getElementById('guest-hint');

  if (user) {
    if (loginBtn)  loginBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (whoami)    whoami.textContent = user.email || '';
    if (appRoot)   appRoot.classList.remove('hidden');
    if (guestHint) guestHint.classList.add('hidden');
    setStatus('connected', '연결됨');
  } else {
    if (loginBtn)  loginBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (whoami)    whoami.textContent = '';
    if (appRoot)   appRoot.classList.add('hidden');
    if (guestHint) guestHint.classList.remove('hidden');
    setStatus('idle', '로그인 필요');
  }
}

// 앱 시작
(async function start() {
  try {
    // Firebase 초기화 및 리디렉션 로그인 결과 1회 처리
    await firebase.bootstrap();
    bindAuthButtons();

    // 실시간 인증 상태 관찰
    firebase.onAuth(async (user) => {
      toggleAuthUI(user);

      // 로그인 후에만 Firestore 데이터 구독/렌더
      if (user) {
        // 예시: 특정 문서 구독
        // const unsub = firebase.subscribe(
        //   ['artifacts','appId','public','data','businessDocs','docId'],
        //   (snap) => {
        //     const data = snap.data();
        //     renderApp(data);
        //   },
        //   (err) => console.error('onSnapshot error:', err)
        // );
      }
    });
  } catch (e) {
    console.error('앱 시작 중 오류:', e);
    setStatus('error', '앱 초기화 실패');
    alert(String(e?.message || e));
  }
})();

// 필요한 경우: Firestore 콘텐츠 렌더 예시
function renderApp(data) {
  const root = document.getElementById('app-root');
  if (!root) return;
  root.innerHTML = `
    <div class="text-sm text-slate-700">
      <pre class="bg-slate-50 border rounded p-4 overflow-auto">${
        data ? escapeHtml(JSON.stringify(data, null, 2)) : '데이터 없음'
      }</pre>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
