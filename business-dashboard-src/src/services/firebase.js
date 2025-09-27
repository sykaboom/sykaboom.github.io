// src/services/firebase.js (교체본)
// - 자동 로그인 제거 (초기 진입 시 팝업/리디렉션을 시작하지 않음)
// - 로그인 버튼 클릭 시에만 인증 흐름 시작
// - 팝업 차단 시 signInWithRedirect로 자동 폴백
// - 로그인 유지: browserLocalPersistence
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
  getFirestore, doc, onSnapshot, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

export const firebase = (()=>{
  let app, db, auth;
  let redirectProcessed = false;

  function ensureConfig(){
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

  async function init(){
    if (app) return { app, db, auth };
    const config = ensureConfig();
    app  = initializeApp(config);
    db   = getFirestore(app);
    auth = getAuth(app);
    // 로그인 유지
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (e) {
      console.warn('[AUTH] setPersistence 실패 – 브라우저 제한일 수 있음:', e);
    }
    return { app, db, auth };
  }

  // GitHub Pages 등에서 리디렉션 복귀 시 결과를 1회만 처리
  async function processRedirectResultOnce(){
    if (redirectProcessed) return;
    redirectProcessed = true;
    try {
      await getRedirectResult(auth);
    } catch(e) {
      // 일부 브라우저 환경에서 에러가 날 수 있으나, 사용자 세션은 onAuthStateChanged로 정상 전달된다.
      console.warn('getRedirectResult 경고:', e);
    }
  }

  // 페이지 최초 진입 시 호출: 초기화 + 리디렉션 결과만 처리(자동 로그인 X)
  async function bootstrap(){
    await init();
    await processRedirectResultOnce();
  }

  // 사용자가 클릭했을 때만 실제 로그인 흐름을 시작
  async function login(){
    await init();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
    } catch(e) {
      // 팝업 차단/미지원 → 리디렉션 폴백
      if (String(e?.code || e).includes('popup') || String(e?.message || e).includes('popup')) {
        await signInWithRedirect(auth, provider);
      } else {
        throw e;
      }
    }
  }

  async function logout(){
    await init();
    await signOut(auth);
  }

  function onAuth(cb){
    return onAuthStateChanged(auth, cb);
  }

  function subscribe(docPath, onOk, onErr){
    return onSnapshot(doc(db, ...docPath), onOk, onErr);
  }

  async function save(docPath, content){
    await setDoc(
      doc(db, ...docPath),
      { content, lastUpdated: serverTimestamp() },
      { merge: true }
    );
  }

  return { init, bootstrap, login, logout, onAuth, subscribe, save };
})();
