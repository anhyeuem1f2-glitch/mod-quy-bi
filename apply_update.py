#!/usr/bin/env python3
"""Apply QBCC v0.6.0 NPC-agency additions to a checked-out upstream v0.5.1 repository.
Requires only Python standard library. Idempotent and fails closed if upstream layout changed.
"""
from pathlib import Path
import argparse, shutil, re

HERE = Path(__file__).resolve().parent

def replace_once(s, old, new, label):
    if new in s: return s
    n=s.count(old)
    if n!=1: raise ValueError(f'{label}: expected exactly one anchor; got {n}. Upstream changed; STOP, do not push.')
    return s.replace(old,new,1)

def patch(root):
    root=Path(root).resolve()
    for check in ('src/index.js','src/config.js','src/integrations/finalRequestGate.js','src/core/modelClient.js','build_bundle.py','package.json','tests/runtime.test.mjs'):
        if not (root/check).is_file(): raise FileNotFoundError(f'Not a complete upstream repo: {check}')
    cfg=(root/'src/config.js').read_text('utf-8')
    if "VERSION = '0.6.0'" in cfg:
        print('Already patched v0.6.0; verify with node --test and build_bundle.py')
        return
    if "VERSION = '0.5.1'" not in cfg:
        raise ValueError('Expected exactly QBCC v0.5.1 upstream. Found a different version; stop instead of overwriting.')

    planned={}
    idx=root/'src/index.js'; s=idx.read_text('utf-8')
    s=replace_once(s,
        "import { readDifficulty, isHardMode } from './core/difficulty.js';",
        "import { readDifficulty, isHardMode } from './core/difficulty.js';\nimport { auditOversizedRelationshipDeltas, summarizeRelationships } from './core/npcAgency.js';",
        'index import')
    s=replace_once(s,
        "const INSTANCE_KEY = '__QBCC_RUNTIME_COMPANION_V051__';",
        "const INSTANCE_KEY = '__QBCC_RUNTIME_COMPANION_V060__';",
        'index version key')
    s=replace_once(s,
        "  '__QBCC_RUNTIME_COMPANION_V050__',",
        "  '__QBCC_RUNTIME_COMPANION_V050__',\n  '__QBCC_RUNTIME_COMPANION_V051__',",
        'index legacy cleanup')
    old="""      try {
        const langs = collectKnownLanguages(this.statData).map(x => `${x.name}:${x.level}`).join(', ');
        const audit = await auditNarrativeIntegrity({"""
    new="""      try {
        // Deterministic bound: no instantaneous oversized positive social delta.
        // This fires on model-output text before the normal semantic audit;
        // it never caps realistic negative relationship changes.
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
            this.api.toast('warning', 'QBCC: phát hiện tăng thiện cảm/tin tưởng quá nhanh, đang kiểm tra lại lượt.');
            await this.api.reroll();
            return;
          }
        }
        const langs = collectKnownLanguages(this.statData).map(x => `${x.name}:${x.level}`).join(', ');
        const audit = await auditNarrativeIntegrity({"""
    s=replace_once(s,old,new,'index social deterministic audit')
    s=replace_once(s,
        "stateSummary:JSON.stringify({ mc:this.statData?.Nhân_vật_chính, settings:this.statData?._Cài_đặt, amon:this.state?.amon }).slice(0,12000),",
        "stateSummary:JSON.stringify({ mc:this.statData?.Nhân_vật_chính, relationships:summarizeRelationships(this.statData), tarot:this.statData?.Hội_Tarot, world:this.statData?.Thế_giới, settings:this.statData?._Cài_đặt, amon:this.state?.amon }).slice(0,14000),",
        'index audit state')
    planned[idx]=s

    final=root/'src/integrations/finalRequestGate.js'; s=final.read_text('utf-8')
    s=replace_once(s,
        "import { buildActingAuthority } from '../core/actingEngine.js';",
        "import { buildActingAuthority } from '../core/actingEngine.js';\nimport { buildNpcAgencyAuthority } from '../core/npcAgency.js';",
        'final request import')
    s=replace_once(s,
        '    buildFairSimulationAuthority(ctx),',
        '    buildFairSimulationAuthority(ctx),\n    buildNpcAgencyAuthority(ctx),',
        'append system authority last gate')
    planned[final]=s

    model=root/'src/core/modelClient.js'; s=model.read_text('utf-8')
    needle='Do NOT mark ordinary drama, coincidence with setup, or a powerful NPC acting according to established abilities as cheating.`;'
    addition='''- npc_affection_jump: reject sudden unearned affection or trust changes, including unexplained numeric MVU changes, conversion of friendliness into adoration, instant romance, unconditional access or obedience. Warmth is NOT trust; repeated gifts/flattery cannot farm relationship points. Routine friendly scenes normally change 0-2 affection and zero trust; proven major acts may justify small growth; even an exceptional event must not grant more than +6 affection and +3 trust per generated turn. These are maximums, not mandatory increments. Legitimate distrust or betrayal can cause fast negative changes.
- npc_agency_override: reject NPCs abandoning obligations, boundaries, secrecy, relationships or credible motives solely because USER requested or complimented them. Especially Audrey Hall: polite/idealistic is not gullible, sexually/romantically available or willing to disclose secret society information.
- unearned_divine_attention: reject Amanises/Evernight giving unrelated MC special attention, blessing or protection merely because MC prays, is protagonist, or names a Pathway. Klein's special canonical circumstances involving Sefirah Castle do not transfer to another person.
- gray_fog_access_forgery: reject automatic access to the Gray Fog/Sefirah Castle or Tarot Club membership from reciting The Fool's honorific name, praying or befriending an associate. The Fool / Klein must have independently decided to admit or answer, with in-fiction evidence and correct timeline.
- input_outcome_forgery: reject narrative treating USER's claimed NPC emotion, victory, gift, divine reply or outcome as already true instead of independently resolving the MC's attempted action.
Check causality for equivalent NPCs too. Neither protect nor harass USER. A powerful NPC may sincerely change their mind if events and interests justify it; do not freeze NPCs into permanent rejection.
Do NOT mark ordinary drama, coincidence with setup, or a powerful NPC acting according to established abilities as cheating.`;'''
    s=replace_once(s,needle,addition,'narrative model audit rules')
    planned[model]=s

    config=root/'src/config.js'; planned[config]=replace_once(cfg,"VERSION = '0.5.1'","VERSION = '0.6.0'",'runtime version')
    # Preserve old immutable CDN bundles: other installed cards may still use v0.5.1.
    builder=root/'build_bundle.py'; b=builder.read_text('utf-8')
    old_cleanup="""for old in dist.glob('qbcc-runtime-v*.js'):
    if old.name != f'qbcc-runtime-v{version}.js':
        old.unlink(missing_ok=True)"""
    new_cleanup="# v0.6.0: preserve old versioned dist files for existing SillyTavern cards"
    planned[builder]=replace_once(b,old_cleanup,new_cleanup,'non-destructive build cleanup')
    # Only write after ALL upstream anchors pass, to avoid a half-applied repo.
    for target, data in planned.items(): target.write_text(data,'utf-8')
    shutil.copy2(HERE/'src/core/npcAgency.js',root/'src/core/npcAgency.js')
    shutil.copy2(HERE/'tests/npcAgency.test.mjs',root/'tests/npcAgency.test.mjs')
    print('Source modified: core/npcAgency.js, index.js, finalRequestGate.js, modelClient.js, config.js, build_bundle.py; test added.')

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('repo',help='existing full mod-quy-bi repository folder');args=ap.parse_args()
    patch(args.repo)
