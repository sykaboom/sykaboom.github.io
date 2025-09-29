// business-dashboard-src/src/services/editor.service.js
// 에디터 전담 모듈: 편집기 초기화, Firestore 구독, 저장/자동저장, 상태 표시
// - app.js의 비대해진 역할 중 '에디터 생명주기'를 분리
// - bindCommonHandlers / updateNumbering은 외부(다른 모듈)에서 주입받는다.

import { registry } from './registry.js';
import { firebase } from './firebase.js';
import { setStatus } from '../ui/status.js';
import { debounce } from '../utils/debounce.js';

// editorRoot -> { key, feature, docPath }
const EDITOR_MAP = new Map();

export function getEditorRootByKey(key) {
  return document.getElementById(`${key}-editor`);
}
export function getEditorMetaByRoot(root) {
  for (const [r, meta] of EDITOR_MAP) {
    if (r === root) return meta;
  }
  return null;
}

/**
 * 현재 DOM에 존재하는 feature 편집기들을 초기화하고, 실시간 구독을 건다.
 * @param {Object} deps 의존성 주입
 * @param {Function} deps.bindCommonHandlers (필수) 에디터 내부 클릭/입력 핸들러 바인딩
 * @param {Function} deps.updateNumbering (선택) 번호 갱신 함수
 */
export async function initEditors(deps = {}) {
  const { bindCommonHandlers, updateNumbering } = deps;
  if (typeof bindCommonHandlers !== 'function') {
    throw new Error('[editor.service] bindCommonHandlers 함수 주입이 필요합니다.');
  }

  try {
    await firebase.init();
    await firebase.bootstrap();
  } catch (e) {
    console.warn('[firebase] 초기화 경고:', e);
  }

  const appId = window.__app_id || 'default';
  const features = registry.items();

  Object.entries(features).forEach(([key, feature]) => {
    const editorId = `${key}-editor`;
    const editorRoot = document.getElementById(editorId);
    if (!editorRoot) return;

    // 초기 쉘 렌더
    if (typeof feature.initialShell === 'function') {
      editorRoot.innerHTML = feature.initialShell();
    }

    const docPath = ['apps', appId, 'docs', key];
    EDITOR_MAP.set(editorRoot, { key, feature, docPath });

    // 실시간 구독
    firebase.subscribe(
      docPath,
      (snap) => {
        try {
          const data = snap?.data?.();
          const html = data?.content;
          const holder = editorRoot.querySelector('tbody') || editorRoot;

          if (html && typeof html === 'string') {
            holder.innerHTML = html;
          } else if (typeof feature.defaultRows === 'function') {
            holder.insertAdjacentHTML('beforeend', feature.defaultRows());
          }

          if (typeof feature.initSortable === 'function') {
            feature.initSortable(editorRoot);
          }

          // 편집기 공통 핸들러 바인딩 + 자동저장 훅
          bindCommonHandlers(key, editorRoot, {
            updateNumbering,
            autosave: debounce(() => saveEditor(editorRoot), 600),
          });

          if (typeof updateNumbering === 'function') {
            updateNumbering(editorRoot);
          }
          setStatus('online', '연결됨');
        } catch (err) {
          console.error('[subscribe.onNext] 실패:', err);
          setStatus('degraded', '동기화 오류(일시)');
        }
      },
      (err) => {
        console.error('[subscribe.onError]', err);
        try {
          const holder = editorRoot.querySelector('tbody') || editorRoot;
          if (holder && typeof feature.defaultRows === 'function') {
            holder.innerHTML = feature.defaultRows();
          }
          bindCommonHandlers(key, editorRoot, { updateNumbering });
        } catch (_) {}
        setStatus('offline', '오프라인 모드');
      }
    );
  });
}

/**
 * 현재 editorRoot의 HTML을 추출해서 저장
 * - Firestore 경로는 initEditors 시 기록된 docPath를 사용
 */
export function saveEditor(editorRoot) {
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
