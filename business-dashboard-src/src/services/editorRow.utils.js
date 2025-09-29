// business-dashboard-src/src/services/editorRow.utils.js
// 편집기 '행' 관련 저수준 유틸 모듈
// - DOM 기반 행 조작(복제/삭제/정리/번호 갱신)
// - 템플릿 선택, 가장 가까운 에디터 탐색
// - 다른 서비스에서 import 하여 사용
// - 저장(save)은 상위 계층(uiHandlers/editor.service)에서 호출하도록 분리

// ------------------------------
// 식별/탐색 유틸
// ------------------------------
export function isCategoryRow(row) {
  if (!row) return false;
  const cls = row.className || '';
  return /(^|\\s)category(\\s|$)/.test(cls) || /category/.test(cls);
}
export function isJournalHeaderRow(row) {
  if (!row) return false;
  return row.classList.contains('journal-entry-header');
}
export function normalize(s) {
  return (s || '').replace(/\\s+/g, '').toLowerCase();
}
export function getEditorRootByKey(key) {
  return document.getElementById(`${key}-editor`);
}
export function getNearestEditorRootFrom(el) {
  // 현재 el을 포함하는 editorRoot 중 가장 안쪽 것을 찾는다.
  const editors = ['plan', 'roadmap', 'journal'].map(getEditorRootByKey).filter(Boolean);
  let nearest = null;
  for (const root of editors) {
    if (root.contains(el)) {
      if (!nearest || nearest.contains(root)) nearest = root;
    }
  }
  // 없으면 현재 화면에서 보이는 루트를 우선 반환
  if (!nearest) {
    nearest = editors.find((r) => r.offsetParent !== null) || editors[0] || null;
  }
  return nearest;
}

// ------------------------------
// 템플릿 선택
// ------------------------------
export function pickTemplate(feature, keys = []) {
  const tpls = typeof feature?.templates === 'function' ? feature.templates() : {};
  for (const k of keys) {
    if (tpls && typeof tpls[k] === 'string' && tpls[k].trim()) return tpls[k];
  }
  // <template id="..."> 혹은 data-tpl
  for (const k of keys) {
    const t = document.getElementById(`${k}-template`) || document.querySelector(`template[data-tpl="${k}"]`);
    if (t && t.content) return t.innerHTML || t.content.firstElementChild?.outerHTML || '';
  }
  return '';
}

// ------------------------------
// 행 상태/번호 동기화
// ------------------------------
export function syncRowUI(row) {
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

  // 잠금=삭제 방지 전용 → 내용은 항상 보이고 수정 가능
  row.querySelectorAll('[contenteditable]').forEach((el) => {
    el.setAttribute('contenteditable', 'true');
    el.removeAttribute('aria-hidden');
    el.style.visibility = '';
    el.style.opacity = '';
  });
}

export function syncAllRows(editorEl) {
  editorEl.querySelectorAll('tr').forEach(syncRowUI);
}

export function updateNumbering(editorEl) {
  let n = 1;
  editorEl.querySelectorAll('tr').forEach((tr) => {
    if (isCategoryRow(tr) || isJournalHeaderRow(tr)) return;
    const numCell = tr.querySelector('.number, .number-cell, [data-number]');
    if (numCell) numCell.textContent = String(n++);
  });
}

// ------------------------------
// 삭제/범위 탐색
// ------------------------------
export function deleteSectionRows(startRow) {
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
export function findTemplateRowForSection(sectionRow) {
  let cur = sectionRow?.nextElementSibling;
  while (cur && !isCategoryRow(cur) && !isJournalHeaderRow(cur)) {
    if (cur.classList.contains('draggable-item') || cur.tagName === 'TR') return cur;
    cur = cur.nextElementSibling;
  }
  return sectionRow || null;
}

// ------------------------------
// 복제/삽입
// ------------------------------
export function cleanClonedRow(clone, { type } = {}) {
  clone.dataset.locked = '0';

  if (type === 'subitem' || type === 'task') {
    clone.classList.remove('journal-entry-header');
    clone.className = clone.className
      .split(/\\s+/)
      .filter((cls) => cls && !/category/.test(cls))
      .join(' ') || 'draggable-item';
  }

  // 텍스트/입력 초기화
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

  // 템플릿 행 내부의 "추가" 버튼 유물 제거
  clone.querySelectorAll('.add-sub-item-btn, .add-plan-item, .add-roadmap-item, .add-subitem-btn, .add-task-btn')
    .forEach((b) => b.remove());

  syncRowUI(clone);
  return clone;
}

export function insertRowBelow(row, { type } = {}) {
  const newRow = row.cloneNode(true);
  cleanClonedRow(newRow, { type });
  row.parentNode.insertBefore(newRow, row.nextElementSibling);
  return newRow;
}

export function cloneFallbackRow(editorRoot, opts = {}) {
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

// 저장 호출은 상위에서 수행하도록 분리
export function appendHTMLToEditor(editorRoot, html) {
  if (!editorRoot || !html) return false;
  const holder = editorRoot.querySelector('tbody') || editorRoot;
  holder.insertAdjacentHTML('beforeend', html);
  updateNumbering(editorRoot);
  syncAllRows(editorRoot);
  return true;
}
