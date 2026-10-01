class ObjectiveEngine {
  constructor(memory) {
    this.memory = memory
    this.economyEvidence = 0
    this.mode = memory.data.server.mode || 'unknown'
  }

  observeChat(username, message) {
    const lower = message.toLowerCase()
    let points = 0
    if (/\/(bal|balance|shop|ah|auction|sell|buy)\b/.test(lower)) points += 2
    if (/\$\s?\d|\d+\s?(coins?|money|credits?)/.test(lower)) points += 1
    if (/auction|economy|balance|market|shop/.test(lower)) points += 1
    this.economyEvidence += points
    if (this.economyEvidence >= 3 && this.mode !== 'economy') {
      this.mode = 'economy'
      this.memory.data.server.mode = 'economy'
      this.memory.episode('server_mode', { mode: 'economy', evidence: message, username }, 0.9)
    }
  }

  primary() {
    if (this.mode === 'economy') {
      return {
        id: 'become_wealthiest_player',
        description: 'Become the wealthiest player by learning the server economy and increasing legitimate sustainable net wealth.',
        metric: 'discover_from_server'
      }
    }
    return {
      id: 'defeat_ender_dragon',
      description: 'Progress autonomously toward defeating the Ender Dragon while preserving survival and self-sufficiency.'
    }
  }

  drives() {
    return {
      survival: 'critical/permanent',
      selfSufficiency: 'high/permanent',
      worldObjective: this.primary(),
      curiosity: 'adaptive',
      social: 'medium; player-independent'
    }
  }
}

module.exports = { ObjectiveEngine }
