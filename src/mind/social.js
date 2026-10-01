class SocialMind {
  constructor(memory, selfName = 'Sena') {
    this.memory = memory
    this.selfName = selfName.toLowerCase()
    this.recentMessages = []
  }

  relation(username) {
    const store = this.memory.data.relationships
    if (!store[username]) store[username] = { familiarity: 0, trust: 0.5, affinity: 0, interactions: 0, lastSeen: 0 }
    return store[username]
  }

  hear(username, message) {
    if (!username || username.toLowerCase() === this.selfName) return
    const r = this.relation(username)
    r.interactions += 1
    r.familiarity = Math.min(1, r.familiarity + 0.01)
    r.lastSeen = Date.now()
    const lower = message.toLowerCase()
    if (/thank|makasih|thanks|ty\b/.test(lower)) r.affinity = Math.min(1, r.affinity + 0.01)
    this.recentMessages.push({ at: Date.now(), username, message })
    if (this.recentMessages.length > 50) this.recentMessages.shift()
  }

  directMention(username, message) {
    const lower = message.toLowerCase()
    return lower.includes(this.selfName) || /^sena[,: ]/i.test(message) || /^senna[,: ]/i.test(message)
  }

  context() {
    return { recentMessages: this.recentMessages.slice(-10), relationships: this.memory.data.relationships }
  }
}

module.exports = { SocialMind }
