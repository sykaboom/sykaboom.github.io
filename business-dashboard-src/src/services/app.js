import { firebase } from './firebase.js';
import { setStatus } from '../ui/status.js';
import { registry } from './registry.js';
import { debounce } from '../utils/debounce.js';

const debouncedSave = debounce(async (docId, html)=>{
  try{
    await firebase.save([`artifacts/${getAppId()}/public/data/businessDocs`, docId], html);
    setStatus('connected', '저장됨');
  }catch(e){ console.error(e); setStatus('error','저장 오류'); }
}, 800);

function getAppId(){
  return typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
}

function bindCommonHandlers(docId, editorEl, feature){
  editorEl.addEventListener('input', ()=>{
    setStatus('connected', '저장 중...');
    debouncedSave(docId, editorEl.innerHTML);
  });

  editorEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const row = btn.closest('tr');
    let shouldSave = true;

    if (btn.matches('.add-plan-item') || btn.matches('.add-roadmap-item')){
      let last = row, next = row.nextElementSibling;
      while(next && !next.matches('.plan-category, .roadmap-category')){ last = next; next = next.nextElementSibling; }
      const t = feature.templates && feature.templates();
      const html = btn.matches('.add-plan-item') ? t?.planItem : t?.roadmapItem;
      if (html) last.insertAdjacentHTML('afterend', html);
    } else if (btn.matches('.lock-btn')){
      btn.classList.toggle('unlocked');
      row.querySelector('.delete-btn')?.classList.toggle('unlocked');
      if (btn.classList.contains('unlocked')) btn.setAttribute('data-unlocked','true'); else btn.removeAttribute('data-unlocked');
    } else if (btn.matches('.delete-btn.unlocked')){
      if (row.matches('.plan-category, .roadmap-category, .journal-entry-header')){
        const toDelete=[row]; let next=row.nextElementSibling;
        while (next && !next.matches('.plan-category, .roadmap-category, .journal-entry-header')){ toDelete.push(next); next=next.nextElementSibling; }
        toDelete.forEach(r=>r.remove());
        if (row.matches('.plan-category, .roadmap-category') && feature.updateNumbering) feature.updateNumbering(editorEl);
      } else if (row.matches('.draggable-item')){ row.remove(); }
    }
    if (shouldSave) debouncedSave(docId, editorEl.innerHTML);
  });
}

export async function startApp(){
  try{
    firebase.init();
  }catch(e){ console.error('Firebase 초기화 실패:', e); setStatus('error','Firebase 초기화 실패'); return; }

  firebase.onAuth(async (user)=>{
    if (user){
      setStatus('connected','연결됨');

      Object.entries(registry.items()).forEach(([docId, feature])=>{
        const editor = document.getElementById(`${docId}-editor`);
        firebase.subscribe([`artifacts/${getAppId()}/public/data/businessDocs`, docId], (snap)=>{
          const initial = feature.initialShell();
          const defaults = feature.defaultRows();
          if (snap.exists()){
            const remote = snap.data().content;
            if (!editor.contains(document.activeElement) && editor.innerHTML !== remote){
              editor.innerHTML = remote;
              editor.querySelectorAll('.lock-btn[data-unlocked="true"]').forEach(btn=>{
                btn.classList.add('unlocked');
                btn.closest('tr').querySelector('.delete-btn')?.classList.add('unlocked');
              });
            }
          } else {
            editor.innerHTML = initial;
            const tbody = editor.querySelector('tbody');
            if (tbody){ tbody.innerHTML = defaults; debouncedSave(docId, editor.innerHTML); }
          }
          if (feature.initSortable) feature.initSortable(editor);
        }, (e)=>{ console.error(e); setStatus('error','동기화 오류'); });

        bindCommonHandlers(docId, editor, feature);
      });

      // 여기서 +버튼 리스너 연결
      const editorsMap = registry.items();

      const addJournal = document.getElementById('add-journal-entry');
      if (addJournal) {
        addJournal.addEventListener('click', () => {
          const ed = document.getElementById('journal-editor');
          const tbody = ed?.querySelector('tbody');
          const feature = editorsMap['journal'];
          const t = feature?.templates && feature.templates();
          if (tbody && t?.entry) {
            tbody.insertAdjacentHTML('beforeend', t.entry);
            debouncedSave('journal', ed.innerHTML);
          }
        });
      }

      const addRoadmap = document.getElementById('add-roadmap-category');
      if (addRoadmap) {
        addRoadmap.addEventListener('click', () => {
          const ed = document.getElementById('roadmap-editor');
          const tbody = ed?.querySelector('tbody');
          const feature = editorsMap['roadmap'];
          const t = feature?.templates && feature.templates();
          if (tbody && t?.roadmapCategory) {
            tbody.insertAdjacentHTML('beforeend', t.roadmapCategory);
            if (feature.updateNumbering) feature.updateNumbering(ed);
            debouncedSave('roadmap', ed.innerHTML);
          }
        });
      }

      const addPlan = document.getElementById('add-plan-category');
      if (addPlan) {
        addPlan.addEventListener('click', () => {
          const ed = document.getElementById('plan-editor');
          const tbody = ed?.querySelector('tbody');
          const feature = editorsMap['plan'];
          const t = feature?.templates && feature.templates();
          if (tbody && t?.planCategory) {
            tbody.insertAdjacentHTML('beforeend', t.planCategory);
            if (feature.updateNumbering) feature.updateNumbering(ed);
            debouncedSave('plan', ed.innerHTML);
          }
        });
      }

    } else {
      setStatus('connecting','로그인 필요');
    }
  });

  try {
  await firebase.login();
} catch (e) {
  console.error(e);
  if (String(e?.message || e).includes('auth-auto-login-aborted')) {
    setStatus('error', '자동 로그인 중단됨: 브라우저의 쿠키/추적 차단 설정을 확인하세요.');
  } else {
    setStatus('error', '인증 실패');
  }
}
