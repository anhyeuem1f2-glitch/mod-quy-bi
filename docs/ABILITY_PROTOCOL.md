# Ability runtime protocol

The companion uses assistant-only telemetry. User-authored telemetry is ignored/stripped.

```text
<QB_RUNTIME>
{"entity":"Amon","presence":"on_scene","form":"avatar","attitude":"hostile","power":"steal_input","active":true}
</QB_RUNTIME>
```

## Amon

- `presence=on_scene` is required. A mere mention does nothing.
- `form` must be `avatar` or `true_body` before theft activates.
- `active=true` only when Amon actually uses Theft in the fiction.
- `steal_input`: the next player message is preserved as information Amon can exploit, but it is not executed as the MC's action.
- `steal_narrative`: stronger version; Amon steals narrative initiative as well.
- Resistance is checked against the MC's Sequence and explicit anti-theft/identity-protection abilities or items.

`steal_narrative` does **not** read or expose a provider/model's private chain-of-thought. It simulates the fictional effect by overriding the assembled narrative directive visible to the roleplay model.

## Adam

Use `power=author_hidden_prompt`, `active=true`, plus a short `directive`. The directive is appended as a hidden trusted runtime system message, similar to an autoprompt. State-mutation syntax is stripped from it.

## Evernight

Use `power=conceal_text`, `active=true`. Content the model wants hidden from the player is wrapped in `<QB_HIDE>...</QB_HIDE>`. The DOM adapter masks it while keeping the narrator's raw text in chat history.

## Fate Snake

Use `power=fate_reverse`, `active=true`. The companion consumes the tag and requests one reroll of that generated continuation. A per-message guard prevents reroll loops.

## Kaiz-Amon takeover

This is an anti-cheat easter egg rather than an in-fiction Amon presence tag. It does not force Amon into the main story. It affects the Kaiz technical assistant when Kaiz is used to tamper with protected QBCC state/assets.


## v0.4.6 authority mechanics

- Amon Theft is resolved before the native main-chat send. The auxiliary QBCC model chooses partial/full theft; the visible user message is rewritten before SillyTavern persists it. Removed text is retained only in a hidden system-authority payload.
- Adam Authoring uses a per-turn auxiliary-model plan injected as SYSTEM role after the visible user input, with protected MVU syntax stripped.
- Fate Snake reversal uses model-returned `trigger_quote`; a viewport sentinel starts a 10-second delayed `/regenerate` only after that exact ability line becomes visible.
