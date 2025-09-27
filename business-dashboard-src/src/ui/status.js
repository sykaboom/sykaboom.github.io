// src/ui/status.js (교체본)
// - 공백이 포함된 클래스 문자열을 안전하게 처리
// - 상태 점(좌측 초록/노랑/빨강) 스타일 일괄 관리

export function setStatus(kind = 'idle', text = '') {
  const dot  = document.getElementById('status-dot');
  const desc = document.getElementById('status-text');

  if (desc) desc.textContent = text;

  if (!dot) return;

  const base = ['inline-block', 'w-2.5', 'h-2.5', 'rounded-full'];
  const map = {
    idle:       ['bg-slate-300'],
    connecting: ['bg-yellow-400', 'animate-pulse'],
    connected:  ['bg-emerald-500'],
    error:      ['bg-rose-500']
  };

  const next = map[kind] || map.idle;

  // classList에 공백 들어간 문자열이 넘어와도 안전하게 처리하도록 유틸 사용
  function addTokens(el, tokens) {
    const arr = Array.isArray(tokens)
      ? tokens
      : String(tokens).trim().split(/\s+/);
    arr.forEach(t => t && el.classList.add(t));
  }

  // 기존 상태 클래스 전부 제거
  dot.className = '';
  addTokens(dot, base);
  addTokens(dot, next);
}
