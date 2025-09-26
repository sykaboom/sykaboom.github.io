export const registry = (()=>{
  const _mods = {};
  return {
    register(key, mod){ _mods[key]=mod; },
    items(){ return _mods; }
  };
})();
