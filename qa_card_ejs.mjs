import fs from 'node:fs';
import assert from 'node:assert/strict';
const p = new URL('./LOTM_Bach_Khoa_QBCC_v0.6.0_NPC_Tu_Chu.json', import.meta.url);
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const es=d.data.character_book.entries;
assert.equal(es.length,794);
function compile(tpl){
 const re=/<%_([\s\S]*?)_%>|<%-([\s\S]*?)%>/g;let src='let output="";\n',last=0,m;
 while ((m=re.exec(tpl))){src+='output+='+JSON.stringify(tpl.slice(last,m.index))+';\n';src+=m[1]!==undefined?m[1]+'\n':'output+=String('+m[2]+');\n';last=re.lastIndex;}
 src+='output+='+JSON.stringify(tpl.slice(last))+';return output;';
 return new Function('getvar',src);
}
const e880=compile(es.find(x=>x.id===880).content);
const e13=compile(es.find(x=>x.id===13).content);
for(const diff of ['Dễ','Thường','Khó','Ác mộng']) {
 const values={'stat_data._Cài_đặt.Độ_khó':diff,'stat_data.Quan_hệ':{Audrey_Hall:{Hảo_cảm:1,Tin_tưởng:0,Quan_hệ:'Người lạ',Có_mặt:true}},'stat_data.Hội_Tarot':{Tư_cách:'Không liên quan'}};
 const getter=(key,options)=>values[key]??options?.defaults;
 const npc=e880(getter);
 const common=e13(getter);
 assert.ok(common.length>10000);
 if(['Khó','Ác mộng'].includes(diff)) {
  assert.ok(npc.includes('MC = NPC'));
  assert.ok(npc.includes('Audrey Hall'));
  assert.ok(npc.includes('Hảo_cảm'));
  assert.ok(common.includes('Hảo_cảm không được tự cộng mỗi lượt'));
 } else {
  assert.equal(npc.trim(),'');
  assert.ok(common.includes('Hảo_cảm mỗi lượt thay đổi tối đa'));
 }
 console.log(diff,'NPC entry chars',npc.length,'MVU rule chars',common.length);
}
console.log('CARD QA PASS');
