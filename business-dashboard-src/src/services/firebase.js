// business-dashboard-src/src/services/firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
  getFirestore, doc, onSnapshot, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

export const firebase = (() => {
  let app, db, auth;
  let redirectProcessed = false;

  const REDIRECT_FLAG = 'authRedirectInProgress';
  const LAST_REDIRECT_TS = 'authRedirectTs';
  const REDIRECT_COOLDOWN_MS = 15000; // 15초 내 재시도 금지

  function ensureConfig() {
    const cfg = typeof window.__firebase_config !== 'undefined'
      ? (typeof window.__firebase_config === 'string'
          ? JSON.parse(window.__firebase_config)
          : window.__firebase_config)
      : null;
    if (!cfg || !cfg.apiKey) {
      throw new Error('Firebase config가 누락되었습니다: window.__firebase_config 확인');
    }
    return cfg;
  }

  function init() {
    if (app) return { app, db, auth };
    const firebaseConfig = ensureConfig();
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    return { app, db, auth };
  }

  function now() { return Date.now(); }
  function setRedirectFlag() {
    sessionStorage.setItem(REDIRECT_FLAG, '1');
    localStorage.setItem(LAST_REDIRECT_TS, String(now()));
  }
  function clearRedirectFlag() {
    sessionStorage.removeItem(REDIRECT_FLAG);
  }
  function redirectRecently() {
    const ts = Number(localStorage.getItem(LAST_REDIRECT_TS) || '0');
    return ts && (now() - ts) < REDIRECT_COOLDOWN_MS;
  }

  // onAuthStateChanged를 Promise로 래핑
  function waitForAuthStateOnce() {
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) clearRedirectFlag(); // 세션 확정되면 중복 리다이렉트 방지
        unsub();
        resolve(user);
      });
    });
  }

  // 리다이렉트 결과는 페이지당 1회만 처리
  async function processRedirectResultOnce() {
    if (redirectProcessed) return;
    redirectProcessed = true;
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        clearRedirectFlag();
      }
    } catch (e) {
      // 권한 도메인 / 쿠키 이슈 등 -> 루프 방지를 위해 플래그는 해제
      clearRedirectFlag();
      console.warn('getRedirectResult error:', e);
    }
  }

  async function tryPopupOrRedirect(provider) {
    // 1) 팝업 우선(가능한 환경에서는 루프 발생 여지를 줄임)
    try {
      await signInWithPopup(auth, provider);
      clearRedirectFlag();
      return;
    } catch (e) {
      // 팝업 차단/미지원 환경이면 리다이렉트 폴백
      if (redirectRecently()) {
        // 바로 직전에 리다이렉트 시도했다면, 상태 확정을 한 번 더 기다린다.
        const u = await waitForAuthStateOnce();
        if (u) return;
      }
      try {
        setRedirectFlag();
        await signInWithRedirect(auth, provider);
      } catch (e2) {
        clearRedirectFlag();
        console.error('signInWithRedirect failed:', e2);
        throw e2;
      }
    }
  }

  async function login() {
    init();

    // 영속 세션
    try { await setPersistence(auth, browserLocalPersistence); } catch (e) { console.warn('setPersistence warning:', e); }

    // 1) 커스텀 토큰 우선(있을 때만)
    if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
      try {
        await signInWithCustomToken(auth, window.__initial_auth_token);
        clearRedirectFlag();
        return;
      } catch (e) {
        console.error('custom token sign-in failed:', e);
        // 커스텀 토큰 실패 시 아래 구글 로그인으로 폴백
      }
    }

    // 2) 리다이렉트 복귀 결과부터 처리
    await processRedirectResultOnce();

    // 3) 이미 로그인되어 있으면 종료
    let user = auth.currentUser || await waitForAuthStateOnce();
    if (user) { clearRedirectFlag(); return; }

    // 4) 같은 탭에서 이미 리다이렉트 시도 중이면, 한 번 더 상태를 기다림
    if (sessionStorage.getItem(REDIRECT_FLAG) === '1') {
      user = await waitForAuthStateOnce();
      if (user) { clearRedirectFlag(); return; }
      // 그래도 없으면 플래그 해제 후 재시도 허용
      clearRedirectFlag();
    }

    // 5) 실제 로그인 진입(팝업→리다이렉트)
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await tryPopupOrRedirect(provider);
  }

  function onAuth(cb) {
    return onAuthStateChanged(auth, (user) => {
      if (user) clearRedirectFlag();
      cb(user);
    });
  }

  function subscribe(docPath, onOk, onErr) {
    return onSnapshot(doc(db, ...docPath), onOk, onErr);
  }

  async function save(docPath, content) {
    await setDoc(doc(db, ...docPath), { content, lastUpdated: serverTimestamp() }, { merge: true });
  }

  return { init, login, onAuth, subscribe, save };
})();
