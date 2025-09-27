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
  let loginInFlight = false;

  // 리디렉션/자동로그인 제어 플래그들
  const REDIRECT_FLAG = 'authRedirectInProgress';       // 세션(탭) 단위 리디렉트 진행중
  const LAST_REDIRECT_TS = 'authRedirectTs';            // 최근 리디렉트 시각
  const REDIRECT_COOLDOWN_MS = 15000;                   // 15초 이내면 재리디렉트 금지
  const AUTO_LOGIN_BLOCK_UNTIL = 'authAutoLoginBlockUntil';
  const AUTO_LOGIN_BLOCK_MS = 5 * 60 * 1000;            // 자동로그인 임시 차단 5분

  function now() { return Date.now(); }

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

  async function init() {
    if (app) return { app, db, auth };
    const firebaseConfig = ensureConfig();
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (e) {
      console.warn('setPersistence warning:', e);
    }
    return { app, db, auth };
  }

  // 자동 로그인 임시 차단(백오프)
  function isAutoLoginBlocked() {
    const until = Number(localStorage.getItem(AUTO_LOGIN_BLOCK_UNTIL) || '0');
    return until && now() < until;
  }
  function blockAutoLogin(ms = AUTO_LOGIN_BLOCK_MS) {
    localStorage.setItem(AUTO_LOGIN_BLOCK_UNTIL, String(now() + ms));
  }

  // 리디렉트 제어
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

  // 최초 1회만 auth 상태를 대기
  function waitForAuthStateOnce() {
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) clearRedirectFlag(); // 세션 확정 시 리디렉트 플래그 제거
        unsub();
        resolve(user);
      });
    });
  }

  // 리디렉션 결과는 페이지당 1회만 처리
  async function processRedirectResultOnce() {
    if (redirectProcessed) return;
    redirectProcessed = true;
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        clearRedirectFlag();
      }
    } catch (e) {
      // 환경 문제로 실패하더라도 루프 방지를 위해 플래그는 해제
      clearRedirectFlag();
      console.warn('getRedirectResult error:', e);
    }
  }

  // === 핵심 수정부: 루프 차단 로직 포함 ===
  async function tryPopupOrRedirect(provider) {
    // 1) 팝업 우선
    try {
      await signInWithPopup(auth, provider);
      clearRedirectFlag();
      return;
    } catch (e) {
      // 팝업 차단/미지원 → 리디렉트 폴백
      if (redirectRecently()) {
        // 방금 리디렉션을 했던 상황이면, 세션 확정을 한 번 더 기다려본다.
        const u = await waitForAuthStateOnce();
        if (u) return;

        // *** 여기서 중단! ***
        // 최근 리디렉션 이후에도 사용자 세션이 확정되지 않음 → 브라우저 환경(타사 쿠키/추적 차단 등) 문제 가능성 高
        // 무한 루프 방지를 위해 재리디렉션을 하지 않고 즉시 에러로 중단.
        console.error('[AUTH] 무한 루프 방지: 최근 리디렉션 후에도 세션 확인 실패. 브라우저 쿠키/추적 차단 설정을 확인하세요.');
        clearRedirectFlag();
        blockAutoLogin(); // 일정 시간 자동 로그인 재시도 금지(원치 않으면 주석 처리)
        throw new Error('auth-auto-login-aborted');
      }

      // 최근 리디렉션 이력이 없으면 정상 폴백
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
    await init();
    if (loginInFlight) return;       // 중복 호출 방지
    loginInFlight = true;

    try {
      if (isAutoLoginBlocked()) {
        console.warn('[AUTH] 자동 로그인 임시 차단 상태입니다.');
        return;
      }

      // 1) 커스텀 토큰 우선 (있을 때만)
      if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
        try {
          await signInWithCustomToken(auth, window.__initial_auth_token);
          clearRedirectFlag();
          return;
        } catch (e) {
          console.error('custom token sign-in failed:', e);
          // 폴백으로 진행
        }
      }

      // 2) 리디렉션 복귀 결과 먼저 처리
      await processRedirectResultOnce();

      // 3) 이미 로그인돼 있으면 종료
      let user = auth.currentUser || await waitForAuthStateOnce();
      if (user) { clearRedirectFlag(); return; }

      // 4) 같은 탭에서 이미 리디렉션 시작했으면 한 번 더 상태 대기
      if (sessionStorage.getItem(REDIRECT_FLAG) === '1') {
        user = await waitForAuthStateOnce();
        if (user) { clearRedirectFlag(); return; }
        clearRedirectFlag(); // 그래도 없으면 플래그 제거 후 시도
      }

      // 5) 실제 로그인 진입 (팝업 → 리디렉트)
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await tryPopupOrRedirect(provider);
    } finally {
      loginInFlight = false;
    }
  }

  function onAuth(cb) {
    // 호출부에서 unsubscribe를 사용할 수 있도록 반환
    return onAuthStateChanged(auth, (user) => {
      if (user) clearRedirectFlag();
      cb(user);
    });
  }

  function subscribe(docPath, onOk, onErr) {
    return onSnapshot(doc(db, ...docPath), onOk, onErr);
  }

  async function save(docPath, content) {
    await setDoc(
      doc(db, ...docPath),
      { content, lastUpdated: serverTimestamp() },
      { merge: true }
    );
  }

  return { init, login, onAuth, subscribe, save };
})();
