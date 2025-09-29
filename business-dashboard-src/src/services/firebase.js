// business-dashboard-src/src/services/firebase.js
// Patched for Step 2: setStatus hooks on save

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
import { setStatus } from './app.js';

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
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (e) {
      console.warn('[AUTH] setPersistence 실패:', e);
    }
    return { app, db, auth };
  }

  async function processRedirectResultOnce(){
    if (redirectProcessed) return;
    redirectProcessed = true;
    try {
      await getRedirectResult(auth);
    } catch(e) {
      console.warn('getRedirectResult 경고:', e);
    }
  }

  async function bootstrap(){
    await init();
    await processRedirectResultOnce();
  }

  async function login(){
    await init();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch(e) {
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
    try {
      setStatus('connecting','저장 중…');
      await setDoc(
        doc(db, ...docPath),
        { content, lastUpdated: serverTimestamp() },
        { merge: true }
      );
      setStatus('connected','저장됨');
    } catch (e) {
      console.error('[save] 실패:', e);
      setStatus('error','저장 오류');
    }
  }

  return { init, bootstrap, login, logout, onAuth, subscribe, save };
})();
