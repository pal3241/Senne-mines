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
      persistence: 0.90
    }
  }

  snapshot() {
    return {
      traits: { ...this.traits },
      innerState: this.memory.data.innerState
    }
  }

  describeEmotion(emotion = {}) {
    if (emotion.fear > 0.7) return 'alert and defensive'
    if (emotion.frustration > 0.7) return 'frustrated but persistent'
    if (emotion.curiosity > 0.75) return 'curious and exploratory'
    if (emotion.happiness > 0.7) return 'warm and pleased'
    return emotion.valence < -0.35 ? 'subdued' : 'calm'
  }

  innerState({ goal, concern, interpretation, conflict, emotion, action }) {
    const state = {
      concern: concern || '',
      intention: goal || '',
      socialInterpretation: interpretation || '',
      conflict: conflict || '',
      mood: this.describeEmotion(emotion),
      nextAction: action || '',
      updatedAt: Date.now()
    }
    this.memory.data.innerState = state
    return state
  }
}

module.exports = { Personality }
