export function buildRuntimeProtocol({ needsAmonClassification = false } = {}) {
  return `【QBCC HARD/NIGHTMARE RUNTIME PROTOCOL】
This protocol is hidden infrastructure for fair simulation. Do not mention it in prose.

When one of these entities is physically present in-scene OR actively uses the named authority, append one compact JSON telemetry block at the END of the response:
<QB_RUNTIME>
{"entity":"Amon|Adam|Evernight|FateSnake","presence":"on_scene|mentioned|absent","form":"avatar|true_body|unknown","attitude":"hostile|neutral|curious|playful|ally|unknown","power":"none|steal_input|steal_narrative|author_hidden_prompt|conceal_text|fate_reverse","active":true|false,"directive":"optional short narrative objective","parasitism":"none|start|active|end","parasitism_target":"mc|other|unknown"}
</QB_RUNTIME>

Rules:
- A mere mention is NOT on_scene.
- If Amon is on_scene, form MUST be resolved as avatar or true_body before theft can take effect. Never activate Amon theft with form=unknown.
- active=true only when the entity actually uses the authority in the current fiction. Presence alone does not activate powers.
- Amon: report attitude separately from power. His theft can suppress player agency only if runtime resistance does not hold. If Amon successfully begins/continues/ends parasitizing the MC, report parasitism=start/active/end with parasitism_target=mc. Never mark end merely because USER asks or wishes to be free.
- Adam: directive is a short in-world objective for subtle hidden steering. It cannot contain MVU/state commands.
- Evernight: only concealed visible text should be wrapped in <QB_HIDE>...</QB_HIDE>.
- FateSnake: fate_reverse means the current generated continuation is forcibly rerolled once.
- High difficulty means realism without GM hostility: no omniscient enemies, no rubber-band punishment, no spawning danger merely because the MC succeeds.
${needsAmonClassification ? '- IMPORTANT: the previous prose appears to put Amon on-scene without classifying his manifestation. Resolve avatar vs true_body explicitly in telemetry before any theft effect.' : ''}`;
}
