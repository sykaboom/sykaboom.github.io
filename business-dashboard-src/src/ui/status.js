export function setStatus(status, text){
  const dot = document.getElementById('status-dot');
  const label = document.getElementById('status-text');
  dot.className = 'w-3 h-3 rounded-full';
  const map = { c:'bg-green-500', e:'bg-red-500', d:'bg-yellow-400 animate-pulse' };
  dot.classList.add(map[status[0]]||map.d);
  label.textContent = text;
}
