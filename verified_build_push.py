#!/usr/bin/env python3
"""Safe, pinned-source builder for QBCC v0.6.0.

This installer intentionally downloads the *real full* upstream repo on the user's
machine into an OS-managed temporary directory, verifies its exact Git commit,
then applies the source-level v0.6.0 changes, builds and (with --push) pushes it.
It never pretends that the ZIP itself is a full Git repository.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

from apply_update import patch

UPSTREAM = "https://github.com/anhyeuem1f2-glitch/mod-quy-bi.git"
BASE_SHA = "661cf10182998a44c09bcf76aa26923f9be36732"
CARD = "LOTM_Bach_Khoa_QBCC_v0.6.0_NPC_Tu_Chu.json"
BUNDLE = "qbcc-runtime-v0.6.0.js"
HERE = Path(__file__).resolve().parent
CHANGED_PATHS = [
    "src/core/npcAgency.js",
    "src/index.js",
    "src/integrations/finalRequestGate.js",
    "src/core/modelClient.js",
    "src/config.js",
    "build_bundle.py",
    "tests/npcAgency.test.mjs",
    "dist/qbcc-runtime.js",
    "dist/qbcc-runtime-v0.6.0.js",
]


def run(*argv: str, cwd: Path | None = None, capture: bool = False) -> str:
    args = [str(v) for v in argv]
    print("+", " ".join(args), flush=True)
    completed = subprocess.run(args, cwd=cwd, check=True, text=True,
                               stdout=subprocess.PIPE if capture else None,
                               stderr=subprocess.PIPE if capture else None,
                               encoding="utf-8", errors="replace")
    return completed.stdout.strip() if capture else ""


def canonical_remote(text: str) -> str:
    return text.strip().replace('\\', '/').rstrip('/').removesuffix('.git').lower()


def verify_repo(repo: Path) -> None:
    required = ("src/index.js", "src/config.js", "src/core/modelClient.js",
                "src/integrations/finalRequestGate.js", "build_bundle.py", "package.json",
                "tests/runtime.test.mjs")
    missing = [p for p in required if not (repo / p).is_file()]
    if missing:
        raise RuntimeError("This is not a complete upstream source repository: " + ', '.join(missing))

    actual_remote = run('git', 'remote', 'get-url', 'origin', cwd=repo, capture=True)
    if canonical_remote(actual_remote) != canonical_remote(UPSTREAM):
        raise RuntimeError("Wrong origin! Got " + actual_remote + "; expected " + UPSTREAM)
    print("VERIFIED repository origin:", actual_remote)

    actual_sha = run('git', 'rev-parse', 'HEAD', cwd=repo, capture=True)
    if actual_sha.lower() != BASE_SHA.lower():
        raise RuntimeError(
            "Wrong GitHub revision. Expected " + BASE_SHA + ", got " + actual_sha +
            ". Upstream main has changed or was already updated. STOPPING WITHOUT CHANGES."
        )
    print("VERIFIED upstream Git commit:", actual_sha)

    current_branch = run('git', 'branch', '--show-current', cwd=repo, capture=True)
    if current_branch != 'main':
        raise RuntimeError("Expected main branch; got: " + current_branch)
    status = run('git', 'status', '--porcelain', cwd=repo, capture=True)
    if status:
        raise RuntimeError("Upstream folder has uncommitted/untracked files; do not overwrite:\n" + status[:2400])


def build(repo: Path) -> None:
    patch(repo)
    run('node', '--test', 'tests/runtime.test.mjs', 'tests/npcAgency.test.mjs', cwd=repo)
    run(sys.executable, 'build_bundle.py', cwd=repo)
    produced = repo / 'dist' / BUNDLE
    if not produced.is_file() or produced.stat().st_size < 100_000:
        raise RuntimeError('Missing or suspiciously short v0.6.0 bundled JavaScript')
    js = produced.read_text('utf-8')
    for marker in ('0.6.0', 'buildNpcAgencyAuthority', 'auditOversizedRelationshipDeltas', 'Fate Snake', 'Adam', 'Amon'):
        if marker not in js:
            raise RuntimeError('Runtime bundle missing important marker: ' + marker)
    run('node', '--check', str(produced), cwd=repo)
    run('node', str(HERE / 'qa_card_ejs.mjs'), cwd=HERE)
    # Save an inspectable built artifact next to the ZIP extraction; not an import substitute.
    output = HERE / 'BUILD_OUTPUT'
    output.mkdir(exist_ok=True)
    shutil.copy2(produced, output / BUNDLE)
    print('BUILT and saved bundle:', output / BUNDLE)


def check_tools() -> None:
    for exe in ('git', 'node'):
        if not shutil.which(exe):
            raise RuntimeError(f'{exe} is not installed or not on PATH')
    if not (HERE / CARD).is_file():
        raise RuntimeError('Missing card JSON from ZIP: ' + CARD)
    if not (HERE / 'apply_update.py').is_file():
        raise RuntimeError('Missing apply_update.py from ZIP')


def do_push(repo: Path) -> None:
    run('git', 'diff', '--check', cwd=repo)
    run('git', 'add', '--', *CHANGED_PATHS, cwd=repo)
    stat = run('git', 'diff', '--cached', '--name-only', cwd=repo, capture=True)
    actual = {line.strip().replace('\\','/') for line in stat.splitlines() if line.strip()}
    unknown = actual.difference(CHANGED_PATHS)
    if unknown:
        raise RuntimeError('Unexpected staged files: '+', '.join(sorted(unknown)))
    if not actual:
        raise RuntimeError('No staged patch changes; unexpected source state')
    print('STAGED PATCH FILES:', ', '.join(sorted(actual)))
    run('git', 'commit', '-m', 'QBCC v0.6.0: neutral NPC agency, source gates and audit', cwd=repo)
    # Non-force push. If the remote advanced after the pinned base commit,
    # the non-fast-forward push is rejected rather than destroying commits.
    run('git', 'push', 'origin', 'HEAD:refs/heads/main', cwd=repo)
    print('SUCCESS: v0.6.0 committed and pushed to the verified GitHub repository.')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--local-repo', type=Path, help='Use an existing clean local checkout instead of a temporary clone')
    ap.add_argument('--verify-only', action='store_true', help='Verify + build only, DO NOT push')
    ap.add_argument('--push', action='store_true', help='Commit and push after all tests and build succeed')
    opts = ap.parse_args()
    if opts.push and opts.verify_only:
        ap.error('choose --push or --verify-only')
    if not opts.push and not opts.verify_only:
        ap.error('Choose --verify-only or --push explicitly')
    check_tools()
    with tempfile.TemporaryDirectory(prefix='qbcc_verified_git_') as scratch:
        if opts.local_repo:
            repo = opts.local_repo.resolve()
            if not repo.is_dir():
                raise RuntimeError('Local source repository path does not exist: ' + str(repo))
            if run('git','rev-parse','--show-toplevel',cwd=repo,capture=True).replace('\\','/').rstrip('/').lower() != str(repo).replace('\\','/').rstrip('/').lower():
                raise RuntimeError('Local repository must be passed at the Git root folder')
        else:
            repo = Path(scratch) / 'mod-quy-bi'
            print('DOWNLOADING VERIFIED UPSTREAM IN TEMP ONLY:', repo)
            run('git', 'clone', '--single-branch', '--branch', 'main', UPSTREAM, str(repo))
        verify_repo(repo)
        build(repo)
        if opts.push:
            do_push(repo)
        else:
            print('VERIFIED BUILD COMPLETE. --verify-only: nothing was pushed.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, subprocess.CalledProcessError, RuntimeError, ValueError) as exc:
        print('\nQBCC UPDATE STOPPED SAFELY:', exc, file=sys.stderr)
        print('No force push was attempted; check GitHub login, source revision and build logs.', file=sys.stderr)
        sys.exit(1)
