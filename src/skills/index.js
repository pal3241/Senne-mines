const { goals, Movements } = require('mineflayer-pathfinder')
const { Vec3 } = require('vec3')

const FOOD_PRIORITY = [
  'golden_carrot', 'cooked_beef', 'cooked_porkchop', 'cooked_mutton', 'cooked_chicken',
  'bread', 'baked_potato', 'carrot', 'apple', 'potato'
]

class Skills {
  constructor(bot, { visionCapture, visionMind, maxBuildBlocks = 160 } = {}) {
    this.bot = bot
    this.visionCapture = visionCapture
    this.visionMind = visionMind
    this.maxBuildBlocks = maxBuildBlocks
  }

  async execute(name, args = {}) {
    const fn = this[name]
    if (typeof fn !== 'function' || name === 'execute') throw new Error(`Unknown skill: ${name}`)
    return await fn.call(this, args)
  }

  setMovements() {
    const movements = new Movements(this.bot)
    movements.canDig = true
    movements.allow1by1towers = false
    this.bot.pathfinder.setMovements(movements)
  }

  async goto({ x, y, z, range = 2 }) {
    this.setMovements()
    await this.bot.pathfinder.goto(new goals.GoalNear(Number(x), Number(y), Number(z), Number(range)))
    return { ok: true }
  }

  async goto_nearest_block({ block, range = 2, maxDistance = 64 }) {
    const type = this.bot.registry.blocksByName[block]?.id
    if (type == null) throw new Error(`Unknown block ${block}`)
    const found = this.bot.findBlock({ matching: type, maxDistance })
    if (!found) throw new Error(`No ${block} found within ${maxDistance}`)
    await this.goto({ ...found.position, range })
    return { ok: true, position: found.position }
  }

  async collect({ block, amount = 1, maxDistance = 48 }) {
    const type = this.bot.registry.blocksByName[block]?.id
    if (type == null) throw new Error(`Unknown block ${block}`)
    let collected = 0
    for (let i = 0; i < Math.min(64, Number(amount) || 1); i++) {
      const found = this.bot.findBlock({ matching: type, maxDistance })
      if (!found) break
      await this.goto({ ...found.position, range: 1 })
      if (!this.bot.canDigBlock(found)) break
      await this.bot.dig(found, true)
      collected++
    }
    return { ok: collected > 0, collected }
  }

  inventoryCount(name) {
    return this.bot.inventory.items().filter(item => item.name === name).reduce((sum, item) => sum + item.count, 0)
  }

  findNearbyEntity(names, maxDistance = 32) {
    const allowed = new Set(Array.isArray(names) ? names : [names])
    return Object.values(this.bot.entities)
      .filter(e => e !== this.bot.entity && e.position && e.isValid !== false)
      .filter(e => allowed.size === 0 || allowed.has(e.name))
      .filter(e => e.position.distanceTo(this.bot.entity.position) <= maxDistance)
      .sort((a, b) => a.position.distanceTo(this.bot.entity.position) - b.position.distanceTo(this.bot.entity.position))[0]
  }

  async craft({ item, amount = 1 }) {
    const itemType = this.bot.registry.itemsByName[item]?.id
    if (itemType == null) throw new Error('Unknown item ' + item)
    const count = Math.max(1, Number(amount) || 1)
    let table = this.bot.findBlock({ matching: this.bot.registry.blocksByName.crafting_table?.id, maxDistance: 16 })
    let recipes = this.bot.recipesFor(itemType, null, count, table)
    if (!recipes.length) recipes = this.bot.recipesFor(itemType, null, count, null)
    if (!recipes.length) throw new Error('No currently craftable recipe for ' + item)
    await this.bot.craft(recipes[0], count, table || null)
    return { ok: true, item, amount: count }
  }

  async smelt({ item, amount = 1 }) {
    const input = this.bot.registry.itemsByName[item]?.id
    if (input == null) throw new Error('Unknown smelt input ' + item)
    const furnaceType = this.bot.registry.blocksByName.furnace?.id
    const furnace = furnaceType == null ? null : this.bot.findBlock({ matching: furnaceType, maxDistance: 16 })
    if (!furnace) throw new Error('No furnace nearby')
    const fuel = this.bot.inventory.items().find(i => ['coal', 'charcoal', 'oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'cherry_log'].includes(i.name))
    if (!fuel) throw new Error('No usable furnace fuel in inventory')
    const source = this.bot.inventory.items().find(i => i.type === input)
    if (!source) throw new Error('No ' + item + ' in inventory')
    const target = Math.min(Number(amount) || 1, source.count)
    await this.goto({ ...furnace.position, range: 3 })
    const f = await this.bot.openFurnace(furnace)
    try {
      await f.putFuel(fuel.type, null, Math.min(fuel.count, target))
      await f.putInput(source.type, null, target)
      await new Promise(resolve => setTimeout(resolve, Math.min(30000, 1200 + target * 1200)))
      await f.takeOutput()
    } finally {
      try { f.close() } catch {}
    }
    return { ok: true, item, amount: target }
  }

  async find_food({ maxDistance = 48, prefer = ['cow', 'pig', 'sheep', 'chicken', 'rabbit'] } = {}) {
    const entity = this.findNearbyEntity(prefer, maxDistance)
    if (entity) {
      await this.goto({ ...entity.position, range: 2 })
      for (let hit = 0; hit < 12 && entity.isValid !== false; hit++) {
        await this.bot.lookAt(entity.position.offset(0, 1, 0), true)
        this.bot.attack(entity)
        await new Promise(resolve => setTimeout(resolve, 180))
      }
      return { ok: true, source: entity.name }
    }
    for (const block of ['wheat', 'carrots', 'potatoes', 'beetroots']) {
      const type = this.bot.registry.blocksByName[block]?.id
      if (type == null) continue
      const found = this.bot.findBlock({ matching: type, maxDistance })
      if (found) {
        await this.goto({ ...found.position, range: 2 })
        await this.bot.dig(found, true)
        return { ok: true, source: block }
      }
    }
    throw new Error('No nearby food source found')
  }

  async sleep({ maxDistance = 24 } = {}) {
    if (this.bot.time?.isDay) return { ok: true, skipped: 'daytime' }
    const bedNames = ['white_bed', 'orange_bed', 'magenta_bed', 'light_blue_bed', 'yellow_bed', 'lime_bed', 'pink_bed', 'gray_bed', 'light_gray_bed', 'cyan_bed', 'purple_bed', 'blue_bed', 'brown_bed', 'green_bed', 'red_bed', 'black_bed']
    const ids = bedNames.map(name => this.bot.registry.blocksByName[name]?.id).filter(id => id != null)
    const bed = this.bot.findBlock({ matching: block => ids.includes(block.type), maxDistance })
    if (!bed) throw new Error('No bed nearby')
    await this.goto({ ...bed.position, range: 2 })
    await this.bot.sleep(bed)
    return { ok: true, bed: bed.name }
  }

  async eat() {
    const items = this.bot.inventory.items()
    let food = null
    for (const name of FOOD_PRIORITY) {
      food = items.find(i => i.name === name)
      if (food) break
    }
    if (!food) food = items.find(i => i.foodPoints)
    if (!food) throw new Error('No food in inventory')
    await this.bot.equip(food, 'hand')
    await this.bot.consume()
    return { ok: true, item: food.name }
  }

  async attack_nearest({ names = [], maxDistance = 8 }) {
    const allowed = new Set(Array.isArray(names) ? names : [names])
    const entities = Object.values(this.bot.entities)
      .filter(e => e !== this.bot.entity && e.position && e.position.distanceTo(this.bot.entity.position) <= maxDistance)
      .filter(e => allowed.size === 0 || allowed.has(e.name))
      .sort((a, b) => a.position.distanceTo(this.bot.entity.position) - b.position.distanceTo(this.bot.entity.position))
    if (!entities[0]) throw new Error('No target found')
    await this.bot.lookAt(entities[0].position.offset(0, 1, 0), true)
    this.bot.attack(entities[0])
    return { ok: true, target: entities[0].name }
  }

  async flee({ fromEntityId, distance = 10 }) {
    const from = this.bot.entities[fromEntityId]?.position || this.bot.entity.position.offset(1, 0, 0)
    const here = this.bot.entity.position
    let dx = here.x - from.x
    let dz = here.z - from.z
    const mag = Math.hypot(dx, dz) || 1
    dx /= mag; dz /= mag
    const target = here.offset(dx * distance, 0, dz * distance)
    this.setMovements()
    await this.bot.pathfinder.goto(new goals.GoalNear(Math.floor(target.x), Math.floor(target.y), Math.floor(target.z), 2))
    return { ok: true }
  }

  async inspect_vision({ context = '' } = {}) {
    if (!this.visionCapture || !this.visionMind) throw new Error('Vision is disabled')
    const image = await this.visionCapture.capture()
    const observation = await this.visionMind.inspect(image, context)
    return { ok: true, observation }
  }

  findReference(target) {
    const faces = [
      new Vec3(0, -1, 0), new Vec3(0, 1, 0), new Vec3(-1, 0, 0),
      new Vec3(1, 0, 0), new Vec3(0, 0, -1), new Vec3(0, 0, 1)
    ]
    for (const delta of faces) {
      const refPos = target.plus(delta)
      const ref = this.bot.blockAt(refPos)
      if (ref && ref.boundingBox !== 'empty') return { ref, face: delta.scaled(-1) }
    }
    return null
  }

  async creative_build({ origin, placements = [] }) {
    if (!Array.isArray(placements) || !placements.length) throw new Error('placements required')
    if (placements.length > this.maxBuildBlocks) throw new Error(`Build exceeds max ${this.maxBuildBlocks} blocks`)
    const base = origin ? new Vec3(origin.x, origin.y, origin.z) : this.bot.entity.position.floored()
    let placed = 0
    const failures = []
    const ordered = [...placements].sort((a, b) => (a.y - b.y) || (Math.abs(a.x) + Math.abs(a.z) - Math.abs(b.x) - Math.abs(b.z)))
    for (const p of ordered) {
      const item = this.bot.inventory.items().find(i => i.name === p.block)
      if (!item) { failures.push({ p, reason: 'missing_item' }); continue }
      const target = base.offset(Number(p.x) || 0, Number(p.y) || 0, Number(p.z) || 0)
      const existing = this.bot.blockAt(target)
      if (existing && existing.boundingBox !== 'empty') continue
      await this.goto({ ...target, range: 4 })
      const reference = this.findReference(target)
      if (!reference) { failures.push({ p, reason: 'no_support' }); continue }
      try {
        await this.bot.equip(item, 'hand')
        await this.bot.placeBlock(reference.ref, reference.face)
        placed++
      } catch (err) {
        failures.push({ p, reason: err.message })
      }
    }
    return { ok: placed > 0, placed, failures: failures.slice(0, 20) }
  }

  async farm({ radius = 16 }) {
    const mature = new Set(['wheat', 'carrots', 'potatoes', 'beetroots'])
    const center = this.bot.entity.position.floored()
    const positions = this.bot.findBlocks({
      matching: block => mature.has(block.name) && (block.getProperties?.().age == null || Number(block.getProperties().age) >= 7),
      maxDistance: Math.min(32, Number(radius) || 16),
      count: 64
    })
    let harvested = 0
    for (const pos of positions) {
      const block = this.bot.blockAt(pos)
      if (!block) continue
      try {
        await this.goto({ ...pos, range: 2 })
        await this.bot.dig(block, true)
        harvested++
        const seedName = block.name === 'wheat' ? 'wheat_seeds' : block.name === 'beetroots' ? 'beetroot_seeds' : block.name
        const seed = this.bot.inventory.items().find(i => i.name === seedName)
        const farmland = this.bot.blockAt(pos.offset(0, -1, 0))
        if (seed && farmland?.name === 'farmland') {
          await this.bot.equip(seed, 'hand')
          await this.bot.placeBlock(farmland, new Vec3(0, 1, 0))
        }
      } catch {}
    }
    return { ok: true, harvested, center }
  }

  async wait({ ms = 1000 }) {
    await new Promise(resolve => setTimeout(resolve, Math.max(100, Math.min(10000, Number(ms) || 1000))))
    return { ok: true }
  }
}

module.exports = { Skills }
