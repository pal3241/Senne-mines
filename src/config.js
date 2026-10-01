require('dotenv').config()

function int(name, fallback) {
  const value = Number.parseInt(process.env[name] || '', 10)
  return Number.isFinite(value) ? value : fallback
}

function bool(name, fallback) {
  const value = process.env[name]
  if (value == null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

module.exports = {
  minecraft: {
    host: process.env.MC_HOST || 'localhost',
    port: int('MC_PORT', 25565),
    username: process.env.MC_USERNAME || 'Sena',
    auth: process.env.MC_AUTH || 'offline',
    version: process.env.MC_VERSION || undefined
  },
  runtime: {
    thinkIntervalMs: int('SENA_THINK_INTERVAL_MS', 12000),
    reflexIntervalMs: int('SENA_REFLEX_INTERVAL_MS', 250),
    memoryPath: process.env.SENA_MEMORY_PATH || './data/memory.json',
    viewerPort: int('SENA_VIEWER_PORT', 3007),
    enableVision: bool('SENA_ENABLE_VISION', true),
    maxBuildBlocks: int('SENA_MAX_BUILD_BLOCKS', 160),
    allowSpontaneousChat: bool('SENA_ALLOW_SPONTANEOUS_CHAT', false)
  },
  nim: {
    baseUrl: process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    llmKey: process.env.NVIDIA_LLM_API_KEY || '',
    vlmKey: process.env.NVIDIA_VLM_API_KEY || '',
    llmModel: process.env.NVIDIA_LLM_MODEL || 'openai/gpt-oss-20b',
    vlmModel: process.env.NVIDIA_VLM_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'
  }
}
