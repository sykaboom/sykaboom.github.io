export const debounce = (fn, delay)=>{
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(null,args), delay); };
};
