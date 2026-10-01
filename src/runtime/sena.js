const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')
const { snapshot } = require('../perception/world')
const { VisionCapture } = require('../perception/visionCapture')
const { NimClient } = require('../ai/nim')
const { VisionMind } = require('../ai/vision')
const { Memory } = require('../mind/memory')
const { Emotion } = require('../mind/emotion')
const { Personality } = require('../mind/personality')
const { Personality } = require('../mind/personality')
const { SocialMind } = require('../mind/social')
const { CommunicationGate } = require('../mind/communication')
const { parseCommand, helpText } = require('../mind/commands')
const { evaluateNeeds } = require('../mind/needs')
const { ObjectiveEngine } = require('../mind/objectives')
const { Planner } = require('../mind/planner')
const { ReflexSystem } = require('../mind/reflex')
const { Skills } = require('../skills')

class SenaRuntime {
  constructor(config) {
    this.config = config
    this.memory = new Memory(config.runtime.memoryPath)
    this.emotion = new Emotion()
    this.personality = new Personality(this.memory)
    this.personality = new Personality(this.memory)
    this.objectives = new ObjectiveEngine(this.memory)
    this.communication = new CommunicationGate()
    this.bot = null
    this.skills = null
    this.reflex = null
    this.planner = null
    this.social = null
    this.visionCapture = null
    this.visionMind = null
    this.lastWorld = null
    this.lastAction = null
    this.lastVisual = null
    this.pendingDirectMessage = null
    this.pendingSocialIntent = null
    this.pendingSocialIntent = null
    this.manualCommand = null
    this.planningPaused = false
    this.running = false
    this.thinking = false
  }

  async start() {
    const mc = this.config.minecraft
    this.bot = mineflayer.createBot({ host: mc.host, port: mc.port, username: mc.username, auth: mc.auth, version: mc.version })
    this.bot.loadPlugin(pathfinder)

    const llm = new NimClient({ baseUrl: this.config.nim.baseUrl, apiKey: this.config.nim.llmKey, model: this.config.nim.llmModel })
    const vlm = new NimClient({ baseUrl: this.config.nim.baseUrl, apiKey: this.config.nim.vlmKey, model: this.config.nim.vlmModel })
    this.visionMind = new VisionMind(vlm)
    this.social = new SocialMind(this.memory, mc.username)
    this.planner = new Planner(llm, { maxBuildBlocks: this.config.runtime.maxBuildBlocks })

    this.bot.on('chat', (username, message) => this.onChat(username, message))
    this.bot.on('messagestr', message => this.objectives.observeChat('server', message))
    this.bot.on('health', () => {
      if (this.bot.health < 20) this.emotion.event('damage', this.bot.health <= 6 ? 1 : 0.4)
    })
    this.bot.on('death', () => {
      this.memory.episode('death', { position: this.bot.entity?.position }, 1)
      this.emotion.event('near_death', 1)
      this.memory.save()
    })
    this.bot.on('kicked', reason => console.error('[minecraft] kicked:', reason))
    this.bot.on('error', err => console.error('[minecraft] error:', err.message))

    await new Promise((resolve, reject) => {
      const onError = err => { cleanup(); reject(err) }
      const onSpawn = () => { cleanup(); resolve() }
      const cleanup = () => { this.bot.off('error', onError); this.bot.off('spawn', onSpawn) }
      this.bot.once('error', onError)
      this.bot.once('spawn', onSpawn)
    })

    if (this.config.runtime.enableVision && this.config.nim.vlmKey) {
      try {
        this.visionCapture = new VisionCapture(this.bot, { port: this.config.runtime.viewerPort })
        await this.visionCapture.start()
        console.log(`[vision] first-person viewer ready on :${this.config.runtime.viewerPort}`)
      } catch (err) {
        console.warn('[vision] disabled after init failure:', err.message)
        this.visionCapture = null
      }
    }

    this.skills = new Skills(this.bot, { visionCapture: this.visionCapture, visionMind: this.visionMind, maxBuildBlocks: this.config.runtime.maxBuildBlocks })
    this.reflex = new ReflexSystem(this.bot, this.skills, this.memory, this.emotion)
    this.running = true
    console.log(`[sena] spawned as ${this.bot.username}. LLM=${llm.enabled ? this.config.nim.llmModel : 'heuristic fallback'} VLM=${this.visionCapture ? this.config.nim.vlmModel : 'off'}`)
    this.loopReflex()
    this.loopMind()
  }

  onChat(username, message) {
    if (username === this.bot.username) return
    this.social.hear(username, message)
    this.objectives.observeChat(username, message)

    const socialIntent = this.social.interpret(username, message)
    if (socialIntent.intent !== 'observation') {
      if (socialIntent.intent === 'follow_player' || socialIntent.intent === 'stop_following') {
        this.pendingSocialIntent = { ...socialIntent, at: Date.now() }
      }
      if (socialIntent.direct) {
        this.pendingDirectMessage = { username, message, at: Date.now(), intent: socialIntent.intent }
      }
    }

    const command = parseCommand(username, message)
    if (!command) return

    if (command.type === 'help') {
      this.bot.chat(helpText())
      return
    }
    if (command.type === 'status') {
      const task = this.manualCommand?.instruction || (this.planningPaused ? 'paused' : 'autonomous')
      this.bot.chat(`Sena: ${task.slice(0, 120)}`)
      return
    }
    if (command.type === 'pause') {
      this.planningPaused = true
      this.manualCommand = null
      this.bot.chat('Sena: paused. Reflex survival remains active.')
      return
    }
    if (command.type === 'resume') {
      this.planningPaused = false
      this.manualCommand = null
      this.bot.chat('Sena: autonomous mode resumed.')
      return
    }
    if (command.type === 'cancel') {
      this.manualCommand = null
      this.planningPaused = false
      this.bot.chat('Sena: manual task cancelled.')
      return
    }
    if (command.type === 'task') {
      this.manualCommand = { username, instruction: command.instruction, startedAt: Date.now() }
      this.planningPaused = false
      this.memory.episode('manual_command', { username, instruction: command.instruction }, 0.7)
      this.bot.chat(`Sena: doing — ${command.instruction.slice(0, 100)}`)
    }
  }

  loopReflex() {
    const tick = async () => {
      if (!this.running) return
      try {
        this.emotion.tick()
        const world = snapshot(this.bot)
        this.lastWorld = world
        await this.reflex.tick(world, evaluateNeeds(world))
      } catch (err) {
        console.warn('[reflex]', err.message)
      }
      setTimeout(tick, this.config.runtime.reflexIntervalMs).unref()
    }
    tick()
  }

  loopMind() {
    const tick = async () => {
      if (!this.running) return
      if (!this.planningPaused && !this.thinking && !this.reflex.busy) {
        this.thinking = true
        try { await this.thinkOnce() } catch (err) { console.error('[mind]', err.message); this.emotion.event('failure', 0.4) }
        this.thinking = false
      }
      setTimeout(tick, this.config.runtime.thinkIntervalMs).unref()
    }
    setTimeout(tick, 1200).unref()
  }

  shouldUseVision(world, decision = null) {
    if (!this.visionCapture) return false
    if (decision?.action?.skill === 'inspect_vision') return true
    if (!this.lastVisual) return true
    if (Date.now() - this.lastVisual.at > 120000 && world.entities.some(e => e.kind === 'player')) return true
    return false
  }

  async refreshVision(context) {
    const image = await this.visionCapture.capture()
    const observation = await this.visionMind.inspect(image, context)
    if (observation) this.lastVisual = { at: Date.now(), observation }
    return observation
  }

  async thinkOnce() {
    const world = snapshot(this.bot, { visual: this.lastVisual?.observation || null })
    const needs = evaluateNeeds(world)
    const objective = this.objectives.primary()
    const context = {
      world,
      needs,
      objective,
      drives: this.objectives.drives(),
      emotion: this.emotion.snapshot(),
      memory: this.memory.context(),
      social: this.social.context(),
      visualObservation: this.lastVisual?.observation || null,
      pendingDirectMessage: this.pendingDirectMessage,
      lastAction: this.lastAction,
      manualCommand: this.manualCommand,
      socialIntent: this.pendingSocialIntent,
      innerState: this.memory.data.innerState
    }

    let decision = await this.planner.decide(context)
    if (this.shouldUseVision(world, decision)) {
      try {
        const vision = await this.refreshVision(`Goal=${objective.id}; current_goal=${decision.current_goal}; inspect what structured state may miss.`)
        if (vision) decision = await this.planner.decide({ ...context, visualObservation: vision })
      } catch (err) {
        console.warn('[vision]', err.message)
      }
    }

    console.log(`[mind] goal=${decision.current_goal} action=${decision.action.skill} thought=${decision.thought_summary}`)
    const started = Date.now()
    try {
      let result
      if (decision.action.skill === 'inspect_vision') {
        result = { ok: true, observation: await this.refreshVision(decision.action.args.context || decision.current_goal) }
      } else {
        result = await this.skills.execute(decision.action.skill, decision.action.args)
      }
      this.lastAction = { at: Date.now(), skill: decision.action.skill, args: decision.action.args, result, ms: Date.now() - started }
      if (decision.action.skill === 'follow_player' && result?.ok && result.target) this.social.setFollowing(result.target)
      if (decision.action.skill === 'stop_following' && result?.ok) this.social.clearFollowing()
      if (decision.action.skill === 'follow_player' && result?.ok && result.target) this.social.setFollowing(result.target)
      if (decision.action.skill === 'stop_following' && result?.ok) this.social.clearFollowing()
      this.memory.episode('action', this.lastAction, result?.ok === false ? 0.45 : 0.25)
      this.emotion.event(result?.ok === false ? 'failure' : 'success', result?.ok === false ? 0.5 : 0.2)
    } catch (err) {
      this.lastAction = { at: Date.now(), skill: decision.action.skill, args: decision.action.args, error: err.message, ms: Date.now() - started }
      this.memory.episode('action_failure', this.lastAction, 0.55)
      this.emotion.event('failure', 0.7)
      console.warn('[skill]', decision.action.skill, err.message)
    }

    const socialInterpretation = this.pendingSocialIntent?.reason || this.pendingDirectMessage?.message || ''
    const concern = needs.foodPressure === 'critical' ? 'food is critically low' :
      needs.healthPressure === 'critical' ? 'health is critical' :
      needs.immediateDanger ? 'there is an immediate threat' : ''
    const conflict = (this.pendingSocialIntent && needs.immediateDanger)
      ? 'survival takes priority over the social request' : ''
    this.personality.innerState({
      goal: decision.current_goal,
      concern,
      interpretation: socialInterpretation,
      conflict,
      emotion: this.emotion.snapshot(),
      action: decision.action.skill
    })

    const socialInterpretation = this.pendingSocialIntent?.reason || this.pendingDirectMessage?.message || ''
    const concern = needs.foodPressure === 'critical' ? 'food is critically low' :
      needs.healthPressure === 'critical' ? 'health is critical' :
      needs.immediateDanger ? 'there is an immediate threat' : ''
    const conflict = (this.pendingSocialIntent && needs.immediateDanger)
      ? 'survival takes priority over the social request' : ''
    this.personality.innerState({
      goal: decision.current_goal,
      concern,
      interpretation: socialInterpretation,
      conflict,
      emotion: this.emotion.snapshot(),
      action: decision.action.skill
    })

    if (decision.memory_note) this.memory.episode('thought_note', { note: decision.memory_note }, 0.3)
    await this.maybeCommunicate(decision)
    if (this.pendingDirectMessage && Date.now() - this.pendingDirectMessage.at > 45000) this.pendingDirectMessage = null
    if (this.pendingSocialIntent && Date.now() - this.pendingSocialIntent.at > 45000) this.pendingSocialIntent = null
    if (this.pendingSocialIntent && Date.now() - this.pendingSocialIntent.at > 45000) this.pendingSocialIntent = null
    if (this.memory.data.episodes.length % 15 === 0) this.memory.save()
  }

  async maybeCommunicate(decision) {
    if (!this.config.runtime.allowSpontaneousChat && !this.pendingDirectMessage) return
    const direct = Boolean(this.pendingDirectMessage)
    const wanted = Boolean(decision.communication?.needed)
    if (!direct && !wanted) return
    const gate = this.communication.decide({
      direct,
      urgent: Number(decision.communication?.importance || 0) >= 0.9,
      useful: wanted,
      novelty: 0.8,
      importance: Number(decision.communication?.importance || 0.5)
    })
    if (!gate.speak) return

    const intent = decision.communication?.message_intent || (direct ? `Reply to ${this.pendingDirectMessage.username}: ${this.pendingDirectMessage.message}` : '')
    const client = this.planner.client
    let message = intent
    if (client.enabled) {
      try {
        message = await client.chat([
          { role: 'system', content: `You write Sena's Minecraft chat only. Sena is emotionally expressive but not theatrical, concise, casual Indonesian/English matching the player, and normally quiet. Never narrate hidden reasoning. Max 120 characters. Current emotion=${JSON.stringify(this.emotion.snapshot())}` },
          { role: 'user', content: `Intent: ${intent}
Player message: ${this.pendingDirectMessage ? JSON.stringify(this.pendingDirectMessage) : 'none'}` }
        ], { maxTokens: 80, temperature: 0.65 })
      } catch {}
    }
    message = String(message || '').replace(/^['"]|['"]$/g, '').trim().slice(0, 180)
    if (!message) return
    this.bot.chat(message)
    this.communication.mark(message)
    if (direct) this.pendingDirectMessage = null
  }

  async stop() {
    this.running = false
    this.memory.save()
    await this.visionCapture?.close()
    try { this.bot?.quit('Sena shutting down') } catch {}
  }
}

module.exports = { SenaRuntime }
