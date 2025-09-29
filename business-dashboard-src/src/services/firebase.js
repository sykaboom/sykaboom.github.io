// business-dashboard-src/src/services/firebase.js
// Step 4: 충돌 감지(Conflict Detection) 추가
// - subscribe() 시 마지막으로 본 lastUpdated를 내부 캐시에 저장
// - save() 직전에 서버의 lastUpdated와 비교하여 최신이면 충돌 배너 표시
// - 배너에서 '내 변경 덮어쓰기'를 누르면 1회 허용 후 다시 저장 시도

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
  getFirestore, doc, onSnapshot, setDoc, serverTimestamp, getDoc
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { setStatus } from './app.js';
import { showConflictBanner } from '../ui/conflict.js';

export const firebase = (()=>{
  let app, db, auth;
  let redirectProcessed = false;

  // subscribe / save 충돌 판정용 캐시
  const lastSeenTs = new Map();          // key(docPathString) -> millis
  const allowOverwriteOnce = new Map();  // key -> boolean

  function keyOf(path){ return Array.isArray(path) ? path.join('/') : String(path); }

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
    const ref = doc(db, ...(Array.isArray(docPath) ? docPath : [docPath]));
    return onSnapshot(ref, (snap)=>{
      try {
        const data = snap.data && snap.data();
        const ts = data?.lastUpdated?.toMillis ? data.lastUpdated.toMillis() : Date.now();
        lastSeenTs.set(keyOf(docPath), ts);
      } catch(_) {}
      onOk && onOk(snap);
    }, onErr);
  }

  async function save(docPath, content){
    const k = keyOf(docPath);
    // 저장 직전 서버 최신 버전 확인
    try {
      const ref = doc(db, ...(Array.isArray(docPath) ? docPath : [docPath]));
      const curSnap = await getDoc(ref);
      const serverTs = curSnap.exists() ? (curSnap.data()?.lastUpdated?.toMillis?.() || 0) : 0;
      const localTs  = lastSeenTs.get(k) || 0;

      if (serverTs > localTs && !allowOverwriteOnce.get(k)){
        // 충돌: 배너 표시 후 종료 (사용자 선택 기다림)
        showConflictBanner({
          onOverwrite: async ()=>{
            allowOverwriteOnce.set(k, true);
            await save(docPath, content);
          },
          onRefresh: ()=>{ location.reload(); }
        });
        return;
      }
    } catch (e) {
      // 메타를 못 읽어도 저장은 시도 (네트워크 일시 오류 등)
      console.warn('[conflict-check] 경고:', e);
    }

    // 실제 저장
    try {
      setStatus('connecting','저장 중…');
      const ref = doc(db, ...(Array.isArray(docPath) ? docPath : [docPath]));
      await setDoc(
        ref,
        { content, lastUpdated: serverTimestamp() },
        { merge: true }
      );
      allowOverwriteOnce.delete(k);
      setStatus('connected','저장됨');
      // 저장 성공 후 마지막 본 시각 갱신(낙관적 업데이트)
      lastSeenTs.set(k, Date.now());
    } catch (e) {
      console.error('[save] 실패:', e);
      setStatus('error','저장 오류');
    }
  }

  return { init, bootstrap, login, logout, onAuth, subscribe, save };
})();
