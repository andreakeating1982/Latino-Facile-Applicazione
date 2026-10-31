/** Solo test: impedisce fetch esterne nel processo avviato dallo smoke test.
 * Non è importato dal server distribuito e non modifica il comportamento dell'app.
 */
const originalFetch=globalThis.fetch;
globalThis.fetch=(input,options)=>{
  const raw=typeof input==='string'||input instanceof URL?input:input.url;
  const url=new URL(raw);
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) {
    return Promise.reject(new Error('Richiesta esterna disabilitata nello smoke isolato: '+url.hostname));
  }
  return originalFetch(input,options);
};
