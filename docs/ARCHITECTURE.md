# Architecture

The companion is deliberately separate from the card's MVU/Zod guard.

- `core/anticheat.js`: strips forged runtime/MVU control blocks from user prompt copies.
- `core/loreFirewall.js`: lightweight domain firewall for foreign world-lore while allowing infrastructure such as TavernDB/ACU/Prompt Reviewer.
- `core/tags.js`: assistant-only runtime telemetry parser.
- `hardmode/`: only active in Khó / Ác mộng.
- `entities/`: canonical mechanics for Amon, Adam, Evernight, Fate Snake.
- `adapters/`: Tavern Helper/SillyTavern event bridge and display redaction.

Difficulty is read exactly like the card:

1. `stat_data._Niêm_phong.Độ_khó`
2. fallback `stat_data._Cài_đặt.Độ_khó`
3. fallback `Thường`

Easy/Normal keep scanning, anti-cheat and lore firewall. Angel-king runtime powers are dormant.
Hard/Nightmare additionally enable the entity power director.

## Kaiz Agent integration

`src/integrations/kaizAmon.js` is deliberately an integration layer, not part of core state validation. It watches for a combination of Kaiz activity + a protected mutation signal. This avoids treating the mere presence of Kaiz as cheating.

When triggered, it temporarily overlays `extensionSettings.kaiz_agent.persona`, disables only high-risk write tools, and adds a small monocle badge to the Kaiz UI. The original settings are stored in the current chat runtime state and restored on chat switch.
