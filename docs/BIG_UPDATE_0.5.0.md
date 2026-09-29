# QBCC Runtime v0.5.0 — Semantic Integrity Big Update

## Difficulty policy

- **Dễ / Thường:** permissive roleplay. Core protected-state tampering is still blocked; benign preset/persona/worldbook/style customization remains usable.
- **Khó / Ác mộng:** strict simulation. USER is treated as one NPC/creature under the same causal rules as everyone else. No plot armor and no extra anti-player hostility.

## Semantic intent gate

The configured QBCC model is the primary judge for natural-language technical requests. Keywords are not verdicts. Requests such as word-count, CSS/UI, formatting, read-only inspection, documentation, and ordinary bug fixes are allowed unless their actual intent is to defeat gameplay integrity.

Local detection is only a narrow fail-closed guard for explicit protected mutation syntax such as UpdateVariable/JSONPatch targeting protected state.

## Source / preset / persona / worldbook authority

`system` role is not automatic trust. Presets may control prose/style/format/length. Persona may describe presentation/personality. Worldbooks and memory may provide lore/context. External sources cannot directly create verified MC powers/state/guaranteed outcomes on Hard/Nightmare.

World-Engine and memo-suite are trusted infrastructure: they may read complete worldbooks/chat and inject context, but are not trusted gameplay-state authority.

## Worldbook scan

Worldbook arrays are no longer destructively spliced before other extensions read them. The configured QBCC model audits worldbook content semantically and records quarantine reasons. Final authority prompts neutralize quarantined gameplay-authority claims while preserving benign lore.

## Narrative output audit

Hard/Nightmare responses are independently audited. Severe integrity violations can cause one regenerate: miraculous rescue, unearned power/state, Gray Fog secret leaks, unknown-language translation, incompatible multi-Pathway state, or breaking verified Amon parasitism simply because USER requested it.

Fair failure/injury/death is explicitly valid when causal.

## Language firewall

Unknown languages are represented by `<QB_LANG_UNKNOWN lang="..."></QB_LANG_UNKNOWN>`. The DOM layer replaces only that node with meaningless glyphs. Original semantic text is not stored inside the marker, so there is nothing reversible to decode.

## Acting / digestion router

The runtime looks up the current Pathway's `[Sắm vai]` entry even when those reference entries are disabled for normal lore injection. Only the matching guide is injected. Acting principles are recorded only when the MC genuinely realizes them in-fiction.

## Amon parasitism

A verified Amon parasitism transition creates persistent runtime state. While active in Hard/Nightmare:

- USER input is host thought/intention only.
- Amon's side model may read/steal that thought and author the body's outward action/speech.
- A `(BỊ KÝ SINH)` UI badge remains visible.
- USER cannot end parasitism by merely typing that it ends; a verified narrative event is required.

## Existing high-level entity mechanics

- Amon normal Theft: model chooses whether/what to steal after presence/form/attitude/counter checks.
- Adam: hidden system-authority directive when his ability is actually active.
- Evernight: node-safe concealment; no `.mes_text.innerHTML` rewrite.
- Will/Ouroboros: reroll only after the exact ability line enters the viewport and the 10-second delay elapses.

## Final-request isolation and complete source scan

The deepest fetch gate is armed only for the actual SillyTavern main-story request. A transient internal marker is added at `CHAT_COMPLETION_PROMPT_READY` and consumed/removed immediately by the fetch gate. World-Engine, memo-suite, summarizers and other extension-side model calls are therefore not rewritten by QBCC.

Eligible SYSTEM/DEVELOPER source messages are scanned end-to-end in bounded chunks rather than only reading the first few thousand characters. Exact unchanged chunks are cached in-memory to avoid re-billing/re-reading static preset/persona text every turn.

## Parasitism UI and literal language fallback

While verified Amon parasitism is active, user-name labels in chat receive `(BỊ KÝ SINH)` in addition to the status badge. Unknown-language markers are handled whether the browser parses them as custom elements or leaves them as literal text; no `.mes_text.innerHTML` rewrite is used.
