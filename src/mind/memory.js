const fs = require('fs')
const path = require('path')

class Memory {
  constructor(filePath) {
    this.filePath = filePath
    this.data = { episodes: [], facts: {}, relationships: {}, server: {}, reflections: [] }
    this.load()
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) this.data = { ...this.data, ...JSON.parse(fs.readFileSync(this.filePath, 'utf8')) }
    } catch (err) {
      console.warn('[memory] load failed:', err.message)
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2))
  }

  episode(type, detail, importance = 0.5) {
    this.data.episodes.push({ at: Date.now(), type, detail, importance })
    if (this.data.episodes.length > 1000) this.data.episodes.splice(0, this.data.episodes.length - 1000)
    if (importance >= 0.7) this.save()
  }

  fact(key, value, confidence = 0.7, source = 'experience') {
    this.data.facts[key] = { value, confidence, source, updatedAt: Date.now() }
  }

  recent(limit = 20) {
    return this.data.episodes.slice(-limit)
  }

  context() {
    return {
      facts: this.data.facts,
      recentEpisodes: this.recent(12),
      server: this.data.server,
      relationships: this.data.relationships,
      recentReflections: this.data.reflections.slice(-4)
    }
  }
}

module.exports = { Memory }
