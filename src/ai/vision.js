class VisionMind {
  constructor(client) {
    this.client = client
    this.lastObservation = null
  }

  async inspect(jpegBase64, context = '') {
    if (!this.client.enabled || !jpegBase64) return null
    const content = await this.client.chat([
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are Sena's visual cortex inside Minecraft. Describe only actionable visual facts, hazards, structures, terrain, player activity, GUIs/signs/shops, and useful spatial cues. Distinguish observation from uncertainty. Keep under 180 words. Context: ${context}`
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${jpegBase64}` }
          }
        ]
      }
    ], { maxTokens: 350, temperature: 0.1 })
    this.lastObservation = { at: Date.now(), content }
    return content
  }
}

module.exports = { VisionMind }
