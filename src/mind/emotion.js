class Emotion {
  constructor() {
    this.state = {
      valence: 0.15, arousal: 0.25, fear: 0, frustration: 0,
      happiness: 0.2, curiosity: 0.55, confidence: 0.55
    }
    this.lastTick = Date.now()
  }

  clamp(v) { return Math.max(0, Math.min(1, v)) }

  event(name, strength = 1) {
    const s = this.clamp(strength)
    const d = this.state
    if (name === 'damage') { d.fear += 0.25 * s; d.arousal += 0.35 * s; d.valence -= 0.2 * s }
    if (name === 'near_death') { d.fear += 0.6 * s; d.arousal += 0.5 * s; d.confidence -= 0.2 * s }
    if (name === 'success') { d.happiness += 0.25 * s; d.confidence += 0.12 * s; d.valence += 0.18 * s }
    if (name === 'failure') { d.frustration += 0.2 * s; d.confidence -= 0.05 * s; d.valence -= 0.08 * s }
    if (name === 'discovery') { d.curiosity += 0.15 * s; d.arousal += 0.1 * s; d.happiness += 0.08 * s }
    for (const k of Object.keys(d)) d[k] = k === 'valence' ? Math.max(-1, Math.min(1, d[k])) : this.clamp(d[k])
  }

  tick() {
    const now = Date.now()
    const dt = Math.min(30, (now - this.lastTick) / 1000)
    this.lastTick = now
    const decay = Math.pow(0.985, dt)
    this.state.fear *= decay
    this.state.frustration *= decay
    this.state.arousal = 0.2 + (this.state.arousal - 0.2) * decay
    this.state.happiness = 0.15 + (this.state.happiness - 0.15) * decay
    this.state.curiosity = 0.5 + (this.state.curiosity - 0.5) * decay
    this.state.confidence = 0.55 + (this.state.confidence - 0.55) * decay
    this.state.valence *= decay
  }

  snapshot() { return { ...this.state } }
}

module.exports = { Emotion }
