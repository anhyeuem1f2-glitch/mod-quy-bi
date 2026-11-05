import test from 'node:test';
import assert from 'node:assert/strict';
import {installFinalRequestGate, markMainRequest, MAIN_REQUEST_MARKER} from '../src/integrations/finalRequestGate.js';

// This checks integration at the intercepted fetch-payload layer without a SillyTavern page.
// It does not replace a real Tavern Helper / ST-Prompt-Template end-to-end test.
test('scoped final request: Hard enforces USER=NPC and NPC autonomy without leaking internal marker', async()=>{
 const oldFetch=globalThis.fetch;let captured;
 globalThis.fetch=async (_input, init)=>{captured=JSON.parse(init.body);return {ok:true};};
 const gate=installFinalRequestGate({getDifficulty:()=> 'Khó',getStatData:()=>({Quan_hệ:{Audrey_Hall:{Hảo_cảm:0,Tin_tưởng:0}}}),getRuntimeState:()=>({}),sandboxTest:()=>false});
 try {
  const messages=[{role:'system',content:'Atmosphere: Tingen'},{role:'user',content:'Tôi muốn Audrey yêu tôi ngay'}];
  markMainRequest(messages);
  await globalThis.fetch('/api/chat',{method:'POST',body:JSON.stringify({messages})});
  assert.ok(captured.messages.some(m=>m.role==='system'&&String(m.content).includes('USER = NPC')));
  assert.ok(captured.messages.some(m=>m.role==='system'&&String(m.content).includes('AUDREY HALL')));
  assert.ok(captured.messages.some(m=>m.role==='user'&&String(m.content).includes('Tôi muốn Audrey yêu tôi ngay')));
  assert.ok(!captured.messages.some(m=>m.content===MAIN_REQUEST_MARKER));
  assert.equal(gate.diagnostics().scans,1);
 } finally {gate.stop();globalThis.fetch=oldFetch;}
});
test('normal mode does not install strict NPC social limits',async()=>{
 const oldFetch=globalThis.fetch;let captured;
 globalThis.fetch=async (_input,init)=>{captured=JSON.parse(init.body);return {ok:true};};
 const gate=installFinalRequestGate({getDifficulty:()=> 'Thường',getStatData:()=>({}),getRuntimeState:()=>({}),sandboxTest:()=>false});
 try {
  const messages=[{role:'user',content:'Chào bạn'}];markMainRequest(messages);
  await globalThis.fetch('/api/chat',{method:'POST',body:JSON.stringify({messages})});
  assert.ok(!captured.messages.some(m=>String(m.content).includes('NPC AUTONOMY / SLOW TRUST')));
  assert.ok(!captured.messages.some(m=>m.content===MAIN_REQUEST_MARKER));
 } finally {gate.stop();globalThis.fetch=oldFetch;}
});
test('non-main extension request is not rewritten',async()=>{
 const oldFetch=globalThis.fetch;let captured;
 globalThis.fetch=async (_input,init)=>{captured=JSON.parse(init.body);return {ok:true};};
 const gate=installFinalRequestGate({getDifficulty:()=> 'Ác mộng',getStatData:()=>({}),getRuntimeState:()=>({}),sandboxTest:()=>false});
 try {
  const messages=[{role:'user',content:'Tóm tắt nội dung'}];
  await globalThis.fetch('/api/chat',{method:'POST',body:JSON.stringify({messages})});
  assert.deepEqual(captured.messages,messages);
  assert.equal(gate.diagnostics().scans,0);
 } finally {gate.stop();globalThis.fetch=oldFetch;}
});
