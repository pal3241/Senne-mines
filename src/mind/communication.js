class CommunicationGate {
  constructor({ casualCooldownMs = 120000, infoCooldownMs = 30000 } = {}) {
    this.casualCooldownMs = casualCooldownMs
    this.infoCooldownMs = infoCooldownMs
    this.lastSpokeAt = 0
    this.lastMessage = ''
  }

  decide({ direct = false, urgent = false, useful = false, novelty = 0.5, importance = 0.5 } = {}) {
    const now = Date.now()
    if (urgent) return { speak: true, reason: 'urgent' }
    if (direct) return { speak: true, reason: 'direct' }
    const cooldown = useful ? this.infoCooldownMs : this.casualCooldownMs
    if (now - this.lastSpokeAt < cooldown) return { speak: false, reason: 'cooldown' }
    const score = (useful ? 0.35 : 0) + novelty * 0.3 + importance * 0.35
    return { speak: score >= 0.72, reason: score >= 0.72 ? 'relevant' : 'not_needed', score }
  }

  mark(message) {
    this.lastSpokeAt = Date.now()
    this.lastMessage = message
  }
}

module.exports = { CommunicationGate }
