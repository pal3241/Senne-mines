const HOSTILES = new Set([
  'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider', 'drowned', 'husk', 'stray',
  'witch', 'pillager', 'vindicator', 'evoker', 'ravager', 'phantom', 'slime', 'magma_cube',
  'blaze', 'ghast', 'hoglin', 'zoglin', 'piglin_brute', 'enderman', 'endermite', 'silverfish',
  'warden', 'guardian', 'elder_guardian', 'shulker', 'witherskeleton', 'wither_skeleton'
])

function inventoryCounts(bot) {
  const out = {}
  for (const item of bot.inventory.items()) out[item.name] = (out[item.name] || 0) + item.count
  return out
}

function nearbyEntities(bot, radius = 24) {
  if (!bot.entity) return []
  return Object.values(bot.entities)
    .filter(e => e !== bot.entity && e.position && e.position.distanceTo(bot.entity.position) <= radius)
    .map(e => ({
      id: e.id,
      name: e.name || e.username || e.displayName || 'unknown',
      username: e.username || null,
      kind: e.type || 'unknown',
      hostile: HOSTILES.has(e.name),
      distance: Number(e.position.distanceTo(bot.entity.position).toFixed(1)),
      position: {
        x: Math.floor(e.position.x), y: Math.floor(e.position.y), z: Math.floor(e.position.z)
      }
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 40)
}

function sampleBlocks(bot) {
  if (!bot.entity) return []
  const names = [
    'oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log',
    'stone', 'coal_ore', 'iron_ore', 'deepslate_iron_ore', 'diamond_ore', 'deepslate_diamond_ore',
    'crafting_table', 'furnace', 'chest', 'white_bed', 'wheat', 'carrots', 'potatoes', 'water', 'lava'
  ]
  const blocks = []
  for (const name of names) {
    const type = bot.registry.blocksByName[name]?.id
    if (type == null) continue
    const found = bot.findBlock({ matching: type, maxDistance: 24 })
    if (found) blocks.push({ name, distance: Number(found.position.distanceTo(bot.entity.position).toFixed(1)), position: found.position.floored() })
  }
  return blocks
}

function snapshot(bot, extra = {}) {
  const pos = bot.entity?.position
  return {
    timestamp: Date.now(),
    self: {
      health: bot.health,
      food: bot.food,
      oxygen: bot.oxygenLevel,
      position: pos ? { x: Number(pos.x.toFixed(1)), y: Number(pos.y.toFixed(1)), z: Number(pos.z.toFixed(1)) } : null,
      dimension: bot.game?.dimension || null,
      gamemode: bot.game?.gameMode || null
    },
    time: {
      age: bot.time?.age ?? null,
      timeOfDay: bot.time?.timeOfDay ?? null,
      isDay: bot.time?.isDay ?? null
    },
    inventory: { ...inventoryCounts(bot), hasFood: inventoryCounts(bot) && Object.keys(inventoryCounts(bot)).some(name => ['bread','cooked_beef','cooked_porkchop','cooked_chicken','cooked_mutton','baked_potato','carrot','potato','apple','golden_carrot'].includes(name)), hasBed: Object.keys(inventoryCounts(bot)).some(name => name.endsWith('_bed')) },
    entities: nearbyEntities(bot),
    blocks: sampleBlocks(bot),
    ...extra
  }
}

module.exports = { snapshot, inventoryCounts, nearbyEntities, HOSTILES }
