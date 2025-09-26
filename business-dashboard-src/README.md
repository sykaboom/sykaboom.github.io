# 사업 관리 대시보드 (src 리팩토링 버전)
- 탭별 모듈 분리: src/features/{journal,roadmap,plan}.js
- 확장성: src/services/registry.js 에 탭 모듈 등록만 하면 자동 렌더링
- 빌드 불필요: ES Modules로 바로 실행 (정적 호스팅/파일서버)

## 실행
1) index.html 열기 (또는 간단한 로컬 서버 사용 권장: `python -m http.server`)
2) Firebase 설정이 있다면 window.__firebase_config, window.__initial_auth_token, window.__app_id 를 전역에 주입 가능.

## 새 탭 추가 가이드
1) src/features/mytab.js 파일 생성:
   - export const title = '탭 표시명';
   - export function shellHTML() { return `<div id="mytab-editor">...</div>...`; }
   - export function initialShell() { return `<table>...</table>`; }
   - export function defaultRows() { return `...기본 행...`; }
   - export function templates() { return { ...필요한 템플릿... }; }
   - export function initSortable(editor) { ...필요 시 Sortable 초기화... }
2) src/main.js 에서 `import * as mytab from './features/mytab.js'` 후 `registry.register('mytab', mytab);`

## 주요 설계 포인트
- 자동 저장/로드: Firestore 경로 artifacts/{appId}/public/data/businessDocs/{docId}
- 상태 표시: 상단 우측 점/텍스트
- 컨트롤: 자물쇠(열림 연한 회색), 삭제(잠금 해제 후 가능)
- 테이블 가독성: keep-all, colgroup, roadmap 스크롤
