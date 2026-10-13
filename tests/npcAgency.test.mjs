import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNpcAgencyAuthority, summarizeRelationships, auditOversizedRelationshipDeltas} from '../src/core/npcAgency.js';
const stat={Quan_hệ:{Audrey_Hall:{Có_mặt:true,Hảo_cảm:2,Tin_tưởng:0,Quan_hệ:'Người lạ'}}};
test('Strict only in hard/nightmare',()=>{
 assert.equal(buildNpcAgencyAuthority({difficulty:'Dễ',statData:stat}),'');
 assert.equal(buildNpcAgencyAuthority({difficulty:'Thường',statData:stat}),'');
 assert.match(buildNpcAgencyAuthority({difficulty:'Khó',statData:stat}),/USER = NPC/);
 assert.match(buildNpcAgencyAuthority({difficulty:'Ác mộng',statData:stat}),/SEFIRAH|Gray Fog|GRAY FOG/i);
 assert.equal(buildNpcAgencyAuthority({difficulty:'Khó',sandboxTest:true,statData:stat}),'');
});
test('Relationship snapshot is bounded and read-only',()=>{
 const x=summarizeRelationships(stat); assert.equal(x.Audrey_Hall.Hảo_cảm,2);
 assert.equal(stat.Quan_hệ.Audrey_Hall.Hảo_cảm,2);
});
test('Excessive positive deltas caught while negative consequences stay possible',()=>{
 const bad='<UpdateVariable><JSONPatch>'+JSON.stringify([{op:'delta',path:'/Quan_hệ/Audrey_Hall/Hảo_cảm',value:28},{op:'delta',path:'/Quan_hệ/Audrey_Hall/Tin_tưởng',value:15}])+'</JSONPatch></UpdateVariable>';
 assert.equal(auditOversizedRelationshipDeltas(bad).length,2);
 const normal='<JSONPatch>'+JSON.stringify([{op:'delta',path:'/Quan_hệ/Audrey_Hall/Hảo_cảm',value:2},{op:'delta',path:'/Quan_hệ/Audrey_Hall/Tin_tưởng',value:-25}])+'</JSONPatch>';
 assert.deepEqual(auditOversizedRelationshipDeltas(normal),[]);
});
