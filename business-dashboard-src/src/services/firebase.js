// /src/firebase.js (또는 기존 firebase.js 대체)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  GoogleAuthProvider,
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
  let redirectProcessed = false; // 이 탭에서 getRedirectResult를 한 번만 처리
  const REDIRECT_FLAG = 'authRedirectInProgress'; // 중복 리다이렉트 방지용

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

    // 세션 유지: 새 탭/새로고침에도 로그인 유지
    await setPersistence(auth, browserLocalPersistence);

    return { app, db, auth };
  }

  // onAuthStateChanged를 Promise로 래핑해 최초 세션 확정까지 기다림
  function waitForAuthStateOnce() {
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
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
      await getRedirectResult(auth); // 필요 시 credential을 가져오고, 없으면 null
    } catch (e) {
      // credential-이슈 등은 콘솔에 남기되, 흐름은 막지 않음
      console.warn('getRedirectResult error:', e);
    }
  }

  async function login() {
    await init();

    // 1) 커스텀 토큰 우선
    if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
      try {
        await signInWithCustomToken(auth, window.__initial_auth_token);
        return;
      } catch (e) {
        console.error('custom token sign-in failed:', e);
        throw e;
      }
    }

    // 2) 리다이렉트 결과 먼저 1회 처리
    await processRedirectResultOnce();

    // 3) 현재 세션 확정까지 대기
    let user = auth.currentUser || await waitForAuthStateOnce();
    if (user) return; // 이미 로그인 완료

    // 4) 같은 탭에서 중복 리다이렉트 방지
    if (sessionStorage.getItem(REDIRECT_FLAG) === '1') {
      // 이미 리다이렉트 시작됨. onAuthStateChanged를 한 번 더 기다려봄.
      user = await waitForAuthStateOnce();
      if (user) return;
      // 그래도 없으면 플래그를 해제하고 한 번 더 시도할 수 있도록 한다.
      sessionStorage.removeItem(REDIRECT_FLAG);
    }

    // 5) 실제 리다이렉트 시작
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      sessionStorage.setItem(REDIRECT_FLAG, '1');
      await signInWithRedirect(auth, provider);
      // 이후 브라우저가 이동하므로 아래 코드는 정상적이면 실행되지 않음
    } catch (e) {
      sessionStorage.removeItem(REDIRECT_FLAG);
      console.error('signInWithRedirect failed:', e);
      throw e;
    }
  }

  function onAuth(cb) {
    // 앱 전역에서 재사용 가능
    return onAuthStateChanged(auth, cb);
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
