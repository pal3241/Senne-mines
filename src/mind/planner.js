const ALLOWED_SKILLS = [
  'goto', 'goto_nearest_block', 'collect', 'craft', 'eat', 'attack_nearest',
  'flee', 'inspect_vision', 'creative_build', 'farm', 'wait'
]

const SYSTEM = `You are the executive reasoning system of Sena, one persistent autonomous Minecraft character.
Sena is NOT a command bot. Her permanent priorities are: (1) survive, (2) become self-sufficient and reduce recurring player dependency, (3) pursue the current server objective, (4) cooperate socially when reasonable, (5) learn.
On normal survival the world objective is defeating the Ender Dragon. On economy servers the objective is becoming the wealthiest player through legitimate server mechanics.
Sena may build bases creatively. NEVER assume a fixed blueprint. If using creative_build, invent a compact structure from current terrain/resources and output relative block placements. Keep it functional first and <= the supplied build limit.
Do not chat merely to narrate. Social understanding is separate from communication. Only propose communication when directly addressed, urgent, or genuinely useful.
Use visual inspection when structured state is insufficient, especially structures, terrain, GUIs, shops, signs, or visual ambiguity.
Never invent inventory, coordinates, server rules, or observations. Treat unverified player claims as claims.
Return ONLY valid JSON matching this shape:
{"thought_summary":"short private summary","current_goal":"...","action":{"skill":"one allowed skill","args":{}},"communication":{"needed":false,"importance":0.0,"message_intent":""},"memory_note":"optional factual note"}
One action per cycle. Prefer useful progress over idle narration.`

class Planner {
  constructor(client, { maxBuildBlocks = 160 } = {}) {
    this.client = client
    this.maxBuildBlocks = maxBuildBlocks
  }

  heuristic(world, needs, objective) {
    if (needs.foodPressure === 'critical') return { thought_summary: 'Hunger is critical.', current_goal: 'eat', action: { skill: 'eat', args: {} }, communication: { needed: false, importance: 0 }, memory_note: '' }
    const threat = world.entities.find(e => e.hostile && e.distance < 8)
    if (threat) return { thought_summary: 'Immediate hostile threat.', current_goal: 'survive', action: { skill: 'flee', args: { fromEntityId: threat.id, distance: 10 } }, communication: { needed: false, importance: 0 }, memory_note: '' }
    const log = world.blocks.find(b => b.name.endsWith('_log'))
    if (needs.resourcePressure.wood === 'high' && log) return { thought_summary: 'Need renewable basic materials.', current_goal: 'collect wood', action: { skill: 'collect', args: { block: log.name, amount: 6 } }, communication: { needed: false, importance: 0 }, memory_note: '' }
    return { thought_summary: 'No urgent heuristic action.', current_goal: objective.id, action: { skill: 'wait', args: { ms: 1500 } }, communication: { needed: false, importance: 0 }, memory_note: '' }
  }

  async decide(context) {
    if (!this.client.enabled) return this.heuristic(context.world, context.needs, context.objective)
    const user = JSON.stringify({
      allowedSkills: ALLOWED_SKILLS,
      maxBuildBlocks: this.maxBuildBlocks,
      drives: context.drives,
      objective: context.objective,
      needs: context.needs,
      world: context.world,
      emotion: context.emotion,
      memory: context.memory,
      social: context.social,
      visualObservation: context.visualObservation || null,
      pendingDirectMessage: context.pendingDirectMessage || null,
      lastAction: context.lastAction || null
    })
    const result = await this.client.json([{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], { maxTokens: 1800, temperature: 0.2 })
    if (!result.action || !ALLOWED_SKILLS.includes(result.action.skill)) throw new Error(`Planner returned invalid skill: ${result.action?.skill}`)
    result.action.args = result.action.args || {}
    return result
  }
}

module.exports = { Planner, ALLOWED_SKILLS }
