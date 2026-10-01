const test = require('node:test')
const assert = require('node:assert/strict')
const { parseCommand } = require('../src/mind/commands')
const { CommunicationGate } = require('../src/mind/communication')
const { evaluateNeeds } = require('../src/mind/needs')
const { ObjectiveEngine } = require('../src/mind/objectives')

test('communication is quiet by default but direct messages pass', () => {
  const gate = new CommunicationGate()
  assert.equal(gate.decide({ novelty: 0.1, importance: 0.1 }).speak, false)
  assert.equal(gate.decide({ direct: true }).speak, true)
})

test('needs detect critical hunger and danger', () => {
  const needs = evaluateNeeds({
    self: { health: 5, food: 4 },
    inventory: {}, time: { isDay: false },
    entities: [{ hostile: true, distance: 4, name: 'creeper' }]
  })
  assert.equal(needs.immediateDanger, true)
  assert.equal(needs.foodPressure, 'critical')
  assert.equal(needs.healthPressure, 'critical')
})

test('economy evidence changes dynamic world objective', () => {
  const memory = { data: { server: {}, episodes: [] }, episode() {} }
  const objective = new ObjectiveEngine(memory)
  objective.observeChat('server', 'Use /shop and /balance to buy and sell items')
  assert.equal(objective.primary().id, 'become_wealthiest_player')
})


{
  const a = parseCommand('Fahri', '!sena build a base')
  assert.equal(a.type, 'task')
  assert.equal(a.instruction, 'build a base')
  assert.equal(parseCommand('Fahri', 'hello'), null)
  assert.equal(parseCommand('Fahri', '!sena cancel').type, 'cancel')
  assert.equal(parseCommand('Fahri', '!sena status').type, 'status')
}

const { SocialMind } = require('../src/mind/social')
const { Personality } = require('../src/mind/personality')

test('social intent recognizes direct follow request without treating normal chat as command', () => {
  const memory = { data: { relationships: {} } }
  const social = new SocialMind(memory, 'Sena')
  const intent = social.interpret('Fahri', 'sen ikut sini')
  assert.equal(intent.intent, 'follow_player')
  assert.equal(intent.target, 'Fahri')
  assert.equal(intent.confidence >= 0.85, true)
})

test('personality produces structured inner state', () => {
  const memory = { data: { innerState: null } }
  const personality = new Personality(memory)
  const state = personality.innerState({
    goal: 'follow player',
    concern: '',
    interpretation: 'Player asked Sena to follow.',
    conflict: '',
    emotion: { valence: 0.2, fear: 0, frustration: 0, curiosity: 0.8, happiness: 0.3 },
    action: 'follow_player'
  })
  assert.equal(state.intention, 'follow player')
  assert.equal(state.socialInterpretation, 'Player asked Sena to follow.')
  assert.equal(memory.data.innerState.nextAction, 'follow_player')
})
