const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

function walk(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full)
  }
  return out
}

const files = [...walk(path.resolve('src')), ...walk(path.resolve('test'))]
let failed = false
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  if (result.status !== 0) failed = true
}
if (failed) process.exit(1)
console.log(`Syntax OK: ${files.length} JavaScript files`)
