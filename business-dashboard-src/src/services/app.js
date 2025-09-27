/* =============================================================================
 * business-dashboard — src/services/app.js (ESM)
 *
 * 🔧 패치 요약
 * - 전역 위임(click)으로 "일지항목추가 / 카테고리추가 / 단계추가" 버튼 신뢰성 확보
 * - 버튼 id/class/data-action/텍스트(한국어) 기반 다각 매칭
 * - 편집 테이블 외부 툴바 클릭도 해당 에디터로 라우팅하여 동작
 * - 잠금(자물쇠)=삭제 방지 전용(내용은 항상 보이고 수정 가능)
 * - 소항목/과업 추가 = 클릭 1회당 정확히 1행 (중복 방지)
 * - 카테고리/일지 헤더 삭제 시 하위 묶음 동시 삭제 유지
 * =============================================================================*/
import { registry } from './registry.js';
import { firebase } from './firebase.js';
import { setStatus } from '../ui/status.js';
import { debounce } from '../utils/debounce.js';

// -----------------------------------------------------------------------------
// 내부 상태
// -----------------------------------------------------------------------------
const EDITOR_MAP = new Map(); // editorRoot -> { key, feature, docPath }
const BIND_KEY = Symbol('bindCommonHandlers');
let TOP_LEVEL_BOUND = false;

// -----------------------------------------------------------------------------
// 유틸
// -----------------------------------------------------------------------------
function isCategoryRow(row) {
  if (!row) return false;
  const cls = row.className || '';
  return /(^|\s)category(\s|$)/.test(cls) || /category/.test(cls);
}
function isJournalHeaderRow(row) {
  if (!row) return false;
  return row.classList.contains('journal-entry-header');
}
function normalize(s) {
  return (s || '').replace(/\s+/g, '').toLowerCase();
}
function getEditorRootByKey(key) {
  return document.getElementById(`${key}-editor`);
}
function getEditorMetaByRoot(root) {
  for (const [r, meta] of EDITOR_MAP) {
    if (r === root) return meta;
  }
  return null;
}
function getNearestEditorRootFrom(el) {
  // 우선: 등록된 editorRoot 중 자신을 포함하는 가장 안쪽 요소
  let nearest = null;
  for (const [root] of EDITOR_MAP) {
    if (root.contains(el)) {
      if (!nearest || nearest.contains(root)) nearest = root;
    }
  }
  // 없으면 기본 편집기들 중 화면에 있는 것 우선
  if (!nearest) {
    const candidates = ['plan', 'roadmap', 'journal']
      .map(getEditorRootByKey)
      .filter(Boolean);
    nearest = candidates.find((r) => r.offsetParent !== null) || candidates[0] || null;
  }
  return nearest;
}
function pickTemplate(feature, keys = []) {
  const tpls = typeof feature?.templates === 'function' ? feature.templates() : {};
  for (const k of keys) {
    if (tpls && typeof tpls[k] === 'string' && tpls[k].trim()) return tpls[k];
  }
  // <template id="..."> 지원
  for (const k of keys) {
    const t = document.getElementById(`${k}-template`) || document.querySelector(`template[data-tpl="${k}"]`);
    if (t && t.content) return t.innerHTML || t.content.firstElementChild?.outerHTML || '';
  }
  return '';
}
function syncRowUI(row) {
  if (!row) return;
  const locked = row.dataset.locked === '1';
  const lockBtn = row.querySelector('.lock-btn');
  const delBtn  = row.querySelector('.delete-btn');

  if (lockBtn) lockBtn.classList.toggle('unlocked', !locked);
  if (delBtn) {
    delBtn.classList.toggle('unlocked', !locked);
    delBtn.setAttribute('aria-disabled', locked ? 'true' : 'false');
    if (locked) {
      delBtn.style.pointerEvents = 'none';
      delBtn.style.opacity = '0.35';
    } else {
      delBtn.style.pointerEvents = '';
      delBtn.style.opacity = '';
    }
  }

  // 잠금=삭제 방지 전용 → 내용은 항상 보이고 언제나 수정 가능
  row.querySelectorAll('[contenteditable]').forEach((el) => {
    el.setAttribute('contenteditable', 'true');
    el.removeAttribute('aria-hidden');
    el.style.visibility = '';
    el.style.opacity = '';
  });
}
function syncAllRows(editorEl) {
  editorEl.querySelectorAll('tr').forEach(syncRowUI);
}
function deleteSectionRows(startRow) {
  if (!startRow) return;
  let cur = startRow.nextElementSibling;
  const isCat = isCategoryRow(startRow);
  const isHdr = isJournalHeaderRow(startRow);

  startRow.remove();

  if (isCat) {
    while (cur && !isCategoryRow(cur)) {
      const next = cur.nextElementSibling;
      cur.remove();
      cur = next;
    }
  } else if (isHdr) {
    while (cur && !isJournalHeaderRow(cur)) {
      const next = cur.nextElementSibling;
      cur.remove();
      cur = next;
    }
  }
}
function findTemplateRowForSection(sectionRow) {
  let cur = sectionRow?.nextElementSibling;
  while (cur && !isCategoryRow(cur) && !isJournalHeaderRow(cur)) {
    if (cur.classList.contains('draggable-item') || cur.tagName === 'TR') return cur;
    cur = cur.nextElementSibling;
  }
  return sectionRow || null;
}
function cleanClonedRow(clone, { type } = {}) {
  clone.dataset.locked = '0';
  if (type === 'subitem' || type === 'task') {
    clone.classList.remove('journal-entry-header');
    clone.className = clone.className
      .split(/\s+/).filter((cls) => cls && !/category/.test(cls)).join(' ') || 'draggable-item';
  }
  clone.querySelectorAll('[contenteditable]').forEach((el) => {
    el.innerHTML = '';
    el.setAttribute('contenteditable', 'true');
  });
  clone.querySelectorAll('input, textarea, select').forEach((el) => {
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
    else el.value = '';
    el.removeAttribute('id');
    el.removeAttribute('name');
  });
  if (clone.id) clone.id = '';
  clone.querySelectorAll('[data-id]').forEach((el) => el.removeAttribute('data-id'));

  // 템플릿 행 내부에 “추가” 버튼 유물 제거
  clone.querySelectorAll('.add-sub-item-btn, .add-plan-item, .add-roadmap-item, .add-subitem-btn, .add-task-btn').forEach(b => b.remove());

  syncRowUI(clone);
  return clone;
}
function insertRowBelow(row, { type } = {}) {
  const newRow = row.cloneNode(true);
  cleanClonedRow(newRow, { type });
  row.parentNode.insertBefore(newRow, row.nextElementSibling);
  return newRow;
}
function updateNumbering(editorEl) {
  let n = 1;
  editorEl.querySelectorAll('tr').forEach((tr) => {
    if (isCategoryRow(tr) || isJournalHeaderRow(tr)) return;
    const numCell = tr.querySelector('.number, .number-cell, [data-number]');
    if (numCell) numCell.textContent = String(n++);
  });
}
function saveEditor(editorRoot) {
  const meta = getEditorMetaByRoot(editorRoot);
  if (!meta) return;
  const { docPath } = meta;
  const holder = editorRoot.querySelector('tbody') || editorRoot;
  const content = holder.innerHTML;
  try {
    firebase.save(docPath, content);
    setStatus('online', '저장됨');
  } catch (e) {
    console.warn('[saveEditor] 실패:', e);
    setStatus('degraded', '저장 오류');
  }
}

// -----------------------------------------------------------------------------
// 에디터 내부 공통 핸들러 (행 잠금/삭제/소항목·과업 추가)
// -----------------------------------------------------------------------------
function bindCommonHandlers(docId, editorEl, feature) {
  if (!editorEl) return;
  if (editorEl[BIND_KEY]) return;
  editorEl[BIND_KEY] = true;

  syncAllRows(editorEl);

  editorEl.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('button, a, [role="button"], .control-btn, .lock-btn, .delete-btn');
      if (!btn || !editorEl.contains(btn)) return;

      const row = btn.closest('tr');
      if (!row) return;

      let didMutate = false;

      // 잠금 토글(삭제 방지 전용)
      if (btn.classList.contains('lock-btn')) {
        const nowLocked = row.dataset.locked === '1' ? false : true;
        row.dataset.locked = nowLocked ? '1' : '0';
        syncRowUI(row);
        didMutate = true;
      }

      // 소항목/과업 추가 (행 내부 버튼)
      const isAddInner =
        btn.classList.contains('add-subitem-btn') ||
        btn.classList.contains('add-sub-item-btn') ||
        btn.classList.contains('add-task-btn') ||
        btn.classList.contains('add-plan-item') ||
        btn.classList.contains('add-roadmap-item') ||
        btn.dataset.action === 'add-subitem' ||
        btn.dataset.action === 'add-task' ||
        /소항목\s*추가|과업\s*추가/.test(btn.textContent || '');

      if (isAddInner) {
        e.preventDefault();
        e.stopPropagation();
        if (btn.dataset.busy === '1') return;
        btn.dataset.busy = '1';
        setTimeout(() => { btn.dataset.busy = '0'; }, 120);

        const type =
          btn.classList.contains('add-roadmap-item') ||
          btn.classList.contains('add-task-btn') ||
          /과업\s*추가/.test(btn.textContent || '')
            ? 'task'
            : 'subitem';

        const templateRow =
          (isCategoryRow(row) || isJournalHeaderRow(row))
            ? findTemplateRowForSection(row)
            : row;

        insertRowBelow(templateRow, { type });
        didMutate = true;
      }

      // 삭제
      if (btn.classList.contains('delete-btn')) {
        e.preventDefault();
        if (row.dataset.locked === '1') return;
        if (isCategoryRow(row) || isJournalHeaderRow(row)) deleteSectionRows(row);
        else row.remove();
        didMutate = true;
      }

      if (didMutate) {
        updateNumbering(editorEl);
        try {
          if (typeof feature?.updateNumbering === 'function') feature.updateNumbering(editorEl);
          if (typeof feature?.onChange === 'function') feature.onChange();
          if (typeof feature?.autosave === 'function') feature.autosave();
          else saveEditor(editorEl);
        } catch (_) {
          saveEditor(editorEl);
        }
      }
    },
    true // 캡처 단계: 버블 중복 처리 예방
  );
}

// -----------------------------------------------------------------------------
// 전역(툴바) “추가” 버튼 핸들러: 일지항목/카테고리/단계
// -----------------------------------------------------------------------------
function isAddJournalButton(btn) {
  const idc = (btn.id || '') + ' ' + (btn.className || '');
  const data = (btn.dataset?.action || '') + ' ' + (btn.dataset?.add || '');
  const txt = normalize(btn.textContent);
  return (
    /add[-_]journal/.test(idc + ' ' + data) ||
    txt.includes('일지항목추가') ||
    txt.includes('일지추가') ||
    btn.getAttribute('aria-label')?.includes('일지') ||
    btn.id === 'add-journal-entry'
  );
}
function isAddCategoryButton(btn) {
  const idc = (btn.id || '') + ' ' + (btn.className || '');
  const data = (btn.dataset?.action || '') + ' ' + (btn.dataset?.add || '');
  const txt = normalize(btn.textContent);
  return (
    /add[-_](plan[-_]?)?category/.test(idc + ' ' + data) ||
    /add[-_]category/.test(idc + ' ' + data) ||
    txt.includes('카테고리추가') ||
    btn.id === 'add-plan-category' ||
    btn.id === 'add-roadmap-category'
  );
}
function isAddStepButton(btn) {
  const idc = (btn.id || '') + ' ' + (btn.className || '');
  const data = (btn.dataset?.action || '') + ' ' + (btn.dataset?.add || '');
  const txt = normalize(btn.textContent);
  return (
    /add[-_]step|add[-_]stage|add[-_]roadmap[-_]item/.test(idc + ' ' + data) ||
    txt.includes('단계추가') || txt.includes('스텝추가') || txt.includes('스테이지추가')
  );
}
function resolveTargetKeyForCategory(btn) {
  // 버튼 맥락/표기로 plan/roadmap 추정
  const idc = (btn.id || '') + ' ' + (btn.className || '');
  const data = (btn.dataset?.target || '') + ' ' + (btn.dataset?.for || '') + ' ' + (btn.dataset?.action || '');
  const txt = (btn.textContent || '');
  if (/roadmap/i.test(idc + ' ' + data + ' ' + txt)) return 'roadmap';
  if (/plan/i.test(idc + ' ' + data + ' ' + txt)) return 'plan';

  // 위치 기반(가까운 에디터)
  const nearRoot = getNearestEditorRootFrom(btn);
  if (nearRoot && nearRoot.id === 'roadmap-editor') return 'roadmap';
  if (nearRoot && nearRoot.id === 'plan-editor') return 'plan';

  // 화면 보이는 순서 우선
  const roadmapVisible = getEditorRootByKey('roadmap');
  if (roadmapVisible && roadmapVisible.offsetParent !== null) return 'roadmap';
  const planVisible = getEditorRootByKey('plan');
  if (planVisible && planVisible.offsetParent !== null) return 'plan';

  // 마지막 기본값
  return 'plan';
}
function appendHTMLToEditor(editorRoot, html) {
  if (!editorRoot || !html) return false;
  const holder = editorRoot.querySelector('tbody') || editorRoot;
  holder.insertAdjacentHTML('beforeend', html);
  updateNumbering(editorRoot);
  syncAllRows(editorRoot);
  saveEditor(editorRoot);
  return true;
}
function cloneFallbackRow(editorRoot, opts = {}) {
  // 섹션 내 첫 일반행 또는 마지막 일반행을 복제하여 초기화
  const holder = editorRoot.querySelector('tbody') || editorRoot;
  const rows = [...holder.querySelectorAll('tr')];
  const candidate =
    rows.find((r) => !isCategoryRow(r) && !isJournalHeaderRow(r)) ||
    rows[rows.length - 1] ||
    null;
  if (!candidate) return '';
  const row = candidate.cloneNode(true);
  cleanClonedRow(row, opts);
  return row.outerHTML;
}
function addJournalEntry(btn) {
  const editorRoot = getEditorRootByKey('journal') || getNearestEditorRootFrom(btn);
  if (!editorRoot) return;

  const meta = getEditorMetaByRoot(editorRoot);
  const html =
    pickTemplate(meta?.feature, ['entry', 'journalEntry', 'journal']) ||
    `<tr class="journal-entry-header"><td contenteditable="true">새 일지</td></tr>`; // 최소 안전 템플릿

  appendHTMLToEditor(editorRoot, html);
}
function addCategory(btn) {
  const key = resolveTargetKeyForCategory(btn); // plan or roadmap
  const editorRoot = getEditorRootByKey(key) || getNearestEditorRootFrom(btn);
  if (!editorRoot) return;

  const meta = getEditorMetaByRoot(editorRoot);
  const html =
    (key === 'plan'
      ? pickTemplate(meta?.feature, ['planCategory', 'category', 'section'])
      : pickTemplate(meta?.feature, ['roadmapCategory', 'category', 'section'])
    ) ||
    `<tr class="${key}-category category"><td contenteditable="true">새 카테고리</td></tr>`;

  appendHTMLToEditor(editorRoot, html);
}
function addStep(btn) {
  const editorRoot = getEditorRootByKey('roadmap') || getNearestEditorRootFrom(btn);
  if (!editorRoot) return;

  const meta = getEditorMetaByRoot(editorRoot);
  let html =
    pickTemplate(meta?.feature, ['roadmapItem', 'step', 'task', 'item']) ||
    cloneFallbackRow(editorRoot, { type: 'task' });

  if (!html || !html.trim()) {
    html = `<tr class="draggable-item"><td contenteditable="true">새 단계</td></tr>`;
  }
  appendHTMLToEditor(editorRoot, html);
}
function bindTopLevelAddHandlersOnce() {
  if (TOP_LEVEL_BOUND) return;
  TOP_LEVEL_BOUND = true;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, a, [role="button"], .btn, .toolbar-btn, .control-btn');
    if (!btn) return;

    // 일지항목추가
    if (isAddJournalButton(btn)) {
      e.preventDefault();
      addJournalEntry(btn);
      return;
    }
    // 카테고리추가 (plan/roadmap 자동 판별)
    if (isAddCategoryButton(btn)) {
      e.preventDefault();
      addCategory(btn);
      return;
    }
    // 단계추가 (roadmap)
    if (isAddStepButton(btn)) {
      e.preventDefault();
      addStep(btn);
      return;
    }
  }, true); // 캡처 단계
}

// -----------------------------------------------------------------------------
// 앱 시작
// -----------------------------------------------------------------------------
export async function startApp() {
  try {
    await firebase.init();
    await firebase.bootstrap();
  } catch (e) {
    console.warn('[firebase] 초기화 경고:', e);
  }

  const loginBtn  = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const whoami    = document.getElementById('whoami');

  loginBtn?.addEventListener('click', () => firebase.login());
  logoutBtn?.addEventListener('click', () => firebase.logout());

  firebase.onAuth((user) => {
    if (user) {
      const name = user.displayName || user.email || '로그인됨';
      if (whoami) whoami.textContent = name;
      loginBtn?.classList.add('hidden');
      logoutBtn?.classList.remove('hidden');
      setStatus('online', '온라인');
    } else {
      if (whoami) whoami.textContent = '';
      loginBtn?.classList.remove('hidden');
      logoutBtn?.classList.add('hidden');
      setStatus('idle', '로그인 필요');
    }
  });

  const appId = window.__app_id || 'default';
  const features = registry.items();

  // 각 에디터 초기화/구독
  Object.entries(features).forEach(([key, feature]) => {
    const editorId = `${key}-editor`;
    const editorRoot = document.getElementById(editorId);
    if (!editorRoot) return;

    if (typeof feature.initialShell === 'function') {
      editorRoot.innerHTML = feature.initialShell();
    }

    const docPath = ['apps', appId, 'docs', key];
    EDITOR_MAP.set(editorRoot, { key, feature, docPath });

    firebase.subscribe(
      docPath,
      (snap) => {
        try {
          const data = snap?.data?.();
          const html = data?.content;
          const holder = editorRoot.querySelector('tbody') || editorRoot;

          if (html && typeof html === 'string') holder.innerHTML = html;
          else if (typeof feature.defaultRows === 'function') holder.insertAdjacentHTML('beforeend', feature.defaultRows());

          if (typeof feature.initSortable === 'function') feature.initSortable(editorRoot);

          bindCommonHandlers(key, editorRoot, {
            updateNumbering: feature.updateNumbering,
            autosave: debounce(() => {
              saveEditor(editorRoot);
            }, 600),
          });

          syncAllRows(editorRoot);
          setStatus('online', '온라인 동기화됨');
        } catch (err) {
          console.error('[subscribe.onNext] 실패:', err);
          setStatus('degraded', '동기화 오류(읽기)');
        }
      },
      (err) => {
        console.error('[subscribe.onError]', err);
        try {
          const holder = editorRoot.querySelector('tbody') || editorRoot;
          if (holder && typeof feature.defaultRows === 'function') {
            holder.innerHTML = feature.defaultRows();
          }
          bindCommonHandlers(key, editorRoot, { updateNumbering: feature.updateNumbering });
        } catch (_) {}
        setStatus('offline', '오프라인 모드');
      }
    );
  });

  // 상단/사이드 툴바 "추가" 버튼 전역 바인딩 (한 번만)
  bindTopLevelAddHandlersOnce();
}

// (선택) 디버깅 편의를 위해 유틸 일부 export
export {
  bindCommonHandlers,
  syncRowUI,
  syncAllRows,
  deleteSectionRows,
  insertRowBelow,
  updateNumbering
};
