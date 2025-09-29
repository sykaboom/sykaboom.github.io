// business-dashboard-src/src/services/firebase.js
// Step 3: 오프라인 임시 저장 큐 + 온라인 복귀 시 자동 플러시
// - save()는 오프라인이면 큐에 적재 후 성공 상태를 UI에 안내하지 않습니다.
// - 온라인 복귀(또는 수동 호출) 시 flushQueue()가 순차 동기화합니다.

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

  // ---- Offline Queue (localStorage) ----
  const QKEY = 'bd_save_queue_v1';
  function isOnline(){ return typeof navigator !== 'undefined' ? navigator.onLine : true; }
  function loadQueue(){
    try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); }
    catch { return []; }
  }
  function persistQueue(q){ try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch {} }
  function enqueue(op){
    const q = loadQueue();
    q.push(op);
    persistQueue(q);
  }

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
    // 온라인이면 즉시 저장
    if (isOnline()) {
      try {
        setStatus('connecting','저장 중…');
        await setDoc(
          doc(db, ...docPath),
          { content, lastUpdated: serverTimestamp() },
          { merge: true }
        );
        setStatus('connected','저장됨');
        return;
      } catch (e) {
        console.error('[save] 온라인 저장 실패 → 큐 적재:', e);
        // 저장 실패도 큐로 전환
      }
    }
    // 오프라인이거나 온라인 저장 실패 시: 큐 적재
    enqueue({ docPath, content, ts: Date.now() });
    setStatus('connecting','오프라인 — 임시 저장 중');
  }

  async function flushQueue(){
    const q = loadQueue();
    if (!q.length) return 0;
    let ok = 0, fail = 0;
    const rest = [];
    for (const op of q){
      try {
        await setDoc(
          doc(db, ...op.docPath),
          { content: op.content, lastUpdated: serverTimestamp() },
          { merge: true }
        );
        ok++;
      } catch (e) {
        console.error('[flushQueue] 실패, 보존:', e);
        rest.push(op); fail++;
      }
    }
    persistQueue(rest);
    return ok;
  }

  return { init, bootstrap, login, logout, onAuth, subscribe, save, flushQueue, isOnline };
})();
