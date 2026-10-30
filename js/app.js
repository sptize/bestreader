const $=id=>document.getElementById(id);
const LIMITS={pdf:100,docx:30,xlsx:30,xls:30,pptx:50,txt:20,html:20,htm:20}; // MB, ajustables
const TYPES={pdf:'PDF',docx:'Documento Word',xlsx:'Hoja de cálculo',xls:'Hoja de cálculo (XLS)',pptx:'Presentación',txt:'Texto',html:'HTML',htm:'HTML'};
const MSG={
 type:['Formato no admitido','Elige un archivo PDF, DOCX, XLSX, PPTX, TXT o HTML.'],
 empty:['Archivo vacío','El documento no tiene contenido que mostrar.'],
 big:['Archivo demasiado grande','Supera el límite configurado para este formato. Prueba con un archivo menor.'],
 corrupt:['No se pudo abrir','El archivo parece dañado o no es un documento válido.'],
 nolib:['XLS antiguo no compatible','Guarda el archivo como XLSX desde Excel u otra aplicación y vuelve a abrirlo.'],
 pwd:['PDF protegido','Este PDF requiere contraseña y no se puede abrir en el lector.'],
 read:['Error de lectura','No se pudo leer el archivo. Vuelve a seleccionarlo.']};
let tok=0,cleanup=null;
async function release(){const c=cleanup;cleanup=null;if(c)try{await c()}catch{}}
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1800)}
function clear(){$('view').replaceChildren();$('view').classList.remove('frame');$('tools').replaceChildren();$('tools').hidden=true}
function error(k){const[m,d]=MSG[k]||MSG.read,b=document.createElement('div');b.className='msg';
  const h=document.createElement('h2');h.textContent=m;const p=document.createElement('p');p.textContent=d;b.append(h,p);$('view').replaceChildren(b)}
function home(){tok++;release();clear();$('reader').hidden=true;$('home').hidden=false;$('file').value=''}
async function open(file){
  if(!file)return;
  await release();
  const ext=(file.name.split('.').pop()||'').toLowerCase(),my=++tok;
  $('home').hidden=true;$('reader').hidden=false;clear();
  $('fname').textContent=file.name;$('ftype').textContent=(TYPES[ext]||'Desconocido')+' · '+(file.size/1048576).toFixed(1)+' MB';
  if(!TYPES[ext])return error('type');
  if(!file.size)return error('empty');
  if(file.size>LIMITS[ext]*1048576)return error('big');
  $('loading').hidden=false;
  try{
    if(ext==='xls')throw{code:'nolib'};
    const v=await import('./viewers.js');
    const f={pdf:(await import('./pdf.js')).viewPdf,txt:v.viewTxt,html:v.viewHtml,htm:v.viewHtml,docx:v.viewDocx,xlsx:v.viewXlsx,pptx:v.viewPptx}[ext];
    const c=await f(file,$('view'),$('tools'),toast);
    if(my===tok)cleanup=c||null;else if(c)c();
  }catch(e){if(my===tok){clear();error(e&&e.code||(e&&e.message==='zip'?'corrupt':'corrupt'))}}
  finally{if(my===tok)$('loading').hidden=true}
}
$('pick').onclick=()=>$('file').click();
$('file').onchange=e=>open(e.target.files[0]);
$('close').onclick=home;
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
