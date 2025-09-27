/* =============================================================================
 * business-dashboard — src/services/app.js (ESM)
 *
 * 🔧 긴급 복구 + UI 개선패치 2
 * - ESM 모듈로 전환하고 startApp()을 내보냅니다(기존 main.js의 import 호환).
 * - 잠금(자물쇠)은 "삭제 방지" 전용: 내용은 항상 보이고 언제든 수정 가능.
 * - 카테고리 삭제 시 하위 묶음 동시 삭제 유지.
 * - "소항목/과업 추가"는 1회 클릭 = 정확히 1행만 생성. (중복 바인딩/버블 방지)
 * - 최신 템플릿(class: add-sub-item-btn, add-plan-item, add-roadmap-item)과 선택자 호환.
 * =============================================================================*/
import { registry } from './registry.js';
import { firebase } from './firebase.js';
import { setStatus } from '../ui/status.js';
import { debounce } from '../utils/debounce.js';

// 컨테이너 중복 바인딩 방지용 심볼
const BIND_KEY = Symbol('bindCommonHandlers');

// ---- 유틸: 행 타입 판별 ---------------------------------------------------
function isCategoryRow(row) {
  if (!row) return false;
  const cls = row.className || '';
  return /(^|\s)category(\s|$)/.test(cls) || /category/.test(cls);
}
function isJournalHeaderRow(row) {
  if (!row) return false;
  return row.classList.contains('journal-entry-header');
}

// ---- UI 상태 동기화 -------------------------------------------------------
function syncRowUI(row) {
  if (!row) return;
  const locked = row.dataset.locked === '1';
  const lockBtn = row.querySelector('.lock-btn');
  const delBtn  = row.querySelector('.delete-btn');

  if (lockBtn) lockBtn.classList.toggle('unlocked', !locked);
  if (delBtn) {
    delBtn.classList.toggle('unlocked', !locked);
    delBtn.setAttribute('aria-disabled', locked ? 'true' : 'false');
    // 삭제 금지: 시각/행동 일치
    if (locked) {
      delBtn.style.pointerEvents = 'none';
      delBtn.style.opacity = '0.35';
    } else {
      delBtn.style.pointerEvents = '';
      delBtn.style.opacity = '';
    }
  }

  // 🔒 잠금은 "삭제 방지" 전용 → 내용은 항상 보이고 언제나 수정 가능
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

// ---- 섹션(카테고리/일지 헤더) 삭제: 하위 묶음 동시 제거 --------------------
function deleteSectionRows(startRow) {
  if (!startRow) return;
  let cur = startRow.nextElementSibling;
  const isCat = isCategoryRow(startRow);
  const isHdr = isJournalHeaderRow(startRow);

  // 기준 행 먼저 삭제
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

// ---- 섹션 내 "템플릿 행" 탐색 ---------------------------------------------
function findTemplateRowForSection(categoryRow) {
  // 카테고리/헤더 다음에 오는 첫 번째 일반 행을 템플릿로 사용
  let cur = categoryRow?.nextElementSibling;
  while (cur && !isCategoryRow(cur) && !isJournalHeaderRow(cur)) {
    if (cur.classList.contains('draggable-item') || cur.tagName === 'TR') return cur;
    cur = cur.nextElementSibling;
  }
  // 없으면 카테고리 행 자체를 쓰되, 아래 cleanClonedRow에서 일반 항목으로 강등
  return categoryRow || null;
}

// ---- 행 복제/삽입 (소항목·과업 추가용, 1회 클릭 = 1행 생성) ---------------
function cleanClonedRow(clone, { type } = {}) {
  // 삭제 가능 상태로 초기화
  clone.dataset.locked = '0';

  // 카테고리/일지 헤더에서 "소항목/과업 추가" 시에는 일반 아이템으로 강등
  if (type === 'subitem' || type === 'task') {
    clone.classList.remove('journal-entry-header');
    // className에서 category 토큰 제거
    clone.className = clone.className
      .split(/\s+/)
      .filter((cls) => cls && !/category/.test(cls))
      .join(' ') || 'draggable-item';
  }

  // 내용 초기화
  clone.querySelectorAll('[contenteditable]').forEach((el) => {
    el.innerHTML = '';
    el.setAttribute('contenteditable', 'true');
  });
  clone.querySelectorAll('input, textarea, select').forEach((el) => {
    if (el.tagName === 'SELECT') {
      el.selectedIndex = 0;
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
    } else {
      el.value = '';
    }
    // ID/NAME 중복 방지
    el.removeAttribute('id');
    el.removeAttribute('name');
  });

  // 행 id 및 내부 data-id 정리
  if (clone.id) clone.id = '';
  clone.querySelectorAll('[data-id]').forEach((el) => el.removeAttribute('data-id'));

  // 템플릿 행 내부에 "+ 소항목 추가 / + 과업 추가" 버튼이 있었다면 제거
  clone.querySelectorAll('.add-sub-item-btn, .add-plan-item, .add-roadmap-item, .add-subitem-btn, .add-task-btn').forEach(b => b.remove());

  // 시각 상태 반영
  syncRowUI(clone);
  return clone;
}

function insertRowBelow(row, { type } = {}) {
  const newRow = row.cloneNode(true);
  cleanClonedRow(newRow, { type });
  row.parentNode.insertBefore(newRow, row.nextElementSibling);
  return newRow;
}

// ---- 번호 재정렬(선택사항) -------------------------------------------------
function updateNumbering(editorEl) {
  let n = 1;
  editorEl.querySelectorAll('tr').forEach((tr) => {
    if (isCategoryRow(tr) || isJournalHeaderRow(tr)) return;
    const numCell = tr.querySelector('.number, .number-cell, [data-number]');
    if (numCell) numCell.textContent = String(n++);
  });
}

// ---- 공통 핸들러 바인딩 (중복 바인딩 방지) ---------------------------------
function bindCommonHandlers(docId, editorEl, feature) {
  if (!editorEl) return;
  // 같은 컨테이너에 1회만 바인딩
  if (editorEl[BIND_KEY]) return;
  editorEl[BIND_KEY] = true;

  // 초기 동기화
  syncAllRows(editorEl);

  editorEl.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('button, [role="button"], .control-btn, .lock-btn, .delete-btn');
      if (!btn || !editorEl.contains(btn)) return;

      const row = btn.closest('tr');
      if (!row) return;

      let didMutate = false;

      // 1) 잠금 토글 (삭제 방지 전용)
      if (btn.classList.contains('lock-btn')) {
        const nowLocked = row.dataset.locked === '1' ? false : true;
        row.dataset.locked = nowLocked ? '1' : '0';
        // 내용 편집/표시 상태는 건드리지 않음
        syncRowUI(row);
        didMutate = true;
      }

      // 2) 소항목/과업 추가 (1회 클릭 = 1행)
      const isAddBtn =
        btn.classList.contains('add-subitem-btn') ||         // 구버전
        btn.classList.contains('add-sub-item-btn') ||        // 최신 템플릿
        btn.classList.contains('add-task-btn')   ||          // 구버전
        btn.classList.contains('add-plan-item')  ||          // 최신 템플릿(계획)
        btn.classList.contains('add-roadmap-item') ||        // 최신 템플릿(로드맵)
        btn.dataset.action === 'add-subitem' || btn.dataset.action === 'add-task' ||
        /소항목\s*추가|과업\s*추가/.test(btn.textContent || '');

      if (isAddBtn) {
        e.preventDefault();
        e.stopPropagation();

        // 버튼 단위 busy 가드로 다중 생성 방지
        if (btn.dataset.busy === '1') return;
        btn.dataset.busy = '1';
        setTimeout(() => {
          btn.dataset.busy = '0';
        }, 120); // 짧은 타임박스

        const type =
          btn.classList.contains('add-roadmap-item') ||
          btn.classList.contains('add-task-btn') ||
          /과업\s*추가/.test(btn.textContent || '')
            ? 'task'
            : 'subitem';

        // 카테고리/헤더에서 눌렀다면 섹션 내 첫 일반 행을 템플릿로 사용
        const templateRow = (isCategoryRow(row) || isJournalHeaderRow(row))
          ? findTemplateRowForSection(row)
          : row;

        const newRow = insertRowBelow(templateRow, { type });
        didMutate = true;

        // UX: 새 행의 첫 편집 가능한 셀에 포커스
        const firstEditable = newRow.querySelector('[contenteditable], input, textarea, select');
        if (firstEditable) {
          if (
            firstEditable.getAttribute('contenteditable') &&
            firstEditable.getAttribute('contenteditable') !== 'false'
          ) {
            const range = document.createRange();
            range.selectNodeContents(firstEditable);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            firstEditable.focus();
          } else {
            firstEditable.focus();
          }
        }
      }

      // 3) 삭제 (섹션 헤더면 하위 묶음 포함)
      if (btn.classList.contains('delete-btn')) {
        e.preventDefault();
        // 잠금 상태면 삭제 불가
        if (row.dataset.locked === '1') return;

        if (isCategoryRow(row) || isJournalHeaderRow(row)) {
          deleteSectionRows(row);
        } else {
          row.remove();
        }
        didMutate = true;
      }

      if (didMutate) {
        // 내장 번호 갱신
        updateNumbering(editorEl);
        // 외부 훅
        try {
          if (typeof feature?.updateNumbering === 'function') feature.updateNumbering(editorEl);
          if (typeof feature?.onChange === 'function') feature.onChange();
          if (typeof feature?.autosave === 'function') feature.autosave();
        } catch (_) {}
      }
    },
    true // 캡처 단계에서 한 번만 처리 → 버블링 중복 처리 예방
  );
}

// ---- 앱 시작: 탭 렌더 후 각 에디터 초기화 + 동기화 -------------------------
export async function startApp() {
  // Firebase 준비 및 로그인 상태 표시
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

  Object.entries(features).forEach(([key, feature]) => {
    const editorId = `${key}-editor`;
    const editorRoot = document.getElementById(editorId);
    if (!editorRoot) return;

    // 테이블/스켈레톤 생성
    if (typeof feature.initialShell === 'function') {
      editorRoot.innerHTML = feature.initialShell();
    }

    // 구독 → 서버(파이어스토어) ↔ 로컬 동기화
    const docPath = ['apps', appId, 'docs', key];
    let hydrated = false; // 최초 수신 여부

    firebase.subscribe(
      docPath,
      (snap) => {
        try {
          const data = snap?.data?.();
          const html = data?.content;
          const tbody = editorRoot.querySelector('tbody') || editorRoot;

          if (html && typeof html === 'string') {
            tbody.innerHTML = html;
            hydrated = true;
          } else if (!hydrated && typeof feature.defaultRows === 'function') {
            // 서버에 내용이 없을 때 최초 1회 기본 행 주입
            tbody.insertAdjacentHTML('beforeend', feature.defaultRows());
            hydrated = true;
          }

          // 드래그 정렬 활성화
          if (typeof feature.initSortable === 'function') {
            feature.initSortable(editorRoot);
          }

          // 공통 핸들러 바인딩 (1회)
          bindCommonHandlers(key, editorRoot, {
            updateNumbering: feature.updateNumbering,
            // 자동 저장(디바운스)
            autosave: debounce(() => {
              const content = (editorRoot.querySelector('tbody') || editorRoot).innerHTML;
              firebase.save(docPath, content);
            }, 800),
          });

          // 추가 버튼(카테고리/일지 항목) 바인딩
          const addBtnIdMap = {
            plan: 'add-plan-category',
            roadmap: 'add-roadmap-category',
            journal: 'add-journal-entry',
          };
          const addBtn = document.getElementById(addBtnIdMap[key]);
          if (addBtn && !addBtn.dataset.bound) {
            addBtn.dataset.bound = '1';
            addBtn.addEventListener('click', (e) => {
              e.preventDefault();
              const tpls = typeof feature.templates === 'function' ? feature.templates() : {};
              let html = '';
              if (key === 'plan') html = tpls.planCategory || '';
              else if (key === 'roadmap') html = tpls.roadmapCategory || '';
              else if (key === 'journal') html = tpls.entry || '';

              const tbody2 = editorRoot.querySelector('tbody') || editorRoot;
              if (html) {
                tbody2.insertAdjacentHTML('beforeend', html);
                try { if (typeof feature.updateNumbering === 'function') feature.updateNumbering(editorRoot); } catch(_) {}
                const content = tbody2.innerHTML;
                firebase.save(docPath, content);
              }
            });
          }

          // 시각 상태 동기화
          syncAllRows(editorRoot);
          setStatus('online', '온라인 동기화됨');
        } catch (err) {
          console.error('[subscribe.onNext] 실패:', err);
          setStatus('degraded', '동기화 오류(읽기)');
        }
      },
      (err) => {
        console.error('[subscribe.onError]', err);
        // 서버 오류 시에도 로컬 기본 행을 보여줌
        try {
          const tbody = editorRoot.querySelector('tbody') || editorRoot;
          if (tbody && typeof feature.defaultRows === 'function') {
            tbody.innerHTML = feature.defaultRows();
          }
          bindCommonHandlers(key, editorRoot, { updateNumbering: feature.updateNumbering });
        } catch (_) {}
        setStatus('offline', '오프라인 모드');
      }
    );
  });
}

// ---- 유틸 공개(디버그용) ---------------------------------------------------
export { bindCommonHandlers, syncRowUI, syncAllRows, deleteSectionRows, insertRowBelow, updateNumbering };
