const $=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const btn=(t,f,l)=>{const b=$('button','btn',t);b.onclick=f;if(l)b.setAttribute('aria-label',l);return b};
const V=p=>new URL('../vendor/pdfjs/'+p,import.meta.url).href;

export async function viewPdf(file,view,tools){
  const pdfjs=await import('../vendor/pdfjs/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc=V('pdf.worker.min.mjs');
  const data=new Uint8Array(await file.arrayBuffer());
  let pdf;
  try{pdf=await pdfjs.getDocument({data,isEvalSupported:false,wasmUrl:V('wasm/'),cMapUrl:V('cmaps/'),cMapPacked:true,standardFontDataUrl:V('standard_fonts/'),iccUrl:V('iccs/')}).promise}
  catch(e){throw{code:e&&e.name==='PasswordException'?'pwd':'corrupt'}}
  if(!pdf.numPages){await pdf.destroy();throw{code:'empty'}}
  const n=pdf.numPages,first=await pdf.getPage(1),base=first.getViewport({scale:1});
  let zoom=1,cur=1;const pages=[],tasks=new Map(),wrap=$('div','pdfwrap'),pos=$('span','pos');
  const fit=()=>Math.max(.2,(view.clientWidth-32)/base.width)*zoom;
  const size=(el,vp)=>{el.style.width=Math.floor(vp.width)+'px';el.style.height=Math.floor(vp.height)+'px'};
  const layout=()=>{const s=fit();pages.forEach(p=>{size(p.el,{width:base.width*s,height:base.height*s});drop(p)})};
  function drop(p){const t=tasks.get(p);if(t){t.cancel();tasks.delete(p)}if(p.cv){p.cv.width=p.cv.height=0;p.cv.remove();p.cv=null}p.done=false}
  async function draw(p){
    if(p.done||tasks.has(p))return;
    try{
      const pg=await pdf.getPage(p.i),s=fit(),vp=pg.getViewport({scale:s}),r=Math.min(devicePixelRatio||1,2);
      const cv=document.createElement('canvas');cv.width=Math.floor(vp.width*r);cv.height=Math.floor(vp.height*r);
      cv.style.width=vp.width+'px';cv.style.height=vp.height+'px';
      const t=pg.render({canvasContext:cv.getContext('2d'),viewport:pg.getViewport({scale:s*r}),canvas:cv});tasks.set(p,t);
      await t.promise;tasks.delete(p);size(p.el,vp);p.el.replaceChildren(cv);p.cv=cv;p.done=true;pg.cleanup();
    }catch(e){tasks.delete(p);if(e&&e.name!=='RenderingCancelledException'){p.el.replaceChildren($('span','note','No se pudo mostrar la página '+p.i))}}
  }
  const io=new IntersectionObserver(es=>es.forEach(e=>{const p=e.target._p;e.isIntersecting?draw(p):drop(p)}),{root:view,rootMargin:'700px 0px'});
  for(let i=1;i<=n;i++){const el=$('div','pg');el.setAttribute('aria-label','Página '+i);const p={i,el,cv:null,done:false};el._p=p;pages.push(p);wrap.append(el)}
  const go=i=>{i=Math.min(n,Math.max(1,i));pages[i-1].el.scrollIntoView({block:'start'})};
  const upd=()=>{let b=1;for(const p of pages){if(p.el.offsetTop-view.offsetTop-view.scrollTop<view.clientHeight/3)b=p.i;else break}cur=b;pos.textContent=`${cur} / ${n}`};
  let raf=0;const onScroll=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(upd)};
  const setZoom=z=>{zoom=Math.min(4,Math.max(.5,z));layout();pages.forEach(p=>{io.unobserve(p.el);io.observe(p.el)});upd()};
  tools.replaceChildren(btn('‹',()=>go(cur-1),'Página anterior'),pos,btn('›',()=>go(cur+1),'Página siguiente'),btn('−',()=>setZoom(zoom/1.25),'Alejar'),btn('+',()=>setZoom(zoom*1.25),'Acercar'));
  tools.hidden=false;view.classList.add('pdfview');view.append(wrap);view.addEventListener('scroll',onScroll);
  layout();pages.forEach(p=>io.observe(p.el));upd();
  return async()=>{io.disconnect();view.removeEventListener('scroll',onScroll);pages.forEach(drop);view.classList.remove('pdfview');await pdf.destroy()};
}
