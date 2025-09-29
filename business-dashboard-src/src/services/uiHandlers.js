// business-dashboard-src/src/services/uiHandlers.js
// UI 이벤트 바인딩 모듈 (템플릿 연동 보강판)
// - 기존 기본 행 삽입만 하던 로직을 registry 기반 feature.templates()로 확장
// - app.js의 원래 동작과 동일하게, 각 feature의 템플릿을 활용

import {
  isCategoryRow,
  isJournalHeaderRow,
  normalize,
  getEditorRootByKey,
  getNearestEditorRootFrom,
  pickTemplate,
  syncRowUI,
  syncAllRows,
  deleteSectionRows,
  findTemplateRowForSection,
  insertRowBelow,
  cloneFallbackRow,
  appendHTMLToEditor,
  updateNumbering
} from './editorRow.utils.js';

import { saveEditor } from './editor.service.js';
import { registry } from './registry.js';

/**
 * 편집기 공통 이벤트/행동을 한 번만 바인딩한다.
 */
export function bindCommonHandlers(docKey, editorEl, feature = {}) {
  if (!editorEl) return;
  const BIND_KEY = Symbol.for('bindCommonHandlers');
  if (editorEl[BIND_KEY]) return;
  editorEl[BIND_KEY] = true;

  const doSave = () => {
    if (typeof feature.autosave === 'function') feature.autosave();
    else saveEditor(editorEl);
  };

  syncAllRows(editorEl);

  editorEl.addEventListener('input', () => doSave());

  editorEl.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('button, a, [role="button"], .control-btn, .lock-btn, .delete-btn, .add-plan-item, .add-roadmap-item, .add-subitem-btn, .add-task-btn');
      if (!btn || !editorEl.contains(btn)) return;

      const row = btn.closest('tr');
      let didMutate = false;

      if (btn.classList.contains('lock-btn') && row) {
        const nowLocked = row.dataset.locked === '1' ? false : true;
        row.dataset.locked = nowLocked ? '1' : '0';
        syncRowUI(row);
        didMutate = true;
      }

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
        if (btn.dataset.busy === '1') return;
        btn.dataset.busy = '1';
        setTimeout(() => { btn.dataset.busy = '0'; }, 120);

        const type =
          btn.classList.contains('add-roadmap-item') ||
          btn.classList.contains('add-task-btn') ||
          /과업\s*추가/.test(btn.textContent || '')
            ? 'task'
            : 'subitem';

        const baseRow =
          (isCategoryRow(row) || isJournalHeaderRow(row))
            ? findTemplateRowForSection(row)
            : row;

        insertRowBelow(baseRow, { type });
        didMutate = true;
      }

      if (btn.classList.contains('delete-btn') && row) {
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
        } catch (_) {}
        doSave();
      }
    },
    true
  );
}

let TOP_LEVEL_BOUND = false;
export function bindTopLevelAddHandlersOnce() {
  if (TOP_LEVEL_BOUND) return;
  TOP_LEVEL_BOUND = true;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, a, [role="button"], .btn, .toolbar-btn, .control-btn');
    if (!btn) return;

    if (isAddJournalButton(btn)) {
      e.preventDefault();
      addJournalEntry(btn);
      return;
    }
    if (isAddCategoryButton(btn)) {
      e.preventDefault();
      addCategory(btn);
      return;
    }
    if (isAddStepButton(btn)) {
      e.preventDefault();
      addStep(btn);
      return;
    }
  }, true);
}

function isAddJournalButton(btn) {
  const idc  = (btn.id || '') + ' ' + (btn.className || '');
  const data = (btn.dataset?.action || '') + ' ' + (btn.dataset?.add || '');
  const txt  = normalize(btn.textContent);
  return (
    /add[-_]journal/.test(idc + ' ' + data) ||
    txt.includes('일지추가') ||
    txt.includes('일지추가하기') ||
    btn.getAttribute('aria-label')?.includes('일지') ||
    btn.id === 'add-journal-entry'
  );
}
function isAddCategoryButton(btn) {
  const idc  = (btn.id || '') + ' ' + (btn.className || '');
  const data = (btn.dataset?.action || '') + ' ' + (btn.dataset?.add || '');
  const txt  = normalize(btn.textContent);
  return (
    /add[-_](plan[-_]?)?category/.test(idc + ' ' + data) ||
    /add[-_]category/.test(idc + ' ' + data) ||
    txt.includes('카테고리추가') ||
    btn.id === 'add-plan-category' ||
    btn.id === 'add-roadmap-category'
  );
}
function isAddStepButton(btn) {
  const idc  = (btn.id || '') + ' ' + (btn.className || '');
  const data = (btn.dataset?.action || '') + ' ' + (btn.dataset?.add || '');
  const txt  = normalize(btn.textContent);
  return (
    /add[-_]step|add[-_]stage|add[-_]roadmap[-_]item/.test(idc + ' ' + data) ||
    txt.includes('단계추가') ||
    btn.id === 'add-roadmap-step'
  );
}

function addJournalEntry(btn) {
  const editorRoot = getEditorRootByKey('journal') || getNearestEditorRootFrom(btn);
  if (!editorRoot) return;

  const holder = editorRoot.querySelector('tbody') || editorRoot;
  const feature = getFeatureByRoot(editorRoot, 'journal');
  const html =
    pickTemplate(feature, ['entry', 'journalEntry', 'journal']) ||
    `<tr class="journal-entry-header"><td contenteditable="true">새 일지</td></tr>`;
  appendHTMLToEditor(editorRoot, html);
  saveEditor(editorRoot);
}

function addCategory(btn) {
  const key = resolveTargetKeyForCategory(btn);
  const editorRoot = getEditorRootByKey(key) || getNearestEditorRootFrom(btn);
  if (!editorRoot) return;

  const feature = getFeatureByRoot(editorRoot, key);
  const html =
    (key === 'plan'
      ? pickTemplate(feature, ['planCategory', 'category', 'section'])
      : pickTemplate(feature, ['roadmapCategory', 'category', 'section'])) ||
    `<tr class="${key}-category category"><td contenteditable="true">새 카테고리</td></tr>`;

  appendHTMLToEditor(editorRoot, html);
  saveEditor(editorRoot);
}

function addStep(btn) {
  const editorRoot = getEditorRootByKey('roadmap') || getNearestEditorRootFrom(btn);
  if (!editorRoot) return;

  const feature = getFeatureByRoot(editorRoot, 'roadmap');
  let html =
    pickTemplate(feature, ['roadmapItem', 'step', 'task', 'item']) ||
    cloneFallbackRow(editorRoot, { type: 'task' });

  if (!html || !html.trim()) {
    html = `<tr class="draggable-item"><td contenteditable="true">새 단계</td></tr>`;
  }
  appendHTMLToEditor(editorRoot, html);
  saveEditor(editorRoot);
}

// registry를 활용해 feature 객체 찾기
function getFeatureByRoot(editorRoot, keyGuess) {
  const features = registry.items ? registry.items() : {};
  if (keyGuess && features[keyGuess]) return features[keyGuess];
  // id 기반 추정
  if (editorRoot.id && editorRoot.id.includes('journal')) return features['journal'];
  if (editorRoot.id && editorRoot.id.includes('plan')) return features['plan'];
  if (editorRoot.id && editorRoot.id.includes('roadmap')) return features['roadmap'];
  return {};
}

function resolveTargetKeyForCategory(btn) {
  const idc  = (btn.id || '') + ' ' + (btn.className || '');
  const data = (btn.dataset?.target || '') + ' ' + (btn.dataset?.for || '') + ' ' + (btn.dataset?.action || '');
  const txt  = (btn.textContent || '');
  if (/roadmap/i.test(idc + ' ' + data + ' ' + txt)) return 'roadmap';
  if (/plan/i.test(idc + ' ' + data + ' ' + txt)) return 'plan';

  const nearRoot = getNearestEditorRootFrom(btn);
  if (nearRoot && nearRoot.id === 'roadmap-editor') return 'roadmap';
  if (nearRoot && nearRoot.id === 'plan-editor') return 'plan';

  const roadmapVisible = getEditorRootByKey('roadmap');
  if (roadmapVisible && roadmapVisible.offsetParent !== null) return 'roadmap';
  const planVisible = getEditorRootByKey('plan');
  if (planVisible && planVisible.offsetParent !== null) return 'plan';
  return 'plan';
}
