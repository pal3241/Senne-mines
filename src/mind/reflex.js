class ReflexSystem {
  constructor(bot, skills, memory, emotion) {
    this.bot = bot
    this.skills = skills
    this.memory = memory
    this.emotion = emotion
    this.busy = false
    this.lastTrigger = 0
  }

  async tick(world, needs) {
    if (this.busy || !this.bot.entity) return false
    const now = Date.now()
    if (now - this.lastTrigger < 800) return false
    const creeper = world.entities.find(e => e.name === 'creeper' && e.distance <= 5)
    const threat = creeper || (needs.healthPressure === 'critical' ? needs.nearestThreat : null)
    if (threat) {
      this.lastTrigger = now
      this.busy = true
      this.emotion.event('near_death', creeper ? 0.8 : 0.6)
      this.memory.episode('reflex_flee', { threat }, 0.7)
      try { await this.skills.execute('flee', { distance: creeper ? 12 : 9, fromEntityId: threat.id }) } catch {}
      this.busy = false
      return true
    }
    if ((world.self.food ?? 20) <= 8) {
      this.lastTrigger = now
      this.busy = true
      try { await this.skills.execute('eat', {}) } catch {}
      this.busy = false
      return true
    }
    return false
  }
}

module.exports = { ReflexSystem }
