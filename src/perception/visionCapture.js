const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
const puppeteer = require('puppeteer')

class VisionCapture {
  constructor(bot, { port = 3007 } = {}) {
    this.bot = bot
    this.port = port
    this.browser = null
    this.page = null
    this.started = false
  }

  async start() {
    if (this.started) return
    mineflayerViewer(this.bot, { port: this.port, firstPerson: true, viewDistance: 6 })
    this.browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    this.page = await this.browser.newPage()
    await this.page.setViewport({ width: 768, height: 768, deviceScaleFactor: 1 })
    await this.page.goto(`http://127.0.0.1:${this.port}`, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(resolve => setTimeout(resolve, 1500))
    this.started = true
  }

  async capture() {
    if (!this.started) await this.start()
    return await this.page.screenshot({ type: 'jpeg', quality: 62, encoding: 'base64' })
  }

  async close() {
    try { await this.browser?.close() } catch {}
    try { this.bot.viewer?.close() } catch {}
    this.started = false
  }
}

module.exports = { VisionCapture }
