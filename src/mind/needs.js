function sumFood(inv) {
  const known = ['bread', 'cooked_beef', 'cooked_porkchop', 'cooked_chicken', 'cooked_mutton', 'baked_potato', 'carrot', 'potato', 'apple', 'golden_carrot', 'steak']
  return known.reduce((n, name) => n + (inv[name] || 0), 0)
}

function evaluateNeeds(world) {
  const hp = world.self.health ?? 20
  const food = world.self.food ?? 20
  const inv = world.inventory || {}
  const foodItems = sumFood(inv)
  const hostile = world.entities.find(e => e.hostile && e.distance < 10)
  const wood = Object.entries(inv).filter(([k]) => k.endsWith('_log') || k.endsWith('_planks')).reduce((n, [, v]) => n + v, 0)
  const iron = (inv.iron_ingot || 0) + (inv.raw_iron || 0)
  return {
    immediateDanger: Boolean(hostile) || hp <= 6,
    nearestThreat: hostile || null,
    healthPressure: hp <= 6 ? 'critical' : hp <= 12 ? 'high' : 'low',
    foodPressure: food <= 6 ? 'critical' : (food <= 12 || foodItems < 4) ? 'high' : foodItems < 12 ? 'medium' : 'low',
    shelterPressure: world.time?.isDay === false && !inv.bed ? 'medium' : 'low',
    resourcePressure: { wood: wood < 16 ? 'high' : 'low', iron: iron < 8 ? 'medium' : 'low' },
    hasFood: foodItems > 0,
    hasBed: Boolean(inv.hasBed || Object.keys(inv).some(name => name.endsWith('_bed'))),
    reserves: { foodItems, wood, iron }
  }
}

module.exports = { evaluateNeeds }
