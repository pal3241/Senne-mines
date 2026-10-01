const config = require('./config')
const { SenaRuntime } = require('./runtime/sena')

const sena = new SenaRuntime(config)

async function shutdown(signal) {
  console.log(`\n[sena] ${signal}, saving memory...`)
  try { await sena.stop() } finally { process.exit(0) }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('unhandledRejection', err => console.error('[unhandledRejection]', err))
process.on('uncaughtException', err => console.error('[uncaughtException]', err))

sena.start().catch(err => {
  console.error('[fatal]', err)
  process.exitCode = 1
})
