import{unzip}from'./zip.js';
const $=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const xml=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw new Error('xml');return d};
const kids=(n,ns,name)=>[...n.children].filter(c=>c.localName===name);
const all=(n,name)=>[...n.getElementsByTagNameNS('*',name)];
const btn=(t,f,on)=>{const b=$('button','btn'+(on?' on':''),t);b.onclick=f;return b};
export const MAX_ROWS=1000,MAX_COLS=60;

export async function viewTxt(file,view,tools){
  const t=await file.text();
  if(!t.trim())throw{code:'empty'};
  view.append($('div','txt',t));
}

export async function viewHtml(file,view,tools,toast){
  const src=await file.text();
  if(!src.trim())throw{code:'empty'};
  let mode='code',scripts=false;
  const draw=()=>{
    tools.replaceChildren();view.replaceChildren();view.classList.toggle('frame',mode==='prev');
    tools.append(btn('Código',()=>{mode='code';draw()},mode==='code'),btn('Vista previa',()=>{mode='prev';draw()},mode==='prev'));
    if(mode==='code'){
      const pre=$('pre',null,src),wrap=btn('Ajustar línea',()=>{pre.classList.toggle('wrap');wrap.classList.toggle('on')});
      tools.append(wrap,btn('Copiar todo',async()=>{
        try{await navigator.clipboard.writeText(src);toast('Copiado')}
        catch{const r=document.createRange();r.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(r);
          toast(document.execCommand&&document.execCommand('copy')?'Copiado':'Seleccionado: copia manualmente')}
      }));
      view.append(pre);
    }else{
      tools.append(btn(scripts?'Scripts: sí':'Scripts: no',()=>{
        if(!scripts&&!confirm('Los scripts del documento se ejecutarán aislados de la app. ¿Permitir?'))return;
        scripts=!scripts;draw()},scripts));
      const f=document.createElement('iframe');
      f.setAttribute('sandbox',scripts?'allow-scripts':'');
      const csp=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:;${scripts?" script-src 'unsafe-inline';":''}">`;
      f.srcdoc=csp+src;f.title='Vista previa HTML';view.append(f);
    }
  };
  draw();tools.hidden=false;
}

export async function viewDocx(file,view){
  const z=await unzip(await file.arrayBuffer()),x=await z.read('word/document.xml');
  if(!x)throw{code:'corrupt'};
  const body=all(xml(x),'body')[0],doc=$('div','doc');let list=null;
  const runs=p=>{const s=$('span');for(const r of all(p,'r').filter(r=>r.parentNode.localName!=='del')){
    const t=all(r,'t').map(e=>e.textContent).join('')||(all(r,'tab').length?'\t':'');
    if(!t)continue;let n=document.createTextNode(t);
    if(all(r,'b').length){const b=$('b');b.append(n);n=b}if(all(r,'i').length){const i=$('i');i.append(n);n=i}s.append(n)}return s};
  const para=p=>{
    const st=(all(p,'pStyle')[0]?.getAttribute('w:val')||'').toLowerCase(),m=st.match(/^(heading|ttulo|title)\s*(\d)?/);
    if(all(p,'numPr').length){if(!list){list=$('ul');doc.append(list)}const li=$('li');li.append(runs(p));list.append(li);return}
    list=null;const e=$(m?'h'+Math.min(+m[2]||1,3):'p');e.append(runs(p));doc.append(e)};
  for(const c of body.children){
    if(c.localName==='p')para(c);
    else if(c.localName==='tbl'){list=null;const t=$('table');
      for(const r of kids(c,0,'tr')){const tr=$('tr');for(const tc of kids(r,0,'tc')){const td=$('td',null,all(tc,'p').map(p=>p.textContent).join('\n'));td.style.whiteSpace='pre-wrap';tr.append(td)}t.append(tr)}
      const w=$('div','scroll');w.append(t);doc.append(w)}
  }
  if(!doc.textContent.trim()&&!doc.querySelector('table'))throw{code:'empty'};
  view.append(doc);
}

const colIdx=r=>{let n=0;for(const ch of r.replace(/\d/g,''))n=n*26+ch.charCodeAt(0)-64;return n-1};
const colName=i=>{let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s};
export async function viewXlsx(file,view,tools){
  const z=await unzip(await file.arrayBuffer()),wb=await z.read('xl/workbook.xml');
  if(!wb)throw{code:'corrupt'};
  const rels=xml(await z.read('xl/_rels/workbook.xml.rels')),target={};
  all(rels,'Relationship').forEach(r=>target[r.getAttribute('Id')]=r.getAttribute('Target'));
  const ss=await z.read('xl/sharedStrings.xml'),strs=ss?all(xml(ss),'si').map(s=>all(s,'t').map(t=>t.textContent).join('')):[];
  const sheets=all(xml(wb),'sheet').map(s=>({name:s.getAttribute('name'),path:'xl/'+target[s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')].replace(/^\/?(xl\/)?/,'')}));
  if(!sheets.length)throw{code:'empty'};
  const show=async i=>{
    tools.replaceChildren(...sheets.map((s,j)=>btn(s.name,()=>show(j),j===i)));
    const d=xml(await z.read(sheets[i].path)),rows=all(d,'row'),t=$('table','sheet'),w=$('div','scroll');
    let cut=false,maxc=0;const data=[];
    for(const r of rows.slice(0,MAX_ROWS)){const row=[];
      for(const c of all(r,'c')){const k=colIdx(c.getAttribute('r')||'A1');if(k>=MAX_COLS){cut=true;continue}
        const v=c.getElementsByTagNameNS('*','v')[0]?.textContent??'',ty=c.getAttribute('t');
        row[k]=ty==='s'?strs[+v]??'':ty==='inlineStr'?c.textContent:ty==='b'?(v==='1'?'VERDADERO':'FALSO'):v;maxc=Math.max(maxc,k+1)}
      data.push(row)}
    if(rows.length>MAX_ROWS)cut=true;
    const h=$('tr');h.append($('th',null,''));for(let c=0;c<maxc;c++)h.append($('th',null,colName(c)));t.append(h);
    data.forEach((row,n)=>{const tr=$('tr');tr.append($('th',null,String(n+1)));for(let c=0;c<maxc;c++)tr.append($('td',null,row[c]??''));t.append(tr)});
    w.append(t);view.replaceChildren(w);
    if(cut)view.append($('p','note',`Vista limitada a ${MAX_ROWS} filas y ${MAX_COLS} columnas.`));
    if(!data.length)view.replaceChildren($('p','note','Hoja vacía.'));
  };
  tools.hidden=false;await show(0);
}

export async function viewPptx(file,view,tools){
  const z=await unzip(await file.arrayBuffer());
  const names=z.names.filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>a.match(/\d+/)[0]-b.match(/\d+/)[0]);
  if(!names.length)throw{code:'corrupt'};
  let i=0;const pos=$('span','pos');
  const show=async()=>{
    const d=xml(await z.read(names[i])),s=$('div','slide');
    for(const p of all(d,'p')){const t=all(p,'t').map(e=>e.textContent).join('');if(t)s.append($('p',null,t))}
    if(!s.children.length)s.append($('p','note','(Diapositiva sin texto)'));
    view.replaceChildren(s,$('p','note','Vista de texto: imágenes y diseño no se muestran.'));pos.textContent=`${i+1} / ${names.length}`;view.scrollTop=0};
  tools.replaceChildren(btn('‹',()=>{if(i>0){i--;show()}}),pos,btn('›',()=>{if(i<names.length-1){i++;show()}}));
  tools.hidden=false;await show();
}
