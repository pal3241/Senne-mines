class Personality {
  constructor(memory) {
    this.memory = memory
    if (!this.memory.data.innerState) this.memory.data.innerState = null
    this.traits = {
      independent: 0.85,
      curious: 0.72,
      cautious: 0.68,
      loyal: 0.82,
      quiet: 0.88,
      creative: 0.74,
      playful: 0.35,
      persistence: 0.9
    }
  }

  snapshot() {
    return { traits: { ...this.traits } }
  }

  describeEmotion(emotion) {
    const e = emotion || {}
    if (e.fear > 0.7) return 'alert and defensive'
    if (e.frustration > 0.7) return 'frustrated but persistent'
    if (e.curiosity > 0.75) return 'curious and exploratory'
    if (e.happiness > 0.7) return 'warm and pleased'
    return e.valence < -0.35 ? 'subdued' : 'calm'
  }

  innerState({ goal, concern, interpretation, conflict, emotion, action }) {
    return {
      concern: concern || '',
      intention: goal || '',
      socialInterpretation: interpretation || '',
      conflict: conflict || '',
      mood: this.describeEmotion(emotion),
      nextAction: action || '',
      updatedAt: Date.now()
    }
  }
}

module.exports = { Personality }
