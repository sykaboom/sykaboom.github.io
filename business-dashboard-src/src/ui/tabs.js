import { registry } from '../services/registry.js';

export function renderTabs(){
  const tabsEl = document.getElementById('tabs');
  const contentsEl = document.getElementById('tab-contents');

  tabsEl.innerHTML = '';
  contentsEl.innerHTML = '';

  Object.entries(registry.items()).forEach(([key, mod], idx)=>{
    const btn = document.createElement('button');
    btn.dataset.tab = key;
    btn.className = 'tab-button whitespace-nowrap py-4 px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 font-medium text-sm';
    if(idx===0) btn.classList.add('active');
    btn.textContent = mod.title;

    const card = document.createElement('div');
    card.id = `${key}-content`;
    card.className = `tab-content ${idx===0? '':'hidden'} content-card`;
    card.innerHTML = mod.shellHTML();

    tabsEl.appendChild(btn);
    contentsEl.appendChild(card);
  });

  tabsEl.querySelectorAll('button').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      tabsEl.querySelectorAll('button').forEach(t=>t.classList.toggle('active', t===tab));
      document.querySelectorAll('.tab-content').forEach(c=> c.classList.toggle('hidden', !c.id.startsWith(`${tab.dataset.tab}-`)));
    });
  });
}
