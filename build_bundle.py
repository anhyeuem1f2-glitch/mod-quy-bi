from pathlib import Path
import re
ROOT=Path(__file__).resolve().parent
SRC=ROOT/'src'
ENTRY=SRC/'index.js'
seen=set(); order=[]
imp_re=re.compile(r"^import\s+[^;]+?\s+from\s+['\"](.+?)['\"];?\s*$|^import\s+['\"](.+?)['\"];?\s*$",re.M)

def resolve(base,spec):
    p=(base.parent/spec).resolve()
    if p.suffix!='.js': p=p.with_suffix('.js')
    return p

def visit(path):
    path=path.resolve()
    if path in seen:return
    seen.add(path)
    text=path.read_text(encoding='utf-8')
    for m in imp_re.finditer(text):
        spec=m.group(1) or m.group(2)
        if spec.startswith('.'):
            visit(resolve(path,spec))
    order.append(path)

visit(ENTRY)
chunks=[]
for path in order:
    text=path.read_text(encoding='utf-8')
    text=imp_re.sub('',text)
    text=re.sub(r'^export\s+(?=(?:async\s+)?(?:function|class|const|let|var)\b)','',text,flags=re.M)
    text=re.sub(r'^export\s*\{[^}]*\};?\s*$','',text,flags=re.M)
    rel=path.relative_to(ROOT).as_posix()
    chunks.append(f"\n/* ===== {rel} ===== */\n{text.strip()}\n")
config=(SRC/'config.js').read_text(encoding='utf-8')
vm=re.search(r"VERSION\s*=\s*['\"]([^'\"]+)['\"]", config)
version=vm.group(1) if vm else 'dev'
out=f"// QBCC Runtime Companion self-contained bundle v{version}\n(()=>{{\n'use strict';\n"+''.join(chunks)+"\n})();\n"
dist=ROOT/'dist'
dist.mkdir(exist_ok=True)
for old in dist.glob('qbcc-runtime-v*.js'):
    if old.name != f'qbcc-runtime-v{version}.js':
        old.unlink(missing_ok=True)
(dist/'qbcc-runtime.js').write_text(out,encoding='utf-8')
(dist/f'qbcc-runtime-v{version}.js').write_text(out,encoding='utf-8')
print('Bundled order:')
for p in order: print(' -',p.relative_to(ROOT))
print('version',version)
print('bytes',len(out.encode('utf-8')))
