class NimClient {
  constructor({ baseUrl, apiKey, model }) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
    this.model = model
  }

  get enabled() {
    return Boolean(this.apiKey && this.model)
  }

  async chat(messages, options = {}) {
    if (!this.enabled) throw new Error(`NIM client for ${this.model} has no API key`)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 60000)
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options.temperature ?? 0.25,
          top_p: options.topP ?? 0.9,
          max_tokens: options.maxTokens ?? 1400,
          stream: false
        }),
        signal: controller.signal
      })
      const text = await response.text()
      if (!response.ok) throw new Error(`NIM ${response.status}: ${text.slice(0, 600)}`)
      const json = JSON.parse(text)
      return json.choices?.[0]?.message?.content || ''
    } finally {
      clearTimeout(timeout)
    }
  }

  async json(messages, options = {}) {
    const raw = await this.chat(messages, options)
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const candidate = (fenced ? fenced[1] : raw).trim()
    const first = candidate.indexOf('{')
    const last = candidate.lastIndexOf('}')
    if (first < 0 || last < first) throw new Error(`Model did not return JSON: ${raw.slice(0, 500)}`)
    return JSON.parse(candidate.slice(first, last + 1))
  }
}

module.exports = { NimClient }
