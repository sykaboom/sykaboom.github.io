export const icons = {
  lock: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd"/></svg>`,
  del:  `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd"/></svg>`
};
export const manageControls = `<div class="flex justify-end items-center space-x-1 h-full"><button class="control-btn lock-btn">${icons.lock}</button><button class="control-btn delete-btn">${icons.del}</button></div>`;

export function addButtons(id, label){
  return `<div class="mt-4 flex justify-center"><button id="${id}" class="add-row-btn"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>${label}</button></div>`;
}

export function updateNumbering(editor){
  const cats = editor.querySelectorAll('.plan-category > td:first-child .category-title, .roadmap-category > td:first-child .category-title');
  cats.forEach((c,i)=>{
    const rest = c.textContent.split('.').slice(1).join('.').trim() || c.textContent;
    c.textContent = `${i+1}. ${rest}`;
  });
}
