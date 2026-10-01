function parseCommand(username, message) {
  const text = String(message || '').trim()
  if (!/^!sena(?:\s|$)/i.test(text)) return null
  const body = text.replace(/^!sena\s*/i, '').trim()
  if (!body || /^help$/i.test(body)) {
    return { type: 'help', username }
  }
  if (/^(stop|pause)$/i.test(body)) return { type: 'pause', username }
  if (/^(resume|continue)$/i.test(body)) return { type: 'resume', username }
  if (/^(status|state)$/i.test(body)) return { type: 'status', username }
  if (/^cancel$/i.test(body)) return { type: 'cancel', username }
  return { type: 'task', username, instruction: body }
}

function helpText() {
  return '!sena <task> | !sena status | !sena stop | !sena resume | !sena cancel | !sena help'
}

module.exports = { parseCommand, helpText }
