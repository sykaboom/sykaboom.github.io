// business-dashboard-src/src/ui/conflict.js
// 아주 단순한 충돌 배너 UI
// - 화면 상단에 고정 배너를 띄워서 두 가지 선택을 제공한다.
//   1) 내 변경 덮어쓰기 (overwrite)
//   2) 새로고침(서버 버전 보기)

export function showConflictBanner({ onOverwrite, onRefresh } = {}){
  let bar = document.getElementById('conflict-banner');
  if (bar) return; // 이미 떠있으면 중복 방지

  bar = document.createElement('div');
  bar.id = 'conflict-banner';
  bar.style.position = 'fixed';
  bar.style.top = '0';
  bar.style.left = '0';
  bar.style.right = '0';
  bar.style.zIndex = '1000';
  bar.style.background = '#fff3cd';
  bar.style.borderBottom = '1px solid #facc15';
  bar.style.padding = '10px 16px';
  bar.style.display = 'flex';
  bar.style.alignItems = 'center';
  bar.style.justifyContent = 'space-between';
  bar.style.fontSize = '14px';

  const msg = document.createElement('div');
  msg.textContent = '다른 사람이 이 문서를 먼저 저장했습니다. 충돌이 감지되었습니다.';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';

  const overBtn = document.createElement('button');
  overBtn.textContent = '내 변경 덮어쓰기';
  overBtn.style.padding = '6px 10px';
  overBtn.style.borderRadius = '6px';
  overBtn.style.background = '#ef4444';
  overBtn.style.color = '#fff';
  overBtn.onclick = ()=>{
    bar.remove();
    onOverwrite && onOverwrite();
  };

  const refreshBtn = document.createElement('button');
  refreshBtn.textContent = '새로고침';
  refreshBtn.style.padding = '6px 10px';
  refreshBtn.style.borderRadius = '6px';
  refreshBtn.style.background = '#e5e7eb';
  refreshBtn.onclick = ()=>{
    bar.remove();
    onRefresh && onRefresh();
  };

  actions.appendChild(overBtn);
  actions.appendChild(refreshBtn);
  bar.appendChild(msg);
  bar.appendChild(actions);
  document.body.appendChild(bar);
}
