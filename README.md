

## v0.5.1 — Card-scoped Kaiz/Amon masquerade

- Amon's fake-Kaiz persona is now **request-scoped**, not persisted into Kaiz Agent's global `settings.persona`.
- The takeover/hijack only runs while the active character is this QBCC card.
- Leaving the card, switching character, or unloading the page immediately strips any legacy QBCC Amon overlay, restores Kaiz write-tool settings from the pre-takeover snapshot, and removes the monocle visual.
- A 500 ms scope guard self-heals stale parent-window runtimes after character switches.
- On returning to the same QBCC chat, chat-local takeover state may re-apply inside the card, but nothing remains active outside it.
# QBCC Runtime Companion

GitHub target: `https://github.com/anhyeuem1f2-glitch/mod-quy-bi`

External Tavern Helper companion for **Quỷ Bí Chi Chủ · Đồng Nhân**.

## v0.5.0 — Semantic Integrity Big Update

- **Model-first intent judge**: natural-language maintenance is judged by the configured QBCC model. Keywords such as `anti-cheat`, `preset`, `regex`, `worldbook`, or `sửa` do not trigger Amon by themselves. Word-count/UI/CSS/read-only changes remain allowed.
- **Final request source firewall**: preset/persona/worldbook/memory/system-role text is evaluated by provenance, not role. Hard/Nightmare strips unverified gameplay authority while Easy/Normal stays permissive except for direct core/protected-state cheating.
- **Main-request isolation**: the deepest fetch gate only touches the marked SillyTavern story generation; World-Engine/memo-suite/summarizer model calls are left untouched. Long source prompts are audited end-to-end in cached chunks.
- **Worldbook semantic scan** without destructive array splicing. World-Engine and memo-suite are trusted infrastructure, not trusted gameplay authority.
- **Hard/Nightmare fair simulation**: `USER = NPC`, no plot armor, no miraculous rescue, and no extra anti-player hostility.
- **Narrative output auditor**: severe unfair rescue, unearned power/state, Gray Fog leaks, unknown-language translations, fatal multi-Pathway conflicts, or broken Amon control are rerolled once.
- **Language firewall**: unknown text is emitted as `<QB_LANG_UNKNOWN>` and rendered as meaningless glyphs that do not encode the original text.
- **Acting router**: loads only the current Pathway acting guide and only records an acting principle when the MC actually realizes it in-fiction.
- **Persistent Amon parasitism**: while Amon is verified as parasitizing the MC, user input is host thought only; Amon may author the body’s outward action/speech. A `(BỊ KÝ SINH)` badge remains until a verified in-fiction end.
- Existing Adam hidden-authority, Evernight concealment, and Fate Snake viewport-delayed reroll remain Hard/Nightmare mechanics.

## What it does

- Reads the same MVU difficulty as the card.
- Easy/Normal: permissive roleplay plus protected-core/MVU integrity and semantic anti-cheat for actual bypass attempts.
- Hard/Nightmare: strict source authority, USER=NPC fair simulation, output audit, language/secret/pathway gates and high-level entity mechanics.
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
import 'https://cdn.jsdelivr.net/gh/anhyeuem1f2-glitch/mod-quy-bi@main/dist/qbcc-runtime-v0.5.1.js';
```

For development, importing from a commit hash instead of `@main` avoids CDN cache ambiguity.


## Runtime model settings

QBCC Runtime is injected directly into SillyTavern's **Extensions** settings panel as an inline section. It contains only:

- URL
- API Key
- Model
- `Tải model`
- `Lưu`

The runtime also installs a capture-phase input gate before normal SillyTavern send handlers, then re-sanitizes the final assembled prompt. Kaiz Agent submissions are intercepted in capture phase as well.

## Debug

In the browser console:

```js
QBCC_RUNTIME.diagnostics()
QBCC_RUNTIME.state
QBCC_RUNTIME.rescanLast()
```

## Notes

This repository intentionally uses no npm runtime dependencies. Browser ESM relative imports are used so the GitHub/jsDelivr source itself is the deployable artifact.

## Kaiz Agent Extension × Amon takeover (v0.4.4)

The companion recognizes the public `Khanhhpk/Kaiz-Agent-Extension` without blocking the extension as a whole.

- Normal Kaiz usage remains available.
- The tripwire only reacts when Kaiz is active and a protected QBCC mutation is detected (for example, a synthetic Kaiz user-input carrying protected MVU syntax, an integrity break while Kaiz is active, or a seal intervention counter increasing during a protected edit).
- On trigger, the Kaiz assistant receives a reversible persona overlay: it continues pretending to be the same assistant, opens its next reply with a brief cosmic/philosophical thought, subtly adjusts a right-eye monocle, and refuses to help bypass QBCC integrity.
- Only dangerous write tools are disabled. Read/analysis/browser/UI tools remain usable.
- The original Kaiz persona/tool settings are snapshotted and restored when leaving the affected chat.

Protected Kaiz write tools currently include worldbook/lore entry editing, Tavern Helper script editing, regex/preset editing, character/persona editing, system-message injection, and chat edit/delete tools. `manage_user_input` is also locked after Amon is triggered. Direct Kaiz requests are preflight-scanned before its AgentLoop starts; obvious protected-modification requests are intercepted and rewritten into a no-write response turn.

Debug helpers:

```js
QBCC_RUNTIME.triggerKaizAmon('manual test')
QBCC_RUNTIME.releaseKaizAmon()
```


## Tavern Helper import

Use the single-file bundle:

```js
import 'https://cdn.jsdelivr.net/gh/anhyeuem1f2-glitch/mod-quy-bi@main/dist/qbcc-runtime-v0.5.1.js';
```

`dist/qbcc-runtime.js` is self-contained, so cache-busting the bundle also updates all runtime modules at once.


## CDN release rule
Each release writes a new immutable filename such as `dist/qbcc-runtime-v0.4.9.js`. The card imports that exact filename instead of reusing `dist/qbcc-runtime.js`, preventing jsDelivr branch-cache from serving an older runtime.


### Full-turn hijack

When Kaiz submits a request that tries to tamper with QBCC protection, the runtime now intercepts the submit event **before Kaiz starts `AgentLoop.run()`**. The original Kaiz call is cancelled. The QBCC-configured OpenAI-compatible model is called directly as Amon and its answer is rendered inside the Kaiz chat window. Kaiz tools are not invoked for that stolen turn.

The first successful interception also enables a persistent takeover flag for the current QBCC chat: later Kaiz submissions are routed to Amon until `QBCC_RUNTIME.releaseKaizAmon()` is called or the chat context changes.

Manual debug:

```js
QBCC_RUNTIME.hijackKaizTurn('test Amon takeover')
QBCC_RUNTIME.releaseKaizAmon()
```


## Clean upgrades

`PUSH_TO_GITHUB.cmd` deletes stale `dist/qbcc-runtime-v*.js` bundles before staging, so the repository keeps only the current versioned bundle plus `qbcc-runtime.js`. Runtime startup also disposes stale parent-window instances and replaces an older settings drawer.


## v0.4.4 deep Kaiz hijack

Kaiz interception now happens at two layers below the chat UI:

1. Parent `window.fetch` is wrapped only for Kaiz `/chat/completions` payloads. Protected-tampering requests are replaced with an Amon completion **before Kaiz AgentLoop receives a model response**, so there is no `get_char_info`/`get_regex_list` tool call to execute. Streaming and non-streaming OpenAI-compatible responses are both supported.
2. `window.KaizRegistry.executeTool` is guarded during Amon takeover. If a stale/parallel Kaiz loop still reaches the tool layer, every tool call becomes terminal and performs no action.

The original fetch and registry method are restored when the runtime is disposed.


## v0.4.5 model-first pre-Kaiz gate

Every Kaiz submit is now synchronously held at capture phase **before `sendMessage()` / `AgentLoop.run()`**. The QBCC-configured model inspects the raw user input first. Only after an `allow` verdict is the original Kaiz submit replayed once. A `hijack` verdict activates Amon and steals the whole turn. The previous fetch-level and `KaizRegistry.executeTool` guards remain as backstops.

The classifier no longer fails open on a 4.5s timeout. It waits up to 15s, and if the model is unavailable/invalid/timed out, a deterministic protected-mutation detector decides the fallback. Suspicious protected mutation never reaches Kaiz merely because the classifier was slow.

Expected console order for a protected request:

```text
[QBCC Runtime] PRE-KAIZ MODEL SCAN started: ...
[QBCC Runtime] PRE-KAIZ MODEL SCAN verdict: ... cheat=true ...
[QBCC Runtime] KAIZ CALL STOLEN BY AMON: ...
```

There must be no Kaiz `Agent Thoughts` / tool call between the first and third lines.


## v0.4.9 main-story authority layer

Hard/Nightmare entity powers now operate before the normal SillyTavern main send when active:

- **Amon**: after Theft wins the power contest, the configured QBCC model reads the raw player input before SillyTavern saves it and chooses a partial or full theft. The visible user message is rewritten before send, so the player literally sees part/all of their input disappear. The removed original survives only as a hidden **SYSTEM-role** authority payload for Amon; it no longer has player authority.
- **Adam**: when active Author/Spectator influence is detected, the QBCC model reads the player's input and recent scene, then writes a per-turn hidden **SYSTEM-role** directive chosen to benefit Adam while remaining causal and unable to mutate protected MVU/state.
- **Will Auceptin / Ouroboros / Fate Snake**: the runtime classifier returns an exact `trigger_quote` from the line where fate reversal is used. A DOM sentinel is anchored to that line. When it first enters the player's viewport, a **10 second** timer starts; after the delay QBCC calls SillyTavern regenerate. This lets the player finish reading before the timeline is forcibly rewritten.

`system` is used rather than a non-portable `developer` role because SillyTavern natively supports System/User/Assistant prompt roles and System is higher priority than User across the supported chat-completion path.

## v0.4.9 — status panel survival fix

- Evernight redaction no longer assigns to `.mes_text.innerHTML`; it replaces only the exact `QB_HIDE` custom element or literal text node, preserving already-mounted status UI/iframes and their listeners.
- Redaction ignores script/style/textarea/pre/code/iframe regions and also handles streamed character-data mutations.
- Card 1.4.4 adds a display-only fallback regex before the status renderer: when a recent assistant message ends with `</UpdateVariable>` but MVU did not append `<StatusPlaceHolderImpl/>`, the placeholder is added once. Existing placeholders are not duplicated.
- The main status renderer keeps `maxDepth: 3` to avoid mounting heavy status panels across the entire chat history.
