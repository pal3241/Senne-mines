class SocialMind {
  constructor(memory, selfName = 'Sena') {
    this.memory = memory
    this.selfName = selfName.toLowerCase()
    this.recentMessages = []
    this.following = null
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
    const text = String(message || '').trim()
    return /^(?:sena|senna|sen)[,:]?\s/i.test(text) || text.toLowerCase().includes(this.selfName)
  }

  interpret(username, message) {
    const text = String(message || '').trim()
    const lower = text.toLowerCase()
    const direct = this.directMention(username, text)
    this.relation(username)

    const follow = (direct && /\b(?:ikut|follow|kemari|sini|come here|follow me)\b/i.test(lower)) ||
      /\b(?:ikut|follow)\s+(?:aku|saya|me)\b/i.test(lower)
    if (follow) return {
      intent: 'follow_player',
      target: username,
      confidence: direct ? 0.96 : 0.82,
      direct,
      reason: 'Player appears to ask Sena to come or follow.'
    }

    const stop = (direct && /\b(?:berhenti|stop|tunggu|wait|jangan ikut)\b/i.test(lower)) ||
      /^(?:jangan|stop)\s+(?:ikut|follow)\b/i.test(lower)
    if (stop) return {
      intent: 'stop_following',
      target: username,
      confidence: direct ? 0.94 : 0.84,
      direct,
      reason: 'Player appears to ask Sena to stop following or wait.'
    }

    const greeting = /^(?:halo|hai|hi|hello|hey|p|yo)\b/i.test(lower)
    if (greeting) return {
      intent: 'greeting',
      target: username,
      confidence: 0.85,
      direct,
      reason: 'Casual greeting.'
    }

    return {
      intent: 'observation',
      target: username,
      confidence: direct ? 0.55 : 0.25,
      direct,
      reason: 'No actionable social intent recognized.'
    }
  }

  setFollowing(username) { this.following = username }
  clearFollowing() { this.following = null }

  context() {
    return { recentMessages: this.recentMessages.slice(-10), relationships: this.memory.data.relationships, following: this.following }
  }
}

module.exports = { SocialMind }
