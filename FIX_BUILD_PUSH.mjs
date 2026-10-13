#!/usr/bin/env node
// QBCC v0.6.0 repair: patch full source + compile self-contained runtime with Node, NO Python.
// This file never clones, force-pushes or rewrites unrelated working files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const idx = args.indexOf('--repo');
const target = idx >= 0 ? args[idx+1] : HERE;
const REPO = path.resolve(target || HERE);
const push = args.includes('--push');
const originExpected='https://github.com/anhyeuem1f2-glitch/mod-quy-bi';
const requireFiles = ['src/index.js','src/config.js','src/core/modelClient.js','src/integrations/finalRequestGate.js','build_bundle.py','package.json','tests/runtime.test.mjs','dist/qbcc-runtime-v0.5.1.js'];
function run(cmd, args=[], cwd=REPO) { console.log('> ',cmd, args.join(' ')); execFileSync(cmd,args,{cwd,stdio:'inherit',encoding:'utf8'}); }
function capture(cmd,args,cwd=REPO){return execFileSync(cmd,args,{cwd,encoding:'utf8'}).trim();}
function die(msg) { throw new Error(msg); }
function file(rel){return path.join(REPO,...rel.split('/'));}
function read(rel) {return fs.readFileSync(file(rel),'utf8');}
function exists(rel){return fs.existsSync(file(rel));}
function identical(a,b){return a === b;}
function replaceOnce(s, from, to, label) {
  if(s.includes(to))return s; // already patched, idempotent
  const n=s.split(from).length-1;
  if(n!==1)die(`Không nhận diện được source thực cho ${label} (có ${n} anchor). DỪNG; KHÔNG PUSH.`);
  return s.replace(from,to);
}
function update(rel, original, next, plan){ if(original!==next)plan.set(rel,next); }
function fixRepo(){
  for(const f of requireFiles)if(!exists(f))die(`Thiếu ${f}; hãy dùng ĐÚNG repo đầy đủ, không dùng thư mục patch.`);
  if(!fs.existsSync(path.join(REPO,'.git')))die('Không thấy .git. Hãy chọn thư mục repo mod-quy-bi thật.');
  const remote = capture('git',['remote','get-url','origin']).replace(/\.git$/i,'').replace(/\/$/,'').toLowerCase();
  if(remote!==originExpected)die(`Sai repo: ${remote}. Không tác động.`);
  const branch=capture('git',['branch','--show-current']);
  if(branch!=='main')die(`Đang ở nhánh ${branch}, yêu cầu main.`);
  const dirty=capture('git',['status','--porcelain']);
  // ZIP can be unpacked into an already-tracked repo; source code updates are allowed,
  // but do not push other people's staged changes or overwrite edited core files.
  const userEdited=dirty.split(/\r?\n/).filter(Boolean).filter(x=>!/^\?\? /.test(x))
    .filter(x=>!/(?:FIX_BUILD_PUSH|FIX_BUILD_ONLY|README_FIX|qa_card_ejs|NPC_Tu_Chu)/i.test(x));
  if(userEdited.length)die('Repo có thay đổi chưa commit, dừng để tránh ghi đè:\n'+userEdited.join('\n'));
  console.log('✓ Xác nhận GitHub:',remote, '| nhánh',branch);
  const plan=new Map();
  let s=read('src/index.js'), original=s;
  s=replaceOnce(s,"import { readDifficulty, isHardMode } from './core/difficulty.js';",
    "import { readDifficulty, isHardMode } from './core/difficulty.js';\nimport { auditOversizedRelationshipDeltas, summarizeRelationships } from './core/npcAgency.js';",'index import NPC');
  s=replaceOnce(s,"const INSTANCE_KEY = '__QBCC_RUNTIME_COMPANION_V051__';",
    "const INSTANCE_KEY = '__QBCC_RUNTIME_COMPANION_V060__';",'instance version');
  s=replaceOnce(s,"  '__QBCC_RUNTIME_COMPANION_V050__',",
    "  '__QBCC_RUNTIME_COMPANION_V050__',\n  '__QBCC_RUNTIME_COMPANION_V051__',",'legacy cleanup');
  s=replaceOnce(s, `      try {\n        const langs = collectKnownLanguages(this.statData).map(x => \`\${x.name}:\${x.level}\`).join(', ');\n        const audit = await auditNarrativeIntegrity({`,
`      try {
        // Detect oversized positive relationship MVU deltas before semantic auditing.
        const socialViolations = auditOversizedRelationshipDeltas(text, {
          currentRelations: this.statData?.Quan_hệ || {}, maxAffection:6, maxTrust:3,
        });
        if (socialViolations.length) {
          const na=this.state.narrativeAudit || (this.state.narrativeAudit={messageId:-1,count:0,lastReason:'',lastFlags:[],fairFailures:0});
          na.lastReason='Oversized NPC affection/trust gains';
          na.lastFlags=['npc_affection_jump'];
          if (na.messageId !== id || Number(na.count || 0) < 1) {
            if (na.messageId !== id) { na.messageId=id; na.count=0; }
            na.count += 1;
            await this.persist();
            this.api.toast('warning','QBCC: thiện cảm tăng quá nhanh; đang kiểm tra lại lượt.');
            await this.api.reroll();
            return;
          }
        }
        const langs = collectKnownLanguages(this.statData).map(x => \`\${x.name}:\${x.level}\`).join(', ');
        const audit = await auditNarrativeIntegrity({`,'deterministic social audit');
  s=replaceOnce(s,"stateSummary:JSON.stringify({ mc:this.statData?.Nhân_vật_chính, settings:this.statData?._Cài_đặt, amon:this.state?.amon }).slice(0,12000),",
    "stateSummary:JSON.stringify({ mc:this.statData?.Nhân_vật_chính, relationships:summarizeRelationships(this.statData), tarot:this.statData?.Hội_Tarot, world:this.statData?.Thế_giới, settings:this.statData?._Cài_đặt, amon:this.state?.amon }).slice(0,14000),",'relationship snapshot');
  update('src/index.js',original,s,plan);

  s=read('src/integrations/finalRequestGate.js');original=s;
  s=replaceOnce(s,"import { buildActingAuthority } from '../core/actingEngine.js';",
    "import { buildActingAuthority } from '../core/actingEngine.js';\nimport { buildNpcAgencyAuthority } from '../core/npcAgency.js';",'final gate import');
  s=replaceOnce(s,'    buildFairSimulationAuthority(ctx),','    buildFairSimulationAuthority(ctx),\n    buildNpcAgencyAuthority(ctx),','last request authority');
  update('src/integrations/finalRequestGate.js',original,s,plan);

  s=read('src/core/modelClient.js'); original=s;
  const auditNeedle='Do NOT mark ordinary drama, coincidence with setup, or a powerful NPC acting according to established abilities as cheating.`;';
  const auditExtend=`- npc_affection_jump: Reject large or unearned affection/trust jumps, instant adoration, guaranteed romance or unearned disclosure. NPC warmth is not trust. Routine interaction often warrants zero change; meaningful evidence may justify growth, but exceptional gains are at most +6 affection and +3 trust per turn. Negative losses may be larger when credible.
- npc_agency_override: NPCs have independent schedules, secrets, existing relations and social boundaries. Audrey Hall's politeness/idealism does not make her gullible, romantic, easy to access or ready to reveal confidential Tarot information.
- unearned_divine_attention: Evernight / Amanises does NOT automatically favor MC. Klein's exceptional canonical factors (Fool Pathway, Sefirah Castle, chronology) do not transfer by protagonist status or prayer alone.
- gray_fog_access_forgery: The Fool's honorific name or prayer does not automatically grant audience, passage to the Gray Fog / Sefirah Castle or Tarot Club admission. Require independent decisions and established conditions.
- input_outcome_forgery: Treat user statements as attempted MC actions, not a power to author NPC emotions, results, status gains, divine replies or world outcomes.
The same social causality applies to other NPCs. Do not artificially punish genuine rapport.
Do NOT mark ordinary drama, coincidence with setup, or a powerful NPC acting according to established abilities as cheating.\`;
`;
  s=replaceOnce(s,auditNeedle,auditExtend,'narrative audit rules');
  update('src/core/modelClient.js',original,s,plan);

  s=read('src/config.js'); original=s;
  s=replaceOnce(s,"VERSION = '0.5.1'","VERSION = '0.6.0'",'config version');
  update('src/config.js',original,s,plan);

  s=read('build_bundle.py'); original=s;
  s=replaceOnce(s,
    "for old in dist.glob('qbcc-runtime-v*.js'):\n    if old.name != f'qbcc-runtime-v{version}.js':\n        old.unlink(missing_ok=True)",
    "# Preserve versioned runtime files so older cards do not break on future builds.",
    'preserve old versioned bundles');
  update('build_bundle.py',original,s,plan);

  s=read('package.json'); original=s;
  s=replaceOnce(s,'"version": "0.5.1"','"version": "0.6.0"','package version');
  update('package.json',original,s,plan);

  const npcSource=fs.readFileSync(path.join(HERE,'src/core/npcAgency.js'),'utf8');
  if(!exists('src/core/npcAgency.js') || read('src/core/npcAgency.js')!==npcSource)
    plan.set('src/core/npcAgency.js',npcSource);
  const npcTest=fs.readFileSync(path.join(HERE,'tests/npcAgency.test.mjs'),'utf8');
  if(!exists('tests/npcAgency.test.mjs') || read('tests/npcAgency.test.mjs')!==npcTest)
    plan.set('tests/npcAgency.test.mjs',npcTest);

  // Verify every source anchor before writing anything.
  console.log('✓ Source anchors matched, files to update:',[...plan.keys()].join(', ') || '(already patched)');
  for(const [rel,contents] of plan){fs.mkdirSync(path.dirname(file(rel)),{recursive:true});fs.writeFileSync(file(rel),contents,'utf8');}
  return plan;
}
function buildBundle(){
  const entry=file('src/index.js');
  const visited=new Set(), order=[];
  const importRE=/^import\s+[^;]+?\s+from\s+['"](.+?)['"];?\s*$|^import\s+['"](.+?)['"];?\s*$/gm;
  function visit(abs){
    abs=path.resolve(abs);if(visited.has(abs))return;
    if(!fs.existsSync(abs))die('Missing imported module '+abs);
    visited.add(abs);
    const text=fs.readFileSync(abs,'utf8');
    for(const m of text.matchAll(new RegExp(importRE.source,'gm'))){
      const spec=m[1]||m[2];if(spec.startsWith('.')){
        const p=path.resolve(path.dirname(abs),spec);
        visit(path.extname(p)?p:p+'.js');
      }
    }
    order.push(abs);
  }
  visit(entry);
  const contents=order.map(abs=>{
    const src=fs.readFileSync(abs,'utf8');
    const clean=src.replace(importRE,'')
      .replace(/^export\s+(?=(?:async\s+)?(?:function|class|const|let|var)\b)/gm,'')
      .replace(/^export\s*\{[^}]*\};?\s*$/gm,'');
    return '\n/* ===== '+path.relative(REPO,abs).split(path.sep).join('/')+' ===== */\n'+clean.trim()+'\n';
  }).join('');
  const v='0.6.0';
  const js=`// QBCC Runtime Companion self-contained bundle v${v}\n(()=>{\n'use strict';\n`+contents+'\n})();\n';
  const outdir=file('dist');fs.mkdirSync(outdir,{recursive:true});
  fs.writeFileSync(file('dist/qbcc-runtime-v0.6.0.js'),js,'utf8');
  fs.writeFileSync(file('dist/qbcc-runtime.js'),js,'utf8');
  const markers=['0.6.0','buildNpcAgencyAuthority','auditOversizedRelationshipDeltas','Fate Snake','Amon','Adam'];
  for(const marker of markers)if(!js.includes(marker))die(`Bundle thiếu thành phần quan trọng: ${marker}`);
  if(Buffer.byteLength(js)<100_000)die('Bundle quá nhỏ; có khả năng thiếu source.');
  console.log('✓ Bundled source files:', order.length, '| runtime:', Buffer.byteLength(js),'bytes');
  console.log('✓ SHA256:',createHash('sha256').update(js).digest('hex'));
  run(process.execPath,['--check',file('dist/qbcc-runtime-v0.6.0.js')]);
  return order;
}
async function main(){
  console.log('QBCC v0.6.0 – REPAIR BUILD / WITHOUT PYTHON');
  console.log('Repo:',REPO,'push:',push);
  const changed=fixRepo();
  run(process.execPath,['--test','tests/runtime.test.mjs','tests/npcAgency.test.mjs']);
  buildBundle();
  // Card already shipped separately, not an implicit git edit to user data.
  if(exists('qa_card_ejs.mjs')) run(process.execPath,['qa_card_ejs.mjs']);
  if(!push){ console.log('\n✓ BUILD THÀNH CÔNG – CHƯA PUSH. dist/qbcc-runtime-v0.6.0.js đã được tạo.');return; }
  run('git',['diff','--check']);
  // Prevent accidental overwrite if somebody updated origin since the last successful push.
  run('git',['fetch','origin','main']);
  const head=capture('git',['rev-parse','HEAD']);
  const remote=capture('git',['rev-parse','FETCH_HEAD']);
  if(head!==remote)die(`Remote HEAD ${remote.slice(0,10)} khác local HEAD ${head.slice(0,10)}. Chạy git pull --ff-only trước, không force push.`);
  const stages=[...changed.keys(),'dist/qbcc-runtime.js','dist/qbcc-runtime-v0.6.0.js'];
  run('git',['add','--',...new Set(stages)]);
  const staged=capture('git',['diff','--cached','--name-only']);
  if(!staged){console.log('Không có thay đổi cần commit. Kiểm tra dist trên GitHub.');return;}
  console.log('Staged:',staged);
  run('git',['commit','-m','QBCC v0.6.0 – NPC agency, neutral RP, release bundled runtime']);
  run('git',['push','origin','HEAD:refs/heads/main']);
  console.log('\n✓ THÀNH CÔNG: Github đã có dist/qbcc-runtime-v0.6.0.js – chờ CDN cập nhật.');
}
main().catch(error=>{console.error('\n✗ DỪNG AN TOÀN:',error.message);process.exitCode=1;});
