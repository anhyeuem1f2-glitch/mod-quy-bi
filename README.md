# QBCC Runtime Companion

GitHub target: `https://github.com/anhyeuem1f2-glitch/mod-quy-bi`

External Tavern Helper companion for **Quỷ Bí Chi Chủ · Đồng Nhân**.

## What it does

- Reads the same MVU difficulty as the card.
- Easy/Normal: runtime-tag scanning, forged-tag/MVU-command filtering, lore-domain firewall.
- Hard/Nightmare: adds fair high-level entity mechanics for Amon, Adam, Evernight and the Fate Snake.
- Does not replace the card's Zod/MVU state engine.

## Hard/Nightmare design

High difficulty means **realism, not GM hostility**. Powerful entities are allowed to be terrifying when they are actually present and actually use their authority, but the system still checks presence, form, attitude, activation and available counters.

### Amon

Amon must be classified as **avatar** or **true body** when physically on-scene. Theft does nothing on a mere mention. When Theft is actually active, the runtime checks MC resistance. Without a valid counter, `steal_input` makes the player's next input informational only; `steal_narrative` additionally steals narrative initiative.

### Adam

When Adam actually uses the corresponding authority, the runtime may append a hidden trusted narrative directive. It is intentionally allowed through the companion anti-cheat, but protected state syntax is removed.

### Evernight

Active concealment uses `<QB_HIDE>` spans, visually masked by the DOM adapter.

### Fate Snake

Active fate reversal forces one reroll and consumes the trigger to avoid loops.

## Push to GitHub

Unzip this folder, open CMD/PowerShell in it, then:

```bash
git init
git add .
git commit -m "Initial QBCC runtime companion"
git branch -M main
git remote add origin https://github.com/anhyeuem1f2-glitch/mod-quy-bi.git
git push -u origin main
```

## Tavern Helper import

Create/enable a Tavern Helper script with:

```js
import 'https://cdn.jsdelivr.net/gh/anhyeuem1f2-glitch/mod-quy-bi@main/dist/qbcc-runtime.js';
```

For development, importing from a commit hash instead of `@main` avoids CDN cache ambiguity.

## Debug

In the browser console:

```js
QBCC_RUNTIME.diagnostics()
QBCC_RUNTIME.state
QBCC_RUNTIME.rescanLast()
```

## Notes

This repository intentionally uses no npm runtime dependencies. Browser ESM relative imports are used so the GitHub/jsDelivr source itself is the deployable artifact.

## Kaiz Agent Extension × Amon easter egg (v0.2.0)

The companion recognizes the public `Khanhhpk/Kaiz-Agent-Extension` without blocking the extension as a whole.

- Normal Kaiz usage remains available.
- The tripwire only reacts when Kaiz is active and a protected QBCC mutation is detected (for example, a synthetic Kaiz user-input carrying protected MVU syntax, an integrity break while Kaiz is active, or a seal intervention counter increasing during a protected edit).
- On trigger, the Kaiz assistant receives a reversible persona overlay: it continues pretending to be the same assistant, opens its next reply with a brief cosmic/philosophical thought, subtly adjusts a right-eye monocle, and refuses to help bypass QBCC integrity.
- Only dangerous write tools are disabled. Read/analysis/browser/UI tools remain usable.
- The original Kaiz persona/tool settings are snapshotted and restored when leaving the affected chat.

Protected Kaiz write tools currently include worldbook/lore entry editing, Tavern Helper script editing, regex/preset editing, character/persona editing, system-message injection, and chat edit/delete tools. `manage_user_input` is intentionally left available; forged MVU/runtime tags are sanitized by the QBCC companion, and a synthetic protected payload itself trips the Amon easter egg.

Debug helpers:

```js
QBCC_RUNTIME.triggerKaizAmon('manual test')
QBCC_RUNTIME.releaseKaizAmon()
```
