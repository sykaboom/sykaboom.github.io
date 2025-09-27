import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
  getFirestore, doc, onSnapshot, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

export const firebase = (() => {
  let app, db, auth;

  function init() {
    const firebaseConfig = typeof window.__firebase_config !== 'undefined'
      ? JSON.parse(window.__firebase_config)
      : {};
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    return { app, db, auth };
  }

  async function login() {
    try {
      // 1) 커스텀 토큰 우선
      if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
        await signInWithCustomToken(auth, window.__initial_auth_token);
        return;
      }

      // 2) 리다이렉트 결과 처리(이미 돌아왔다면 여기서 로그인 완료)
      try { await getRedirectResult(auth); } catch { /* no-op */ }
      if (auth.currentUser) return;

      // 3) 구글 로그인 리다이렉트
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  function onAuth(cb) { onAuthStateChanged(auth, cb); }

  function subscribe(docPath, onOk, onErr) {
    return onSnapshot(doc(db, ...docPath), onOk, onErr);
  }

  async function save(docPath, content) {
    await setDoc(doc(db, ...docPath), { content, lastUpdated: serverTimestamp() }, { merge: true });
  }

  return { init, login, onAuth, subscribe, save };
})();
