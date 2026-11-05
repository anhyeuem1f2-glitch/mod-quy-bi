import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditOversizedRelationshipDeltas, buildNpcAgencyAuthority} from '../src/core/npcAgency.js';
import {readDifficulty} from '../src/core/difficulty.js';
const rel={Audrey_Hall:{Hảo_cảm:2,Tin_tưởng:1}};
const patch=items=>'<UpdateVariable><JSONPatch>'+JSON.stringify(items)+'</JSONPatch></UpdateVariable>';
test('whole NPC record cannot bypass caps',()=>{
 const x=auditOversizedRelationshipDeltas(patch([{op:'replace',path:'/Quan_hệ/Audrey_Hall',value:{Hảo_cảm:32,Tin_tưởng:7}}]),{currentRelations:rel});
 assert.equal(x.length,2);
});
test('whole relations object cannot bypass caps',()=>{
 const x=auditOversizedRelationshipDeltas(patch([{op:'replace',path:'/Quan_hệ',value:{Audrey_Hall:{Hảo_cảm:14,Tin_tưởng:12}}}]),{currentRelations:rel});
 assert.equal(x.length,2);
});
test('cumulative changes including escape-encoded path cannot bypass',()=>{
 const x=auditOversizedRelationshipDeltas(patch([{op:'delta',path:'/Quan_hệ/Audrey_Hall/Hảo_cảm',value:4},{op:'delta',path:'/Quan_hệ/Audrey_Hall/Hảo_cảm',value:4}]),{currentRelations:rel});
 assert.equal(x.length,1);assert.equal(x[0].value,8);
});
test('fairness: ordinary negative deltas and small positive gains pass',()=>{
 assert.equal(auditOversizedRelationshipDeltas(patch([{op:'delta',path:'/Quan_hệ/Audrey_Hall/Tin_tưởng',value:-6},{op:'delta',path:'/Quan_hệ/Audrey_Hall/Hảo_cảm',value:3}]),{currentRelations:rel}).length,0);
});
test('NPC rule only strict difficulty',()=>{
 assert.equal(buildNpcAgencyAuthority({difficulty:readDifficulty({_Niêm_phong:{Độ_khó:'Thường'}})}),'');
 assert.match(buildNpcAgencyAuthority({difficulty:readDifficulty({_Niêm_phong:{Độ_khó:'Khó'}})}),/USER = NPC/);
});
test('sandbox cannot be activated by spoofed lore or helper script in production',()=>{
 const src=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
 const x=src.match(/detectSandboxTestMode\(\)\s*\{([\s\S]*?)\n  \}/);
 assert.ok(x,'production detector exists');assert.match(x[1],/return false/);
 assert.doesNotMatch(x[1],/entries\.some|scripts\.some/);
});
