import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, onSnapshot, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

export const firebase = (()=>{
  let app, db, auth;

  function init(){
    const firebaseConfig = typeof window.__firebase_config !== 'undefined' ? JSON.parse(window.__firebase_config) : {};
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    return { app, db, auth };
  }

  async function login(){
    try{
      if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token){
        await signInWithCustomToken(auth, window.__initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch(e){ console.error(e); }
  }

  function subscribe(docPath, onOk, onErr){
    return onSnapshot(doc(db, ...docPath), onOk, onErr);
  }

  async function save(docPath, content){
    await setDoc(doc(db, ...docPath), { content, lastUpdated: serverTimestamp() }, { merge: true });
  }

  function onAuth(cb){ onAuthStateChanged(auth, cb); }

  return { init, login, onAuth, subscribe, save };
})();
