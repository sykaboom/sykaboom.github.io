// src/services/app.js (compat version)
// - Keeps original 'startApp()' export so src/main.js continues to work
// - No auto-login on page load; user clicks the "로그인" button
// - Restores all feature editors (journal / roadmap / plan) and saving
// - Login is persisted in the browser (via firebase.js setPersistence)
import { firebase } from './firebase.js';
import { setStatus } from '../ui/status.js';
import { registry } from './registry.js';
import { debounce } from '../utils/debounce.js';

// Debounced save to Firestore
const debouncedSave = debounce(async (docId, html)=>{
  try {
    await firebase.save([`artifacts/${getAppId()}/public/data/businessDocs`, docId], html);
    setStatus('connected', '저장됨');
  } catch (e) {
    console.error(e);
    setStatus('error', '저장 오류');
  }
}, 800);

// ----- utils -----
function getAppId(){
  return typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
}

function q(id){ return document.getElementById(id); }

function toggleAuthUI(user){
  const loginBtn  = q('login-btn');
  const logoutBtn = q('logout-btn');
  const whoami    = q('whoami');

  if (user) {
    if (loginBtn)  loginBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (whoami)    whoami.textContent = user.email || '';
  } else {
    if (loginBtn)  loginBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (whoami)    whoami.textContent = '';
  }
}

// Common handlers for editor areas (save-on-input, row controls)
function bindCommonHandlers(docId, editorEl, feature){
  // autosave on input
  editorEl.addEventListener('input', ()=>{
    setStatus('connecting', '저장 중…');
    debouncedSave(docId, editorEl.innerHTML);
  });

  // click actions (delete/lock and inline add buttons)
  editorEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;

    // row-level controls
    const row = btn.closest('tr');
    let didMutate = false;

    // delete row
    if (btn.classList.contains('delete-btn') && row){
      row.remove();
      didMutate = true;
    }

    // lock/unlock row (toggle contenteditable)
    if (btn.classList.contains('lock-btn') && row){
      const nowLocked = row.dataset.locked === '1' ? false : true;
      row.dataset.locked = nowLocked ? '1' : '0';
      row.querySelectorAll('[contenteditable]')?.forEach(el=>{
        el.setAttribute('contenteditable', nowLocked ? 'false' : 'true');
      });
      didMutate = true;
    }

    // inline add buttons inside a category row
    if (row && /category/.test(row.className)){
      const t = feature.templates && feature.templates();
      // plan: "+ 소항목 추가"
      if (btn.textContent && btn.textContent.includes('소항목 추가') && t?.planItem){
        row.insertAdjacentHTML('afterend', t.planItem);
        didMutate = true;
      }
      // roadmap: "+ 과업 추가"
      if (btn.textContent && btn.textContent.includes('과업 추가') && t?.roadmapItem){
        row.insertAdjacentHTML('afterend', t.roadmapItem);
        didMutate = true;
      }
    }

    if (didMutate){
      // reorder numbering if the feature provides it
      if (feature.updateNumbering) feature.updateNumbering(editorEl);
      debouncedSave(docId, editorEl.innerHTML);
    }
  });
}

// hook "+ 추가" buttons below each editor
function bindAddButtons(){
  const editorsMap = registry.items();

  // Journal: add entry
  const addJournal = q('add-journal-entry');
  if (addJournal){
    addJournal.addEventListener('click', ()=>{
      const ed = q('journal-editor');
      const tbody = ed?.querySelector('tbody');
      const feature = editorsMap['journal'];
      const t = feature?.templates && feature.templates();
      if (tbody && t?.entry){
        tbody.insertAdjacentHTML('beforeend', t.entry);
        debouncedSave('journal', ed.innerHTML);
      }
    });
  }

  // Roadmap: add category
  const addRoadmap = q('add-roadmap-category');
  if (addRoadmap){
    addRoadmap.addEventListener('click', ()=>{
      const ed = q('roadmap-editor');
      const tbody = ed?.querySelector('tbody');
      const feature = editorsMap['roadmap'];
      const t = feature?.templates && feature.templates();
      if (tbody && t?.roadmapCategory){
        tbody.insertAdjacentHTML('beforeend', t.roadmapCategory);
        if (feature.updateNumbering) feature.updateNumbering(ed);
        debouncedSave('roadmap', ed.innerHTML);
      }
    });
  }

  // Plan: add category
  const addPlan = q('add-plan-category');
  if (addPlan){
    addPlan.addEventListener('click', ()=>{
      const ed = q('plan-editor');
      const tbody = ed?.querySelector('tbody');
      const feature = editorsMap['plan'];
      const t = feature?.templates && feature.templates();
      if (tbody && t?.planCategory){
        tbody.insertAdjacentHTML('beforeend', t.planCategory);
        if (feature.updateNumbering) feature.updateNumbering(ed);
        debouncedSave('plan', ed.innerHTML);
      }
    });
  }
}

// subscribe to Firestore docs and hydrate editors
function wireDataAfterLogin(){
  const editors = registry.items();
  Object.entries(editors).forEach(([docId, feature])=>{
    const editor = q(`${docId}-editor`);
    if (!editor) return;

    // one-time sortable init if provided by the feature
    if (feature.initSortable) feature.initSortable(editor);

    firebase.subscribe([`artifacts/${getAppId()}/public/data/businessDocs`, docId], (snap)=>{
      const data = snap.data();
      if (data && data.content){
        // Remote data -> render
        editor.innerHTML = data.content;
      } else {
        // First time -> render initial shell and immediately save
        editor.innerHTML = feature.initialShell();
        if (feature.updateNumbering) feature.updateNumbering(editor);
        debouncedSave(docId, editor.innerHTML);
      }
      // (re)bind common handlers
      bindCommonHandlers(docId, editor, feature);
      setStatus('connected', '연결됨');
    }, (err)=>{
      console.error('onSnapshot error:', err);
      setStatus('error', '데이터 구독 오류');
    });
  });

  // "+ 추가" 버튼 리스너 연결
  bindAddButtons();
}

// Public entry used by src/main.js
export async function startApp(){
  // Prepare UI
  setStatus('idle', '로그인 필요');

  // bootstrap firebase (init + redirect result handling)
  await firebase.bootstrap();

  // connect login/logout buttons
  q('login-btn')?.addEventListener('click', async ()=>{
    setStatus('connecting', '로그인 중…');
    try { await firebase.login(); }
    catch(e){
      console.error('[AUTH] login failed:', e);
      setStatus('error','인증 실패');
      alert(humanizeAuthError(e));
    }
  });

  q('logout-btn')?.addEventListener('click', async ()=>{
    await firebase.logout();
  });

  // on auth state changes
  firebase.onAuth((user)=>{
    toggleAuthUI(user);
    if (user){
      wireDataAfterLogin();
    } else {
      setStatus('idle', '로그인 필요');
    }
  });
}

// friendlier error messages
function humanizeAuthError(e){
  const msg = String(e?.code || e?.message || e);
  if (msg.includes('unauthorized-domain'))
    return '허용되지 않은 도메인입니다. Firebase Authentication > 설정 > 허용된 도메인에 현재 사이트를 추가하세요.';
  if (msg.includes('popup-blocked'))
    return '브라우저가 팝업을 차단했습니다. 팝업 허용 후 다시 시도하세요.';
  if (msg.includes('popup-closed'))
    return '로그인 팝업이 닫혔습니다. 다시 시도하세요.';
  if (msg.includes('network'))
    return '네트워크 오류입니다. 인터넷 연결을 확인하세요.';
  return '로그인에 실패했습니다.';
}
