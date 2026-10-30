// Lector mínimo de ZIP (DOCX/XLSX/PPTX) usando DecompressionStream nativo.
export async function unzip(buf){
  const dv=new DataView(buf),u8=new Uint8Array(buf),td=new TextDecoder();
  let e=buf.byteLength-22;
  while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;
  if(e<0)throw new Error('zip');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const files={};
  for(let i=0;i<n;i++){
    if(dv.getUint32(p,true)!==0x02014b50)throw new Error('zip');
    const nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true);
    files[td.decode(u8.subarray(p+46,p+46+nl))]={m:dv.getUint16(p+10,true),c:dv.getUint32(p+20,true),o:dv.getUint32(p+42,true)};
    p+=46+nl+xl+cl;
  }
  const read=async name=>{
    const f=files[name];if(!f)return null;
    const s=f.o+30+dv.getUint16(f.o+26,true)+dv.getUint16(f.o+28,true),d=u8.subarray(s,s+f.c);
    if(f.m===0)return td.decode(d);
    const st=new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return td.decode(await new Response(st).arrayBuffer());
  };
  return{names:Object.keys(files),read};
}
